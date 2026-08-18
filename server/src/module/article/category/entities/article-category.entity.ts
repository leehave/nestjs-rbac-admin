import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../../../common/entities/base';

@Entity('sa_article_category', { comment: '文章分类表' })
export class ArticleCategoryEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id', comment: '分类ID' })
  id: number;

  @Column({ type: 'varchar', name: 'name', length: 50, comment: '分类名称' })
  name: string;

  @Column({ type: 'int', name: 'sort', default: 0, comment: '排序' })
  sort: number;

  @Column({ type: 'tinyint', name: 'status', default: 1, comment: '状态（1启用 0禁用）' })
  status: number;

  @Column({ type: 'varchar', name: 'remark', length: 255, default: '', comment: '备注' })
  remark: string;
}
