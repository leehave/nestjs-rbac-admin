import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';

@Entity('sa_system_user_menu', { comment: '用户菜单关联表' })
export class SysUserMenuEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', comment: '主键' })
  id: number;

  @Column({ type: 'bigint', name: 'user_id', comment: '用户ID' })
  userId: number;

  @Column({ type: 'bigint', name: 'menu_id', comment: '菜单ID' })
  menuId: number;

  @Column({ type: 'bigint', name: 'tenant_id', default: 0, comment: '租户ID' })
  tenantId: number;

  @Column({ type: 'tinyint', name: 'status', default: 1, comment: '状态' })
  status: number;

  @CreateDateColumn({ type: 'datetime', name: 'create_time', nullable: true, comment: '创建时间' })
  createTime: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'update_time', nullable: true, comment: '修改时间' })
  updateTime: Date;

  @DeleteDateColumn({ type: 'datetime', name: 'delete_time', nullable: true, comment: '删除时间' })
  deleteTime: Date;
}
