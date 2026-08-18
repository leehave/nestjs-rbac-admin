import { Module } from '@nestjs/common';
import { RedisController } from './redis.controller';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [CacheModule],
  controllers: [RedisController],
})
export class RedisMonitorModule {}
