import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { htmlToText } from 'html-to-text';

export type MindToolDef = {
  name: string;
  description: string;
  invoke: (params: Record<string, string>) => Promise<string>;
};

@Injectable()
export class MindAgentToolsService {
  private readonly logger = new Logger(MindAgentToolsService.name);

  constructor(private readonly configService: ConfigService) {}

  buildToolsDescription(tools: Record<string, MindToolDef>) {
    return Object.values(tools)
      .map((t, i) => `(${i + 1}) ${t.name}: ${t.description}`)
      .join('\n');
  }

  /**
   * 获取所有可执行工具的映射表，包含计算、天气、股票、翻译、网页抓取和网络搜索工具。
   * @returns 工具名称到工具定义的映射
   */
  getExecuteTools(): Record<string, MindToolDef> {
    return {
      calculate_number: {
        name: 'calculate_number',
        description: '用于执行数学计算，只能用于数值计算',
        invoke: async (p) => this.calculateNumber(String(p.expression || '')),
      },
      search_weather: {
        name: 'search_weather',
        description: '用于查询城市当天及未来的实时天气情况，禁止用来查询过去时间的天气情况',
        invoke: async (p) => this.searchWeather(String(p.city || '')),
      },
      snatch_stock_price: {
        name: 'snatch_stock_price',
        description: '用于查询沪深300指数指定股票的开盘/收盘价',
        invoke: async (p) => this.snatchStockPrice(String(p.symbol || ''), String(p.query_date || '')),
      },
      translate_text: {
        name: 'translate_text',
        description: '翻译文本为指定的语言',
        invoke: async (p) => this.translateText(String(p.text || ''), String(p.src || 'zh'), String(p.dest || 'en')),
      },
      extract_website_text: {
        name: 'extract_website_text',
        description: '抓取网页地址的内容',
        invoke: async (p) => this.extractWebsiteText(String(p.url || '')),
      },
      search_web: {
        name: 'search_web',
        description: '用于在互联网上搜索通用信息、事实或最新动态（其他工具不满足时均可调用此工具获取内容）',
        invoke: async (p) => this.searchWeb(String(p.query || '')),
      },
    };
  }

  async invokeTool(name: string, params: Record<string, string>) {
    const tool = this.getExecuteTools()[name];
    if (!tool) throw new Error(`Tool not implemented: ${name}`);
    return tool.invoke(params);
  }

  /**
   * 执行数学计算（仅支持安全子集：数字、四则运算、括号、百分号）。
   * @param expression - 数学表达式字符串
   * @returns 计算结果字符串
   */
  private calculateNumber(expression: string) {
    const expr = expression.trim();
    if (!expr || !/^[0-9+\-*/().%\s]+$/.test(expr)) throw new Error('计算表达式无效');
    // ponytail: safe subset eval; upgrade: mathjs
    const result = Function(`"use strict"; return (${expr})`)();
    return String(result);
  }

  /**
   * 异步搜索天气信息，通过 wttr.in 服务获取指定城市的实时天气。
   * @param city - 城市名称
   * @returns 天气信息文本
   */
  private async searchWeather(city: string) {
    if (!city.trim()) throw new Error('无法获取给定城市的天气情况');
    const res = await axios.get(`https://wttr.in/${encodeURIComponent(city)}`, { timeout: 15000, responseType: 'text' });
    return String(res.data || '');
  }

  private snatchStockPrice(symbol: string, queryDate: string) {
    void symbol;
    void queryDate;
    return '股票行情工具暂未接入 akshare，请配置外部数据源或使用 search_web 检索';
  }

  private translateText(text: string, src: string, dest: string) {
    void src;
    void dest;
    return text ? `翻译工具未配置腾讯云 TMT，原文：${text.slice(0, 500)}` : '';
  }

  private async extractWebsiteText(url: string) {
    if (!url.trim()) return '';
    const res = await axios.get(url, { timeout: 15000, responseType: 'text' });
    return htmlToText(String(res.data || ''), { wordwrap: false });
  }

  /**
   * 通过网络搜索获取指定查询的信息（使用 Tavily API）。
   * 未配置 API Key 时会降级为提示信息。
   * @param query - 搜索查询
   * @returns 搜索结果文本
   */
  private async searchWeb(query: string) {
    const key = this.configService.get<string>('mind.tavily.apiKey') || '';
    if (!key) {
      this.logger.warn('MIND_TAVILY_API_KEY 未配置，search_web 降级为提示');
      return `未配置 Tavily API Key，无法联网搜索。请在 .env 设置 MIND_TAVILY_API_KEY 后重试。查询：${query}`;
    }
    const res = await axios.post(
      'https://api.tavily.com/search',
      { api_key: key, query, search_depth: 'advanced', max_results: 5 },
      { timeout: 30000 },
    );
    const results = (res.data?.results || []) as Array<{ title?: string; url?: string; content?: string }>;
    const parts: string[] = [];
    for (const r of results) {
      if (r.content) parts.push(String(r.content).trim());
      else if (r.url) {
        try {
          parts.push(await this.extractWebsiteText(r.url));
        } catch {
          void 0;
        }
      }
    }
    return parts.filter(Boolean).join('\n\n');
  }
}
