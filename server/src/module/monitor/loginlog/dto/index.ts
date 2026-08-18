import { IsString, IsArray, IsNumber, IsOptional, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PagingDto } from '../../../../common/dto/index';

export class ListLoginLogDto extends PagingDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 50)
  username?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 128)
  ip?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  status?: number;
}

export class CreateLoginlogDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ipaddr?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  userName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  loginLocation?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  browser?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  os?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  msg?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  status?: string;
}

export class DeleteLoginLogDto {
  @ApiProperty({ required: true })
  @IsArray()
  @IsNumber({}, { each: true })
  ids: number[];
}
