import { Inject } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { paramsKeyFormat } from '../utils/decorator';

/**
 * @Cacheable — 缓存装饰器。
 * 方法执行前查询缓存，命中则直接返回，未命中则执行并写入缓存。
 */
export function Cacheable(CACHE_NAME: string, CACHE_KEY: string, CACHE_EXPIRESIN?: number) {
  const injectRedis = Inject(RedisService);

  return function (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
    injectRedis(_target, 'redis');

    const originMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const key = paramsKeyFormat(originMethod, CACHE_KEY, args);

      if (key === null) {
        return await originMethod.apply(this, args);
      }

      const cacheResult = await (this as any).redis.get(`${CACHE_NAME}${key}`);

      if (cacheResult === null || cacheResult === undefined) {
        const result = await originMethod.apply(this, args);
        await (this as any).redis.set(`${CACHE_NAME}${key}`, result, CACHE_EXPIRESIN);
        return result;
      }

      return cacheResult;
    };
  };
}

/**
 * @CacheEvict — 缓存清除装饰器。
 * 方法执行前清除指定缓存。
 */
export function CacheEvict(CACHE_NAME: string, CACHE_KEY: string) {
  const injectRedis = Inject(RedisService);

  return function (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
    injectRedis(_target, 'redis');

    const originMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const key = paramsKeyFormat(originMethod, CACHE_KEY, args);

      if (key === '*') {
        const res = await (this as any).redis.keys(`${CACHE_NAME}*`);
        if (res.length) await (this as any).redis.del(res);
      } else if (key !== null) {
        await (this as any).redis.del(`${CACHE_NAME}${key}`);
      } else {
        await (this as any).redis.del(`${CACHE_NAME}${CACHE_KEY}`);
      }

      return await originMethod.apply(this, args);
    };
  };
}
