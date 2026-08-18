import type { MindLlmProvider } from './mind-llm.service';

export type MindLlmConnectConfig = {
  sourceId?: string;
  model?: string;
  type?: string;
  baseUrl?: string;
  apiKey?: string;
  temperature?: string | number;
};

/** t_system_setting(source=rag) content shape */
export type MindRagConnectConfig = MindLlmConnectConfig & {
  dimensions?: string | number;
  topK?: string | number;
  chunkSize?: string | number;
  chunkOverlap?: string | number;
  distance?: string;
  hybrid?: string | boolean;
  combine?: string;
  weight?: string | number;
  graph?: string | boolean;
  method?: string;
};

export type MindLlmRuntimeConfig = {
  provider: MindLlmProvider;
  model: string;
  baseUrl?: string;
  apiKey?: string;
  temperature?: number;
  /** Embedding 输出维度（Matryoshka），需与 Qdrant 集合维度一致 */
  dimensions?: number;
};

/**
 * 根据模型来源类型推断 LLM 提供商。
 * @param type - 模型来源类型（modelscope/gitee/openai/ollama/cloud）
 * @returns LLM 提供商标识
 */
export function inferProviderFromModelType(type?: string | null): MindLlmProvider {
  const s = String(type || '').toLowerCase();
  if (s === 'modelscope' || s === 'gitee' || s === 'openai') return 'openai';
  if (s === 'ollama' || s === 'cloud') return 'ollama';
  return 'openai';
}

export function parseMindTemperature(value?: string | number | null, fallback = 0.2): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, n));
}

/**
 * 标准化模型名称，去除末尾的类型后缀。
 * @param model - 原始模型名称
 * @param type - 模型类型后缀
 * @returns 标准化后的模型名称
 */
export function normalizeMindModelName(model?: string | null, type?: string | null): string {
  const raw = String(model || '').trim();
  if (!raw) return '';
  const suffix = type ? ` (${type})` : '';
  if (suffix && raw.endsWith(suffix)) return raw.slice(0, -suffix.length).trim();
  return raw;
}

/**
 * 将连接配置转换为运行时配置。
 * @param input - LLM 连接配置
 * @param defaultProvider - 默认提供商
 * @returns 运行时配置，输入为空或无模型名时返回 null
 */
export function toMindLlmRuntimeConfig(
  input: MindLlmConnectConfig | null | undefined,
  defaultProvider?: MindLlmProvider,
): MindLlmRuntimeConfig | null {
  if (!input) return null;
  const model = normalizeMindModelName(input.model, input.type);
  if (!model) return null;
  const provider =
    input.type != null && String(input.type).trim()
      ? inferProviderFromModelType(input.type)
      : defaultProvider || 'openai';
  const dimRaw = Number((input as MindRagConnectConfig).dimensions);
  return {
    provider,
    model,
    baseUrl: input.baseUrl?.trim() || undefined,
    apiKey: input.apiKey?.trim() || undefined,
    temperature: parseMindTemperature(input.temperature),
    dimensions: Number.isFinite(dimRaw) && dimRaw > 0 ? Math.floor(dimRaw) : undefined,
  };
}

/**
  从原始配置对象中提取 LLM 连接配置字段（支持驼峰和下划线 key）。
 * @param raw - 原始配置对象
 * @returns LLM 连接配置
 */
export function pickMindLlmConnectConfig(raw: Record<string, any> | null | undefined): MindLlmConnectConfig {
  if (!raw) return {};
  return {
    sourceId: raw.sourceId ?? raw.source_id,
    model: raw.model,
    type: raw.type,
    baseUrl: raw.baseUrl ?? raw.base_url,
    apiKey: raw.apiKey ?? raw.api_key,
    temperature: raw.temperature,
  };
}

/**
 * 从原始配置对象中提取 RAG 连接配置字段，继承 LLM 字段并补充 RAG 特有参数。
 * @param raw - 原始配置对象
 * @returns RAG 连接配置
 */
export function pickMindRagConnectConfig(raw: Record<string, any> | null | undefined): MindRagConnectConfig {
  if (!raw) return {};
  return {
    ...pickMindLlmConnectConfig(raw),
    dimensions: raw.dimensions,
    topK: raw.topK ?? raw.top_k,
    chunkSize: raw.chunkSize ?? raw.chunk_size,
    chunkOverlap: raw.chunkOverlap ?? raw.chunk_overlap,
    distance: raw.distance,
    hybrid: raw.hybrid,
    combine: raw.combine,
    weight: raw.weight,
    graph: raw.graph,
    method: raw.method,
  };
}

/** 请求体可覆盖的 RAG 检索参数；不含 model/type/baseUrl/apiKey，避免 LLM 字段污染 embedding 配置 */
export function pickMindRagParameterOverride(raw: Record<string, any> | null | undefined): Partial<MindRagConnectConfig> {
  if (!raw) return {};
  const out: Partial<MindRagConnectConfig> = {};
  const assign = <K extends keyof MindRagConnectConfig>(key: K, value: MindRagConnectConfig[K] | undefined) => {
    if (value !== undefined && value !== null && value !== '') out[key] = value;
  };
  assign('dimensions', raw.dimensions);
  assign('topK', raw.topK ?? raw.top_k);
  assign('chunkSize', raw.chunkSize ?? raw.chunk_size);
  assign('chunkOverlap', raw.chunkOverlap ?? raw.chunk_overlap);
  assign('distance', raw.distance);
  assign('hybrid', raw.hybrid);
  assign('combine', raw.combine);
  assign('weight', raw.weight);
  assign('graph', raw.graph);
  assign('method', raw.method);
  return out;
}

/** 归一化 Qdrant 距离度量：对齐 t_system_setting(source=rag).distance */
/**
 * 归一化 Qdrant 距离度量名称，支持多种别名。
 * @param distance - 原始距离度量字符串
 * @returns 标准化的距离度量
 */
export function normalizeMindDistance(distance?: string | null): 'Cosine' | 'Euclid' | 'Dot' {
  const s = String(distance || '').trim().toLowerCase();
  if (s === 'euclid' || s === 'euclidean' || s === 'l2' || s === '欧氏距离') return 'Euclid';
  if (s === 'dot' || s === 'dotproduct' || s === 'ip') return 'Dot';
  return 'Cosine';
}

export function parseMindTopK(raw: MindRagConnectConfig | null | undefined, fallback = 4): number {
  const n = Number(raw?.topK);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(50, Math.floor(n));
}

/** DB 配置为底 + 请求覆盖：仅当 override 字段有值时才覆盖，避免 undefined/空串擦掉数据库配置 */
export function mergeMindConfig<T extends Record<string, any>>(base: T, override: Partial<T>): T {
  const out: Record<string, any> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value !== undefined && value !== null && value !== '') out[key] = value;
  }
  return out as T;
}

// ponytail: self-check — LLM model in invoke body must not become rag embedding model
if (process.env.MIND_LLM_CONFIG_SELF_CHECK === '1') {
  const dto = { model: 'doubao-chat', type: 'openai', topK: '6' };
  const rag = mergeMindConfig(pickMindRagConnectConfig({ model: 'Qwen/Qwen3-Embedding' }), pickMindRagParameterOverride(dto));
  if (rag.model !== 'Qwen/Qwen3-Embedding' || rag.topK !== '6') {
    throw new Error('pickMindRagParameterOverride must not override embedding model with LLM fields');
  }
}
