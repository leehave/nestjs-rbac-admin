import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { MindHistoryService } from '../history/mind-history.service';
import { MindLlmRuntimeService } from '../llm/mind-llm-runtime.service';
import { MindLlmStreamParser, parseLlmStreamChunk } from '../llm/mind-llm-stream.util';
import { pickMindLlmConnectConfig } from '../llm/mind-llm-config.util';
import { getTenantId } from '../../../common/utils/tenant.util';
import { MindChatDto, MindImageGenerateDto } from './dto';

@Injectable()
export class MindModalService {
  constructor(
    private readonly configService: ConfigService,
    private readonly llmRuntime: MindLlmRuntimeService,
    private readonly historyService: MindHistoryService,
  ) {}

  private requireTenantId(): number {
    const tenantId = getTenantId();
    if (!tenantId) throw new UnauthorizedException('Unauthorized');
    return tenantId;
  }

  /**
   * 流式聊天对话。
   * 确保租户身份，初始化历史记忆，创建 LLM 模型实例，流式生成回复并逐帧产出。
   * 流结束后自动保存 AI 回复详情到历史记录。
   * @param dto - 聊天请求传输对象
   * @yields { type: 'event' | 'data', payload: string } - 事件或数据帧
   */
  async *chat(dto: MindChatDto) {
    this.requireTenantId();
    const sourceId = dto.source_id;
    const source = dto.source || 'llm';
    const pattern = dto.pattern || 'chat';

    yield { type: 'event' as const, payload: 'Connection established' };
    await this.historyService.ensureHistoryMemory({
      source_id: sourceId,
      source,
      pattern,
      query: dto.query,
      chat_model_id: dto.chat_model_id,
    });
    yield { type: 'event' as const, payload: 'History Record completed' };

    const llm = await this.llmRuntime.newChatModel({
      sourceId,
      chatModelId: dto.chat_model_id,
      llm: pickMindLlmConnectConfig(dto as Record<string, any>),
    });
    const sys = '你是 Mind 大模型聊天助手。请用清晰、简洁的方式回答用户问题。';
    let full = '';
    const parser = new MindLlmStreamParser();
    try {
      const stream = await llm.stream([new SystemMessage(sys), new HumanMessage(dto.query)]);
      for await (const chunk of stream as any) {
        for (const frame of parseLlmStreamChunk(chunk, parser)) {
          if (frame.type === 'data') full += frame.payload;
          yield frame;
        }
      }
    } catch (e: any) {
      yield { type: 'event' as const, payload: `error: ${e?.message || 'unknown'}` };
    } finally {
      if (sourceId && full) {
        await this.historyService.insertAiDetail(sourceId, full);
      }
      yield { type: 'event' as const, payload: 'Streaming finished' };
    }
  }

  /**
   * 构建 OpenAI 兼容的基础 URL。
   * 从配置中读取 baseUrl，确保以 /v1 结尾。
   * @returns 标准化的 OpenAI API 基础地址
   */
  private buildOpenAiBaseUrl() {
    const raw = this.configService.get<string>('mind.llm.openai.baseUrl') || '';
    const base = raw.trim() || 'https://api.openai.com';
    if (/\/v1\/?$/i.test(base)) return base.replace(/\/$/, '');
    return `${base.replace(/\/$/, '')}/v1`;
  }

  /**
   * 规范化图片尺寸参数。
   * 只允许预设的尺寸集合，不合法时返回默认 1024x1024。
   * @param size - 用户传入的尺寸字符串
   * @returns 合规的尺寸字符串
   */
  private normalizeSize(size?: string) {
    const s = String(size || '1024x1024').trim();
    const allow = new Set(['256x256', '512x512', '1024x1024', '1024x1536', '1536x1024']);
    if (allow.has(s)) return s;
    return '1024x1024';
  }

  /**
   * 生成图片。
   * 调用 OpenAI 图片生成 API，支持 base64 或 URL 格式返回。
   * @param dto - 图片生成请求参数
   * @returns 图片数据（base64 或 URL 字符串）
   * @throws BadRequestException - 当查询为空、API Key 未配置或生成失败时
   */
  async generateImage(dto: MindImageGenerateDto) {
    this.requireTenantId();
    const prompt = String(dto.query || '').trim();
    if (!prompt) throw new BadRequestException('query is required');

    const apiKey = this.configService.get<string>('mind.llm.openai.apiKey') || '';
    if (!apiKey) throw new BadRequestException('MIND_OPENAI_API_KEY is required for image generation');

    const baseUrl = this.buildOpenAiBaseUrl();
    const model = this.configService.get<string>('mind.image.openaiModel') || 'gpt-image-1';
    const size = this.normalizeSize(dto.size);
    const format = String(dto.format || 'b64').toLowerCase();

    const res = await axios.post(
      `${baseUrl}/images/generations`,
      {
        model,
        prompt,
        size,
        response_format: format === 'url' ? 'url' : 'b64_json',
      },
      {
        timeout: 60000,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      },
    );

    const data = res.data;
    const item = Array.isArray(data?.data) ? data.data[0] : null;
    if (!item) throw new BadRequestException('image generation failed');
    if (format === 'url' && item.url) return String(item.url);
    if (item.b64_json) return `data:image/png;base64,${String(item.b64_json)}`;
    if (item.url) return String(item.url);
    throw new BadRequestException('image generation failed');
  }
}
