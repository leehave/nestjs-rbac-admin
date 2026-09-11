import { Column, Entity, PrimaryColumn } from 'typeorm';
import { BaseEntity } from '../../../../common/entities/base';

@Entity('t_system_setting', { comment: '系统配置表' })
export class MindSystemSettingEntity extends BaseEntity {
  @PrimaryColumn({ type: 'varchar', length: 50, name: 'id', comment: '主键id' })
  id: string;

  @Column({ type: 'bigint', name: 'tenant_id', default: 0, comment: '租户ID' })
  tenantId: number;

  @Column({ type: 'varchar', length: 20, name: 'source', nullable: true, comment: '配置项来源' })
  source: string | null;

  @Column({ type: 'json', name: 'content', nullable: true, comment: '配置项内容' })
  content: any;
}

