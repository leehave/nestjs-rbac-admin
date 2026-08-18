import type { LlmStreamChunk, LlmStreamOptions, LlmStreamUsage } from './openai-stream.util';
import { streamOpenAiChatCompletions } from './openai-stream.util';
import { streamOpenAiResponses } from './adapters/openai-responses.adapter';
import { streamAnthropicMessages } from './adapters/anthropic-messages.adapter';
import { streamGoogleGenerativeAi } from './adapters/google-generative-ai.adapter';
import { streamBedrockConverse } from './adapters/bedrock-converse.adapter';

/** 支持的适配器类型（与 sa_ai_provider.adapter_type 及前端下拉选项保持一致） */
export type LlmAdapterType =
  | 'openai-completions'
  | 'openai-responses'
  | 'anthropic-messages'
  | 'google-generative-ai'
  | 'bedrock-converse-stream';

/** 在标准 LLM 请求选项之上携带供应商适配器类型 */
export type LlmAdapterOptions = LlmStreamOptions & { adapterType?: string };

/** 按供应商 adapterType 分发到对应协议的流式实现 */
export async function* streamLlm(
  options: LlmAdapterOptions,
): AsyncGenerator<LlmStreamChunk, LlmStreamUsage, undefined> {
  let result: LlmStreamUsage;
  switch (options.adapterType) {
    case 'openai-responses':
      result = yield* streamOpenAiResponses(options);
      break;
    case 'anthropic-messages':
      result = yield* streamAnthropicMessages(options);
      break;
    case 'google-generative-ai':
      result = yield* streamGoogleGenerativeAi(options);
      break;
    case 'bedrock-converse-stream':
      result = yield* streamBedrockConverse(options);
      break;
    case 'openai-completions':
    default:
      result = yield* streamOpenAiChatCompletions(options);
      break;
  }
  return result;
}

/** 非流式聚合：遍历流式实现拼接完整内容，用于摘要等后台任务 */
export async function completeLlm(
  options: LlmAdapterOptions,
): Promise<{ content: string; usage: LlmStreamUsage }> {
  const gen = streamLlm(options);
  let content = '';
  let result = await gen.next();
  while (!result.done) {
    const chunk = result.value as LlmStreamChunk;
    if (chunk.delta) content += chunk.delta;
    result = await gen.next();
  }
  const usage = (result.value ??
    { promptTokens: 0, completionTokens: 0, totalTokens: 0 }) as LlmStreamUsage;
  return { content, usage };
}
