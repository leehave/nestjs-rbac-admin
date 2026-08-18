import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import { pathToRegexp } from 'path-to-regexp';

/**
 * 调试模式守卫
 *
 * 当 app.debug = true  时：放行所有请求（正常开发/生产模式）
 * 当 app.debug = false 时：禁止 POST / PUT / DELETE / PATCH 写操作，
 *                          仅允许 GET 请求及白名单内的写操作 URL。
 *
 * 白名单统一读取 perm.router.whitelist（configuration.ts）。
 *
 * 适用于演示环境或只读部署场景。
 */
@Injectable()
export class DebugGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  /**
   * 调试模式守卫核心逻辑。
   * `app.debug = true` 时放行所有请求；`app.debug = false` 时仅允许 GET/HEAD/OPTIONS 及白名单中的写操作。
   * 不满足条件时抛出 ForbiddenException。
   */
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const debug = this.config.get<boolean>('app.debug');

    // debug = true：放行所有请求
    if (debug !== false) {
      return true;
    }

    // debug = false：只读模式
    const request = context.switchToHttp().getRequest();
    const method = request.method?.toUpperCase() || 'GET';

    // GET / HEAD / OPTIONS 为安全方法，永远放行
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return true;
    }

    // 非安全方法（POST / PUT / DELETE / PATCH）：检查白名单
    const whitelist = this.config.get<{ path: string; method: string }[]>('perm.router.whitelist') || [];
    const url: string = request.route?.path || request.url || '';

    const matchWhitelist = whitelist.some((item) => {
      if (item.method?.toUpperCase() !== method) return false;
      try {
        const matchResult: any = pathToRegexp(item.path);
        const regex: RegExp = matchResult.regexp ?? matchResult;
        return regex.exec(url) !== null;
      } catch {
        return url === item.path;
      }
    });

    if (matchWhitelist) {
      return true;
    }

    throw new ForbiddenException('系统当前为只读模式，禁止写操作');
  }
}
