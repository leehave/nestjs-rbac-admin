import { IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class MindUserPageDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  current_page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page_size?: number;

  @IsOptional()
  @IsString()
  userName?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  createTime?: string;
}

export class MindUserCreateDto {
  @IsOptional()
  @IsString()
  user_name?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  phone_number?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  resume?: string;

  @IsOptional()
  @IsString()
  photo?: string;
}

export class MindUserUpdateDto extends MindUserCreateDto {
  @IsString()
  id: string;
}

export class MindUserDeleteDto {
  @IsString()
  ids: string;
}

export class MindUserSelectDto {
  @IsOptional()
  @IsString()
  user_name?: string;

  @IsOptional()
  @IsString()
  password?: string;
}

