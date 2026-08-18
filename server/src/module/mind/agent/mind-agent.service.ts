import { Injectable } from '@nestjs/common';
import { HumanMessage } from '@langchain/core/messages';
import { getTenantId } from '../../../common/utils/tenant.util';
import { MindHistoryService } from '../history/mind-history.service';
import { MindLlmRuntimeService } from '../llm/mind-llm-runtime.service';
import { MindVectorService } from '../vector/mind-vector.service';
import { MindSearchMemoryService } from '../agentic/memory/search-memory.service';
import { MindPromptService } from '../agentic/prompt/mind-prompt.service';
import { MindPatternAgentService } from '../agentic/agent/pattern-agent.service';
import { MindProgramAgentsService } from '../agentic/agent/mind-program-agents.service';
import { MindAgenticOrchestratorService } from '../agentic/agent/mind-agentic-orchestrator.service';
import { parseMindTopK, pickMindRagParameterOverride } from '../llm/mind-llm-config.util';
import { streamChatModelText } from '../llm/mind-llm-stream.util';
import { MindAgentInvokeDto, MindTravelInvokeDto } from './dto';

@Injectable()
export class MindAgentService {
  constructor(
    private readonly llmRuntime: MindLlmRuntimeService,
    private readonly vectorService: MindVectorService,
    private readonly historyService: MindHistoryService,
    private readonly searchMemoryService: MindSearchMemoryService,
    private readonly promptService: MindPromptService,
    private readonly patternAgent: MindPatternAgentService,
    private readonly programAgents: MindProgramAgentsService,
    private readonly agenticOrchestrator: MindAgenticOrchestratorService,
  ) {}

  /**
   * 从 DTO 中提取 LLM 配置参数（sourceId、model、type、baseUrl、apiKey、temperature）。
   * @param dto - 智能体调用 DTO 或旅游规划 DTO
   * @returns LLM 配置对象
   */
  private pickLlmFromDto(dto: MindAgentInvokeDto | MindTravelInvokeDto) {
    return {
      sourceId: dto.sourceId,
      model: dto.model,
      type: dto.type,
      baseUrl: dto.baseUrl,
      apiKey: dto.apiKey,
      temperature: dto.temperature,
    };
  }

  private pickRagFromDto(dto: MindAgentInvokeDto | MindTravelInvokeDto) {
    return pickMindRagParameterOverride(dto);
  }

  private resolveSource(dto: MindAgentInvokeDto, fallback: string) {
    return dto.source || fallback;
  }

  /**
   * 根据来源和模式构建用户提示词（Prompt）。
   * - search/topic 模式调用 agent program 生成提示词
   * - answer 模式且有 pattern 时调用 pattern 生成提示词
   * - 其他情况使用默认模板
   * @param args - 包含 source、pattern、query、memory、contextText 的参数对象
   * @returns 构建完成的提示词字符串
   */
  private buildUserPrompt(args: {
    source: string;
    pattern: string;
    query: string;
    memory: string;
    contextText: string;
  }) {
    const { source, pattern, query, memory, contextText } = args;
    const memorys = memory || '(empty)';

    if (source === 'search' || source === 'topic') {
      const text = this.promptService.buildAgentProgramGenerate(source as 'search' | 'topic', {
        context: contextText,
        question: query,
        memorys,
        topic: query,
      });
      if (text) return text;
    }

    if (source === 'answer' && pattern) {
      const text = this.promptService.buildAnswerGeneratePrompt(pattern, {
        query,
        context: contextText,
        memorys,
        results: contextText,
      });
      if (text) return text;
    }

    return this.promptService.formatTemplate(
      '请根据上下文回答问题。\n上下文：{context}\n问题：{question}\n历史记忆：{memorys}',
      { context: contextText || '(empty)', question: query, memorys },
    );
  }

