import { Module } from '@nestjs/common';

import { MindCommonModule } from './common/mind-common.module';
import { MindHomeModule } from './home/mind-home.module';
import { MindUserModule } from './user/mind-user.module';
import { MindModelModule } from './model/mind-model.module';
import { MindSettingModule } from './setting/mind-setting.module';
import { MindHistoryModule } from './history/mind-history.module';
import { MindDocumentModule } from './document/mind-document.module';
import { MindLlmModule } from './llm/mind-llm.module';
import { MindVectorModule } from './vector/mind-vector.module';
import { MindRetrievalModule } from './retrieval/mind-retrieval.module';
import { MindGraphModule } from './graph/mind-graph.module';
import { MindAgentModule } from './agent/mind-agent.module';
import { MindModalModule } from './modal/mind-modal.module';
import { MindAgenticModule } from './agentic/mind-agentic.module';

@Module({
  imports: [
    MindCommonModule,
    MindHomeModule,
    MindUserModule,
    MindModelModule,
    MindSettingModule,
    MindHistoryModule,
    MindDocumentModule,
    MindLlmModule,
    MindVectorModule,
    MindGraphModule,
    MindRetrievalModule,
    MindAgentModule,
    MindModalModule,
    MindAgenticModule,
  ],
})
export class MindModule {}
