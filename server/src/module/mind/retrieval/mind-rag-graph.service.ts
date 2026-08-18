import { Injectable, Logger } from '@nestjs/common';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { Document } from '@langchain/core/documents';
import type { Embeddings } from '@langchain/core/embeddings';
import { HumanMessage } from '@langchain/core/messages';
import axios from 'axios';
import { htmlToText } from 'html-to-text';
import { MindPromptService } from '../agentic/prompt/mind-prompt.service';
import { MindAgentToolsService } from '../agentic/tools/agent-tools.service';
import { streamText, tryExtractResponseJson } from '../agentic/agent/agent-json.util';
import { MindVectorService } from '../vector/mind-vector.service';
import { MindDocumentService } from '../document/mind-document.service';
import { splitTextStrings } from '../document/utils/document-chunk.util';
import { extractLlmChunkText, streamChatModelText } from '../llm/mind-llm-stream.util';

export type RagGraphFrame = { type: 'think' | 'data'; payload: string };

export type RagGraphCtx = {
  tenantId: number;
  library: string;
  query: string;
  memory: string;
  pattern: string;
  llm: BaseChatModel;
  embeddings: Embeddings;
  sourceId?: string;
  rag?: Record<string, any>;
};

const ADVANCE_PATTERNS = new Set(['Corrective', 'SelfCheck', 'Adaptive']);
const RUNOOB_PREFIX = 'https://www.runoob.com/';
const RUNOOB_SUFFIX = '-tutorial.html';

@Injectable()
export class MindRagGraphService {
  private readonly logger = new Logger(MindRagGraphService.name);

  constructor(
    private readonly promptService: MindPromptService,
    private readonly agentTools: MindAgentToolsService,
    private readonly vectorService: MindVectorService,
    private readonly documentService: MindDocumentService,
  ) {}

  /**
   * 判断指定的来源和模式是否使用 LangGraph 工作流。
   * @param source - 检索来源类型
   * @param pattern - 检索模式（可选）
   * @returns 是否使用 LangGraph
   */
  usesLangGraph(source: string, pattern?: string) {
    const p = String(pattern || '').trim();
    if (source === 'program' || source === 'arxiv') return true;
    if (source === 'advance' && ADVANCE_PATTERNS.has(p)) return true;
    return false;
  }

  /**
   * 执行高级检索的 LangGraph 工作流。
   * 根据模式分发到 Corrective / SelfCheck / Adaptive 子工作流。
   * @param ctx - RAG 图上下文
   * @yields 思考和数据帧
   */
  async *runAdvance(ctx: RagGraphCtx): AsyncGenerator<RagGraphFrame> {
    yield { type: 'think', payload: '完成 LangGraph 工作流的构建' };
    if (ctx.pattern === 'Corrective') yield* this.runCorrective(ctx);
    else if (ctx.pattern === 'SelfCheck') yield* this.runSelfCheck(ctx);
    else if (ctx.pattern === 'Adaptive') yield* this.runAdaptive(ctx);
    else yield* this.runCorrective(ctx);
  }

