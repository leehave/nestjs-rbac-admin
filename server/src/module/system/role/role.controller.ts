import { Controller, Get, Post, Body, Put, Param, Query, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { RoleService } from './role.service';
import { CreateRoleDto, UpdateRoleDto, ListRoleDto, ChangeRoleStatusDto } from './dto/index';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { UserService } from '../user/user.service';
import { User } from '../user/user.decorator';
import type { UserDto } from '../user/user.decorator';

@ApiTags('角色管理')
@Controller('api/system/role')
@ApiBearerAuth('Authorization')
export class RoleController {
  constructor(
    private readonly roleService: RoleService,
    private readonly userService: UserService,
  ) {}

  @ApiOperation({ summary: '角色列表' })
  @RequirePermission('core:role:index')
  @Get('list')
  findAll(@Query() query: ListRoleDto, @User() user: UserDto) {
    return this.roleService.findAll(query);
  }

  @ApiOperation({ summary: '所有角色' })
  @RequirePermission('core:role:index')
  @Get('all')
  findAllRoles() {
    return this.roleService.getAccessRoleList();
  }

  @ApiOperation({ summary: '角色树' })
  @RequirePermission('core:role:index')
  @Get('tree')
  tree() {
    return this.roleService.findAll({});
  }

  @ApiOperation({ summary: '角色详情' })
  @RequirePermission('core:role:read')
  @Get('detail/:id')
  findOne(@Param('id') id: string) {
    return this.roleService.findOne(+id);
  }

  @ApiOperation({ summary: '创建角色' })
  @ApiBody({ type: CreateRoleDto, required: true })
  @RequirePermission('core:role:save')
  @Post('create')
  create(@Body() createRoleDto: CreateRoleDto) {
    return this.roleService.create(createRoleDto);
  }

  @ApiOperation({ summary: '更新角色' })
  @ApiBody({ type: UpdateRoleDto, required: true })
  @RequirePermission('core:role:update')
  @Put('update/:id')
  update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    updateRoleDto.id = +id;
    return this.roleService.update(updateRoleDto);
  }

  @ApiOperation({ summary: '删除角色' })
  @RequirePermission('core:role:destroy')
  @Delete('delete/:id')
  remove(@Param('id') ids: string) {
    const roleIds = ids.split(',').map((id) => +id);
    return this.roleService.remove(roleIds);
  }

  @ApiOperation({ summary: '更新角色状态' })
  @RequirePermission('core:role:update')
  @Put('status/:id')
  updateStatus(@Param('id') id: string, @Body() body: ChangeRoleStatusDto) {
    body.id = +id;
    return this.roleService.changeStatus(body);
  }

  @ApiOperation({ summary: '分配菜单权限' })
  @RequirePermission('core:role:menu')
  @Put('assign-menus/:id')
  assignMenus(
    @Param('id') id: string,
    @Body() body: { menu_ids?: number[]; menu_filters?: Array<{ menu_id: number; filter_type: number }> },
  ) {
    return this.roleService.update({ id: +id, menu_ids: body.menu_ids, menu_filters: body.menu_filters } as UpdateRoleDto);
  }

  @ApiOperation({ summary: '可访问角色' })
  @RequirePermission('core:role:index')
  @Get('access-role')
  accessRole() {
    return this.roleService.getAccessRoleList();
  }

  @ApiOperation({ summary: '根据角色获取菜单' })
  @RequirePermission('core:role:read')
  @Get('menu-by-role/:id')
  menuByRole(@Param('id') id: string) {
    return this.roleService.menuByRole(+id);
  }

  @ApiOperation({ summary: '菜单权限' })
  @RequirePermission('core:role:menu')
  @Put('menu-permission/:id')
  menuPermission(
    @Param('id') id: string,
    @Body() body: { menu_ids?: number[]; menu_filters?: Array<{ menu_id: number; filter_type: number }> },
  ) {
    return this.roleService.update({ id: +id, menu_ids: body.menu_ids, menu_filters: body.menu_filters } as UpdateRoleDto);
  }

  // --- 原有兼容路由 ---
  @ApiOperation({ summary: '角色管理-部门树' })
  @RequirePermission('core:role:update')
  @Get('deptTree/:id')
  deptTree(@Param('id') id: string) {
    return this.roleService.deptTree(+id);
  }

  @ApiOperation({ summary: '角色管理-数据权限修改' })
  @RequirePermission('core:role:update')
  @Put('dataScope')
  dataScope(@Body() updateRoleDto: UpdateRoleDto) {
    return this.roleService.dataScope(updateRoleDto);
  }

  @ApiOperation({ summary: '角色管理-角色已分配用户列表' })
  @RequirePermission('core:role:read')
  @Get('authUser/allocatedList')
  authUserAllocatedList(@Query() query) {
    return this.userService.allocatedList(query);
  }

  @ApiOperation({ summary: '角色管理-角色未分配用户列表' })
  @RequirePermission('core:role:read')
  @Get('authUser/unallocatedList')
  authUserUnAllocatedList(@Query() query) {
    return this.userService.unallocatedList(query);
  }

  @ApiOperation({ summary: '角色管理-解绑角色' })
  @RequirePermission('core:role:update')
  @Put('authUser/cancel')
  authUserCancel(@Body() body) {
    return this.userService.authUserCancel(body);
  }

  @ApiOperation({ summary: '角色管理-批量选择用户授权' })
  @RequirePermission('core:role:update')
  @Put('authUser/selectAll')
  authUserSelectAll(@Body() body) {
    return this.userService.authUserSelectAll(body);
  }

  @ApiOperation({ summary: '角色管理-批量取消用户授权' })
  @RequirePermission('core:role:update')
  @Put('authUser/cancelAll')
  authUserCancelAll(@Body() body) {
    return this.userService.authUserCancelAll(body);
  }
}
