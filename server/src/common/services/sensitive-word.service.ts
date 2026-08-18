import { Injectable } from '@nestjs/common';
import SensitiveWord, { type Options as SensitiveWordOptions } from 'sensitive-word-tool';

@Injectable()
export class SensitiveWordService {
  private readonly wordFilter: InstanceType<typeof SensitiveWord>;

  constructor() {
    // 可加载外部txt词库，这里内置基础敏感词演示
    this.wordFilter = new SensitiveWord({
      wordList: [
        // 自行扩充业务违禁词
        '违禁词1', '违禁词2', '违规话术'
      ],
    } as SensitiveWordOptions);
  }

  /**
   * 检测是否包含敏感词
   */
  isContainSensitive(text: string): boolean {
    return this.wordFilter.verify(text);
  }

  /**
   * 敏感词脱敏替换
   */
  filterSensitive(text: string): string {
    return this.wordFilter.filter(text, '*');
  }

  /**
   * 批量脱敏对象字符串
   */
  deepFilterSensitive<T>(data: T): T {
    if (typeof data === 'string') return this.filterSensitive(data) as unknown as T;
    if (Array.isArray(data)) return data.map(item => this.deepFilterSensitive(item)) as unknown as T;
    if (data && typeof data === 'object' && data !== null) {
      const obj = {} as Record<string, any>;
      for (const key in data) obj[key] = this.deepFilterSensitive(data[key]);
      return obj as T;
    }
    return data;
  }
}