  /**
   * 执行编程类 RAG 的 LangGraph 工作流。
   * 抓取教程网站和搜索结果，结合知识库与社区关系检索生成回答。
   * @param ctx - RAG 图上下文
   * @yields 思考和数据帧
   */
  async *runProgram(ctx: RagGraphCtx): AsyncGenerator<RagGraphFrame> {
    yield { type: 'think', payload: '完成 LangGraph 工作流的构建' };
    const langPattern = ctx.pattern || 'python';
    let tutorialDocs: string[] = [];
    let searchDocs: string[] = [];

    try {
      const url = `${RUNOOB_PREFIX}${langPattern}${RUNOOB_SUFFIX}`;
      const res = await axios.get(url, { timeout: 15000, responseType: 'text' });
      const text = htmlToText(String(res.data || ''), { wordwrap: false });
      tutorialDocs = await splitTextStrings(text);
      yield { type: 'think', payload: `搜索 tutorial 网站生成 ${tutorialDocs.length} 个 Chunk 数据片段\n\n` };
    } catch (e: any) {
      yield { type: 'think', payload: `tutorial 抓取失败：${e?.message || 'unknown'}\n\n` };
    }

    try {
      const web = await this.agentTools.invokeTool('search_web', { query: ctx.query });
      searchDocs = await splitTextStrings(web);
      yield { type: 'think', payload: `Web 检索到 ${searchDocs.length} 个数据片段\n\n` };
    } catch (e: any) {
      yield { type: 'think', payload: `Web 检索失败：${e?.message || 'unknown'}\n\n` };
    }

    const pool = [...tutorialDocs, ...searchDocs];
    const vectorDocs = await this.rankByEmbedding(ctx.query, pool, ctx.embeddings, 5);
    yield { type: 'think', payload: `语义检索到 ${vectorDocs.length} 个 Chunk 数据片段\n\n` };

    const libraryDocs = await this.vectorRetrieve(ctx, 5);
    yield { type: 'think', payload: `知识库检索到 ${libraryDocs.length} 个 Chunk 数据片段\n\n` };

    const graphDocs = this.communityRetrieve(ctx.query, pool);
    yield { type: 'think', payload: `社区关系检索到片段：\n\n${graphDocs.slice(0, 500)}\n\n` };

    const context = [...this.docsToStrings(libraryDocs), ...vectorDocs, graphDocs, ...searchDocs.slice(0, 3)].join('\n\n');
    yield* this.generateFromPrompt('rag_program.yml', 'program_rag', ctx, context);
  }

  /**
   * 执行 arXiv 论文检索的 LangGraph 工作流。
   * 支持中英文查询，搜索 arXiv 和 Web，结合知识库与社区关系检索生成回答。
   * @param ctx - RAG 图上下文
   * @yields 思考和数据帧
   */
  async *runArxiv(ctx: RagGraphCtx): AsyncGenerator<RagGraphFrame> {
    yield { type: 'think', payload: '完成 LangGraph 工作流的构建' };
    let arxivDocs: string[] = [];
    let searchDocs: string[] = [];
    let query = ctx.query;

    if (/[\u4e00-\u9fff]/.test(query)) {
      try {
        query = await this.agentTools.invokeTool('translate_text', { text: query, src: 'zh', dest: 'en' });
      } catch {
        void 0;
      }
    }

    try {
      arxivDocs = await this.searchArxiv(query, 5);
      yield { type: 'think', payload: `共检索到 ${arxivDocs.length} 个 arxiv 片段\n\n` };
    } catch (e: any) {
      yield { type: 'think', payload: `arxiv 检索失败：${e?.message || 'unknown'}\n\n` };
    }

    try {
      const web = await this.agentTools.invokeTool('search_web', { query: ctx.query });
      searchDocs = await splitTextStrings(web);
      yield { type: 'think', payload: `共检索到 ${searchDocs.length} 个 web 片段\n\n` };
    } catch (e: any) {
      yield { type: 'think', payload: `Web 检索失败：${e?.message || 'unknown'}\n\n` };
    }

    const pool = [...arxivDocs, ...searchDocs];
    const vectorDocs = await this.rankByEmbedding(ctx.query, pool, ctx.embeddings, 5);
    yield { type: 'think', payload: `共检索到 ${vectorDocs.length} 个 vector 片段\n\n` };

    const libraryDocs = await this.vectorRetrieve(ctx, 5);
    yield { type: 'think', payload: `知识库检索到 ${libraryDocs.length} 个 Chunk 数据片段\n\n` };

    const graphDocs = this.communityRetrieve(ctx.query, pool);
    yield { type: 'think', payload: `共检索到 community 片段：\n\n${graphDocs.slice(0, 500)}\n\n` };

    const context = [...this.docsToStrings(libraryDocs), ...vectorDocs, graphDocs, ...searchDocs.slice(0, 3)].join('\n\n');
    yield* this.generateFromPrompt('rag_program.yml', 'arxiv_rag', ctx, context);
  }

