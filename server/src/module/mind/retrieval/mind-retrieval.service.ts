import { Injectable } from '@nestjs/common';
import { MindLlmRuntimeService } from '../llm/mind-llm-runtime.service';
import { MindVectorService } from '../vector/mind-vector.service';
import { MindHistoryService } from '../history/mind-history.service';
import { MindRetrievalInvokeDto } from './dto';
import { getTenantId } from '../../../common/utils/tenant.util';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { Document } from '@langchain/core/documents';
import { MindGraphService } from '../graph/mind-graph.service';
import { MindSearchMemoryService } from '../agentic/memory/search-memory.service';
import { MindPromptService } from '../agentic/prompt/mind-prompt.service';
import { parseMindTopK, pickMindRagParameterOverride } from '../llm/mind-llm-config.util';
import { streamChatModelText } from '../llm/mind-llm-stream.util';
import { MindRagGraphService } from './mind-rag-graph.service';

type InvokeCtx = {
  sourceId?: string;
  chatModelId?: string;
  dto: MindRetrievalInvokeDto;
  rag?: Record<string, any>;
};

@Injectable()
export class MindRetrievalService {
  constructor(
    private readonly llmRuntime: MindLlmRuntimeService,
    private readonly vectorService: MindVectorService,
    private readonly graphService: MindGraphService,
    private readonly historyService: MindHistoryService,
    private readonly searchMemoryService: MindSearchMemoryService,
    private readonly promptService: MindPromptService,
    private readonly ragGraph: MindRagGraphService,
  ) {}

  /**
   * 从检索请求 DTO 中提取 LLM 连接配置。
   * @param dto - 检索请求传输对象
   * @returns LLM 连接参数字段
   */
  private pickLlmFromDto(dto: MindRetrievalInvokeDto) {
    return {
      sourceId: dto.sourceId,
      model: dto.model,
      type: dto.type,
      baseUrl: dto.baseUrl,
      apiKey: dto.apiKey,
      temperature: dto.temperature,
    };
  }

  private pickRagFromDto(dto: MindRetrievalInvokeDto) {
    // DB(source=rag) 为底；请求体仅可覆盖检索参数，LLM 连接字段不得污染 embedding 配置
    return pickMindRagParameterOverride(dto);
  }

  /**
   * 根据 DTO 和上下文创建新的聊天模型实例。
   * @param dto - 检索请求传输对象
   * @param ctx - 包含 sourceId 和 chatModelId 的上下文
   * @returns 聊天模型实例
   */
  private async newChatModel(dto: MindRetrievalInvokeDto, ctx: { sourceId?: string; chatModelId?: string }) {
    return this.llmRuntime.newChatModel({
      sourceId: ctx.sourceId,
      chatModelId: ctx.chatModelId || dto.chat_model_id,
      llm: this.pickLlmFromDto(dto),
    });
  }

  private async newEmbeddings(dto: MindRetrievalInvokeDto, ctx?: InvokeCtx) {
    return this.llmRuntime.newEmbeddings({ rag: ctx?.rag ?? this.pickRagFromDto(dto) });
  }

  /**
   * 解析 JSON 数组字符串，若解析失败则按行分割并清理标记符号。
   * @param text - 待解析的文本
   * @returns 字符串数组
   */
  private parseJsonArray(text: string): string[] {
    const raw = text.trim();
    try {
      const data = JSON.parse(raw);
      if (Array.isArray(data)) return data.map((v) => String(v)).map((v) => v.trim()).filter(Boolean);
    } catch {
      void 0;
    }
    return raw
      .split('\n')
      .map((s) => s.replace(/^\s*[-*\d.]+\s*/, '').trim())
      .filter(Boolean);
  }

