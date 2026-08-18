import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In, Between } from 'typeorm';

import { completeLlm } from '../providers/llm-adapter';
import { buildProviderExtraBody } from '../providers/llm-provider.util';
import { AiChatSessionEntity } from '../entities/ai-chat-session.entity';
import { AiChatMessageEntity } from '../entities/ai-chat-message.entity';
import { AiConfigService } from './ai-config.service';

@Injectable()
export class SessionSummaryService {
  private readonly logger = new Logger(SessionSummaryService.name);

  constructor(
    @InjectRepository(AiChatSessionEntity)
    private readonly sessionRepo: Repository<AiChatSessionEntity>,
    @InjectRepository(AiChatMessageEntity)
    private readonly messageRepo: Repository<AiChatMessageEntity>,
    private readonly aiConfigService: AiConfigService,
  ) {}

  /** 回复完成后异步触发，不阻塞 WebSocket */
  scheduleSummarize(
    sessionId: string,
    tenantId: number,
    fallbackModelId: string,
    contextRatio?: number,
  ) {
    void this.maybeSummarize(sessionId, tenantId, fallbackModelId, contextRatio).catch((err) =>
      this.logger.warn(`session summary failed: ${err?.message ?? err}`),
    );
  }

  /**
   * 检查是否满足摘要触发条件（轮数触发或上下文比例触发），
   * 若满足则拉取未摘要的对话记录，调用 LLM 生成/合并摘要，
   * 并将结果保存到会话记录中。
   * @param sessionId - 会话 ID
   * @param tenantId - 租户 ID
   * @param fallbackModelId - 备用模型 ID
   * @param contextRatio - 当前上下文占用比例（0-100），用于比例触发判断
   */
  private async maybeSummarize(
    sessionId: string,
    tenantId: number,
    fallbackModelId: string,
    contextRatio?: number,
  ) {
    if (!(await this.aiConfigService.isSummaryEnabled())) return;

    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, deleteTime: IsNull() },
    });
    if (!session) return;

    const triggerRounds = await this.aiConfigService.getSummaryTriggerRounds();
    const keepRounds = await this.aiConfigService.getSummaryKeepRounds();
    const compactThreshold = await this.aiConfigService.getContextCompactThreshold();
    const compactProactive = await this.aiConfigService.getContextCompactProactive();
    const rounds = Math.floor(session.messageCount / 2);

    const ratioTrigger =
      contextRatio != null &&
      (contextRatio >= compactThreshold || contextRatio >= compactProactive);
    const roundTrigger = rounds > triggerRounds;
    if (!ratioTrigger && !roundTrigger) return;

    const cutoffSeq = session.messageCount - keepRounds * 2;
    if (cutoffSeq <= session.summaryUpToSeq) return;

    const toSummarize = await this.messageRepo.find({
      where: {
        sessionId: session.id,
        role: In(['user', 'assistant']),
        status: 'completed',
        deleteTime: IsNull(),
        seq: Between(session.summaryUpToSeq + 1, cutoffSeq),
      },
      order: { seq: 'ASC' },
    });
    if (!toSummarize.length) return;

    const transcript = toSummarize
      .map((m) => `${m.role === 'user' ? '用户' : '助手'}：${m.content ?? ''}`)
      .join('\n\n');

    const modelId =
      (await this.aiConfigService.getSummaryModelId()) ?? session.defaultModelId ?? fallbackModelId;
    if (!modelId) return;

    const resolved = await this.aiConfigService.resolveModel(modelId, tenantId);
    const existing = session.summary?.trim() ?? '';

    const { content } = await completeLlm({
      adapterType: resolved.provider.adapterType,
      baseUrl: resolved.provider.baseUrl,
      apiKey: resolved.apiKey,
      model: resolved.model.modelCode,
      temperature: 0.2,
      maxTokens: 800,
      extraHeaders: resolved.provider.extraHeaders ?? undefined,
      extraBody: buildProviderExtraBody(resolved.provider),
      messages: [
        {
          role: 'system',
          content:
            '你是会话摘要助手。将对话压缩为简洁中文摘要，保留：用户目标、已做决策、关键事实、待办。不要编造。输出纯摘要正文，不超过 400 字。',
        },
        {
          role: 'user',
          content: existing
            ? `【已有摘要】\n${existing}\n\n【新增对话】\n${transcript}\n\n请合并更新摘要：`
            : `【对话内容】\n${transcript}\n\n请生成摘要：`,
        },
      ],
    });

    const summary = content.trim();
    if (!summary) return;

    session.summary = summary.slice(0, 4000);
    session.summaryUpToSeq = cutoffSeq;
    await this.sessionRepo.save(session);
    this.logger.log(`session ${session.sessionUuid} summarized up to seq ${cutoffSeq}`);
  }
}
