import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

import { REDIS_CLIENT } from './redis.constants';

@Injectable()
export class RedisService implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  getClient(): Redis {
    return this.client;
  }

  onModuleDestroy(): Promise<'OK'> {
    return this.client.quit();
  }

  // ── 基础操作 ──────────────────────────────────────────

  /** 测试连接是否正常 */
  ping(): Promise<string> {
    return this.client.ping();
  }

  /** 获取缓存键数量 */
  getDbSize(): Promise<number> {
    return this.client.dbsize();
  }

  /** 获取所有匹配的键 */
  async keys(pattern?: string): Promise<string[]> {
    return this.client.keys(pattern ?? '*');
  }

  /** 查询 TTL（秒） */
  async ttl(key: string): Promise<number | null> {
    if (!key) return null;
    return this.client.ttl(key);
  }

  // ── 监控信息 ──────────────────────────────────────────

  /** Redis 基本信息 */
  async getInfo(): Promise<Record<string, string>> {
    const rawInfo = await this.client.info();
    const lines = rawInfo.split('\r\n');
    const parsedInfo: Record<string, string> = {};
    lines.forEach((line) => {
      const [key, value] = line.split(':');
      if (key && value) {
        parsedInfo[key.trim()] = value.trim();
      }
    });
    return parsedInfo;
  }

  /** 命令统计 */
  async commandStats(): Promise<{ name: string; value: number }[]> {
    const rawInfo = await this.client.info('commandstats');
    const lines = rawInfo.split('\r\n');
    const commandStats: { name: string; value: number }[] = [];
    lines.forEach((line) => {
      const [key, value] = line.split(':');
      if (key && value) {
        commandStats.push({
          name: key.trim().replaceAll('cmdstat_', ''),
          value: Number(value.trim().split(',')[0]?.split('=')[1]),
        });
      }
    });
    return commandStats;
  }

  // ── String 操作（自动 JSON 序列化）────────────────────

  async get(key: string): Promise<any> {
    if (!key || key === '*') return null;
    const res = await this.client.get(key);
    return this.parseRedisValue(res);
  }

  async set(key: string, val: any, ttlMs?: number): Promise<'OK' | null> {
    if (val === undefined) return null;
    const data = JSON.stringify(val);
    if (!ttlMs || ttlMs <= 0) return this.client.set(key, data);
    return this.client.set(key, data, 'PX', ttlMs);
  }

  async mget(keys: string[]): Promise<any[]> {
    if (!keys || keys.length === 0) return [];
    const list = await this.client.mget(keys);
    return list.map((item) => this.parseRedisValue(item));
  }

  async del(keys: string | string[]): Promise<number> {
    if (!keys || keys.length === 0) return 0;
    if (typeof keys === 'string') keys = [keys];
    return this.client.del(...keys);
  }

  /**
   * 解析 Redis 返回值。
   * 尝试将 JSON 字符串反序列化为对象，若解析失败则返回原始字符串。
   * @param value Redis 返回的原始值
   * @returns 解析后的值
   */
  private parseRedisValue(value: string | null): any {
    if (value == null || value === '') return null;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  // ── 分布式锁 ──────────────────────────────────────────

  /** 尝试获取分布式锁（SET key token PX ttl NX） */
  async tryLock(key: string, token: string, ttlMs: number): Promise<boolean> {
    if (!key || !token || ttlMs <= 0) return false;
    const result = await this.client.set(key, token, 'PX', ttlMs, 'NX');
    return result === 'OK';
  }

  /** 释放分布式锁（仅持有者可释放，Lua 脚本保证原子性） */
  async releaseLock(key: string, token: string): Promise<boolean> {
    if (!key || !token) return false;
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    const result = await this.client.eval(script, 1, key, token);
    return Number(result) === 1;
  }

  // ── Hash 操作 ─────────────────────────────────────────

  async hset(key: string, field: string, value: string): Promise<number | null> {
    if (!key || !field) return null;
    return this.client.hset(key, field, value);
  }

  async hmset(key: string, data: Record<string, string | number | boolean>, expireSec?: number): Promise<any> {
    if (!key || !data) return 0;
    const result = await this.client.hmset(key, data);
    if (expireSec && expireSec > 0) await this.client.expire(key, expireSec);
    return result;
  }

  async hget(key: string, field: string): Promise<string | null> {
    if (!key || !field) return null;
    return this.client.hget(key, field);
  }

  async hvals(key: string): Promise<string[]> {
    if (!key) return [];
    return this.client.hvals(key);
  }

  async hGetAll(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(key);
  }

  async hdel(key: string, fields: string | string[]): Promise<number> {
    if (!key || fields.length === 0) return 0;
    if (typeof fields === 'string') fields = [fields];
    return this.client.hdel(key, ...fields);
  }

  async hdelAll(key: string): Promise<number> {
    if (!key) return 0;
    const fields = await this.client.hkeys(key);
    if (fields.length === 0) return 0;
    return this.hdel(key, fields);
  }

  // ── List 操作 ─────────────────────────────────────────

  lLength(key: string): Promise<number> {
    return this.client.llen(key);
  }

  lSet(key: string, index: number, val: string): Promise<'OK' | null> {
    return this.client.lset(key, index, val);
  }

  lIndex(key: string, index: number): Promise<string | null> {
    return this.client.lindex(key, index);
  }

  lRange(key: string, start: number, stop: number): Promise<string[]> {
    return this.client.lrange(key, start, stop);
  }

  lLeftPush(key: string, ...val: string[]): Promise<number> {
    return this.client.lpush(key, ...val);
  }

  lRightPush(key: string, ...val: string[]): Promise<number> {
    return this.client.rpush(key, ...val);
  }

  lLeftPop(key: string): Promise<string | null> {
    return this.client.lpop(key);
  }

  lRightPop(key: string): Promise<string | null> {
    return this.client.rpop(key);
  }

  lTrim(key: string, start: number, stop: number): Promise<'OK' | null> {
    return this.client.ltrim(key, start, stop);
  }

  lRemove(key: string, count: number, val: string): Promise<number> {
    return this.client.lrem(key, count, val);
  }

  // ── 缓存清空 ──────────────────────────────────────────

  /** 删除全部缓存 */
  async reset(): Promise<number> {
    const keys = await this.client.keys('*');
    if (keys.length === 0) return 0;
    return this.client.del(keys);
  }
}
