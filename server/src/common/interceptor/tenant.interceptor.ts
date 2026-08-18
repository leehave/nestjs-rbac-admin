import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantContext } from '../tenant/tenant.context';

/**
 * TenantInterceptor — 多租户拦截器。
 * 从请求中提取 tenantId 和 userId，并在 TenantContext 中运行后续处理。
 */
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  /**
   * 多租户拦截器核心逻辑。
   * 从请求中提取 tenantId 和 userId，在 TenantContext 上下文中执行后续请求处理，
   * 确保链路中所有数据库操作能感知当前租户和用户信息。
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    const tenantId = user?.tenantId != null ? Number(user.tenantId) : null;
    const userId =
      user?.userId != null
        ? Number(user.userId)
        : user?.user?.id != null
          ? Number(user.user.id)
          : null;

    return new Observable((subscriber) => {
      TenantContext.run(
        { tenantId: tenantId ?? undefined, userId: userId ?? undefined, ignoreAudit: false, ignoreTenant: false },
        () => {
          next.handle().subscribe({
            next: (value) => subscriber.next(value),
            error: (err) => subscriber.error(err),
            complete: () => subscriber.complete(),
          });
        },
      );
    });
  }
}
