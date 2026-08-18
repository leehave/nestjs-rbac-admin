import { Inject } from '@nestjs/common';
import { RedisService } from '../redis.service';
import { paramsKeyFormat } from './decorator.util';

/**
 * 缓存清除装饰器。
 * 在方法执行前清除指定缓存键。
 *
 * @param CACHE_NAME 缓存名称前缀
 * @param CACHE_KEY  缓存键模板，支持 {paramName} 占位符
 *
 * @example
 * ```ts
 * @CacheEvict('user:', '{id}')
 * async updateUser(id: number, data: UpdateUserDto) { ... }
 * ```
 */
export function CacheEvict(CACHE_NAME: string, CACHE_KEY: string) {
  const injectRedis = Inject(RedisService);

  return function (_target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    injectRedis(_target, 'redis');

    const originMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const key = paramsKeyFormat(originMethod, CACHE_KEY, args);

      if (key === '*') {
        const res = await (this as any).redis.keys(`${CACHE_NAME}*`);
        if (res.length) {
          await (this as any).redis.del(res);
        }
      } else if (key !== null) {
        await (this as any).redis.del(`${CACHE_NAME}${key}`);
      } else {
        await (this as any).redis.del(`${CACHE_NAME}${CACHE_KEY}`);
      }

      return await originMethod.apply(this, args);
    };
  };
}

/**
 * 缓存装饰器。
 * 在方法执行前查询缓存，命中则直接返回；未命中则执行方法并将结果写入缓存。
 *
 * @param CACHE_NAME      缓存名称前缀
 * @param CACHE_KEY       缓存键模板，支持 {paramName} 占位符
 * @param CACHE_EXPIRESIN 过期时间（毫秒），不传则永不过期
 *
 * @example
 * ```ts
 * @Cacheable('user:', '{id}', 3600000)
 * async getUser(id: number) { ... }
 * ```
 */
export function Cacheable(CACHE_NAME: string, CACHE_KEY: string, CACHE_EXPIRESIN?: number) {
  const injectRedis = Inject(RedisService);

  return function (_target: any, propertyKey: string, descriptor: PropertyDescriptor) {
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
