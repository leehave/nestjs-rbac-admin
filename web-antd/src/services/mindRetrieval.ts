import cache from '@/utils/cache';

// 检索请求参数（对齐后端 MindInvokeBaseDto）
export interface MindRetrievalParams {
  query: string;
  library?: string;
  source_id?: string;
  source?: string;
  pattern?: string;
  [key: string]: any;
}

// SSE 流式回调
export interface MindRetrievalHandlers {
  onEvent?: (payload: string) => void;
  onThink?: (payload: string) => void;
  onData?: (payload: string) => void;
  signal?: AbortSignal;
}

type FrameType = 'event' | 'think' | 'data';

const FRAME_PREFIXES: `${FrameType}:`[] = ['event:', 'think:', 'data:'];

const getToken = (): string => {
  try {
    const tokenData = cache.local.getJSON('token');
    return tokenData?.state?.token || '';
  } catch {
    return '';
  }
};

// 解析一个 SSE 帧（以空行分隔），返回 { type, content }
// 后端帧格式：同一 type 的 payload 多行时按行写成 `type: line`，帧间以 \n\n 分隔
const parseFrame = (frame: string): { type: FrameType; content: string } | null => {
  const lines = frame.split('\n');
  let type: FrameType | null = null;
  const contents: string[] = [];
  for (const raw of lines) {
    const line = raw.replace(/\r$/, '');
    for (const prefix of FRAME_PREFIXES) {
      if (line.startsWith(prefix)) {
        if (type === null) type = prefix.slice(0, -1) as FrameType;
        contents.push(line.slice(prefix.length));
        break;
      }
    }
  }
  if (!type || contents.length === 0) return null;
  return { type, content: contents.join('\n') };
};

/**
 * 发起 SSE 流式检索请求（POST）。
 * 后端返回 text/event-stream，逐帧解析并回调。
 */
export const streamMindRetrieval = async (
  url: string,
  params: MindRetrievalParams,
  handlers: MindRetrievalHandlers,
): Promise<void> => {
  const token = getToken();
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json;charset=utf-8',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(params),
    signal: handlers.signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(`请求失败（${response.status}）`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  const dispatch = (frame: string) => {
    const parsed = parseFrame(frame);
    if (!parsed) return;
    if (parsed.type === 'event') handlers.onEvent?.(parsed.content);
    else if (parsed.type === 'think') handlers.onThink?.(parsed.content);
    else handlers.onData?.(parsed.content);
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx = buffer.indexOf('\n\n');
      while (idx !== -1) {
        const frame = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        dispatch(frame);
        idx = buffer.indexOf('\n\n');
      }
    }
    if (buffer.trim()) dispatch(buffer);
  } finally {
    reader.releaseLock();
  }
};

// 文档检索（NativeRAG）
export const retrieveRag = (
  params: MindRetrievalParams,
  handlers: MindRetrievalHandlers,
) => streamMindRetrieval('/api/mind/retrieval/rag', params, handlers);

// 智能检索（Advanced RAG）
export const retrieveAdvance = (
  params: MindRetrievalParams,
  handlers: MindRetrievalHandlers,
) => streamMindRetrieval('/api/mind/retrieval/advance', params, handlers);
