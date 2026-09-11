import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base';

@Entity('sa_system_category', { comment: '附件分类表' })
export class AttachmentCategoryEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id', comment: '分类ID' })
  id: number;

  @Column({ type: 'int', name: 'parent_id', default: 0, comment: '父id' })
  parentId: number;

  @Column({ type: 'varchar', name: 'level', length: 255, nullable: true, comment: '组集关系' })
  level: string;

  @Column({ type: 'varchar', name: 'category_name', length: 100, default: '', comment: '分类名称' })
  categoryName: string;

  @Column({ type: 'int', name: 'sort', default: 0, comment: '排序' })
  sort: number;

  @Column({ type: 'tinyint', name: 'status', default: 1, comment: '状态' })
  status: number;

  @Column({ type: 'varchar', name: 'remark', length: 255, nullable: true, comment: '备注' })
  remark: string;
}
