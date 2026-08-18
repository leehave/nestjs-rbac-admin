import { Controller, Get, Post, Body, Put, Param, Query, Delete, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';
import { UserService } from './user.service';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { DataScope } from '../../../common/decorators/data-scope.decorator';
import { CreateUserDto, UpdateUserDto, ListUserDto, ChangeStatusDto, ResetPwdDto, UpdateProfileDto, UpdatePwdDto, SetHomePageDto } from './dto/index';
import { ResultData } from '../../../common/utils/result';
import { User } from './user.decorator';
import type { UserDto } from './user.decorator';
import { BusinessType } from '../../../common/constant/business.constant';
import { Operlog } from '../../../common/decorators/operlog.decorator';

@ApiTags('用户管理')
@Controller('api/system/user')
@ApiBearerAuth('Authorization')
export class UserController {
  constructor(
    private readonly userService: UserService,
  ) {}

  @ApiOperation({ summary: '用户列表' })
  @RequirePermission('core:user:index')
  @DataScope('core:user:index')
  @Get('list')
  findAll(@Query() query: ListUserDto, @Req() req: Request) {
    const rawQuery = req.query as Record<string, string>;
    return this.userService.findAll({
      ...query,
      pageNum: (rawQuery.page ?? query.pageNum) as any,
      pageSize: (rawQuery.limit ?? query.pageSize) as any,
    });
  }

  @ApiOperation({ summary: '用户详情' })
  @RequirePermission('core:user:read')
  @Get('detail/:id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(+id);
  }

  @ApiOperation({ summary: '用户创建' })
  @ApiBody({ type: CreateUserDto, required: true })
  @RequirePermission('core:user:save')
  @Post('create')
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @ApiOperation({ summary: '用户更新' })
  @ApiBody({ type: UpdateUserDto, required: true })
  @RequirePermission('core:user:update')
  @Put('update/:id')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @User() user: UserDto) {
    updateUserDto.id = +id;
    return this.userService.update(updateUserDto, user.userId || user.user?.id);
  }

  @ApiOperation({ summary: '用户删除' })
  @RequirePermission('core:user:destroy')
  @Delete('delete/:id')
  remove(@Param('id') ids: string) {
    const userIds = ids.split(',').map((id) => +id);
    return this.userService.remove(userIds);
  }

  @ApiOperation({ summary: '更新用户状态' })
  @RequirePermission('core:user:update')
  @Put('status/:id')
  updateStatus(@Param('id') id: string, @Body() body: ChangeStatusDto) {
    body.id = +id;
    return this.userService.changeStatus(body);
  }

  @ApiOperation({ summary: '重置密码' })
  @RequirePermission('core:user:password')
  @Put('reset-password/:id')
  resetPassword(@Param('id') id: string, @Body() body: ResetPwdDto) {
    body.id = +id;
    return this.userService.resetPwd(body);
  }

  @ApiOperation({ summary: '修改密码' })
  @RequirePermission('core:user:password')
  @Put('change-password/:id')
  changePassword(@Param('id') id: string, @Body() body: ResetPwdDto) {
    body.id = +id;
    return this.userService.resetPwd(body);
  }

  @ApiOperation({ summary: '清除用户缓存' })
  @RequirePermission('core:user:cache')
  @Put('clear-cache/:id')
  clearCache(@Param('id') id: string) {
    return this.userService.clearCacheByUserId(+id);
  }

  @ApiOperation({ summary: '设置用户首页' })
  @RequirePermission('core:user:home')
  @Put('set-home-page/:id')
  setHomePage(@Param('id') id: string, @Body() body: SetHomePageDto) {
    return this.userService.setHomePage(+id, body);
  }

  @ApiOperation({ summary: '获取用户菜单' })
  @RequirePermission('core:user:read')
  @Get('menus/:id')
  getUserMenus(@Param('id') id: string) {
    return this.userService.getUserMenus(+id);
  }

  @ApiOperation({ summary: '保存用户菜单' })
  @RequirePermission('core:user:update')
  @Put('menus/:id')
  saveUserMenus(@Param('id') id: string, @Body() body: { menu_ids?: number[]; menuIds?: number[] }) {
    const menuIds = body.menu_ids ?? body.menuIds ?? [];
    return this.userService.saveUserMenus(+id, menuIds);
  }

  // --- 个人中心 ---
  @ApiOperation({ summary: '个人中心-用户信息' })
  @RequirePermission('core:user:read')
  @Get('/profile')
  profile(@User() user: UserDto) {
    return ResultData.ok(user.user);
  }

  @ApiOperation({ summary: '个人中心-修改用户信息' })
  @RequirePermission('core:user:update')
  @Operlog({ businessType: BusinessType.UPDATE })
  @Put('/profile')
  updateProfile(@User() user: UserDto, @Body() updateProfileDto: UpdateProfileDto) {
    return this.userService.updateProfile(user as any, updateProfileDto);
  }

  @ApiOperation({ summary: '个人中心-修改密码' })
  @RequirePermission('core:user:update')
  @Operlog({ businessType: BusinessType.UPDATE })
  @Put('/profile/updatePwd')
  updatePwd(@User() user: UserDto, @Body() updatePwdDto: UpdatePwdDto) {
    return this.userService.updatePwd(user as any, updatePwdDto);
  }

  @ApiOperation({ summary: '用户-角色+岗位' })
  @RequirePermission('core:user:save')
  @Get()
  findPostAndRoleAll() {
    return this.userService.findPostAndRoleAll();
  }

  @ApiOperation({ summary: '用户-分配角色-详情' })
  @RequirePermission('core:user:read')
  @Get('authRole/:id')
  authRole(@Param('id') id: string) {
    return this.userService.authRole(+id);
  }

  @ApiOperation({ summary: '用户-角色信息-更新' })
  @RequirePermission('core:user:update')
  @Put('authRole')
  updateAuthRole(@Query() query) {
    return this.userService.updateAuthRole(query);
  }
}
