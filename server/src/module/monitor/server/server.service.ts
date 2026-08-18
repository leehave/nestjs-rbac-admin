import { Injectable } from '@nestjs/common';
import { ResultData } from '../../../common/utils/result';
import os, { networkInterfaces } from 'os';
import path from 'path';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';

@Injectable()
export class ServerService {
  async getInfo() {
    return ResultData.ok({
      memory: this.getMemoryInfo(),
      phpEnv: this.getRuntimeEnvInfo(),
      disk: await this.getDiskInfo(),
    });
  }

  /**
   * 格式化字节数为人类可读的字符串
   * @param bytes - 字节数
   * @returns 格式化后的字符串（如 "1.5 MB"）
   */
  private formatBytes(bytes: number): string {
    if (bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    let value = bytes;
    while (value >= 1024 && i < units.length - 1) {
      value /= 1024;
      i++;
    }
    return `${Math.round(value * 100) / 100} ${units[i]}`;
  }

  /**
   * 格式化运行时间为可读字符串
   * @param seconds - 秒数
   * @returns 格式化后的时间字符串（如 "1天2小时"）
   */
  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const parts = [];
    if (days) parts.push(`${days}天`);
    if (hours) parts.push(`${hours}小时`);
    if (minutes) parts.push(`${minutes}分钟`);
    return parts.length ? parts.join('') : `${Math.floor(seconds)}秒`;
  }

  /**
   * 获取 NestJS 核心版本号
   * @returns 版本字符串
   */
  private getNestVersion(): string {
    try {
      const pkgPath = path.join(process.cwd(), 'package.json');
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      return pkg.dependencies?.['@nestjs/core'] || '--';
    } catch {
      return '--';
    }
  }

  /**
   * 获取内存使用信息
   * @returns 包含总内存、已用内存、空闲内存、进程内存和占用率的对象
   */
  getMemoryInfo() {
    const totalBytes = os.totalmem();
    const freeBytes = os.freemem();
    const usedBytes = totalBytes - freeBytes;
    const processBytes = process.memoryUsage().rss;
    const rate = totalBytes > 0 ? ((usedBytes / totalBytes) * 100).toFixed(1) : '0';

    return {
      total: this.formatBytes(totalBytes),
      used: this.formatBytes(usedBytes),
      free: this.formatBytes(freeBytes),
      php: this.formatBytes(processBytes),
      rate: String(rate),
    };
  }

  /**
   * 获取运行时环境信息
   * @returns 包含 Node 版本、NestJS 版本、操作系统、CPU、运行时间等信息的对象
   */
  getRuntimeEnvInfo() {
    const cpus = os.cpus();
    const cpuModel = cpus[0]?.model?.trim() || '--';
    const loadAvg = os.loadavg().map((n) => n.toFixed(2)).join(' / ');

    return {
      php_version: process.version,
      nestjs_version: this.getNestVersion(),
      os: `${os.platform()} ${os.release()}`,
      hostname: os.hostname(),
      arch: process.arch,
      cpu_model: cpuModel,
      cpu_cores: String(cpus.length),
      load_average: loadAvg,
      uptime: this.formatUptime(os.uptime()),
      process_uptime: this.formatUptime(process.uptime()),
      project_path: process.cwd(),
      memory_limit: this.formatBytes(os.totalmem()),
      max_execution_time: '--',
      error_reporting: process.env.NODE_ENV || 'development',
      display_errors: 'Off',
      upload_max_filesize: '--',
      post_max_size: '--',
      extension_dir: '--',
      loaded_extensions: `Node.js ${process.version}, ${process.arch}, ${cpus.length} cores`,
    };
  }

  /**
   * 获取磁盘分区信息（自适应 Windows/Unix）
   * @returns 磁盘分区信息数组
   */
  async getDiskInfo() {
    try {
      if (process.platform === 'win32') {
        return this.getDiskInfoWindows();
      }
      return this.getDiskInfoUnix();
    } catch {
      return [];
    }
  }

  /**
   * 获取 Windows 系统磁盘信息（通过 PowerShell 命令）
   * @returns 磁盘分区信息数组
   */
  private getDiskInfoWindows() {
    const cmd = `powershell -NoProfile -Command "Get-CimInstance Win32_LogicalDisk | Select-Object DeviceID, Size, FreeSpace, FileSystem | ConvertTo-Json"`;
    const output = execSync(cmd, { encoding: 'utf-8', timeout: 10000, windowsHide: true });
    const disks = JSON.parse(output.trim());
    const diskArray = Array.isArray(disks) ? disks : [disks];
    return diskArray
      .filter((disk: any) => disk.Size && Number(disk.Size) > 0)
      .map((disk: any) => {
        const total = Number(disk.Size);
        const free = Number(disk.FreeSpace);
        const used = total - free;
        const pct = total > 0 ? ((used / total) * 100).toFixed(1) : '0';
        return {
          filesystem: disk.DeviceID,
          size: this.formatBytes(total),
          used: this.formatBytes(used),
          available: this.formatBytes(free),
          use_percentage: `${pct}%`,
          mounted_on: disk.DeviceID,
        };
      });
  }

  /**
   * 获取 Unix/Linux 系统磁盘信息（通过 df 命令）
   * @returns 磁盘分区信息数组
   */
  private getDiskInfoUnix() {
    const isLinux = process.platform === 'linux';
    const cmd = isLinux ? 'df -T -k' : 'df -k';
    const output = execSync(cmd, { encoding: 'utf-8', timeout: 10000 });
    const lines = output.trim().split('\n');
    const result = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(/\s+/);
      if (parts.length < 4) continue;
      const device = parts[0];
      if (!device.startsWith('/')) continue;

      const len = parts.length;
      const mount = parts[len - 1];
      const availableKB = parseInt(parts[len - 3]);
      const usedKB = parseInt(parts[len - 4]);
      const totalKB = parseInt(parts[len - 5]);
      if (isNaN(totalKB) || totalKB <= 0) continue;

      const total = totalKB * 1024;
      const used = usedKB * 1024;
      const free = availableKB * 1024;
      const pct = total > 0 ? ((used / total) * 100).toFixed(1) : '0';
      const typeName = isLinux && len >= 7 ? parts[1] : '';

      result.push({
        filesystem: typeName ? `${device} (${typeName})` : device,
        size: this.formatBytes(total),
        used: this.formatBytes(used),
        available: this.formatBytes(free),
        use_percentage: `${pct}%`,
        mounted_on: mount,
      });
    }
    return result;
  }

  /**
   * 获取本机非内部 IPv4 地址
   * @returns IP 地址字符串
   */
  getServerIP() {
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          return net.address;
        }
      }
    }
  }

  /**
   * 获取缓存状态信息
   * @returns 缓存信息对象
   */
  async getCache() {
    return ResultData.ok({
      opcache: {
        enabled: false,
        memory_used: '0 B',
        memory_free: '0 B',
        memory_total: '0 B',
        hit_rate: '0%',
        cached_scripts: 0,
        max_files: 0,
      },
      php_version: process.version,
    });
  }

}
