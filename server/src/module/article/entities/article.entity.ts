import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../common/entities/base';

@Entity('sa_article', {
  comment: '文章表',
})
export class ArticleEntity extends BaseEntity {
  @ApiProperty({ type: Number, description: '文章ID' })
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', comment: '文章ID' })
  public id: number;

  @ApiProperty({ type: Number, description: '分类ID' })
  @Column({ type: 'int', name: 'category_id', comment: '分类ID' })
  public categoryId: number;

  @ApiProperty({ type: String, description: '文章标题' })
  @Column({ type: 'varchar', name: 'title', length: 255, comment: '文章标题' })
  public title: string;

  @ApiProperty({ type: String, description: '作者' })
  @Column({ type: 'varchar', name: 'author', length: 255, nullable: true, comment: '作者' })
  public author: string;

  @ApiProperty({ type: String, description: '封面图片' })
  @Column({ type: 'varchar', name: 'image', length: 1000, nullable: true, comment: '封面图片' })
  public image: string;

  @ApiProperty({ type: String, description: '文章简介' })
  @Column({ type: 'varchar', name: 'describe', length: 1000, comment: '文章简介' })
  public describe: string;

  @ApiProperty({ type: String, description: '文章内容' })
  @Column({ type: 'text', name: 'content', comment: '文章内容' })
  public content: string;

  @ApiProperty({ type: Number, description: '浏览次数' })
  @Column({ type: 'int', name: 'views', default: 0, comment: '浏览次数' })
  public views: number;

  @ApiProperty({ type: Number, description: '排序' })
  @Column({ type: 'int', name: 'sort', default: 100, comment: '排序' })
  public sort: number;

  @ApiProperty({ type: Number, description: '状态（1启用 0禁用）' })
  @Column({ type: 'tinyint', name: 'status', default: 1, comment: '状态（1启用 0禁用）' })
  public status: number;

  @ApiProperty({ type: Number, description: '是否外链（1是 2否）' })
  @Column({ type: 'tinyint', name: 'is_link', default: 2, comment: '是否外链（1是 2否）' })
  public isLink: number;

  @ApiProperty({ type: String, description: '外链地址' })
  @Column({ type: 'varchar', name: 'link_url', length: 255, nullable: true, comment: '外链地址' })
  public linkUrl: string;

  @ApiProperty({ type: Number, description: '是否热门（1热门 2普通）' })
  @Column({ type: 'tinyint', name: 'is_hot', default: 2, comment: '是否热门（1热门 2普通）' })
  public isHot: number;

  @ApiProperty({ type: Number, description: '租户ID' })
  @Column({ type: 'int', name: 'tenant_id', default: null, comment: '租户ID' })
  public tenantId: number;

  @ApiProperty({ type: Number, description: '部门ID' })
  @Column({ type: 'int', name: 'dept_id', default: null, comment: '部门ID' })
  public deptId: number;
}
