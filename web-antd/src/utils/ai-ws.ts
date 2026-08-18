export type AiWsStatus = 'connecting' | 'open' | 'closed';

export interface AiWsClient {
  connect: (token: string) => void;
  send: (event: string, data?: unknown) => void;
  disconnect: () => void;
}

/**
 * 创建 AI 聊天 WebSocket 客户端（原生 ws，走 vite 代理 /ws → 127.0.0.1:3000）。
 * @param onMessage 收到服务端信封后的回调（event, data）
 * @param onStatus  连接状态回调
 */
export function createAiWs(
  onMessage: (event: string, data: any) => void,
  onStatus: (status: AiWsStatus) => void,
): AiWsClient {
  let ws: WebSocket | null = null;

  const url = `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws/ai`;

  const send = (event: string, data: unknown = {}) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ event, data }));
    }
  };

  const disconnect = () => {
    if (ws) {
      ws.onclose = null; // 手动断开不触发 onStatus
      ws.close();
      ws = null;
    }
    onStatus('closed');
  };

  const connect = (token: string) => {
    disconnect();
    onStatus('connecting');
    ws = new WebSocket(url);
    ws.onopen = () => {
      onStatus('open');
      send('auth', { token });
    };
    ws.onmessage = (ev) => {
      try {
        const env = JSON.parse(ev.data as string);
        onMessage(env.event, env.data);
      } catch {
        // 忽略非 JSON 消息
      }
    };
    ws.onclose = () => {
      onStatus('closed');
      ws = null;
    };
    ws.onerror = () => {
      // onclose 会随后触发
    };
  };

  return { connect, send, disconnect };
}
