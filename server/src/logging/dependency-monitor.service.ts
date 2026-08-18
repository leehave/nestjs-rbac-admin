import { Injectable, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

import { RedisService } from '../redis/redis.service';
import type {
  DependencyName,
  DependencyStatus,
  DependencyStatusMap,
  DependencyStatusSnapshot,
} from './interfaces/dependency-status.interface';
import { AppLoggerService } from './app-logger.service';

@Injectable()
export class DependencyMonitorService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly checkIntervalMs: number;
  private timer?: NodeJS.Timeout;
  private readonly snapshots: DependencyStatusMap = {
    mysql: { name: 'mysql', status: 'down' },
    redis: { name: 'redis', status: 'down' },
  };

  /**
   * 初始化依赖监控服务。
   * 从配置中读取依赖健康检查的轮询间隔时间。
   * @param configService 配置服务
   * @param dataSource TypeORM 数据源（用于检查 MySQL 连接）
   * @param redisService Redis 服务（用于检查 Redis 连接）
   * @param logger 日志记录器
   */
  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
    private readonly logger: AppLoggerService,
  ) {
    this.checkIntervalMs = this.configService.get<number>('log.dependencyCheckIntervalMs', 30000);
  }

  /**
   * 应用启动时初始化依赖监控。
   * 注册 Redis 事件监听，执行首次健康检查，并启动定时轮询。
   */
  onApplicationBootstrap(): void {
    if (process.env.APP_DISABLE_DEPENDENCY_MONITOR === 'true') {
      return;
    }

    this.registerRedisEvents();
    void this.checkDependencies();
    this.timer = setInterval(() => void this.checkDependencies(), this.checkIntervalMs);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  getSnapshot(): DependencyStatusMap {
    return {
      mysql: { ...this.snapshots.mysql },
      redis: { ...this.snapshots.redis },
    };
  }

  private async checkDependencies(): Promise<void> {
    await Promise.all([this.checkMysql(), this.checkRedis()]);
  }

  /**
   * 检查 MySQL 数据库连接状态。
   * 若数据源未初始化则尝试初始化，否则执行 SELECT 1 探测连接有效性。
   */
  private async checkMysql(): Promise<void> {
    try {
      if (!this.dataSource.isInitialized) {
        await this.dataSource.initialize();
      } else {
        await this.dataSource.query('SELECT 1');
      }

      this.updateStatus('mysql', 'up');
    } catch (error) {
      this.updateStatus('mysql', 'down', this.getErrorMessage(error));
    }
  }

  /**
   * 检查 Redis 连接状态。
   * 通过发送 PING 命令并验证返回是否为 "PONG" 来判断连接是否正常。
   */
  private async checkRedis(): Promise<void> {
    try {
      const result = await this.redisService.ping();
      this.updateStatus('redis', result === 'PONG' ? 'up' : 'down');
    } catch (error) {
      this.updateStatus('redis', 'down', this.getErrorMessage(error));
    }
  }

  /**
   * 注册 Redis 客户端事件监听。
   * 监听 ready、close、end、reconnecting 和 error 事件，及时更新 Redis 连接状态。
   */
  private registerRedisEvents(): void {
    const client = this.redisService.getClient();

    client.on('ready', () => this.updateStatus('redis', 'up'));
    client.on('close', () => this.updateStatus('redis', 'down', 'Redis connection closed'));
    client.on('end', () => this.updateStatus('redis', 'down', 'Redis connection ended'));
    client.on('reconnecting', () => {
      this.logger.warn({
        category: 'dependency.redis',
        message: 'Redis 正在重连',
        source: 'dependency-monitor',
      });
    });
    client.on('error', (error) => this.updateStatus('redis', 'down', this.getErrorMessage(error)));
  }

  /**
   * 更新指定依赖的状态快照。
   * 当状态发生变更时，记录变更时间并通过日志输出状态变化信息。
   * @param name 依赖名称
   * @param status 当前状态
   * @param lastError 可选的错误信息（仅在状态为 down 时记录）
   */
  private updateStatus(
    name: DependencyName,
    status: DependencyStatus,
    lastError?: string,
  ): void {
    const now = new Date().toISOString();
    const current = this.snapshots[name];
    const changed = !current.lastCheckedAt || current.status !== status;
    const next: DependencyStatusSnapshot = {
      name,
      status,
      lastCheckedAt: now,
      lastChangedAt: changed ? now : current.lastChangedAt,
      lastError: status === 'down' ? lastError : undefined,
    };

    this.snapshots[name] = next;

    if (!changed) {
      return;
    }

    const category = `dependency.${name}`;
    const message = `${name === 'mysql' ? 'MySQL' : 'Redis'} 状态：${status === 'up' ? '已连接' : '未连接'}`;
    const meta = { status, lastError };

    if (status === 'up') {
      this.logger.info({ category, message, source: 'dependency-monitor', meta });
      return;
    }

    this.logger.warn({ category, message, source: 'dependency-monitor', meta });
  }

  /**
   * 从未知类型错误对象中提取错误消息。
   * @param error 未知类型的错误
   * @returns 错误消息字符串
   */
  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }
}
