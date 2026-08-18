import { Injectable } from '@nestjs/common';
import { IsNull, Not, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { OperLogEntity } from './entities/operlog.entity';
import type { Request } from 'express';
import { ResultData } from '../../../common/utils/result';
import { ExportTable } from '../../../common/utils/export';
import { formatDateTime } from '../../../common/utils/index';
import type { Response } from 'express-serve-static-core';
import { AxiosService } from '../../common/axios/axios.service';
import { normalizeClientIp } from '../../../common/utils/ip.util';

@Injectable()
export class OperlogService {
  constructor(
    @InjectRepository(OperLogEntity)
    private readonly operLogEntityRep: Repository<OperLogEntity>,
    private readonly axiosService: AxiosService,
  ) {}

  /**
   * 格式化操作日志记录行
   * @param item - 操作日志实体
   * @returns 格式化后的日志对象
   */
  private formatRow(item: OperLogEntity) {
    return {
      id: item.id,
      username: item.username,
      app: item.app,
      method: item.method,
      router: item.router,
      service_name: item.serviceName,
      ip: item.ip,
      ip_location: item.ipLocation,
      request_data: item.requestData,
      duration: item.duration,
      remark: item.remark,
      create_time: formatDateTime(item.createTime),
      update_time: formatDateTime(item.updateTime),
    };
  }

  /**
   * 分页查询操作日志列表
   * @param query - 查询参数（支持 username、ip、router、service_name、create_time 等筛选条件）
   * @returns 分页结果
   */
  async findAll(query: Record<string, any>) {
    const entity = this.operLogEntityRep.createQueryBuilder('entity');
    entity.where('entity.deleteTime IS NULL');

    if (query.username) {
      entity.andWhere('entity.username LIKE :username', { username: `%${query.username}%` });
    }

    if (query.ip) {
      entity.andWhere('entity.ip LIKE :ip', { ip: `%${query.ip}%` });
    }

    if (query.router) {
      entity.andWhere('entity.router LIKE :router', { router: `%${query.router}%` });
    }

    if (query.service_name) {
      entity.andWhere('entity.serviceName LIKE :serviceName', { serviceName: `%${query.service_name}%` });
    }

    const createTime = query.create_time;
    if (Array.isArray(createTime) && createTime.length === 2) {
      entity.andWhere('entity.createTime BETWEEN :start AND :end', {
        start: createTime[0],
        end: createTime[1],
      });
    }

    const orderFieldMap: Record<string, string> = {
      create_time: 'createTime',
      id: 'id',
    };
    const orderField = orderFieldMap[query.orderField] || 'createTime';
    const orderType = query.orderType === 'asc' ? 'ASC' : 'DESC';
    entity.orderBy(`entity.${orderField}`, orderType);

    const pageNum = Number(query.pageNum || query.page || 1);
    const pageSize = Number(query.pageSize || query.limit || 10);
    entity.skip(pageSize * (pageNum - 1)).take(pageSize);

    const [list, total] = await entity.getManyAndCount();

    return ResultData.ok({
      list: list.map((item) => this.formatRow(item)),
      total,
      page: pageNum,
      current_page: pageNum,
      size: pageSize,
      per_page: pageSize,
    });
  }

  async findOne(id: number) {
    const res = await this.operLogEntityRep.findOne({
      where: { id },
    });
    return ResultData.ok(res ? this.formatRow(res) : null);
  }

  async removeAll() {
    await this.operLogEntityRep.softDelete({ id: Not(IsNull()) });
    return ResultData.ok();
  }

  async remove(ids: number[]) {
    if (!ids.length) {
      return ResultData.fail(400, '请选择要删除的数据');
    }
    await this.operLogEntityRep.softDelete(ids);
    return ResultData.ok({ count: ids.length });
  }

  /**
   * 记录操作日志（用于 AOP 切面自动记录）
   * @param params.request - Express 请求对象
   * @param params.resultData - 返回结果数据
   * @param params.costTime - 请求耗时（毫秒）
   * @param params.title - 操作标题
   * @param params.handlerName - 处理器名称
   * @param params.errorMsg - 错误信息（可选）
   * @param params.businessType - 业务类型
   */
  async logAction({
    request,
    resultData,
    costTime,
    title,
    handlerName,
    errorMsg,
    businessType,
  }: {
    request: Request & { user?: any };
    resultData?: any;
    costTime: number;
    title: string;
    handlerName: string;
    errorMsg?: string;
    businessType: number;
  }) {
    const { originalUrl, method, ip, body, query: reqQuery } = request;
    const userData = request.user || {};
    const user = userData.user || { username: '' };
    const bodyAny: any = body || {};

    const clientIp = normalizeClientIp(ip);
    const ipLocation = await this.axiosService.getIpAddress(clientIp);

    const params: any = {
      app: title,
      method: method.toUpperCase(),
      serviceName: handlerName,
      username: userData.userName || user.username || bodyAny.username || '',
      router: originalUrl,
      ip: clientIp,
      ipLocation,
      requestData: JSON.stringify({ ...bodyAny, ...reqQuery }),
      duration: costTime + 'ms',
      remark: errorMsg || '',
    };

    await this.operLogEntityRep.save(params);
  }

  /**
   * 导出操作日志为 Excel
   * @param res - Express 响应对象
   * @param body - 查询参数（会自动剔除分页参数）
   */
  async export(res: Response, body: Record<string, any>) {
    delete body.pageNum;
    delete body.pageSize;
    delete body.page;
    delete body.limit;
    const list = await this.findAll(body);
    const options = {
      sheetName: '操作日志数据',
      data: list.data.list,
      header: [
        { title: '日志编号', dataIndex: 'id' },
        { title: '系统模块', dataIndex: 'app', width: 15 },
        { title: '请求方式', dataIndex: 'method' },
        { title: '操作人员', dataIndex: 'username' },
        { title: '主机', dataIndex: 'ip' },
        { title: '操作时间', dataIndex: 'create_time', width: 15 },
        { title: '消耗时间', dataIndex: 'duration' },
      ],
    };
    ExportTable(options, res);
  }
}
