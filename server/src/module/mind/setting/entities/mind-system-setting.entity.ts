import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('t_system_setting', { comment: '系统配置表' })
export class MindSystemSettingEntity {
  @PrimaryColumn({ type: 'varchar', length: 50, name: 'id', comment: '主键id' })
  id: string;

  @Column({ type: 'bigint', name: 'tenant_id', default: 0, comment: '租户ID' })
  tenantId: number;

  @Column({ type: 'varchar', length: 20, name: 'source', nullable: true, comment: '配置项来源' })
  source: string | null;

  @Column({ type: 'json', name: 'content', nullable: true, comment: '配置项内容' })
  content: any;

  @Column({ type: 'datetime', name: 'create_time', nullable: true, comment: '创建时间' })
  createTime: Date | null;
}

