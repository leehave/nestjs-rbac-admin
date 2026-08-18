import { Controller, Get, Query } from '@nestjs/common';

import { Public } from '../common/decorators/auth.decorator';
import { QueryLogsDto } from './dto/query-logs.dto';
import type { QueryLogsResponse } from './interfaces/log-query-response.interface';
import { LogQueryService } from './log-query.service';

@Controller('api/log')
export class LogsController {
  constructor(private readonly logQueryService: LogQueryService) {}

  @Get('query')
  @Public()
  query(@Query() queryLogsDto: QueryLogsDto): Promise<QueryLogsResponse> {
    return this.logQueryService.query(queryLogsDto);
  }
}
