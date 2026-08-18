import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('sa_system_user_role', { comment: '用户角色关联表' })
export class SysUserRoleEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', comment: '主键' })
  id: number;

  @Column({ type: 'bigint', name: 'user_id', comment: '用户ID' })
  userId: number;

  @Column({ type: 'bigint', name: 'role_id', comment: '角色ID' })
  roleId: number;

  @Column({ type: 'tinyint', name: 'status', default: 1, comment: '状态' })
  status: number;

  @Column({ type: 'bigint', name: 'tenant_id', default: 0, comment: '租户ID' })
  tenantId: number;
}
