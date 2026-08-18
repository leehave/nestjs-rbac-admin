import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { formatDateTime, generateUUID } from '../../../common/utils';
import { applyTenantFilter, appendTenantWhere, getTenantId, withTenantId } from '../../../common/utils/tenant.util';
import { MindHistoryRecordEntity } from './entities/mind-history-record.entity';
import { MindMemoryDetailEntity } from './entities/mind-memory-detail.entity';
import {
  MindHistoryRecordDeleteDto,
  MindHistoryRecordListDto,
  MindHistoryRecordUpdateDto,
  MindMemoryDetailListDto,
} from './dto';

export type MindHistoryInsertArgs = {
  source_id?: string;
  source?: string;
  pattern?: string;
  library?: string;
  query?: string;
  chat_model_id?: string;
};

@Injectable()
export class MindHistoryService {
  constructor(
    @InjectRepository(MindHistoryRecordEntity)
    private readonly recordRepo: Repository<MindHistoryRecordEntity>,
    @InjectRepository(MindMemoryDetailEntity)
    private readonly detailRepo: Repository<MindMemoryDetailEntity>,
  ) {}

  private requireTenantId(): number {
    const tenantId = getTenantId();
    if (!tenantId) throw new UnauthorizedException('Unauthorized');
    return tenantId;
  }

  /**
   * 将历史记录实体转换为前端展示格式。
   * @param entity - 历史记录实体
   * @returns 格式化后的记录对象
   */
  private recordToRow(entity: MindHistoryRecordEntity) {
    return {
      id: entity.id,
      tenant_id: Number(entity.tenantId ?? 0),
      source: entity.source,
      pattern: entity.pattern,
      library: entity.library,
      name: entity.name,
      chat_model_id: entity.chatModelId,
      create_time: formatDateTime(entity.createTime),
    };
  }

  /**
   * 将记忆详情实体转换为前端展示格式。
   * @param entity - 记忆详情实体
   * @returns 格式化后的详情对象
   */
  private detailToRow(entity: MindMemoryDetailEntity) {
    return {
      id: entity.id,
      tenant_id: Number(entity.tenantId ?? 0),
      source_id: entity.sourceId,
      type: entity.type,
      content: entity.content,
      create_time: formatDateTime(entity.createTime),
    };
  }

  /**
   * 分页查询历史记录列表。支持按来源、模式、库和名称筛选。
   * @param dto - 分页和筛选参数
   * @returns 分页结果，包含总记录数、总页数和当前页记录
   */
  async listRecords(dto: MindHistoryRecordListDto) {
    this.requireTenantId();
    const currentPage = Math.max(1, Number(dto.current_page ?? 1));
    const pageSize = Math.max(1, Math.min(200, Number(dto.page_size ?? 10)));
    const qb = this.recordRepo.createQueryBuilder('r');
    applyTenantFilter(qb, 'r');
    if (dto.source) qb.andWhere('r.source = :source', { source: dto.source });
    if (dto.pattern) qb.andWhere('r.pattern = :pattern', { pattern: dto.pattern });
    if (dto.library) qb.andWhere('r.library = :library', { library: dto.library });
    if (dto.name?.trim()) qb.andWhere('r.name LIKE :name', { name: `%${dto.name.trim()}%` });
    qb.orderBy('r.createTime', 'DESC');
    qb.skip((currentPage - 1) * pageSize).take(pageSize);
    const [list, total] = await qb.getManyAndCount();
    const pages = Math.ceil(total / pageSize) || 1;
    return { total, pages, records: list.map((row) => this.recordToRow(row)) };
  }

  async updateRecord(dto: MindHistoryRecordUpdateDto) {
    this.requireTenantId();
    await this.recordRepo.update(appendTenantWhere({ id: dto.id }), { name: dto.name });
  }

  async updateRecordModels(args: { id: string; chatModelId?: string | null }) {
    this.requireTenantId();
    const patch: Partial<MindHistoryRecordEntity> = {};
    if (args.chatModelId !== undefined) patch.chatModelId = args.chatModelId;
    await this.recordRepo.update(appendTenantWhere({ id: args.id }), patch);
  }

