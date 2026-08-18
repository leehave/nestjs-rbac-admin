import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DatabaseModule } from '../database/database.module';
import { RedisModule } from '../redis/redis.module';
import { AppLoggerService } from './app-logger.service';
import { DependencyMonitorService } from './dependency-monitor.service';
import { LoggingApiVerifier } from './logging.api-verifier';
import { LogQueryService } from './log-query.service';
import { LogsController } from './logs.controller';
import { RequestLoggingMiddleware } from './request-logging.middleware';
import { ConsoleLogSink } from './sinks/console-log.sink';
import { FileLogSink } from './sinks/file-log.sink';
import { WinstonLogSink } from './sinks/winston-log.sink';

@Global()
@Module({
  imports: [ConfigModule, DatabaseModule, RedisModule],
  controllers: [LogsController],
  providers: [
    AppLoggerService,
    ConsoleLogSink,
    FileLogSink,
    WinstonLogSink,
    DependencyMonitorService,
    LogQueryService,
    LoggingApiVerifier,
  ],
  exports: [AppLoggerService, DependencyMonitorService],
})
export class LoggingModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggingMiddleware).forRoutes('{*path}');
  }
}
