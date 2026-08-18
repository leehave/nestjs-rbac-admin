import { Injectable, Logger } from '@nestjs/common';

import type { LogLevel, LogRecord } from '../interfaces/log-record.interface';
import type { LogSink } from './log-sink.interface';

@Injectable()
export class ConsoleLogSink implements LogSink {
  private readonly logger = new Logger('AppLogger');

  /**
   * 将日志记录写入控制台。
   * 根据日志级别使用 NestJS 内置 Logger 输出，支持 fatal、error、warn、debug 和 info 级别。
   * @param record 日志记录
   */
  write(record: LogRecord): void {
    const message = `[${record.category}] ${record.message}`;
    const context = JSON.stringify({
      requestId: record.requestId,
      traceId: record.traceId,
      source: record.source,
      meta: record.meta,
    });

    switch (record.level) {
      case 'fatal':
      case 'error':
        this.logger.error(message, context);
        break;
      case 'warn':
        this.logger.warn(message, context);
        break;
      case 'debug':
        this.logger.debug(message, context);
        break;
      case 'info':
      default:
        this.logger.log(message, context);
        break;
    }
  }

  supports(level: LogLevel): boolean {
    return Boolean(level);
  }
}
