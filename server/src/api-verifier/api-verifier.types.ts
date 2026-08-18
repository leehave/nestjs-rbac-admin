export type ApiVerifyMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type ApiVerifyStatus = 'PASS' | 'FAIL' | 'SKIP';
export type ApiVerifySafety = 'safe' | 'unsafe';

export interface ApiVerifyCliOptions {
  baseUrl?: string;
  include?: string[];
  exclude?: string[];
  caseIds?: string[];
  timeoutMs: number;
  output: string;
  failFast: boolean;
  allowUnsafe: boolean;
  /** 从 public/openApi.json 生成冒烟用例，默认 true */
  fromOpenapi?: boolean;
  authToken?: string;
}

export interface ApiVerifyContext {
  baseUrl: string;
  timeoutMs: number;
  allowUnsafe: boolean;
  authToken?: string;
}

export interface ApiVerificationCase {
  id: string;
  module: string;
  name: string;
  method: ApiVerifyMethod;
  path: string;
  query?: Record<string, unknown> | ((ctx: ApiVerifyContext) => Record<string, unknown>);
  headers?: Record<string, string> | ((ctx: ApiVerifyContext) => Record<string, string>);
  body?: unknown | ((ctx: ApiVerifyContext) => unknown);
  timeoutMs?: number;
  enabledByDefault?: boolean;
  safety?: ApiVerifySafety;
  tags?: string[];
  expect?: {
    status?: number | number[];
    contentTypeIncludes?: string;
  };
  assert?: (result: ApiVerifyHttpResult, ctx: ApiVerifyContext) => void | Promise<void>;
  skip?: (ctx: ApiVerifyContext) => string | false | Promise<string | false>;
}

export interface ApiVerifierProvider {
  getApiVerificationCases(): ApiVerificationCase[];
}

export interface ApiVerifyHttpResult {
  url: string;
  method: ApiVerifyMethod;
  statusCode?: number;
  ok: boolean;
  durationMs: number;
  headers: Record<string, string>;
  body?: unknown;
  rawBody?: string;
  error?: string;
}

export interface ApiVerifyCaseResult {
  case: ApiVerificationCase;
  status: ApiVerifyStatus;
  durationMs: number;
  requestUrl?: string;
  statusCode?: number;
  message: string;
  responseBody?: unknown;
  error?: string;
}

export interface ApiVerifyRunResult {
  generatedAt: string;
  baseUrl: string;
  totalDurationMs: number;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  results: ApiVerifyCaseResult[];
}
