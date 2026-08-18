import { IsString, IsOptional, IsNumber, MinLength, MaxLength, Length, Min } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { PagingDto } from '../../../common/dto/index';
import type { Type } from '@nestjs/common';

export class ListArticleDto extends PagingDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  category_id?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  author?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  status?: number;
}

export class CreateArticleDto {
  @ApiProperty({ required: true, description: '文章标题' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiProperty({ required: true, description: '分类ID' })
  @IsNumber()
  category_id: number;

  @ApiProperty({ required: false, description: '作者' })
  @IsOptional()
  @IsString()
  author?: string;

  @ApiProperty({ required: false, description: '封面图片' })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiProperty({ required: true, description: '文章简介' })
  @IsString()
  @Length(1, 1000)
  describe: string;

  @ApiProperty({ required: false, description: '文章内容' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({ required: false, description: '是否外链（1是 2否）' })
  @IsOptional()
  @IsNumber()
  is_link?: number;

  @ApiProperty({ required: false, description: '外链地址' })
  @IsOptional()
  @IsString()
  link_url?: string;

  @ApiProperty({ required: false, description: '是否热门（1热门 2普通）' })
  @IsOptional()
  @IsNumber()
  is_hot?: number;

  @ApiProperty({ required: false, description: '排序' })
  @IsOptional()
  @IsNumber()
  sort?: number;

  @ApiProperty({ required: false, description: '状态（1启用 0禁用）' })
  @IsOptional()
  @IsNumber()
  status?: number;
}

export class UpdateArticleDto extends PartialType(CreateArticleDto) {
  @ApiProperty({ required: true, description: '文章ID' })
  @IsNumber()
  id: number;
}
