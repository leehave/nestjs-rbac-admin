export interface LlmChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
}

export interface LlmRequestOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: LlmChatMessage[];
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
  extraHeaders?: Record<string, string>;
  extraBody?: Record<string, unknown>;
}

export type LlmStreamOptions = LlmRequestOptions;

export interface LlmStreamChunk {
  delta: string;
  finishReason?: string;
}

export interface LlmStreamUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  /** DeepSeek: prompt_cache_hit_tokens；豆包: prompt_tokens_details.cached_tokens */
  promptCacheHitTokens?: number;
  promptCacheMissTokens?: number;
}

/** 从 SSE chunk 提取增量文本（兼容豆包 reasoning_content / DeepSeek content） */
export function extractStreamDelta(json: any): string {
  const delta = json?.choices?.[0]?.delta;
  if (delta) {
    const parts: string[] = [];
    if (typeof delta.reasoning_content === 'string' && delta.reasoning_content) {
      parts.push(delta.reasoning_content);
    }
    if (typeof delta.content === 'string' && delta.content) {
      parts.push(delta.content);
    }
    return parts.join('');
  }
  const msg = json?.choices?.[0]?.message?.content;
  return typeof msg === 'string' ? msg : '';
}

/**
 * 解析 LLM 响应的 token 用量对象，提取 prompt/completion/total tokens
 * 以及 DeepSeek/豆包等厂商的缓存命中/未命中 tokens。
 * @param raw - 原始 usage 对象（可能为 null/undefined）
 * @returns 标准化后的 LlmStreamUsage 对象，若 raw 为空则返回 null
 */
export function parseLlmUsage(raw: any): LlmStreamUsage | null {
  if (!raw) return null;
  const hit =
    raw.prompt_cache_hit_tokens ??
    raw.prompt_tokens_details?.cached_tokens ??
    0;
  const miss =
    raw.prompt_cache_miss_tokens ??
    (raw.prompt_tokens != null ? Math.max(0, raw.prompt_tokens - hit) : undefined);

  return {
    promptTokens: raw.prompt_tokens ?? 0,
    completionTokens: raw.completion_tokens ?? 0,
    totalTokens: raw.total_tokens ?? 0,
    promptCacheHitTokens: hit,
    promptCacheMissTokens: miss,
  };
}

/** OpenAI 兼容 SSE 流式 chat/completions */
export async function* streamOpenAiChatCompletions(
  options: LlmStreamOptions,
): AsyncGenerator<LlmStreamChunk, LlmStreamUsage, undefined> {
  const base = options.baseUrl.replace(/\/+$/, '');
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${options.apiKey}`,
      ...options.extraHeaders,
    },
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      stream: true,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
      stream_options: { include_usage: true },
      ...options.extraBody,
    }),
    signal: options.signal,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`LLM HTTP ${res.status}: ${errText.slice(0, 500)}`);
  }

  if (!res.body) {
    throw new Error('LLM response body is empty');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let usage: LlmStreamUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

  const abortReader = () => {
    reader.cancel().catch(() => undefined);
  };
  options.signal?.addEventListener('abort', abortReader, { once: true });

  try {
    while (true) {
      if (options.signal?.aborted) {
        const err = new Error('Aborted');
        err.name = 'AbortError';
        throw err;
      }

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':') || trimmed.startsWith('event:')) continue;

        let payload = trimmed;
        if (trimmed.startsWith('data:')) {
          payload = trimmed.slice(5).trim();
        }
        if (!payload || payload === '[DONE]') continue;

        let json: any;
        try {
          json = JSON.parse(payload);
        } catch {
          continue;
        }

        const delta = extractStreamDelta(json);
        if (delta) {
          yield { delta, finishReason: json?.choices?.[0]?.finish_reason ?? undefined };
        }

        const parsed = parseLlmUsage(json?.usage);
        if (parsed) usage = parsed;
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

/** 非流式 chat/completions，用于摘要等后台任务 */
export async function completeOpenAiChatCompletions(
  options: LlmRequestOptions,
): Promise<{ content: string; usage: LlmStreamUsage }> {
  const base = options.baseUrl.replace(/\/+$/, '');
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${options.apiKey}`,
      ...options.extraHeaders,
    },
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      stream: false,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 1024,
      ...options.extraBody,
    }),
    signal: options.signal,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`LLM HTTP ${res.status}: ${errText.slice(0, 500)}`);
  }

  const json: any = await res.json();
  const content = json?.choices?.[0]?.message?.content ?? '';
  const usage =
    parseLlmUsage(json?.usage) ?? { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  return { content: typeof content === 'string' ? content : '', usage };
}
