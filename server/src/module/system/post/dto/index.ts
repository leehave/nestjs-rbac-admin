import { IsString, IsNumber, IsOptional, Length } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { PagingDto } from '../../../../common/dto/index';
import type { Type } from '@nestjs/common';

export class CreatePostDto {
  @IsString()
  @Length(0, 50)
  name: string;

  @IsString()
  @Length(0, 64)
  code: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  sort?: number;

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

export class UpdatePostDto extends PartialType(CreatePostDto) {
  @ApiProperty({ required: true })
  @IsNumber()
  id: number;
}

export class ListPostDto extends PagingDto {
  @IsOptional()
  @IsString()
  @Length(0, 50)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 64)
  code?: string;

  @IsOptional()
  @IsNumber()
  status?: number;
}
