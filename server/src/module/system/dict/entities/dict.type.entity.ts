import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../../../common/entities/base';

@Entity('sa_system_dict_type', { comment: '字典类型表' })
export class DictTypeEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id', comment: '字典主键' })
  id: number;

  @Column({ type: 'varchar', name: 'name', length: 50, comment: '字典名称' })
  name: string;

  @Column({ type: 'varchar', name: 'code', length: 100, comment: '字典编码' })
  code: string;

  @Column({ type: 'smallint', name: 'status', default: 1, comment: '状态' })
  status: number;

  @Column({ type: 'varchar', name: 'remark', length: 255, default: '', comment: '备注' })
  remark: string;
}
