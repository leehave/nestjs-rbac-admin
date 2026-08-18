import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../../../common/entities/base';

@Entity('sa_system_role', { comment: '角色信息表' })
export class SysRoleEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', comment: '角色ID' })
  id: number;

  @Column({ type: 'bigint', name: 'parent_id', default: 0, comment: '父角色ID' })
  parentId: number;

  @Column({ type: 'varchar', name: 'name', length: 64, comment: '角色名称' })
  name: string;

  @Column({ type: 'varchar', name: 'code', length: 64, unique: true, comment: '角色权限字符串' })
  code: string;

  @Column({ type: 'int', name: 'level', default: 1, comment: '角色层级' })
  level: number;

  @Column({ type: 'tinyint', name: 'data_scope', default: 1, comment: '数据范围' })
  dataScope: number;

  @Column({ type: 'varchar', name: 'remark', length: 255, default: '', comment: '备注' })
  remark: string;

  @Column({ type: 'int', name: 'sort', default: 100, comment: '显示顺序' })
  sort: number;

  @Column({ type: 'bigint', name: 'tenant_id', default: 0, comment: '租户ID' })
  tenantId: number;

  @Column({ type: 'tinyint', name: 'status', default: 1, comment: '状态' })
  status: number;
}
