import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import * as v8 from 'v8';
import * as fs from 'fs';
import * as path from 'path';

export interface MemoryInfo {
  /** 进程常驻内存 (bytes) */
  rss: number;
  /** V8 已向系统申请的堆 (bytes)。会跟着 heapUsed 一起涨，不等于堆上限 */
  heapTotal: number;
  /** V8 堆上限 (bytes)，即 `--max-old-space-size`。堆使用率的分母 */
  heapLimit: number;
  /** V8 堆已用 (bytes) */
  heapUsed: number;
  /** 距堆上限还剩多少 (bytes) */
  heapAvailable: number;
  /** 外部内存 (bytes) */
  external: number;
  /** 数组缓冲区 (bytes) */
  arrayBuffers: number;
  /** 已用堆占**堆上限**的百分比 */
  heapUsagePercent: number;
  /** RSS 百分比(相对阈值) */
  rssPercent: number;
  /** 堆中存活对象大小 (bytes) */
  heapLive: number;
}

/** 内存告警级别。none 表示已回落至全部阈值以下 */
type AlertLevel = 'none' | 'warn' | 'fatal';

export interface MemoryThreshold {
  /** RSS 软阈值 (bytes)，超过时记录警告 */
  rssWarn: number;
  /** RSS 硬阈值 (bytes)，超过时触发重启 */
  rssFatal: number;
  /** 堆使用率软阈值 0-100 */
  heapUsageWarn: number;
  /** 堆使用率硬阈值 0-100 */
  heapUsageFatal: number;
}

