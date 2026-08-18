import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { User } from '../system/user/user.decorator';
import type { UserDto } from '../system/user/user.decorator';
import { ResultData } from '../../common/utils/result';
import { AiAdminService } from './services/ai-admin.service';

@ApiTags('AI 管理')
@ApiBearerAuth('Authorization')
@Controller('api/ai/admin')
export class AiAdminController {
  constructor(private readonly aiAdminService: AiAdminService) {}

  @Get('providers/list')
  @ApiOperation({ summary: '供应商列表' })
  listProviders(@User() user: UserDto, @Query() query: Record<string, any>) {
    return this.aiAdminService.listProviders(user as any, query).then((d) => ResultData.ok(d));
  }

  @Post('providers/create')
  @ApiOperation({ summary: '创建供应商' })
  createProvider(@User() user: UserDto, @Body() body: Record<string, any>) {
    return this.aiAdminService.createProvider(user as any, body).then((d) => ResultData.ok(d));
  }

  @Put('providers/update/:id')
  @ApiOperation({ summary: '更新供应商' })
  updateProvider(@User() user: UserDto, @Param('id') id: string, @Body() body: Record<string, any>) {
    return this.aiAdminService.updateProvider(user as any, id, body).then((d) => ResultData.ok(d));
  }

  @Delete('providers/delete/:id')
  @ApiOperation({ summary: '删除供应商' })
  deleteProvider(@User() user: UserDto, @Param('id') id: string) {
    return this.aiAdminService.deleteProvider(user as any, id).then((d) => ResultData.ok(d));
  }

  @Get('providers/options')
  @ApiOperation({ summary: '供应商下拉' })
  providerOptions(@User() user: UserDto) {
    return this.aiAdminService.providerOptions(user as any).then((d) => ResultData.ok({ list: d }));
  }

  @Get('models/list')
  @ApiOperation({ summary: '模型列表' })
  listModels(@User() user: UserDto, @Query() query: Record<string, any>) {
    return this.aiAdminService.listModels(user as any, query).then((d) => ResultData.ok(d));
  }

  @Post('models/create')
  @ApiOperation({ summary: '创建模型' })
  createModel(@User() user: UserDto, @Body() body: Record<string, any>) {
    return this.aiAdminService.createModel(user as any, body).then((d) => ResultData.ok(d));
  }

  @Put('models/update/:id')
  @ApiOperation({ summary: '更新模型' })
  updateModel(@User() user: UserDto, @Param('id') id: string, @Body() body: Record<string, any>) {
    return this.aiAdminService.updateModel(user as any, id, body).then((d) => ResultData.ok(d));
  }

  @Delete('models/delete/:id')
  @ApiOperation({ summary: '删除模型' })
  deleteModel(@User() user: UserDto, @Param('id') id: string) {
    return this.aiAdminService.deleteModel(user as any, id).then((d) => ResultData.ok(d));
  }
}
