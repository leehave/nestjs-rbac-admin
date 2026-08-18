import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base';

@Entity('sa_ai_chat_session', { comment: 'AI 聊天会话' })
export class AiChatSessionEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', comment: '主键' })
  id: string;

  @Column({ type: 'char', name: 'session_uuid', length: 36 })
  sessionUuid: string;

  @Column({ type: 'int', name: 'user_id' })
  userId: number;

  @Column({ type: 'int', name: 'tenant_id' })
  tenantId: number;

  @Column({ type: 'bigint', name: 'agent_id', nullable: true })
  agentId: string;

  @Column({ type: 'varchar', name: 'title', length: 200, default: '新对话' })
  title: string;

  @Column({ type: 'bigint', name: 'default_model_id', nullable: true })
  defaultModelId: string;

  @Column({ type: 'text', name: 'summary', nullable: true })
  summary: string;

  @Column({ type: 'int', name: 'summary_up_to_seq', default: 0, comment: '已纳入摘要的最大 seq' })
  summaryUpToSeq: number;

  @Column({ type: 'int', name: 'message_count', default: 0 })
  messageCount: number;

  @Column({ type: 'datetime', name: 'last_message_at', nullable: true })
  lastMessageAt: Date;

  @Column({ type: 'char', name: 'status', length: 1, default: '0' })
  status: string;
}
