import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../../../common/entities/base';

@Entity('sa_system_dict_data', { comment: '字典数据表' })
export class DictDataEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id', comment: '字典主键' })
  id: number;

  @Column({ type: 'int', name: 'type_id', default: null, nullable: true, comment: '字典类型ID' })
  typeId: number;

  @Column({ type: 'varchar', name: 'label', length: 50, comment: '字典标签' })
  label: string;

  @Column({ type: 'varchar', name: 'value', length: 100, comment: '字典键值' })
  value: string;

  @Column({ type: 'varchar', name: 'color', length: 50, nullable: true, comment: '颜色' })
  color: string;

  @Column({ type: 'varchar', name: 'code', length: 100, nullable: true, comment: '编码' })
  code: string;

  @Column({ type: 'smallint', name: 'sort', default: 0, comment: '显示顺序' })
  sort: number;

  @Column({ type: 'smallint', name: 'status', default: 1, comment: '状态' })
  status: number;

  @Column({ type: 'varchar', name: 'remark', length: 255, default: '', comment: '备注' })
  remark: string;
}
