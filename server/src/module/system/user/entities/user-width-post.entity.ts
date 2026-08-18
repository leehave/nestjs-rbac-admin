import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('sa_system_user_post', { comment: '用户岗位关联表' })
export class SysUserPostEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', comment: '主键' })
  id: number;

  @Column({ type: 'bigint', name: 'user_id', comment: '用户ID' })
  userId: number;

  @Column({ type: 'bigint', name: 'post_id', comment: '岗位ID' })
  postId: number;

  @Column({ type: 'tinyint', name: 'status', default: 1, comment: '状态' })
  status: number;

  @Column({ type: 'bigint', name: 'tenant_id', default: 0, comment: '租户ID' })
  tenantId: number;
}
