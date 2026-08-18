import { Module } from '@nestjs/common';
import { MindLlmModule } from '../llm/mind-llm.module';
import { MindVectorService } from './mind-vector.service';

@Module({
  imports: [MindLlmModule],
  providers: [MindVectorService],
  exports: [MindVectorService],
})
export class MindVectorModule {}

