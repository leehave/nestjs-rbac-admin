import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../../../common/entities/base';

@Entity('sa_system_login_log', {
  comment: '系统访问记录',
})
export class LoginLogEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id', comment: '访问ID' })
  public id: number;

  @Column({ type: 'varchar', name: 'username', length: 20, default: '', comment: '用户账号' })
  public username: string;

  @Column({ type: 'varchar', name: 'ip', length: 45, default: '', comment: '登录IP地址' })
  public ip: string;

  @Column({ type: 'varchar', name: 'ip_location', length: 255, default: '', comment: '登录地点' })
  public ipLocation: string;

  @Column({ type: 'varchar', name: 'os', length: 50, default: '', comment: '操作系统' })
  public os: string;

  @Column({ type: 'varchar', name: 'browser', length: 50, default: '', comment: '浏览器类型' })
  public browser: string;

  @Column({ type: 'smallint', name: 'status', default: 1, comment: '登录状态（1成功 2失败）' })
  public status: number;

  @Column({ type: 'varchar', name: 'message', length: 50, default: '', comment: '提示消息' })
  public message: string;

  @Column({ type: 'datetime', name: 'login_time', default: null, nullable: true, comment: '登录时间' })
  public loginTime: Date;

  @Column({ type: 'varchar', name: 'remark', length: 255, default: '', comment: '备注' })
  public remark: string;
}