  /**
   * 为文档生成唯一键，用于去重判断。
   * 优先使用 chunk_index，否则拼接租户、库、索引和内容前缀。
   * @param doc - LangChain 文档对象
   * @param idx - 文档在列表中的索引
   * @returns 唯一键字符串
   */
  private getDocKey(doc: Document, idx: number) {
    const anyMeta = (doc as any)?.metadata || {};
    const chunkIndex = anyMeta.chunk_index ?? anyMeta.chunkIndex;
    if (chunkIndex !== undefined && chunkIndex !== null) return `chunk:${String(chunkIndex)}`;
    const lib = anyMeta.library_number ? String(anyMeta.library_number) : '';
    const tenant = anyMeta.tenant_id ? String(anyMeta.tenant_id) : '';
    return `doc:${tenant}:${lib}:${idx}:${doc.pageContent.slice(0, 64)}`;
  }

  /**
   * 基于 getDocKey 对文档列表进行去重合并。
   * @param docs - 文档列表
   * @returns 去重后的文档列表
   */
  private mergeUnique(docs: Document[]) {
    const map = new Map<string, Document>();
    docs.forEach((d, idx) => {
      const key = this.getDocKey(d, idx);
      if (!map.has(key)) map.set(key, d);
    });
    return [...map.values()];
  }

