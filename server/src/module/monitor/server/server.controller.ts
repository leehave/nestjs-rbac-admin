import { Controller, Get, Post, Delete, Body, Query } from '@nestjs/common';
import { ServerService } from './server.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CacheService } from '../cache/cache.service';

@ApiTags('系统监控-服务监控')
@ApiBearerAuth('Authorization')
@Controller('api/core/server')
export class ServerController {
  constructor(
    private readonly serverService: ServerService,
    private readonly cacheService: CacheService,
  ) {}

  @ApiOperation({ summary: '服务器监控' })
  @Get('monitor')
  getInfo() {
    return this.serverService.getInfo();
  }

  @ApiOperation({ summary: '缓存列表' })
  @Get('cache')
  getCache() {
    return this.serverService.getCache();
  }

  @ApiOperation({ summary: '清理缓存' })
  @Post('clear')
  clearCache() {
    return this.cacheService.clearBusinessCache();
  }
}
