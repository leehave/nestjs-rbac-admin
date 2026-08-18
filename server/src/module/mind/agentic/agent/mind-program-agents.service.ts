import { Injectable } from '@nestjs/common';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { Embeddings } from '@langchain/core/embeddings';
import { HumanMessage } from '@langchain/core/messages';
import { MindPromptService } from '../prompt/mind-prompt.service';
import { MindAgentToolsService } from '../tools/agent-tools.service';
import { streamChatModelText } from '../../llm/mind-llm-stream.util';
import { tryExtractResponseJson } from './agent-json.util';

export type MindProgramAgentFrame = { type: 'think' | 'data'; payload: string };

export type MindProgramAgentCtx = {
  tenantId: number;
  query: string;
  memory: string;
  llm: BaseChatModel;
  embeddings?: Embeddings;
  rag?: Record<string, any>;
};

@Injectable()
export class MindProgramAgentsService {
  constructor(
    private readonly promptService: MindPromptService,
    private readonly agentTools: MindAgentToolsService,
  ) {}

  /**
   * 运行搜索（Search）智能体。先评估问题复杂度，拆分查询，执行网络搜索，
   * 对结果进行语义排序，最后生成答案。
   * @param ctx - 包含 tenantId、query、memory、llm、embeddings、rag 的执行上下文
   * @yields { type: 'think' | 'data', payload: string } 流式输出帧
   */
  async *runSearch(ctx: MindProgramAgentCtx): AsyncGenerator<MindProgramAgentFrame> {
    yield { type: 'think', payload: '完成 LangGraph 工作流的构建' };
    const block = this.promptService.selectPrompt('agent_program.yml', 'search_agent');

    const analyze = this.promptService.formatTemplate(block?.analyze || '请给问题复杂度打分，只输出 JSON：{"complexity":0.5}\n问题：{question}', {
      question: ctx.query,
      format_instructions: '{"complexity": 0.0}',
    });
    const complexityRaw = await this.llmText(ctx.llm, analyze);
    const complexity = Number(tryExtractResponseJson(complexityRaw)?.complexity ?? complexityRaw.match(/0?\.\d+|1(?:\.0+)?/)?.[0] ?? 0.5);
    yield { type: 'think', payload: `问题复杂度评分：${Number.isFinite(complexity) ? complexity : 0.5}\n\n` };

    const queries = await this.researchQueries(ctx.llm, block?.research || '', ctx.query);
    yield { type: 'think', payload: `问题拆分为子问题：\n\n${queries.join('\n\n')}\n\n` };

    const documents: string[] = [];
    for (const query of queries) {
      const result = await this.safeTool('search_web', { query });
      if (result) documents.push(result);
    }
    yield { type: 'think', payload: `Web 检索到 ${documents.length} 组结果\n\n` };

    const ranked = await this.rankDocuments(ctx.query, documents, ctx.embeddings, this.topK(ctx.rag, 5));
    yield { type: 'think', payload: `语义排序后保留 ${ranked.length} 组上下文\n\n` };

    const prompt = this.promptService.formatTemplate(
      block?.generate || '请根据上下文回答问题。\n上下文：{context}\n问题：{question}\n历史记忆：{memorys}',
      { context: ranked.join('\n\n'), question: ctx.query, memorys: ctx.memory || '(empty)' },
    );
    yield* this.streamAnswer(ctx.llm, prompt);
  }

