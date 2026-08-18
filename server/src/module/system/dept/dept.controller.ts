import { Controller, Get, Post, Body, Put, Param, Query, Delete, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { DeptService } from './dept.service';
import { CreateDeptDto, UpdateDeptDto, ListDeptDto } from './dto/index';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { ResultData } from '../../../common/utils/result';

@ApiTags('部门管理')
@Controller('api/system/dept')
@ApiBearerAuth('Authorization')
export class DeptController {
  constructor(private readonly deptService: DeptService) {}

  @ApiOperation({ summary: '部门列表' })
  @RequirePermission('core:dept:index')
  @Get('list')
  findAll(@Query() query: ListDeptDto) {
    return this.deptService.findAll(query);
  }

  @ApiOperation({ summary: '部门树' })
  @RequirePermission('core:dept:tree')
  @Get('tree')
  async tree() {
    const tree = await this.deptService.deptTree();
    return ResultData.ok(tree);
  }

  @ApiOperation({ summary: '所有启用的部门' })
  @RequirePermission('core:dept:index')
  @Get('all-enabled')
  findAllEnabled() {
    return this.deptService.findAll({ status: 1 } as ListDeptDto);
  }

  @ApiOperation({ summary: '部门详情' })
  @RequirePermission('core:dept:read')
  @Get('detail/:id')
  findOne(@Param('id') id: string) {
    return this.deptService.findOne(+id);
  }

  @ApiOperation({ summary: '创建部门' })
  @ApiBody({ type: CreateDeptDto, required: true })
  @RequirePermission('core:dept:save')
  @Post('create')
  @HttpCode(200)
  create(@Body() createDeptDto: CreateDeptDto) {
    return this.deptService.create(createDeptDto);
  }

  @ApiOperation({ summary: '更新部门' })
  @ApiBody({ type: UpdateDeptDto, required: true })
  @RequirePermission('core:dept:update')
  @Put('update/:id')
  update(@Param('id') id: string, @Body() updateDeptDto: UpdateDeptDto) {
    updateDeptDto.id = +id;
    return this.deptService.update(updateDeptDto);
  }

  @ApiOperation({ summary: '删除部门' })
  @RequirePermission('core:dept:destroy')
  @Delete('delete/:id')
  remove(@Param('id') id: string) {
    return this.deptService.remove(+id);
  }

  @ApiOperation({ summary: '更新部门状态' })
  @RequirePermission('core:dept:update')
  @Put('status/:id')
  updateStatus(@Param('id') id: string, @Body() body: { status: number }) {
    return this.deptService.update({ id: +id, status: body.status } as UpdateDeptDto);
  }

  @ApiOperation({ summary: '子部门列表' })
  @RequirePermission('core:dept:read')
  @Get('children/:id')
  children(@Param('id') id: string) {
    return this.deptService.findListExclude(+id);
  }

  @ApiOperation({ summary: '可访问部门树' })
  @RequirePermission('core:dept:index')
  @Get('access-dept')
  async accessDept() {
    const tree = await this.deptService.getAccessDeptTree();
    return ResultData.ok(tree);
  }

  // --- 原有兼容路由 ---
  @ApiOperation({ summary: '部门管理-黑名单' })
  @RequirePermission('core:dept:read')
  @Get('/list/exclude/:id')
  findListExclude(@Param('id') id: string) {
    return this.deptService.findListExclude(+id);
  }
}
