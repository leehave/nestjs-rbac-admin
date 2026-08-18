import { IsString, IsNumber, IsOptional, Length, IsArray } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { PagingDto } from '../../../../common/dto/index';
import type { Type } from '@nestjs/common';

// ──── Dict Type DTOs ────

export class CreateDictTypeDto {
  @ApiProperty({ required: true })
  @IsString()
  @Length(0, 100)
  name: string;

  @ApiProperty({ required: true })
  @IsString()
  @Length(0, 100)
  code: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  status?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  remark?: string;
}

export class UpdateDictTypeDto extends PartialType(CreateDictTypeDto) {
  @IsNumber()
  id: number;
}

export class ListDictTypeDto extends PagingDto {
  @IsOptional()
  @IsString()
  @Length(0, 100)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  code?: string;

  @IsOptional()
  @IsNumber()
  status?: number;
}

// ──── Dict Data DTOs ────

export class CreateDictDataDto {
  @IsNumber()
  type_id: number;

  @IsString()
  @Length(0, 100)
  label: string;

  @IsString()
  @Length(0, 100)
  value: string;

  @IsOptional()
  @IsString()
  @Length(0, 50)
  color?: string;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  code?: string;

  @IsOptional()
  @IsNumber()
  sort?: number;

  @IsOptional()
  @IsNumber()
  status?: number;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  remark?: string;
}

export class UpdateDictDataDto extends PartialType(CreateDictDataDto) {
  @IsNumber()
  id: number;
}

export class ListDictDataDto extends PagingDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return Number(value);
  })
  @IsNumber()
  type_id?: number;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  label?: string;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  value?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return Number(value);
  })
  @IsNumber()
  status?: number;
}
