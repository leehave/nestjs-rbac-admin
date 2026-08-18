import type { LogRecord } from '../interfaces/log-record.interface';

export interface LogSink {
  write(record: LogRecord): Promise<void> | void;
}
