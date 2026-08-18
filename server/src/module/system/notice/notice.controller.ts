import { Controller, Get, Post, Body, Put, Param, Query, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { NoticeService } from './notice.service';
import { CreateNoticeDto, UpdateNoticeDto, ListNoticeDto } from './dto/index';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';

@ApiTags('通知公告')
@Controller('api/system/notice')
@ApiBearerAuth('Authorization')
export class NoticeController {
  constructor(private readonly noticeService: NoticeService) {}

  @ApiOperation({ summary: '公告列表' })
  @RequirePermission('core:notice:index')
  @Get('list')
  findAll(@Query() query: ListNoticeDto) {
    return this.noticeService.findAll(query);
  }

  @ApiOperation({ summary: '创建公告' })
  @ApiBody({ type: CreateNoticeDto, required: true })
  @RequirePermission('core:notice:save')
  @Post('create')
  create(@Body() createNoticeDto: CreateNoticeDto) {
    return this.noticeService.create(createNoticeDto);
  }

  @ApiOperation({ summary: '更新公告' })
  @ApiBody({ type: UpdateNoticeDto, required: true })
  @RequirePermission('core:notice:update')
  @Put('update/:id')
  update(@Param('id') id: string, @Body() updateNoticeDto: UpdateNoticeDto) {
    updateNoticeDto.id = +id;
    return this.noticeService.update(updateNoticeDto);
  }

  @ApiOperation({ summary: '删除公告' })
  @RequirePermission('core:notice:destroy')
  @Delete('delete/:id')
  remove(@Param('id') ids: string) {
    const noticeIds = ids.split(',').map((id) => +id);
    return this.noticeService.remove(noticeIds);
  }

  @ApiOperation({ summary: '公告详情' })
  @RequirePermission('core:notice:read')
  @Get('detail/:id')
  findOne(@Param('id') id: string) {
    return this.noticeService.findOne(+id);
  }
}