  /**
   * Corrective RAG 工作流。
   * 检索文档后评估相关性，若不相关则转换查询并搜索 Web。
   * @param ctx - RAG 图上下文
   * @yields 思考和数据帧
   */
  private async *runCorrective(ctx: RagGraphCtx): AsyncGenerator<RagGraphFrame> {
    const block = this.promptService.selectPrompt('rag_advance.yml', 'corrective_rag');
    let docs: string | Document[] = await this.vectorRetrieve(ctx, 3);
    yield { type: 'think', payload: `共检索到 ${Array.isArray(docs) ? docs.length : 1} 个原始片段\n\n` };

    const grade = await this.gradeDocs(ctx, block?.grade || '', docs);
    yield { type: 'think', payload: `评估检索到的文档与用户问题的相关性结果为: ${grade}\n\n` };

    if (grade !== 'yes') {
      const keyword = await this.transformQuery(ctx, block?.transform || '', ctx.query);
      yield { type: 'think', payload: `将输入的问题转换为优化后的更好版本为：${keyword}\n\n` };
      const web = await this.agentTools.invokeTool('search_web', { query: keyword });
      yield { type: 'think', payload: `执行工具 search_web\n\n工具执行结果为：${web.slice(0, 600)}\n\n` };
      docs = web;
    }

    yield* this.streamGenerateAdvance(block?.generate || '', ctx, docs);
  }

  /**
   * Self-Check RAG 工作流。
   * 最多循环 3 轮检索-评估-生成，通过幻觉检测和有用性检测确保答案质量。
   * @param ctx - RAG 图上下文
   * @yields 思考和数据帧
   */
  private async *runSelfCheck(ctx: RagGraphCtx): AsyncGenerator<RagGraphFrame> {
    const block = this.promptService.selectPrompt('rag_advance.yml', 'self_check_rag');
    let query = ctx.query;
    let docs: string | Document[] = await this.vectorRetrieve(ctx, 3);
    let streamed = false;

    for (let loop = 0; loop < 3; loop++) {
      const docList = (Array.isArray(docs) ? docs : [docs]) as (string | Document)[];
      yield { type: 'think', payload: `共检索到 ${docList.length} 个原始片段\n\n` };
      const grade = await this.gradeDocs(ctx, block?.grade || '', docList);
      yield { type: 'think', payload: `评估检索到的文档与用户问题的相关性结果为: ${grade}\n\n` };
      if (grade !== 'yes') {
        query = await this.transformQuery(ctx, block?.transform || '', query);
        yield { type: 'think', payload: `将输入的问题转换为优化后的更好版本为：${query}\n\n` };
        docs = await this.vectorRetrieve({ ...ctx, query }, 3);
        continue;
      }

      // 对齐 mind：generate 节点流式输出后再做幻觉/有用性检测
      let answer = '';
      for await (const frame of this.streamGenerateAdvance(block?.generate || '', ctx, docList)) {
        if (frame.type === 'data') {
          answer += frame.payload;
          streamed = true;
        }
        yield frame;
      }
      if (!answer.trim()) continue;

      const hallucination = await this.gradeYesNo(
        ctx,
        block?.hallucination || '',
        `检索的文档:\n${this.docsText(docList)}\n生成答案: ${answer}`,
      );
      if (hallucination !== 'yes') {
        yield { type: 'think', payload: `幻觉检测未通过，重新生成\n\n` };
        continue;
      }
      const useful = await this.gradeYesNo(
        ctx,
        block?.answer || '',
        `用户输入的问题: ${ctx.query}\n答案：${answer}`,
      );
      if (useful === 'yes') return;

      query = await this.transformQuery(ctx, block?.transform || '', query);
      docs = await this.vectorRetrieve({ ...ctx, query }, 3);
    }

    if (!streamed) {
      yield* this.streamGenerateAdvance(block?.generate || '', ctx, docs);
    }
  }

