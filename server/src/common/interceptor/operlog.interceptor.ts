import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import type { OperlogConfig } from '../decorators/operlog.decorator';
import { OperlogService } from '../../module/monitor/operlog/operlog.service';
import { BusinessType } from '../constant/business.constant';

/** 不需要记录操作日志的路径（server 遗留路径，避免旧版 operlog 模块循环） */
const SKIP_PATHS = ['/monitor/operlog', '/system/log/operlog'];

/**
 * 根据 HTTP 方法自动推断业务类型。
 * POST → INSERT，PUT/PATCH → UPDATE，DELETE → DELETE，其余 → OTHER。
 */
function autoBusinessType(method: string): number {
  switch (method.toUpperCase()) {
    case 'POST':
      return BusinessType.INSERT;
    case 'PUT':
    case 'PATCH':
      return BusinessType.UPDATE;
    case 'DELETE':
      return BusinessType.DELETE;
    default:
      return BusinessType.OTHER;
  }
}

@Injectable()
export class OperlogInterceptor implements NestInterceptor {
  constructor(
    private readonly logService: OperlogService,
    private readonly reflector: Reflector,
  ) {}

  /**
   * 操作日志拦截器核心逻辑。
   * 仅处理 HTTP 请求，跳过指定路径和 GET/HEAD/OPTIONS 方法。
   * 从反射器获取 @Operlog / @ApiOperation 等装饰器的配置，确定日志标题与业务类型。
   * 在请求完成后（成功或失败）记录操作日志到 OperlogService。
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request & { user?: any }>();
    const url = request.url || '';

    if (SKIP_PATHS.some((path) => url.startsWith(path))) {
      return next.handle();
    }

    const method = request.method || 'GET';

    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
      return next.handle();
    }

    const { summary } =
      this.reflector.getAllAndOverride(`swagger/apiOperation`, [context.getHandler()]) || {};

    const logConfig: OperlogConfig = this.reflector.getAllAndOverride('operlog', [
      context.getHandler(),
    ]);
    const operlogTitle = this.reflector.getAllAndOverride<string>('operlogTitle', [
      context.getHandler(),
    ]);
    const operlogBusinessType = this.reflector.getAllAndOverride<string>('operlogBusinessType', [
      context.getHandler(),
    ]);

    const handlerName = context.getHandler().name;
    const title = operlogTitle || summary || handlerName;
    const businessType: number =
      logConfig?.businessType != null
        ? Number(logConfig.businessType)
        : operlogBusinessType != null
          ? Number(operlogBusinessType)
          : autoBusinessType(method);

    const now = Date.now();

    return next.handle().pipe(
      map((resultData) => {
        const costTime = Date.now() - now;
        const success = resultData && (resultData as any).code === 200;
        if (success) {
          this.logService.logAction({ request, costTime, resultData, handlerName, title, businessType });
        } else {
          this.logService.logAction({
            request,
            costTime,
            errorMsg: (resultData as any)?.msg || (resultData as any)?.message || '操作失败',
            handlerName,
            title,
            businessType,
          });
        }
        return resultData;
      }),
      catchError((err) => {
        const costTime = Date.now() - now;
        this.logService.logAction({
          request,
          costTime,
          errorMsg: err?.response?.message || err?.message || '系统异常',
          handlerName,
          title,
          businessType,
        });
        return throwError(() => err);
      }),
    );
  }
}
