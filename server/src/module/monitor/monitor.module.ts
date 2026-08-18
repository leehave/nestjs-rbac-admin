import { Module, Global } from '@nestjs/common';
import { JobModule } from './job/job.module';
import { ServerModule } from './server/server.module';
import { CacheModule } from './cache/cache.module';
import { LoginlogModule } from './loginlog/loginlog.module';
import { OnlineModule } from './online/online.module';
import { OperlogModule } from './operlog/operlog.module';
import { DatabaseModule } from './database/database.module';
import { EmailLogModule } from './email-log/email-log.module';
import { RedisMonitorModule } from './redis/redis-monitor.module';
import { MemoryMonitorService } from './memory/memory-monitor.service';
import { MemoryMonitorController } from './memory/memory-monitor.controller';

@Global()
@Module({
  imports: [JobModule, ServerModule, CacheModule, LoginlogModule, OnlineModule, OperlogModule, EmailLogModule, DatabaseModule, RedisMonitorModule],
  controllers: [MemoryMonitorController],
  providers: [MemoryMonitorService],
  exports: [MemoryMonitorService, JobModule],
})
export class MonitorModule {}
