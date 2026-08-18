import { IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class MindDocumentPageDto {
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
  document_name?: string;

  @IsOptional()
  @IsString()
  document_type?: string;

  @IsOptional()
  @IsString()
  upload_time?: string;
}

export class MindDocumentDeleteDto extends MindDocumentPageDto {
  @IsString()
  ids: string;
}

export class MindDocumentWebsiteDto {
  @IsString()
  website: string;
}

export class MindDocumentPreviewDto {
  @IsString()
  documentName: string;

  @IsString()
  documentType: string;
}

export class MindDocumentDownloadDto {
  @IsString()
  documentName: string;
}

export class MindDocumentReindexDto {
  @IsString()
  ids: string;
}

export class MindDocumentIndexStatusDto {
  @IsString()
  ids: string;
}

