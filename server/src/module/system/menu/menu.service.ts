import { Injectable, Inject, Logger, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, In, IsNull } from 'typeorm';

import { ResultData } from '../../../common/utils/result';
import { listToTree, uniq } from '../../../common/utils/index';
import { CacheEnum } from '../../../common/enum/index';
import { getTenantId } from '../../../common/utils/tenant.util';
import { RedisService } from '../../../redis/redis.service';
import type { UserService } from '../user/user.service';
import { SysMenuEntity } from './entities/menu.entity';
import { SysRoleMenuEntity } from '../role/entities/role-width-menu.entity';
import { SysRoleMenuFilterEntity } from '../role/entities/role-width-menu-filter.entity';
import { CreateMenuDto, UpdateMenuDto, ListMenuDto } from './dto/index';

@Injectable()
export class MenuService {
  private readonly logger = new Logger(MenuService.name);
  constructor(
    @Inject(forwardRef(() => require('../user/user.service').UserService))
    private readonly userService: UserService,
    @InjectRepository(SysMenuEntity)
    private readonly sysMenuEntityRep: Repository<SysMenuEntity>,
    @InjectRepository(SysRoleMenuEntity)
    private readonly sysRoleWithMenuEntityRep: Repository<SysRoleMenuEntity>,
    @InjectRepository(SysRoleMenuFilterEntity)
    private readonly sysRoleMenuFilterEntityRep: Repository<SysRoleMenuFilterEntity>,
    private readonly redisService: RedisService,
  ) {}

  /**
   * 查询菜单列表（树形结构）
   * @param query - 查询条件（名称、路径、状态）
   * @returns 返回菜单树数据，若未传入筛选条件则返回完整树，否则返回过滤后的树
   */
  async findAll(query: ListMenuDto) {
    const entity = this.sysMenuEntityRep.createQueryBuilder('entity');
    entity.where('entity.deleteTime IS NULL');
    entity.orderBy('entity.sort', 'ASC');
    const menus = await entity.getMany();

    const rows = menus.map((menu) => this.formatMenu(menu));
    const tree = this.buildMenuTree(rows);

    const hasFilter =
      !!query.name ||
      !!query.path ||
      (query.status !== undefined && query.status !== null && `${query.status}` !== '');

    if (!hasFilter) {
      return ResultData.ok(tree);
    }

    return ResultData.ok(this.filterMenuTree(tree, query));
  }

  /**
   * 格式化菜单实体为前端所需结构
   * @param menu - 菜单实体对象
   * @returns 返回扁平化的菜单对象，包含 id、parent_id、label、value 等字段
   */
  private formatMenu(menu: SysMenuEntity) {
    return {
      id: Number(menu.id),
      parent_id: Number(menu.parentId ?? 0),
      name: menu.name,
      code: menu.code,
      slug: menu.slug,
      type: menu.type,
      path: menu.path,
      component: menu.component,
      method: menu.method,
      icon: menu.icon,
      sort: menu.sort,
      link_url: menu.linkUrl,
      is_iframe: menu.isIframe,
      is_keep_alive: menu.isKeepAlive,
      is_hidden: menu.isHidden,
      is_fixed_tab: menu.isFixedTab,
      is_full_page: menu.isFullPage,
      is_data_permission: menu.isDataPermission,
      status: menu.status,
      remark: menu.remark,
      create_time: menu.createTime,
      update_time: menu.updateTime,
      value: Number(menu.id),
      label: menu.name,
    };
  }

  /**
   * 将扁平菜单列表递归构建为树形结构
   * @param list - 扁平菜单列表
   * @param parentId - 父级 ID，默认从 0（根节点）开始
   * @returns 树形菜单数组
   */
  private buildMenuTree(list: any[], parentId = 0): any[] {
    const tree: any[] = [];
    for (const item of list) {
      if (Number(item.parent_id) === parentId) {
        const children = this.buildMenuTree(list, Number(item.id));
        const node = { ...item, value: item.id, label: item.name };
        if (children.length) {
          node.children = children;
        }
        tree.push(node);
      }
    }
    return tree;
  }

  /**
   * 根据查询条件递归过滤菜单树
   * @param tree - 完整的菜单树
   * @param query - 查询条件（名称、路径、状态）
   * @returns 过滤后的菜单树，节点若无匹配且无子节点则被移除
   */
  private filterMenuTree(tree: any[], query: ListMenuDto): any[] {
    const name = query.name || '';
    const path = (query as any).path || '';
    const status = query.status;
    const result: any[] = [];

    for (const item of tree) {
      const nameMatch = !name || String(item.name || '').includes(name);
      const pathMatch = !path || String(item.path || '').includes(path);
      const statusMatch =
        status === undefined ||
        status === null ||
        `${status}` === '' ||
        Number(item.status) === Number(status);
      const selfMatch = nameMatch && pathMatch && statusMatch;

      if (item.children?.length) {
        item.children = this.filterMenuTree(item.children, query);
      }

      if (selfMatch || item.children?.length) {
        result.push(item);
      }
    }

    return result;
  }

