import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MindModelController } from './mind-model.controller';
import { MindModelService } from './mind-model.service';
import { MindSystemModelEntity } from './entities/mind-system-model.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MindSystemModelEntity])],
  controllers: [MindModelController],
  providers: [MindModelService],
  exports: [MindModelService],
})
export class MindModelModule {}

