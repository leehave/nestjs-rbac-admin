import { IsString, IsOptional, IsNumber, Length } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { PagingDto } from '../../../../common/dto/index';

export class CreateArticleCategoryDto {
  @ApiProperty({ required: true, description: '分类名称' })
  @IsString()
  @Length(1, 50)
  name: string;

  @ApiProperty({ required: false, description: '排序' })
  @IsOptional()
  @IsNumber()
  sort?: number;

  @ApiProperty({ required: false, description: '状态（1启用 0禁用）' })
  @IsOptional()
  @IsNumber()
  status?: number;

  @ApiProperty({ required: false, description: '备注' })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  remark?: string;
}

export class UpdateArticleCategoryDto extends PartialType(CreateArticleCategoryDto) {
  @ApiProperty({ required: true, description: '分类ID' })
  @IsNumber()
  id: number;
}

export class ListArticleCategoryDto extends PagingDto {
  @ApiProperty({ required: false, description: '分类名称' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false, description: '状态' })
  @IsOptional()
  @Transform(({ value }) =>
    value === '' || value === null || value === undefined ? undefined : Number(value),
  )
  @IsNumber()
  status?: number;
}
