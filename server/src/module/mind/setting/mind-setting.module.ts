import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MindSystemSettingEntity } from './entities/mind-system-setting.entity';
import { MindSettingController } from './mind-setting.controller';
import { MindSettingService } from './mind-setting.service';

@Module({
  imports: [TypeOrmModule.forFeature([MindSystemSettingEntity])],
  controllers: [MindSettingController],
  providers: [MindSettingService],
  exports: [MindSettingService],
})
export class MindSettingModule {}

