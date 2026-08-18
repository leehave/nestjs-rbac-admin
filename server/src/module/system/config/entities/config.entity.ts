import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../../../common/entities/base';

@Entity('sa_system_config', { comment: '参数配置表' })
export class SysConfigEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id', comment: '参数主键' })
  id: number;

  @Column({ type: 'int', name: 'group_id', default: null, nullable: true, comment: '分组ID' })
  groupId: number;

  @Column({ type: 'varchar', name: 'key', length: 32, comment: '配置键名' })
  key: string;

  @Column({ type: 'text', name: 'value', default: null, nullable: true, comment: '配置键值' })
  value: string;

  @Column({ type: 'varchar', name: 'name', length: 255, default: null, nullable: true, comment: '配置名称' })
  name: string;

  @Column({ type: 'varchar', name: 'input_type', length: 32, default: null, nullable: true, comment: '输入类型' })
  inputType: string;

  @Column({ type: 'varchar', name: 'config_select_data', length: 500, default: null, nullable: true, comment: '可选数据' })
  configSelectData: string;

  @Column({ type: 'smallint', name: 'sort', default: 0, comment: '显示顺序' })
  sort: number;

  @Column({ type: 'varchar', name: 'remark', length: 255, default: '', comment: '备注' })
  remark: string;
}
