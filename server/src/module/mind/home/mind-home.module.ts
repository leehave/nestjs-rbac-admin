import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LoginLogEntity } from '../../monitor/loginlog/entities/loginlog.entity';
import { UserEntity } from '../../system/user/entities/sys-user.entity';
import { SysUserTenantEntity } from '../../system/user/entities/user-tenant.entity';
import { MindHistoryRecordEntity } from '../history/entities/mind-history-record.entity';
import { MindMemoryDetailEntity } from '../history/entities/mind-memory-detail.entity';
import { MindSystemModelEntity } from '../model/entities/mind-system-model.entity';
import { MindHomeController } from './mind-home.controller';
import { MindHomeService } from './mind-home.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      SysUserTenantEntity,
      MindSystemModelEntity,
      MindHistoryRecordEntity,
      MindMemoryDetailEntity,
      LoginLogEntity,
    ]),
  ],
  controllers: [MindHomeController],
  providers: [MindHomeService],
})
export class MindHomeModule {}

