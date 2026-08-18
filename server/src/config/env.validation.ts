import Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  APP_NAME: Joi.string().default('nextjs-server'),
  APP_PORT: Joi.number().port().default(3000),
  APP_API_PREFIX: Joi.string()
    .pattern(/^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/)
    .allow('')
    .default(''),
  // false = 只读模式（DebugGuard 禁止写操作）；true = 正常模式
  DEBUG: Joi.boolean().truthy('true').falsy('false').default(true),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().port().default(3306),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().allow('').default(''),
  DB_NAME: Joi.string().required(),
  DB_SYNC: Joi.boolean().truthy('true').falsy('false').default(false),
  DB_LOGGING: Joi.boolean().truthy('true').falsy('false').default(false),

  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('2h'),

  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_DB: Joi.number().integer().min(0).default(0),

  CORS_MODE: Joi.string().valid('off', 'all', 'open', 'list').default('off'),
  CORS_ORIGINS: Joi.when('CORS_MODE', {
    is: 'list',
    then: Joi.string().trim().min(1).required(),
    otherwise: Joi.string().allow('').default(''),
  }),
  CORS_CREDENTIALS: Joi.boolean().truthy('true').falsy('false').default(false),

  SWAGGER_ENABLED: Joi.boolean().truthy('true').falsy('false').default(false),
  SWAGGER_USERNAME: Joi.string().allow('').optional(),
  SWAGGER_PASSWORD: Joi.string().allow('').optional(),
  SWAGGER_TITLE: Joi.string().default('NestAdmin'),
  SWAGGER_DESCRIPTION: Joi.string().default('NestAdmin API 文档'),
  SWAGGER_VERSION: Joi.string().default('1.0.0'),

  FILE_STORAGE: Joi.string().valid('local', 'cos').default('local'),
  FILE_UPLOAD_DIR: Joi.string().default('../upload'),
  FILE_DOMAIN: Joi.string().default('http://localhost:3000'),
  FILE_SERVE_ROOT: Joi.string().default('/profile'),
  FILE_MAX_SIZE: Joi.number().integer().min(1).default(10),
  FILE_ALLOWED_EXTENSIONS: Joi.string().default('jpg,jpeg,png,gif,webp,bmp'),

  LOG_LEVEL: Joi.string().valid('fatal', 'error', 'warn', 'info', 'debug').default('info'),
  LOG_DIR: Joi.string().default('logs'),
  LOG_CONSOLE_ENABLED: Joi.boolean().truthy('true').falsy('false').default(true),
  LOG_FILE_ENABLED: Joi.boolean().truthy('true').falsy('false').default(true),
  LOG_HEALTH_LOG_ENABLED: Joi.boolean().truthy('true').falsy('false').default(false),
  LOG_DEPENDENCY_CHECK_INTERVAL_MS: Joi.number().integer().min(1000).default(30000),
  LOG_MAX_FILE_SIZE_MB: Joi.number().min(1).default(20),
  LOG_RETENTION_DAYS: Joi.number().integer().min(1).default(30),

  /** AI 模块 API Key 加密密钥；未设置时回退 JWT_SECRET 派生 */
  AI_ENCRYPTION_KEY: Joi.string().min(32).optional(),

  /** 每 Worker 最大并发 LLM 流数，超出时返回 503 */
  AI_MAX_CONCURRENT_STREAMS: Joi.number().integer().min(1).max(999).default(10),

  MIND_QDRANT_URL: Joi.string().uri().optional(),
  MIND_QDRANT_COLLECTION_PREFIX: Joi.string().optional(),
  MIND_QDRANT_VECTOR_SIZE: Joi.number().integer().min(1).max(100000).optional(),
  MIND_QDRANT_EMBED_BATCH: Joi.number().integer().min(1).max(512).optional(),

  MIND_GRAPH_ENABLED: Joi.boolean().truthy('true').falsy('false').optional(),
  MIND_GRAPH_CONCURRENCY: Joi.number().integer().min(1).max(32).optional(),
  MIND_GRAPH_CHUNK_SIZE: Joi.number().integer().min(200).max(20000).optional(),

  MIND_NEO4J_BOLT_URL: Joi.string().optional(),
  MIND_NEO4J_HTTP_URL: Joi.string().uri().optional(),
  MIND_NEO4J_USERNAME: Joi.string().optional(),
  MIND_NEO4J_PASSWORD: Joi.string().allow('').optional(),
  MIND_NEO4J_LABEL_PREFIX: Joi.string().optional(),

  MIND_DOC_SAVE_DIR: Joi.string().optional(),
  MIND_DOC_INDEX_REQUIRE_LOGIN: Joi.boolean().truthy('true').falsy('false').optional(),

  MIND_MCP_AMAP_KEY: Joi.string().allow('').optional(),

  MIND_LLM_PROVIDER: Joi.string().valid('openai', 'ollama').optional(),
  MIND_OPENAI_API_KEY: Joi.string().allow('').optional(),
  MIND_OPENAI_BASE_URL: Joi.string().allow('').optional(),
  MIND_OPENAI_MODEL: Joi.string().allow('').optional(),
  MIND_OPENAI_EMBEDDING_MODEL: Joi.string().allow('').optional(),
  MIND_OPENAI_IMAGE_MODEL: Joi.string().allow('').optional(),
  MIND_OLLAMA_BASE_URL: Joi.string().allow('').optional(),
  MIND_OLLAMA_MODEL: Joi.string().allow('').optional(),
  MIND_OLLAMA_EMBEDDING_MODEL: Joi.string().allow('').optional(),
});
