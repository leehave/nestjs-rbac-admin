import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('sa_job_log', {
  comment: '任务调度日志表',
})
export class JobLog {
  @ApiProperty({ description: '任务日志ID' })
  @PrimaryGeneratedColumn({ type: 'int', name: 'job_log_id', comment: '任务日志ID' })
  jobLogId: number;

  @ApiProperty({ description: '任务名称' })
  @Column({ type: 'varchar', length: 64, name: 'job_name', comment: '任务名称' })
  job_name: string;

  @ApiProperty({ description: '任务组名' })
  @Column({ type: 'varchar', length: 64, name: 'job_group', comment: '任务组名' })
  job_group: string;

  @ApiProperty({ description: '调用目标字符串' })
  @Column({ type: 'varchar', length: 500, name: 'invoke_target', comment: '调用目标字符串' })
  invoke_target: string;

  @ApiProperty({ description: '日志信息' })
  @Column({ type: 'varchar', length: 500, name: 'job_message', nullable: true, comment: '日志信息' })
  job_message: string;

  @ApiProperty({ description: '执行状态（0正常 1失败）' })
  @Column({ type: 'char', length: 1, name: 'status', default: '0', comment: '执行状态（0正常 1失败）' })
  status: string;

  @ApiProperty({ description: '异常信息' })
  @Column({ type: 'varchar', length: 2000, name: 'exception_info', nullable: true, comment: '异常信息' })
  exception_info: string;

  @CreateDateColumn({ type: 'datetime', name: 'create_time', precision: 6, comment: '创建时间' })
  create_time: Date;
}
