import { Injectable, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';

import { createNumeric } from '../../common/utils/captcha';
import { ResultData, SUCCESS_CODE } from '../../common/utils/result';
import { CacheEnum } from '../../common/enum/index';
import { LOGIN_TOKEN_EXPIRESIN, ACCESS_TOKEN_EXPIRESIN } from '../../common/constant/index';
import type { ClientInfoDto } from '../../common/decorators/common.decorator';
import { RedisService } from '../../redis/redis.service';
import { UserEntity } from '../system/user/entities/sys-user.entity';
import { UploadEntity } from '../upload/entities/upload.entity';
import { LoginLogEntity } from '../monitor/loginlog/entities/loginlog.entity';
import { OperLogEntity } from '../monitor/operlog/entities/operlog.entity';
import { UserService } from '../system/user/user.service';
import { MenuService } from '../system/menu/menu.service';
import { DictService } from '../system/dict/dict.service';
import { ConfigService } from '../system/config/config.service';
import { LoginlogService } from '../monitor/loginlog/loginlog.service';
import { OperlogService } from '../monitor/operlog/operlog.service';
import { UploadService } from '../upload/upload.service';
import { RegisterDto } from './dto/index';
import { ListUserDto } from '../system/user/dto/index';

@Injectable()
export class MainService {
  constructor(
    @Inject(JwtService)
    private readonly jwtService: JwtService,
    @Inject(RedisService)
    private readonly redisService: RedisService,
    @Inject(UserService)
    private readonly userService: UserService,
    @Inject(MenuService)
    private readonly menuService: MenuService,
    @Inject(DictService)
    private readonly dictService: DictService,
    @Inject(ConfigService)
    private readonly configService: ConfigService,
    @Inject(LoginlogService)
    private readonly loginlogService: LoginlogService,
    @Inject(OperlogService)
    private readonly operlogService: OperlogService,
    @Inject(UploadService)
    private readonly uploadService: UploadService,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(UploadEntity)
    private readonly uploadRepo: Repository<UploadEntity>,
    @InjectRepository(LoginLogEntity)
    private readonly loginLogRepo: Repository<LoginLogEntity>,
    @InjectRepository(OperLogEntity)
    private readonly operLogRepo: Repository<OperLogEntity>,
  ) {}

  createCaptcha(): { text: string; data: string } {
    const captcha = createNumeric();
    return { text: captcha.text.toLowerCase(), data: captcha.data };
  }

  generateUUID(): string {
    return uuidv4().replaceAll('-', '');
  }

  async storeCaptcha(uuid: string, text: string): Promise<void> {
    await this.redisService.set(`${CacheEnum.CAPTCHA_CODE_KEY}${uuid}`, text, 5 * 60 * 1000);
  }

  /**
   * 用户登录
   * 校验验证码、用户名密码，验证通过后生成 JWT Token 并缓存用户信息至 Redis。
   * @param body - 登录请求体（含 username、password、uuid、code）
   * @param clientInfo - 客户端信息（IP、浏览器等），用于记录登录日志
   * @returns 包含 access_token 的响应结果
   */
  async login(body: any, clientInfo?: ClientInfoDto): Promise<ResultData> {
    if (clientInfo) {
      const loginLog = { ...clientInfo, status: '0', msg: '' };
      const loginRes = await this.userService.login(body, loginLog);
      loginLog.status = loginRes.code === SUCCESS_CODE ? '0' : '1';
      loginLog.msg = loginRes.msg;
      loginLog.userName = body.username || loginRes.data?.user?.username || '';
      if (loginRes.data?.userName) {
        loginLog.userName = loginRes.data.userName;
        delete loginRes.data.userName;
      }
      this.loginlogService.create(loginLog);
      return loginRes;
    }

    const { username, password, uuid, code } = body;
    if (uuid && code) {
      const cacheCode = await this.redisService.get(`${CacheEnum.CAPTCHA_CODE_KEY}${uuid}`);
      if (!cacheCode || cacheCode !== code.toLowerCase()) {
        return ResultData.fail(500, '验证码错误');
      }
      await this.redisService.del(`${CacheEnum.CAPTCHA_CODE_KEY}${uuid}`);
    }

    const user = await this.userRepo.findOne({
      where: { username, deleteTime: IsNull() },
    });
    if (!user) return ResultData.fail(500, '用户不存在');

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) return ResultData.fail(500, '密码错误');
    if (user.status === 0) return ResultData.fail(500, '用户已停用');

    const uuidToken = this.generateUUID();
    const payload = { uuid: uuidToken, userId: String(user.id) };
    const accessToken = this.jwtService.sign(payload, { expiresIn: ACCESS_TOKEN_EXPIRESIN });

    const userInfo = {
      userId: user.id,
      username: user.username,
      realname: user.realname,
      avatar: user.avatar,
      email: user.email,
      phone: user.phone,
      deptId: user.deptId,
      status: user.status,
      isSuper: user.isSuper,
    };
    await this.redisService.set(
      `${CacheEnum.LOGIN_TOKEN_KEY}${uuidToken}`,
      userInfo,
      LOGIN_TOKEN_EXPIRESIN,
    );

    return ResultData.ok({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: ACCESS_TOKEN_EXPIRESIN,
    });
  }

  /**
   * 退出登录
   * 记录登出日志，清除 Redis 中缓存的登录 Token。
   * @param req - 请求对象，用于提取 Authorization 头
   * @param clientInfo - 客户端信息
   * @param username - 当前用户名
   * @returns 操作结果
   */
  async logout(req: any, clientInfo?: ClientInfoDto, username?: string): Promise<ResultData> {
    if (clientInfo) {
      this.loginlogService.create({
        ...clientInfo,
        status: '0',
        msg: '退出成功',
        userName: username || '',
      });
    }

    const token = req.headers?.['authorization']?.replace('Bearer ', '');
    if (token) {
      try {
        const payload = this.jwtService.verify(token);
        await this.redisService.del(`${CacheEnum.LOGIN_TOKEN_KEY}${payload.uuid}`);
      } catch {
        // token 无效时忽略
      }
    }
    return ResultData.ok();
  }

  /**
   * 用户注册
   * 校验用户名唯一性，对密码进行加盐哈希后保存用户信息。
   * @param body - 注册信息（含 username、password 等）
   * @returns 操作结果
   */
  async register(body: RegisterDto | any): Promise<ResultData> {
    if (body.username && body.password && !body.realname) {
      const { username, password } = body;
      const existing = await this.userRepo.findOne({
        where: { username, deleteTime: IsNull() },
      });
      if (existing) return ResultData.fail(500, '用户名已存在');

      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(password, salt);
      await this.userRepo.save({
        username,
        password: hash,
        realname: username,
        status: 1,
      });
      return ResultData.ok();
    }
    return this.userService.register(body);
  }

  async refreshToken(body: { refreshToken?: string; authorization?: string }) {
    if (!body.refreshToken) {
      return ResultData.fail(500, '刷新令牌不能为空');
    }
    return this.userService.refreshToken(body);
  }

  async getTenantsByUsername(username: string): Promise<ResultData> {
    return this.userService.getTenantsByUsername(username);
  }

  async switchTenant(body: Record<string, any>, user: any): Promise<ResultData> {
    return this.userService.switchTenant(body, user);
  }

  /**
   * 获取当前用户菜单路由
   * 根据用户 ID 查询其拥有的菜单树。
   * @param req - 请求对象，需包含 user.userId
   * @returns 菜单树列表
   */
  async getRouters(req: any): Promise<ResultData> {
    const userId = req.user?.userId;
    if (!userId) return ResultData.fail(401, '未登录');
    const menus = await this.menuService.getMenuListByUserId(+userId);
    return ResultData.ok(menus);
  }

  /**
   * 获取当前用户信息（含权限、角色、部门、租户）。
   * 结果缓存至 Redis（键 user:profile:{userId}，TTL 与 JWT token 一致 24h），
   * 用户信息/权限/角色发生变化时自动清除。
   */
  async getCurrentUser(user: any): Promise<ResultData> {
    const userId = user.userId;
    const cacheKey = `${CacheEnum.SYS_USER_KEY}profile:${userId}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) return ResultData.ok(cached);

    const userData = await this.userService.getUserinfo(userId);
    const roles = userData.roles?.map((r: any) => r.code) || [];
    const isAdmin = userData.isSuper === 1;
    const buttons = isAdmin ? ['*'] : await this.userService.getUserPermissions(userId);
    const dept = (userData as any).dept;
    const department = dept ? { id: dept.id, name: dept.name } : null;
    const posts = (userData.posts || []).map((p: any) => ({ id: p.id, name: p.name }));

    const tenantId = (user as any).tenantId || 0;
    let tenant = null;
    if (tenantId) {
      const tenantEntity = await this.userService.getTenantInfo(tenantId);
      if (tenantEntity) {
        tenant = {
          id: tenantEntity.id,
          name: tenantEntity.tenantName,
          code: tenantEntity.tenantCode,
        };
      }
    }

    const profile = {
      id: userData.id,
      username: userData.username,
      nickname: userData.realname,
      realname: userData.realname,
      email: userData.email || '',
      phone: userData.phone || '',
      avatar: userData.avatar || '',
      gender: userData.gender || '0',
      signed: (userData as any).signed || '',
      remark: userData.remark || '',
      dashboard: userData.dashboard || 'work',
      login_time: userData.loginTime,
      login_ip: userData.loginIp || '',
      is_admin: isAdmin,
      buttons,
      roles,
      department,
      posts,
      tenant,
    };

    // TTL 与 Redis 登录会话一致（24h）
    await this.redisService.set(cacheKey, profile, LOGIN_TOKEN_EXPIRESIN);
    return ResultData.ok(profile);
  }

  /**
   * 获取当前用户权限标识列表
   * 超级管理员返回所有菜单 slug，普通用户返回其拥有的权限。
   * @param req - 请求对象，需包含 user.userId
   * @returns 权限标识数组
   */
  async getPermissions(req: any): Promise<ResultData> {
    const userId = req.user?.userId;
    if (!userId) return ResultData.fail(401, '未登录');
    const isAdmin = await this.userService.isSuperAdmin(+userId);
    if (isAdmin) {
      const allMenus = await this.menuService.findMany({
        where: { deleteTime: IsNull(), status: 1 } as any,
        select: { slug: true } as any,
      });
      const permissions = (allMenus as any[]).map((m) => m.slug).filter(Boolean);
      return ResultData.ok(permissions);
    }
    const permissions = await this.userService.getUserPermissions(+userId);
    return ResultData.ok(permissions);
  }

  async getDictAll(): Promise<ResultData> {
    const data = await this.dictService.getAllData();
    return ResultData.ok(data);
  }

  /**
   * 控制台统计
   * 统计用户数、附件数、登录日志数、操作日志数。
   * @returns 各项统计数据
   */
  async statistics(): Promise<ResultData> {
    const [userCount, attachCount, loginCount, operateCount] = await Promise.all([
      this.userRepo.count({ where: { deleteTime: IsNull() } }),
      this.uploadRepo.count({ where: { deleteTime: IsNull() } }),
      this.loginLogRepo.count({ where: { deleteTime: IsNull() } }),
      this.operLogRepo.count({ where: { deleteTime: IsNull() } }),
    ]);
    return ResultData.ok({
      user: userCount,
      attach: attachCount,
      login: loginCount,
      operate: operateCount,
    });
  }

  /**
   * 获取近 30 天登录趋势图表数据
   * 按天统计登录次数，返回日期数组与对应登录次数数组。
   * @returns 登录趋势数据（login_date、login_count）
   */
  async loginChart(): Promise<ResultData> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const rows = await this.loginLogRepo
      .createQueryBuilder('log')
      .select("DATE_FORMAT(log.loginTime, '%Y-%m-%d')", 'login_date')
      .addSelect('COUNT(*)', 'login_count')
      .where('log.loginTime >= :start', { start: thirtyDaysAgo })
      .andWhere('log.deleteTime IS NULL')
      .groupBy('login_date')
      .orderBy('login_date', 'ASC')
      .getRawMany();

    const loginDate: string[] = [];
    const loginCount: number[] = [];

    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().slice(0, 10);
      loginDate.push(dateStr);
      const found = rows.find((r) => r.login_date === dateStr);
      loginCount.push(found ? Number(found.login_count) : 0);
    }

    return ResultData.ok({ login_count: loginCount, login_date: loginDate });
  }

  /**
   * 获取近 12 个月登录柱状图数据
   * 按月统计登录次数，返回月份数组与对应登录次数数组。
   * @returns 登录柱状图数据（login_month、login_count）
   */
  async loginBarChart(): Promise<ResultData> {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const rows = await this.loginLogRepo
      .createQueryBuilder('log')
      .select("DATE_FORMAT(log.loginTime, '%Y-%m')", 'login_month')
      .addSelect('COUNT(*)', 'login_count')
      .where('log.loginTime >= :start', { start: twelveMonthsAgo })
      .andWhere('log.deleteTime IS NULL')
      .groupBy('login_month')
      .orderBy('login_month', 'ASC')
      .getRawMany();

    const loginMonth: string[] = [];
    const loginCount: number[] = [];

    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      loginMonth.push(monthStr);
      const found = rows.find((r) => r.login_month === monthStr);
      loginCount.push(found ? Number(found.login_count) : 0);
    }

    return ResultData.ok({ login_count: loginCount, login_month: loginMonth });
  }

  async getUserList(query: Record<string, any>): Promise<ResultData> {
    return this.userService.findAll(query as ListUserDto);
  }

  async getUserSelectorList(params: Record<string, any>): Promise<ResultData> {
    return this.userService.getSelectorList(params);
  }

  async getLoginLogList(query: Record<string, any>): Promise<ResultData> {
    return this.loginlogService.findAll(query);
  }

  async getOperationLogList(query: Record<string, any>): Promise<ResultData> {
    return this.operlogService.findAll(query);
  }

  async clearAllCache(): Promise<ResultData> {
    await this.redisService.reset();
    return ResultData.ok();
  }

  async getResourceCategory(query?: Record<string, any>): Promise<ResultData> {
    return this.uploadService.getCategoryList(query);
  }

  async getResourceList(query: Record<string, any>): Promise<ResultData> {
    return this.uploadService.findAll(query);
  }

  async isRegisterEnabled(): Promise<ResultData> {
    const res = await this.configService.getConfigValue('sys.account.registerUser');
    return ResultData.ok(res === 'true', '操作成功');
  }
}
