import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../../common/entities/base';

@Entity('sa_system_plugin', {
  comment: '插件表',
})
export class PluginEntity extends BaseEntity {
  @ApiProperty({ type: Number, description: '插件ID' })
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', comment: '插件ID' })
  public id: number;

  @Column({ type: 'varchar', name: 'name', length: 100, unique: true, comment: '插件名称' })
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
