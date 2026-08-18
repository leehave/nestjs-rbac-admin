import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull, Not } from 'typeorm';
import { ResultData } from '../../../common/utils/result';
import { TenantEntity } from './entities/tenant.entity';
import { SysUserTenantEntity } from '../user/entities/user-tenant.entity';
import { UserEntity } from '../user/entities/sys-user.entity';
import { formatDateTime } from '../../../common/utils/index';

@Injectable()
export class TenantService {
  constructor(
    @InjectRepository(TenantEntity)
    private readonly tenantRepo: Repository<TenantEntity>,
    @InjectRepository(SysUserTenantEntity)
    private readonly userTenantRepo: Repository<SysUserTenantEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  /**
   * 将传入的 DTO 对象映射为租户实体部分对象
   * 同时支持下划线命名（如 tenant_name）和小驼峰命名（如 tenantName），优先使用下划线命名的值
   * @param dto - 传入的原始 DTO 对象，包含租户各字段数据
   * @returns 映射后的租户实体部分对象
   */
  private mapTenantDto(dto: Record<string, any>) {
    const entity: Partial<TenantEntity> = {};
    if (dto.tenant_name !== undefined || dto.tenantName !== undefined) {
      entity.tenantName = dto.tenant_name ?? dto.tenantName;
    }
    if (dto.tenant_code !== undefined || dto.tenantCode !== undefined) {
      entity.tenantCode = dto.tenant_code ?? dto.tenantCode;
    }
    if (dto.contact_name !== undefined || dto.contactName !== undefined) {
      entity.contactName = dto.contact_name ?? dto.contactName;
    }
    if (dto.contact_phone !== undefined || dto.contactPhone !== undefined) {
      entity.contactPhone = dto.contact_phone ?? dto.contactPhone;
    }
    if (dto.contact_email !== undefined || dto.contactEmail !== undefined) {
      entity.contactEmail = dto.contact_email ?? dto.contactEmail;
    }
    if (dto.address !== undefined) entity.address = dto.address;
    if (dto.logo_url !== undefined || dto.logoUrl !== undefined) {
      entity.logoUrl = dto.logo_url ?? dto.logoUrl;
    }
    if (dto.status !== undefined) entity.status = Number(dto.status);
    if (dto.expire_time !== undefined || dto.expireTime !== undefined) {
      entity.expireTime = dto.expire_time ?? dto.expireTime;
    }
    if (dto.max_users !== undefined || dto.maxUsers !== undefined) {
      entity.maxUsers = Number(dto.max_users ?? dto.maxUsers ?? 0);
    }
    if (dto.max_depts !== undefined || dto.maxDepts !== undefined) {
      entity.maxDepts = Number(dto.max_depts ?? dto.maxDepts ?? 0);
    }
    if (dto.max_roles !== undefined || dto.maxRoles !== undefined) {
      entity.maxRoles = Number(dto.max_roles ?? dto.maxRoles ?? 0);
    }
    if (dto.remark !== undefined) entity.remark = dto.remark;
    return entity;
  }

  /**
   * 格式化租户实体为前端所需的输出结构
   * 将实体字段转换为下划线命名，并补充状态文本、用户数量等派生字段
   * @param item - 租户实体对象
   * @param userCount - 该租户下的用户数量，默认为 0
   * @returns 格式化后的租户输出对象
   */
  private formatTenant(item: TenantEntity, userCount = 0) {
    return {
      id: Number(item.id),
      tenant_name: item.tenantName,
      tenant_code: item.tenantCode,
      contact_name: item.contactName,
      contact_phone: item.contactPhone,
      contact_email: item.contactEmail,
      address: item.address,
      logo_url: item.logoUrl,
      status: item.status,
      status_text: item.status === 1 ? '启用' : '禁用',
      expire_time: formatDateTime(item.expireTime),
      max_users: item.maxUsers,
      max_depts: item.maxDepts,
      max_roles: item.maxRoles,
      remark: item.remark,
      create_time: formatDateTime(item.createTime),
      update_time: formatDateTime(item.updateTime),
      user_count: userCount,
    };
  }

  /**
   * 批量获取指定租户 ID 列表对应的用户数量映射表
   * 通过关联表 user_tenant 按租户分组统计有效（未软删除）用户数
   * @param tenantIds - 租户 ID 数组
   * @returns 租户 ID 到用户数量的映射对象
   */
  private async getUserCountMap(tenantIds: number[]) {
    if (!tenantIds.length) return {} as Record<number, number>;
    const rows = await this.userTenantRepo
      .createQueryBuilder('ut')
      .select('ut.tenantId', 'tenantId')
      .addSelect('COUNT(1)', 'count')
      .where('ut.tenantId IN (:...tenantIds)', { tenantIds })
      .andWhere('ut.deleteTime IS NULL')
      .groupBy('ut.tenantId')
      .getRawMany();
    const map: Record<number, number> = {};
    rows.forEach((row) => {
      map[Number(row.tenantId)] = Number(row.count);
    });
    return map;
  }

  async create(body: Record<string, any>) {
    const entity = this.mapTenantDto(body);
    const res = await this.tenantRepo.save(entity);
    return ResultData.ok(this.formatTenant(res, 0));
  }

  /**
   * 分页查询租户列表
   * 支持按租户名称、租户编码、状态进行筛选，并附带每个租户的用户数量
   * @param query - 查询参数对象，支持 tenant_name/tenantName、tenant_code/tenantCode、status、pageNum/page、pageSize/limit
   * @returns 包含分页数据的分页结果对象
   */
  async findAll(query: Record<string, any>) {
    const entity = this.tenantRepo.createQueryBuilder('entity');
    entity.where('entity.deleteTime IS NULL');

    const tenantName = query.tenant_name ?? query.tenantName;
    const tenantCode = query.tenant_code ?? query.tenantCode;

    if (tenantName) {
      entity.andWhere('entity.tenantName LIKE :tenantName', { tenantName: `%${tenantName}%` });
    }

    if (tenantCode) {
      entity.andWhere('entity.tenantCode LIKE :tenantCode', { tenantCode: `%${tenantCode}%` });
    }

    if (query.status !== undefined && query.status !== null && query.status !== '') {
      entity.andWhere('entity.status = :status', { status: Number(query.status) });
    }

    const pageNum = Number(query.pageNum || query.page || 1);
    const pageSize = Number(query.pageSize || query.limit || 10);

    entity.orderBy('entity.id', 'DESC');
    entity.skip(pageSize * (pageNum - 1)).take(pageSize);

    const [list, total] = await entity.getManyAndCount();
    const userCountMap = await this.getUserCountMap(list.map((item) => Number(item.id)));

    return ResultData.ok({
      list: list.map((item) => this.formatTenant(item, userCountMap[Number(item.id)] || 0)),
      total,
      page: pageNum,
      limit: pageSize,
    });
  }

  /**
   * 根据主键 ID 查询单个租户详情
   * 若租户不存在则返回 404 错误信息
   * @param id - 租户主键 ID
   * @returns 包含租户详情及用户数量的结果对象
   */
  async findOne(id: number) {
    const data = await this.tenantRepo.findOne({ where: { id, deleteTime: IsNull() } });
    if (!data) {
      return ResultData.fail(404, '租户不存在');
    }
    const userCount = await this.userTenantRepo.count({
      where: { tenantId: id, deleteTime: IsNull() },
    });
    return ResultData.ok(this.formatTenant(data, userCount));
  }

  async update(body: Record<string, any>) {
    const id = Number(body.id);
    const entity = this.mapTenantDto(body);
    await this.tenantRepo.update({ id }, entity);
    return ResultData.ok();
  }

  /**
   * 批量删除（软删除）租户
   * 删除前检查每个租户下是否存在关联用户，若有则返回 500 错误并阻止删除
   * @param ids - 待删除的租户 ID 数组
   * @returns 操作结果对象
   */
  async remove(ids: number[]) {
    for (const id of ids) {
      const userCount = await this.userTenantRepo.count({
        where: { tenantId: id, deleteTime: IsNull() },
      });
      if (userCount > 0) {
        return ResultData.fail(500, '租户下存在关联用户，无法删除');
      }
    }
    await this.tenantRepo.softDelete(ids);
    return ResultData.ok();
  }

  async updateStatus(id: number, status: number) {
    await this.tenantRepo.update({ id }, { status });
    return ResultData.ok();
  }

  /**
   * 分页查询指定租户下的用户列表
   * 通过关联表内连接用户表，支持按用户名、真实姓名、手机号筛选
   * @param tenantId - 租户 ID
   * @param query - 查询参数对象，支持 username、realname、phone、pageNum/page、pageSize/limit
   * @returns 包含用户列表及分页信息的结果对象
   */
  async getUsers(tenantId: number, query: Record<string, any>) {
    const pageNum = Number(query.pageNum || query.page || 1);
    const pageSize = Number(query.pageSize || query.limit || 10);

    const qb = this.userTenantRepo
      .createQueryBuilder('ut')
      .innerJoin(UserEntity, 'u', 'u.id = ut.userId AND u.deleteTime IS NULL')
      .where('ut.tenantId = :tenantId', { tenantId })
      .andWhere('ut.deleteTime IS NULL');

    if (query.username) {
      qb.andWhere('u.username LIKE :username', { username: `%${query.username}%` });
    }
    if (query.realname) {
      qb.andWhere('u.realname LIKE :realname', { realname: `%${query.realname}%` });
    }
    if (query.phone) {
      qb.andWhere('u.phone LIKE :phone', { phone: `%${query.phone}%` });
    }

    const total = await qb.getCount();

    const rows = await qb
      .select([
        'ut.id AS id',
        'ut.tenantId AS tenant_id',
        'ut.userId AS user_id',
        'ut.isDefault AS is_default',
        'ut.isSuper AS is_super',
        'ut.joinTime AS join_time',
        'u.username AS username',
        'u.realname AS realname',
        'u.phone AS phone',
        'u.email AS email',
        'u.status AS status',
      ])
      .orderBy('ut.id', 'DESC')
      .offset((pageNum - 1) * pageSize)
      .limit(pageSize)
      .getRawMany();

    const list = rows.map((row) => ({
      id: Number(row.id),
      tenant_id: Number(row.tenant_id),
      user_id: Number(row.user_id),
      is_default: Number(row.is_default),
      is_super: Number(row.is_super),
      join_time: row.join_time,
      username: row.username,
      realname: row.realname,
      phone: row.phone,
      email: row.email,
      status: Number(row.status),
    }));

    return ResultData.ok({
      list,
      total,
      page: pageNum,
      limit: pageSize,
    });
  }

  /**
   * 分页查询可添加到指定租户的可用用户列表
   * 排除已在当前租户中的用户，支持按用户名、真实姓名、手机号筛选
   * @param tenantId - 租户 ID
   * @param query - 查询参数对象，支持 username、realname、phone、pageNum/page、pageSize/limit
   * @returns 包含可用用户列表及分页信息的结果对象
   */
  async getAvailableUsers(tenantId: number, query: Record<string, any>) {
    const pageNum = Number(query.pageNum || query.page || 1);
    const pageSize = Number(query.pageSize || query.limit || 10);

    const usedRows = await this.userTenantRepo.find({
      where: { tenantId, deleteTime: IsNull() },
      select: { userId: true },
    });
    const usedUserIds = usedRows.map((item) => Number(item.userId));

    const qb = this.userRepo.createQueryBuilder('u');
    qb.where('u.deleteTime IS NULL');
    if (usedUserIds.length) {
      qb.andWhere('u.id NOT IN (:...usedUserIds)', { usedUserIds });
    }

    if (query.username) {
      qb.andWhere('u.username LIKE :username', { username: `%${query.username}%` });
    }
    if (query.realname) {
      qb.andWhere('u.realname LIKE :realname', { realname: `%${query.realname}%` });
    }
    if (query.phone) {
      qb.andWhere('u.phone LIKE :phone', { phone: `%${query.phone}%` });
    }

    qb.orderBy('u.id', 'DESC');
    qb.skip(pageSize * (pageNum - 1)).take(pageSize);

    const [list, total] = await qb.getManyAndCount();

    return ResultData.ok({
      list: list.map((item) => ({
        id: item.id,
        username: item.username,
        realname: item.realname,
        phone: item.phone,
        email: item.email,
        status: item.status,
      })),
      total,
      page: pageNum,
      limit: pageSize,
    });
  }

  /**
   * 向指定租户添加用户
   * 自动去重、排除已在租户中的用户，并校验是否超出最大用户数限制
   * @param tenantId - 租户 ID
   * @param userIds - 待添加的用户 ID 数组
   * @returns 包含实际添加数量的结果对象
   */
  async addUsers(tenantId: number, userIds: number[]) {
    if (!userIds.length) {
      return ResultData.ok({ count: 0 });
    }

    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId, deleteTime: IsNull() } });
    if (!tenant) {
      return ResultData.fail(404, '租户不存在');
    }

    const uniqueIds = [...new Set(userIds.map((id) => Number(id)).filter(Boolean))];
    const currentCount = await this.userTenantRepo.count({
      where: { tenantId, deleteTime: IsNull() },
    });

    const existing = await this.userTenantRepo.find({
      where: { tenantId, userId: In(uniqueIds), deleteTime: IsNull() },
      select: { userId: true },
    });
    const existingIds = new Set(existing.map((item) => Number(item.userId)));
    const toAdd = uniqueIds.filter((id) => !existingIds.has(id));

    if (tenant.maxUsers > 0 && currentCount + toAdd.length > tenant.maxUsers) {
      return ResultData.fail(500, '超出租户最大用户数限制');
    }

    for (const userId of toAdd) {
      await this.userTenantRepo.save({
        tenantId,
        userId,
        isDefault: 0,
        isSuper: 0,
        joinTime: new Date(),
      });
    }

    return ResultData.ok({ count: toAdd.length });
  }

  async removeUser(tenantId: number, userId: number) {
    const row = await this.userTenantRepo.findOne({
      where: { tenantId, userId, deleteTime: IsNull() },
    });
    if (!row) {
      return ResultData.fail(404, '用户不在该租户中');
    }
    await this.userTenantRepo.softDelete({ id: row.id });
    return ResultData.ok();
  }

  async setAdmin(tenantId: number, userId: number, isSuper: number) {
    const row = await this.userTenantRepo.findOne({
      where: { tenantId, userId, deleteTime: IsNull() },
    });
    if (!row) {
      return ResultData.fail(404, '用户不在该租户中');
    }
    await this.userTenantRepo.update({ id: row.id }, { isSuper: Number(isSuper) });
    return ResultData.ok();
  }

  /**
   * 设置或取消用户在指定租户中的默认租户标志
   * 当设置为默认租户时（isDefault = 1），会先清除该用户在其他租户中的默认标志
   * @param tenantId - 租户 ID
   * @param userId - 用户 ID
   * @param isDefault - 是否设为默认（1 为是，0 为否）
   * @returns 操作结果对象
   */
  async setDefault(tenantId: number, userId: number, isDefault: number) {
    const row = await this.userTenantRepo.findOne({
      where: { tenantId, userId, deleteTime: IsNull() },
    });
    if (!row) {
      return ResultData.fail(404, '用户不在该租户中');
    }

    if (Number(isDefault) === 1) {
      await this.userTenantRepo
        .createQueryBuilder()
        .update(SysUserTenantEntity)
        .set({ isDefault: 0 })
        .where('userId = :userId', { userId })
        .andWhere('tenantId != :tenantId', { tenantId })
        .andWhere('deleteTime IS NULL')
        .execute();
    }

    await this.userTenantRepo.update({ id: row.id }, { isDefault: Number(isDefault) });
    return ResultData.ok();
  }
}
