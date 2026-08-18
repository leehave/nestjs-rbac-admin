export * from './ai-provider.entity';
export * from './ai-model.entity';
export * from './ai-agent.entity';
export * from './ai-chat-session.entity';
export * from './ai-chat-message.entity';

export interface AiRequestParamsSnapshot {
  model_id: string;
  model_code: string;
  provider_id: string;
  temperature: number;
  max_output_tokens: number;
}

export interface AiMessageMetadata {
  model_name?: string;
  provider_name?: string;
  stopped_by_user?: boolean;
  attachments?: Array<{ name: string; url: string; mime?: string }>;
}
