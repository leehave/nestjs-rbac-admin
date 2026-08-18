import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class MindHistoryRecordListDto {
  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  pattern?: string;

  @IsOptional()
  @IsString()
  library?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  current_page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page_size?: number;
}

export class MindHistoryRecordUpdateDto {
  @IsString()
  id: string;

  @IsString()
  name: string;
}

export class MindHistoryRecordDeleteDto {
  @IsString()
  ids: string;
}

export class MindHistoryRecordUpdateModelsDto {
  @IsString()
  id: string;

  @IsOptional()
  @IsString()
  chat_model_id?: string;
}

export class MindMemoryDetailListDto {
  @IsOptional()
  @IsString()
  source_id?: string;
}

export class MindMemoryDetailDownloadDto {
  @IsString()
  source_id: string;
}
