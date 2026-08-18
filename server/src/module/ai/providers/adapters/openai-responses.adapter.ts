import type {
  LlmStreamChunk,
  LlmStreamOptions,
  LlmStreamUsage,
} from '../openai-stream.util';

/**
 * OpenAI Responses API（/responses）流式适配器。
 * 与 Chat Completions 不同，Responses 使用 input[] 结构；
 * 流事件为 response.output_text.delta（增量）与 response.completed（含 usage）。
 */
export async function* streamOpenAiResponses(
  options: LlmStreamOptions,
): AsyncGenerator<LlmStreamChunk, LlmStreamUsage, undefined> {
  const base = options.baseUrl.replace(/\/+$/, '');
  const res = await fetch(`${base}/responses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${options.apiKey}`,
      ...options.extraHeaders,
    },
    body: JSON.stringify({
      model: options.model,
      input: options.messages.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
      temperature: options.temperature ?? 0.7,
      max_output_tokens: options.maxTokens ?? 4096,
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

        if (json?.type === 'response.output_text.delta' && typeof json.delta === 'string') {
          yield { delta: json.delta };
        } else if (json?.type === 'response.completed') {
          const u = json?.response?.usage;
          if (u) {
            usage = {
              promptTokens: u.input_tokens ?? 0,
              completionTokens: u.output_tokens ?? 0,
              totalTokens: u.total_tokens ?? 0,
              promptCacheHitTokens: u.input_tokens_details?.cached_tokens ?? 0,
            };
          }
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
