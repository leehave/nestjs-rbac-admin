import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { formatDateTime, generateUUID } from '../../../common/utils';
import { applyTenantFilter, appendTenantWhere, getTenantId, withTenantId } from '../../../common/utils/tenant.util';
import { MindSystemModelEntity } from './entities/mind-system-model.entity';
import { MindModelCreateDto, MindModelDeleteDto, MindModelPageDto, MindModelUpdateDto } from './dto';
import { normalizeMindModelSource, normalizeMindModelType } from './model.constants';

@Injectable()
export class MindModelService {
  constructor(
    @InjectRepository(MindSystemModelEntity)
    private readonly modelRepo: Repository<MindSystemModelEntity>,
  ) {}

  private requireTenantId(): number {
    const tenantId = getTenantId();
    if (!tenantId) throw new UnauthorizedException('Unauthorized');
    return tenantId;
  }

  /**
   * 将模型实体转换为前端展示行数据
   * @param entity - 系统模型实体对象
   * @returns 包含模型ID、名称、显示名、类型、来源、API地址、密钥等信息的行数据对象
   */
  private toRow(entity: MindSystemModelEntity) {
    const modelName = entity.modelName ?? entity.displayName ?? entity.modelId;
    return {
      id: entity.id,
      tenant_id: Number(entity.tenantId ?? 0),
      model_name: modelName,
      display_name: entity.displayName ?? entity.modelName,
      model_id: entity.modelId ?? entity.modelName,
      base_url: entity.baseUrl,
      api_key: entity.apiKey,
      type: entity.type,
      source: entity.source,
      create_time: formatDateTime(entity.createTime),
    };
  }

  private applyNameFilter(qb: ReturnType<Repository<MindSystemModelEntity>['createQueryBuilder']>, keyword?: string) {
    if (!keyword) return;
    qb.andWhere('(m.modelName LIKE :keyword OR m.displayName LIKE :keyword OR m.modelId LIKE :keyword)', {
      keyword: `%${keyword}%`,
    });
  }

  /**
   * 规范化数据库错误信息，对缺失字段给出友好提示
   * @param e - 捕获的异常对象
   * @throws BadRequestException - 当数据库缺少 display_name 或 model_id 字段时抛出
   */
  private normalizeDbError(e: any) {
    const msg = String(e?.message || '');
    if (msg.includes('Unknown column') && (msg.includes('display_name') || msg.includes('model_id'))) {
      throw new BadRequestException('数据库缺少模型字段 display_name/model_id，请执行 server1/sql/mind-model-display-modelid.sql 或运行对应 migration');
    }
    throw e;
  }

  /**
   * 分页查询模型列表
   * @param dto - 分页查询参数，包含当前页、每页条数、模型名称、类型、来源等过滤条件
   * @returns 返回包含 total（总数）、pages（总页数）、records（模型行数据数组）的分页结果
   */
  async page(dto: MindModelPageDto) {
    this.requireTenantId();
    const currentPage = Math.max(1, Number(dto.current_page ?? 1));
    const pageSize = Math.max(1, Math.min(200, Number(dto.page_size ?? 10)));

    try {
      const qb = this.modelRepo.createQueryBuilder('m');
      applyTenantFilter(qb, 'm');

      this.applyNameFilter(qb, dto.model_name || dto.display_name || dto.model_id);
      if (dto.type) {
        qb.andWhere('m.type = :type', { type: normalizeMindModelType(dto.type) ?? dto.type });
      }
      if (dto.source) {
        qb.andWhere('m.source = :source', { source: normalizeMindModelSource(dto.source) ?? dto.source });
      }

      qb.orderBy('m.createTime', 'DESC');
      qb.skip((currentPage - 1) * pageSize).take(pageSize);
      const [list, total] = await qb.getManyAndCount();
      const pages = Math.ceil(total / pageSize);
      return { total, pages, records: list.map((row) => this.toRow(row)) };
    } catch (e: any) {
      this.normalizeDbError(e);
    }
  }

