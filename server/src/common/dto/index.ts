import { IsDateString, IsEnum, IsNumberString, IsObject, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

import { SortRuleEnum } from '../enum/index';

export class DateParamsDTO {
  @IsDateString()
  beginTime: string;

  @IsDateString()
  endTime: string;
}

export class PagingDto {
  @ApiProperty({ required: true, description: '当前分页', default: 1 })
  @IsOptional()
  @Transform(({ value, obj }) => {
    const page = value ?? obj.page;
    return page?.toString?.() || '1';
  })
  @IsNumberString()
  pageNum?: number;

  @ApiProperty({ required: true, description: '每页数量', default: 10 })
  @IsOptional()
  @Transform(({ value, obj }) => {
    const size = value ?? obj.limit;
    return size?.toString?.() || '10';
  })
  @IsNumberString()
  pageSize?: number;

  @ApiProperty({ required: false, description: '当前分页(前端别名 page)' })
  @IsOptional()
  page?: string;

  @ApiProperty({ required: false, description: '每页数量(前端别名 limit)' })
  @IsOptional()
  limit?: string;

  @ApiProperty({ required: false, description: '时间范围' })
  @IsOptional()
  @IsObject()
  params?: DateParamsDTO;

  @ApiProperty({ required: false, description: '排序字段' })
  @IsOptional()
  @IsString()
  orderByColumn?: string;

  @ApiProperty({ required: false, description: '排序规则' })
  @IsOptional()
  @IsEnum(SortRuleEnum)
  isAsc?: string;
}
