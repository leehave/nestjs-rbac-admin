import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { normalizeClientIp } from '../../../common/utils/ip.util';
import { RedisService } from '../../../redis/redis.service';

const IP_CACHE_PREFIX = 'ip:geo:';
const IP_CACHE_TTL_MS = 86400_000; // 24 小时（RedisService.set 使用毫秒 PX）

@Injectable()
export class AxiosService {
  private readonly logger = new Logger(AxiosService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly redisService: RedisService,
  ) {}

  async get(url: string, config?: any): Promise<any> {
    const response = await firstValueFrom(this.httpService.get(url, config));
    return response.data;
  }

  async post(url: string, data?: any, config?: any): Promise<any> {
    const response = await firstValueFrom(this.httpService.post(url, data, config));
    return response.data;
  }

  async put(url: string, data?: any, config?: any): Promise<any> {
    const response = await firstValueFrom(this.httpService.put(url, data, config));
    return response.data;
  }

  async delete(url: string, config?: any): Promise<any> {
    const response = await firstValueFrom(this.httpService.delete(url, config));
    return response.data;
  }

  /**
   * 判断 IP 是否为私有/内网地址
   * 支持 IPv4（10/172.16-31/192.168/127/0）和 IPv6（fc/fd/fe80/::1）。
   * @param ip - 待判断的 IP 地址字符串
   * @returns 是否为私有地址
   */
  private isPrivateIp(ip: string): boolean {
    if (!ip) return true;
    if (ip === '127.0.0.1' || ip === '0.0.0.0') return true;
    if (ip.startsWith('10.') || ip.startsWith('192.168.')) return true;

    const parts = ip.split('.').map((item) => Number(item));
    if (parts.length === 4 && parts.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)) {
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
      return false;
    }

    const lowerIp = ip.toLowerCase();
    return lowerIp.startsWith('fd') || lowerIp.startsWith('fc') || lowerIp.startsWith('fe80') || lowerIp === '::1';
  }

  /** Redis 缓存读取 */
  private async getRedisCache(ip: string): Promise<string | null> {
    try {
      const val = await this.redisService.get(`${IP_CACHE_PREFIX}${ip}`);
      return typeof val === 'string' && val ? val : null;
    } catch {
      return null;
    }
  }

  /** Redis 缓存写入（24 小时 TTL） */
  private async setRedisCache(ip: string, location: string): Promise<void> {
    try {
      await this.redisService.set(`${IP_CACHE_PREFIX}${ip}`, location, IP_CACHE_TTL_MS);
    } catch {
      // Redis 不可用时静默降级
    }
  }

  /**
   * 格式化地理位置信息
   * 将国家、地区、城市拼接为可读字符串，过滤未知项并去重。
   * @param country - 国家
   * @param regionName - 地区/省份
   * @param city - 城市
   * @returns 格式化后的地理位置字符串
   */
  private formatLocation(country: string, regionName: string, city: string): string {
    const parts = [country, regionName, city]
      .map((item) => String(item || '').trim())
      .filter((item) => item && item !== 'Unknown');

    if (!parts.length) return '未知';
    return Array.from(new Set(parts)).join(' ');
  }

  /**
   * 根据 IP 地址获取地理位置
   * 优先读取 Redis 缓存，私网地址直接返回"内网地址"，
   * 否则调用 ip-api.com 外部接口查询并缓存结果。
   * @param ip - 客户端 IP 地址
   * @returns 地理位置描述字符串
   */
  async getIpAddress(ip: string): Promise<string> {
    const normalizedIp = normalizeClientIp(ip);
    if (!normalizedIp) return '未知';

    // 1. Redis 缓存（24h 分布式共享）
    const cached = await this.getRedisCache(normalizedIp);
    if (cached) return cached;

    // 2. 私网地址不查外部 API
    if (this.isPrivateIp(normalizedIp)) {
      await this.setRedisCache(normalizedIp, '内网地址');
      return '内网地址';
    }

    // 3. 外部 API 查询
    try {
      const url = `http://ip-api.com/json/${encodeURIComponent(normalizedIp)}?lang=zh-CN`;
      const response = await this.httpService.axiosRef.get(url, {
        timeout: 3000,
        validateStatus: () => true,
      });

      if (response.status !== 200 || !response.data || typeof response.data !== 'object') {
        this.logger.warn(`ip-api request failed, ip=${normalizedIp}, httpCode=${response.status}`);
        return '未知';
      }

      const data = response.data as Record<string, any>;
      if (data.status !== 'success') {
        this.logger.warn(`ip-api response invalid, ip=${normalizedIp}, status=${String(data.status || '')}`);
        return '未知';
      }

      const location = this.formatLocation(data.country, data.regionName, data.city);
      await this.setRedisCache(normalizedIp, location);
      return location;
    } catch (error) {
      this.logger.warn(`ip-api request exception, ip=${normalizedIp}, message=${(error as any)?.message || 'unknown'}`);
      return '未知';
    }
  }
}
