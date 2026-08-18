import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, In, FindManyOptions, IsNull, DataSource } from 'typeorm';
import type { Response } from 'express-serve-static-core';
import { ResultData } from '../../../common/utils/result';
import { listToTree } from '../../../common/utils/index';
import { ExportTable } from '../../../common/utils/export';
import { CacheEvict } from '../../../common/decorators/redis.decorator';

import { DataScopeEnum, CacheEnum } from '../../../common/enum/index';
import { SysRoleEntity } from './entities/role.entity';
import { SysRoleMenuEntity } from './entities/role-width-menu.entity';
import { SysRoleMenuFilterEntity } from './entities/role-width-menu-filter.entity';
import { SysRoleDeptEntity } from './entities/role-width-dept.entity';
import { SysDeptEntity } from '../dept/entities/dept.entity';
import type { MenuService } from '../menu/menu.service';
import { CreateRoleDto, UpdateRoleDto, ListRoleDto, ChangeRoleStatusDto } from './dto/index';
import { applyTenantFilter, appendTenantWhere } from '../../../common/utils/tenant.util';
import { formatDateTime } from '../../../common/utils/index';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(SysRoleEntity)
    private readonly sysRoleEntityRep: Repository<SysRoleEntity>,
    @InjectRepository(SysRoleMenuEntity)
    private readonly sysRoleWithMenuEntityRep: Repository<SysRoleMenuEntity>,
    @InjectRepository(SysRoleMenuFilterEntity)
    private readonly sysRoleMenuFilterEntityRep: Repository<SysRoleMenuFilterEntity>,
    @InjectRepository(SysRoleDeptEntity)
    private readonly sysRoleWithDeptEntityRep: Repository<SysRoleDeptEntity>,
    @InjectRepository(SysDeptEntity)
    private readonly sysDeptEntityRep: Repository<SysDeptEntity>,
    @Inject(forwardRef(() => require('../menu/menu.service').MenuService))
    private readonly menuService: MenuService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}
  /**
   * 格式化角色数据
   * 将数据库实体对象转换为前端所需的格式，包含角色ID、父级ID、名称、编码、层级、数据权限范围等字段的映射。
   * @param item - 角色实体对象
   * @returns 格式化后的角色数据对象
   */
  private formatRole(item: SysRoleEntity) {
    return {
      id: Number(item.id),
      parent_id: item.parentId,
      name: item.name,
      code: item.code,
      level: item.level,
      data_scope: item.dataScope,
      remark: item.remark,
      sort: item.sort,
      status: item.status,
      create_time: formatDateTime(item.createTime),
      update_time: formatDateTime(item.updateTime),
    };
  }

  /**
   * 创建角色
   * 保存角色基本信息，并根据提供的菜单ID列表和数据权限范围，关联角色与菜单、角色与部门的关系数据。
   * @param createRoleDto - 创建角色的数据传输对象，包含角色名称、编码、菜单ID、部门ID等字段
   * @returns 包含创建结果的角色数据
   */
  async create(createRoleDto: CreateRoleDto) {
    const { menu_ids, dept_ids, data_scope, menu_filters, ...rest } = createRoleDto;
    const roleData: Record<string, any> = { ...rest };
    if (data_scope !== undefined) {
      roleData.dataScope = data_scope;
    }
    const res = await this.sysRoleEntityRep.save(roleData);
    if (menu_ids?.length) {
      const values = menu_ids.map((id) => ({
        roleId: res.id,
        menuId: id,
      }));
      await this.sysRoleWithMenuEntityRep.insert(values);
    }
    if (menu_filters?.length) {
      // 剪枝：仅保留已分配给该角色的菜单的阈值，避免产生指向未分配菜单的孤儿行
      const validMenuIds = new Set((menu_ids ?? []).map(Number));
      const values = menu_filters
        .filter((item) => validMenuIds.has(Number(item.menu_id)))
        .map((item) => ({
          roleId: res.id,
          menuId: item.menu_id,
          filterType: item.filter_type,
        }));
      if (values.length) {
        await this.sysRoleMenuFilterEntityRep.insert(values);
      }
    }
    if (data_scope === 6 && dept_ids?.length) {
      const values = dept_ids.map((id) => ({
        roleId: res.id,
        deptId: id,
      }));
      await this.sysRoleWithDeptEntityRep.insert(values);
    }
    return ResultData.ok(res);
  }

  /**
   * 分页查询角色列表
   * 支持按角色名称、编码、状态及创建时间范围进行模糊筛选，并自动应用租户过滤。
   * @param query - 查询参数对象，包含分页、名称、编码、状态、时间范围等过滤条件
   * @returns 包含角色列表和总数的分页结果
   */
  async findAll(query: ListRoleDto) {
    const entity = this.sysRoleEntityRep.createQueryBuilder('entity');
    entity.where('entity.deleteTime IS NULL');

    if (query.name) {
      entity.andWhere(`entity.name LIKE "%${query.name}%"`);
    }

    if (query.code) {
      entity.andWhere(`entity.code LIKE "%${query.code}%"`);
    }

    if (query.status !== undefined && query.status !== null) {
      entity.andWhere('entity.status = :status', { status: query.status });
    }

    if (query.params?.beginTime && query.params?.endTime) {
      entity.andWhere('entity.createTime BETWEEN :start AND :end', { start: query.params.beginTime, end: query.params.endTime });
    }

    applyTenantFilter(entity, 'entity');

    const pageNum = Number(query.pageNum || query.page || 1);
    const pageSize = Number(query.pageSize || query.limit || 10);
    entity.skip(pageSize * (pageNum - 1)).take(pageSize);
    const [list, total] = await entity.getManyAndCount();

    return ResultData.ok({
      list: list.map((item) => this.formatRole(item)),
      total,
    });
  }

  /**
   * 查询角色详情
   * 根据角色ID获取角色基本信息，并同时查询该角色关联的菜单ID列表和部门ID列表。
   * @param roleId - 角色ID
   * @returns 包含角色基本信息、菜单ID列表和部门ID列表的详情数据；若角色不存在则返回 404 错误
   */
  async findOne(roleId: number) {
    const res = await this.sysRoleEntityRep.findOne({
      where: appendTenantWhere({
        id: roleId,
        deleteTime: IsNull(),
      }),
    });
    if (!res) {
      return ResultData.fail(404, '角色不存在');
    }
    const menuIds = await this.sysRoleWithMenuEntityRep.find({
      where: { roleId },
      select: { menuId: true },
    });
    const deptIds = await this.sysRoleWithDeptEntityRep.find({
      where: { roleId },
      select: { deptId: true },
    });
    const filterMap = await this.getRoleMenuFilterMap(roleId);
    return ResultData.ok({
      ...res,
      data_scope: res.dataScope,
      menu_ids: menuIds.map((item) => Number(item.menuId)),
      dept_ids: deptIds.map((item) => Number(item.deptId)),
      menu_filters: Array.from(filterMap.entries()).map(([menu_id, filter_type]) => ({ menu_id, filter_type })),
    });
  }

  /**
   * 获取可选的角色列表
   * 查询状态正常（status=1）且未被软删除的角色，仅返回角色ID、名称和编码字段，按排序号升序排列。
   * @returns 包含可用角色列表的结果
   */
  async getAccessRoleList() {
    const entity = this.sysRoleEntityRep.createQueryBuilder('entity');
    entity.where('entity.deleteTime IS NULL');
    entity.andWhere('entity.status = :status', { status: 1 });
    applyTenantFilter(entity, 'entity');
    entity.orderBy('entity.sort', 'ASC');
    entity.select(['entity.id', 'entity.name', 'entity.code']);
    const list = await entity.getMany();
    return ResultData.ok(list.map((item) => ({ id: Number(item.id), name: item.name, code: item.code })));
  }

  /**
   * 更新角色信息
   * 在数据库事务中更新角色基本信息，同时同步更新角色与菜单、角色与部门的关联关系；更新后会清除菜单缓存。
   * @param updateRoleDto - 更新角色的数据传输对象，包含角色ID、菜单ID列表、部门ID列表及待更新的字段
   * @returns 更新操作的结果
   */
  @CacheEvict(CacheEnum.SYS_MENU_KEY, '*')
  async update(updateRoleDto: UpdateRoleDto) {
    const { menu_ids, dept_ids, data_scope, menu_filters, ...rest } = updateRoleDto;
    const roleId = updateRoleDto.id;

    let res: unknown;
    await this.dataSource.transaction(async (manager) => {
      if (menu_ids !== undefined) {
        await manager.delete(SysRoleMenuEntity, { roleId });
        if (menu_ids.length) {
          const values = menu_ids.map((id) => ({
            roleId,
            menuId: id,
          }));
          await manager.insert(SysRoleMenuEntity, values);
        }
      }

      if (menu_filters !== undefined) {
        await manager.delete(SysRoleMenuFilterEntity, { roleId });
        // 剪枝：仅保留仍归属该角色的菜单的阈值，避免取消勾选菜单后残留孤儿行
        let validMenuIds: Set<number>;
        if (menu_ids !== undefined) {
          validMenuIds = new Set(menu_ids.map(Number));
        } else {
          const existing = await manager.find(SysRoleMenuEntity, {
            where: { roleId },
            select: { menuId: true },
          });
          validMenuIds = new Set(existing.map((r) => Number(r.menuId)));
        }
        const validFilters = menu_filters.filter((item) =>
          validMenuIds.has(Number(item.menu_id)),
        );
        if (validFilters.length) {
          const values = validFilters.map((item) => ({
            roleId,
            menuId: item.menu_id,
            filterType: item.filter_type,
          }));
          await manager.insert(SysRoleMenuFilterEntity, values);
        }
      }

      if (data_scope !== undefined) {
        await manager.delete(SysRoleDeptEntity, { roleId });
        if (data_scope === 6 && dept_ids?.length) {
          const values = dept_ids.map((id) => ({
            roleId,
            deptId: id,
          }));
          await manager.insert(SysRoleDeptEntity, values);
        }
      }

      const updateData: Record<string, any> = {};
      if (rest.name !== undefined) updateData.name = rest.name;
      if (rest.code !== undefined) updateData.code = rest.code;
      if (rest.level !== undefined) updateData.level = rest.level;
      if (rest.sort !== undefined) updateData.sort = rest.sort;
      if (rest.status !== undefined) updateData.status = rest.status;
      if (rest.remark !== undefined) updateData.remark = rest.remark;
      if (data_scope !== undefined) updateData.dataScope = data_scope;

      res = await manager.update(SysRoleEntity, appendTenantWhere({ id: roleId }), updateData);
    });

    return ResultData.ok(res);
  }

  /**
   * 更新角色数据权限范围
   * 根据传入的数据权限类型处理角色与部门的关联关系：若为自定义权限（DATA_SCOPE_CUSTOM），则保存指定的部门列表；
   * 否则移除已有部门关联。最后更新角色的数据权限字段。
   * @param updateRoleDto - 包含角色ID、数据权限范围及部门ID列表的数据传输对象
   * @returns 更新操作的结果
   */
  async dataScope(updateRoleDto: UpdateRoleDto) {
    const hasId = await this.sysRoleWithDeptEntityRep.findOne({
      where: {
        roleId: updateRoleDto.id,
      },
      select: { roleId: true },
    });

    //角色已有权限 或者 非自定义权限 先删除权限关联
    if (hasId || String(updateRoleDto.data_scope) !== DataScopeEnum.DATA_SCOPE_CUSTOM) {
      await this.sysRoleWithDeptEntityRep.delete({
        roleId: updateRoleDto.id,
      });
    }

    if (String(updateRoleDto.data_scope) === DataScopeEnum.DATA_SCOPE_CUSTOM) {
      const entity = this.sysRoleWithDeptEntityRep.createQueryBuilder('entity');
      const values = (updateRoleDto.dept_ids || []).map((id) => {
        return {
          roleId: updateRoleDto.id,
          deptId: id,
        };
      });
      if (values.length) {
        entity.insert().values(values).execute();
      }
    }

    delete (updateRoleDto as any).dept_ids;

    const res = await this.sysRoleEntityRep.update(appendTenantWhere({ id: updateRoleDto.id }), updateRoleDto);
    return ResultData.ok(res);
  }

  async changeStatus(changeStatusDto: ChangeRoleStatusDto) {
    const res = await this.sysRoleEntityRep.update(
      appendTenantWhere({ id: changeStatusDto.id }),
      {
        status: changeStatusDto.status,
      },
    );
    return ResultData.ok(res);
  }

  async remove(roleIds: number[]) {
    await this.sysRoleEntityRep.softDelete(appendTenantWhere({ id: In(roleIds) }));
    return ResultData.ok();
  }

  /**
   * 获取角色部门树
   * 查询所有未被软删除的部门并将其转换为树形结构，同时获取指定角色已关联的部门ID列表作为选中项。
   * @param roleId - 角色ID
   * @returns 包含部门树结构和已选中部门ID列表的结果
   */
  async deptTree(roleId: number) {
    const res = await this.sysDeptEntityRep.find({
      where: {
        deleteTime: IsNull(),
      },
    });
    const tree = listToTree(
      res,
      (m) => m.id,
      (m) => m.name,
    );
    const deptIds = await this.sysRoleWithDeptEntityRep.find({
      where: { roleId: roleId },
      select: { deptId: true },
    });
    const checkedKeys = deptIds.map((item) => {
      return item.deptId;
    });
    return ResultData.ok({
      depts: tree,
      checkedKeys: checkedKeys,
    });
  }

  async findRoles(where: FindManyOptions<SysRoleEntity>) {
    return await this.sysRoleEntityRep.find(where);
  }
  /**
   * 根据角色获取用户权限列表
   */
  async getPermissionsByRoleIds(roleIds: number[]) {
    if (roleIds.includes(1)) return [{ slug: '*:*:*' }]; //当角色为超级管理员时，开放所有权限
    const list = await this.sysRoleWithMenuEntityRep.find({
      where: {
        roleId: In(roleIds),
      },
      select: { menuId: true },
    });
    const menuIds = list.map((item) => item.menuId);
    const permission = await this.menuService.findMany({
      where: { deleteTime: IsNull(), status: 1, id: In(menuIds) },
    });
    return permission;
  }

  /**
   * 根据角色ID异步查找与之关联的部门ID列表。
   *
   * @param roleId - 角色的ID，用于查询与该角色关联的部门。
   * @returns 返回一个Promise，该Promise解析为一个部门ID的数组。
   */
  async findRoleWithDeptIds(roleId: number) {
    const res = await this.sysRoleWithDeptEntityRep.find({
      select: { deptId: true },
      where: {
        roleId: roleId,
      },
    });
    return res.map((item) => item.deptId);
  }

  /**
   * 获取角色-菜单数据权限阈值映射（menuId -> filterType）
   */
  async getRoleMenuFilterMap(roleId: number): Promise<Map<number, number>> {
    const list = await this.sysRoleMenuFilterEntityRep.find({
      where: { roleId },
    });
    return new Map(list.map((item) => [Number(item.menuId), Number(item.filterType)]));
  }

  /**
   * 根据角色获取菜单树
   */
  async menuByRole(roleId: number) {
    const menus = await this.sysRoleWithMenuEntityRep.find({
      where: { roleId },
      select: { menuId: true },
    });
    const filterMap = await this.getRoleMenuFilterMap(roleId);
    const menuIds = menus.map((item) => Number(item.menuId));
    return ResultData.ok({
      menus: menuIds.map((id) => ({ id, filter_type: filterMap.get(id) ?? 0 })),
    });
  }

  /**
   * 导出角色管理数据为xlsx
   * @param res
   */
  async export(res: Response, body: ListRoleDto) {
    delete body.pageNum;
    delete body.pageSize;
    const list = await this.findAll(body);
    const options = {
      sheetName: '角色数据',
      data: list.data.list,
      header: [
        { title: '角色编号', dataIndex: 'id' },
        { title: '角色名称', dataIndex: 'name', width: 15 },
        { title: '权限字符', dataIndex: 'code' },
        { title: '显示顺序', dataIndex: 'sort' },
        { title: '状态', dataIndex: 'status' },
        { title: '创建时间', dataIndex: 'createTime', width: 15 },
      ],
    };
    ExportTable(options, res);
  }
}
