import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('t_memory_detail', { comment: '历史详情表' })
export class MindMemoryDetailEntity {
  @PrimaryColumn({ type: 'varchar', length: 50, name: 'id', comment: '主键id' })
  id: string;

  @Column({ type: 'bigint', name: 'tenant_id', default: 0, comment: '租户ID' })
  tenantId: number;

  @Column({ type: 'varchar', length: 50, name: 'source_id', nullable: true, comment: '记录表ID' })
  sourceId: string | null;

  @Column({ type: 'varchar', length: 10, name: 'type', nullable: true, comment: '内容类型（ai；user）' })
  type: string | null;

  @Column({ type: 'longtext', name: 'content', nullable: true, comment: '记忆内容' })
  content: string | null;

  @Column({ type: 'datetime', name: 'create_time', nullable: true, comment: '创建时间' })
  createTime: Date | null;
}

