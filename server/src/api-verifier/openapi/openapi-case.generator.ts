import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type {
  ApiVerificationCase,
  ApiVerifyContext,
  ApiVerifyHttpResult,
  ApiVerifyMethod,
  ApiVerifySafety,
} from '../api-verifier.types';
import type { OpenApiDocument, OpenApiOperation, OpenApiParameter, OpenApiSchema } from './openapi.types';

const HTTP_METHODS: ApiVerifyMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export class OpenApiCaseGenerator {
  /**
   * 加载 OpenAPI 规范文件（JSON 格式）。
   * 支持绝对路径和相对路径（相对于当前工作目录）。
   * 文件不存在时返回 null。
   *
   * @param specPath - OpenAPI JSON 文件路径
   * @returns 解析后的 OpenApiDocument 对象，或 null（文件不存在时）
   */
  loadSpec(specPath: string): OpenApiDocument | null {
    const resolved = specPath.startsWith('/') || /^[A-Za-z]:/.test(specPath)
      ? specPath
      : join(process.cwd(), specPath);

    if (!existsSync(resolved)) {
      return null;
    }

    return JSON.parse(readFileSync(resolved, 'utf8')) as OpenApiDocument;
  }

  /**
   * 根据 OpenAPI 规范生成 API 验证用例列表。
   * 遍历所有路径和 HTTP 方法，为每个操作创建一个验证用例，并按 ID 排序。
   *
   * @param spec - 完整的 OpenAPI 文档对象
   * @returns 生成的 API 验证用例数组
   */
  generateCases(spec: OpenApiDocument): ApiVerificationCase[] {
    const cases: ApiVerificationCase[] = [];

    for (const [path, pathItem] of Object.entries(spec.paths ?? {})) {
      for (const method of HTTP_METHODS) {
        const operation = pathItem[method.toLowerCase()];
        if (!operation) continue;

        cases.push(this.createCase(path, method, operation));
      }
    }

    return cases.sort((a, b) => a.id.localeCompare(b.id));
  }

  /**
   * 根据路径、方法和操作定义创建单个 API 验证用例。
   * 解析路径参数、构建查询参数、设置鉴权头、配置期望状态和断言。
   *
   * @param path - API 路径模板（如 `/api/user/{id}`）
   * @param method - HTTP 方法（GET/POST/PUT/PATCH/DELETE）
   * @param operation - OpenAPI 操作对象（由解析规范获得）
   * @returns 完整的 API 验证用例
   */
  private createCase(path: string, method: ApiVerifyMethod, operation: OpenApiOperation): ApiVerificationCase {
    const resolvedPath = this.resolvePath(path, operation.parameters ?? []);
    const needsAuth = (operation.security?.length ?? 0) > 0;
    const safety: ApiVerifySafety = method === 'GET' ? 'safe' : 'unsafe';
    const slug = this.toSlug(operation.operationId ?? `${method}_${path}`);

    return {
      id: `openapi.${method.toLowerCase()}.${slug}`,
      module: 'openapi',
      name: operation.summary ?? operation.operationId ?? `${method} ${path}`,
      method,
      path: resolvedPath,
      query: this.buildQuery(operation.parameters ?? []),
      headers: (ctx) => this.buildHeaders(ctx, needsAuth),
      safety,
      enabledByDefault: true,
      tags: operation.tags,
      expect: {
        status: 200,
        contentTypeIncludes: 'application/json',
      },
      assert: (result) => assertSmokeResponse(result),
    };
  }

  /**
   * 解析路径模板中的路径参数占位符，替换为样本值。
   * 优先使用 OpenAPI parameters 中声明的 path 参数及对应 schema 生成的样本值，
   * 未在 parameters 中声明的占位符统一替换为 `1`。
   *
   * @param path - API 路径模板（如 `/api/user/{id}`）
   * @param parameters - OpenAPI 参数列表，从中筛选 path 类型参数
   * @returns 替换占位符后的实际请求路径
   */
  private resolvePath(path: string, parameters: OpenApiParameter[]): string {
    let resolved = path;

    for (const param of parameters.filter((item) => item.in === 'path')) {
      resolved = resolved.replace(`{${param.name}}`, encodeURIComponent(String(sampleValue(param.schema, param.name))));
    }

    // ponytail: 未在 parameters 里声明的 path 占位符用通用样本
    resolved = resolved.replace(/\{[^}]+\}/g, '1');

    return resolved;
  }

  /**
   * 从 OpenAPI 参数列表中提取 query 类型参数，构建查询参数字典。
   * 仅包含必需参数和通用分页参数（pageNum、pageSize、page、limit、offset、size）。
   * 若无符合条件的参数则返回 undefined。
   *
   * @param parameters - OpenAPI 参数列表
   * @returns 查询参数字典对象，或 undefined（无参数时）
   */
  private buildQuery(parameters: OpenApiParameter[]) {
    const queryParams = parameters.filter((item) => item.in === 'query');
    if (!queryParams.length) return undefined;

    const query: Record<string, unknown> = {};
    for (const param of queryParams) {
      if (param.required || isCommonPaginationParam(param.name)) {
        query[param.name] = sampleValue(param.schema, param.name);
      }
    }

    return Object.keys(query).length ? query : undefined;
  }

  /**
   * 根据鉴权需求构建请求头。
   * 当操作需要鉴权且上下文中存在 authToken 时，自动添加 Authorization 头。
   * Token 自动添加 `Bearer ` 前缀（如尚未包含）。
   *
   * @param ctx - API 验证上下文，包含 authToken
   * @param needsAuth - 操作是否需要鉴权
   * @returns 请求头字典（可能为空对象）
   */
  private buildHeaders(ctx: ApiVerifyContext, needsAuth: boolean): Record<string, string> {
    if (!needsAuth || !ctx.authToken) return {};

    const token = ctx.authToken.startsWith('Bearer ') ? ctx.authToken : `Bearer ${ctx.authToken}`;
    return { Authorization: token };
  }

  private toSlug(value: string): string {
    return value.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '').toLowerCase();
  }
}

