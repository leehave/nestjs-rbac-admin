import { IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class MindChatDto {
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

  /** @deprecated 使用下方 llm 连接字段，与 t_system_setting(source=llm) 一致 */
  @IsOptional()
  @IsString()
  chat_model_id?: string;

  /** 对齐 mind LLM 设置 content */
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
}
