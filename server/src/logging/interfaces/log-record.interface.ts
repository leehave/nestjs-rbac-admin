export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug';

export interface LogRecord {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  service: string;
  env: string;
  requestId?: string;
  traceId?: string;
  source?: string;
  meta?: Record<string, unknown>;
}

export interface WriteLogOptions {
  category: string;
  message: string;
  requestId?: string;
  traceId?: string;
  source?: string;
  meta?: Record<string, unknown>;
}
