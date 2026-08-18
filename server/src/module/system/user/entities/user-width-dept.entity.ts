import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../../../common/entities/base';

@Entity('sa_system_user_dept', {
  comment: '用户部门关联表',
})
export class SysUserDeptEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', comment: '主键' })
  public id: number;

  @Column({ type: 'bigint', name: 'tenant_id', comment: '租户ID' })
  public tenantId: number;

  @Column({ type: 'bigint', name: 'user_id', comment: '用户ID' })
  public userId: number;

  @Column({ type: 'bigint', name: 'dept_id', comment: '部门ID' })
  public deptId: number;
}
