import { Injectable } from '@nestjs/common';

import type { ApiVerificationCase, ApiVerifyContext, ApiVerifyHttpResult } from '../api-verifier.types';

@Injectable()
export class ApiVerifyHttpClient {
  /**
   * 发送 API 验证请求并返回响应结果。
   * 支持动态解析的 body/headers/query、自定义超时和 AbortController 取消机制。
   * 响应会自动解析 JSON body，网络异常时返回 error 信息。
   *
   * @param testCase - 验证用例（包含方法、路径、请求体等）
   * @param ctx - 验证上下文（基础 URL、超时等）
   * @returns HTTP 响应结果，含状态码、耗时、响应头和 body
   */
  async request(testCase: ApiVerificationCase, ctx: ApiVerifyContext): Promise<ApiVerifyHttpResult> {
    const startedAt = Date.now();
    const timeoutMs = testCase.timeoutMs ?? ctx.timeoutMs;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const url = this.buildUrl(ctx.baseUrl, testCase.path, this.resolveValue(testCase.query, ctx));

    try {
      const body = this.resolveValue(testCase.body, ctx);
      const headers = {
        ...this.resolveValue(testCase.headers, ctx),
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      };
      const response = await fetch(url, {
        method: testCase.method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
      const rawBody = await response.text();
      const contentType = response.headers.get('content-type') ?? '';

      return {
        url,
        method: testCase.method,
        statusCode: response.status,
        ok: response.ok,
        durationMs: Date.now() - startedAt,
        headers: Object.fromEntries(response.headers.entries()),
        body: contentType.includes('application/json') && rawBody ? JSON.parse(rawBody) : undefined,
        rawBody,
      };
    } catch (error) {
      return {
        url,
        method: testCase.method,
        ok: false,
        durationMs: Date.now() - startedAt,
        headers: {},
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * 拼接基础 URL 和路径，并附加查询参数。
   * 自动处理斜杠重复问题，将 query 对象转换为 URLSearchParams。
   *
   * @param baseUrl - 基础 URL，如 `http://127.0.0.1:3000`
   * @param path - API 路径，如 `/api/user`
   * @param query - 可选的查询参数对象
   * @returns 完整的请求 URL 字符串
   */
  private buildUrl(baseUrl: string, path: string, query?: Record<string, unknown>): string {
    const url = new URL(`${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`);

    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }

    return url.toString();
  }

  /**
   * 解析可能为函数的值：若 value 是函数则调用它并传入 ctx，否则直接返回。
   * 用于支持动态 body、headers 和 query 的惰性求值。
   *
   * @param value - 静态值或接收 ctx 返回值的函数
   * @param ctx - 验证上下文
   * @returns 解析后的值
   */
  private resolveValue<T>(value: T | ((ctx: ApiVerifyContext) => T) | undefined, ctx: ApiVerifyContext): T | undefined {
    if (typeof value === 'function') {
      return (value as (ctx: ApiVerifyContext) => T)(ctx);
    }

    return value;
  }
}