  /**
   * Adaptive RAG 工作流。
   * 根据文档摘要动态路由到向量检索或 Web 搜索，最多 3 轮评估-优化循环。
   * @param ctx - RAG 图上下文
   * @yields 思考和数据帧
   */
  private async *runAdaptive(ctx: RagGraphCtx): AsyncGenerator<RagGraphFrame> {
    const block = this.promptService.selectPrompt('rag_advance.yml', 'adaptive_rag');
    const summary = await this.documentService.getSummaryByLibrary(ctx.tenantId, ctx.library);
    const decidePrompt = this.promptService.formatTemplate(block?.decide || '', {
      document_summary: summary || '通用',
    });
    const route = await this.llmJson(
      ctx.llm,
      `${decidePrompt}\n\n问题：${ctx.query}\n只输出 JSON：{"decide":"vector_store"|"web_search"}`,
    );
    const decide = String(route?.decide || 'vector_store');
    yield { type: 'think', payload: `Adaptive 路由：${decide}\n\n` };

    let docs: string | Document[] =
      decide === 'web_search'
        ? await this.agentTools.invokeTool('search_web', { query: ctx.query })
        : await this.vectorRetrieve(ctx, 3);

    if (decide === 'web_search') {
      yield { type: 'think', payload: `Web 检索完成\n\n` };
      yield* this.streamGenerateAdvance(block?.generate || '', ctx, docs);
      return;
    }

    let query = ctx.query;
    let streamed = false;
    for (let loop = 0; loop < 3; loop++) {
      const docList = (Array.isArray(docs) ? docs : [docs]) as (string | Document)[];
      yield { type: 'think', payload: `共检索到 ${docList.length} 个原始片段\n\n` };
      const grade = await this.gradeDocs(ctx, block?.grade || '', docList);
      yield { type: 'think', payload: `评估检索到的文档与用户问题的相关性结果为: ${grade}\n\n` };
      if (grade !== 'yes') {
        query = await this.transformQuery(ctx, block?.transform || '', query);
        docs = await this.vectorRetrieve({ ...ctx, query }, 3);
        continue;
      }
      let answer = '';
      for await (const frame of this.streamGenerateAdvance(block?.generate || '', ctx, docList)) {
        if (frame.type === 'data') {
          answer += frame.payload;
          streamed = true;
        }
        yield frame;
      }
      if (!answer.trim()) continue;

      const hallucination = await this.gradeYesNo(
        ctx,
        block?.hallucination || '',
        `检索的文档:\n${this.docsText(docList)}\n生成答案: ${answer}`,
      );
      if (hallucination !== 'yes') {
        yield { type: 'think', payload: `幻觉检测未通过，重新生成\n\n` };
        continue;
      }
      const useful = await this.gradeYesNo(
        ctx,
        block?.answer || '',
        `用户输入的问题: ${ctx.query}\n答案：${answer}`,
      );
      if (useful === 'yes') return;

      query = await this.transformQuery(ctx, block?.transform || '', query);
      docs = await this.vectorRetrieve({ ...ctx, query }, 3);
    }
    if (!streamed) {
      yield* this.streamGenerateAdvance(block?.generate || '', ctx, docs);
    }
  }

  /**
   * 从向量知识库中检索相关文档。
   * @param ctx - RAG 图上下文
   * @param k - 返回数量
   * @returns 检索到的文档列表
   */
  private async vectorRetrieve(ctx: RagGraphCtx, k: number) {
    if (!ctx.library) return [];
    return this.vectorService.similaritySearch(ctx.tenantId, ctx.library, ctx.query, k, {
      sourceId: ctx.sourceId,
      rag: ctx.rag,
    });
  }

  /**
   * 将文档内容统一转为纯文本字符串。
   * 支持 string、Document、Document[] 等多种输入格式。
   * @param docs - 文档或文档列表
   * @returns 拼接后的纯文本
   */
  private docsText(docs: string | Document | Document[] | (string | Document)[]) {
    if (typeof docs === 'string') return docs;
    if (Array.isArray(docs)) {
      return docs.map((d) => (typeof d === 'string' ? d : d.pageContent)).join('\n\n');
    }
    return docs.pageContent;
  }

  private docsToStrings(docs: Document[]) {
    return docs.map((doc, i) => `知识库片段 ${i + 1}：\n${doc.pageContent}`);
  }

  private async llmText(llm: BaseChatModel, prompt: string) {
    const res: any = await llm.invoke([new HumanMessage(prompt)]);
    return extractLlmChunkText(res);
  }

  private async *streamLlm(ctx: RagGraphCtx, prompt: string): AsyncGenerator<RagGraphFrame> {
    yield* streamChatModelText(ctx.llm, [new HumanMessage(prompt)]);
  }

