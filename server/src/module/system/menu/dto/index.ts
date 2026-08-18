import { IsString, IsNumber, IsOptional, Length } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { PagingDto } from '../../../../common/dto/index';
import type { Type } from '@nestjs/common';

export class CreateMenuDto {
  @ApiProperty({ required: true })
  @IsString()
  @Length(0, 50)
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 50)
  code?: string;

  @ApiProperty({ required: true })
  @IsOptional()
  @IsNumber()
  parent_id: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  sort: number;

  @ApiProperty({ required: true })
  @IsNumber()
  type: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 200)
  path?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  component?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 100)
  icon?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  is_iframe?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  is_keep_alive?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  is_hidden?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  is_fixed_tab?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  is_full_page?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  link_url?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 100)
  slug?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  status?: number;

  @ApiProperty({ required: false, description: '是否开启数据权限：1是 0否' })
  @IsOptional()
  @IsNumber()
  is_data_permission?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  remark?: string;
}

export class UpdateMenuDto extends PartialType(CreateMenuDto) {
  @ApiProperty({ required: true })
  @IsNumber()
  id: number;
}

export class ListMenuDto extends PagingDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  path?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return Number(value);
  })
  @IsNumber()
  status?: number;
}
