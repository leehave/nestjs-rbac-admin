import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../../../common/entities/base';

@Entity('sa_system_config_group', { comment: '参数配置分组表' })
export class SysConfigGroupEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id', comment: '主键' })
  id: number;

  @Column({ type: 'varchar', name: 'name', length: 50, nullable: true, comment: '分组名称' })
  name: string;

  @Column({ type: 'varchar', name: 'code', length: 100, nullable: true, comment: '分组标识' })
  code: string;

  @Column({ type: 'varchar', name: 'remark', length: 255, default: '', comment: '备注' })
  remark: string;
}
