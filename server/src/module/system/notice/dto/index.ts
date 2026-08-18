import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateNoticeDto {
  @ApiProperty({ description: '公告标题' })
  @IsString()
  title: string;

  @ApiProperty({ description: '公告类型（0通知 1公告）' })
  @IsOptional()
  @Type(() => Number)
  type?: number;

  @ApiProperty({ description: '公告内容' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({ description: '状态' })
  @IsOptional()
  @Type(() => Number)
  status?: number;

  @ApiProperty({ description: '备注' })
  @IsOptional()
  @IsString()
  remark?: string;
}

export class UpdateNoticeDto extends CreateNoticeDto {
  @ApiProperty({ description: '公告ID' })
  @IsNumber()
  id: number;
}

export class ListNoticeDto {
  @ApiProperty({ description: '公告标题', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: '公告类型', required: false })
  @IsOptional()
  @Type(() => Number)
  type?: number;

  @ApiProperty({ description: '创建者', required: false })
  @IsOptional()
  @IsString()
  createBy?: string;

  @ApiProperty({ description: '状态', required: false })
  @IsOptional()
  @Type(() => Number)
  status?: number;

  @ApiProperty({ description: '页码', required: false })
  @IsOptional()
  @Type(() => Number)
  pageNum?: number;

  @ApiProperty({ description: '每页条数', required: false })
  @IsOptional()
  @Type(() => Number)
  pageSize?: number;
}
