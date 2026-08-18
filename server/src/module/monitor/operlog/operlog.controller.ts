import { Controller, Get, Delete, Query, Body } from '@nestjs/common';
import { OperlogService } from './operlog.service';
import { ApiOperation, ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';

@ApiTags('操作日志')
@Controller('api/core/logs')
@ApiBearerAuth('Authorization')
export class OperlogController {
  constructor(private readonly operlogService: OperlogService) {}

  @ApiOperation({ summary: '操作日志分页列表' })
  @RequirePermission('core:logs:Oper')
  @Get('getOperLogPageList')
  findAll(@Query() query: Record<string, any>) {
    return this.operlogService.findAll(query);
  }

  @ApiOperation({ summary: '删除操作日志' })
  @RequirePermission('core:logs:deleteOper')
  @Delete('deleteOperLog')
  /**
   * 删除操作日志（支持批量删除）
   * @param ids - 逗号分隔的 ID 字符串（来自查询参数）
   * @param body - 请求体，可包含 ids 数组或单个 id
   * @returns 删除结果
   */
  remove(@Query('ids') ids: string, @Body() body?: { ids?: number[]; id?: number }) {
    let operIds: number[] = [];
    if (body?.ids?.length) {
      operIds = body.ids.map((id) => +id);
    } else if (body?.id) {
      operIds = [+body.id];
    } else if (ids) {
      operIds = ids.split(',').map((id) => +id);
    }
    return this.operlogService.remove(operIds);
  }
}
