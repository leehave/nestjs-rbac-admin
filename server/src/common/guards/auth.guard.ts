import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { pathToRegexp } from 'path-to-regexp';
import {
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { UserService } from '../../module/system/user/user.service';
import { IS_PUBLIC_KEY } from '../constant/index';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private globalWhiteList: any[] = [];

  constructor(
    private readonly reflector: Reflector,
    @Inject(UserService)
    private readonly userService: UserService,
    private readonly config: ConfigService,
  ) {
    super();
    this.globalWhiteList = [].concat(this.config.get('perm.router.whitelist') || []);
  }

  /**
   * JWT 认证守卫核心逻辑。
   * 按优先级依次检查：@NotRequireAuth 装饰器 → 公开路由 → 白名单 → AccessToken 有效性 → 用户状态。
   * 通过后将用户会话注入 `req.user`。
   */
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    // 检查 @NotRequireAuth 装饰器
    const notRequireAuth = this.reflector.getAllAndOverride('notRequireAuth', [
      ctx.getClass(),
      ctx.getHandler(),
    ]);
    if (notRequireAuth) {
      await this.jumpActivate(ctx);
      return true;
    }
	
    const isPublic =
      Reflect.getMetadata(IS_PUBLIC_KEY, ctx.getHandler()) ||
      Reflect.getMetadata(IS_PUBLIC_KEY, ctx.getClass());

    if (isPublic) {
      return true;
    }

    // 检查白名单
    const isInWhiteList = this.checkWhiteList(ctx);
    if (isInWhiteList) {
      await this.jumpActivate(ctx);
      return true;
    }

    const req = ctx.switchToHttp().getRequest();
    const accessToken = req.get('Authorization');

    if (!accessToken) throw new ForbiddenException('请重新登录');

    const session = await this.userService.getSessionByAccessToken(accessToken);
    if (!session) throw new UnauthorizedException('登录已过期，请重新登录');

    const u = session.user;
    if (!u) throw new ForbiddenException('用户不存在');
    if (u.deleteTime) throw new ForbiddenException('用户不存在');
    if (Number(u.status) === 0) throw new ForbiddenException('用户已停用，请联系管理员');

    req.user = session;
    return true;
  }

  /** 跳过认证，仅将用户信息注入请求 */
  private async jumpActivate(ctx: ExecutionContext): Promise<void> {
    const req = ctx.switchToHttp().getRequest();
    const accessToken = req.get('Authorization');

    if (accessToken) {
      try {
        const session = await this.userService.getSessionByAccessToken(accessToken);
        if (session?.user) {
          req.user = session;
        }
      } catch {
        // token 无效时不阻断
      }
    }
  }

  /** 检查当前请求是否在白名单中 */
  private checkWhiteList(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const path = req.route?.path || req.path;
    const method = req.method.toUpperCase();

    return this.globalWhiteList.some((item: any) => {
      const result = pathToRegexp(item.path, { sensitive: true });
      return result.regexp.test(path) && item.method === method;
    });
  }
}
