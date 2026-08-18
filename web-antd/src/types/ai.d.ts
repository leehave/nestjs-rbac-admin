declare namespace Ai {
  interface ProviderItem {
    id: string;
    code: string;
    name: string;
    base_url: string;
    adapter_type: string;
    api_key_masked: string;
    status: string;
    sort: number;
    remark: string;
    create_time: string;
    update_time: string;
  }

  interface ProviderOption {
    id: string;
    name: string;
    code: string;
  }

  interface ModelItem {
    id: string;
    provider_id: string;
    model_code: string;
    name: string;
    context_window: number;
    max_output_tokens: number;
    default_temperature: number;
    is_default: number;
    status: string;
    sort: number;
    remark: string;
    provider_name?: string;
    create_time: string;
    update_time: string;
  }

  interface ModelOption {
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

  interface SessionItem {
    session_uuid: string;
    title: string;
    default_model_id: string | null;
    message_count: number;
    last_message_at: string | null;
    create_time: string;
  }

  interface MessageItem {
    message_uuid: string;
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    content_format: string;
    status: string;
    model_id: string | null;
    model_name: string | null;
    provider_name: string | null;
    create_time: string;
  }

  interface SessionStats {
    total_tokens: number;
    rounds: number;
    context_window: number;
    compact_threshold: number;
  }

  interface WsTokenData {
    session_uuid: string;
    message_uuid: string;
    delta: string;
  }

  interface WsMessageStartData {
    session_uuid: string;
    message_uuid: string;
    model_id: string;
    model_name: string;
    provider_name: string;
  }

  interface WsMessageDoneData {
    session_uuid: string;
    message_uuid: string;
    content: string;
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    session_stats?: { total_tokens: number; rounds: number; cache_hit_rate: number | null };
    latency_ms?: number;
  }

  interface WsErrorData {
    code?: number;
    message: string;
  }
}

declare namespace API {
  type AiProviderPageResult = Response & {
    list?: Ai.ProviderItem[];
    total: number;
    rows?: Ai.ProviderItem[];
  };
  type AiModelPageResult = Response & {
    list?: Ai.ModelItem[];
    total: number;
    rows?: Ai.ModelItem[];
  };
  type AiProviderOptionsResult = Response & { list?: Ai.ProviderOption[] };
  type AiModelOptionsResult = Response & { list?: Ai.ModelOption[] };
  type AiSessionListResult = Response & {
    list?: Ai.SessionItem[];
    total: number;
    rows?: Ai.SessionItem[];
  };
  type AiSessionCreateResult = Response & {
    data?: { session_uuid: string; title: string; default_model_id: string | null };
  };
  type AiMessageListResult = Response & {
    list?: Ai.MessageItem[];
    session_uuid?: string;
    default_model_id?: string | null;
    stats?: Ai.SessionStats;
  };
}