  /**
   * 批量删除历史记录及其关联的记忆详情。
   * @param dto - 包含逗号分隔的记录 ID 字符串
   */
  async deleteRecords(dto: MindHistoryRecordDeleteDto) {
    this.requireTenantId();
    const ids = String(dto.ids || '')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
    if (!ids.length) return;

    await this.detailRepo.delete(appendTenantWhere({ sourceId: In(ids) }));
    await this.recordRepo.delete(appendTenantWhere({ id: In(ids) }));
  }

  /**
   * 查询记忆详情列表，可按来源 ID 筛选。
   * @param dto - 筛选参数
   * @returns 详情记录数组
   */
  async listDetails(dto: MindMemoryDetailListDto) {
    this.requireTenantId();
    const qb = this.detailRepo.createQueryBuilder('d');
    applyTenantFilter(qb, 'd');
    if (dto.source_id) qb.andWhere('d.sourceId = :sourceId', { sourceId: dto.source_id });
    qb.orderBy('d.createTime', 'ASC');
    const list = await qb.getMany();
    return list.map((row) => this.detailToRow(row));
  }

  /**
   * 将指定来源的记忆详情导出为纯文本格式，包含 user/assistant 角色标签。
   * @param sourceId - 来源 ID
   * @returns 格式化后的对话文本
   */
  async downloadDetailsText(sourceId: string) {
    this.requireTenantId();
    const list = await this.listDetails({ source_id: sourceId });
    const blocks = list.map((row) => {
      const role = row.type === 'user' ? 'user' : 'assistant';
      return `## ${role}\n\n${row.content || ''}`;
    });
    return `${blocks.join('\n\n')}\n`;
  }

  /**
   * 确保历史记忆记录存在。若不存在则创建，并可选插入用户查询详情。
   * @param args - 插入参数，包含来源 ID、来源、模式、库和查询内容
   */
  async ensureHistoryMemory(args: MindHistoryInsertArgs) {
    this.requireTenantId();
    const sourceId = args.source_id;
    if (!sourceId) return;
    const existed = await this.recordRepo.findOne({ where: appendTenantWhere({ id: sourceId }) });
    if (existed) {
      if (!existed.library && args.library) {
        await this.recordRepo.update(appendTenantWhere({ id: sourceId }), { library: args.library });
      }
      return;
    }
    const entity = this.recordRepo.create(
      withTenantId({
        id: sourceId,
        source: args.source ?? null,
        pattern: args.pattern ?? null,
        library: args.library ?? null,
        name: args.query ?? null,
        chatModelId: args.chat_model_id ?? null,
        createTime: new Date(),
      } as Partial<MindHistoryRecordEntity> as any),
    );
    await this.recordRepo.save(entity);
    if (args.query) {
      await this.insertUserDetail(sourceId, args.query);
    }
  }

  /**
   * 插入用户角色的记忆详情记录。
   * @param sourceId - 来源 ID
   * @param content - 用户消息内容
   */
  async insertUserDetail(sourceId: string, content: string) {
    this.requireTenantId();
    const entity = this.detailRepo.create(
      withTenantId({
        id: generateUUID(),
        sourceId,
        type: 'user',
        content,
        createTime: new Date(),
      } as Partial<MindMemoryDetailEntity> as any),
    );
    await this.detailRepo.save(entity);
  }

  /**
   * 插入 AI 角色的记忆详情记录。
   * @param sourceId - 来源 ID
   * @param content - AI 回复内容
   */
  async insertAiDetail(sourceId: string, content: string) {
    this.requireTenantId();
    const entity = this.detailRepo.create(
      withTenantId({
        id: generateUUID(),
        sourceId,
        type: 'ai',
        content,
        createTime: new Date(),
      } as Partial<MindMemoryDetailEntity> as any),
    );
    await this.detailRepo.save(entity);
  }
}
