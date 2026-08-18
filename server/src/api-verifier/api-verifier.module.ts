import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ApiVerifierRegistry } from './api-verifier.registry';
import { ApiVerifierRunner } from './api-verifier.runner';
import { ApiVerifyHttpClient } from './http/api-verify.http-client';
import { OpenApiApiVerifier } from './openapi/openapi.api-verifier';
import { MarkdownReportWriter } from './report/markdown-report.writer';

@Module({
  imports: [ConfigModule],
  providers: [
    ApiVerifierRegistry,
    ApiVerifierRunner,
    ApiVerifyHttpClient,
    OpenApiApiVerifier,
    MarkdownReportWriter,
  ],
  exports: [ApiVerifierRegistry, ApiVerifierRunner, MarkdownReportWriter],
})
export class ApiVerifierModule {}
