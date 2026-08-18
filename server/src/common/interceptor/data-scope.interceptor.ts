import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';

import { DataScopeContext } from '../data-scope/data-scope.context';
import { DataPermissionService } from '../../module/system/data-permission/data-permission.service';

/**
 * DataScopeInterceptor — 数据权限拦截器（等价 Camelus 的 PreMenuAspect）。
 * 对标注了 @DataScope(...) 的方法，解析当前用户的数据权限阈值，
 * 并将结果 userId 集合写入 DataScopeContext（AsyncLocalStorage）。
 */
@Injectable()
export class DataScopeInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly dataPermissionService: DataPermissionService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const slugs = this.reflector.getAllAndOverride<string[]>('dataScopeSlugs', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!slugs || slugs.length === 0) return next.handle();

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    return new Observable((subscriber) => {
      (async () => {
        try {
          const userId = Number(user?.userId ?? user?.user?.id ?? 0);
          const tenantId = user?.tenantId != null ? Number(user.tenantId) : undefined;
          const isSuper = user?.user?.isSuper === 1 || user?.permissions?.includes('*:*:*');

          let ids: Set<number> | null = null;
          if (userId && !isSuper) {
            let permission = 0;
            for (const slug of slugs) {
              permission = Math.max(
                permission,
                await this.dataPermissionService.getPermissionScope(userId, slug, tenantId),
              );
            }
            if (permission === 1) {
              ids = await this.dataPermissionService.getUserGroups(userId, tenantId);
            } else if (permission === 0) {
              ids = new Set([userId]);
            }
            // permission === 2 → ids 保持 null（无限制）
          }

          DataScopeContext.run({ userIds: ids }, () => {
            next.handle().subscribe({
              next: (value) => subscriber.next(value),
              error: (err) => subscriber.error(err),
              complete: () => subscriber.complete(),
            });
          });
        } catch (err) {
          subscriber.error(err);
        }
      })();
    });
  }
}
