export const MIND_MODEL_TYPES = ['llm', 'embedding', 'medical', 'vision'] as const;
export const MIND_MODEL_SOURCES = ['ollama', 'modelscope', 'cloud', 'gitee'] as const;

export type MindModelType = (typeof MIND_MODEL_TYPES)[number];
export type MindModelSource = (typeof MIND_MODEL_SOURCES)[number];

export const MIND_MODEL_TYPE_LABELS: Record<MindModelType, string> = {
  llm: 'LLM',
  embedding: 'Embedding',
  medical: 'Medical',
  vision: 'Vision',
};

export const MIND_MODEL_SOURCE_LABELS: Record<MindModelSource, string> = {
  ollama: 'Ollama',
  modelscope: 'ModelScope',
  cloud: 'Cloud',
  gitee: 'Gitee',
};

export function getMindModelMeta() {
  return {
    types: MIND_MODEL_TYPES.map((value) => ({ value, label: MIND_MODEL_TYPE_LABELS[value] })),
    sources: MIND_MODEL_SOURCES.map((value) => ({ value, label: MIND_MODEL_SOURCE_LABELS[value] })),
  };
}

export function normalizeMindModelType(value?: string | null): MindModelType | null {
  const key = String(value || '').trim().toLowerCase();
  return (MIND_MODEL_TYPES as readonly string[]).includes(key) ? (key as MindModelType) : null;
}

export function normalizeMindModelSource(value?: string | null): MindModelSource | null {
  const key = String(value || '').trim().toLowerCase();
  return (MIND_MODEL_SOURCES as readonly string[]).includes(key) ? (key as MindModelSource) : null;
}
