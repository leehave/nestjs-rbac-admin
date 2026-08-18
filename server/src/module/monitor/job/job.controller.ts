import { Controller, Get, Post, Body, Delete, Param, Put, Query, Res } from '@nestjs/common';
import type { Response } from 'express-serve-static-core';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JobService } from './job.service';
import { CreateJobDto, UpdateJobDto, ListJobDto } from './dto/create-job.dto';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';

@ApiTags('定时任务管理')
@Controller('api/tool/crontab')
@ApiBearerAuth('Authorization')
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @Get('list')
  @ApiOperation({ summary: '获取定时任务列表' })
  @RequirePermission('tool:crontab:index')
  list(@Query() query: ListJobDto) {
    return this.jobService.list(query);
  }

  @Get('tasks')
  @ApiOperation({ summary: '获取可注册的调用目标列表' })
  @RequirePermission('tool:crontab:index')
  tasks() {
    return this.jobService.getRegisteredTasks();
  }

  @Get('detail/:id')
  @ApiOperation({ summary: '获取定时任务详细信息' })
  @RequirePermission('tool:crontab:read')
  getInfo(@Param('id') id: number) {
    return this.jobService.getJob(id);
  }

  @Post('create')
  @ApiOperation({ summary: '创建定时任务' })
  @RequirePermission('tool:crontab:save')
  add(@Body() createJobDto: CreateJobDto) {
    return this.jobService.create(createJobDto);
  }

  @Put('update/:id')
  @ApiOperation({ summary: '修改定时任务' })
  @RequirePermission('tool:crontab:update')
  update(@Param('id') id: number, @Body() updateJobDto: UpdateJobDto) {
    return this.jobService.update(id, updateJobDto);
  }

  @Delete('delete')
  @ApiOperation({ summary: '删除定时任务' })
  @RequirePermission('tool:crontab:destroy')
  remove(@Body() body: { ids: number[] }) {
    return this.jobService.remove(body.ids);
  }

  @Post('run/:id')
  @ApiOperation({ summary: '立即执行一次' })
  @RequirePermission('tool:crontab:run')
  run(@Param('id') id: number) {
    return this.jobService.run(id);
  }

  @ApiOperation({ summary: '导出定时任务为xlsx文件' })
  @RequirePermission('tool:crontab:export')
  @Post('/export')
  async export(@Res() res: Response, @Body() body: ListJobDto): Promise<void> {
    return this.jobService.export(res, body);
  }
}
