import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MindSystemModelEntity } from '../model/entities/mind-system-model.entity';
import { MindHistoryRecordEntity } from '../history/entities/mind-history-record.entity';
import { MindSettingModule } from '../setting/mind-setting.module';
import { MindLlmService } from './mind-llm.service';
import { MindLlmRuntimeService } from './mind-llm-runtime.service';

@Module({
  imports: [TypeOrmModule.forFeature([MindSystemModelEntity, MindHistoryRecordEntity]), MindSettingModule],
  providers: [MindLlmService, MindLlmRuntimeService],
  exports: [MindLlmService, MindLlmRuntimeService],
})
export class MindLlmModule {}
