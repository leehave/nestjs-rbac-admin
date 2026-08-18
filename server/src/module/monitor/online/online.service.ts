import { Injectable } from '@nestjs/common';
import { ResultData } from '../../../common/utils/result';
import { RedisService } from '../../../redis/redis.service';
import { CacheEnum } from '../../../common/enum/index';
import { formatDateTime } from '../../../common/utils/index';

@Injectable()
export class OnlineService {
  constructor(private readonly redisService: RedisService) {}
  /**
   * 日志列表-分页
   * @param query
   * @returns
   */
  async findAll(query: any) {
    const keys = await this.redisService.keys(`${CacheEnum.LOGIN_TOKEN_KEY}*`);
    if (!keys?.length) {
      return ResultData.ok({
        list: [],
        total: 0,
      });
    }

    const values = await this.redisService.mget(keys);
    const records = keys
      .map((key, index) => {
        const item = values[index];
        if (!item) return null;
        const tokenId = item.token || key.replace(CacheEnum.LOGIN_TOKEN_KEY, '');
        return {
          tokenId,
          deptName: item.user?.deptName || '',
          userName: item.userName || item.user?.username || '',
          ipaddr: item.ipaddr || item.user?.loginIp || '',
          loginLocation: item.loginLocation || '',
          browser: item.browser || '',
          os: item.os || '',
          loginTime: formatDateTime(item.loginTime) || '',
        };
      })
      .filter(Boolean);

    const userName = String(query.userName || query.username || '').trim();
    const ipaddr = String(query.ipaddr || query.ip || '').trim();

    let filtered = records;
    if (userName) {
      filtered = filtered.filter((item) => String(item.userName || '').includes(userName));
    }
    if (ipaddr) {
      filtered = filtered.filter((item) => String(item.ipaddr || '').includes(ipaddr));
    }

    filtered.sort((a, b) => +new Date(b.loginTime || 0) - +new Date(a.loginTime || 0));

    const pageNum = Number(query.page || query.pageNum || 1);
    const pageSize = Number(query.limit || query.pageSize || 10);
    const start = (pageNum - 1) * pageSize;
    const list = filtered.slice(start, start + pageSize);

    return ResultData.ok({
      list,
      total: filtered.length,
    });
  }

  async delete(token: string) {
    await this.redisService.del(`${CacheEnum.LOGIN_TOKEN_KEY}${token}`);
    return ResultData.ok();
  }
}