  private async llmJson(llm: BaseChatModel, prompt: string) {
    return tryExtractResponseJson(await this.llmText(llm, prompt)) || {};
  }

  /**
   * 解析 LLM 返回的评分结果。
   * @param raw - LLM 原始输出
   * @returns 'yes' 或 'no'
   */
  private parseGrade(raw: string): 'yes' | 'no' {
    const parsed = tryExtractResponseJson(raw);
    const token = String(parsed?.grade ?? raw).trim().toLowerCase();
    if (/^(yes|y|是|true|相关|通过)/.test(token)) return 'yes';
    if (/^(no|n|否|false|不相关|不通过|不)/.test(token)) return 'no';
    if (/\byes\b/.test(token) || /^是/.test(token)) return 'yes';
    return 'no';
  }

  /**
   * 评估检索文档与用户问题的相关性。
   * @param ctx - RAG 图上下文
   * @param template - 评分提示模板
   * @param docs - 待评估的文档
   * @returns 'yes'（相关）或 'no'（不相关）
   */
  private async gradeDocs(
    ctx: RagGraphCtx,
    template: string,
    docs: string | Document | Document[] | (string | Document)[],
  ) {
    const sys = this.promptService.formatTemplate(template, {});
    const raw = await this.llmText(
      ctx.llm,
      `${sys}\n\n检索的文档:\n${this.docsText(docs)}\n用户输入的问题: ${ctx.query}\n只输出 JSON：{"grade":"yes"|"no"} 或 {"grade":"是"|"否"}`,
    );
    return this.parseGrade(raw);
  }

  /**
   * 对生成答案进行二分类评估（幻觉检测 / 有用性检测）。
   * @param ctx - RAG 图上下文
   * @param template - 评估提示模板
   * @param human - 评估内容（文档+答案 或 问题+答案）
   * @returns 'yes'（通过）或 'no'（不通过）
   */
  private async gradeYesNo(ctx: RagGraphCtx, template: string, human: string) {
    const raw = await this.llmText(
      ctx.llm,
      `${template}\n\n${human}\n只输出 JSON：{"grade":"yes"|"no"} 或 {"grade":"是"|"否"}`,
    );
    return this.parseGrade(raw);
  }

  private async transformQuery(ctx: RagGraphCtx, template: string, query: string) {
    const sys = this.promptService.formatTemplate(template, { query, max_length: String(query.length * 2) });
    const raw = await this.llmText(ctx.llm, `${sys}\n\n用户输入的问题：${query}\n创建更佳问题，只输出改写后的问题。`);
    return raw.trim() || query;
  }

  /**
   * 流式生成高级 RAG 回答。
   * 格式化提示模板后调用 LLM 流式输出。
   * @param template - 生成提示模板
   * @param ctx - RAG 图上下文
   * @param docs - 检索到的文档
   * @yields 数据帧
   */
  private async *streamGenerateAdvance(
    template: string,
    ctx: RagGraphCtx,
    docs: string | Document | Document[] | (string | Document)[],
  ): AsyncGenerator<RagGraphFrame> {
    const prompt = this.promptService.formatTemplate(
      template || '请根据检索文档回答用户问题。\n\n检索文档：{documents}\n\n用户问题：{question}\n\n历史记忆：{memorys}',
      {
      question: ctx.query,
      documents: this.docsText(docs),
      memorys: ctx.memory || '(empty)',
      },
    );
    if (!prompt.trim()) return;
    yield* this.streamLlm(ctx, prompt);
  }

  /**
   * 一次性生成高级 RAG 回答文本（非流式）。
   * @param template - 生成提示模板
   * @param ctx - RAG 图上下文
   * @param docs - 检索到的文档
   * @returns 生成的回答文本
   */
  private async generateAdvanceText(
    template: string,
    ctx: RagGraphCtx,
    docs: string | Document | Document[] | (string | Document)[],
  ) {
    const prompt = this.promptService.formatTemplate(template, {
      question: ctx.query,
      documents: this.docsText(docs),
      memorys: ctx.memory || '(empty)',
    });
    return this.llmText(ctx.llm, prompt);
  }