  /**
   * 将 DTO 对象映射为菜单实体字段格式
   * @param dto - 传入的 DTO 对象（可能包含下划线或驼峰命名字段）
   * @returns 映射后的标准菜单实体字段对象
   */
  private mapMenuDto(dto: Record<string, any>) {
    return {
      name: dto.name,
      code: dto.code,
      slug: dto.slug,
      type: dto.type,
      path: dto.path,
      component: dto.component,
      icon: dto.icon,
      sort: dto.sort,
      status: dto.status,
      remark: dto.remark,
      parentId: dto.parent_id ?? dto.parentId ?? 0,
      linkUrl: dto.link_url ?? dto.linkUrl,
      isIframe: dto.is_iframe ?? dto.isIframe,
      isKeepAlive: dto.is_keep_alive ?? dto.isKeepAlive,
      isHidden: dto.is_hidden ?? dto.isHidden,
      isFixedTab: dto.is_fixed_tab ?? dto.isFixedTab,
      isFullPage: dto.is_full_page ?? dto.isFullPage,
      isDataPermission: dto.is_data_permission ?? dto.isDataPermission,
    };
  }

  async create(createMenuDto: CreateMenuDto) {
    const res = await this.sysMenuEntityRep.save(this.mapMenuDto(createMenuDto));
    await this.clearMenuCache();
    return ResultData.ok(res);
  }

  async treeSelect() {
    const res = await this.sysMenuEntityRep.find({
      where: { deleteTime: IsNull() },
      order: { sort: 'ASC' },
    });
    const rows = res.map((menu) => this.formatMenu(menu));
    return ResultData.ok(this.buildMenuTree(rows));
  }

  /**
   * 在菜单树上补充数据权限字段：data_permission（是否开启数据权限）与 filter_type（角色阈值）。
   * @param tree - 菜单树
   * @param dataPermissionMap - 菜单ID -> is_data_permission
   * @param filterMap - 菜单ID -> filter_type
   */
  private decorateMenuTree(
    tree: any[],
    dataPermissionMap: Map<number, number>,
    filterMap: Map<number, number>,
  ): any[] {
    return tree.map((node) => {
      const id = Number(node.id);
      const children = node.children
        ? this.decorateMenuTree(node.children, dataPermissionMap, filterMap)
        : undefined;
      return {
        ...node,
        is_data_permission: dataPermissionMap.get(id) ?? 0,
        filter_type: filterMap.get(id) ?? 0,
        ...(children?.length ? { children } : {}),
      };
    });
  }

  /**
   * 获取指定角色的菜单树及已选中的菜单 ID 列表
   * @param roleId - 角色 ID
   * @returns 返回菜单树和已勾选的菜单 ID 数组
   */
  async roleMenuTreeselect(roleId: number): Promise<any> {
    const res = await this.sysMenuEntityRep.find({
      where: { deleteTime: IsNull() },
      order: { sort: 'ASC', parentId: 'ASC' },
    });
    const dataPermissionMap = new Map(res.map((m) => [Number(m.id), Number(m.isDataPermission ?? 0)]));
    const filterList = await this.sysRoleMenuFilterEntityRep.find({ where: { roleId } });
    const filterMap = new Map(filterList.map((item) => [Number(item.menuId), Number(item.filterType)]));
    const tree = this.decorateMenuTree(
      listToTree(
        res,
        (m) => m.id,
        (m) => m.name,
      ),
      dataPermissionMap,
      filterMap,
    );
    const menuIds = await this.sysRoleWithMenuEntityRep.find({
      where: { roleId },
      select: { menuId: true },
    });
    const checkedKeys = menuIds.map((item) => Number(item.menuId));
    return ResultData.ok({ menus: tree, checkedKeys });
  }

  /**
   * 根据菜单 ID 查询单条菜单详情
   * @param menuId - 菜单 ID
   * @returns 菜单详情数据，若不存在则返回 404 错误
   */
  async findOne(menuId: number) {
    const res = await this.sysMenuEntityRep.findOne({
      where: { deleteTime: IsNull(), id: menuId },
    });
    if (!res) {
      return ResultData.fail(404, '菜单不存在');
    }
    return ResultData.ok(this.formatMenu(res));
  }

  async update(updateMenuDto: UpdateMenuDto) {
    const { id, ...dto } = updateMenuDto;
    const res = await this.sysMenuEntityRep.update({ id }, this.mapMenuDto(dto));
    await this.clearMenuCache();
    return ResultData.ok(res);
  }

  async remove(menuId: number) {
    await this.sysMenuEntityRep.softDelete(menuId);
    await this.clearMenuCache();
    return ResultData.ok();
  }

  async findMany(where: FindManyOptions<SysMenuEntity>) {
    return this.sysMenuEntityRep.find(where);
  }

