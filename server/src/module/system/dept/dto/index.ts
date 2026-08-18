import { IsString, IsNumber, IsOptional, IsEmail, Min, Length } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { PagingDto } from '../../../../common/dto/index';
import type { Type } from '@nestjs/common';

export class CreateDeptDto {
  @ApiProperty({ required: true })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  parent_id: number;

  @ApiProperty({ required: true })
  @IsString()
  @Length(0, 30)
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 100)
  code?: string;

  @ApiProperty({ required: true })
  @IsNumber()
  @Min(0)
  sort: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return null;
    return Number(value);
  })
  @IsNumber()
  leader_id?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 11)
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsEmail()
  email?: string;

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

export class UpdateDeptDto extends PartialType(CreateDeptDto) {
  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return Number(value);
  })
  @IsNumber()
  id: number;
}

export class ListDeptDto extends PagingDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return Number(value);
  })
  @IsNumber()
  status?: number;
}
