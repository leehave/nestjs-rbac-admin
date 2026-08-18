import { IsOptional, IsString } from 'class-validator';

export class MindImageGenerateDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsString()
  format?: string;
}

