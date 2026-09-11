import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class ChunkFileDto {
  @ApiProperty({ type: 'number' })
  index: number;

  @ApiProperty({ type: 'number' })
  totalChunks: number;

  @ApiProperty({ type: 'string' })
  uploadId: string;

  @ApiProperty({ type: 'string' })
  fileName: string;
}

export class ChunkMergeFileDto {
  @ApiProperty({ type: 'string' })
  uploadId: string;

  @ApiProperty({ type: 'string' })
  fileName: string;
}