function isCommonPaginationParam(name: string): boolean {
  return ['pageNum', 'pageSize', 'page', 'limit', 'offset', 'size'].includes(name);
}

/**
 * 根据 OpenAPI schema 定义和参数名称生成样本值。
 * 优先级：schema.default → schema.enum[0] → 按名称推断（分页参数）→ 按 type 生成默认值。
 * 字符串类型支持 date-time 格式生成当前时间戳。
 *
 * @param schema - OpenAPI 参数 schema 定义（可选）
 * @param name - 参数名称（用于按名称推断样本值）
 * @returns 生成的样本值（string / number / boolean）
 */
function sampleValue(schema: OpenApiSchema | undefined, name: string): unknown {
  if (schema?.default !== undefined) return schema.default;
  if (schema?.enum?.length) return schema.enum[0];

  const lowerName = name.toLowerCase();
  if (lowerName.includes('page') && lowerName.includes('size')) return 10;
  if (lowerName === 'pagenum' || lowerName === 'page') return 1;
  if (lowerName === 'limit') return 10;

  switch (schema?.type) {
    case 'integer':
    case 'number':
      return 1;
    case 'boolean':
      return true;
    case 'string':
      if (schema.format === 'date-time') return new Date().toISOString();
      if (lowerName.includes('key')) return 'test';
      return 'test';
    default:
      return 'test';
  }
}

/**
 * 冒烟断言函数：验证 API 响应是否为可达且非错误的路由。
 * 检查响应是否包含有效的 JSON body，以及 body.code 不为 404（接口不存在）或 500（服务器错误）。
 * 403（无权限）和 400（参数错误）视为路由可达，不抛出异常。
 *
 * @param result - HTTP 响应结果
 * @throws 请求失败、响应非 JSON、接口不存在（code=404）或服务器错误（code=500）时抛出异常
 */
export function assertSmokeResponse(result: ApiVerifyHttpResult): void {
  if (result.error) {
    throw new Error(`请求失败：${result.error}`);
  }

  const body = result.body;

  if (body === undefined || body === null) {
    throw new Error('响应不是 JSON');
  }

  if (typeof body !== 'object') {
    return;
  }

  const code = (body as Record<string, unknown>).code;

  if (code === 404) {
    throw new Error('接口不存在 (code=404)');
  }

  if (code === 500) {
    throw new Error('服务器错误 (code=500)');
  }
}
