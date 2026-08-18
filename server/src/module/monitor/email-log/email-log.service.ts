import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { ResultData } from '../../../common/utils/result';
import { EmailLogEntity } from './entities/email-log.entity';
import { ListEmailLogDto } from './dto/index';
import { formatDateTime } from '../../../common/utils/index';

@Injectable()
export class EmailLogService {
  constructor(
    @InjectRepository(EmailLogEntity)
    private readonly emailLogEntityRep: Repository<EmailLogEntity>,
  ) {}

  /**
   * 格式化邮件日志实体为输出对象
   * @param item - 邮件日志实体
   * @returns 格式化后的日志对象，含格式化后的时间字段
   */
  private formatRow(item: EmailLogEntity) {
    return {
      id: item.id,
      gateway: item.gateway,
      from: item.from,
      email: item.email,
      code: item.code,
      content: item.content,
      status: item.status,
      response: item.response,
      create_time: formatDateTime(item.createTime),
      update_time: formatDateTime(item.updateTime),
    };
  }

  /**
   * 分页查询邮件日志列表，支持按发件人、收件人、状态、时间范围筛选
   * @param query - 查询参数（分页、筛选条件、排序方式）
   * @returns 分页结果，包含列表与统计数据
   */
  async findAll(query: ListEmailLogDto & Record<string, any>) {
    const entity = this.emailLogEntityRep.createQueryBuilder('entity');
    entity.where('entity.deleteTime IS NULL');

    if (query.from) {
      entity.andWhere(`entity.from LIKE :from`, { from: `%${query.from}%` });
    }

    if (query.email) {
      entity.andWhere(`entity.email LIKE :email`, { email: `%${query.email}%` });
    }

    if (query.status) {
      entity.andWhere('entity.status = :status', { status: query.status });
    }

    const createTime = query.create_time;
    if (Array.isArray(createTime) && createTime.length === 2) {
      entity.andWhere('entity.createTime BETWEEN :start AND :end', {
        start: createTime[0],
        end: createTime[1],
      });
    }

    const orderField = query.orderField === 'create_time' ? 'createTime' : 'createTime';
    const orderType = query.orderType === 'asc' ? 'ASC' : 'DESC';
    entity.orderBy(`entity.${orderField}`, orderType);

    const pageNum = Number(query.pageNum || query.page || 1);
    const pageSize = Number(query.pageSize || query.limit || 10);
    entity.skip(pageSize * (pageNum - 1)).take(pageSize);

    const [list, total] = await entity.getManyAndCount();

    return ResultData.ok({
      list: list.map((item) => this.formatRow(item)),
      data: list.map((item) => this.formatRow(item)),
      total,
      page: pageNum,
      current_page: pageNum,
      size: pageSize,
      per_page: pageSize,
    });
  }

  async remove(ids: number[]) {
    await this.emailLogEntityRep.softDelete(ids);
    return ResultData.ok({ count: ids.length });
  }

  async removeAll() {
    await this.emailLogEntityRep.softDelete({ id: Not(IsNull()) });
    return ResultData.ok();
  }
}
