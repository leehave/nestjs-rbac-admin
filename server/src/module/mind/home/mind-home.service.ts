import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import { Repository } from 'typeorm';
import { applyTenantFilter, getTenantId } from '../../../common/utils/tenant.util';
import { LoginLogEntity } from '../../monitor/loginlog/entities/loginlog.entity';
import { UserEntity } from '../../system/user/entities/sys-user.entity';
import { SysUserTenantEntity } from '../../system/user/entities/user-tenant.entity';
import { MindHistoryRecordEntity } from '../history/entities/mind-history-record.entity';
import { MindMemoryDetailEntity } from '../history/entities/mind-memory-detail.entity';
import { MindSystemModelEntity } from '../model/entities/mind-system-model.entity';

type MemoryStats = Record<string, { number: number; time: number }>;

const WEATHER_CITY_MAP: Record<string, { query: string; label: string }> = {
  '101110101': { query: "Xi'an", label: '西安市' },
  '101010100': { query: 'Beijing', label: '北京市' },
  '101020100': { query: 'Shanghai', label: '上海市' },
  '101280101': { query: 'Guangzhou', label: '广州市' },
  '101280601': { query: 'Shenzhen', label: '深圳市' },
};

const WEATHER_BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Referer: 'http://www.sojson.com/',
  Accept: 'application/json, text/plain, */*',
};

@Injectable()
export class MindHomeService {
  private readonly logger = new Logger(MindHomeService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(MindSystemModelEntity)
    private readonly modelRepo: Repository<MindSystemModelEntity>,
    @InjectRepository(MindHistoryRecordEntity)
    private readonly historyRepo: Repository<MindHistoryRecordEntity>,
    @InjectRepository(MindMemoryDetailEntity)
    private readonly memoryDetailRepo: Repository<MindMemoryDetailEntity>,
    @InjectRepository(LoginLogEntity)
    private readonly loginLogRepo: Repository<LoginLogEntity>,
  ) {}

  private requireTenantId(): number {
    const tenantId = getTenantId();
    if (!tenantId) throw new UnauthorizedException('Unauthorized');
    return tenantId;
  }

  private resolveWeatherCity(cityCode?: string) {
    const code = String(cityCode || '101110101').trim() || '101110101';
    return { code, city: WEATHER_CITY_MAP[code] ?? WEATHER_CITY_MAP['101110101'] };
  }

  private translateWeatherType(type?: string) {
    const text = String(type || '').trim();
    if (!text) return '多云';
    if (/rain|shower|drizzle/i.test(text)) return '雨';
    if (/snow/i.test(text)) return '雪';
    if (/cloud|overcast|haze|mist|fog|smoky/i.test(text)) return '多云';
    if (/sun|clear/i.test(text)) return '晴';
    return text;
  }

  private translateWindDirection(direction?: string) {
    const map: Record<string, string> = {
      N: '北风',
      NE: '东北风',
      E: '东风',
      SE: '东南风',
      S: '南风',
      SW: '西南风',
      W: '西风',
      NW: '西北风',
      NNE: '东北风',
      ENE: '东北风',
      ESE: '东南风',
      SSE: '东南风',
      SSW: '西南风',
      WSW: '西南风',
      WNW: '西北风',
      NNW: '西北风',
    };
    const key = String(direction || '').trim().toUpperCase();
    return map[key] || '东风';
  }

  private fallbackWeather(cityCode: string) {
    const city = WEATHER_CITY_MAP[cityCode]?.label || '西安市';
    return {
      cityInfo: { city },
      data: {
        forecast: [
          {
            type: '多云',
            low: '低温 --℃',
            high: '高温 --℃',
            fx: '东风',
            notice: '天气服务暂不可用，请稍后重试',
          },
        ],
      },
    };
  }

  private async fetchWeatherFromSojson(cityCode: string) {
    const url = `http://t.weather.sojson.com/api/weather/city/${encodeURIComponent(cityCode)}`;
    const res = await axios.get(url, {
      timeout: 5000,
      headers: WEATHER_BROWSER_HEADERS,
      validateStatus: (status) => status >= 200 && status < 300,
    });
    if (res.data?.cityInfo?.city || res.data?.data?.forecast?.length) {
      return res.data;
    }
    throw new Error('sojson weather payload empty');
  }

  private async fetchWeatherFromWttr(cityCode: string) {
    const city = WEATHER_CITY_MAP[cityCode] ?? WEATHER_CITY_MAP['101110101'];
    const url = `https://wttr.in/${encodeURIComponent(city.query)}?format=j1`;
    const res = await axios.get(url, {
      timeout: 8000,
      headers: { 'User-Agent': 'curl/8.0' },
    });
    const payload = res.data;
    const today = payload?.weather?.[0];
    const current = payload?.current_condition?.[0];
    const type = this.translateWeatherType(current?.weatherDesc?.[0]?.value || today?.hourly?.[4]?.weatherDesc?.[0]?.value);
    const low = today?.mintempC ?? current?.temp_C;
    const high = today?.maxtempC ?? current?.temp_C;

    return {
      cityInfo: { city: city.label },
      data: {
        forecast: [
          {
            type,
            low: low != null ? `低温 ${low}℃` : '低温 --℃',
            high: high != null ? `高温 ${high}℃` : '高温 --℃',
            fx: this.translateWindDirection(current?.winddir16Point),
            notice: type === '雨' ? '有降水，出门请带伞' : '请关注天气变化',
          },
        ],
      },
    };
  }

