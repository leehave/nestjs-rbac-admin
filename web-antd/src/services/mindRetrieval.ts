import cache from '@/utils/cache';

const FRAME_PREFIXES: `${Mind.StreamFrameType}:`[] = ['event:', 'think:', 'data:'];

// 检索走原生 fetch 读流，拿不到 _request 拦截器注入的 token，这里自取
const readAuthToken = (): string => {
  try {
    const tokenData = cache.local.getJSON('token');
    return tokenData?.state?.token || '';
  } catch {
    return '';
  }
};

/**
 * 解析单个 SSE 帧。
 * 后端同一帧的多行 payload 会逐行写成 `type: line`，帧之间以空行分隔。
 */
const parseFrame = (
  frame: string,
): { type: Mind.StreamFrameType; content: string } | null => {
  const lines = frame.split('\n');
  let type: Mind.StreamFrameType | null = null;
  const contents: string[] = [];

  for (const raw of lines) {
    const line = raw.replace(/\r$/, '');
    for (const prefix of FRAME_PREFIXES) {
      if (line.startsWith(prefix)) {
        if (type === null) type = prefix.slice(0, -1) as Mind.StreamFrameType;
        contents.push(line.slice(prefix.length));
        break;
      }
    }
  }

  if (!type || contents.length === 0) return null;
  return { type, content: contents.join('\n') };
};

/** 发起 SSE 检索请求并逐帧消费，直到流结束或被 signal 中断 */
export const openRetrievalStream = async (
  url: string,
  params: Mind.RetrievalParams,
  handlers: Mind.RetrievalHandlers,
): Promise<void> => {
  const token = readAuthToken();
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
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        dispatch(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf('\n\n');
      }
    }
    // 末尾可能残留一个没有空行收尾的帧
    if (buffer.trim()) dispatch(buffer);
  } finally {
    reader.releaseLock();
  }
};

// 文档检索（NativeRAG）
export const retrieveRag = (
  params: Mind.RetrievalParams,
  handlers: Mind.RetrievalHandlers,
) => openRetrievalStream('/api/mind/retrieval/rag', params, handlers);

// 智能检索（Corrective RAG）
export const retrieveAdvance = (
  params: Mind.RetrievalParams,
  handlers: Mind.RetrievalHandlers,
) => openRetrievalStream('/api/mind/retrieval/advance', params, handlers);