  /**
   * 核心调用入口，根据 mode 分发到不同的处理逻辑（agent/agentic/search/topic）。
   * 支持 SSE 流式输出，包含历史记录、RAG 检索、模式匹配等完整流程。
   * @param dto - 智能体调用 DTO
   * @param mode - 运行模式：agent（基础问答）、agentic（多智能体编排）、search（搜索）、topic（主题）
   * @yields { type: 'event' | 'think' | 'data', payload: string } 流式输出帧
   */
  async *invoke(dto: MindAgentInvokeDto, mode: 'agent' | 'agentic' | 'search' | 'topic') {
    const tenantId = getTenantId() || 0;
    const sourceId = dto.source_id;
    const library = dto.library || '';
    const pattern = dto.pattern || '';
    const source = this.resolveSource(dto, mode === 'agent' ? 'answer' : mode);

    yield { type: 'event' as const, payload: 'Connection established' };
    await this.historyService.ensureHistoryMemory({
      source_id: sourceId,
      source,
      pattern,
      library,
      query: dto.query,
      chat_model_id: dto.chat_model_id || dto.sourceId,
    });
    yield { type: 'event' as const, payload: 'History Record completed' };

    const ragSetting = await this.llmRuntime.resolveRagSettingContent(this.pickRagFromDto(dto));
    let llm: Awaited<ReturnType<MindLlmRuntimeService['newChatModel']>>;
    let embeddings: Awaited<ReturnType<MindLlmRuntimeService['newEmbeddings']>> | undefined;
    try {
      llm = await this.llmRuntime.newChatModel({
        sourceId,
        chatModelId: dto.chat_model_id,
        llm: this.pickLlmFromDto(dto),
      });
      embeddings = mode === 'search' ? await this.llmRuntime.newEmbeddings({ rag: ragSetting }) : undefined;
    } catch (e: any) {
      yield { type: 'event' as const, payload: `error: ${e?.message || 'unknown'}` };
      yield { type: 'event' as const, payload: 'Streaming finished' };
      return;
    }
    yield { type: 'event' as const, payload: 'LLM and Vector loaded' };

    const memory = await this.searchMemoryService.searchMemory(sourceId, dto.query, ragSetting);
    yield { type: 'think' as const, payload: `共加载 ${memory ? memory.length : 0} 条历史记忆` };

    if (mode === 'agentic' && this.agenticOrchestrator.isAgenticPattern(pattern)) {
      let full = '';
      try {
        for await (const frame of this.agenticOrchestrator.run({ query: dto.query, memory, pattern, llm })) {
          if (frame.type === 'data') full += frame.payload;
          yield frame;
        }
      } catch (e: any) {
        yield { type: 'event' as const, payload: `error: ${e?.message || 'unknown'}` };
      } finally {
        if (sourceId && full) await this.historyService.insertAiDetail(sourceId, full);
        yield { type: 'event' as const, payload: 'Streaming finished' };
      }
      return;
    }

    if (mode === 'search' || mode === 'topic') {
      let full = '';
      try {
        const runner =
          mode === 'search'
            ? this.programAgents.runSearch({ tenantId, query: dto.query, memory, llm, embeddings, rag: ragSetting })
            : this.programAgents.runTopic({ tenantId, query: dto.query, memory, llm, rag: ragSetting });
        for await (const frame of runner) {
          if (frame.type === 'data') full += frame.payload;
          yield frame;
        }
      } catch (e: any) {
        yield { type: 'event' as const, payload: `error: ${e?.message || 'unknown'}` };
        const fallback = `你是一位问题答疑专家，请用中文详尽回答问题。\n\n问题：${dto.query}`;
        for await (const frame of streamChatModelText(llm, [new HumanMessage(fallback)])) {
          if (frame.type === 'data') full += frame.payload;
          yield frame;
        }
      } finally {
        if (sourceId && full) await this.historyService.insertAiDetail(sourceId, full);
        yield { type: 'event' as const, payload: 'Streaming finished' };
      }
      return;
    }

    if ((mode === 'agent' || mode === 'agentic') && this.patternAgent.isPatternAgent(pattern)) {
      let full = '';
      try {
        for await (const frame of this.patternAgent.run({
          pattern,
          query: dto.query,
          memory,
          llm,
          maxStep: pattern === 'ReAct' ? 3 : pattern === 'Reflexion' ? 2 : undefined,
        })) {
          if (frame.type === 'data') full += frame.payload;
          yield frame;
        }
      } catch (e: any) {
        yield { type: 'event' as const, payload: `error: ${e?.message || 'unknown'}` };
        const fallback = `你是一位问题答疑专家，请用中文详尽回答问题。\n\n问题：${dto.query}`;
        try {
          for await (const frame of streamChatModelText(llm, [new HumanMessage(fallback)])) {
            if (frame.type === 'data') full += frame.payload;
            yield frame;
          }
        } catch (err: any) {
          yield { type: 'event' as const, payload: `error: ${err?.message || 'unknown'}` };
        }
      } finally {
        if (sourceId && full) {
          await this.historyService.insertAiDetail(sourceId, full);
        }
        yield { type: 'event' as const, payload: 'Streaming finished' };
      }
      return;
    }

    const topK = parseMindTopK(ragSetting);
    const contexts = library
      ? await this.vectorService.similaritySearch(tenantId, library, dto.query, topK, { sourceId, rag: ragSetting })
      : [];
    if (contexts.length) {
      yield { type: 'think' as const, payload: `retrieval chunks: ${contexts.length}` };
    }

    const contextText = contexts.map((d, i) => `[#${i + 1}]\n${d.pageContent}`).join('\n\n');
    const user = this.buildUserPrompt({
      source,
      pattern,
      query: dto.query,
      memory,
      contextText,
    });

    let full = '';
    try {
      for await (const frame of streamChatModelText(llm, [new HumanMessage(user)])) {
        if (frame.type === 'data') full += frame.payload;
        yield frame;
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
   * 旅游规划调用入口，支持 SSE 流式输出。
   * 包含历史记录、LLM 初始化、记忆加载和执行旅游规划智能体的完整流程。
   * @param dto - 旅游规划 DTO（包含目的地、出发地、时间等）
   * @yields { type: 'event' | 'think' | 'data', payload: string } 流式输出帧
   */
  async *invokeTravel(dto: MindTravelInvokeDto) {
    const tenantId = getTenantId() || 0;
    const sourceId = dto.source_id;
    const library = dto.library || '';
    const pattern = dto.pattern || '';
    const source = dto.source || 'travel';

    yield { type: 'event' as const, payload: 'Connection established' };
    await this.historyService.ensureHistoryMemory({
      source_id: sourceId,
      source,
      pattern,
      library,
      query: dto.query,
      chat_model_id: dto.chat_model_id || dto.sourceId,
    });
    yield { type: 'event' as const, payload: 'History Record completed' };

    const ragSetting = await this.llmRuntime.resolveRagSettingContent(this.pickRagFromDto(dto));
    let llm: Awaited<ReturnType<MindLlmRuntimeService['newChatModel']>>;
    try {
      llm = await this.llmRuntime.newChatModel({
        sourceId,
        chatModelId: dto.chat_model_id,
        llm: this.pickLlmFromDto(dto),
      });
    } catch (e: any) {
      yield { type: 'event' as const, payload: `error: ${e?.message || 'unknown'}` };
      yield { type: 'event' as const, payload: 'Streaming finished' };
      return;
    }
    yield { type: 'event' as const, payload: 'LLM and Vector loaded' };

    const memory = await this.searchMemoryService.searchMemory(sourceId, dto.query, ragSetting);
    yield { type: 'think' as const, payload: `共加载 ${memory ? memory.length : 0} 条历史记忆` };

    let full = '';
    try {
      for await (const frame of this.programAgents.runTravel({ tenantId, query: dto.query, memory, llm, rag: ragSetting })) {
        if (frame.type === 'data') full += frame.payload;
        yield frame;
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
}
