import { Injectable } from '@nestjs/common';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { MindHistoryService } from '../../history/mind-history.service';
import { MindLlmRuntimeService } from '../../llm/mind-llm-runtime.service';
import { parseMindTopK, type MindRagConnectConfig } from '../../llm/mind-llm-config.util';
import { combineRrfDocuments, searchDocumentsBm25 } from '../rag/rag-utils';

/**
 * 计算两个向量之间的余弦相似度。
 * @param a - 向量 a
 * @param b - 向量 b
 * @returns 余弦相似度值，若任一向量为零向量则返回 0
 */
function cosineSimilarity(a: number[], b: number[]): number {
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

@Injectable()
export class MindSearchMemoryService {
  constructor(
    private readonly historyService: MindHistoryService,
    private readonly llmRuntime: MindLlmRuntimeService,
  ) {}

  /** 对齐 Python SearchMemory.search_memory，返回可直接注入 prompt 的文本 */
  async searchMemory(sourceId: string | undefined, query: string, rag?: MindRagConnectConfig): Promise<string> {
    if (!sourceId) return '';
    const details = await this.historyService.listDetails({ source_id: sourceId });
    const userDetails: string[] = [];
    const aiDetails: string[] = [];
    for (const row of details) {
      if (row.type === 'user') userDetails.push(row.content || '');
      else aiDetails.push(row.content || '');
    }

    const size = userDetails.length;
    if (size < 5) return aiDetails.filter(Boolean).join('\n\n');
    if (size < 10) {
      const docs = await this.searchDocument(query, userDetails, rag);
      return docs.filter(Boolean).join('\n\n');
    }
    return this.searchSummarize(aiDetails);
  }

  /**
   * 搜索历史记忆文档：根据查询对用户详情进行语义和关键词混合检索，然后使用 RRF 融合排序。
   * @param query - 查询文本
   * @param userDetails - 用户历史详情文本数组
   * @param rag - 可选的 RAG 连接配置
   * @returns 检索到的文档数组
   */
  private async searchDocument(query: string, userDetails: string[], rag?: MindRagConnectConfig): Promise<string[]> {
    const topK = parseMindTopK(rag);
    const similarityDocs = await this.searchSimilarity(query, userDetails, topK, rag);
    const keywordDocs = searchDocumentsBm25(userDetails, query, topK);
    return combineRrfDocuments(similarityDocs, keywordDocs, topK);
  }

  /**
   * 使用嵌入向量对用户详情进行语义相似度搜索。
   * @param query - 查询文本
   * @param userDetails - 用户历史详情文本数组
   * @param topK - 返回的 top K 数量
   * @param rag - 可选的 RAG 连接配置
   * @returns 按相似度排序的文档数组
   */
  private async searchSimilarity(
    query: string,
    userDetails: string[],
    topK: number,
    rag?: MindRagConnectConfig,
  ): Promise<string[]> {
    const embeddings = await this.llmRuntime.newEmbeddings({ rag });
    const docs = [...userDetails, query];
    const vectors = await embeddings.embedDocuments(docs);
    const queryVec = vectors[vectors.length - 1];
    const scored = userDetails.map((doc, idx) => ({
      doc,
      score: cosineSimilarity(queryVec, vectors[idx]),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK).map((v) => v.doc);
  }

  /**
   * 使用 LLM 对 AI 回答详情进行总结概括。
   * 当历史数据量较大时（>=10 条），使用此方法压缩为摘要文本。
   * @param aiDetails - AI 回答详情文本数组
   * @returns 总结文本
   */
  private async searchSummarize(aiDetails: string[]): Promise<string> {
    const llm = await this.llmRuntime.newChatModel({});
    const sys = `你是一位文档分析专家，请总结概括用户输入文档的内容，并返回一个总结。

输入文档：${JSON.stringify(aiDetails)}

请使用中文。`;
    const res: any = await llm.invoke([new SystemMessage(sys), new HumanMessage('请总结')]);
    return String(res?.content ?? '').trim();
  }
}
