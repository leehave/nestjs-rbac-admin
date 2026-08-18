import { Controller, Get, Delete, Query, Post, Res, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JobLogService } from './job-log.service';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { ListJobLogDto } from './dto/create-job.dto';
import type { Response } from 'express-serve-static-core';

@ApiTags('定时任务日志管理')
@Controller('api/tool/crontab/log')
@ApiBearerAuth('Authorization')
export class JobLogController {
  constructor(private readonly jobLogService: JobLogService) {}

  @Get('list')
  @ApiOperation({ summary: '获取定时任务日志列表' })
  @RequirePermission('tool:crontab:index')
  list(@Query() query: ListJobLogDto) {
    return this.jobLogService.list(query);
  }

  @Delete('delete')
  @ApiOperation({ summary: '删除定时任务日志' })
  @RequirePermission('tool:crontab:destroy')
  delete(@Body() body: { ids: number[] }) {
    return this.jobLogService.delete(body.ids);
  }

  @Delete('clean')
  @ApiOperation({ summary: '清空定时任务日志' })
  @RequirePermission('tool:crontab:destroy')
  clean() {
    return this.jobLogService.clean();
  }

  @ApiOperation({ summary: '导出调度日志为xlsx文件' })
  @RequirePermission('tool:crontab:export')
  @Post('/export')
  async export(@Res() res: Response, @Body() body: ListJobLogDto): Promise<void> {
    return this.jobLogService.export(res, body);
  }
}
