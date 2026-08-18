import 'reflect-metadata';

import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from '../../app.module';
import { ApiVerifierRunner } from '../api-verifier.runner';
import type { ApiVerifyContext } from '../api-verifier.types';
import { MarkdownReportWriter } from '../report/markdown-report.writer';
import { parseVerifyApiArgs } from './verify-apis.args';

/**
 * CLI 入口函数：解析参数、初始化 NestJS 应用上下文、构建验证上下文、
 * 检查 OpenAPI 文件是否存在、执行验证并生成 Markdown 报告。
 * 验证失败时设置退出码为 1，异常时设置为 2。
 */
async function main(): Promise<void> {
  const options = parseVerifyApiArgs(process.argv.slice(2));
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const configService = app.get(ConfigService);
    const runner = app.get(ApiVerifierRunner);
    const reportWriter = app.get(MarkdownReportWriter);
    const baseUrl = options.baseUrl ?? buildDefaultBaseUrl(configService);
    const openApiPath = process.env.VERIFY_OPENAPI_PATH ?? 'public/openApi.json';
    const ctx: ApiVerifyContext = {
      baseUrl,
      timeoutMs: options.timeoutMs,
      allowUnsafe: options.allowUnsafe,
      authToken: options.authToken,
    };

    if (options.fromOpenapi !== false) {
      const { existsSync } = await import('node:fs');
      const { join } = await import('node:path');
      const resolved = join(process.cwd(), openApiPath);
      if (!existsSync(resolved)) {
        console.warn(`[verify:api] 未找到 ${openApiPath}，请先启动服务生成 Swagger 文档，或使用 --no-openapi 跳过`);
        options.fromOpenapi = false;
      }
    }

    const result = await runner.run(ctx, options);
    await reportWriter.write(options.output, result);
    console.log(
      `API 验证完成：${result.passed}/${result.total} 通过，${result.failed} 失败，${result.skipped} 跳过`,
    );
    console.log(`API 验证报告已生成：${options.output}`);
    process.exitCode = result.failed > 0 ? 1 : 0;
  } finally {
    await app.close();
  }
}

/**
 * 根据 NestJS ConfigService 构建默认的基础 URL。
 * 从配置中读取端口和 API 前缀，拼接为 `http://127.0.0.1:{port}/{apiPrefix}` 格式。
 *
 * @param configService - NestJS 配置服务
 * @returns 构建后的基础 URL 字符串
 */
function buildDefaultBaseUrl(configService: ConfigService): string {
  const port = configService.get<number>('app.port', 3000);
  const apiPrefix = configService.get<string>('app.apiPrefix', '');

  return apiPrefix
    ? `http://127.0.0.1:${port}/${apiPrefix.replace(/^\//, '').replace(/\/$/, '')}`
    : `http://127.0.0.1:${port}`;
}

void main().catch((error) => {
  console.error(`API 验证命令执行失败：${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 2;
});
