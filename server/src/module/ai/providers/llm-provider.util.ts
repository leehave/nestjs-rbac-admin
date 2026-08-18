import { AiProviderEntity } from '../entities/ai-provider.entity';

/** Provider 级扩展 body；DeepSeek/豆包前缀缓存靠稳定 system 首位，无需额外参数 */
export function buildProviderExtraBody(_provider: AiProviderEntity): Record<string, unknown> {
  return {};
}
