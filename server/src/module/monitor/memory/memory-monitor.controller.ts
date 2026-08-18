import { Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MemoryMonitorService } from './memory-monitor.service';
import { ResultData } from '../../../common/utils/result';

@ApiTags('内存监控')
@Controller('api/core/monitor/memory')
@ApiBearerAuth('Authorization')
export class MemoryMonitorController {
  constructor(private readonly memoryMonitor: MemoryMonitorService) {}

  /**
   * 获取内存状态信息（含格式化后的可读值）
   * @returns 内存详情及格式化字符串
   */
  @ApiOperation({ summary: '内存状态信息' })
  @Get('info')
  getInfo() {
    const info = this.memoryMonitor.getMemoryInfo();
    const format = (bytes: number) => {
      if (bytes > 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
      if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
      return `${(bytes / 1024).toFixed(1)} KB`;
    };
    return ResultData.ok({
      ...info,
      rssFormatted: format(info.rss),
      heapUsedFormatted: format(info.heapUsed),
      heapTotalFormatted: format(info.heapTotal),
    });
  }

  @ApiOperation({ summary: '手动触发堆快照' })
  @Post('dump')
  async triggerDump() {
    const filepath = await this.memoryMonitor.dumpHeap('manual');
    return ResultData.ok({ filepath, dumpDir: this.memoryMonitor.getDumpDir() });
  }

  @ApiOperation({ summary: '列出堆快照文件' })
  @Get('dumps')
  listDumps() {
    return ResultData.ok(this.memoryMonitor.listHeapDumps());
  }

  /**
   * 手动触发内存检查
   * @returns 检查状态（正常/即将重启）及内存信息
   */
  @ApiOperation({ summary: '手动触发内存检查' })
  @Post('check')
  async checkNow() {
    const ok = await this.memoryMonitor.checkMemory();
    const info = this.memoryMonitor.getMemoryInfo();
    return ResultData.ok({
      status: ok ? '正常' : '即将重启',
      ...info,
    });
  }
}
