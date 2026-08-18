import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('sa_system_role_dept', { comment: '角色部门关联表' })
export class SysRoleDeptEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', comment: '主键' })
  id: number;

  @Column({ type: 'bigint', name: 'role_id', comment: '角色ID' })
  roleId: number;

  @Column({ type: 'bigint', name: 'dept_id', comment: '部门ID' })
  deptId: number;
}
