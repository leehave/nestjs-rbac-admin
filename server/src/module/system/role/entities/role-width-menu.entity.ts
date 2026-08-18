import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('sa_system_role_menu', { comment: '角色菜单关联表' })
export class SysRoleMenuEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', comment: '主键' })
  id: number;

  @Column({ type: 'bigint', name: 'role_id', comment: '角色ID' })
  roleId: number;

  @Column({ type: 'bigint', name: 'menu_id', comment: '菜单ID' })
  menuId: number;
}
