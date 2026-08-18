import { Controller, Get, Post, Body, Query, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';

import { MainService } from './main.service';
import { ResultData } from '../../common/utils/result';
import { NotRequireAuth, ClientInfo } from '../../common/decorators/common.decorator';
import { Public } from '../../common/decorators/auth.decorator';
import { DataScope } from '../../common/decorators/data-scope.decorator';
import type { ClientInfoDto } from '../../common/decorators/common.decorator';
import { User } from '../system/user/user.decorator';
import type { UserDto } from '../system/user/user.decorator';
import { RegisterDto } from './dto/index';
import { UserService } from '../system/user/user.service';
import { MenuService } from '../system/menu/menu.service';
import { ConfigService } from '../system/config/config.service';

@ApiTags('系统接口')
@ApiBearerAuth('Authorization')
@Controller('api')
export class MainController {
  constructor(
    private readonly mainService: MainService,
    private readonly userService: UserService,
    private readonly menuService: MenuService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 获取验证码
   * 生成图形验证码并返回 base64 图片数据，同时将验证码文本缓存至 Redis。
   * @returns 包含验证码 UUID 和 base64 图片数据的响应结果
   */
  @Public()
  @Get('core/captcha')
  @ApiOperation({ summary: '获取验证码' })
  async captcha() {
    const { text, data } = this.mainService.createCaptcha();
    const uuid = this.mainService.generateUUID();
    await this.mainService.storeCaptcha(uuid, text);
    const imageBase64 = Buffer.from(data).toString('base64');
    return ResultData.ok({
      result: 1,
      uuid,
      image: `data:image/svg+xml;base64,${imageBase64}`,
    }, 'success');
  }

  @Public()
  @Post('core/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '登录' })
  async login(@Req() req: Request, @ClientInfo() clientInfo: ClientInfoDto) {
    const body = { ...(req.query as any), ...(req.body || {}) };
    return this.mainService.login(body, clientInfo);
  }

  @NotRequireAuth()
  @Post('core/logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '退出登录' })
  async logout(@Req() req: Request, @User() user: UserDto, @ClientInfo() clientInfo: ClientInfoDto) {
    const body: any = req.body || {};
    const username = user?.user?.username || clientInfo.userName || body.username || '';
    return this.mainService.logout(req, clientInfo, username);
  }

  @Public()
  @Post('core/register')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '注册' })
  async register(@Body() body: RegisterDto) {
    return this.mainService.register(body);
  }

  @Public()
  @Get('core/tenants-by-username')
  @ApiOperation({ summary: '根据用户名获取租户列表' })
  async getTenantsByUsername(@Query('username') username: string) {
    return this.mainService.getTenantsByUsername(username);
  }

  @Public()
  @Post('core/refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '刷新Token' })
  async refreshToken(@Req() req: Request, @Body() body: { refreshToken?: string }) {
    return this.mainService.refreshToken({
      ...body,
      authorization: req.get('Authorization') || '',
    });
  }

  @Post('core/switch-tenant')
  @ApiOperation({ summary: '切换租户' })
  async switchTenant(@Body() body: any, @User() user: UserDto) {
    return this.mainService.switchTenant(body, user);
  }

  @Get('core/system/user')
  @ApiOperation({ summary: '获取当前用户信息' })
  async getCurrentUser(@User() user: UserDto) {
    return this.mainService.getCurrentUser(user);
  }

  @Get('core/system/menu')
  @ApiOperation({ summary: '获取当前用户菜单' })
  async getRouters(@User() user: UserDto) {
    return this.mainService.getRouters({ user: { userId: user.userId } });
  }

  @Get('core/system/permissions')
  @ApiOperation({ summary: '获取当前用户权限' })
  async getPermissions(@User() user: UserDto) {
    return this.mainService.getPermissions({ user: { userId: user.userId } });
  }

  @Get('core/system/dictAll')
  @ApiOperation({ summary: '获取所有字典数据' })
  async dictAll() {
    return this.mainService.getDictAll();
  }

  @Get('core/system/statistics')
  @ApiOperation({ summary: '控制台统计' })
  async statistics() {
    return this.mainService.statistics();
  }

  @Get('core/system/loginChart')
  @ApiOperation({ summary: '登录图表数据' })
  async loginChart() {
    return this.mainService.loginChart();
  }

  @Get('core/system/loginBarChart')
  @ApiOperation({ summary: '登录柱状图' })
  async loginBarChart() {
    return this.mainService.loginBarChart();
  }

  @Get('core/system/getUserList')
  @ApiOperation({ summary: '用户列表' })
  @DataScope('core:user:index')
  async getUserList(@Query() query: Record<string, any>) {
    return this.mainService.getUserList(query);
  }

  @Get('core/system/getUserSelectorList')
  @ApiOperation({ summary: '用户选择器列表' })
  async getUserSelectorList(@Query() query: Record<string, any>) {
    return this.mainService.getUserSelectorList(query);
  }

  @Get('core/system/getLoginLogList')
  @ApiOperation({ summary: '登录日志列表' })
  async getLoginLogList(@Query() query: Record<string, any>) {
    return this.mainService.getLoginLogList(query);
  }

  @Get('core/system/getOperationLogList')
  @ApiOperation({ summary: '操作日志列表' })
  async getOperationLogList(@Query() query: Record<string, any>) {
    return this.mainService.getOperationLogList(query);
  }

  @Get('core/system/clearAllCache')
  @ApiOperation({ summary: '清除所有缓存' })
  async clearAllCache() {
    return this.mainService.clearAllCache();
  }

  @Post('core/user/updateInfo')
  @ApiOperation({ summary: '个人中心-修改用户信息' })
  async coreUpdateInfo(@User() user: UserDto, @Body() body: any) {
    return this.userService.updateProfile(user as any, body);
  }

  @Post('core/user/modifyPassword')
  @ApiOperation({ summary: '个人中心-修改密码' })
  async coreModifyPassword(
    @User() user: UserDto,
    @Body() body: { oldPassword: string; newPassword: string },
  ) {
    return this.userService.updatePwd(user as any, body);
  }

  @Get('core/system/getResourceCategory')
  @ApiOperation({ summary: '资源分类列表' })
  async getResourceCategory(@Query() query: Record<string, any>) {
    return this.mainService.getResourceCategory(query);
  }

  @Get('core/system/getResourceList')
  @ApiOperation({ summary: '资源列表' })
  async getResourceList(@Query() query: Record<string, any>) {
    return this.mainService.getResourceList(query);
  }

  @Public()
  @Get('core/registerUser')
  @ApiOperation({ summary: '注册（是否开启注册）' })
  async registerUser() {
    return this.mainService.isRegisterEnabled();
  }
}
