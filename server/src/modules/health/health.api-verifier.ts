import { Injectable } from '@nestjs/common';

import type { ApiVerificationCase, ApiVerifierProvider, ApiVerifyHttpResult } from '../../api-verifier/api-verifier.types';

@Injectable()
export class HealthApiVerifier implements ApiVerifierProvider {
  getApiVerificationCases(): ApiVerificationCase[] {
    return [
      {
        id: 'health.check',
        module: 'health',
        name: '健康检查接口',
        method: 'GET',
        path: '/api/health',
        safety: 'safe',
        expect: {
          status: 200,
          contentTypeIncludes: 'application/json',
        },
        assert: (result) => this.assertHealthResponse(result),
      },
    ];
  }

  private assertHealthResponse(result: ApiVerifyHttpResult): void {
    const body = result.body as Record<string, unknown> | undefined;

    if (!body || body.status !== 'ok') {
      throw new Error('健康检查 status 应为 ok');
    }

    if (!body.app || typeof body.app !== 'object') {
      throw new Error('健康检查缺少 app 信息');
    }

    if (!body.dependencies || typeof body.dependencies !== 'object') {
      throw new Error('健康检查缺少 dependencies 信息');
    }

    if (!body.timestamp || Number.isNaN(new Date(String(body.timestamp)).getTime())) {
      throw new Error('健康检查 timestamp 无效');
    }
  }
}
