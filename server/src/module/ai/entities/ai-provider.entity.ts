import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base';

@Entity('sa_ai_provider', { comment: 'AI 模型供应商' })
export class AiProviderEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', comment: '主键' })
  id: string;

  @Column({ type: 'int', name: 'tenant_id', default: 0, comment: '租户ID，0=平台级' })
  tenantId: number;

  @Column({ type: 'varchar', name: 'code', length: 32, comment: '供应商标识' })
  code: string;

  @Column({ type: 'varchar', name: 'name', length: 64, comment: '展示名称' })
  name: string;

  @Column({ type: 'varchar', name: 'base_url', length: 255, comment: 'API Base URL' })
  baseUrl: string;

  @Column({ type: 'text', name: 'api_key_cipher', nullable: true, comment: '加密 API Key' })
  apiKeyCipher: string;

  @Column({ type: 'varchar', name: 'adapter_type', length: 32, default: 'openai-completions' })
  adapterType: string;

  @Column({ type: 'json', name: 'extra_headers', nullable: true })
  extraHeaders: Record<string, string> | null;

  @Column({ type: 'char', name: 'status', length: 1, default: '1', comment: '1正常 0停用' })
  status: string;

  @Column({ type: 'smallint', name: 'sort', default: 0 })
  sort: number;

  @Column({ type: 'varchar', name: 'remark', length: 255, default: '' })
  remark: string;
}
