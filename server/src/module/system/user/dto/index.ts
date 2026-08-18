import { IsString, IsArray, IsNumber, IsOptional, IsEmail, Length, IsEnum } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { PagingDto } from '../../../../common/dto/index';
import type { Type } from '@nestjs/common';

export class CreateUserDto {
  @ApiProperty({ required: true })
  @IsString()
  @Length(0, 30)
  username: string;

  @ApiProperty({ required: true })
  @IsString()
  @Length(0, 30)
  realname: string;

  @ApiProperty({ required: true })
  @IsString()
  @Length(0, 200)
  password: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  @Length(0, 50)
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 20)
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return Number(value);
  })
  @IsNumber()
  dept_id?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (!Array.isArray(value)) return value;
    return value.map((item) => Number(item));
  })
  @IsArray()
  post_ids?: number[];

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (!Array.isArray(value)) return value;
    return value.map((item) => Number(item));
  })
  @IsArray()
  role_ids?: number[];

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return Number(value);
  })
  @IsNumber()
  status?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  remark?: string;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiProperty({ required: true })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  id: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  password_confirm?: string;
}

export class ChangeStatusDto {
  @ApiProperty({ required: true })
  @IsNumber()
  id: number;

  @ApiProperty({ required: true })
  @IsNumber()
  status: number;
}

export class ListUserDto extends PagingDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 30)
  username?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 30)
  realname?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 30)
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 20)
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return Number(value);
  })
  @IsNumber()
  dept_id?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    return Number(value);
  })
  @IsNumber()
  status?: number;
}

export class ResetPwdDto {
  @ApiProperty({ required: true })
  @IsNumber()
  id: number;

  @ApiProperty({ required: true })
  @IsString()
  @Length(5, 20)
  password: string;
}

export class AllocatedListDto extends PagingDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 30)
  username?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  role_id?: number;
}

export class UpdateProfileDto {
  @ApiProperty({ required: true })
  @IsOptional()
  @IsString()
  @Length(0, 30)
  realname: string;

  @ApiProperty({ required: true })
  @IsOptional()
  @IsEmail()
  @Length(0, 50)
  email: string;

  @ApiProperty({ required: true })
  @IsOptional()
  @IsString()
  phone: string;

  @ApiProperty({ required: true })
  @IsOptional()
  @IsString()
  gender: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  avatar?: string;
}

export class UpdatePwdDto {
  @ApiProperty({ required: true })
  @IsString()
  @Length(0, 200)
  oldPassword: string;

  @ApiProperty({ required: true })
  @IsString()
  @Length(0, 200)
  newPassword: string;
}

export class SetHomePageDto {
  @ApiProperty({ required: true })
  @IsNumber()
  id: number;

  @ApiProperty({ required: true })
  @IsString()
  dashboard: string;
}

export class ClearCacheDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  key?: string;
}
