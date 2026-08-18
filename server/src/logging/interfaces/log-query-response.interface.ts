import type { LogRecord } from './log-record.interface';

export interface LogQueryCursor {
  file: string;
  line: number;
  order: 'asc' | 'desc';
}

export interface QueryLogsResponse {
  items: LogRecord[];
  page: {
    limit: number;
    nextCursor?: string;
    hasMore: boolean;
  };
  summary: {
    scannedFiles: number;
    scannedLines: number;
    parseErrors: number;
    truncated: boolean;
    timeRange: {
      startAt: string;
      endAt: string;
    };
  };
}
