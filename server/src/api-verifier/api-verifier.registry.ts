import { Injectable } from '@nestjs/common';
import { ModulesContainer } from '@nestjs/core';

import type { ApiVerificationCase, ApiVerifierProvider } from './api-verifier.types';
import { OpenApiApiVerifier } from './openapi/openapi.api-verifier';

@Injectable()
export class ApiVerifierRegistry {
  constructor(
    private readonly modulesContainer: ModulesContainer,
    private readonly openApiApiVerifier: OpenApiApiVerifier,
  ) {}

  /**
   * 获取所有 API 验证用例，并按 ID 排序。
   * 遍历模块容器中所有提供者，收集实现了 `getApiVerificationCases` 方法的用例，
   * 最后补充 OpenAPI 生成的用例并去重。
   *
   * @returns 排序后的 API 验证用例数组
   */
  getCases(): ApiVerificationCase[] {
    const cases: ApiVerificationCase[] = [];
    const seen = new Set<string>();

    for (const moduleRef of this.modulesContainer.values()) {
      for (const wrapper of moduleRef.providers.values()) {
        const instance = wrapper.instance as Partial<ApiVerifierProvider> | undefined;

        if (instance && typeof instance.getApiVerificationCases === 'function') {
          if (wrapper.metatype === OpenApiApiVerifier) {
            continue;
          }

          for (const testCase of instance.getApiVerificationCases()) {
            cases.push(testCase);
            seen.add(this.caseKey(testCase));
          }
        }
      }
    }

    for (const testCase of this.openApiApiVerifier.getApiVerificationCases()) {
      const key = this.caseKey(testCase);
      if (!seen.has(key)) {
        cases.push(testCase);
        seen.add(key);
      }
    }

    return cases.sort((a, b) => a.id.localeCompare(b.id));
  }

  private caseKey(testCase: ApiVerificationCase): string {
    return `${testCase.method}:${testCase.path}`;
  }
}
