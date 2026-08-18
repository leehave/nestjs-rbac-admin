import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { ApiVerificationCase, ApiVerifierProvider } from '../api-verifier.types';
import { OpenApiCaseGenerator } from './openapi-case.generator';

@Injectable()
export class OpenApiApiVerifier implements ApiVerifierProvider {
  private readonly generator = new OpenApiCaseGenerator();

  constructor(private readonly configService: ConfigService) {}

  /**
   * 获取 OpenAPI 规范生成的 API 验证用例列表。
   * 从 ConfigService 或环境变量 `VERIFY_OPENAPI_PATH` 读取 OpenAPI 规范文件路径，
   * 加载规范后生成冒烟验证用例。若规范文件不存在则返回空数组。
   *
   * @returns API 验证用例数组（规范文件不存在时返回空数组）
   */
  getApiVerificationCases(): ApiVerificationCase[] {
    const specPath = this.configService.get<string>(
      'verify.openapiPath',
      process.env.VERIFY_OPENAPI_PATH ?? 'public/openApi.json',
    );
    const spec = this.generator.loadSpec(specPath);

    if (!spec) {
      return [];
    }

    return this.generator.generateCases(spec);
  }
}
