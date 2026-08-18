import { Controller, Get, Post, Body, Put, Param, Query, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth } from '@nestjs/swagger';

import { ConfigService } from './config.service';
import { CreateConfigDto, UpdateConfigDto, ListConfigDto, ListConfigGroupDto } from './dto/index';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { NotRequireAuth } from '../../../common/decorators/common.decorator';
import { ResultData } from '../../../common/utils/result';

@ApiTags('参数配置')
@Controller('api/core/config')
@ApiBearerAuth('Authorization')
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @ApiOperation({ summary: '获取公开配置值（无需登录）' })
  @NotRequireAuth()
  @Get('public/:key')
  async getPublicConfig(@Param('key') key: string) {
    const value = await this.configService.getConfigValue(key);
    return ResultData.ok({ key, value });
  }

  @ApiOperation({ summary: '配置列表' })
  /**
   * 配置列表（带分组筛选，无分页时返回数组）
   * @param query - 查询参数，支持 group_id/name/key/分页等
   * @returns 配置列表数据或分页结果
   */
  @RequirePermission('core:config:index')
  @Get('list')
  async findAll(@Query() query: ListConfigDto) {
    const result = await this.configService.findAll(query);
    if (
      query.group_id !== undefined &&
      query.group_id !== null &&
      `${query.group_id}` !== '' &&
      !query.pageNum &&
      !query.page
    ) {
      return ResultData.ok(result.data?.list ?? []);
    }
    return result;
  }

  @ApiOperation({ summary: '创建配置' })
  @ApiBody({ type: CreateConfigDto })
  @RequirePermission('core:config:edit')
  @Post('save')
  create(@Body() createConfigDto: CreateConfigDto) {
    return this.configService.create(createConfigDto);
  }

  @ApiOperation({ summary: '更新配置' })
  @RequirePermission('core:config:update')
  @Put('update/:id')
  update(@Param('id') id: string, @Body() updateConfigDto: UpdateConfigDto) {
    updateConfigDto.id = +id;
    return this.configService.update(updateConfigDto);
  }

  @ApiOperation({ summary: '删除配置' })
  @RequirePermission('core:config:edit')
  @Delete('delete')
  remove(@Query('ids') ids: string) {
    const configIds = ids.split(',').map((id) => +id);
    return this.configService.remove(configIds);
  }

  @ApiOperation({ summary: '批量更新配置' })
  @RequirePermission('core:config:edit')
  @Post('batchUpdate')
  batchUpdate(@Body() body: { config?: any[]; configs?: any[] }) {
    const list = body.config ?? body.configs ?? [];
    return this.configService.batchUpdate(list);
  }

  @ApiOperation({ summary: '配置详情' })
  @RequirePermission('core:config:index')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.configService.findOne(+id);
  }

  @ApiOperation({ summary: '配置详情（按configKey）' })
  @RequirePermission('core:config:index')
  @Get('/configKey/:id')
  findOneByconfigKey(@Param('id') configKey: string) {
    return this.configService.findOneByConfigKey(configKey);
  }

  @ApiOperation({ summary: '刷新缓存' })
  @RequirePermission('core:config:edit')
  @Delete('/refreshCache')
  refreshCache() {
    return this.configService.resetConfigCache();
  }
}

@ApiTags('配置分组')
@Controller('api/core/configGroup')
@ApiBearerAuth('Authorization')
export class ConfigGroupController {
  constructor(private readonly configService: ConfigService) {}

  @ApiOperation({ summary: '配置分组列表' })
  @RequirePermission('core:config:index')
  @Get('list')
  findAll(@Query() query: ListConfigGroupDto) {
    return this.configService.findGroupAll(query);
  }

  @ApiOperation({ summary: '创建配置分组' })
  @RequirePermission('core:config:edit')
  @Post('save')
  create(@Body() body: any) {
    return this.configService.createGroup(body);
  }

  @ApiOperation({ summary: '更新配置分组' })
  @RequirePermission('core:config:edit')
  @Put('update/:id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.configService.updateGroup(+id, body);
  }

  @ApiOperation({ summary: '删除配置分组' })
  @RequirePermission('core:config:edit')
  @Delete('delete/:id')
  deleteGroup(@Param('id') id: string) {
    return this.configService.removeGroup(+id);
  }

  @ApiOperation({ summary: '测试邮件' })
  @RequirePermission('core:config:edit')
  @Post('testEmail')
  testEmail(@Body() body: any) {
    return this.configService.testEmail(body);
  }
}

@ApiTags('系统配置(Web)')
@Controller('api/system/config')
@ApiBearerAuth('Authorization')
export class SystemWebConfigController {
  constructor(private readonly configService: ConfigService) {}

  @ApiOperation({ summary: '获取前端Web配置（主题、站点信息等）' })
  @NotRequireAuth()
  @Get('web')
  async getWebConfig() {
    const keys = ['site_name', 'theme', 'site_logo', 'site_description', 'site_title'];
    const entries = await Promise.all(
      keys.map(async (key) => {
        const value = await this.configService.getConfigValue(key);
        return { key, value };
      }),
    );
    const config: Record<string, any> = {};
    for (const { key, value } of entries) {
      config[key] = value;
    }
    return ResultData.ok({
      siteName: config.site_name || '',
      theme: config.theme || '{}',
      siteLogo: config.site_logo || '',
      siteDescription: config.site_description || '',
      siteTitle: config.site_title || '',
    });
  }

  @ApiOperation({ summary: '更新前端Web配置' })
  @RequirePermission('core:config:edit')
  @Post('web')
  async updateWebConfig(@Body() body: Record<string, any>) {
    const updates: any[] = [];
    if (body.siteName !== undefined) updates.push({ key: 'site_name', value: body.siteName });
    if (body.theme !== undefined) updates.push({ key: 'theme', value: body.theme });
    if (body.siteLogo !== undefined) updates.push({ key: 'site_logo', value: body.siteLogo });
    if (body.siteDescription !== undefined) updates.push({ key: 'site_description', value: body.siteDescription });
    if (body.siteTitle !== undefined) updates.push({ key: 'site_title', value: body.siteTitle });
    if (updates.length > 0) {
      await this.configService.batchUpdate(updates as any);
    }
    return ResultData.ok();
  }
}
