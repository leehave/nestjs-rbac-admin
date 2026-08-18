import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '../../../redis/redis.module';
import { MindSystemDocumentEntity } from './entities/mind-system-document.entity';
import { MindDocumentController } from './mind-document.controller';
import { MindDocumentService } from './mind-document.service';
import { MindDocumentIndexTracker } from './document-index-tracker.service';
import { MindDocumentIndexProcessorService } from './document-index-processor.service';
import { MindDocumentIndexQueueService } from './document-index-queue.service';
import { MindVectorModule } from '../vector/mind-vector.module';
import { MindLlmModule } from '../llm/mind-llm.module';
import { MindGraphModule } from '../graph/mind-graph.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MindSystemDocumentEntity]),
    RedisModule,
    MindLlmModule,
    MindVectorModule,
    MindGraphModule,
  ],
  controllers: [MindDocumentController],
  providers: [
    MindDocumentService,
    MindDocumentIndexTracker,
    MindDocumentIndexProcessorService,
    MindDocumentIndexQueueService,
  ],
  exports: [MindDocumentService],
})
export class MindDocumentModule {}
