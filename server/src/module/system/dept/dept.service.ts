import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, IsNull, In } from 'typeorm';
import { ResultData } from '../../../common/utils/result';
import { SysDeptEntity } from './entities/dept.entity';
import { UserEntity } from '../user/entities/sys-user.entity';
import { CreateDeptDto, UpdateDeptDto, ListDeptDto } from './dto/index';
import { listToTree } from '../../../common/utils/index';
import { CacheEnum, DataScopeEnum } from '../../../common/enum/index';
import { Cacheable, CacheEvict } from '../../../common/decorators/redis.decorator';
import { applyTenantFilter, appendTenantWhere, getTenantId } from '../../../common/utils/tenant.util';
import { formatDateTime } from '../../../common/utils/index';

@Injectable()
export class DeptService {
  constructor(
    @InjectRepository(SysDeptEntity)
    private readonly sysDeptEntityRep: Repository<SysDeptEntity>,
    @InjectRepository(UserEntity)
    private readonly userEntityRep: Repository<UserEntity>,
  ) {}

  @CacheEvict(CacheEnum.SYS_DEPT_KEY, '*')
  async create(createDeptDto: CreateDeptDto) {
    const entity = this.mapDeptDto(createDeptDto);
    entity.level = await this.resolveDeptLevel(Number(createDeptDto.parent_id || 0));
    await this.sysDeptEntityRep.save(entity);
    return ResultData.ok();
  }

  /**
   * 格式化部门行数据，将原始部门实体与负责人信息转换为前端所需的结构化对象。
   * @param dept - 部门实体对象
   * @param leader - 可选，部门负责人用户实体
   * @returns 格式化后的部门数据对象，包含 id、parent_id、name、code、leader 等字段
   */
  private formatDeptRow(dept: SysDeptEntity, leader?: UserEntity) {
    const leaderInfo = leader
      ? {
          id: Number(leader.id),
          username: leader.username,
          realname: leader.realname,
          phone: leader.phone,
          email: leader.email,
          avatar: leader.avatar,
          status: leader.status,
        }
      : null;

    return {
      id: Number(dept.id),
      parent_id: Number(dept.parentId ?? 0),
      name: dept.name,
      code: dept.code,
      leader_id: dept.leaderId ? Number(dept.leaderId) : null,
      leader_name: leaderInfo?.realname || leaderInfo?.username || null,
      level: dept.level,
      tenant_id: Number(dept.tenantId ?? 0),
      sort: dept.sort,
      status: dept.status,
      remark: dept.remark,
      create_time: formatDateTime(dept.createTime),
      update_time: formatDateTime(dept.updateTime),
      leader: leaderInfo,
    };
  }

