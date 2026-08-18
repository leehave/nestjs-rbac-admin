import { IsString, IsNumber, IsOptional, Length } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { PagingDto } from '../../../../common/dto/index';
import type { Type } from '@nestjs/common';

export class CreateTenantDto {
  @ApiProperty({ required: true })
  @IsString()
  @Length(0, 100)
  tenantName: string;

  @ApiProperty({ required: true })
  @IsString()
  @Length(0, 50)
  tenantCode: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 50)
  contactName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 20)
  contactPhone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 100)
  contactEmail?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  status?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  expireTime?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  maxUsers?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  maxDepts?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  maxRoles?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  remark?: string;
}

export class UpdateTenantDto extends PartialType(CreateTenantDto) {
  @ApiProperty({ required: true })
  @IsNumber()
  id: number;
}

export class ListTenantDto extends PagingDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  tenantName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  tenantCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  status?: number;
}

export class TenantStatusDto {
  @ApiProperty({ required: true })
  @IsNumber()
  id: number;

  @ApiProperty({ required: true })
  @IsNumber()
  status: number;
}