@Injectable()
export class MemoryMonitorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MemoryMonitorService.name);
  private readonly dumpDir: string;
  private restarting = false;
  private lastHeapUsed = 0;
  private growthCount = 0;
  private readonly growthThreshold = 5; // 连续几次增长算异常
  private fatalExit = false;
  private rssFatalEnabled = true;

  /** 上一次的告警级别。用于边沿触发：状态没变化就不重复取证、不重复刷日志 */
  private lastAlertLevel: AlertLevel = 'none';
  /** 各级别上一次自动快照的时间戳。用于落盘冷却 */
  private readonly lastAutoDumpAt: Record<'warn' | 'fatal', number> = { warn: 0, fatal: 0 };
  /**
   * 自动快照冷却时间：同一级别两次自动快照的最小间隔。
   * 快照是同步写盘（380MB RSS 下约 1 秒、80MB 文件），且会阻塞事件循环，
   * 没有冷却的话持续越线状态下每个请求都会写一份，磁盘会被打满。
   */
  private readonly autoDumpCooldownMs: Record<'warn' | 'fatal', number> = {
    warn: 10 * 60 * 1000,
    fatal: 10 * 60 * 1000,
  };

  /** 默认阈值（OnModuleInit 从配置覆盖） */
  private thresholds: MemoryThreshold = {
    rssWarn: 300 * 1024 * 1024,
    rssFatal: 450 * 1024 * 1024,
    heapUsageWarn: 85,
    heapUsageFatal: 95,
  };

  // Bun 运行时检测
  private isBun: boolean;

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly configService: ConfigService,
  ) {
    this.isBun = !!process.versions?.bun || process.execPath.includes('bun');
    // 确保 dump 目录存在
    this.dumpDir = path.resolve(process.cwd(), 'logs', 'heapdump');
    if (!fs.existsSync(this.dumpDir)) {
      fs.mkdirSync(this.dumpDir, { recursive: true });
    }
  }

  /**
   * 模块初始化：从配置加载内存监控阈值
   */
  onModuleInit() {
    const mb = (n: number) => n * 1024 * 1024;

    // Bun 使用 JavaScriptCore，v8 模块的 heap_size_limit 报告不准确（常只有 ~50MB），
    // 导致 heapUsagePercent 虚高。Bun 下大幅提高堆阈值，聚焦 RSS 监控。
    this.thresholds = {
      rssWarn: mb(this.configService.get<number>('memory.rssWarnMb', this.isBun ? 600 : 300)),
      rssFatal: mb(this.configService.get<number>('memory.rssFatalMb', this.isBun ? 900 : 450)),
      heapUsageWarn: this.configService.get<number>('memory.heapUsageWarn', this.isBun ? 99 : 85),
      heapUsageFatal: this.configService.get<number>('memory.heapUsageFatal', this.isBun ? 100 : 95),
    };
    this.fatalExit = this.configService.get<boolean>('memory.fatalExit', false);
    this.rssFatalEnabled = this.configService.get<boolean>('memory.rssFatalEnabled', !this.isBun);
    this.logger.log(
      `运行时: ${this.isBun ? 'Bun 🧪' : 'Node.js'}，` +
      `内存监控阈值: RSS 警告 ${this.thresholds.rssWarn / 1024 / 1024}MB / 致命 ${this.thresholds.rssFatal / 1024 / 1024}MB` +
        `，堆 ${this.thresholds.heapUsageWarn}% / ${this.thresholds.heapUsageFatal}%` +
        `，超限退出=${this.fatalExit}，RSS致命=${this.rssFatalEnabled}`,
    );
  }

  /** 获取当前内存快照 */
  getMemoryInfo(): MemoryInfo {
    const mem = process.memoryUsage();
    let heapStats: any = {};
    try { heapStats = v8.getHeapStatistics(); } catch { /* Bun 下不支持 */ }

    // 堆使用率的分母必须是堆上限（heap_size_limit，即 --max-old-space-size），而不是 heapTotal：
    // heapTotal 是 V8 已经向系统申请到的堆，它会跟着 heapUsed 一起涨，
    // 于是 heapUsed / heapTotal 得到的是「已申请的那部分填满了多少」，正常运行时恒在 90% 以上，
    // 95% 的致命阈值会一直成立 —— 结果就是每个请求都同步写一次堆快照。
    // heap_size_limit 取不到时（Bun / 异常）退回 heapTotal：宁可高估，也不要产生 NaN。
    const heapLimit =
      typeof heapStats.heap_size_limit === 'number' && heapStats.heap_size_limit > 0
        ? heapStats.heap_size_limit
        : mem.heapTotal;

    return {
      rss: mem.rss,
      heapTotal: mem.heapTotal,
      heapLimit,
      heapUsed: mem.heapUsed,
      heapAvailable: heapLimit - mem.heapUsed,
      external: mem.external,
      arrayBuffers: mem.arrayBuffers || 0,
      heapUsagePercent: heapLimit > 0 ? +(mem.heapUsed / heapLimit * 100).toFixed(1) : 0,
      rssPercent: this.thresholds.rssFatal > 0 ? +(mem.rss / this.thresholds.rssFatal * 100).toFixed(1) : 0,
      heapLive: heapStats.used_heap_size,
    };
  }

  /** 格式化友好的内存报告 */
  getMemoryReport(): string {
    const info = this.getMemoryInfo();
    const format = (bytes: number) => {
      if (bytes > 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
      if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
      return `${(bytes / 1024).toFixed(1)} KB`;
    };
    return [
      `RSS: ${format(info.rss)} (${info.rssPercent}%)`,
      // 分母显示堆上限：百分比就是相对它算的，显示 heapTotal 会让百分比对不上
      `堆: ${format(info.heapUsed)} / ${format(info.heapLimit)} (${info.heapUsagePercent}%)`,
      `外部: ${format(info.external)}`,
    ].join(' | ');
  }

  /** 更新阈值 */
  setThresholds(thresholds: Partial<MemoryThreshold>) {
    Object.assign(this.thresholds, thresholds);
  }

  /**
   * 检查内存状态
   * @returns true=正常, false=需要重启
   */
  async checkMemory(): Promise<boolean> {
    if (this.restarting) return false;

    // Bun 下跳过：v8 API 不兼容，getHeapStatistics 耗时超过 1 秒阻塞事件循环
    if (this.isBun) return true;

    const info = this.getMemoryInfo();
    this.logger.verbose(`内存状态: ${this.getMemoryReport()}`);

    // 检测异常增长（每次调用堆使用量持续增长）
    if (info.heapUsed > this.lastHeapUsed && this.lastHeapUsed > 0) {
      this.growthCount++;
      if (this.growthCount >= this.growthThreshold) {
        this.logger.warn(`堆内存连续增长 ${this.growthCount} 次，当前 ${(info.heapUsed / 1024 / 1024).toFixed(1)}MB`);
      }
    } else {
      this.growthCount = 0;
    }
    this.lastHeapUsed = info.heapUsed;

    // 致命/警告阈值判定；开发环境默认只告警不退出
    const rssFatal = this.rssFatalEnabled && info.rss >= this.thresholds.rssFatal;
    const heapFatal = info.heapUsagePercent >= this.thresholds.heapUsageFatal;
    const isFatal = rssFatal || heapFatal;
    const isWarn = info.rss >= this.thresholds.rssWarn || info.heapUsagePercent >= this.thresholds.heapUsageWarn;
    const level: AlertLevel = isFatal ? 'fatal' : isWarn ? 'warn' : 'none';
    const previousLevel = this.lastAlertLevel;
    const isNewLevel = level !== previousLevel;

    // 已回落：复位状态，下次再越线可以重新取证
    if (level === 'none') {
      if (previousLevel !== 'none') {
        this.logger.log(`内存已回落至阈值以下（${this.getMemoryReport()}）`);
      }
      this.lastAlertLevel = 'none';
      return true;
    }

    // 只在「越线那一刻」打日志。状态持续不变时不再重复刷，
    // 否则致命状态下每个请求都会写一条 ERROR（本 bug 的伴生现象）。
    if (isNewLevel) {
      if (isFatal) {
        this.logger.error(`内存超过致命阈值！${this.getMemoryReport()}`);
      } else {
        this.logger.warn(`内存超过警告阈值！${this.getMemoryReport()}`);
      }
    }

    // 两道闸门都过了才写快照：
    //   1) 边沿触发 —— 持续越线只取证一次，而不是每次调用都取证；
    //   2) 冷却 —— 反复越线（例如在下限附近抖动）时限制落盘速率。
    // fatalExit=true 时进程马上要退出，冷却没有意义（本来也只会执行一次），直接放行。
    const shouldDump = this.beginAutoDump(isFatal ? 'fatal' : 'warn', isFatal && this.fatalExit);
    // 先落状态再 await：writeHeapSnapshot 会阻塞事件循环，并发的 checkMemory
    // 若在 await 之后才看到新状态，就会重复写同一份快照。
    this.lastAlertLevel = level;

    if (isFatal) {
      if (shouldDump) await this.dumpHeap('fatal');
      if (this.fatalExit) {
        await this.gracefulShutdown('内存超限致命错误');
        return false;
      }
      if (isNewLevel) {
        this.logger.warn('MEMORY_FATAL_EXIT=false，跳过进程退出（开发/Bun 常见）');
      }
      return true;
    }

    if (shouldDump) await this.dumpHeap('warn');
    return true;
  }

  /**
   * 判定是否应当生成自动快照，并在允许时立即占用配额。
   * 时间戳在 await 之前写好，并发的 checkMemory 调用才拦得住。
   * @param reason 告警级别
   * @param bypassCooldown 为 true 时跳过冷却（仅用于进程即将退出的场景）
   */
  private beginAutoDump(reason: 'warn' | 'fatal', bypassCooldown = false): boolean {
    const now = Date.now();
    if (!bypassCooldown && now - this.lastAutoDumpAt[reason] < this.autoDumpCooldownMs[reason]) {
      return false;
    }
    this.lastAutoDumpAt[reason] = now;
    return true;
  }

  /**
   * 生成堆快照
   */
  async dumpHeap(reason: 'manual' | 'warn' | 'fatal' = 'manual'): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rssMb = (process.memoryUsage().rss / 1024 / 1024).toFixed(0);
    const filename = `heap-${reason}-${rssMb}mb-${timestamp}.heapsnapshot`;
    const filepath = path.join(this.dumpDir, filename);

    try {
      // 使用 Node.js 内置 v8.writeHeapSnapshot（Bun 下不支持，静默跳过）
      if (typeof v8.writeHeapSnapshot === 'function') {
        const written = v8.writeHeapSnapshot(filepath);
        this.logger.log(`堆快照已保存: ${written} (${reason})`);
        return written;
      }
      this.logger.verbose('堆快照功能在当前运行时不可用');
      return null;
    } catch (err) {
      this.logger.error(`堆快照保存失败: ${(err as any)?.message}`);
      return null;
    }
  }

  /** 列出已有的堆快照文件 */
  listHeapDumps(): string[] {
    try {
      return fs.readdirSync(this.dumpDir)
        .filter(f => f.endsWith('.heapsnapshot'))
        .map(f => ({
          name: f,
          size: fs.statSync(path.join(this.dumpDir, f)).size,
          mtime: fs.statSync(path.join(this.dumpDir, f)).mtime,
        }))
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
        .map(f => `${f.name} (${(f.size / 1024 / 1024).toFixed(1)}MB)`);
    } catch {
      return [];
    }
  }

  /** 获取堆快照目录路径 */
  getDumpDir(): string {
    return this.dumpDir;
  }

  /**
   * 优雅退出 — 让 PM2 重新拉起
   */
  async gracefulShutdown(reason: string): Promise<void> {
    if (this.restarting) return;
    this.restarting = true;

    this.logger.warn(`准备优雅退出，原因: ${reason}`);

    try {
      // 尝试关闭 NestJS 应用（释放数据库连接、Redis 连接等）
      const app = this.moduleRef.get('NestApplication' as any, { strict: false });
      if (app && typeof app.close === 'function') {
        await app.close();
        this.logger.log('NestJS 应用已关闭，释放连接');
      }
    } catch (err) {
      this.logger.warn(`关闭 NestJS 应用时异常: ${(err as any)?.message}`);
    }

    // 给 PM2 发送 shutdown 消息，等待 kill_timeout
    if (process.send) {
      process.send('shutdown');
    }

    // 延迟后退出
    setTimeout(() => {
      this.logger.log(`进程退出，原因: ${reason}`);
      process.exit(1);
    }, 3000);
  }

  onModuleDestroy() {
    this.logger.log('MemoryMonitorService 已销毁');
  }
}
