import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailLogService } from './email-log.service';
import { EmailLogController } from './email-log.controller';
import { EmailLogEntity } from './entities/email-log.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([EmailLogEntity])],
  controllers: [EmailLogController],
  providers: [EmailLogService],
  exports: [EmailLogService],
})
export class EmailLogModule {}