  /**
   * 根据用户 ID 获取其可见的菜单列表（带缓存）
   * - 超级管理员直接返回所有启用的菜单
   * - 普通用户根据角色关联的菜单查询
   * - 结果递归展开父节点 ID 并构建为树形结构后缓存
   * @param userId - 用户 ID
   * @param tenantId - 租户 ID（可选）
   * @returns 树形菜单数组
   */
  async getMenuListByUserId(userId: number, tenantId?: number) {
    const tid = tenantId ?? getTenantId() ?? 0;
    const cacheKey = `${CacheEnum.SYS_MENU_KEY}${tid}:${userId}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) return cached;

    const userMenuWhere = {
      deleteTime: IsNull(),
      status: 1,
      type: In([1, 2, 4]),
    };

    let menuWidthRoleList: Array<{ menuId?: number; id?: number }> = [];
    const isSuper = await this.userService.isSuperAdmin(userId);
    if (isSuper) {
      menuWidthRoleList = await this.sysMenuEntityRep.find({
        where: userMenuWhere,
        select: { id: true },
      });
    } else {
      const roleIds = await this.userService.getRoleIds([userId]);
      menuWidthRoleList = await this.sysRoleWithMenuEntityRep.find({
        where: { roleId: In(roleIds) },
        select: { menuId: true },
      });
    }

    let menuIds = uniq(menuWidthRoleList.map((item) => item.menuId || item.id).filter((id): id is number => id !== undefined));
    if (!menuIds.length) {
      return [];
    }

    if (!isSuper) {
      menuIds = await this.expandWithParentIds(menuIds);
    }

    const menuList = await this.sysMenuEntityRep.find({
      where: { ...userMenuWhere, id: In(menuIds) },
      order: { sort: 'ASC' },
    });

    const rows = menuList.map((menu) => this.formatMenu(menu));
    const tree = this.buildMenuTree(rows);
    await this.redisService.set(cacheKey, tree, 7200 * 1000);
    return tree;
  }

  async tree() {
    const res = await this.sysMenuEntityRep.find({
      where: { deleteTime: IsNull() },
      order: { sort: 'ASC' },
    });
    return ResultData.ok(
      listToTree(
        res,
        (m) => m.id,
        (m) => m.name,
      ),
    );
  }

  async userTree(userId: number) {
    const roleIds = await this.userService.getRoleIds([userId]);
    if (roleIds.includes(1)) {
      return this.tree();
    }
    const menus = await this.getMenuListByUserId(userId);
    return ResultData.ok(menus);
  }

  async userPermissions(userId: number) {
    return this.userService.getUserPermissions(userId);
  }

  /**
   * 递归展开菜单 ID 列表，补充所有祖先节点 ID
   * @param menuIds - 菜单 ID 数组
   * @returns 包含自身及所有祖先节点 ID 的去重数组
   */
  async expandWithParentIds(menuIds: number[]) {
    if (!menuIds?.length) {
      return [];
    }

    const allIds = new Set<number>();
    for (const menuId of menuIds) {
      allIds.add(+menuId);
      let current = await this.sysMenuEntityRep.findOne({
        where: { id: +menuId, deleteTime: IsNull() },
        select: { id: true, parentId: true },
      });
      while (current && Number(current.parentId) > 0) {
        allIds.add(Number(current.parentId));
        current = await this.sysMenuEntityRep.findOne({
          where: { id: Number(current.parentId), deleteTime: IsNull() },
          select: { id: true, parentId: true },
        });
      }
    }

    return Array.from(allIds);
  }

  /**
   * 获取指定角色的权限树（仅启用的菜单）
   * @param roleId - 角色 ID
   * @returns 菜单树及已勾选的权限 ID 列表
   */
  async permissionTree(roleId: number) {
    const res = await this.sysMenuEntityRep.find({
      where: { deleteTime: IsNull(), status: 1 },
      order: { sort: 'ASC' },
    });
    const dataPermissionMap = new Map(res.map((m) => [Number(m.id), Number(m.isDataPermission ?? 0)]));
    const filterList = await this.sysRoleMenuFilterEntityRep.find({ where: { roleId } });
    const filterMap = new Map(filterList.map((item) => [Number(item.menuId), Number(item.filterType)]));
    const tree = this.decorateMenuTree(
      listToTree(
        res,
        (m) => m.id,
        (m) => m.name,
      ),
      dataPermissionMap,
      filterMap,
    );
    const menuIds = await this.sysRoleWithMenuEntityRep.find({
      where: { roleId },
      select: { menuId: true },
    });
    const checkedKeys = menuIds.map((item) => Number(item.menuId));
    return ResultData.ok({ menus: tree, checkedKeys });
  }

  /** 清除所有租户、所有用户的菜单缓存 */
  private async clearMenuCache(): Promise<void> {
    try {
      const keys = await this.redisService.keys(`${CacheEnum.SYS_MENU_KEY}*`);
      if (keys?.length) {
        await this.redisService.del(keys);
        this.logger.log(`菜单缓存已清除，共 ${keys.length} 个键`);
      }
    } catch (err) {
      this.logger.warn(`清除菜单缓存失败: ${(err as Error)?.message}`);
    }
  }

  async assignableTree() {
    return this.tree();
  }
}
