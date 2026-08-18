import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

/**
 * @ApiDataResponse — Swagger 响应结构装饰器。
 * 简化 API 响应的 Swagger 文档定义。
 */
export function ApiDataResponse(options: { type?: any; description?: string; isArray?: boolean }) {
  return applyDecorators(
    ApiResponse({
      status: 200,
      description: options.description || '操作成功',
      type: options.type,
      isArray: options.isArray || false,
    }),
  );
}
