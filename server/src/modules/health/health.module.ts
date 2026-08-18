import { Module } from '@nestjs/common';

import { RedisModule } from '../../redis/redis.module';
import { HealthApiVerifier } from './health.api-verifier';
import { HealthController } from './health.controller';

@Module({
  imports: [RedisModule],
  controllers: [HealthController],
  providers: [HealthApiVerifier],
})
export class HealthModule {}
