import { Controller, Get, Delete, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CacheService } from '../cache/cache.service';
import { ResultData } from '../../../common/utils/result';

@ApiTags('Redis监控')
@Controller('api/core/redis')
@ApiBearerAuth('Authorization')
export class RedisController {
  constructor(private readonly cacheService: CacheService) {}

  @ApiOperation({ summary: 'Redis信息' })
  @Get('info')
  async getInfo() {
    return this.cacheService.getInfo();
  }

  @ApiOperation({ summary: 'Redis操作列表' })
  @Get('operations')
  async getOperations() {
    const data = await this.cacheService.getInfo();
    return ResultData.ok([]);
  }

  @ApiOperation({ summary: 'Redis键列表' })
  @Get('keys')
  async getKeys(@Query('pattern') pattern: string) {
    const keys = await this.cacheService.scanKeys(pattern || '*');
    return ResultData.ok({ keys, total: keys.length });
  }

  @ApiOperation({ summary: '删除Redis键' })
  @Delete('deleteKeys')
  /**
   * 批量删除 Redis 键
   * @param body - 请求体，包含 keys 数组
   * @returns 删除结果
   */
  async deleteKeys(@Body() body: { keys: string[] }) {
    if (body?.keys?.length) {
      for (const key of body.keys) {
        await this.cacheService.deleteBrowserKey(key);
      }
    }
    return ResultData.ok();
  }
}
