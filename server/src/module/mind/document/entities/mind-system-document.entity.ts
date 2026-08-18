import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('t_system_document', { comment: '系统文档附件表' })
export class MindSystemDocumentEntity {
  @PrimaryColumn({ type: 'varchar', length: 50, name: 'id', comment: '主键id' })
  id: string;

  @Column({ type: 'bigint', name: 'tenant_id', default: 0, comment: '租户ID' })
  tenantId: number;

  @Column({ type: 'varchar', length: 100, name: 'document_name', nullable: true, comment: '文档名' })
  documentName: string | null;

  @Column({ type: 'varchar', length: 10, name: 'document_type', nullable: true, comment: '文档类型' })
  documentType: string | null;

  @Column({ type: 'int', name: 'document_size', default: 0, comment: '文档大小（MB）' })
  documentSize: number;

  @Column({ type: 'varchar', length: 20, name: 'library_number', nullable: true, comment: '知识库编号' })
  libraryNumber: string | null;

  @Column({ type: 'varchar', length: 1000, name: 'document_summary', nullable: true, comment: '知识摘要' })
  documentSummary: string | null;

  @Column({ type: 'tinyint', name: 'status', default: () => '0', comment: '分析状态：0未完成，1完成' })
  status: number;

  @Column({ type: 'datetime', name: 'upload_time', nullable: true, comment: '上传时间' })
  uploadTime: Date | null;
}

