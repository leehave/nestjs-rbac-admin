import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { formatDateTime, generateUUID } from '../../../common/utils';
import { getTenantId, withTenantId } from '../../../common/utils/tenant.util';
import { MindSystemSettingEntity } from './entities/mind-system-setting.entity';
import { MindSettingListDto, MindSettingSaveDto } from './dto';

@Injectable()
export class MindSettingService {
  constructor(
    @InjectRepository(MindSystemSettingEntity)
    private readonly settingRepo: Repository<MindSystemSettingEntity>,
  ) {}

  private requireTenantId(): number {
    const tenantId = getTenantId();
    if (!tenantId) throw new UnauthorizedException('Unauthorized');
    return tenantId;
  }

  /** 当前租户配置优先，兼容 tenant_id=0 的历史数据 */
  private applySettingScope(qb: SelectQueryBuilder<MindSystemSettingEntity>, alias: string) {
    const tenantId = getTenantId();
    if (tenantId) {
      qb.andWhere(`(${alias}.tenantId = :tenantId OR ${alias}.tenantId = 0)`, { tenantId });
    }
    qb.orderBy(`${alias}.tenantId`, 'DESC');
    qb.addOrderBy(`${alias}.createTime`, 'DESC');
  }

  /**
   * 将设置实体转换为前端展示行数据（自动解析 JSON 字符串内容）
   * @param entity - 系统设置实体对象
   * @returns 包含设置ID、租户ID、来源、内容对象和创建时间的行数据
   */
  private toRow(entity: MindSystemSettingEntity) {
    let content = entity.content;
    if (typeof content === 'string') {
      try {
        content = JSON.parse(content);
      } catch {
        content = {};
      }
    }
    return {
      id: entity.id,
      tenant_id: Number(entity.tenantId ?? 0),
      source: entity.source,
      content: content ?? {},
      create_time: formatDateTime(entity.createTime),
    };
  }

  /**
   * 构建保存设置时的内容对象（排除 source 字段）
   * @param dto - 保存设置参数，包含 source 及其他自定义字段
   * @returns 过滤掉空值后的内容键值对对象
   */
  private buildContent(dto: MindSettingSaveDto) {
    const { source, ...rest } = dto;
    const content: Record<string, any> = { source };
    Object.entries(rest).forEach(([key, value]) => {
      if (value != null && value !== '') content[key] = value;
    });
    return content;
  }

  /**
   * 查询设置列表
   * @param dto - 查询参数，可按 source（来源）过滤
   * @returns 返回设置行数据数组
   */
  async list(dto: MindSettingListDto) {
    this.requireTenantId();
    const qb = this.settingRepo.createQueryBuilder('s');
    this.applySettingScope(qb, 's');
    if (dto.source) {
      qb.andWhere('s.source = :source', { source: dto.source });
    }
    const list = await qb.getMany();
    return list.map((row) => this.toRow(row));
  }

  /**
   * 根据来源查询设置详情
   * @param source - 设置来源标识
   * @returns 匹配的设置行数据，未找到时返回 null
   */
  async detail(source: string) {
    if (!source) return null;
    this.requireTenantId();
    const qb = this.settingRepo.createQueryBuilder('s');
    this.applySettingScope(qb, 's');
    qb.andWhere('s.source = :source', { source });
    qb.take(1);
    const entity = await qb.getOne();
    return entity ? this.toRow(entity) : null;
  }

  /**
   * 保存设置（存在则更新，不存在则新增）
   * @param dto - 保存设置参数，包含 source 来源标识及自定义配置字段
   * @returns 保存后的设置行数据
   */
  async save(dto: MindSettingSaveDto) {
    this.requireTenantId();
    const source = dto.source;
    const content = this.buildContent(dto);

    const qb = this.settingRepo.createQueryBuilder('s');
    this.applySettingScope(qb, 's');
    qb.andWhere('s.source = :source', { source });
    qb.take(1);
    const existing = await qb.getOne();

    if (existing) {
      existing.content = content;
      if (existing.tenantId === 0) {
        existing.tenantId = getTenantId()!;
      }
      await this.settingRepo.save(existing);
      return this.toRow(existing);
    }

    const entity: MindSystemSettingEntity = Object.assign(new MindSystemSettingEntity(), withTenantId({
      id: generateUUID(),
      source,
      content,
      createTime: new Date(),
    } as Partial<MindSystemSettingEntity> as any));
    await this.settingRepo.save(entity);
    return this.toRow(entity);
  }
}
