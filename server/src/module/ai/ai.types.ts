/** WebSocket 与 REST 共用的事件/数据结构约定 */

export type AiWsClientEvent = 'auth' | 'chat.send' | 'chat.stop' | 'ping';

export type AiWsServerEvent =
  | 'auth.ok'
  | 'auth.error'
  | 'pong'
  | 'chat.user_message'
  | 'chat.message_start'
  | 'chat.token'
  | 'chat.message_done'
  | 'chat.error';

export interface AiWsEnvelope<T = unknown> {
  event: AiWsClientEvent | AiWsServerEvent;
  request_id?: string;
  data: T;
}

export interface AiWsAuthData {
  token: string;
}

export interface AiWsChatSendData {
  session_uuid: string;
  content: string;
  /** 不传则用 session.default_model_id */
  model_id?: string;
  agent_id?: string;
  temperature?: number;
}

export interface AiWsChatStopData {
  session_uuid: string;
  message_uuid?: string;
}

export interface AiWsTokenData {
  session_uuid: string;
  message_uuid: string;
  delta: string;
}

export interface AiWsMessageStartData {
  session_uuid: string;
  message_uuid: string;
  model_id: string;
  model_name: string;
  provider_name: string;
}

export interface AiWsMessageDoneData {
  session_uuid: string;
  message_uuid: string;
  content: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    prompt_cache_hit_tokens?: number;
    prompt_cache_miss_tokens?: number;
  };
  context: {
    ratio: number;
    estimated_prompt_tokens: number;
    context_window: number;
    history_rounds: number;
    compact_threshold: number;
  };
  session_stats: {
    total_tokens: number;
    rounds: number;
    cache_hit_rate: number | null;
  };
  latency_ms: number;
}

/** REST 返回：会话列表项 */
export interface AiSessionListItem {
  session_uuid: string;
  title: string;
  agent_id: string | null;
  agent_name: string | null;
  default_model_id: string | null;
  default_model_name: string | null;
  message_count: number;
  last_message_at: string | null;
  create_time: string;
}

/** REST 返回：消息项（含模型信息，用于 UI 展示 badge） */
export interface AiMessageListItem {
  message_uuid: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  content_format: string;
  status: string;
  model_id: string | null;
  model_name: string | null;
  provider_name: string | null;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  latency_ms: number | null;
  request_params: Record<string, unknown> | null;
  create_time: string;
}

/** REST 返回：可选模型（对话切换下拉） */
export interface AiModelOption {
  id: string;
  model_code: string;
  name: string;
  provider_id: string;
  provider_name: string;
  is_default: boolean;
  default_temperature: number;
  context_window: number;
  max_output_tokens: number;
}

/** 管理端：供应商（不含 api_key 明文） */
export interface AiProviderListItem {
  id: string;
  code: string;
  name: string;
  base_url: string;
  adapter_type: string;
  api_key_masked: string;
  status: string;
}
