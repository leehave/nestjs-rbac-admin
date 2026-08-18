import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('sa_job', {
  comment: '定时任务表',
})
export class Job {
  @ApiProperty({ description: '任务ID' })
  @PrimaryGeneratedColumn({ type: 'int', name: 'job_id', comment: '任务ID' })
  jobId: number;

  @ApiProperty({ description: '任务名称' })
  @Column({ type: 'varchar', length: 64, name: 'job_name', comment: '任务名称' })
  job_name: string;

  @ApiProperty({ description: '任务组名' })
  @Column({ type: 'varchar', length: 64, name: 'job_group', default: 'DEFAULT', comment: '任务组名' })
  job_group: string;

  @ApiProperty({ description: '调用目标字符串' })
  @Column({ type: 'varchar', length: 500, name: 'invoke_target', comment: '调用目标字符串' })
  invoke_target: string;

  @ApiProperty({ description: 'cron执行表达式' })
  @Column({ type: 'varchar', length: 255, name: 'cron_expression', nullable: true, comment: 'cron执行表达式' })
  cron_expression: string;

  @ApiProperty({ description: '计划执行错误策略（1立即执行 2执行一次 3放弃执行）' })
  @Column({ type: 'varchar', length: 20, name: 'misfire_policy', default: '3', comment: '计划执行错误策略' })
  misfire_policy: string;

  @ApiProperty({ description: '是否并发执行（0允许 1禁止）' })
  @Column({ type: 'char', length: 1, name: 'concurrent', default: '1', comment: '是否并发执行（0允许 1禁止）' })
  concurrent: string;

  @ApiProperty({ description: '状态（0正常 1暂停）' })
  @Column({ type: 'char', length: 1, name: 'status', default: '0', comment: '状态（0正常 1暂停）' })
  status: string;

  @ApiProperty({ description: '创建者' })
  @Column({ type: 'varchar', length: 64, name: 'create_by', default: '', comment: '创建者' })
  create_by: string;

  @CreateDateColumn({ type: 'datetime', name: 'create_time', precision: 6, comment: '创建时间' })
  create_time: Date;

  @ApiProperty({ description: '更新者' })
  @Column({ type: 'varchar', length: 64, name: 'update_by', default: '', comment: '更新者' })
  update_by: string;

  @UpdateDateColumn({ type: 'datetime', name: 'update_time', precision: 6, comment: '更新时间' })
  update_time: Date;

  @ApiProperty({ description: '备注' })
  @Column({ type: 'varchar', length: 500, name: 'remark', nullable: true, comment: '备注' })
  remark: string;

  @ApiProperty({ description: '删除标志（0存在 1删除）' })
  @Column({ type: 'char', length: 1, name: 'del_flag', default: '0', comment: '删除标志' })
  del_flag: string;
}
