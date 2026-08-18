import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { BaseEntity } from '../../../../common/entities/base';

/**
 * 角色-菜单数据权限阈值表（等价 Camelus 的 admin_role_filter_resource）。
 * filter_type：0=仅自己 1=自己和下属 2=无。
 */
@Entity('sa_system_role_menu_filter', { comment: '角色-菜单数据权限阈值表' })
@Unique('uk_role_menu', ['roleId', 'menuId'])
export class SysRoleMenuFilterEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', comment: '主键' })
  id: number;

  @Column({ type: 'bigint', name: 'role_id', comment: '角色ID' })
  roleId: number;

  @Column({ type: 'bigint', name: 'menu_id', comment: '菜单ID' })
  menuId: number;

  @Column({ type: 'tinyint', name: 'filter_type', default: 0, comment: '数据权限阈值：0仅自己 1自己和下属 2无' })
  filterType: number;

  @Column({ type: 'varchar', name: 'remark', length: 255, nullable: true, comment: '备注' })
  remark: string;
}
