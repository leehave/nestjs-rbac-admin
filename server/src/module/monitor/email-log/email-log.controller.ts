import { Controller, Get, Delete, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EmailLogService } from './email-log.service';
import { ListEmailLogDto } from './dto/index';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';

@ApiTags('邮件日志')
@Controller('api/core/email')
@ApiBearerAuth('Authorization')
export class EmailLogController {
  constructor(private readonly emailLogService: EmailLogService) {}

  @ApiOperation({ summary: '邮件日志分页列表' })
  @RequirePermission('core:email:index')
  @Get('index')
  findAll(@Query() query: ListEmailLogDto & Record<string, any>) {
    return this.emailLogService.findAll(query);
  }

  /**
   * 删除邮件日志（支持多种参数方式）
   * @param ids - 查询参数中的逗号分隔 ID 字符串
   * @param body - 请求体中的 ID 数组或单个 ID
   * @returns 删除结果
   */
  @ApiOperation({ summary: '删除邮件日志' })
  @RequirePermission('core:email:destroy')
  @Delete('destroy')
  remove(@Query('ids') ids: string, @Body() body?: { ids?: number[]; id?: number }) {
    let infoIds: number[] = [];
    if (body?.ids?.length) {
      infoIds = body.ids.map((id) => +id);
    } else if (body?.id) {
      infoIds = [+body.id];
    } else if (ids) {
      infoIds = ids.split(',').map((id) => +id);
    }
    return this.emailLogService.remove(infoIds);
  }
}
