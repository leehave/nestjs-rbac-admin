import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base';

export type AiMessageRole = 'system' | 'user' | 'assistant' | 'tool';
export type AiMessageStatus = 'pending' | 'streaming' | 'completed' | 'error' | 'stopped';

@Entity('sa_ai_chat_message', { comment: 'AI 聊天消息' })
export class AiChatMessageEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', comment: '主键' })
  id: string;

  @Column({ type: 'char', name: 'message_uuid', length: 36 })
  messageUuid: string;

  @Column({ type: 'bigint', name: 'session_id' })
  sessionId: string;

  @Column({ type: 'int', name: 'user_id' })
  userId: number;

  @Column({ type: 'int', name: 'tenant_id' })
  tenantId: number;

  @Column({ type: 'varchar', name: 'role', length: 16 })
  role: AiMessageRole;

  @Column({ type: 'mediumtext', name: 'content', nullable: true })
  content: string;

  @Column({ type: 'varchar', name: 'content_format', length: 16, default: 'markdown' })
  contentFormat: string;

  @Column({ type: 'bigint', name: 'model_id', nullable: true })
  modelId: string;

  @Column({ type: 'bigint', name: 'provider_id', nullable: true })
  providerId: string;

  @Column({ type: 'bigint', name: 'parent_id', nullable: true })
  parentId: string;

  @Column({ type: 'int', name: 'seq', default: 0 })
  seq: number;

  @Column({ type: 'varchar', name: 'status', length: 16, default: 'completed' })
  status: AiMessageStatus;

  @Column({ type: 'varchar', name: 'error_message', length: 500, nullable: true })
  errorMessage: string;

  @Column({ type: 'int', name: 'prompt_tokens', default: 0 })
  promptTokens: number;

  @Column({ type: 'int', name: 'completion_tokens', default: 0 })
  completionTokens: number;

  @Column({ type: 'int', name: 'total_tokens', default: 0 })
  totalTokens: number;

  @Column({ type: 'int', name: 'latency_ms', nullable: true })
  latencyMs: number;

  @Column({ type: 'json', name: 'request_params', nullable: true })
  requestParams: Record<string, unknown> | null;

  @Column({ type: 'json', name: 'metadata', nullable: true })
  metadata: Record<string, unknown> | null;
}