  /**
   * 查询模型列表（不分页）
   * @param dto - 查询参数，包含模型名称、显示名、模型ID、类型、来源等过滤条件
   * @returns 返回模型行数据数组
   */
  async list(dto: Pick<MindModelPageDto, 'model_name' | 'display_name' | 'model_id' | 'type' | 'source'>) {
    this.requireTenantId();
    try {
      const qb = this.modelRepo.createQueryBuilder('m');
      applyTenantFilter(qb, 'm');
      this.applyNameFilter(qb, dto.model_name || dto.display_name || dto.model_id);
      if (dto.type) {
        qb.andWhere('m.type = :type', { type: normalizeMindModelType(dto.type) ?? dto.type });
      }
      if (dto.source) {
        qb.andWhere('m.source = :source', { source: normalizeMindModelSource(dto.source) ?? dto.source });
      }
      qb.orderBy('m.createTime', 'DESC');
      const list = await qb.getMany();
      return list.map((row) => this.toRow(row));
    } catch (e: any) {
      this.normalizeDbError(e);
    }
  }

  /**
   * 创建新模型
   * @param dto - 创建模型参数，包含模型名称、类型、来源、API地址、密钥等信息
   * @throws BadRequestException - 当模型名称为空、类型无效或来源无效时抛出
   * @returns 无返回值
   */
  async create(dto: MindModelCreateDto) {
    this.requireTenantId();
    const modelName = String(dto.model_name || '').trim();
    const type = normalizeMindModelType(dto.type);
    const source = normalizeMindModelSource(dto.source);
    if (!modelName) throw new BadRequestException('模型名不能为空');
    if (!type) throw new BadRequestException('模型类型无效');
    if (!source) throw new BadRequestException('模型来源无效');

    const entity = this.modelRepo.create(
      withTenantId({
        id: generateUUID(),
        modelName,
        displayName: modelName,
        modelId: modelName,
        baseUrl: dto.base_url?.trim() || null,
        apiKey: dto.api_key?.trim() || null,
        type,
        source,
        createTime: new Date(),
      } as Partial<MindSystemModelEntity> as any),
    );
    await this.modelRepo.save(entity);
  }

  /**
   * 更新模型信息
   * @param dto - 更新模型参数，包含模型ID及可选更新的名称、API地址、密钥、类型、来源等字段
   * @throws BadRequestException - 当模型名称为空、类型无效或来源无效时抛出
   * @returns 无返回值
   */
  async update(dto: MindModelUpdateDto) {
    this.requireTenantId();
    const patch: Partial<MindSystemModelEntity> = {};
    if (dto.model_name !== undefined) {
      const modelName = String(dto.model_name || '').trim();
      if (!modelName) throw new BadRequestException('模型名不能为空');
      patch.modelName = modelName;
      patch.displayName = modelName;
      patch.modelId = modelName;
    }
    if (dto.base_url !== undefined) patch.baseUrl = dto.base_url?.trim() || null;
    if (dto.api_key !== undefined) patch.apiKey = dto.api_key?.trim() || null;
    if (dto.type !== undefined) {
      const type = normalizeMindModelType(dto.type);
      if (!type) throw new BadRequestException('模型类型无效');
      patch.type = type;
    }
    if (dto.source !== undefined) {
      const source = normalizeMindModelSource(dto.source);
      if (!source) throw new BadRequestException('模型来源无效');
      patch.source = source;
    }
    await this.modelRepo.update(appendTenantWhere({ id: dto.id }), patch);
  }

  /**
   * 删除模型
   * @param dto - 删除模型参数，包含以逗号分隔的模型ID字符串
   * @returns 无返回值
   */
  async remove(dto: MindModelDeleteDto) {
    this.requireTenantId();
    const ids = String(dto.ids || '')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
    if (!ids.length) return;
    await this.modelRepo.delete(appendTenantWhere({ id: In(ids) }));
  }
}
