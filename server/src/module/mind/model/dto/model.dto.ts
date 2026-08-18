import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { MIND_MODEL_SOURCES, MIND_MODEL_TYPES } from '../model.constants';

export class MindModelPageDto {
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
  model_name?: string;

  @IsOptional()
  @IsString()
  display_name?: string;

  @IsOptional()
  @IsString()
  model_id?: string;

  @IsOptional()
  @IsIn([...MIND_MODEL_TYPES])
  type?: string;

  @IsOptional()
  @IsIn([...MIND_MODEL_SOURCES])
  source?: string;
}

export class MindModelCreateDto {
  @IsString()
  model_name: string;

  @IsOptional()
  @IsString()
  base_url?: string;

  @IsOptional()
  @IsString()
  api_key?: string;

  @IsIn([...MIND_MODEL_TYPES])
  type: string;

  @IsIn([...MIND_MODEL_SOURCES])
  source: string;
}

export class MindModelUpdateDto {
  @IsString()
  id: string;

  @IsOptional()
  @IsString()
  model_name?: string;

  @IsOptional()
  @IsString()
  base_url?: string;

  @IsOptional()
  @IsString()
  api_key?: string;

  @IsOptional()
  @IsIn([...MIND_MODEL_TYPES])
  type?: string;

  @IsOptional()
  @IsIn([...MIND_MODEL_SOURCES])
  source?: string;
}

export class MindModelDeleteDto {
  @IsString()
  ids: string;
}
