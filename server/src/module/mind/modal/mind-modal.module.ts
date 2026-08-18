import { Module } from '@nestjs/common';
import { MindHistoryModule } from '../history/mind-history.module';
import { MindLlmModule } from '../llm/mind-llm.module';
import { MindModalCompatController } from './mind-modal.compat.controller';
import { MindModalController } from './mind-modal.controller';
import { MindModalService } from './mind-modal.service';

@Module({
  imports: [MindLlmModule, MindHistoryModule],
  controllers: [MindModalController, MindModalCompatController],
  providers: [MindModalService],
  exports: [MindModalService],
})
export class MindModalModule {}

