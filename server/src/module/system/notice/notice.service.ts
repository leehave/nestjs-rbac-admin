import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResultData } from '../../../common/utils/result';
import { SysNoticeEntity } from './entities/notice.entity';
import { applyTenantFilter } from '../../../common/utils/tenant.util';
import { formatDateTime } from '../../../common/utils/index';
import { CreateNoticeDto, UpdateNoticeDto, ListNoticeDto } from './dto/index';

@Injectable()
export class NoticeService {
  constructor(
    @InjectRepository(SysNoticeEntity)
    private readonly noticeRepo: Repository<SysNoticeEntity>,
  ) {}

  private formatNotice(item: SysNoticeEntity) {
    return {
      noticeId: Number(item.id),
      noticeTitle: item.title,
      noticeType: item.type,
      noticeContent: item.content,
      status: item.status,
      remark: item.remark,
      createBy: item.createdBy,
      createTime: formatDateTime(item.createTime),
      updateTime: formatDateTime(item.updateTime),
    };
  }

  async create(dto: CreateNoticeDto) {
    await this.noticeRepo.save(dto);
    return ResultData.ok();
  }

  async findAll(query: ListNoticeDto & Record<string, any>) {
    const entity = this.noticeRepo.createQueryBuilder('entity');
    entity.where('entity.deleteTime IS NULL');

    if (query.title || query.noticeTitle) {
      entity.andWhere(`entity.title LIKE "%${query.title || query.noticeTitle}%"`);
    }

    if (query.createBy) {
      entity.andWhere(`entity.created_by LIKE "%${query.createBy}%"`);
    }

    if (query.type !== undefined && query.type !== null) {
      entity.andWhere('entity.type = :type', { type: query.type });
    }

    if (query.status !== undefined && query.status !== null) {
      entity.andWhere('entity.status = :status', { status: query.status });
    }

    applyTenantFilter(entity, 'entity');

    const pageNum = Number(query.pageNum || query.page || 1);
    const pageSize = Number(query.pageSize || query.limit || 10);
    entity.skip(pageSize * (pageNum - 1)).take(pageSize);
    entity.orderBy('entity.createTime', 'DESC');

    const [list, total] = await entity.getManyAndCount();

    return ResultData.ok({
      rows: list.map((item) => this.formatNotice(item)),
      list: list.map((item) => this.formatNotice(item)),
      total,
      page: pageNum,
      current_page: pageNum,
      size: pageSize,
      per_page: pageSize,
    });
  }

  async findOne(id: number) {
    const item = await this.noticeRepo.findOne({ where: { id } });
    if (!item) return ResultData.fail(404, '公告不存在');
    return ResultData.ok(this.formatNotice(item));
  }

  async update(dto: UpdateNoticeDto) {
    await this.noticeRepo.update(dto.id, dto as any);
    return ResultData.ok();
  }

  async remove(ids: number[]) {
    await this.noticeRepo.softDelete(ids);
    return ResultData.ok();
  }
}
