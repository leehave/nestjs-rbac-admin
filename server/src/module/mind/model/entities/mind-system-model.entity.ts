import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('t_system_model', { comment: '模型管理表' })
export class MindSystemModelEntity {
  @PrimaryColumn({ type: 'varchar', length: 50, name: 'id', comment: '主键id' })
  id: string;

  @Column({ type: 'bigint', name: 'tenant_id', default: 0, comment: '租户ID' })
  tenantId: number;

  @Column({ type: 'varchar', length: 50, name: 'model_name', nullable: true, comment: '模型名' })
  modelName: string | null;

  @Column({ type: 'varchar', length: 100, name: 'display_name', nullable: true, comment: '展示名' })
  displayName: string | null;

  @Column({ type: 'varchar', length: 100, name: 'model_id', nullable: true, comment: '实际模型ID（请求时传给服务端）' })
  modelId: string | null;

  @Column({ type: 'varchar', length: 100, name: 'base_url', nullable: true, comment: '访问URL' })
  baseUrl: string | null;

  @Column({ type: 'varchar', length: 100, name: 'api_key', nullable: true, comment: 'ApiKey' })
  apiKey: string | null;

  @Column({ type: 'varchar', length: 20, name: 'type', nullable: true, comment: '模型类型' })
  type: string | null;

  @Column({ type: 'varchar', length: 20, name: 'source', nullable: true, comment: '模型来源' })
  source: string | null;

  @Column({ type: 'datetime', name: 'create_time', nullable: true, comment: '创建时间' })
  createTime: Date | null;
}
