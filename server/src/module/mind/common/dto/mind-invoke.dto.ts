import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

/** 对齐 mind 各 invoke 接口公共字段（llm setting + 请求体覆盖） */
export class MindInvokeBaseDto {
  @IsString()
  query: string;

  @IsOptional()
  @IsString()
  source_id?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  pattern?: string;

  @IsOptional()
  @IsString()
  library?: string;

  /** @deprecated 优先使用 model/type/baseUrl/apiKey */
  @IsOptional()
  @IsString()
  chat_model_id?: string;

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
  @Type(() => Number)
  @IsNumber()
  temperature?: number;

  // ── RAG 透传字段（默认取自 t_system_setting(source=rag)，请求体可覆盖）──
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
  weight?: string;

  @IsOptional()
  @IsString()
  graph?: string;

  @IsOptional()
  @IsString()
  method?: string;
}
