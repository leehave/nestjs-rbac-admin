import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';
import { Transform } from 'class-transformer';
import { PagingDto } from '../../../../common/dto/index';
import type { Type } from '@nestjs/common';

export class CreateJobDto {
  @ApiProperty({ description: '任务名称' })
  @IsNotEmpty({ message: '任务名称不能为空' })
  @IsString()
  @Length(1, 64)
  job_name: string;

  @ApiProperty({ description: '任务组名' })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  job_group?: string;

  @ApiProperty({ description: '调用目标字符串' })
  @IsNotEmpty({ message: '调用目标字符串不能为空' })
  @IsString()
  @Length(1, 500)
  invoke_target: string;

  @ApiProperty({ description: 'cron执行表达式' })
  @IsNotEmpty({ message: 'cron表达式不能为空' })
  @IsString()
  cron_expression: string;

  @ApiProperty({ description: '计划执行错误策略（1立即执行 2执行一次 3放弃执行）' })
  @IsOptional()
  @IsIn(['1', '2', '3'])
  misfire_policy?: string;

  @ApiProperty({ description: '是否并发执行（0允许 1禁止）' })
  @IsOptional()
  @IsIn(['0', '1'])
  concurrent?: string;

  @ApiProperty({ description: '状态（0正常 1暂停）' })
  @IsOptional()
  @IsIn(['0', '1'])
  status?: string;

  @ApiProperty({ description: '备注信息', required: false })
  @IsString()
  @IsOptional()
  remark?: string;
}

export class UpdateJobDto extends PartialType(CreateJobDto) {}

export class ListJobDto extends PagingDto {
  @ApiProperty({ description: '任务名称' })
  @IsOptional()
  @IsString()
  job_name?: string;

  @ApiProperty({ description: '任务组名' })
  @IsOptional()
  @IsString()
  job_group?: string;

  @ApiProperty({ description: '状态（0正常 1暂停）' })
  @IsOptional()
  @IsIn(['0', '1'])
  status?: string;
}

export class ListJobLogDto extends PagingDto {
  @ApiProperty({ description: '任务名称' })
  @IsOptional()
  @IsString()
  job_name?: string;

  @ApiProperty({ description: '任务组名' })
  @IsOptional()
  @IsString()
  job_group?: string;

  @ApiProperty({ description: '执行状态（0正常 1失败）' })
  @IsOptional()
  @IsIn(['0', '1'])
  status?: string;

  @ApiProperty({ description: '执行时间范围', required: false, type: [String] })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value.filter(Boolean);
    }
    if (value && typeof value === 'object') {
      return Object.keys(value)
        .sort((a, b) => Number(a) - Number(b))
        .map((key) => value[key])
        .filter(Boolean);
    }
    return value ? [value] : undefined;
  })
  create_time?: string[];

  @ApiProperty({ description: '开始时间', required: false })
  @IsOptional()
  @IsString()
  beginTime?: string;

  @ApiProperty({ description: '结束时间', required: false })
  @IsOptional()
  @IsString()
  endTime?: string;
}
