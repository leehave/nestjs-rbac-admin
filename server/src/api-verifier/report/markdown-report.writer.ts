import { Injectable } from '@nestjs/common';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import type { ApiVerifyCaseResult, ApiVerifyRunResult } from '../api-verifier.types';

@Injectable()
export class MarkdownReportWriter {
  async write(filePath: string, result: ApiVerifyRunResult): Promise<void> {
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, this.render(result), 'utf8');
  }

  /**
   * 将 API 验证运行结果渲染为 Markdown 格式的完整报告字符串。
   * 包含报告头部（生成时间、目标服务、统计）、汇总表格、失败详情和跳过详情。
   *
   * @param result - API 验证运行结果对象
   * @returns Markdown 格式的报告文本
   */
  private render(result: ApiVerifyRunResult): string {
    const lines = [
      '# API 验证报告',
      '',
      `- 生成时间: ${result.generatedAt}`,
      `- 目标服务: ${result.baseUrl}`,
      `- 总用例数: ${result.total}`,
      `- 通过: ${result.passed}`,
      `- 失败: ${result.failed}`,
      `- 跳过: ${result.skipped}`,
      `- 总耗时: ${result.totalDurationMs}ms`,
      '',
      '## 汇总',
      '',
      '| ID | 模块 | 方法 | 路径 | 结果 | 状态码 | 耗时(ms) | 说明 |',
      '|---|---|---|---|---|---:|---:|---|',
      ...result.results.map((item) => this.renderSummaryRow(item)),
      '',
      '## 失败详情',
      '',
      ...this.renderFailedDetails(result.results),
      '',
      '## 跳过详情',
      '',
      ...this.renderSkippedDetails(result.results),
      '',
      '## 备注',
      '',
      '- 默认只执行 safe 用例（GET）。',
      '- OpenAPI 冒烟用例来自 `public/openApi.json`（Swagger 启动时生成）。',
      '- 写操作需要 `--allow-unsafe`；带鉴权接口建议 `--token=` 或 `VERIFY_API_TOKEN`。',
      '- 冒烟通过标准：非 404/500；403/400 表示路由可达。',
      '- 该报告用于 API 初步验证，不替代完整业务测试。',
      '',
    ];

    return `${lines.join('\n')}\n`;
  }

  private renderSummaryRow(result: ApiVerifyCaseResult): string {
    return `| ${result.case.id} | ${result.case.module} | ${result.case.method} | ${result.case.path} | ${result.status} | ${result.statusCode ?? '-'} | ${result.durationMs} | ${this.escape(result.message)} |`;
  }

  /**
   * 渲染失败用例的 Markdown 详情列表。
   * 无失败用例时返回 `["无失败用例。"]`。
   * 每个失败用例包含：请求方法/路径、说明、错误堆栈。
   *
   * @param results - 所有用例执行结果列表
   * @returns Markdown 行数组，每行对应一个失败详情块
   */
  private renderFailedDetails(results: ApiVerifyCaseResult[]): string[] {
    const failed = results.filter((result) => result.status === 'FAIL');

    if (failed.length === 0) {
      return ['无失败用例。'];
    }

    return failed.flatMap((result) => [
      `### ${result.case.id}`,
      '',
      `- 请求: \`${result.case.method} ${result.requestUrl ?? result.case.path}\``,
      `- 说明: ${result.message}`,
      result.error ? `- 错误: ${this.escape(result.error)}` : '- 错误: 无',
      '',
    ]);
  }

  /**
   * 渲染跳过用例的 Markdown 详情列表。
   * 无跳过用例时返回 `["无跳过用例。"]`。
   * 每个跳过用例包含原因说明。
   *
   * @param results - 所有用例执行结果列表
   * @returns Markdown 行数组，每行对应一个跳过详情块
   */
  private renderSkippedDetails(results: ApiVerifyCaseResult[]): string[] {
    const skipped = results.filter((result) => result.status === 'SKIP');

    if (skipped.length === 0) {
      return ['无跳过用例。'];
    }

    return skipped.flatMap((result) => [
      `### ${result.case.id}`,
      '',
      `- 原因: ${result.message}`,
      '',
    ]);
  }

  private escape(value: string): string {
    return value.replace(/\|/g, '\\|').replace(/\n/g, '<br>');
  }
}
