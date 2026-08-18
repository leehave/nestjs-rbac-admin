import type {
  LlmChatMessage,
  LlmStreamChunk,
  LlmStreamOptions,
  LlmStreamUsage,
} from '../openai-stream.util';

/**
 * Google Generative AI（Gemini）流式适配器。
 * system → systemInstruction，assistant → role=model；
 * 使用 :streamGenerateContent?alt=sse，逐行 data: JSON，
 * 增量在 candidates[0].content.parts[].text，usage 在 usageMetadata。
 */
export async function* streamGoogleGenerativeAi(
  options: LlmStreamOptions,
): AsyncGenerator<LlmStreamChunk, LlmStreamUsage, undefined> {
  const base = options.baseUrl.replace(/\/+$/, '');
  const endpoint = `${base}/models/${encodeURIComponent(options.model)}:streamGenerateContent?alt=sse`;

  const systemParts = options.messages
    .filter((m) => m.role === 'system')
    .map((m) => ({ text: m.content }));
  const contents = options.messages
    .filter((m) => m.role !== 'system')
    .map((m: LlmChatMessage) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': options.apiKey,
      ...options.extraHeaders,
    },
    body: JSON.stringify({
      ...(systemParts.length ? { systemInstruction: { parts: systemParts } } : {}),
      contents,
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 4096,
      },
      ...options.extraBody,
    }),
    signal: options.signal,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`LLM HTTP ${res.status}: ${errText.slice(0, 500)}`);
  }
  if (!res.body) throw new Error('LLM response body is empty');

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
        if (trimmed.startsWith('data:')) payload = trimmed.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;

        let json: any;
        try {
          json = JSON.parse(payload);
        } catch {
          continue;
        }

        const candidate = json?.candidates?.[0];
        const text = (candidate?.content?.parts ?? [])
          .map((p: any) => (typeof p?.text === 'string' ? p.text : ''))
          .join('');
        if (text) {
          yield { delta: text, finishReason: candidate?.finishReason ?? undefined };
        }

        const um = json?.usageMetadata;
        if (um) {
          usage = {
            promptTokens: um.promptTokenCount ?? 0,
            completionTokens: um.candidatesTokenCount ?? 0,
            totalTokens: um.totalTokenCount ?? 0,
            promptCacheHitTokens: um.cachedContentTokenCount ?? 0,
          };
        }
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