  async snatchCurrentWeather(cityCode?: string) {
    const { code } = this.resolveWeatherCity(cityCode);

    try {
      return await this.fetchWeatherFromSojson(code);
    } catch (error) {
      this.logger.warn(`sojson weather failed for ${code}, fallback to wttr.in`);
    }

    try {
      return await this.fetchWeatherFromWttr(code);
    } catch (error) {
      this.logger.warn(`wttr.in weather failed for ${code}, use static fallback`);
    }

    return this.fallbackWeather(code);
  }

  private async countUsersAndVisits(tenantId: number) {
    const usersQb = this.userRepo
      .createQueryBuilder('u')
      .innerJoin(SysUserTenantEntity, 'ut', 'ut.userId = u.id AND ut.tenantId = :tenantId AND ut.deleteTime IS NULL', {
        tenantId,
      })
      .where('u.deleteTime IS NULL');
    const userCount = await usersQb.getCount();

    const usernamesRows = await usersQb.select('u.username', 'username').getRawMany<{ username: string }>();
    const usernames = usernamesRows.map((row) => row.username).filter(Boolean);
    if (!usernames.length) {
      return { user_count: userCount, visit_count: 0 };
    }

    const visitCount = await this.loginLogRepo
      .createQueryBuilder('log')
      .where('log.deleteTime IS NULL')
      .andWhere('log.status = :status', { status: 1 })
      .andWhere('log.username IN (:...usernames)', { usernames })
      .getCount();

    return { user_count: userCount, visit_count: visitCount };
  }

  private async countModelsByType() {
    const qb = this.modelRepo
      .createQueryBuilder('model')
      .select('model.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('model.type IS NOT NULL');
    applyTenantFilter(qb, 'model');
    qb.groupBy('model.type');

    const rows = await qb.getRawMany<{ type: string; count: string }>();
    return rows.reduce<Record<string, number>>((dict, row) => {
      if (row.type) dict[row.type] = Number(row.count) || 0;
      return dict;
    }, {});
  }

  private async collectHistoryRecords() {
    const qb = this.historyRepo.createQueryBuilder('record');
    applyTenantFilter(qb, 'record');
    qb.orderBy('record.createTime', 'ASC');

    const records = await qb.getMany();
    return records.reduce<Record<string, string[]>>((dict, record) => {
      const source = record.source || '';
      const pattern = record.pattern || '';
      const key = `${source}${pattern ? '-' : ''}${pattern}`;
      if (!key) return dict;
      if (!dict[key]) dict[key] = [];
      dict[key].push(record.id);
      return dict;
    }, {});
  }

  private async collectMemoryDetails(): Promise<MemoryStats> {
    const qb = this.memoryDetailRepo
      .createQueryBuilder('detail')
      .where('detail.sourceId IS NOT NULL')
      .andWhere('detail.createTime IS NOT NULL');
    applyTenantFilter(qb, 'detail');
    qb.orderBy('detail.sourceId', 'ASC').addOrderBy('detail.createTime', 'ASC');

    const details = await qb.getMany();
    const stats: MemoryStats = {};
    const pendingUserAt = new Map<string, Date>();

    for (const detail of details) {
      const sourceId = detail.sourceId;
      if (!sourceId || !detail.createTime) continue;

      if (!stats[sourceId]) stats[sourceId] = { number: 0, time: 0 };
      if (detail.type === 'user') {
        stats[sourceId].number += 1;
        pendingUserAt.set(sourceId, detail.createTime);
        continue;
      }

      if (detail.type === 'ai') {
        const userAt = pendingUserAt.get(sourceId);
        if (!userAt) continue;
        const seconds = Math.max(0, (detail.createTime.getTime() - userAt.getTime()) / 1000);
        stats[sourceId].time += seconds;
        pendingUserAt.delete(sourceId);
      }
    }

    return stats;
  }

  /**
   * 刷新首页统计数据
   * @returns 包含用户数、访问数、模型字典、历史记录和内存详情等统计信息的对象
   */
  async refreshStatistics() {
    const tenantId = this.requireTenantId();
    const [userStatistics, modelDicts, historyRecords, memoryDetails] = await Promise.all([
      this.countUsersAndVisits(tenantId),
      this.countModelsByType(),
      this.collectHistoryRecords(),
      this.collectMemoryDetails(),
    ]);

    return {
      ...userStatistics,
      model_dicts: modelDicts,
      history_records: historyRecords,
      memory_details: memoryDetails,
    };
  }
}

