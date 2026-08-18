import { Controller, Get, Post, Body, Query, Put, Param, Delete, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { DictService } from './dict.service';
import { CreateDictTypeDto, UpdateDictTypeDto, ListDictTypeDto, CreateDictDataDto, UpdateDictDataDto, ListDictDataDto } from './dto/index';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';

@ApiTags('字典管理')
@Controller('api/system/dict')
@ApiBearerAuth('Authorization')
export class DictController {
  constructor(private readonly dictService: DictService) {}

  // ============ 字典类型 ============

  @ApiOperation({ summary: '字典类型列表' })
  @RequirePermission('core:dict:index')
  @Get('type/list')
  typeList(@Query() query: ListDictTypeDto) {
    return this.dictService.findAllType(query);
  }

  @ApiOperation({ summary: '创建字典类型' })
  @ApiBody({ type: CreateDictTypeDto, required: true })
  @RequirePermission('core:dict:edit')
  @Post('type/create')
  @HttpCode(200)
  typeCreate(@Body() createDictTypeDto: CreateDictTypeDto) {
    return this.dictService.createType(createDictTypeDto);
  }

  @ApiOperation({ summary: '更新字典类型' })
  @RequirePermission('core:dict:edit')
  @Put('type/update/:id')
  typeUpdate(@Param('id') id: string, @Body() updateDictTypeDto: UpdateDictTypeDto) {
    updateDictTypeDto.id = +id;
    return this.dictService.updateType(updateDictTypeDto);
  }

  @ApiOperation({ summary: '删除字典类型' })
  @RequirePermission('core:dict:edit')
  @Delete('type/delete/:id')
  typeDelete(@Param('id') ids: string) {
    const dictIds = ids.split(',').map((id) => +id);
    return this.dictService.deleteType(dictIds);
  }

  @ApiOperation({ summary: '更新字典类型状态' })
  @RequirePermission('core:dict:edit')
  @Put('type/status/:id')
  typeUpdateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.dictService.updateType({ id: +id, status: +body.status } as UpdateDictTypeDto);
  }

  // ============ 字典数据 ============

  @ApiOperation({ summary: '字典数据列表' })
  @RequirePermission('core:dict:index')
  @Get('data/list')
  dataList(@Query() query: ListDictDataDto) {
    return this.dictService.findAllData(query);
  }

  @ApiOperation({ summary: '根据编码获取字典数据' })
  @RequirePermission('core:dict:index')
  @Get('data/code/:code')
  dataByCode(@Param('code') code: string) {
    return this.dictService.findOneDataType(code);
  }

  @ApiOperation({ summary: '创建字典数据' })
  @ApiBody({ type: CreateDictDataDto, required: true })
  @RequirePermission('core:dict:edit')
  @Post('data/create')
  @HttpCode(200)
  dataCreate(@Body() createDictDataDto: CreateDictDataDto) {
    return this.dictService.createDictData(createDictDataDto);
  }

  @ApiOperation({ summary: '更新字典数据' })
  @RequirePermission('core:dict:edit')
  @Put('data/update/:id')
  dataUpdate(@Param('id') id: string, @Body() updateDictDataDto: UpdateDictDataDto) {
    updateDictDataDto.id = +id;
    return this.dictService.updateDictData(updateDictDataDto);
  }

  @ApiOperation({ summary: '删除字典数据' })
  @RequirePermission('core:dict:edit')
  @Delete('data/delete/:id')
  dataDelete(@Param('id') ids: string) {
    const dictIds = ids.split(',').map((id) => +id);
    return this.dictService.deleteDictData(dictIds);
  }

  @ApiOperation({ summary: '批量删除字典数据' })
  @RequirePermission('core:dict:edit')
  @Delete('data/batchDelete')
  dataBatchDelete(@Query('ids') ids: string) {
    const dictIds = ids.split(',').map((id) => +id);
    return this.dictService.deleteDictData(dictIds);
  }

  @ApiOperation({ summary: '更新字典数据状态' })
  @RequirePermission('core:dict:edit')
  @Put('data/status/:id')
  dataUpdateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.dictService.updateDictData({ id: +id, status: +body.status } as UpdateDictDataDto);
  }

  // --- 原有兼容路由 ---
  @ApiOperation({ summary: '全部字典类型-下拉数据' })
  @RequirePermission('core:dict:index')
  @Get('/type/optionselect')
  findOptionselect() {
    return this.dictService.findOptionselect();
  }

  @ApiOperation({ summary: '字典类型-详情' })
  @RequirePermission('core:dict:index')
  @Get('/type/:id')
  findOneType(@Param('id') id: string) {
    return this.dictService.findOneType(+id);
  }

  @ApiOperation({ summary: '字典数据-详情' })
  @Get('/data/:id')
  findOneDictData(@Param('id') dictCode: string) {
    return this.dictService.findOneDictData(+dictCode);
  }

  @ApiOperation({ summary: '字典数据-类型-详情【走缓存】' })
  @Get('/data/type/:id')
  findOneDataType(@Param('id') dictType: string) {
    return this.dictService.findOneDataType(dictType);
  }

  @ApiOperation({ summary: '字典类型-刷新缓存' })
  @RequirePermission('core:dict:edit')
  @Delete('/type/refreshCache')
  refreshCache() {
    return this.dictService.resetDictCache();
  }
}
