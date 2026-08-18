import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';

import { UserEntity } from '../user/entities/sys-user.entity';
import { SysUserRoleEntity } from '../user/entities/user-width-role.entity';
import { SysRoleMenuEntity } from '../role/entities/role-width-menu.entity';
import { SysRoleMenuFilterEntity } from '../role/entities/role-width-menu-filter.entity';
import { SysMenuEntity } from '../menu/entities/menu.entity';
import { SysDeptEntity } from '../dept/entities/dept.entity';

/**
 * DataPermissionService — 数据权限解析（等价 Camelus 的 OaDataPermissionSupport）。
 * 将某个菜单(slug)在用户身上的数据权限阈值(filterType)解析为 userId 集合。
 *
 * filterType：0=仅自己 1=自己和下属 2=无（无限制）。
 */
@Injectable()
export class DataPermissionService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userEntityRep: Repository<UserEntity>,
    @InjectRepository(SysUserRoleEntity)
    private readonly sysUserRoleEntityRep: Repository<SysUserRoleEntity>,
    @InjectRepository(SysRoleMenuEntity)
    private readonly sysRoleMenuEntityRep: Repository<SysRoleMenuEntity>,
    @InjectRepository(SysRoleMenuFilterEntity)
    private readonly sysRoleMenuFilterEntityRep: Repository<SysRoleMenuFilterEntity>,
    @InjectRepository(SysMenuEntity)
    private readonly sysMenuEntityRep: Repository<SysMenuEntity>,
    @InjectRepository(SysDeptEntity)
    private readonly sysDeptEntityRep: Repository<SysDeptEntity>,
  ) {}

  /**
   * 解析用户在某菜单(slug)下的数据权限阈值（复刻 OaDataPermissionSupport.getPermissionScope）。
   * 超管或用户不存在 → 2（无限制）；匹配到的菜单 is_data_permission 关闭 → 2；
   * 否则取匹配 (roleId, menuId) 的 filter_type 最大值（最宽松者生效，默认 0）。
   */
  async getPermissionScope(userId: number, slug: string, tenantId?: number): Promise<number> {
    const user = await this.userEntityRep.findOne({
      where: { id: userId, deleteTime: IsNull() },
    });
    if (!user || user.isSuper === 1) return 2;

    const userRoles = await this.sysUserRoleEntityRep.find({
      where: { userId, ...(tenantId != null ? { tenantId } : {}) },
    });
    const roleIds = [...new Set(userRoles.map((r) => Number(r.roleId)))];

    let permission = 0;
    let matched = false;
    for (const roleId of roleIds) {
      const roleMenus = await this.sysRoleMenuEntityRep.find({ where: { roleId } });
      const menuIds = roleMenus.map((m) => Number(m.menuId));
      if (menuIds.length === 0) continue;

      const menus = await this.sysMenuEntityRep.find({
        where: { id: In(menuIds), slug, status: 1, deleteTime: IsNull() },
      });

      for (const menu of menus) {
        matched = true;
        if (!menu.isDataPermission) {
          // 该资源关闭数据权限 → 立即无限制（最宽松者生效）
          return 2;
        }
        const filter = await this.sysRoleMenuFilterEntityRep.findOne({
          where: { roleId, menuId: Number(menu.id), deleteTime: IsNull() },
        });
        if (filter && permission < filter.filterType) {
          permission = filter.filterType;
        }
      }
    }
    // 无任何匹配菜单（slug 未配置/未分配）→ 无数据权限概念，视为无限制
    return matched ? permission : 2;
  }

  /**
   * 计算「自己和下属」的 userId 集合（复刻 OaDataPermissionSupport.getUserGroups）。
   * 目标无员工表，简化为：自己 ∪ 自己负责的部门(leaderId) ∪ 这些部门的子孙部门(level LIKE) 下的用户。
   */
  async getUserGroups(userId: number, tenantId?: number): Promise<Set<number>> {
    const group = new Set<number>([userId]);

    const deptWhere: Record<string, any> = { leaderId: userId, deleteTime: IsNull() };
    if (tenantId != null) deptWhere.tenantId = tenantId;
    const ledDepts = await this.sysDeptEntityRep.find({ where: deptWhere });
    if (ledDepts.length === 0) return group;

    const allDeptIds = new Set<number>();
    for (const dept of ledDepts) {
      allDeptIds.add(Number(dept.id));
      const children = await this.sysDeptEntityRep
        .createQueryBuilder('dept')
        .where('dept.deleteTime IS NULL')
        .andWhere('dept.level LIKE :level', { level: `%${dept.id}%` })
        .getMany();
      children.forEach((c) => allDeptIds.add(Number(c.id)));
    }

    if (allDeptIds.size === 0) return group;

    const users = await this.userEntityRep.find({
      where: { deptId: In([...allDeptIds]), deleteTime: IsNull() },
    });
    users.forEach((u) => group.add(Number(u.id)));

    return group;
  }
}
