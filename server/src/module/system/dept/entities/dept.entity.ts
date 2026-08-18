import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../../../common/entities/base';

@Entity('sa_system_dept', { comment: '部门表' })
export class SysDeptEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', comment: '部门ID' })
  id: number;

  @Column({ type: 'bigint', name: 'parent_id', default: 0, comment: '父部门ID' })
  parentId: number;

  @Column({ type: 'varchar', name: 'name', length: 64, comment: '部门名称' })
  name: string;

  @Column({ type: 'varchar', name: 'code', length: 64, nullable: true, comment: '部门编码' })
  code: string;

  @Column({ type: 'bigint', name: 'leader_id', default: null, nullable: true, comment: '负责人ID' })
  leaderId: number;

  @Column({ type: 'varchar', name: 'level', length: 255, default: '', comment: '层级路径' })
  level: string;

  @Column({ type: 'bigint', name: 'tenant_id', default: 0, comment: '租户ID' })
  tenantId: number;

  @Column({ type: 'int', name: 'sort', default: 0, comment: '显示顺序' })
  sort: number;

  @Column({ type: 'tinyint', name: 'status', default: 1, comment: '状态（1启用 0禁用）' })
  status: number;

  @Column({ type: 'varchar', name: 'remark', length: 255, default: '', comment: '备注' })
  remark: string;
}
