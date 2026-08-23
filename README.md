# NestJS RBAC Admin

A full-stack admin system built on NestJS and React. It covers role-based access control with multi-tenancy and row-level data scoping, system monitoring, scheduled jobs, streaming AI chat, and a RAG knowledge base backed by a vector store and a knowledge graph.

[![Node](https://img.shields.io/badge/Node-%3E%3D20-brightgreen)](https://nodejs.org)
[![NestJS](https://img.shields.io/badge/NestJS-11-ea2845)](https://nestjs.com)
[![React](https://img.shields.io/badge/React-18-61dafb)](https://react.dev)
[![MySQL](https://img.shields.io/badge/MySQL-%3E%3D5.7-4479a1)](https://www.mysql.com)
[![License](https://img.shields.io/badge/License-MIT-blue)](LICENSE)

## What's inside

| Directory | Description |
| --- | --- |
| `server/` | NestJS 11 API. TypeORM over MySQL, Redis for sessions and caching, JWT auth, WebSocket chat gateway, OpenAPI spec. |
| `web-antd/` | React 18 SPA. Vite, Ant Design 5, Pro Components, Zustand. Routes are generated at runtime from the menu tree the API returns. |
| `database/` | Schema and seed SQL. Base schema, menu seeds, and the data-permission migration. |

The backend has its own in-depth guide covering module internals, debugging, and PM2 deployment: [`server/README.md`](server/README.md).

## Features

**Access control.** Users, roles, menus, departments, and posts, with permission slugs such as `core:user:index` declared per route via `@RequirePermission`. Row-level filtering is applied through `@DataScope`, which resolves the caller's visible user set into an `AsyncLocalStorage` context that services read when building queries.

**Multi-tenancy.** Tenant and user identity travel in an `AsyncLocalStorage` context. A TypeORM subscriber fills `tenantId` and the audit columns on insert and update, so tenant isolation does not depend on every query remembering to filter.

**Monitoring.** Online sessions, login and operation logs, email logs, server and Redis stats, a database table browser with a recycle bin, and cron-style scheduled jobs.

**AI chat.** Token-by-token streaming over a WebSocket gateway at `/ws/ai`, with provider and model administration, per-session context building, and summarization when a session outgrows its context window.

**Knowledge base (RAG).** Document upload and web page ingestion feed a Redis-backed index queue that extracts, chunks, embeds, and optionally builds a knowledge graph. Retrieval streams answers over SSE in two modes: NativeRAG and Corrective RAG. Qdrant stores vectors; Neo4j stores the graph.

**Code generation.** Table-driven scaffolding for NestJS and Vue templates under `server/src/module/system/tool`.

## Tech stack

**Backend** — NestJS 11.1, TypeORM, MySQL via `mysql2` 3.22, `ioredis` 5.11, Passport JWT, `@nestjs/swagger` 11.4, `ws` 8.21, Winston, `class-validator`, Joi for env validation. Knowledge base: LangChain 1.5, LangGraph, Qdrant, Neo4j, OpenAI or Ollama.

**Frontend** — React 18.3, Ant Design 5.27, `@ant-design/pro-components` 2.8, `@ant-design/x` 1.6, Vite 5.4, Zustand 5.0, React Router 6.26, Axios 1.7, ECharts 6, `react-intl` 6.6.

Runs on Node 20+ or Bun 1.1+. Production uses PM2.

## Prerequisites

- Node.js >= 20, and pnpm >= 9 or Bun >= 1.1
- MySQL >= 5.7
- Redis 7

The knowledge base module also needs Qdrant, and optionally Neo4j for graph extraction plus an LLM endpoint (OpenAI-compatible or Ollama). Every other module runs without them.

## Quick start

**1. Create the database and load the schema.** Run the files in this order:

```bash
mysql -h127.0.0.1 -uroot -e "CREATE DATABASE rbac_admin DEFAULT CHARSET utf8mb4;"
mysql -h127.0.0.1 -uroot rbac_admin < database/init.sql
mysql -h127.0.0.1 -uroot rbac_admin < database/data-permission.sql
mysql -h127.0.0.1 -uroot rbac_admin < database/web-antd-menu-seed.sql
mysql -h127.0.0.1 -uroot rbac_admin < database/web-antd-mind-menu.sql
```

The two `web-antd-*` files are idempotent. Menus are cached for 7200s, so re-run them before a fresh login rather than mid-session.

**2. Configure the backend.**

```bash
cd server
cp .env.example .env
pnpm install
```

Set `DB_*`, `REDIS_*`, and a `JWT_SECRET` of at least 32 characters.

> **Port mismatch to fix first.** `.env.example` ships `APP_PORT=48137`, but the frontend dev proxy in `web-antd/vite.config.ts` targets `http://127.0.0.1:3000`. Set `APP_PORT=3000` or point the proxy at 48137, otherwise every request from the dev server fails to connect.

**3. Start the API.**

```bash
pnpm dev        # Bun watch mode
```

`database/init.sql` seeds an `admin` / `admin123` account. Change that password before exposing the service.

**4. Start the frontend.**

```bash
cd web-antd
npm install
npm run dev                    # http://localhost:5173
```

## Configuration

All variables are documented inline in [`server/.env.example`](server/.env.example). The ones that matter most:

| Group | Variables |
| --- | --- |
| App | `NODE_ENV`, `APP_PORT`, `APP_API_PREFIX`, `DEBUG` |
| Database | `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`, `DB_SYNC`, `DB_LOGGING` |
| Redis | `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_DB` |
| Auth | `JWT_SECRET`, `JWT_EXPIRES_IN` |
| Uploads | `FILE_STORAGE`, `FILE_UPLOAD_DIR`, `FILE_DOMAIN`, `FILE_MAX_SIZE`, `FILE_ALLOWED_EXTENSIONS` |
| Logging | `LOG_LEVEL`, `LOG_DIR`, `LOG_RETENTION_DAYS` |
| Knowledge base | `MIND_QDRANT_URL`, `MIND_NEO4J_BOLT_URL`, `MIND_LLM_PROVIDER`, `MIND_OPENAI_API_KEY`, `MIND_OLLAMA_BASE_URL`, `MIND_GRAPH_ENABLED` |

`DEBUG=false` puts the API in read-only mode: every POST, PUT, PATCH, and DELETE is rejected unless the route is on the whitelist in `server/src/config/configuration.ts`. Keep it `true` for normal operation.

Set `DB_SYNC=false` in production so TypeORM never alters the schema on boot.

## Project structure

```
├── server/
│   └── src/
│       ├── common/         # guards, interceptors, filters, decorators, tenant + data-scope context
│       ├── config/         # env schema and namespaced config
│       ├── logging/        # Winston sinks, request logging, dependency monitor
│       ├── redis/          # ioredis client and cache decorators
│       ├── module/
│       │   ├── system/     # user, role, menu, dept, dict, post, notice, config, tenant, plugin, tool
│       │   ├── monitor/    # online, loginlog, operlog, job, cache, redis, database, server, email-log
│       │   ├── ai/         # chat gateway, provider adapters, context builder
│       │   ├── mind/       # document indexing, retrieval, vector, graph, agentic runtime
│       │   └── article/    # CMS articles and categories
│       └── api-verifier/   # CLI smoke tests driven by the OpenAPI spec
├── web-antd/
│   └── src/
│       ├── pages/          # System (11 CRUD modules), Monitor, Ai, Mind, article, Settings, Login
│       ├── services/       # one module per API domain, wrapping the shared axios client
│       ├── types/          # ambient declaration files, one namespace per domain
│       ├── stores/         # Zustand stores for profile and system config
│       ├── locales/        # zh-CN, zh-TW, en-US
│       └── routes.tsx      # builds routes from the server menu tree
└── database/
```

## Scripts

**Backend** (`cd server`)

| Command | Description |
| --- | --- |
| `pnpm dev` | Bun watch mode |
| `pnpm dev:nest` | Nest CLI watch mode |
| `pnpm build` | Compile to `dist/` |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm verify:api` | Run OpenAPI-driven smoke tests, write a Markdown report to `logs/verify/` (run `pnpm build` first) |
| `pnpm migration:generate` / `migration:run` | TypeORM migrations |
| `pnpm test` / `test:e2e` | Jest |
| `pnpm prod` | Start under PM2 |

**Frontend** (`cd web-antd`)

| Command | Description |
| --- | --- |
| `npm run dev` | Vite dev server on port 5173 |
| `npm run build` | Production build to `dist/` |
| `npm run build:check` | Type check, then build |
| `npm run lint` | ESLint |

## API conventions

Routes are mounted under `/api`. Responses always return HTTP 200, including errors, and carry the status in the body:

```json
{ "code": 200, "msg": "操作成功", "message": "操作成功", "data": {} }
```

Errors use the same envelope with `code` set to the HTTP status and `data` null. The frontend axios layer inspects `code` and flattens `data` onto the top level when it is a plain object, which is why list responses read as `res.records` rather than `res.data.records`. String and array payloads are not flattened.

Authenticate with `Authorization: Bearer <token>`. Tokens are validated against a Redis session key, so a logout invalidates them server-side.

Interactive docs live at `/api/swagger-ui` when `SWAGGER_ENABLED=true`, and the generated spec is written to `server/public/openApi.json` at boot. A dependency-free request tester is served at `/api-test/`. Liveness is at `/api/health`, which reports MySQL and Redis status.

## Deployment

**Backend.** Build, then run under PM2 using `server/ecosystem.config.cjs` (app name `nextjs-server`, fork mode, restart above 400 MB RSS). `src/main.ts` also forks workers via `node:cluster`; set `WEB_CONCURRENCY` to size the pool or `NO_CLUSTER=1` to disable it.

```bash
cd server && pnpm build && pnpm prod
```

**Frontend.** `web-antd/Dockerfile` builds with Node 18 and serves the output from nginx, with `nginx.conf` proxying `/api/` to `http://backend:3000/` and falling back to `index.html` for client-side routes.

> The Dockerfile copies `yarn.lock`, but this repository only contains `package-lock.json`. Switch the builder stage to `npm ci` or add a `yarn.lock` before building the image.

## Known rough edges

- The dev proxy port and `APP_PORT` default disagree, as noted in the quick start.
- The frontend Docker build references a lockfile that is not in the repository.
- The `init:auth` and `init:auth:dev` scripts in `server/package.json` point at `dist/auth/cli/init-auth.cli.js`, but no corresponding source file exists under `server/src`. Seed the admin account from `database/init.sql` instead.
- `getCacheInfo` and `getRedisInfo` in `web-antd/src/services/monitor.ts` call the same endpoint, as do `getUserInfo` in `services/auth.ts` and `getProfile` in `services/system.ts`.
- Newer pages (`Ai`, `Mind`, `article`) hard-code Chinese strings instead of using the `react-intl` setup that the `System` pages use.

## Documentation

- [`server/README.md`](server/README.md) — backend architecture, module reference, debugging, PM2
- [`CHANGELOG.md`](CHANGELOG.md) — change history

## License

[MIT](LICENSE)
