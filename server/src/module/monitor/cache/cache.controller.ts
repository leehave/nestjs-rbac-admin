import { Controller, Get, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CacheService } from './cache.service';

@ApiTags('缓存管理')
@Controller('api/core/server/redis')
@ApiBearerAuth('Authorization')
export class CacheController {
  constructor(private readonly cacheService: CacheService) {}

  @ApiOperation({ summary: 'Redis监控信息' })
  @Get()
  getInfo() {
    return this.cacheService.getInfo();
  }

  @ApiOperation({ summary: 'Redis浏览器-一级目录' })
  @Get('browser/level1')
  getLevel1(@Query('pattern') pattern = '*') {
    return this.cacheService.getFirstLevelKeys(pattern);
  }

  @ApiOperation({ summary: 'Redis浏览器-二级目录' })
  @Get('browser/level2')
  getLevel2(@Query('pattern') prefix: string) {
    return this.cacheService.getSecondLevelKeys(prefix);
  }

  @ApiOperation({ summary: 'Redis浏览器-三级目录' })
  @Get('browser/level3')
  getLevel3(@Query('prefix') prefix: string) {
    return this.cacheService.getThirdLevelKeys(prefix);
  }

  @ApiOperation({ summary: 'Redis浏览器-Key信息' })
  @Get('browser/key-info')
  getKeyInfo(@Query('key') key: string) {
    return this.cacheService.getBrowserKeyInfo(key);
  }

  @ApiOperation({ summary: 'Redis浏览器-删除Key' })
  @Delete('browser/delete')
  deleteKey(@Query('key') key?: string, @Query('pattern') pattern?: string) {
    if (pattern) {
      return this.cacheService.deleteByPattern(pattern);
    }
    return this.cacheService.deleteBrowserKey(key);
  }
}
