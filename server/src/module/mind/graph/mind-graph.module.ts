import { Module } from '@nestjs/common';
import { MindGraphService } from './mind-graph.service';

@Module({
  providers: [MindGraphService],
  exports: [MindGraphService],
})
export class MindGraphModule {}

