import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { PluginService } from './plugin.service';
import { CreatePluginDto, UpdatePluginConfigDto, ListPluginDto } from './dto/index';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';

@ApiTags('插件管理')
@Controller('api/system/plugin')
@ApiBearerAuth('Authorization')
export class PluginController {
  constructor(private readonly pluginService: PluginService) {}

  @ApiOperation({ summary: '插件列表' })
  @RequirePermission('system:plugin:list')
  @Get('list')
  findAll(@Query() query: ListPluginDto) {
    return this.pluginService.findAll(query);
  }

  @ApiOperation({ summary: '插件详情' })
  @RequirePermission('system:plugin:query')
  @Get('detail/:name')
  findOne(@Param('name') name: string) {
    return this.pluginService.findOne(name);
  }

  @ApiOperation({ summary: '创建插件' })
  @ApiBody({ type: CreatePluginDto, required: true })
  @RequirePermission('system:plugin:add')
  @Post('create')
  create(@Body() createPluginDto: CreatePluginDto) {
    return this.pluginService.create(createPluginDto);
  }

  @ApiOperation({ summary: '安装插件' })
  @ApiBody({ type: CreatePluginDto, required: true })
  @RequirePermission('system:plugin:install')
  @Post('install')
  install(@Body() createPluginDto: CreatePluginDto) {
    return this.pluginService.install(createPluginDto);
  }

  @ApiOperation({ summary: '卸载插件' })
  @RequirePermission('system:plugin:uninstall')
  @Post('uninstall')
  uninstall(@Body() body: { name: string }) {
    return this.pluginService.uninstall(body.name);
  }

  @ApiOperation({ summary: '启用插件' })
  @RequirePermission('system:plugin:enable')
  @Put('enable/:name')
  enable(@Param('name') name: string) {
    return this.pluginService.enable(name);
  }

  @ApiOperation({ summary: '禁用插件' })
  @RequirePermission('system:plugin:disable')
  @Put('disable/:name')
  disable(@Param('name') name: string) {
    return this.pluginService.disable(name);
  }

  @ApiOperation({ summary: '获取插件配置' })
  @RequirePermission('system:plugin:query')
  @Get('config/:name')
  getConfig(@Param('name') name: string) {
    return this.pluginService.getConfig(name);
  }

  @ApiOperation({ summary: '更新插件配置' })
  @ApiBody({ type: UpdatePluginConfigDto, required: true })
  @RequirePermission('system:plugin:edit')
  @Put('config/:name')
  updateConfig(@Param('name') name: string, @Body() updateConfigDto: UpdatePluginConfigDto) {
    return this.pluginService.updateConfig(name, updateConfigDto);
  }

  @ApiOperation({ summary: '插件诊断' })
  @RequirePermission('system:plugin:query')
  @Get('doctor')
  doctor() {
    return this.pluginService.doctor();
  }
}
