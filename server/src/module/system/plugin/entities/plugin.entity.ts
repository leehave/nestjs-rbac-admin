import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../../common/entities/base';

@Entity('sa_system_plugin', {
  comment: '插件表',
})
// 显式命名唯一键，与 database/schema-alignment.sql 中的 DDL 保持一致，
// 避免 TypeORM 自动生成的 IDX_<hash> 与手写 DDL 的键名不一致导致 synchronize 反复建索引
@Unique('uk_plugin_name', ['name'])
export class PluginEntity extends BaseEntity {
  @ApiProperty({ type: Number, description: '插件ID' })
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', comment: '插件ID' })
  public id: number;

  @Column({ type: 'varchar', name: 'name', length: 100, comment: '插件名称' })
  public name: string;

  @Column({ type: 'varchar', name: 'title', length: 200, comment: '插件标题' })
  public title: string;

  @Column({ type: 'text', name: 'description', nullable: true, comment: '插件描述' })
  public description: string;

  @Column({ type: 'varchar', name: 'version', length: 20, comment: '版本号' })
  public version: string;

  @Column({ type: 'varchar', name: 'author', length: 100, nullable: true, comment: '作者' })
  public author: string;

  @Column({ type: 'tinyint', name: 'status', default: 0, comment: '状态（0未安装 1已安装 2已启用）' })
  public status: number;

  @Column({ type: 'text', name: 'config', nullable: true, comment: '插件配置(JSON)' })
  public config: string;
}
