import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../../common/entities/base';

@Entity('sa_system_post', {
  comment: '岗位信息表',
})
export class SysPostEntity extends BaseEntity {
  @ApiProperty({ type: Number, description: '岗位ID' })
  @PrimaryGeneratedColumn({ type: 'int', name: 'id', comment: '岗位ID' })
  public id: number;

  @Column({ type: 'varchar', name: 'name', length: 50, comment: '岗位名称' })
  public name: string;

  @Column({ type: 'varchar', name: 'code', length: 100, comment: '岗位编码' })
  public code: string;

  @Column({ type: 'smallint', name: 'sort', default: 0, comment: '显示顺序' })
  public sort: number;

  @Column({ type: 'smallint', name: 'status', default: 1, comment: '状态（1启用 0禁用）' })
  public status: number;

  @Column({ type: 'bigint', name: 'tenant_id', default: 0, comment: '租户ID' })
  public tenantId: number;

  @Column({ type: 'varchar', name: 'remark', length: 255, default: '', comment: '备注' })
  public remark: string;
}
