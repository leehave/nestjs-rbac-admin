import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OperlogService } from './operlog.service';
import { OperlogController } from './operlog.controller';
import { OperLogEntity } from './entities/operlog.entity';
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([OperLogEntity])],
  controllers: [OperlogController],
  providers: [OperlogService],
  exports: [OperlogService],
})
export class OperlogModule {}
