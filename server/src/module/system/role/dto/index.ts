import { IsString, IsArray, IsNumber, IsOptional, Length } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { PagingDto } from '../../../../common/dto/index';
import type { Type } from '@nestjs/common';

export class CreateRoleDto {
  @ApiProperty({ required: true })
  @IsString()
  @Length(0, 30)
  name: string;

  @ApiProperty({ required: true })
  @IsString()
  @Length(0, 100)
  code: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  sort?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  level?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  data_scope?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  status?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  remark?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (!Array.isArray(value)) return value;
    return value.map((item) => Number(item));
  })
  @IsArray()
  menu_ids?: number[];

  @IsOptional()
  @Transform(({ value }) => {
    if (!Array.isArray(value)) return value;
    return value.map((item) => Number(item));
  })
  @IsArray()
  dept_ids?: number[];

  @ApiProperty({ required: false, description: '菜单数据权限阈值列表：menu_id + filter_type(0仅自己 1自己和下属 2无)' })
  @IsOptional()
  @IsArray()
  menu_filters?: Array<{ menu_id: number; filter_type: number }>;
}

export class UpdateRoleDto extends PartialType(CreateRoleDto) {
  @ApiProperty({ required: true })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  id: number;
}

export class ChangeRoleStatusDto {
  @ApiProperty({ required: true })
  @IsNumber()
  id: number;

  @ApiProperty({ required: true })
  @IsNumber()
  status: number;
}

export class ListRoleDto extends PagingDto {
  @IsOptional()
  @IsString()
  @Length(0, 30)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  code?: string;

  @IsOptional()
  @IsNumber()
  status?: number;
}

export class AuthUserCancelDto {
  @ApiProperty({ required: true })
  @IsNumber()
  role_id: number;

  @ApiProperty({ required: true })
  @IsNumber()
  user_id: number;
}

export class AuthUserCancelAllDto {
  @ApiProperty({ required: true })
  @IsNumber()
  role_id: number;

  @ApiProperty({ required: true })
  @IsString()
  user_ids: string;
}

export class AuthUserSelectAllDto {
  @ApiProperty({ required: true })
  @IsNumber()
  role_id: number;

  @ApiProperty({ required: true })
  @IsString()
  user_ids: string;
}
