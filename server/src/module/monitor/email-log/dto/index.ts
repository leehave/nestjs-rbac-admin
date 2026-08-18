import { IsString, IsArray, IsOptional, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PagingDto } from '../../../../common/dto/index';

export class ListEmailLogDto extends PagingDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 128)
  to?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  subject?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  status?: string;
}
