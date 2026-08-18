import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('t_history_record', { comment: '历史记录表' })
export class MindHistoryRecordEntity {
  @PrimaryColumn({ type: 'varchar', length: 50, name: 'id', comment: '主键id' })
  id: string;

  @Column({ type: 'bigint', name: 'tenant_id', default: 0, comment: '租户ID' })
  tenantId: number;

  @Column({ type: 'varchar', length: 20, name: 'source', nullable: true, comment: '历史记忆来源' })
  source: string | null;

  @Column({ type: 'varchar', length: 20, name: 'pattern', nullable: true, comment: '模式' })
  pattern: string | null;

  @Column({ type: 'varchar', length: 50, name: 'library', nullable: true, comment: '知识库编号' })
  library: string | null;

  @Column({ type: 'varchar', length: 100, name: 'name', nullable: true, comment: '对话名' })
  name: string | null;

  @Column({ type: 'varchar', length: 50, name: 'chat_model_id', nullable: true, comment: '会话级聊天模型ID' })
  chatModelId: string | null;

  @Column({ type: 'varchar', length: 50, name: 'embedding_model_id', nullable: true, comment: '会话级向量模型ID' })
  embeddingModelId: string | null;

  @Column({ type: 'datetime', name: 'create_time', nullable: true, comment: '创建时间' })
  createTime: Date | null;
}
