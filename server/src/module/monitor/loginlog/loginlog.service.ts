import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Response } from 'express-serve-static-core';
import { Repository, Not, IsNull } from 'typeorm';
import { ResultData } from '../../../common/utils/result';
import { ExportTable } from '../../../common/utils/export';
import { formatDateTime } from '../../../common/utils/index';
import { LoginLogEntity } from './entities/loginlog.entity';
import { CreateLoginlogDto } from './dto/index';
import { AxiosService } from '../../common/axios/axios.service';

@Injectable()
export class LoginlogService {
  constructor(
    @InjectRepository(LoginLogEntity)
    private readonly loginLogEntityRep: Repository<LoginLogEntity>,
    private readonly axiosService: AxiosService,
  ) {}

  /**
   * 格式化登录日志记录行
   * @param item - 登录日志实体
   * @returns 格式化后的日志对象
   */
  private formatRow(item: LoginLogEntity) {
    return {
      id: item.id,
      username: item.username || '',
      ip: item.ip || '',
      ip_location: item.ipLocation || '',
      os: item.os,
      browser: item.browser,
      status: item.status,
      message: item.message,
      login_time: formatDateTime(item.loginTime),
      create_time: formatDateTime(item.createTime),
      update_time: formatDateTime(item.updateTime),
    };
  }

  /**
   * 创建登录日志
   * @param createLoginlogDto - 登录日志 DTO 对象
   * @returns 创建的日志记录
   */
  async create(createLoginlogDto: CreateLoginlogDto) {
    const logData: any = {};
    if (createLoginlogDto.ipaddr) logData.ip = createLoginlogDto.ipaddr;
    if (createLoginlogDto.userName != null && createLoginlogDto.userName !== '') {
      logData.username = createLoginlogDto.userName;
    }
    const loginLocation = String(createLoginlogDto.loginLocation || '').trim();
    if (loginLocation && loginLocation !== createLoginlogDto.ipaddr) {
      logData.ipLocation = loginLocation;
    } else if (createLoginlogDto.ipaddr) {
      logData.ipLocation = await this.axiosService.getIpAddress(createLoginlogDto.ipaddr);
    }
    if (createLoginlogDto.browser) logData.browser = createLoginlogDto.browser;
    if (createLoginlogDto.os) logData.os = createLoginlogDto.os;
    if (createLoginlogDto.msg) logData.message = createLoginlogDto.msg;
    if (createLoginlogDto.status) logData.status = createLoginlogDto.status === '0' ? 1 : 2;
    logData.loginTime = new Date();
    return await this.loginLogEntityRep.save(logData);
  }

  /**
   * 分页查询登录日志列表
   * @param query - 查询参数（支持 username、ip、status、login_time 等筛选条件）
   * @returns 分页结果
   */
  async findAll(query: Record<string, any>) {
    const entity = this.loginLogEntityRep.createQueryBuilder('entity');
    entity.where('entity.deleteTime IS NULL');

    if (query.username) {
      entity.andWhere('entity.username LIKE :username', { username: `%${query.username}%` });
    }

    if (query.ip) {
      entity.andWhere('entity.ip LIKE :ip', { ip: `%${query.ip}%` });
    }

    if (query.status !== undefined && query.status !== null && query.status !== '') {
      const status = Number(query.status) === 0 ? 2 : Number(query.status);
      entity.andWhere('entity.status = :status', { status });
    }

    const loginTime = query.login_time;
    if (Array.isArray(loginTime) && loginTime.length === 2) {
      entity.andWhere('entity.loginTime BETWEEN :start AND :end', {
        start: loginTime[0],
        end: loginTime[1],
      });
    }

    const orderFieldMap: Record<string, string> = {
      login_time: 'loginTime',
      create_time: 'createTime',
      id: 'id',
    };
    const orderField = orderFieldMap[query.orderField] || 'loginTime';
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

  async remove(ids: number[]) {
    if (!ids.length) {
      return ResultData.fail(400, '请选择要删除的数据');
    }
    await this.loginLogEntityRep.softDelete(ids);
    return ResultData.ok({ count: ids.length });
  }

  async removeAll() {
    await this.loginLogEntityRep.softDelete({ id: Not(IsNull()) });
    return ResultData.ok();
  }

  /**
   * 导出登录日志为 Excel
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
      sheetName: '登录日志',
      data: list.data.list,
      header: [
        { title: '序号', dataIndex: 'id' },
        { title: '用户账号', dataIndex: 'username' },
        { title: '登录状态', dataIndex: 'status' },
        { title: '登录地址', dataIndex: 'ip' },
        { title: '登录地点', dataIndex: 'ip_location' },
        { title: '浏览器', dataIndex: 'browser' },
        { title: '操作系统', dataIndex: 'os' },
        { title: '提示消息', dataIndex: 'message' },
        { title: '访问时间', dataIndex: 'login_time' },
      ],
      dictMap: {
        status: {
          1: '成功',
          2: '失败',
        },
      },
    };
    ExportTable(options, res);
  }
}
