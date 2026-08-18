import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../../common/entities/base';

@Entity('sa_system_notice', {
  comment: '通知公告表',
})
export class SysNoticeEntity extends BaseEntity {
  @ApiProperty({ type: Number, description: '公告ID' })
  @PrimaryGeneratedColumn({ type: 'int', name: 'id', comment: '公告ID' })
  public id: number;

  @Column({ type: 'varchar', name: 'title', length: 200, comment: '公告标题' })
  public title: string;

  @Column({ type: 'tinyint', name: 'type', default: 0, comment: '公告类型（0通知 1公告）' })
  public type: number;

  @Column({ type: 'text', name: 'content', nullable: true, comment: '公告内容' })
  public content: string;

  @Column({ type: 'smallint', name: 'status', default: 1, comment: '状态（1启用 0禁用）' })
  public status: number;

  @Column({ type: 'bigint', name: 'tenant_id', default: 0, comment: '租户ID' })
  public tenantId: number;

  @Column({ type: 'varchar', name: 'remark', length: 255, default: '', comment: '备注' })
  public remark: string;
}
