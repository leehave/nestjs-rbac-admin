import { Module } from '@nestjs/common';
import { MindLlmModule } from '../llm/mind-llm.module';
import { MindVectorModule } from '../vector/mind-vector.module';
import { MindHistoryModule } from '../history/mind-history.module';
import { MindAgenticModule } from '../agentic/mind-agentic.module';
import { MindAgentController } from './mind-agent.controller';
import { MindAgentService } from './mind-agent.service';

@Module({
  imports: [MindLlmModule, MindVectorModule, MindHistoryModule, MindAgenticModule],
  controllers: [MindAgentController],
  providers: [MindAgentService],
  exports: [MindAgentService],
})
export class MindAgentModule {}

