import { Injectable } from '@nestjs/common';

import type { ApiVerificationCase, ApiVerifierProvider, ApiVerifyContext, ApiVerifyHttpResult } from '../api-verifier/api-verifier.types';

@Injectable()
export class LoggingApiVerifier implements ApiVerifierProvider {
  getApiVerificationCases(): ApiVerificationCase[] {
    return [
      {
        id: 'logging.query.validRange',
        module: 'logging',
        name: '日志查询接口 - 合法时间范围',
        method: 'GET',
        path: '/api/log/query',
        safety: 'safe',
        query: () => {
          const endAt = new Date();
          const startAt = new Date(endAt.getTime() - 60 * 60 * 1000);

          return {
            startAt: startAt.toISOString(),
            endAt: endAt.toISOString(),
            limit: 5,
          };
        },
        expect: {
          status: 200,
          contentTypeIncludes: 'application/json',
        },
        assert: (result) => this.assertValidQueryResponse(result),
      },
      {
        id: 'logging.query.invalidRange',
        module: 'logging',
        name: '日志查询接口 - 非法时间范围',
        method: 'GET',
        path: '/api/log/query',
        safety: 'safe',
        query: (_ctx: ApiVerifyContext) => {
          const startAt = new Date();
          const endAt = new Date(startAt.getTime() - 60 * 1000);

          return {
            startAt: startAt.toISOString(),
            endAt: endAt.toISOString(),
          };
        },
        expect: {
          status: 200,
          contentTypeIncludes: 'application/json',
        },
        assert: (result) => this.assertErrorResponse(result, 400),
      },
    ];
  }

  /** 本项目 HttpExceptionsFilter 统一返回 HTTP 200，业务错误在 body.code */
  private assertErrorResponse(result: ApiVerifyHttpResult, expectedCode: number): void {
    const body = result.body as Record<string, unknown> | undefined;

    if (!body || body.code !== expectedCode) {
      throw new Error(`业务 code 应为 ${expectedCode}，实际 ${body?.code ?? '无'}`);
    }
  }

  private assertValidQueryResponse(result: ApiVerifyHttpResult): void {
    const body = result.body as Record<string, unknown> | undefined;

    if (!body || !Array.isArray(body.items)) {
      throw new Error('日志查询结果 items 应为数组');
    }

    if (!body.page || typeof body.page !== 'object') {
      throw new Error('日志查询结果缺少 page 信息');
    }

    if (!body.summary || typeof body.summary !== 'object') {
      throw new Error('日志查询结果缺少 summary 信息');
    }
  }
}