  /**
   * 递归构建部门树结构，根据 parentId 将平铺的部门列表组织为层级树。
   * @param list - 平铺的部门数据列表
   * @param parentId - 父级部门 ID，默认值为 0（根节点）
   * @returns 部门树数组，每个节点包含原始数据、value、label 及可选的 children 子节点
   */
  private buildDeptTree(list: any[], parentId = 0): any[] {
    const tree: any[] = [];
    for (const item of list) {
      if (Number(item.parent_id) === parentId) {
        const children = this.buildDeptTree(list, Number(item.id));
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
   * 根据查询条件加载部门数据行，并关联负责人信息。
   * 支持按名称、编码、状态筛选，并按排序字段升序排列。
   * @param query - 部门列表查询 DTO，可选包含 name、code、status 筛选条件
   * @returns 格式化后的部门数据数组，每项包含负责人信息
   */
  private async loadDeptRows(query: ListDeptDto) {
    const entity = this.sysDeptEntityRep.createQueryBuilder('entity');
    entity.where('entity.deleteTime IS NULL');

    if (query.name) {
      entity.andWhere(`entity.name LIKE "%${query.name}%"`);
    }
    if (query.code) {
      entity.andWhere(`entity.code LIKE "%${query.code}%"`);
    }
    if (query.status !== undefined && query.status !== null && `${query.status}` !== '') {
      entity.andWhere('entity.status = :status', { status: query.status });
    }

    applyTenantFilter(entity, 'entity');

    entity.orderBy('entity.sort', 'ASC');
    const depts = await entity.getMany();

    const leaderIds = [...new Set(depts.map((d) => Number(d.leaderId)).filter((id) => id))];
    const leaders =
      leaderIds.length > 0
        ? await this.userEntityRep.find({
            where: { id: In(leaderIds), deleteTime: IsNull() },
          })
        : [];
    const leaderMap = new Map(leaders.map((u) => [Number(u.id), u]));

    return depts.map((dept) => this.formatDeptRow(dept, leaderMap.get(Number(dept.leaderId))));
  }

  /**
   * 将 DTO 对象映射为部门实体数据，仅复制非 undefined 的字段。
   * 处理 parent_id → parentId、leader_id → leaderId 等字段名转换。
   * @param dto - 源 DTO 对象（通常为 CreateDeptDto 或 UpdateDeptDto）
   * @returns 映射后的部门实体数据对象
   */
  private mapDeptDto(dto: Record<string, any>) {
    const data: Record<string, any> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.code !== undefined) data.code = dto.code;
    if (dto.sort !== undefined) data.sort = dto.sort;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.remark !== undefined) data.remark = dto.remark;
    if (dto.parent_id !== undefined) data.parentId = Number(dto.parent_id);
    if (dto.leader_id !== undefined) data.leaderId = dto.leader_id ? Number(dto.leader_id) : null;
    return data;
  }

  /**
   * 解析并生成部门的层级路径字符串。
   * 根据父级部门 ID 递归查询父级层级，拼接当前部门 ID 形成完整路径。
   * 格式如 "0,1,2," 表示根节点下的部门链。
   * @param parentId - 父级部门 ID，为 0 时表示顶级部门
   * @returns 层级路径字符串，末尾以逗号分隔
   */
  private async resolveDeptLevel(parentId: number) {
    if (!parentId) return '0,';
    const parent = await this.sysDeptEntityRep.findOne({
      where: { id: parentId, deleteTime: IsNull() },
      select: { level: true },
    });
    if (!parent) return '0,';
    return parent.level ? `${parent.level}${parentId},` : `0,${parentId},`;
  }

  async findAll(query: ListDeptDto) {
    const rows = await this.loadDeptRows(query);
    const hasFilter = !!(query.name || query.code || (query.status !== undefined && query.status !== null && `${query.status}` !== ''));
    if (hasFilter) {
      return ResultData.ok(this.buildDeptTree(rows));
    }
    return ResultData.ok(this.buildDeptTree(rows));
  }

  /**
   * 根据部门 ID 查询单个部门的详细信息。
   * 优先从缓存读取，若缓存未命中则从数据库查询。
   * 查询结果包含部门负责人信息。
   * @param deptId - 部门 ID
   * @returns 查询结果，成功返回部门数据及负责人信息，失败返回 404 错误
   */
  @Cacheable(CacheEnum.SYS_DEPT_KEY, 'findOne:{deptId}')
  async findOne(deptId: number) {
    const data = await this.sysDeptEntityRep.findOne({
      where: appendTenantWhere({
        id: deptId,
        deleteTime: IsNull(),
      }),
    });
    if (!data) {
      return ResultData.fail(404, '部门不存在');
    }
    let leader: UserEntity | null = null;
    if (data.leaderId) {
      leader = await this.userEntityRep.findOne({
        where: { id: data.leaderId, deleteTime: IsNull() },
      });
    }
    return ResultData.ok(this.formatDeptRow(data, leader));
  }

  /**
   * 根据数据权限范围和部门ID查询部门ID列表。
   * @param deptId 部门ID，表示需要查询的部门。
   * @param dataScope 数据权限范围，决定查询的部门范围。
   * @returns 返回一个部门ID数组，根据数据权限范围决定返回的部门ID集合。
   */
  @Cacheable(CacheEnum.SYS_DEPT_KEY, 'findDeptIdsByDataScope:{deptId}-{dataScope}')
  async findDeptIdsByDataScope(deptId: number, dataScope: DataScopeEnum) {
    try {
      const entity = this.sysDeptEntityRep.createQueryBuilder('dept');
      entity.where('dept.deleteTime IS NULL');
      applyTenantFilter(entity, 'dept');

      if (dataScope === DataScopeEnum.DATA_SCOPE_DEPT) {
        this.addQueryForDeptDataScope(entity, deptId);
      } else if (dataScope === DataScopeEnum.DATA_SCOPE_DEPT_AND_CHILD) {
        this.addQueryForDeptAndChildDataScope(entity, deptId);
      } else if (dataScope === DataScopeEnum.DATA_SCOPE_SELF) {
        return [];
      }
      const list = await entity.getMany();
      return list.map((item) => item.id);
    } catch (error) {
      console.error('Failed to query department IDs:', error);
      throw new Error('Querying department IDs failed');
    }
  }

  private addQueryForDeptDataScope(queryBuilder: SelectQueryBuilder<any>, deptId: number) {
    queryBuilder.andWhere('dept.id = :deptId', { deptId: deptId });
  }

  private addQueryForDeptAndChildDataScope(queryBuilder: SelectQueryBuilder<any>, deptId: number) {
    queryBuilder
      .andWhere('dept.level LIKE :level', {
        level: `%${deptId}%`,
      })
      .orWhere('dept.id = :deptId', { deptId: deptId });
  }

  @Cacheable(CacheEnum.SYS_DEPT_KEY, 'findListExclude')
  async findListExclude(id: number) {
    const data = await this.sysDeptEntityRep.find({
      where: {
        deleteTime: IsNull(),
      },
    });
    return ResultData.ok(data);
  }

  @CacheEvict(CacheEnum.SYS_DEPT_KEY, '*')
  async update(updateDeptDto: UpdateDeptDto) {
    const entity = this.mapDeptDto(updateDeptDto);
    if (updateDeptDto.parent_id !== undefined) {
      entity.level = await this.resolveDeptLevel(Number(updateDeptDto.parent_id || 0));
    }
    await this.sysDeptEntityRep.update(appendTenantWhere({ id: updateDeptDto.id }), entity);
    return ResultData.ok();
  }

  @CacheEvict(CacheEnum.SYS_DEPT_KEY, '*')
  async remove(deptId: number) {
    await this.sysDeptEntityRep.softDelete(appendTenantWhere({ id: deptId }));
    return ResultData.ok();
  }

  /**
   * 部门树
   * @returns
   */
  @Cacheable(CacheEnum.SYS_DEPT_KEY, 'deptTree')
  async deptTree() {
    const rows = await this.loadDeptRows({} as ListDeptDto);
    return this.buildDeptTree(rows);
  }

  /**
   * 获取所有启用部门
   * @returns
   */
  @Cacheable(CacheEnum.SYS_DEPT_KEY, 'allEnabled')
  async allEnabled() {
    const res = await this.sysDeptEntityRep.find({
      where: appendTenantWhere({
        deleteTime: IsNull(),
        status: 1,
      }),
    });
    return res;
  }

  /**
   * 获取部门树
   * @returns
   */
  async tree() {
    return this.deptTree();
  }

  /**
   * 获取子部门ID列表
   * @param deptId
   */
  async children(deptId: number) {
    const entity = this.sysDeptEntityRep.createQueryBuilder('dept');
    entity.where('dept.deleteTime IS NULL');
    entity.andWhere('dept.level LIKE :level', { level: `%${deptId}%` });
    const list = await entity.getMany();
    return list.map((item) => item.id);
  }

  /**
   * 获取可访问的部门树（仅启用部门，供用户管理左侧树使用）
   */
  async getAccessDeptTree(parentId = 0) {
    const tenantId = getTenantId();
    const where: Record<string, any> = {
      parentId,
      deleteTime: IsNull(),
      status: 1,
    };
    if (tenantId) {
      where.tenantId = tenantId;
    }
    const res = await this.sysDeptEntityRep.find({
      where,
      order: {
        sort: 'ASC',
      },
    });

    const tree: any[] = [];
    for (const dept of res) {
      tree.push({
        id: dept.id,
        value: dept.id,
        label: dept.name,
        name: dept.name,
        code: dept.code,
        parent_id: dept.parentId,
        parentId: dept.parentId,
        children: await this.getAccessDeptTree(dept.id),
      });
    }
    return tree;
  }

  /**
   * 根据用户部门ID获取可访问部门
   */
  async accessDept(deptId: number) {
    const entity = this.sysDeptEntityRep.createQueryBuilder('dept');
    entity.where('dept.deleteTime IS NULL');
    if (deptId) {
      entity.andWhere('dept.level LIKE :level', { level: `%${deptId}%` }).orWhere('dept.id = :deptId', { deptId });
    }
    const list = await entity.getMany();
    return list.map((item) => item.id);
  }
}
