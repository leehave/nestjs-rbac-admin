import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../../../common/entities/base';

@Entity('sa_system_oper_log', {
  comment: '操作日志记录',
})
export class OperLogEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', comment: '日志主键' })
  public id: number;

  @Column({ type: 'varchar', name: 'username', length: 20, default: '', comment: '操作人员' })
  public username: string;

  @Column({ type: 'varchar', name: 'app', length: 50, default: '', comment: '应用模块' })
  public app: string;

  @Column({ type: 'varchar', name: 'method', length: 20, default: '', comment: '请求方式' })
  public method: string;

  @Column({ type: 'varchar', name: 'router', length: 500, default: '', comment: '请求路由' })
  public router: string;

  @Column({ type: 'varchar', name: 'service_name', length: 30, default: '', comment: '服务名称' })
  public serviceName: string;

  @Column({ type: 'varchar', name: 'ip', length: 45, default: '', comment: '主机地址' })
  public ip: string;

  @Column({ type: 'varchar', name: 'ip_location', length: 255, default: '', comment: '操作地点' })
  public ipLocation: string;

  @Column({ type: 'text', name: 'request_data', default: null, nullable: true, comment: '请求参数' })
  public requestData: string;

  @Column({ type: 'varchar', name: 'duration', length: 20, default: '', comment: '消耗时间' })
  public duration: string;

  @Column({ type: 'varchar', name: 'remark', length: 255, default: '', comment: '备注' })
  public remark: string;
}
