import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, Injectable } from '@nestjs/common';
import { RedisService } from '../../../redis/redis.service';
import { CacheEnum } from '../../../common/enum/index';

@Injectable()
export class AuthStrategy extends PassportStrategy(Strategy) {
  /**
   * 认证策略构造函数
   * @param config - 配置服务，用于获取 JWT 密钥配置
   * @param redisService - Redis 服务，用于校验登录凭证及缓存中的用户信息
   */
  constructor(
    private readonly config: ConfigService,
    private readonly redisService: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get('jwt.secret') || config.get('jwt.secretkey') || 'default_secret',
    });
  }

  async validate(payload: { uuid: string; userId: string; iat: Date }) {
    const user = await this.redisService.get(`${CacheEnum.LOGIN_TOKEN_KEY}${payload.uuid}`);
    if (!user) throw new UnauthorizedException('登录已过期，请重新登录');
    return user;
  }
}
