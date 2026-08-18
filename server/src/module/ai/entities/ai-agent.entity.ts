import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base';

@Entity('sa_ai_agent', { comment: 'AI Agent 角色' })
export class AiAgentEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', comment: '主键' })
  id: string;

  @Column({ type: 'int', name: 'tenant_id', default: 0 })
  tenantId: number;

  @Column({ type: 'varchar', name: 'code', length: 32 })
  code: string;

  @Column({ type: 'varchar', name: 'name', length: 64 })
  name: string;

  @Column({ type: 'varchar', name: 'avatar', length: 255, nullable: true })
  avatar: string;

  @Column({ type: 'text', name: 'system_prompt' })
  systemPrompt: string;

  @Column({ type: 'varchar', name: 'welcome_message', length: 500, nullable: true })
  welcomeMessage: string;

  @Column({ type: 'bigint', name: 'default_model_id', nullable: true })
  defaultModelId: string;

  @Column({ type: 'decimal', name: 'temperature', precision: 4, scale: 2, nullable: true })
  temperature: number;

  @Column({ type: 'int', name: 'max_history_rounds', nullable: true })
  maxHistoryRounds: number;

  @Column({ type: 'char', name: 'status', length: 1, default: '1', comment: '1正常 0停用' })
  status: string;

  @Column({ type: 'smallint', name: 'sort', default: 0 })
  sort: number;

  @Column({ type: 'varchar', name: 'remark', length: 255, default: '' })
  remark: string;
}