  /**
   * 运行主题（Topic）智能体。拆分查询，执行网络搜索，提取关键词/情感/摘要，
   * 最后生成主题报告。
   * @param ctx - 执行上下文
   * @yields { type: 'think' | 'data', payload: string } 流式输出帧
   */
  async *runTopic(ctx: MindProgramAgentCtx): AsyncGenerator<MindProgramAgentFrame> {
    yield { type: 'think', payload: '完成 LangGraph 工作流的构建' };
    const block = this.promptService.selectPrompt('agent_program.yml', 'topic_agent');

    const queries = await this.researchQueries(ctx.llm, block?.research || '', ctx.query);
    yield { type: 'think', payload: `问题拆分为子问题：\n\n${queries.join('\n\n')}\n\n` };

    const documents: string[] = [];
    for (const query of queries) {
      documents.push(await this.safeTool('search_web', { query }));
    }
    yield { type: 'think', payload: `调用工具 search_web，检索到 ${documents.filter(Boolean).length} 组文本\n\n` };

    const rows: string[] = [];
    for (const document of documents.filter(Boolean)) {
      const keyword = await this.llmText(ctx.llm, this.promptService.formatTemplate(block?.extract || '提取关键词：{document}', { document }));
      const sentiment = await this.llmText(ctx.llm, this.promptService.formatTemplate(block?.analyze || '分析情感：{document}', { document }));
      const summary = await this.llmText(ctx.llm, this.promptService.formatTemplate(block?.summary || '总结文本：{document}', { document }));
      rows.push(`关键词：${keyword}\n情感：${sentiment}\n总结：${summary}`);
    }
    yield { type: 'think', payload: `提取到 ${rows.length} 组关键字、情感和总结\n\n` };

    const prompt = this.promptService.formatTemplate(
      block?.generate || '请根据主题和上下文撰写主题报告。\n主题：{topic}\n上下文：{context}\n历史记忆：{memorys}',
      { topic: ctx.query, context: rows.join('\n\n'), memorys: ctx.memory || '(empty)' },
    );
    yield* this.streamAnswer(ctx.llm, prompt);
  }

  /**
   * 运行旅游规划（Travel）智能体。解析旅游要素，并行检索美食、景点、
   * 风俗、天气、交通、路线、酒店等信息，生成综合旅游报告。
   * @param ctx - 执行上下文
   * @yields { type: 'think' | 'data', payload: string } 流式输出帧
   */
  async *runTravel(ctx: MindProgramAgentCtx): AsyncGenerator<MindProgramAgentFrame> {
    yield { type: 'think', payload: '完成 LangGraph 工作流的构建' };
    const acts = await this.extractTravelActs(ctx.llm, ctx.query);
    yield { type: 'think', payload: `解析到 ${acts.length} 个旅游计划要素\n\n` };

    const reports: string[] = [];
    for (const act of acts) {
      const target = act.target_address || ctx.query;
      const dateText = [act.travel_date, act.travel_day ? `${act.travel_day}天` : ''].filter(Boolean).join(' ');
      const [foods, scenery, custom, weather, transport, path, hotels] = await Promise.all([
        this.safeTool('search_web', { query: `${target} 特色美食` }),
        this.safeTool('search_web', { query: `${target} 主要景点` }),
        this.safeTool('search_web', { query: `${target} 风俗禁忌 注意事项` }),
        this.safeTool('search_weather', { city: target }),
        this.safeTool('search_web', { query: `${act.from_address || ''} 到 ${target} 交通 ${dateText}` }),
        this.safeTool('search_web', { query: `${target} ${dateText} 旅游路线规划` }),
        this.safeTool('search_web', { query: `${target} 酒店 住宿 推荐 ${dateText}` }),
      ]);
      reports.push(
        [
          `目的地：${target}`,
          `出发地：${act.from_address || '未指定'}`,
          `时间：${dateText || '未指定'}`,
          `特色美食：${foods}`,
          `主要景点：${scenery}`,
          `风俗习惯：${custom}`,
          `天气：${weather}`,
          `交通：${transport}`,
          `路线：${path}`,
          `酒店：${hotels}`,
        ].join('\n'),
      );
      yield { type: 'think', payload: `${target} 的旅游资料检索完成\n\n` };
    }

    const prompt = `你是一位旅游规划专家，请根据资料生成详尽中文旅游报告。\n\n用户问题：${ctx.query}\n\n历史记忆：${ctx.memory || '(empty)'}\n\n资料：\n${reports.join('\n\n')}`;
    yield* this.streamAnswer(ctx.llm, prompt);
  }

