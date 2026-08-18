import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Public } from '../../common/decorators/auth.decorator';
import { DependencyMonitorService } from '../../logging/dependency-monitor.service';
import type { DependencyStatus } from '../../logging/interfaces/dependency-status.interface';

interface HealthResponse {
  status: 'ok';
  app: {
    name: string;
    env: string;
  };
  dependencies: {
    mysql: DependencyStatus;
    redis: DependencyStatus;
  };
  timestamp: string;
}

@Controller('api/health')
export class HealthController {
  constructor(
    private readonly configService: ConfigService,
    private readonly dependencyMonitorService: DependencyMonitorService,
  ) {}

  /**
   * 健康检查接口。
   * 返回应用基本信息（名称、环境）以及各依赖服务（MySQL、Redis）的连接状态。
   * @returns 健康检查响应
   */
  @Get()
  @Public()
  check(): HealthResponse {
    const dependencies = this.dependencyMonitorService.getSnapshot();

    return {
      status: 'ok',
      app: {
        name: this.configService.get<string>('app.name', 'nextjs-server'),
        env: this.configService.get<string>('app.env', 'development'),
      },
      dependencies: {
        mysql: dependencies.mysql.status,
        redis: dependencies.redis.status,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
