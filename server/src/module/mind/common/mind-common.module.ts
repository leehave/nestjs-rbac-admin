import { Module } from '@nestjs/common';

import { MindCommonController } from './mind-common.controller';
import { MindCommonService } from './mind-common.service';

@Module({
  controllers: [MindCommonController],
  providers: [MindCommonService],
})
export class MindCommonModule {}

