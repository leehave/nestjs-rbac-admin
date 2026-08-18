import { Injectable } from '@nestjs/common';

import type {
  ApiVerificationCase,
  ApiVerifyCaseResult,
  ApiVerifyCliOptions,
  ApiVerifyContext,
  ApiVerifyHttpResult,
  ApiVerifyRunResult,
} from './api-verifier.types';
import { ApiVerifierRegistry } from './api-verifier.registry';
import { ApiVerifyHttpClient } from './http/api-verify.http-client';

@Injectable()
export class ApiVerifierRunner {
  constructor(
    private readonly registry: ApiVerifierRegistry,
    private readonly httpClient: ApiVerifyHttpClient,
  ) {}

  /**
   * 运行 API 验证流程：筛选用例、逐个执行、收集结果。
   * 支持 failFast 模式（遇失败即终止），返回包含统计信息的运行结果。
   *
   * @param ctx - API 验证上下文（基础 URL、超时等）
   * @param options - CLI 选项（筛选条件、快失败等）
   * @returns 汇总的运行结果，包含通过/失败/跳过统计
   */
  async run(ctx: ApiVerifyContext, options: ApiVerifyCliOptions): Promise<ApiVerifyRunResult> {
    const startedAt = Date.now();
    const cases = this.filterCases(this.registry.getCases(), options);
    const results: ApiVerifyCaseResult[] = [];

    for (const testCase of cases) {
      const result = await this.runCase(testCase, ctx);
      results.push(result);
      this.printResult(result);

      if (options.failFast && result.status === 'FAIL') {
        break;
      }
    }

    return {
      generatedAt: new Date().toISOString(),
      baseUrl: ctx.baseUrl,
      totalDurationMs: Date.now() - startedAt,
      total: results.length,
      passed: results.filter((result) => result.status === 'PASS').length,
      failed: results.filter((result) => result.status === 'FAIL').length,
      skipped: results.filter((result) => result.status === 'SKIP').length,
      results,
    };
  }

  /**
   * 根据 CLI 选项过滤用例列表。
   * 支持排除 OpenAPI 用例、非默认启用用例、不安全用例，
   * 以及按用例 ID、模块包含/排除进行筛选。
   *
   * @param cases - 待筛选的完整用例列表
   * @param options - CLI 筛选选项
   * @returns 筛选后的用例列表
   */
  private filterCases(cases: ApiVerificationCase[], options: ApiVerifyCliOptions): ApiVerificationCase[] {
    return cases.filter((testCase) => {
      if (options.fromOpenapi === false && testCase.module === 'openapi') return false;
      if (testCase.enabledByDefault === false) return false;
      if (testCase.safety === 'unsafe' && !options.allowUnsafe) return false;
      if (options.caseIds?.length && !options.caseIds.includes(testCase.id)) return false;
      if (options.include?.length && !options.include.includes(testCase.module)) return false;
      if (options.exclude?.length && options.exclude.includes(testCase.module)) return false;
      return true;
    });
  }

  /**
   * 执行单个 API 验证用例。
   * 检查跳过条件 → 发送 HTTP 请求 → 校验期望状态 → 执行自定义断言。
   * 任何步骤抛出的异常都会被捕获并返回 FAIL 结果。
   *
   * @param testCase - 要执行的验证用例
   * @param ctx - API 验证上下文
   * @returns 单个用例的执行结果（PASS / FAIL / SKIP）
   */
  private async runCase(testCase: ApiVerificationCase, ctx: ApiVerifyContext): Promise<ApiVerifyCaseResult> {
    const startedAt = Date.now();

    try {
      const skipReason = await testCase.skip?.(ctx);

      if (skipReason) {
        return {
          case: testCase,
          status: 'SKIP',
          durationMs: Date.now() - startedAt,
          message: skipReason,
        };
      }

      const response = await this.httpClient.request(testCase, ctx);
      this.assertExpected(testCase, response);
      await testCase.assert?.(response, ctx);

      return {
        case: testCase,
        status: 'PASS',
        durationMs: response.durationMs,
        requestUrl: response.url,
        statusCode: response.statusCode,
        message: '通过',
      };
    } catch (error) {
      return {
        case: testCase,
        status: 'FAIL',
        durationMs: Date.now() - startedAt,
        message: error instanceof Error ? error.message : String(error),
        error: error instanceof Error ? error.stack : undefined,
      };
    }
  }

  /**
   * 断言 HTTP 响应符合预期。
   * 检查请求是否失败、状态码是否匹配期望值、响应 Content-Type 是否包含指定类型。
   * 不符合条件时抛出异常。
   *
   * @param testCase - 验证用例（包含期望值定义）
   * @param response - HTTP 响应结果
   * @throws 当请求失败、状态码不匹配或 Content-Type 不包含期望值时抛出错误
   */
  private assertExpected(testCase: ApiVerificationCase, response: ApiVerifyHttpResult): void {
    if (response.error) {
      throw new Error(`请求失败：${response.error}`);
    }

    const expectedStatus = testCase.expect?.status ?? 200;
    const expectedStatuses = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];

    if (!response.statusCode || !expectedStatuses.includes(response.statusCode)) {
      throw new Error(`状态码不符合预期，期望 ${expectedStatuses.join('/')}，实际 ${response.statusCode ?? '无响应'}`);
    }

    const expectedContentType = testCase.expect?.contentTypeIncludes;

    if (expectedContentType) {
      const actualContentType = response.headers['content-type'] ?? '';

      if (!actualContentType.includes(expectedContentType)) {
        throw new Error(`响应类型不符合预期，期望包含 ${expectedContentType}，实际 ${actualContentType}`);
      }
    }
  }

  private printResult(result: ApiVerifyCaseResult): void {
    const icon = result.status === 'PASS' ? '✓' : result.status === 'SKIP' ? '-' : '✗';
    console.log(`${icon} [${result.status}] ${result.case.id} ${result.durationMs}ms ${result.message}`);
  }
}
