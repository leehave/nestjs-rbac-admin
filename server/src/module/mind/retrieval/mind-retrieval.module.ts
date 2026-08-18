import { Module } from '@nestjs/common';
import { MindLlmModule } from '../llm/mind-llm.module';
import { MindVectorModule } from '../vector/mind-vector.module';
import { MindGraphModule } from '../graph/mind-graph.module';
import { MindHistoryModule } from '../history/mind-history.module';
import { MindAgenticModule } from '../agentic/mind-agentic.module';
import { MindDocumentModule } from '../document/mind-document.module';
import { MindRetrievalController } from './mind-retrieval.controller';
import { MindRetrievalService } from './mind-retrieval.service';
import { MindRagGraphService } from './mind-rag-graph.service';

@Module({
  imports: [MindLlmModule, MindVectorModule, MindGraphModule, MindHistoryModule, MindAgenticModule, MindDocumentModule],
  controllers: [MindRetrievalController],
  providers: [MindRetrievalService, MindRagGraphService],
  exports: [MindRetrievalService],
})
export class MindRetrievalModule {}
