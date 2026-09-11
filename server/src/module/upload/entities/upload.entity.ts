import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base';

@Entity('sa_system_attachment', { comment: '文件上传记录' })
export class UploadEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id', comment: '附件ID' })
  id: number;

  @Column({ type: 'int', name: 'category_id', default: 0, comment: '分类ID' })
  categoryId: number;

  @Column({ type: 'smallint', name: 'storage_mode', default: 1, comment: '存储模式' })
  storageMode: number;

  @Column({ type: 'varchar', name: 'origin_name', length: 255, comment: '原始文件名' })
  originName: string;

  @Column({ type: 'varchar', name: 'object_name', length: 50, comment: '存储对象名' })
  objectName: string;

  @Column({ type: 'varchar', name: 'hash', length: 64, comment: '文件哈希' })
  hash: string;

  @Column({ type: 'varchar', name: 'mime_type', length: 255, comment: 'MIME类型' })
  mimeType: string;

  @Column({ type: 'varchar', name: 'storage_path', length: 100, comment: '存储路径' })
  storagePath: string;

  @Column({ type: 'varchar', name: 'suffix', length: 10, comment: '文件后缀' })
  suffix: string;

  @Column({ type: 'bigint', name: 'size_byte', comment: '文件大小(字节)' })
  sizeByte: number;

  @Column({ type: 'varchar', name: 'size_info', length: 50, comment: '大小描述' })
  sizeInfo: string;

  @Column({ type: 'varchar', name: 'url', length: 255, comment: '文件地址' })
  url: string;

  @Column({ type: 'varchar', name: 'remark', length: 255, default: '', comment: '备注' })
  remark: string;
}
