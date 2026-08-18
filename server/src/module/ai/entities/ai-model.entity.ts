import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base';

@Entity('sa_ai_model', { comment: 'AI 模型配置' })
export class AiModelEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', comment: '主键' })
  id: string;

  @Column({ type: 'int', name: 'tenant_id', default: 0 })
  tenantId: number;

  @Column({ type: 'bigint', name: 'provider_id', comment: '供应商ID' })
  providerId: string;

  @Column({ type: 'varchar', name: 'model_code', length: 64 })
  modelCode: string;

  @Column({ type: 'varchar', name: 'name', length: 64 })
  name: string;

  @Column({ type: 'int', name: 'context_window', default: 32000 })
  contextWindow: number;

  @Column({ type: 'int', name: 'max_output_tokens', default: 4096 })
  maxOutputTokens: number;

  @Column({ type: 'decimal', name: 'default_temperature', precision: 4, scale: 2, default: 0.7 })
  defaultTemperature: number;

  @Column({ type: 'tinyint', name: 'is_default', default: 0 })
  isDefault: number;

  @Column({ type: 'char', name: 'status', length: 1, default: '1', comment: '1正常 0停用' })
  status: string;

  @Column({ type: 'smallint', name: 'sort', default: 0 })
  sort: number;

  @Column({ type: 'varchar', name: 'remark', length: 255, default: '' })
  remark: string;
}