  /**
   * 将用户问题拆分为多个可搜索的子查询。
   * @param llm - 语言模型实例
   * @param template - 提示词模板
   * @param topic - 原始问题/主题
   * @returns 子查询数组，最多 5 个
   */
  private async researchQueries(llm: BaseChatModel, template: string, topic: string) {
    const prompt = this.promptService.formatTemplate(
      template || '将这个主题分解为3-5个可搜索查询：{topic}',
      { topic },
    );
    const raw = await this.llmText(llm, prompt);
    const queries = raw
      .split(/\n+/)
      .map((s) => s.replace(/^\s*[-*\d.、)）]+\s*/, '').trim())
      .filter(Boolean);
    return queries.length ? queries.slice(0, 5) : [topic];
  }

  /**
   * 从用户问题中提取旅游规划要素（出发地、目的地、时间、天数）。
   * @param llm - 语言模型实例
   * @param query - 用户问题
   * @returns 旅游要素数组，最多 3 个
   */
  private async extractTravelActs(llm: BaseChatModel, query: string) {
    const raw = await this.llmText(
      llm,
      `请从用户问题中抽取旅游要素，只输出 JSON：{"travel_acts":[{"from_address":"","target_address":"","travel_date":"","travel_day":1}]}\n\n问题：${query}`,
    );
    const parsed = tryExtractResponseJson(raw);
    const acts = Array.isArray(parsed?.travel_acts) ? parsed.travel_acts : [];
    return acts.length ? acts.slice(0, 3) : [{ from_address: '', target_address: query, travel_date: '', travel_day: 0 }];
  }

  /**
   * 安全调用工具，捕获异常并返回错误信息而非抛出。
   * @param name - 工具名称
   * @param params - 工具参数
   * @returns 工具执行结果或错误信息
   */
  private async safeTool(name: string, params: Record<string, string>) {
    try {
      return await this.agentTools.invokeTool(name, params);
    } catch (e: any) {
      return `工具 ${name} 执行失败：${e?.message || 'unknown'}`;
    }
  }

  /**
   * 调用 LLM 获取文本响应，统一处理多种 content 格式。
   * @param llm - 语言模型实例
   * @param prompt - 提示词文本
   * @returns 模型返回的文本内容
   */
  private async llmText(llm: BaseChatModel, prompt: string) {
    const res: any = await llm.invoke([new HumanMessage(prompt)]);
    const content = res?.content;
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) return content.map((v) => (typeof v === 'string' ? v : String(v?.text ?? v?.content ?? ''))).join('');
    return content == null ? '' : String(content);
  }

  private async *streamAnswer(llm: BaseChatModel, prompt: string): AsyncGenerator<MindProgramAgentFrame> {
    for await (const frame of streamChatModelText(llm, [new HumanMessage(prompt)])) {
      yield frame;
    }
  }

  private topK(rag: Record<string, any> | undefined, fallback: number) {
    const n = Number(rag?.topK ?? rag?.top_k);
    return Number.isFinite(n) && n > 0 ? Math.min(20, Math.floor(n)) : fallback;
  }

  /**
   * 计算两个向量之间的余弦相似度。
   * @param a - 向量 a
   * @param b - 向量 b
   * @returns 余弦相似度值（0~1）
   */
  private cosine(a: number[], b: number[]) {
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    return na && nb ? dot / Math.sqrt(na * nb) : 0;
  }

  /**
   * 对文档进行语义排序：使用嵌入向量计算查询与文档的相似度，返回 Top-K 结果。
   * @param query - 查询文本
   * @param documents - 待排序的文档数组
   * @param embeddings - 嵌入模型实例
   * @param topK - 返回的 top K 数量
   * @returns 排序后的文档数组
   */
  private async rankDocuments(query: string, documents: string[], embeddings: Embeddings | undefined, topK: number) {
    const docs = documents.filter(Boolean);
    if (!embeddings || docs.length <= 1) return docs.slice(0, topK);
    const q = await embeddings.embedQuery(query);
    const embs = await embeddings.embedDocuments(docs);
    return docs
      .map((doc, i) => ({ doc, score: this.cosine(q, embs[i]) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map((row) => row.doc);
  }
}
