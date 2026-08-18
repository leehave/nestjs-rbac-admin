/** ponytail: char-level tokenization; swap to nodejieba when Chinese BM25 quality matters */

/**
 * 对文本进行分词处理。若文本包含空格分隔的多个词则按空格拆分，否则按字符拆分。
 * @param text - 待分词文本
 * @returns 分词结果数组
 */
function tokenize(text: string): string[] {
  const raw = String(text || '').trim();
  if (!raw) return [];
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length > 1) return parts;
  return [...raw];
}

function docHash(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return String(h);
}

/**
 * 使用 BM25 算法对文档进行关键词检索排序。
 * 计算每个文档与查询的 BM25 得分，返回得分最高的 Top-K 文档。
 * @param documents - 文档字符串数组
 * @param query - 查询文本
 * @param topK - 返回的 top K 数量，默认 3
 * @returns 按 BM25 得分排序的文档数组
 */
export function searchDocumentsBm25(documents: string[], query: string, topK = 3): string[] {
  if (!documents.length) return [];
  const qTokens = tokenize(query);
  if (!qTokens.length) return documents.slice(0, topK);

  const corpus = documents.map((d) => tokenize(d));
  const df = new Map<string, number>();
  const tf: Map<string, number>[] = [];
  const docLen: number[] = [];

  for (const tokens of corpus) {
    const m = new Map<string, number>();
    const seen = new Set<string>();
    for (const t of tokens) {
      m.set(t, (m.get(t) || 0) + 1);
      if (!seen.has(t)) {
        seen.add(t);
        df.set(t, (df.get(t) || 0) + 1);
      }
    }
    tf.push(m);
    docLen.push(tokens.length || 1);
  }

  const N = documents.length;
  const avgdl = docLen.reduce((a, b) => a + b, 0) / N;
  const k1 = 1.5;
  const b = 0.75;

  const scores = documents.map((_, i) => {
    let score = 0;
    for (const term of qTokens) {
      const n = df.get(term) || 0;
      if (!n) continue;
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      const f = tf[i].get(term) || 0;
      const denom = f + k1 * (1 - b + (b * docLen[i]) / avgdl);
      score += idf * ((f * (k1 + 1)) / (denom || 1));
    }
    return score;
  });

  return scores
    .map((s, i) => ({ s, i }))
    .sort((a, b) => b.s - a.s)
    .slice(0, topK)
    .map(({ i }) => documents[i]);
}

/**
 * 使用 RRF（Reciprocal Rank Fusion，倒数秩融合）算法合并向量检索和关键词检索的结果。
 * 对两份排序文档中的每个文档计算 RRF 得分，按得分排序后返回 Top-K。
 * @param vectorDocs - 向量检索结果文档数组
 * @param keywordDocs - 关键词检索结果文档数组
 * @param topK - 返回的 top K 数量，默认 3
 * @returns 融合排序后的文档数组
 */
export function combineRrfDocuments(vectorDocs: string[], keywordDocs: string[], topK = 3): string[] {
  const k = 60;
  const vectorRanks = new Map<string, number>();
  const keywordRanks = new Map<string, number>();
  const docById = new Map<string, string>();

  vectorDocs.forEach((doc, idx) => {
    const id = docHash(doc);
    docById.set(id, doc);
    vectorRanks.set(id, idx + 1);
  });
  keywordDocs.forEach((doc, idx) => {
    const id = docHash(doc);
    docById.set(id, doc);
    keywordRanks.set(id, idx + 1);
  });

  const ids = new Set([...vectorRanks.keys(), ...keywordRanks.keys()]);
  const scored: Array<{ id: string; score: number }> = [];
  for (const id of ids) {
    let score = 0;
    if (vectorRanks.has(id)) score += 1 / (k + vectorRanks.get(id)!);
    if (keywordRanks.has(id)) score += 1 / (k + keywordRanks.get(id)!);
    scored.push({ id, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map(({ id }) => docById.get(id)!);
}

/** ponytail: fails if RRF merge drops all docs */
export function ragUtilsSelfCheck() {
  const merged = combineRrfDocuments(['a', 'b'], ['b', 'c'], 2);
  if (merged.length !== 2 || !merged.includes('b')) throw new Error('RRF merge failed');
}
