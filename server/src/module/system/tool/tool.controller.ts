import { Controller, Get, Post, Body, Delete, Query, Put, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ToolService } from './tool.service';
import type { Response } from 'express-serve-static-core';
import { User } from '../user/user.decorator';
import type { UserDto } from '../user/user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';

@ApiTags('系统工具')
@Controller('api/tool/code')
@ApiBearerAuth('Authorization')
export class ToolController {
  constructor(private readonly toolService: ToolService) {}

  @ApiOperation({ summary: '数据表列表' })
  @RequirePermission('tool:code:index')
  @Get('/index')
  findAll(@Query() query: Record<string, any>) {
    return this.toolService.findAll(query);
  }

  @ApiOperation({ summary: '读取表结构' })
  @RequirePermission('tool:code:index')
  @Get('/read')
  gen(@Query('id') id: number) {
    return this.toolService.findOne(+id);
  }

  @ApiOperation({ summary: '修改代码生成信息' })
  @RequirePermission('tool:code:edit')
  @Put('/update')
  genUpdate(@Body() body: Record<string, any>, @User() user: UserDto) {
    return this.toolService.genUpdate(body, user);
  }

  @ApiOperation({ summary: '删除表数据' })
  @RequirePermission('tool:code:edit')
  @Delete('/destroy')
  remove(@Body() body: { ids: number[] }) {
    return this.toolService.remove(body.ids);
  }

  @ApiOperation({ summary: '获取表字段' })
  @RequirePermission('tool:code:index')
  @Get('/getTableColumns')
  getTableColumns(@Query('table_id') tableId: number) {
    return this.toolService.getTableColumns(+tableId);
  }

  @ApiOperation({ summary: '装载数据表' })
  @RequirePermission('tool:code:edit')
  @Post('/loadTable')
  loadTable(@Body() body: Record<string, any>, @User() user: UserDto) {
    return this.toolService.loadTable(body, user);
  }

  @ApiOperation({ summary: '同步数据表' })
  @RequirePermission('tool:code:edit')
  @Post('/sync')
  synchDb(@Body() body: Record<string, any>, @User() user: UserDto) {
    return this.toolService.synchDb(body, user);
  }

  @ApiOperation({ summary: '查看代码' })
  @RequirePermission('tool:code:index')
  @Get('/preview')
  preview(@Query('id') id: number) {
    return this.toolService.preview(+id);
  }

  @ApiOperation({ summary: '生成代码' })
  @RequirePermission('tool:code:edit')
  @Post('/generate')
  batchGenCode(@Body() body: Record<string, any>, @Res() res: Response) {
    return this.toolService.batchGenCode(body, res);
  }

  @ApiOperation({ summary: '生成代码到项目' })
  @RequirePermission('tool:code:edit')
  @Post('/generateFile')
  generateFile(@Body() body: Record<string, any>, @User() user: UserDto) {
    return this.toolService.generateFile(body, user);
  }
}
