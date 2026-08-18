import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In } from 'typeorm';

import { ConfigService as SysConfigService } from '../../system/config/config.service';
import { encryptAiSecret, decryptAiSecret, maskAiSecret } from '../../../common/utils/ai-crypto.util';
import { AiProviderEntity } from '../entities/ai-provider.entity';
import { AiModelEntity } from '../entities/ai-model.entity';
import { AiAgentEntity } from '../entities/ai-agent.entity';
import { AI_STATUS_ENABLED } from '../ai.constants';

export interface ResolvedAiModel {
  model: AiModelEntity;
  provider: AiProviderEntity;
  apiKey: string;
}

@Injectable()
export class AiConfigService {
  private readonly logger = new Logger(AiConfigService.name);

  constructor(
    @InjectRepository(AiProviderEntity)
    private readonly providerRepo: Repository<AiProviderEntity>,
    @InjectRepository(AiModelEntity)
    private readonly modelRepo: Repository<AiModelEntity>,
    @InjectRepository(AiAgentEntity)
    private readonly agentRepo: Repository<AiAgentEntity>,
    private readonly configService: ConfigService,
    private readonly sysConfigService: SysConfigService,
  ) {}

  async isAiEnabled(): Promise<boolean> {
    const val = await this.sysConfigService.getConfigValue('ai_enabled');
    return val !== '0';
  }

  async getMaxHistoryRounds(): Promise<number> {
    const val = await this.sysConfigService.getConfigValue('ai_max_history_rounds');
    const n = Number(val);
    return Number.isFinite(n) && n > 0 ? n : 10;
  }

  async getContextReserveTokens(): Promise<number> {
    const val = await this.sysConfigService.getConfigValue('ai_context_reserve_tokens');
    const n = Number(val);
    return Number.isFinite(n) && n >= 256 ? n : 1024;
  }

  async isSummaryEnabled(): Promise<boolean> {
    const val = await this.sysConfigService.getConfigValue('ai_summary_enabled');
    return val !== '0';
  }

  async getSummaryTriggerRounds(): Promise<number> {
    const val = await this.sysConfigService.getConfigValue('ai_summary_trigger_rounds');
    const n = Number(val);
    return Number.isFinite(n) && n > 0 ? n : 12;
  }

  async getSummaryKeepRounds(): Promise<number> {
    const val = await this.sysConfigService.getConfigValue('ai_summary_keep_rounds');
    const n = Number(val);
    return Number.isFinite(n) && n > 0 ? n : 8;
  }

  async getSummaryModelId(): Promise<string | null> {
    const val = await this.sysConfigService.getConfigValue('ai_summary_model_id');
    const id = `${val ?? ''}`.trim();
    return id || null;
  }

  async getMessageMaxTokens(): Promise<number> {
    const val = await this.sysConfigService.getConfigValue('ai_message_max_tokens');
    const n = Number(val);
    return Number.isFinite(n) && n >= 100 ? n : 1500;
  }

  /** Reasonix 紧急压缩阈值 %，默认 80 */
  async getContextCompactThreshold(): Promise<number> {
    const val = await this.sysConfigService.getConfigValue('ai_context_compact_threshold');
    const n = Number(val);
    return Number.isFinite(n) && n > 0 && n <= 100 ? n : 80;
  }

  /** Reasonix  proactive 压缩阈值 %，默认 40 */
  async getContextCompactProactive(): Promise<number> {
    const val = await this.sysConfigService.getConfigValue('ai_context_compact_proactive');
    const n = Number(val);
    return Number.isFinite(n) && n > 0 && n <= 100 ? n : 40;
  }

  async listModelOptions(tenantId: number) {
    const models = await this.modelRepo.find({
      where: [
        { tenantId, status: AI_STATUS_ENABLED, deleteTime: IsNull() },
        { tenantId: 0, status: AI_STATUS_ENABLED, deleteTime: IsNull() },
      ],
      order: { sort: 'ASC', id: 'ASC' },
    });

    const providerIds = [...new Set(models.map((m) => m.providerId))];
    const providers = providerIds.length
      ? await this.providerRepo.find({ where: { id: In(providerIds) } })
      : [];
    const providerMap = new Map(providers.map((p) => [p.id, p]));

    return models.map((m) => ({
      id: m.id,
      model_code: m.modelCode,
      name: m.name,
      provider_id: m.providerId,
      provider_name: providerMap.get(m.providerId)?.name ?? '',
      is_default: m.isDefault === 1,
      default_temperature: Number(m.defaultTemperature),
      context_window: m.contextWindow,
      max_output_tokens: m.maxOutputTokens,
    }));
  }

  async listAgentOptions(tenantId: number) {
    const agents = await this.agentRepo.find({
      where: [
        { tenantId, status: AI_STATUS_ENABLED, deleteTime: IsNull() },
        { tenantId: 0, status: AI_STATUS_ENABLED, deleteTime: IsNull() },
      ],
      order: { sort: 'ASC', id: 'ASC' },
    });

    return agents.map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      avatar: a.avatar,
      welcome_message: a.welcomeMessage,
      default_model_id: a.defaultModelId,
    }));
  }

  async resolveModel(modelId: string, tenantId: number): Promise<ResolvedAiModel> {
    const model = await this.modelRepo.findOne({
      where: { id: modelId, deleteTime: IsNull() },
    });
    if (!model || (model.tenantId !== 0 && model.tenantId !== tenantId)) {
      throw new Error('模型不存在或无权使用');
    }
    if (model.status !== AI_STATUS_ENABLED) {
      throw new Error('模型已停用');
    }

    const provider = await this.providerRepo.findOne({
      where: { id: model.providerId, deleteTime: IsNull() },
    });
    if (!provider || provider.status !== AI_STATUS_ENABLED) {
      throw new Error('模型供应商不可用');
    }
    if (!provider.apiKeyCipher) {
      throw new Error('供应商 API Key 未配置');
    }

    return {
      model,
      provider,
      apiKey: decryptAiSecret(provider.apiKeyCipher),
    };
  }

  async getDefaultModelId(tenantId: number): Promise<string | null> {
    const model = await this.modelRepo.findOne({
      where: [
        { tenantId, isDefault: 1, status: AI_STATUS_ENABLED, deleteTime: IsNull() },
        { tenantId: 0, isDefault: 1, status: AI_STATUS_ENABLED, deleteTime: IsNull() },
      ],
      order: { tenantId: 'DESC' },
    });
    return model?.id ?? null;
  }

  async getAgent(agentId: string, tenantId: number): Promise<AiAgentEntity | null> {
    const agent = await this.agentRepo.findOne({ where: { id: agentId, deleteTime: IsNull() } });
    if (!agent) return null;
    if (agent.tenantId !== 0 && agent.tenantId !== tenantId) return null;
    if (agent.status !== AI_STATUS_ENABLED) return null;
    return agent;
  }

  maskApiKey(cipher: string): string {
    if (!cipher) return '';
    try {
      return maskAiSecret(decryptAiSecret(cipher));
    } catch {
      return '****';
    }
  }
}
