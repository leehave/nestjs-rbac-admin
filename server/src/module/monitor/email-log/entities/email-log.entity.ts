import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';

@Entity('sa_system_mail', {
  comment: '邮件记录',
})
export class EmailLogEntity {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id', comment: '编号' })
  public id: number;

  @Column({ type: 'varchar', name: 'gateway', length: 50, nullable: true, comment: '网关' })
  public gateway: string;

  @Column({ type: 'varchar', name: 'from', length: 50, nullable: true, comment: '发送人' })
  public from: string;

  @Column({ type: 'varchar', name: 'email', length: 50, nullable: true, comment: '接收人' })
  public email: string;

  @Column({ type: 'varchar', name: 'code', length: 20, nullable: true, comment: '验证码' })
  public code: string;

  @Column({ type: 'varchar', name: 'content', length: 500, nullable: true, comment: '邮箱内容' })
  public content: string;

  @Column({ type: 'varchar', name: 'status', length: 20, nullable: true, comment: '发送状态' })
  public status: string;

  @Column({ type: 'varchar', name: 'response', length: 500, nullable: true, comment: '返回结果' })
  public response: string;

  @CreateDateColumn({ type: 'datetime', name: 'create_time', nullable: true, comment: '创建时间' })
  public createTime: Date;

  @UpdateDateColumn({ type: 'datetime', name: 'update_time', nullable: true, comment: '修改时间' })
  public updateTime: Date;

  @DeleteDateColumn({ type: 'datetime', name: 'delete_time', nullable: true, comment: '删除时间' })
  public deleteTime: Date;
}
