export interface OpenApiParameter {
  name: string;
  in: 'query' | 'path' | 'header' | 'cookie';
  required?: boolean;
  schema?: OpenApiSchema;
}

export interface OpenApiSchema {
  type?: string;
  format?: string;
  default?: unknown;
  enum?: unknown[];
}

export interface OpenApiOperation {
  operationId?: string;
  summary?: string;
  parameters?: OpenApiParameter[];
  security?: Record<string, unknown>[];
  tags?: string[];
}

export interface OpenApiDocument {
  paths?: Record<string, Record<string, OpenApiOperation>>;
}
