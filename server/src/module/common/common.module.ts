import { Module, Global } from '@nestjs/common';

import { RedisModule as AppRedisModule } from '../../redis/redis.module';
import { AxiosModule } from './axios/axios.module';

@Global()
@Module({
  imports: [AppRedisModule, AxiosModule],
  exports: [AppRedisModule, AxiosModule],
})
export class CommonModule {}
