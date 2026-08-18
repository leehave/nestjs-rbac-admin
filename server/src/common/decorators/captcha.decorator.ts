import { Inject } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { CacheEnum } from '../enum/index';
import { paramsKeyGetObj } from '../utils/decorator';
import { ResultData } from '../utils/result';

/**
 * @Captcha — 验证码校验装饰器。
 * 在方法执行前校验验证码是否正确。
 */
export function Captcha(CACHE_KEY: string) {
  const injectRedis = Inject(RedisService);

  return function (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
    injectRedis(_target, 'redisService');

    const originMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const user = paramsKeyGetObj(originMethod, CACHE_KEY, args);
      const code = await (this as any).redisService.get(CacheEnum.CAPTCHA_CODE_KEY + user.uuid);

      if (!user.code) return ResultData.fail(500, '请输入验证码');
      if (!code) return ResultData.fail(500, '验证码已过期');
      if (code !== user.code) return ResultData.fail(500, '验证码错误');

      return await originMethod.apply(this, args);
    };
  };
}
