import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../../common/entities/base';

@Entity('sa_system_tenant', {
  comment: '租户表',
})
export class TenantEntity extends BaseEntity {
  @ApiProperty({ type: Number, description: '租户ID' })
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', comment: '租户ID' })
  public id: number;

  @Column({ type: 'varchar', name: 'tenant_name', length: 100, comment: '租户名称' })
  public tenantName: string;

  @Column({ type: 'varchar', name: 'tenant_code', length: 50, unique: true, comment: '租户编码' })
  public tenantCode: string;

  @Column({ type: 'varchar', name: 'contact_name', length: 50, comment: '联系人' })
  public contactName: string;

  @Column({ type: 'varchar', name: 'contact_phone', length: 20, comment: '联系电话' })
  public contactPhone: string;

  @Column({ type: 'varchar', name: 'contact_email', length: 100, comment: '联系邮箱' })
  public contactEmail: string;

  @Column({ type: 'varchar', name: 'address', length: 255, nullable: true, comment: '地址' })
  public address: string;

  @Column({ type: 'varchar', name: 'logo_url', length: 255, nullable: true, comment: 'Logo地址' })
  public logoUrl: string;

  @Column({ type: 'tinyint', name: 'status', default: 1, comment: '状态（1启用 0禁用）' })
  public status: number;

  @Column({ type: 'timestamp', name: 'expire_time', default: null, nullable: true, comment: '过期时间' })
  public expireTime: Date;

  @Column({ type: 'int', name: 'max_users', default: 0, comment: '最大用户数' })
  public maxUsers: number;

  @Column({ type: 'int', name: 'max_depts', default: 0, comment: '最大部门数' })
  public maxDepts: number;

  @Column({ type: 'int', name: 'max_roles', default: 0, comment: '最大角色数' })
  public maxRoles: number;

  @Column({ type: 'varchar', name: 'remark', length: 500, default: '', comment: '备注' })
  public remark: string;
}
