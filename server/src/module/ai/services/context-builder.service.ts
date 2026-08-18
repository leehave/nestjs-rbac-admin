import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In, MoreThan } from 'typeorm';

import type { LlmChatMessage } from '../providers/openai-stream.util';
import { AiChatMessageEntity } from '../entities/ai-chat-message.entity';
import { AiAgentEntity } from '../entities/ai-agent.entity';
import { AiConfigService } from './ai-config.service';
import { estimateMessagesTokens, estimateTokens } from '../utils/ai-token.util';

export interface ContextBuildResult {
  messages: LlmChatMessage[];
  historyRounds: number;
  estimatedPromptTokens: number;
  /** 预估上下文占用比例 0-100 */
  contextRatio: number;
}

@Injectable()
export class ContextBuilderService {
  constructor(
    @InjectRepository(AiChatMessageEntity)
    private readonly messageRepo: Repository<AiChatMessageEntity>,
    private readonly aiConfigService: AiConfigService,
  ) {}

  /**
   * 构建发送给 LLM 的消息列表，包含：稳定 system prompt、动态会话摘要/背景、
   * 裁剪后的历史记录（受 token 预算和 maxRounds 限制）、以及当前用户输入。
   * 通过 token 估算智能裁剪历史，确保上下文窗口不超限。
   * @param params.sessionId - 会话 ID
   * @param params.userContent - 用户当前输入
   * @param params.agent - 智能体配置（含 systemPrompt / maxHistoryRounds）
   * @param params.sessionSummary - 已有会话摘要
   * @param params.summaryUpToSeq - 摘要已覆盖的最大 seq
   * @param params.tenantId - 租户 ID
   * @param params.userName - 用户名（可选）
   * @param params.contextWindow - LLM 上下文窗口大小
   * @param params.maxOutputTokens - 最大输出 token 数
   * @returns 构建结果，含消息列表、历史轮数、预估 token 数、上下文占用比例
   */
  async buildMessages(params: {
    sessionId: string;
    userContent: string;
    agent: AiAgentEntity | null;
    sessionSummary?: string | null;
    summaryUpToSeq?: number;
    tenantId: number;
    userName?: string;
    contextWindow: number;
    maxOutputTokens: number;
  }): Promise<ContextBuildResult> {
    const maxRounds =
      params.agent?.maxHistoryRounds ?? (await this.aiConfigService.getMaxHistoryRounds());
    const reserveTokens = await this.aiConfigService.getContextReserveTokens();
    const messageMaxTokens = await this.aiConfigService.getMessageMaxTokens();
    const summaryUpToSeq = params.summaryUpToSeq ?? 0;

    const fetchLimit = Math.max(maxRounds * 2, maxRounds * 4);
    const history = await this.messageRepo.find({
      where: {
        sessionId: params.sessionId,
        role: In(['user', 'assistant']),
        status: 'completed',
        deleteTime: IsNull(),
        seq: MoreThan(summaryUpToSeq),
      },
      order: { seq: 'DESC' },
      take: fetchLimit,
    });
    history.reverse();

    // 1) 稳定 system —— 放首位以命中 DeepSeek/豆包前缀缓存
    const stableSystem = params.agent?.systemPrompt ?? '你是一个有帮助的 AI 助手。';
    const messages: LlmChatMessage[] = [{ role: 'system', content: stableSystem }];

    // 2) 动态背景（摘要）—— 与 Reasonix 一致：不写入 system，仅 append 区域可变
    if (params.sessionSummary?.trim()) {
      messages.push({
        role: 'user',
        content: `[会话背景]\n【历史摘要】\n${params.sessionSummary.trim()}`,
      });
    }

    const budget =
      params.contextWindow -
      params.maxOutputTokens -
      reserveTokens -
      estimateTokens(params.userContent) -
      estimateMessagesTokens(messages);

    const trimmedHistory: LlmChatMessage[] = [];
    for (const item of history) {
      if (!item.content) continue;
      trimmedHistory.push({
        role: item.role as 'user' | 'assistant',
        content: this.compactMessageContent(item.content, messageMaxTokens),
      });
    }

    // 从最近往前保留，直到 token 预算或 maxRounds
    let usedTokens = 0;
    let rounds = 0;
    const kept: LlmChatMessage[] = [];
    for (let i = trimmedHistory.length - 1; i >= 0; i--) {
      const msg = trimmedHistory[i];
      const cost = estimateTokens(msg.content) + 4;
      if (rounds >= maxRounds) break;
      if (usedTokens + cost > budget && kept.length > 0) break;
      kept.unshift(msg);
      usedTokens += cost;
      if (msg.role === 'user') rounds++;
    }

    messages.push(...kept);
    messages.push({ role: 'user', content: params.userContent });

    const estimatedPromptTokens = estimateMessagesTokens(messages);
    const contextRatio = Math.min(
      100,
      Math.round((estimatedPromptTokens / params.contextWindow) * 100),
    );

    return {
      messages,
      historyRounds: rounds,
      estimatedPromptTokens,
      contextRatio,
    };
  }

  /** Reasonix turn-end compaction 思路：单条历史过长则截断，完整内容仍在 DB */
  private compactMessageContent(content: string, maxTokens: number): string {
    const maxChars = Math.max(200, Math.floor(maxTokens * 1.6));
    if (content.length <= maxChars) return content;
    return `${content.slice(0, maxChars)}\n\n…[内容已截断，完整记录已保存]`;
  }
}
