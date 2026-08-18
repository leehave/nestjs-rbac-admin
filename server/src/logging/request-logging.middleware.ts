import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';

import { AppLoggerService } from './app-logger.service';

type ResponseFinishHandler = () => void;

interface RequestWithId {
  requestId?: string;
  method: string;
  originalUrl?: string;
  url: string;
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
}

interface ResponseLike {
  statusCode: number;
  setHeader(name: string, value: string): void;
  on(event: 'finish', handler: ResponseFinishHandler): void;
}

type NextFunction = () => void;

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly healthLogEnabled: boolean;
  private readonly apiPrefix: string;

  /**
   * 初始化请求日志中间件。
   * 从配置中读取健康检查日志开关和 API 前缀。
   * @param logger 应用日志记录器
   * @param configService 配置服务
   */
  constructor(
    private readonly logger: AppLoggerService,
    private readonly configService: ConfigService,
  ) {
    this.healthLogEnabled = this.configService.get<boolean>('log.healthLogEnabled', false);
    this.apiPrefix = `/${this.configService.get<string>('app.apiPrefix', 'api')}`;
  }

  /**
   * 中间件处理函数。
   * 为每个请求生成唯一请求 ID，记录请求处理耗时，并在响应完成时输出访问日志。
   * 健康检查请求在配置禁用日志时可被过滤。
   * @param req 请求对象
   * @param res 响应对象
   * @param next 下一个中间件函数
   */
  use(req: RequestWithId, res: ResponseLike, next: NextFunction): void {
    const requestId = randomUUID();
    const startedAt = Date.now();

    req.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);

    res.on('finish', () => {
      const path = req.originalUrl || req.url;
      const durationMs = Date.now() - startedAt;
      const isHealthCheck = path === `${this.apiPrefix}/health` || path.startsWith(`${this.apiPrefix}/health?`);
      const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

      if (isHealthCheck && !this.healthLogEnabled && level === 'info') {
        return;
      }

      this.logger[level]({
        category: level === 'error' ? 'api.error' : isHealthCheck ? 'health.check' : 'api.access',
        message: `${req.method} ${path} ${res.statusCode} ${durationMs}ms`,
        requestId,
        source: 'http',
        meta: this.buildMeta(req, res, durationMs),
      });
    });

    next();
  }

  /**
   * 构建日志元数据对象。
   * @param req 请求对象
   * @param res 响应对象
   * @param durationMs 请求处理耗时（毫秒）
   * @returns 元数据键值对
   */
  private buildMeta(
    req: RequestWithId,
    res: ResponseLike,
    durationMs: number,
  ): Record<string, unknown> {
    return {
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
  }
}