  /**
   * 计算两个向量之间的余弦相似度。
   * @param a - 向量 a
   * @param b - 向量 b
   * @returns 余弦相似度值（0-1 之间）
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
   * MMR（最大边际相关性）选择算法。
   * 在相关性和多样性之间取得平衡，从候选文档中选出 topK 个。
   * @param query - 查询文本
   * @param docs - 候选文档列表
   * @param topK - 选取数量
   * @param lambda - 相关性 vs 多样性的权衡系数（默认 0.7）
   * @param ctx - 调用上下文
   * @returns 精选后的文档列表
   */
  private async mmrSelect(
    query: string,
    docs: Document[],
    topK: number,
    lambda = 0.7,
    ctx: InvokeCtx,
  ) {
    if (!docs.length) return [];
    const embeddings = await this.newEmbeddings(ctx.dto, ctx);
    const queryEmb = await embeddings.embedQuery(query);
    const docEmb = await embeddings.embedDocuments(docs.map((d) => d.pageContent));

    const selected: number[] = [];
    const candidates = new Set<number>(docs.map((_, i) => i));
    while (selected.length < Math.min(topK, docs.length) && candidates.size) {
      let bestIdx = -1;
      let bestScore = -Infinity;
      for (const i of candidates) {
        const simToQuery = this.cosine(queryEmb, docEmb[i]);
        let simToSelected = 0;
        for (const j of selected) {
          simToSelected = Math.max(simToSelected, this.cosine(docEmb[i], docEmb[j]));
        }
        const score = lambda * simToQuery - (1 - lambda) * simToSelected;
        if (score > bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      }
      if (bestIdx === -1) break;
      candidates.delete(bestIdx);
      selected.push(bestIdx);
    }
    return selected.map((i) => docs[i]);
  }

  /**
   * K-Means 聚类选择算法。
   * 对候选文档进行聚类，从每个簇中选出与查询最相关的文档。
   * @param query - 查询文本
   * @param docs - 候选文档列表
   * @param topK - 选取数量
   * @param ctx - 调用上下文
   * @returns 精选后的文档列表
   */
  private async kmeanSelect(
    query: string,
    docs: Document[],
    topK: number,
    ctx: InvokeCtx,
  ) {
    if (!docs.length) return [];
    const embeddings = await this.newEmbeddings(ctx.dto, ctx);
    const embs = await embeddings.embedDocuments(docs.map((d) => d.pageContent));
    const k = Math.min(topK, Math.min(3, docs.length));
    let centroids = embs.slice(0, k).map((v) => [...v]);
    for (let iter = 0; iter < 5; iter++) {
      const groups: number[][] = Array.from({ length: k }, () => []);
      for (let i = 0; i < embs.length; i++) {
        let best = 0;
        let bestSim = -Infinity;
        for (let c = 0; c < k; c++) {
          const sim = this.cosine(embs[i], centroids[c]);
          if (sim > bestSim) {
            bestSim = sim;
            best = c;
          }
        }
        groups[best].push(i);
      }
      centroids = groups.map((g, idx) => {
        if (!g.length) return centroids[idx];
        const dim = centroids[idx].length;
        const mean = new Array(dim).fill(0);
        for (const gi of g) {
          for (let d = 0; d < dim; d++) mean[d] += embs[gi][d];
        }
        for (let d = 0; d < dim; d++) mean[d] /= g.length;
        return mean;
      });
    }

    const queryEmb = await embeddings.embedQuery(query);
    const picked: number[] = [];
    const used = new Set<number>();
    for (let c = 0; c < k; c++) {
      let best = -1;
      let bestScore = -Infinity;
      for (let i = 0; i < embs.length; i++) {
        if (used.has(i)) continue;
        const score = this.cosine(queryEmb, embs[i]) + 0.2 * this.cosine(embs[i], centroids[c]);
        if (score > bestScore) {
          bestScore = score;
          best = i;
        }
      }
      if (best !== -1) {
        used.add(best);
        picked.push(best);
      }
    }
    return picked.map((i) => docs[i]);
  }

  /**
   * 生成查询变体（MultiQuery 策略）。
   * 调用 LLM 生成多条语义等价但表述不同的检索查询。
   * @param query - 原始查询
   * @param n - 生成的变体数量（默认 3）
   * @param ctx - 调用上下文
   * @returns 查询变体数组
   */
  private async generateQueryVariants(query: string, n = 3, ctx: InvokeCtx) {
    const llm = await this.newChatModel(ctx.dto, ctx);
    const sys =
      this.promptService.buildRagStagePrompt({
        source: 'retrieval',
        pattern: 'MultiQuery',
        stage: 'queries',
        vars: { question: query },
        fallback: `你是查询改写器。请生成 ${n} 条不同表述、但语义等价的检索查询。只输出 JSON 数组，不要输出其它内容。`,
      }) || `你是查询改写器。请生成 ${n} 条不同表述、但语义等价的检索查询。只输出 JSON 数组，不要输出其它内容。`;
    const res: any = await llm.invoke([new SystemMessage(sys), new HumanMessage(query)]);
    return this.parseJsonArray(String(res?.content ?? '')).slice(0, n);
  }

  /**
   * 生成子问题（SubQuestion 策略）。
   * 将用户问题拆分为多个可独立检索的子问题。
   * @param query - 原始查询
   * @param n - 子问题数量（默认 4）
   * @param ctx - 调用上下文
   * @returns 子问题数组
   */
  private async generateSubQuestions(query: string, n = 4, ctx: InvokeCtx) {
    const llm = await this.newChatModel(ctx.dto, ctx);
    const sys =
      this.promptService.buildRagStagePrompt({
        source: 'retrieval',
        pattern: 'SubQuestion',
        stage: 'questions',
        vars: { question: query },
        fallback: `你是问题分解器。把用户问题拆成 ${n} 条可独立检索的子问题。只输出 JSON 数组，不要输出其它内容。`,
      }) || `你是问题分解器。把用户问题拆成 ${n} 条可独立检索的子问题。只输出 JSON 数组，不要输出其它内容。`;
    const res: any = await llm.invoke([new SystemMessage(sys), new HumanMessage(query)]);
    return this.parseJsonArray(String(res?.content ?? '')).slice(0, n);
  }

  /**
   * RRF（倒数排名融合）算法。
   * 将多个查询的检索结果按倒数排名加权融合排序。
   * @param docsByQuery - 每个查询对应的文档列表
   * @param k - 返回前 k 个文档
   * @returns 融合排序后的文档列表
   */
  private rrf(docsByQuery: Document[][], k: number) {
    const score = new Map<string, { doc: Document; score: number }>();
    docsByQuery.forEach((docs) => {
      docs.forEach((d, idx) => {
        const key = this.getDocKey(d, idx);
        const cur = score.get(key) || { doc: d, score: 0 };
        cur.score += 1 / (60 + idx + 1);
        score.set(key, cur);
      });
    });
    return [...score.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, k)
      .map((v) => v.doc);
  }

  /**
   * 执行向量相似性检索。
   * @param tenantId - 租户 ID
   * @param library - 知识库编号
   * @param query - 查询文本
   * @param k - 返回 topK 结果
   * @param ctx - 调用上下文
   * @returns 检索到的文档列表
   */
  private async retrieve(
    tenantId: number,
    library: string,
    query: string,
    k: number,
    ctx: InvokeCtx,
  ) {
    if (!library) return [];
    return this.vectorService.similaritySearch(tenantId, library, query, k, { sourceId: ctx.sourceId, rag: ctx.rag });
  }

  /**
   * 将图数据库查询结果转换为 LangChain Document 数组。
   * @param tenantId - 租户 ID
   * @param library - 知识库编号
   * @param rows - 图数据库返回的行数据（含 chunkIndex 和 text）
   * @returns 文档列表
   */
  private toDocFromGraph(tenantId: number, library: string, rows: Array<{ chunkIndex: number; text: string }>): Document[] {
    return rows.map((r) => ({
      pageContent: r.text,
      metadata: { tenant_id: tenantId, library_number: library, chunk_index: r.chunkIndex, source: 'neo4j' },
    })) as any;
  }

  /**
   * 根据来源、模式和策略获取检索上下文。
   * 支持多种 RAG 增强策略：NativeRAG、MultiQuery、RAGFusion、SubQuestion、StepBack、
   * HYDE、QueryConstruction、MultiRepresentation、RAPTOR、RoutingLogic/Semantic，
   * 以及特殊模式（Graph、KeyWord、Hybrid、KMean、MMR）和高级模式（Corrective、SelfCheck、Adaptive）。
   * @param tenantId - 租户 ID
   * @param source - 检索来源类型
   * @param library - 知识库编号
   * @param query - 查询文本
   * @param pattern - 检索模式
   * @param ctx - 调用上下文
   * @returns 包含上下文文档和思考过程的 Promise
   */
  private async getContexts(
    tenantId: number,
    source: 'retrieval' | 'advance' | 'special' | 'program' | 'arxiv',
    library: string,
    query: string,
    pattern: string,
    ctx: InvokeCtx,
  ): Promise<{ contexts: Document[]; thinks: string[] }> {
    const thinks: string[] = [];
    const emit = (payload: string) => thinks.push(payload);
    const p = (pattern || '').trim();
    // topK 默认取自合并后的 rag 配置（DB source=rag 为底，请求体可覆盖）
    const baseK = parseMindTopK(ctx.rag ?? this.pickRagFromDto(ctx.dto), source === 'program' ? 6 : 4);

    if (!library) {
      emit('library: (empty)');
      return { contexts: [], thinks };
    }

    if (!p || p === 'NativeRAG') {
      const docs = await this.retrieve(tenantId, library, query, baseK, ctx);
      emit(`NativeRAG retrieved: ${docs.length}`);
      return { contexts: docs, thinks };
    }

    if (p === 'MultiQuery') {
      const variants = await this.generateQueryVariants(query, 3, ctx);
      emit(`MultiQuery queries: ${variants.length}`);
      const docsList = await Promise.all(variants.map((q) => this.retrieve(tenantId, library, q, baseK, ctx)));
      const merged = this.mergeUnique(docsList.flat());
      emit(`MultiQuery merged: ${merged.length}`);
      return { contexts: merged.slice(0, 8), thinks };
    }

    if (p === 'RAGFusion') {
      const variants = await this.generateQueryVariants(query, 4, ctx);
      emit(`RAGFusion queries: ${variants.length}`);
      const docsList = await Promise.all(variants.map((q) => this.retrieve(tenantId, library, q, baseK, ctx)));
      const fused = this.rrf(docsList, 8);
      emit(`RAGFusion fused: ${fused.length}`);
      return { contexts: fused, thinks };
    }

    if (p === 'SubQuestion') {
      const subs = await this.generateSubQuestions(query, 4, ctx);
      emit(`SubQuestion count: ${subs.length}`);
      const docsList = await Promise.all(subs.map((q) => this.retrieve(tenantId, library, q, baseK, ctx)));
      const merged = this.mergeUnique(docsList.flat());
      emit(`SubQuestion merged: ${merged.length}`);
      return { contexts: merged.slice(0, 10), thinks };
    }

    if (p === 'StepBack') {
      const llm = await this.newChatModel(ctx.dto, ctx);
      const sys =
        this.promptService.buildRagStagePrompt({
          source: 'retrieval',
          pattern: 'StepBack',
          stage: 'change',
          vars: { question: query },
          fallback: '你是问题泛化器。把用户问题提升为更上位、更通用的检索问题，只输出一句话。',
        }) || '你是问题泛化器。把用户问题提升为更上位、更通用的检索问题，只输出一句话。';
      const res: any = await llm.invoke([new SystemMessage(sys), new HumanMessage(query)]);
      const general = String(res?.content ?? '').trim() || query;
      emit(`StepBack query: ${general}`);
      const docs = await this.retrieve(tenantId, library, general, 8, ctx);
      emit(`StepBack retrieved: ${docs.length}`);
      return { contexts: docs, thinks };
    }

    if (p === 'HYDE') {
      const llm = await this.newChatModel(ctx.dto, ctx);
      const sys =
        this.promptService.buildRagStagePrompt({
          source: 'retrieval',
          pattern: 'HYDE',
          stage: 'question',
          vars: { question: query },
          fallback: '你是 HyDE 生成器。基于用户问题生成一段可能出现在知识库中的理想答案文档，只输出文档正文。',
        }) || '你是 HyDE 生成器。基于用户问题生成一段可能出现在知识库中的理想答案文档，只输出文档正文。';
      const res: any = await llm.invoke([new SystemMessage(sys), new HumanMessage(query)]);
      const hypo = String(res?.content ?? '').trim() || query;
      emit(`HYDE doc len: ${hypo.length}`);
      const docs = await this.retrieve(tenantId, library, hypo, 8, ctx);
      emit(`HYDE retrieved: ${docs.length}`);
      return { contexts: docs, thinks };
    }

    if (p === 'QueryConstruction') {
      const llm = await this.newChatModel(ctx.dto, ctx);
      const sys = '你是查询重构器。将用户问题改写为更适合向量检索的查询（包含关键实体/限定条件/目标）。只输出改写后的查询。';
      const res: any = await llm.invoke([new SystemMessage(sys), new HumanMessage(query)]);
      const rewritten = String(res?.content ?? '').trim() || query;
      emit(`QueryConstruction: ${rewritten}`);
      const docs = await this.retrieve(tenantId, library, rewritten, 8, ctx);
      emit(`QueryConstruction retrieved: ${docs.length}`);
      return { contexts: docs, thinks };
    }

    if (p === 'MultiRepresentation') {
      const llm = await this.newChatModel(ctx.dto, ctx);
      const sys = `你是多表示查询生成器。输出 3 条不同表示形式的检索查询（关键词版/长句版/结构化版）。只输出 JSON 数组。`;
      const res: any = await llm.invoke([new SystemMessage(sys), new HumanMessage(query)]);
      const variants = this.parseJsonArray(String(res?.content ?? '')).slice(0, 3);
      emit(`MultiRepresentation queries: ${variants.length}`);
      const docsList = await Promise.all(variants.map((q) => this.retrieve(tenantId, library, q, baseK, ctx)));
      const merged = this.mergeUnique(docsList.flat());
      emit(`MultiRepresentation merged: ${merged.length}`);
      return { contexts: merged.slice(0, 10), thinks };
    }

    if (p === 'RAPTOR') {
      const docs = await this.retrieve(tenantId, library, query, 20, ctx);
      emit(`RAPTOR candidates: ${docs.length}`);
      const picked = await this.kmeanSelect(query, docs, 6, ctx);
      emit(`RAPTOR picked: ${picked.length}`);
      return { contexts: picked, thinks };
    }

    if (p === 'RoutingLogic' || p === 'RoutingSemantic') {
      const llm = await this.newChatModel(ctx.dto, ctx);
      const sys =
        '你是路由器。判断该问题是否需要使用知识库检索才能回答。只输出 JSON：{"use_rag":true/false,"reason":"..."}';
      const res: any = await llm.invoke([new SystemMessage(sys), new HumanMessage(query)]);
      let useRag = true;
      let reason = '';
      try {
        const data = JSON.parse(String(res?.content ?? '').trim());
        useRag = Boolean(data?.use_rag);
        reason = String(data?.reason ?? '');
      } catch {
        useRag = true;
      }
      emit(`Routing use_rag=${useRag}${reason ? ` reason=${reason}` : ''}`);
      if (!useRag) return { contexts: [], thinks };
      const docs = await this.retrieve(tenantId, library, query, baseK, ctx);
      emit(`Routing retrieved: ${docs.length}`);
      return { contexts: docs, thinks };
    }

    if (source === 'special') {
      if (p === 'Graph') {
        const docs = await this.retrieve(tenantId, library, query, baseK, ctx);
        const chunkIndexes = docs
          .map((d) => Number((d as any)?.metadata?.chunk_index))
          .filter((v) => Number.isFinite(v));
        emit(`GraphRAG seed: ${chunkIndexes.length}`);
        const neighbors = await this.graphService.getNeighborChunks(tenantId, library, chunkIndexes, 60);
        emit(`GraphRAG neighbors: ${neighbors.length}`);
        const gdocs = this.toDocFromGraph(tenantId, library, neighbors);
        return { contexts: this.mergeUnique([...docs, ...gdocs]).slice(0, 12), thinks };
      }

      if (p === 'KeyWord') {
        const hits = await this.graphService.keywordSearch(tenantId, library, query, 20);
        emit(`KeyWord hits: ${hits.length}`);
        return { contexts: this.toDocFromGraph(tenantId, library, hits), thinks };
      }

      if (p === 'Hybrid') {
        const [vec, kw] = await Promise.all([
          this.retrieve(tenantId, library, query, 8, ctx),
          this.toDocFromGraph(tenantId, library, await this.graphService.keywordSearch(tenantId, library, query, 20)),
        ]);
        const fused = this.rrf([vec, kw], 12);
        emit(`Hybrid fused: ${fused.length}`);
        return { contexts: fused, thinks };
      }

      if (p === 'KMean') {
        const docs = await this.retrieve(tenantId, library, query, 20, ctx);
        const picked = await this.kmeanSelect(query, docs, 6, ctx);
        emit(`KMean picked: ${picked.length}`);
        return { contexts: picked, thinks };
      }

      if (p === 'MMR') {
        const docs = await this.retrieve(tenantId, library, query, 20, ctx);
        const picked = await this.mmrSelect(query, docs, 8, 0.7, ctx);
        emit(`MMR picked: ${picked.length}`);
        return { contexts: picked, thinks };
      }
    }

    if (source === 'advance') {
      if (p === 'Corrective') {
        const docs = await this.retrieve(tenantId, library, query, 8, ctx);
        emit(`Corrective retrieved: ${docs.length}`);
        return { contexts: docs, thinks };
      }
      if (p === 'SelfCheck') {
        const docs = await this.retrieve(tenantId, library, query, 8, ctx);
        emit(`SelfCheck retrieved: ${docs.length}`);
        return { contexts: docs, thinks };
      }
      if (p === 'Adaptive') {
        const llm = await this.newChatModel(ctx.dto, ctx);
        const sys = '你是自适应策略选择器。只输出 JSON：{"pattern":"NativeRAG|MultiQuery|RAGFusion","reason":"..."}';
        const res: any = await llm.invoke([new SystemMessage(sys), new HumanMessage(query)]);
        let chosen = 'NativeRAG';
        let reason = '';
        try {
          const data = JSON.parse(String(res?.content ?? '').trim());
          chosen = String(data?.pattern ?? chosen);
          reason = String(data?.reason ?? '');
        } catch {
          chosen = 'NativeRAG';
        }
        emit(`Adaptive choose: ${chosen}${reason ? ` reason=${reason}` : ''}`);
        const sub = await this.getContexts(tenantId, 'retrieval', library, query, chosen, ctx);
        return { contexts: sub.contexts, thinks: [...thinks, ...sub.thinks] };
      }
    }

    const docs = await this.retrieve(tenantId, library, query, baseK, ctx);
    emit(`fallback(${p}) retrieved: ${docs.length}`);
    return { contexts: docs, thinks };
  }

  /**
   * 核心检索调用（异步生成器）。
   * 初始化历史记录、LLM 和 Embeddings，根据模式选择 LangGraph 工作流或传统 RAG 流程，
   * 获取上下文后生成最终回答并流式返回。
   * @param dto - 检索请求传输对象
   * @param source - 检索来源类型
   * @yields { type: 'event' | 'think' | 'data', payload: string } - 事件/思考/数据帧
   */
  private async *invoke(dto: MindRetrievalInvokeDto, source: 'retrieval' | 'advance' | 'special' | 'program' | 'arxiv') {
    const tenantId = getTenantId() || 0;
    const sourceId = dto.source_id;
    const library = dto.library || '';
    const pattern =
      dto.pattern ||
      (source === 'special' ? 'Graph' : source === 'advance' ? 'Corrective' : source === 'retrieval' ? 'NativeRAG' : 'NativeRAG');

    yield { type: 'event' as const, payload: 'Connection established' };
    await this.historyService.ensureHistoryMemory({
      source_id: sourceId,
      source: dto.source || source,
      pattern,
      library,
      query: dto.query,
      chat_model_id: dto.chat_model_id || dto.sourceId,
    });
    yield { type: 'event' as const, payload: 'History Record completed' };

    const ragSetting = await this.llmRuntime.resolveRagSettingContent(this.pickRagFromDto(dto));
    const ctx: InvokeCtx = { sourceId, chatModelId: dto.chat_model_id, dto, rag: ragSetting };
    let llm: Awaited<ReturnType<MindRetrievalService['newChatModel']>>;
    let embeddings: Awaited<ReturnType<MindRetrievalService['newEmbeddings']>>;
    try {
      llm = await this.newChatModel(dto, ctx);
      embeddings = await this.newEmbeddings(dto, ctx);
    } catch (e: any) {
      yield { type: 'event' as const, payload: `error: ${e?.message || 'unknown'}` };
      yield { type: 'event' as const, payload: 'Streaming finished' };
      return;
    }
    yield { type: 'event' as const, payload: 'LLM and Vector loaded' };

    const memory = await this.searchMemoryService.searchMemory(sourceId, dto.query, ragSetting);
    yield { type: 'think' as const, payload: `共加载 ${memory ? memory.length : 0} 条历史记忆` };

    if (this.ragGraph.usesLangGraph(source, pattern)) {
      let full = '';
      try {
        const graphCtx = {
          tenantId,
          library,
          query: dto.query,
          memory,
          pattern,
          llm,
          embeddings,
          sourceId,
          rag: ragSetting,
        };
        const runner =
          source === 'advance'
            ? this.ragGraph.runAdvance(graphCtx)
            : source === 'program'
              ? this.ragGraph.runProgram(graphCtx)
              : this.ragGraph.runArxiv(graphCtx);
        for await (const frame of runner) {
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

    let contexts: Document[] = [];
    try {
      const res = await this.getContexts(tenantId, source, library, dto.query, pattern, ctx);
      for (const t of res.thinks) {
        yield { type: 'think' as const, payload: t };
      }
      contexts = res.contexts;
    } catch (e: any) {
      yield { type: 'event' as const, payload: `error: ${e?.message || 'unknown'}` };
      yield { type: 'event' as const, payload: 'Streaming finished' };
      return;
    }
    yield { type: 'think' as const, payload: `retrieval chunks: ${contexts.length}` };

    const contextText = contexts.map((d, i) => `[#${i + 1}]\n${d.pageContent}`).join('\n\n');
    const user = this.promptService.buildRagGeneratePrompt({
      source,
      pattern,
      context: contextText,
      question: dto.query,
      memorys: memory || '(empty)',
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

  invokeRag(dto: MindRetrievalInvokeDto) {
    return this.invoke(dto, 'retrieval');
  }

  invokeAdvance(dto: MindRetrievalInvokeDto) {
    return this.invoke(dto, 'advance');
  }

  invokeSpecial(dto: MindRetrievalInvokeDto) {
    return this.invoke(dto, 'special');
  }

  invokeProgram(dto: MindRetrievalInvokeDto) {
    return this.invoke(dto, 'program');
  }

  invokeArxiv(dto: MindRetrievalInvokeDto) {
    return this.invoke(dto, 'arxiv');
  }
}
