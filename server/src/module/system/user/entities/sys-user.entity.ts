import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { Exclude } from 'class-transformer';
import { BaseEntity } from '../../../../common/entities/base';

@Entity('sa_system_user', { comment: '用户信息表' })
export class UserEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id', comment: '用户ID' })
  id: number;

  @Column({ type: 'varchar', name: 'username', length: 64, unique: true, comment: '用户账号' })
  username: string;

  @Exclude({ toPlainOnly: true })
  @Column({ type: 'varchar', name: 'password', length: 255, nullable: false, comment: '用户登录密码' })
  password: string;

  @Column({ type: 'varchar', name: 'realname', length: 64, nullable: true, comment: '用户昵称' })
  realname: string;

  @Column({ type: 'varchar', name: 'gender', length: 10, nullable: true, default: '0', comment: '性别' })
  gender: string;

  @Column({ type: 'varchar', name: 'avatar', length: 255, default: '', comment: '头像地址' })
  avatar: string;

  @Column({ type: 'varchar', name: 'email', length: 128, default: '', comment: '邮箱' })
  email: string;

  @Column({ type: 'varchar', name: 'phone', length: 20, default: '', comment: '手机号码' })
  phone: string;

  @Column({ type: 'varchar', name: 'dashboard', length: 255, default: 'work', comment: '仪表盘' })
  dashboard: string;

  @Column({ type: 'bigint', name: 'dept_id', default: null, nullable: true, comment: '部门ID' })
  deptId: number;

  @Column({ type: 'tinyint', name: 'is_super', default: 0, comment: '是否超级管理员' })
  isSuper: number;

  @Column({ type: 'tinyint', name: 'status', default: 1, comment: '状态（1启用 0禁用）' })
  status: number;

  @Column({ type: 'varchar', name: 'remark', length: 255, default: '', comment: '备注' })
  remark: string;

  @Column({ type: 'timestamp', name: 'login_time', default: null, nullable: true, comment: '最后登录时间' })
  loginTime: Date;

  @Column({ type: 'varchar', name: 'login_ip', length: 45, default: '', comment: '最后登录IP' })
  loginIp: string;
}
