import { IsOptional, IsString } from 'class-validator';

export class MindSettingListDto {
  @IsOptional()
  @IsString()
  source?: string;
}

/** content 为 JSON 动态字段，须显式声明否则全局 whitelist 会剥掉 */
export class MindSettingSaveDto {
  @IsString()
  source: string;

  @IsOptional()
  @IsString()
  sourceId?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  baseUrl?: string;

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsOptional()
  @IsString()
  temperature?: string;

  @IsOptional()
  @IsString()
  dimensions?: string;

  @IsOptional()
  @IsString()
  topK?: string;

  @IsOptional()
  @IsString()
  chunkSize?: string;

  @IsOptional()
  @IsString()
  chunkOverlap?: string;

  @IsOptional()
  @IsString()
  distance?: string;

  @IsOptional()
  @IsString()
  hybrid?: string;

  @IsOptional()
  @IsString()
  combine?: string;

  @IsOptional()
  @IsString()
  graph?: string;

  @IsOptional()
  @IsString()
  method?: string;

  @IsOptional()
  @IsString()
  maxIterations?: string;

  @IsOptional()
  @IsString()
  windowSize?: string;
}
