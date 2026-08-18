import { createHash, createHmac } from 'node:crypto';
import type {
  LlmChatMessage,
  LlmStreamChunk,
  LlmStreamOptions,
  LlmStreamUsage,
} from '../openai-stream.util';

function sha256Hex(data: string | Uint8Array): string {
  return createHash('sha256').update(data).digest('hex');
}

function hmacSha256(key: string | Uint8Array, data: string): Buffer {
  return createHmac('sha256', key).update(data).digest();
}

/** 从 Base URL 解析 region，如 https://bedrock-runtime.us-east-1.amazonaws.com → us-east-1 */
function extractRegion(baseUrl: string): string {
  const hostname = new URL(baseUrl).hostname;
  const m = hostname.match(/^bedrock(?:-runtime)?\.([a-z0-9-]+)\.amazonaws\.com$/);
  if (!m) {
    throw new Error(
      '无法从 Base URL 解析 Bedrock region，请使用 https://bedrock-runtime.<region>.amazonaws.com',
    );
  }
  return m[1];
}

/** AWS SigV4 签名（service=bedrock），返回可直接用于 fetch 的请求头 */
function signBedrockHeaders(params: {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  host: string;
  path: string;
  method: string;
  payload: string;
}): Record<string, string> {
  const { accessKeyId, secretAccessKey, region, host, path, method, payload } = params;
  const service = 'bedrock';
  const contentType = 'application/json';
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(payload);

  const canonicalHeaders = [
    `content-type:${contentType}`,
    `host:${host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
  ].join('\n');
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';

  const canonicalRequest = [
    method,
    path,
    '',
    `${canonicalHeaders}\n`,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const kDate = hmacSha256(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, service);
  const kSigning = hmacSha256(kService, 'aws4_request');
  const signature = createHmac('sha256', kSigning).update(stringToSign).digest('hex');

  return {
    'Content-Type': contentType,
    Host: host,
    'X-Amz-Content-Sha256': payloadHash,
    'X-Amz-Date': amzDate,
    Authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

/** AWS EventStream 二进制帧解析，逐帧 yield JSON payload */
async function* parseBedrockEventStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): AsyncGenerator<any, void, undefined> {
  const decoder = new TextDecoder();
  let buf = new Uint8Array(0);

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const merged = new Uint8Array(buf.length + value.length);
    merged.set(buf, 0);
    merged.set(value, buf.length);
    buf = merged;

    while (buf.length >= 16) {
      const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
      const totalLen = view.getUint32(0, false);
      if (totalLen < 16 || buf.length < totalLen) break;

      const headersLen = view.getUint32(4, false);
      const payloadStart = 12 + headersLen;
      const payloadEnd = totalLen - 4; // 去掉尾部 CRC32
      const text = decoder.decode(buf.subarray(payloadStart, payloadEnd));
      if (text) {
        try {
          yield JSON.parse(text);
        } catch {
          // 非 JSON 事件（如 ping）忽略
        }
      }
      buf = buf.subarray(totalLen);
    }
  }
}

/**
 * Amazon Bedrock ConverseStream 流式适配器。
 * 认证使用 AWS SigV4，API Key 需填写 `accessKeyId:secretAccessKey`；
 * 事件为 contentBlockDelta（增量文本）/ messageStop / metadata（usage）。
 */
export async function* streamBedrockConverse(
  options: LlmStreamOptions,
): AsyncGenerator<LlmStreamChunk, LlmStreamUsage, undefined> {
  const base = options.baseUrl.replace(/\/+$/, '');
  const host = new URL(base).host;
  const region = extractRegion(base);
  const path = `/model/${encodeURIComponent(options.model)}/converse-stream`;

  const separator = options.apiKey.indexOf(':');
  if (separator <= 0) {
    throw new Error('Bedrock 的 API Key 需填写 accessKeyId:secretAccessKey 格式');
  }
  const accessKeyId = options.apiKey.slice(0, separator);
  const secretAccessKey = options.apiKey.slice(separator + 1);

  const system = options.messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
    .join('\n\n');
  const messages = options.messages
    .filter((m) => m.role !== 'system')
    .map((m: LlmChatMessage) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: [{ text: m.content }],
    }));

  const payload = JSON.stringify({
    modelId: options.model,
    ...(system ? { system: [{ text: system }] } : {}),
    messages,
    inferenceConfig: {
      temperature: options.temperature ?? 0.7,
      maxTokens: options.maxTokens ?? 4096,
    },
    ...options.extraBody,
  });

  const headers = signBedrockHeaders({
    accessKeyId,
    secretAccessKey,
    region,
    host,
    path,
    method: 'POST',
    payload,
  });

  const requestUrl = new URL(path, base).toString();
  const res = await fetch(requestUrl, {
    method: 'POST',
    headers: { ...headers, ...options.extraHeaders },
    body: payload,
    signal: options.signal,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`LLM HTTP ${res.status}: ${errText.slice(0, 500)}`);
  }
  if (!res.body) throw new Error('LLM response body is empty');

  const reader = res.body.getReader();
  let usage: LlmStreamUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

  const abortReader = () => {
    reader.cancel().catch(() => undefined);
  };
  options.signal?.addEventListener('abort', abortReader, { once: true });

  try {
    for await (const event of parseBedrockEventStream(reader)) {
      if (options.signal?.aborted) {
        const err = new Error('Aborted');
        err.name = 'AbortError';
        throw err;
      }

      const delta = event?.contentBlockDelta?.delta?.text;
      if (typeof delta === 'string' && delta) {
        yield { delta };
      } else if (event?.messageStop) {
        yield { delta: '', finishReason: event.messageStop.stopReason };
      } else if (event?.metadata?.usage) {
        const u = event.metadata.usage;
        usage = {
          promptTokens: u.inputTokens ?? 0,
          completionTokens: u.outputTokens ?? 0,
          totalTokens: u.totalTokens ?? 0,
        };
      }
    }
  } catch (err: any) {
    if (err?.name === 'AbortError' || options.signal?.aborted) {
      const abortErr = new Error('Aborted');
      abortErr.name = 'AbortError';
      throw abortErr;
    }
    throw err;
  } finally {
    options.signal?.removeEventListener('abort', abortReader);
  }

  return usage;
}
