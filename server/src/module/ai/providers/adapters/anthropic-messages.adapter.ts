import type {
  LlmChatMessage,
  LlmStreamChunk,
  LlmStreamOptions,
  LlmStreamUsage,
} from '../openai-stream.util';

/**
 * Anthropic Messages API（/v1/messages）流式适配器。
 * system 独立成字段，user/assistant 进入 messages；
 * 流事件为 message_start（input_tokens）/ content_block_delta（增量文本）
 * / message_delta（output_tokens、stop_reason）/ message_stop。
 */
export async function* streamAnthropicMessages(
  options: LlmStreamOptions,
): AsyncGenerator<LlmStreamChunk, LlmStreamUsage, undefined> {
  const base = options.baseUrl.replace(/\/+$/, '');
  // Anthropic 基址通常为 https://api.anthropic.com（不含 /v1）
  const endpoint = base.endsWith('/v1') ? `${base}/messages` : `${base}/v1/messages`;

  const system = options.messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
    .join('\n\n');
  const messages = options.messages
    .filter((m) => m.role !== 'system')
    .map((m: LlmChatMessage) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': options.apiKey,
      'anthropic-version': '2023-06-01',
      ...options.extraHeaders,
    },
    body: JSON.stringify({
      model: options.model,
      max_tokens: options.maxTokens ?? 4096,
      temperature: options.temperature ?? 0.7,
      ...(system ? { system } : {}),
      messages,
      stream: true,
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

        if (json?.type === 'content_block_delta' && json?.delta?.type === 'text_delta') {
          if (typeof json.delta.text === 'string') {
            yield { delta: json.delta.text };
          }
        } else if (json?.type === 'message_start') {
          usage.promptTokens = json?.message?.usage?.input_tokens ?? 0;
          usage.totalTokens = usage.promptTokens + usage.completionTokens;
        } else if (json?.type === 'message_delta') {
          usage.completionTokens = json?.usage?.output_tokens ?? 0;
          usage.totalTokens = usage.promptTokens + usage.completionTokens;
          const stopReason = json?.delta?.stop_reason;
          if (stopReason) yield { delta: '', finishReason: stopReason };
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
