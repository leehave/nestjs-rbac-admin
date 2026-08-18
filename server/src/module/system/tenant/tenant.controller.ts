import { Controller, Get, Post, Body, Put, Param, Query, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantService } from './tenant.service';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';

@ApiTags('租户管理')
@Controller('api/system/tenant')
@ApiBearerAuth('Authorization')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @ApiOperation({ summary: '租户列表' })
  @RequirePermission('core:tenant:index')
  @Get('list')
  findAll(@Query() query: Record<string, any>) {
    return this.tenantService.findAll(query);
  }

  @ApiOperation({ summary: '租户详情' })
  @RequirePermission('core:tenant:read')
  @Get('detail/:id')
  findOne(@Param('id') id: string) {
    return this.tenantService.findOne(+id);
  }

  @ApiOperation({ summary: '创建租户' })
  @RequirePermission('core:tenant:save')
  @Post('create')
  create(@Body() body: Record<string, any>) {
    return this.tenantService.create(body);
  }

  @ApiOperation({ summary: '更新租户' })
  @RequirePermission('core:tenant:update')
  @Put('update/:id')
  update(@Param('id') id: string, @Body() body: Record<string, any>) {
    body.id = +id;
    return this.tenantService.update(body);
  }

  @ApiOperation({ summary: '删除租户' })
  @RequirePermission('core:tenant:destroy')
  @Delete('delete/:id')
  remove(@Param('id') ids: string) {
    const idList = ids.split(',').map((id) => +id);
    return this.tenantService.remove(idList);
  }

  @ApiOperation({ summary: '更新租户状态' })
  @RequirePermission('core:tenant:update')
  @Put('status/:id')
  updateStatus(@Param('id') id: string, @Body() body: { status: number }) {
    return this.tenantService.updateStatus(+id, body.status);
  }

  @ApiOperation({ summary: '租户用户列表' })
  @RequirePermission('core:tenant:read')
  @Get('users/:id')
  users(@Param('id') id: string, @Query() query: Record<string, any>) {
    return this.tenantService.getUsers(+id, query);
  }

  @ApiOperation({ summary: '可添加的用户列表' })
  @RequirePermission('core:tenant:read')
  @Get('available-users/:id')
  availableUsers(@Param('id') id: string, @Query() query: Record<string, any>) {
    return this.tenantService.getAvailableUsers(+id, query);
  }

  @ApiOperation({ summary: '添加用户到租户' })
  @RequirePermission('core:tenant:update')
  @Post('add-users/:id')
  addUsers(@Param('id') id: string, @Body() body: { userIds?: number[]; user_ids?: number[] }) {
    const userIds = body.user_ids ?? body.userIds ?? [];
    return this.tenantService.addUsers(+id, userIds.map((uid) => Number(uid)));
  }

  @ApiOperation({ summary: '从租户移除用户' })
  @RequirePermission('core:tenant:update')
  @Delete('remove-user/:id/:userId')
  removeUser(@Param('id') id: string, @Param('userId') userId: string) {
    return this.tenantService.removeUser(+id, +userId);
  }

  @ApiOperation({ summary: '设置租户管理员' })
  @RequirePermission('core:tenant:update')
  @Put('set-admin/:id/:userId')
  setTenantAdmin(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() body: { is_super?: number; isSuper?: number },
  ) {
    const isSuper = body.is_super ?? body.isSuper ?? 0;
    return this.tenantService.setAdmin(+id, +userId, Number(isSuper));
  }

  @ApiOperation({ summary: '设置默认租户' })
  @RequirePermission('core:tenant:update')
  @Put('set-default/:id/:userId')
  setDefaultTenant(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() body: { is_default?: number; isDefault?: number },
  ) {
    const isDefault = body.is_default ?? body.isDefault ?? 0;
    return this.tenantService.setDefault(+id, +userId, Number(isDefault));
  }
}