  /**
   * 一次生成并逐帧输出高级 RAG 回答。
   * @param template - 生成提示模板
   * @param ctx - RAG 图上下文
   * @param docs - 检索到的文档
   * @yields 数据帧
   */
  private async *generateAdvance(
    template: string,
    ctx: RagGraphCtx,
    docs: string | Document | Document[] | (string | Document)[],
  ): AsyncGenerator<RagGraphFrame> {
    yield* this.emitAnswer(await this.generateAdvanceText(template, ctx, docs));
  }

  /**
   * 从 YAML 配置中选择提示模板并生成回答。
   * @param file - 提示文件名称
   * @param key - 提示键名
   * @param ctx - RAG 图上下文
   * @param context - 拼接好的上下文文本
   * @yields 数据帧
   */
  private async *generateFromPrompt(
    file: string,
    key: string,
    ctx: RagGraphCtx,
    context: string,
  ): AsyncGenerator<RagGraphFrame> {
    const block = this.promptService.selectPrompt(file, key);
    const prompt = this.promptService.formatTemplate(
      block?.generate || '请根据上下文回答用户问题。\n\n上下文：{context}\n\n用户问题：{question}\n\n历史记忆：{memorys}',
      {
        context,
        question: ctx.query,
        memorys: ctx.memory || '(empty)',
      },
    );
    if (!prompt.trim()) return;
    yield* this.streamLlm(ctx, prompt);
  }

  private async *emitAnswer(answer: string): AsyncGenerator<RagGraphFrame> {
    for await (const chunk of streamText(answer)) {
      yield { type: 'data', payload: chunk };
    }
  }

  /**
   * 计算两个向量之间的余弦相似度。
   * @param a - 向量 a
   * @param b - 向量 b
   * @returns 余弦相似度值（0-1）
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
    if (!na || !nb) return 0;
    return dot / Math.sqrt(na * nb);
  }

  /**
   * 基于 Embedding 向量相似度对文档进行排序筛选。
   * @param query - 查询文本
   * @param documents - 待排序的文档列表
   * @param embeddings - Embeddings 模型实例
   * @param topK - 返回前 K 个文档
   * @returns 排序后的文档列表
   */
  private async rankByEmbedding(query: string, documents: string[], embeddings: Embeddings, topK: number) {
    if (!documents.length) return [];
    const qEmb = await embeddings.embedQuery(query);
    const dEmb = await embeddings.embedDocuments(documents);
    const scored = documents.map((doc, i) => ({ doc, score: this.cosine(qEmb, dEmb[i]) }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK).map((s) => s.doc);
  }

  /** ponytail: keyword-overlap communities; upgrade: Louvain + entity extraction */
  private communityRetrieve(query: string, documents: string[]) {
    if (!documents.length) return '';
    const queryWords = new Set((query.toLowerCase().match(/\w+/g) || []).filter((w) => w.length > 1));
    const scored = documents.map((doc) => {
      const words = doc.toLowerCase().match(/\w+/g) || [];
      let overlap = 0;
      for (const w of words) if (queryWords.has(w)) overlap++;
      return { doc, overlap };
    });
    scored.sort((a, b) => b.overlap - a.overlap);
    return scored
      .slice(0, 3)
      .map((s) => s.doc)
      .join('\n\n');
  }

  /**
   * 从 arXiv API 检索论文摘要。
   * 解析 XML 响应，提取标题和摘要，并分块处理。
   * @param query - 检索查询
   * @param maxResults - 最大结果数
   * @returns 分块后的文本片段数组
   */
  private async searchArxiv(query: string, maxResults: number) {
    const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=${maxResults}`;
    const res = await axios.get(url, { timeout: 30000, responseType: 'text' });
    const xml = String(res.data || '');
    const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];
    const summaries: string[] = [];
    for (const entry of entries) {
      const summary = entry.match(/<summary>([\s\S]*?)<\/summary>/)?.[1]?.replace(/\s+/g, ' ').trim();
      const title = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/\s+/g, ' ').trim();
      if (summary) summaries.push(title ? `${title}\n${summary}` : summary);
    }
    const chunks: string[] = [];
    for (const s of summaries) {
      chunks.push(...(await splitTextStrings(s)));
    }
    return chunks;
  }
}
