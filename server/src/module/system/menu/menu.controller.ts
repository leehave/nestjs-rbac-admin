import { Controller, Get, Post, Body, Query, Put, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth } from '@nestjs/swagger';

import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { User } from '../user/user.decorator';
import type { UserDto } from '../user/user.decorator';
import { MenuService } from './menu.service';
import { CreateMenuDto, UpdateMenuDto, ListMenuDto } from './dto/index';

@ApiTags('菜单管理')
@Controller('api/system/menu')
@ApiBearerAuth('Authorization')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @ApiOperation({ summary: '菜单列表' })
  @RequirePermission('core:menu:index')
  @Get('list')
  findAll(@Query() query: ListMenuDto) {
    return this.menuService.findAll(query);
  }

  @ApiOperation({ summary: '菜单树' })
  @RequirePermission('core:menu:index')
  @Get('tree')
  tree() {
    return this.menuService.treeSelect();
  }

  @ApiOperation({ summary: '用户菜单树' })
  @Get('user-tree')
  userTree(@User() user: UserDto) {
    return this.menuService.getMenuListByUserId(+user.userId);
  }

  @ApiOperation({ summary: '用户权限' })
  @Get('user-permissions')
  userPermissions(@User() user: UserDto) {
    return { permissions: user.permissions || [] };
  }

  @ApiOperation({ summary: '权限树' })
  @Get('permission-tree')
  permissionTree() {
    return this.menuService.treeSelect();
  }

  @ApiOperation({ summary: '可访问菜单树' })
  @RequirePermission('core:menu:index')
  @Get('access-menu')
  accessMenu() {
    return this.menuService.treeSelect();
  }

  @ApiOperation({ summary: '菜单详情' })
  @RequirePermission('core:menu:read')
  @Get('detail/:id')
  findOne(@Param('id') id: string) {
    return this.menuService.findOne(+id);
  }

  @ApiOperation({ summary: '创建菜单' })
  @ApiBody({ type: CreateMenuDto, required: true })
  @RequirePermission('core:menu:save')
  @Post('create')
  create(@Body() createMenuDto: CreateMenuDto) {
    return this.menuService.create(createMenuDto);
  }

  @ApiOperation({ summary: '更新菜单' })
  @ApiBody({ type: UpdateMenuDto, required: true })
  @RequirePermission('core:menu:update')
  @Put('update/:id')
  update(@Param('id') id: string, @Body() updateMenuDto: UpdateMenuDto) {
    updateMenuDto.id = +id;
    return this.menuService.update(updateMenuDto);
  }

  @ApiOperation({ summary: '删除菜单' })
  @RequirePermission('core:menu:destroy')
  @Delete('delete/:id')
  remove(@Param('id') id: string) {
    return this.menuService.remove(+id);
  }

  @ApiOperation({ summary: '更新菜单状态' })
  @RequirePermission('core:menu:update')
  @Put('status/:id')
  updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.menuService.update({ id: +id, status: +body.status } as UpdateMenuDto);
  }

  @ApiOperation({ summary: '可分配菜单树' })
  @RequirePermission('core:menu:index')
  @Get('assignable-tree')
  assignableTree() {
    return this.menuService.treeSelect();
  }

  @ApiOperation({ summary: '菜单管理-树表' })
  @RequirePermission('core:menu:index')
  @Get('/treeselect')
  treeSelect() {
    return this.menuService.treeSelect();
  }

  @ApiOperation({ summary: '菜单管理-角色-树表' })
  @RequirePermission('core:menu:read')
  @Get('/roleMenuTreeselect/:menuId')
  roleMenuTreeselect(@Param('menuId') menuId: string) {
    return this.menuService.roleMenuTreeselect(+menuId);
  }
}
