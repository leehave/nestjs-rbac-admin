import { IsString, IsNumber, IsOptional, Length } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { PagingDto } from '../../../../common/dto/index';
import type { Type } from '@nestjs/common';

export class CreateConfigDto {
  @IsOptional()
  @IsNumber()
  group_id?: number;

  @IsString()
  @Length(0, 100)
  key: string;

  @IsString()
  @Length(0, 500)
  value: string;

  @IsString()
  @Length(0, 100)
  name: string;

  @IsOptional()
  @IsString()
  input_type?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  config_select_data?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  sort?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  remark?: string;
}

export class UpdateConfigDto extends PartialType(CreateConfigDto) {
  @IsNumber()
  id: number;
}

export class ListConfigDto extends PagingDto {
  @IsOptional()
  @IsString()
  @Length(0, 100)
  key?: string;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  name?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return Number(value);
  })
  @IsNumber()
  group_id?: number;
}

export class ListConfigGroupDto extends PagingDto {
  @IsOptional()
  @IsString()
  @Length(0, 100)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  code?: string;
}
