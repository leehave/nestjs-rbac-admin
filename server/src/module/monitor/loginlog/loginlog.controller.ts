import { Controller, Get, Delete, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LoginlogService } from './loginlog.service';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';

@ApiTags('登录日志')
@Controller('api/core/logs')
@ApiBearerAuth('Authorization')
export class LoginlogController {
  constructor(private readonly loginlogService: LoginlogService) {}

  @ApiOperation({ summary: '登录日志分页列表' })
  @RequirePermission('core:logs:login')
  @Get('getLoginLogPageList')
  findAll(@Query() query: Record<string, any>) {
    return this.loginlogService.findAll(query);
  }

  @ApiOperation({ summary: '删除登录日志' })
  @RequirePermission('core:logs:deleteLogin')
  @Delete('deleteLoginLog')
  /**
   * 删除登录日志（支持批量删除）
   * @param ids - 逗号分隔的 ID 字符串（来自查询参数）
   * @param body - 请求体，可包含 ids 数组或单个 id
   * @returns 删除结果
   */
  remove(@Query('ids') ids: string, @Body() body?: { ids?: number[]; id?: number }) {
    let infoIds: number[] = [];
    if (body?.ids?.length) {
      infoIds = body.ids.map((id) => +id);
    } else if (body?.id) {
      infoIds = [+body.id];
    } else if (ids) {
      infoIds = ids.split(',').map((id) => +id);
    }
    return this.loginlogService.remove(infoIds);
  }
}
