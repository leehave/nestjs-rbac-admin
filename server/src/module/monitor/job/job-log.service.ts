import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { JobLog } from './entities/job-log.entity';
import { ListJobLogDto } from './dto/create-job.dto';
import { ResultData } from '../../../common/utils/result';
import { ExportTable } from '../../../common/utils/export';
import type { Response } from 'express-serve-static-core';
import { formatDateTime } from '../../../common/utils/index';

@Injectable()
export class JobLogService {
  constructor(
    @InjectRepository(JobLog)
    private jobLogRepository: Repository<JobLog>,
  ) {}

  /**
   * 格式化定时任务日志数据
   * @param item - 原始日志实体
   * @returns 格式化后的日志对象
   */
  private formatJobLog(item: JobLog) {
    const jobLogId = Number(item.jobLogId);
    return {
      job_log_id: jobLogId,
      id: jobLogId,
      job_name: item.job_name,
      job_group: item.job_group,
      invoke_target: item.invoke_target,
      job_message: item.job_message,
      status: item.status,
      exception_info: item.exception_info,
      create_time: formatDateTime(item.create_time),
    };
  }

  /**
   * 获取查询的时间范围
   * @param query - 查询参数
   * @returns 包含 start/end 的对象，若无时间条件则返回 null
   */
  private getDateRange(query: ListJobLogDto) {
    const createTime = query.create_time;
    if (Array.isArray(createTime) && createTime.length === 2) {
      return { start: createTime[0], end: createTime[1] };
    }
    if (query.beginTime && query.endTime) {
      return { start: query.beginTime, end: query.endTime };
    }
    if (query.params?.beginTime && query.params?.endTime) {
      return { start: query.params.beginTime, end: query.params.endTime };
    }
    return null;
  }

  /**
   * 查询定时任务日志列表（分页）
   * @param query - 查询条件（任务名称、分组、状态、时间范围）
   * @returns 分页结果
   */
  async list(query: ListJobLogDto) {
    const entity = this.jobLogRepository.createQueryBuilder('entity');

    if (query.job_name) {
      entity.andWhere('entity.job_name LIKE :job_name', { job_name: `%${query.job_name}%` });
    }

    if (query.job_group) {
      entity.andWhere('entity.job_group = :job_group', { job_group: query.job_group });
    }

    if (query.status !== undefined && query.status !== null && `${query.status}` !== '') {
      entity.andWhere('entity.status = :status', { status: `${query.status}` });
    }

    const dateRange = this.getDateRange(query);
    if (dateRange) {
      entity.andWhere('entity.create_time BETWEEN :start AND :end', dateRange);
    }

    const pageNum = Number(query.pageNum || query.page || 1);
    const pageSize = Number(query.pageSize || query.limit || 10);
    entity.skip(pageSize * (pageNum - 1)).take(pageSize);
    entity.orderBy('entity.create_time', 'DESC');

    const [list, total] = await entity.getManyAndCount();

    return ResultData.ok({
      list: list.map((item) => this.formatJobLog(item)),
      total,
      page: pageNum,
      current_page: pageNum,
      size: pageSize,
      per_page: pageSize,
    });
  }

  async addJobLog(jobLog: Partial<JobLog>) {
    const log = this.jobLogRepository.create(jobLog);
    await this.jobLogRepository.save(log);
    return ResultData.ok();
  }

  async delete(jobLogIds: number | number[]) {
    const ids = Array.isArray(jobLogIds) ? jobLogIds : [jobLogIds];
    await this.jobLogRepository.delete(ids);
    return ResultData.ok();
  }

  async clean() {
    await this.jobLogRepository.clear();
    return ResultData.ok();
  }

  /**
   * 导出调度日志为 xlsx 文件
   * @param res - Express 响应对象
   * @param body - 查询条件
   */
  async export(res: Response, body: ListJobLogDto) {
    const result = await this.list(body);
    const rows = result.data.list.map((item: any) => ({
      job_name: item.job_name,
      job_group: item.job_group,
      invoke_target: item.invoke_target,
      job_message: item.job_message,
      status: item.status === '0' ? '成功' : '失败',
      create_time: item.create_time,
    }));
    const column = [
      { header: '任务名称', key: 'job_name', width: 30 },
      { header: '任务组名', key: 'job_group', width: 20 },
      { header: '调用目标', key: 'invoke_target', width: 50 },
      { header: '日志信息', key: 'job_message', width: 50 },
      { header: '状态', key: 'status', width: 10 },
      { header: '执行时间', key: 'create_time', width: 30 },
    ];
    await ExportTable({ data: rows, header: column }, res);
  }
}
