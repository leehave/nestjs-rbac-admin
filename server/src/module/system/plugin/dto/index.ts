import { IsString, IsNumber, IsOptional, Length } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { PagingDto } from '../../../../common/dto/index';

export class CreatePluginDto {
  @ApiProperty({ required: true })
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiProperty({ required: true })
  @IsString()
  @Length(1, 200)
  title: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: true })
  @IsString()
  @Length(1, 20)
  version: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 100)
  author?: string;
}

export class UpdatePluginConfigDto {
  @ApiProperty({ required: true })
  @IsString()
  config: string;
}

export class ListPluginDto extends PagingDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  status?: number;
}
