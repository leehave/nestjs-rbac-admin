import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MindHistoryRecordEntity } from './entities/mind-history-record.entity';
import { MindMemoryDetailEntity } from './entities/mind-memory-detail.entity';
import { MindHistoryController } from './mind-history.controller';
import { MindHistoryService } from './mind-history.service';

@Module({
  imports: [TypeOrmModule.forFeature([MindHistoryRecordEntity, MindMemoryDetailEntity])],
  controllers: [MindHistoryController],
  providers: [MindHistoryService],
  exports: [MindHistoryService],
})
export class MindHistoryModule {}

