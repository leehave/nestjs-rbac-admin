# AI 模块架构说明

日期：2026-09-11
范围：`server/src/module/ai`（后端 28 个文件，约 3040 行）+ `web-antd` 的对话/模型设置页

## 1. 概述

AI 模块提供「大模型对话」能力：会话管理、WebSocket 流式对话、多供应商多模型接入、上下文自动裁剪与摘要压缩。核心设计目标是**在有限的上下文窗口内维持长会话的连贯性**，同时通过前缀缓存降低推理成本。

三个入口：

| 入口 | 路径 | 面向 |
|---|---|---|
| `AiController` | REST `/api/ai/*` | 终端用户的会话 CRUD、模型/Agent 可选列表 |
| `AiAdminController` | REST `/api/ai/admin/*` | 管理员的供应商、模型配置 |
| `AiChatGateway` | WS `/ws/ai` | 终端用户的流式对话 |

## 2. 文件结构

```
server/src/module/ai/
├─ ai.module.ts                  # 模块装配
├─ ai.controller.ts              # 用户端 REST
├─ ai-admin.controller.ts        # 管理端 REST
├─ ai-chat.gateway.ts            # WebSocket 网关
├─ ai.types.ts                   # WS 事件 / REST 返回类型约定
├─ ai.constants.ts               # Redis 频道名、状态常量
├─ entities/
│  ├─ ai-provider.entity.ts      # sa_ai_provider
│  ├─ ai-model.entity.ts         # sa_ai_model
│  ├─ ai-agent.entity.ts         # sa_ai_agent
│  ├─ ai-chat-session.entity.ts  # sa_ai_chat_session
│  └─ ai-chat-message.entity.ts  # sa_ai_chat_message
├─ services/
│  ├─ chat.service.ts            # 对话主流程（552 行，核心）
│  ├─ context-builder.service.ts # 上下文组装与裁剪
│  ├─ session-summary.service.ts # 异步摘要压缩
│  ├─ ai-config.service.ts       # 系统配置读取 + 模型/Agent 解析
│  ├─ ai-admin.service.ts        # 供应商 / 模型管理
│  ├─ llm-semaphore.service.ts   # 进程内并发闸门
│  └─ ai-stream-stop.service.ts  # Redis 广播停止
├─ providers/
│  ├─ llm-adapter.ts             # 适配器分发 + 非流式聚合
│  ├─ llm-provider.util.ts       # Provider 级 extraBody
│  ├─ openai-stream.util.ts      # OpenAI 兼容实现 + 类型定义
│  └─ adapters/                  # 4 个协议适配器
└─ utils/
   └─ ai-token.util.ts           # token 粗估
```

前端对应部分：

```
web-antd/src/services/ai.ts              # REST API 封装
web-antd/src/utils/ai-ws.ts              # WS 信封封装
web-antd/src/pages/Ai/Chat/index.tsx     # 对话页
web-antd/src/pages/Ai/Model/index.tsx    # 模型设置页
```

## 3. 分层架构

```
                        ┌──────────── web-antd ────────────┐
                        │  pages/Ai/Chat   pages/Ai/Model  │
                        │  utils/ai-ws.ts  services/ai.ts  │
                        └────┬──────────────────────┬──────┘
                    REST     │                      │   WebSocket
                             ▼                      ▼
   ┌─────────────────────────────────────────────────────────────────┐
   │ 接入层                                                           │
   │   AiController          AiAdminController       AiChatGateway    │
   │   @Controller('api/ai') @Controller('api/       @WebSocketGateway │
   │   会话CRUD/模型/Agent     ai/admin')             ({path:'/ws/ai'})│
   │                                供应商·模型 CRUD   auth/chat.send/  │
   │                                                  chat.stop/ping  │
   └──────┬───────────────────────────┬──────────────────┬───────────┘
          │                           │                  │
          ▼                           ▼                  ▼
   ┌─────────────────────────────────────────────────────────────────┐
   │ 服务层                                                           │
   │  ChatService ──┬── ContextBuilderService    (组装 messages)      │
   │                ├── SessionSummaryService    (异步摘要压缩)        │
   │                ├── LlmSemaphoreService      (并发闸门)            │
   │                ├── AiConfigService          (配置/模型解析)       │
   │                └── AiStreamStopService      (Redis 广播停止)      │
   │  AiAdminService (供应商/模型管理 + API Key 加解密)                │
   └──────┬───────────────────────────┬──────────────────────────────┘
          │                           │
          ▼                           ▼
   ┌────────────────────────┐  ┌──────────────────────────────────────┐
   │ Provider 适配层         │  │ 存储                                  │
   │  llm-adapter.ts (分发)  │  │  sa_ai_provider / sa_ai_model        │
   │  ├ openai-completions   │  │  sa_ai_agent                         │
   │  ├ openai-responses     │  │  sa_ai_chat_session                  │
   │  ├ anthropic-messages   │  │  sa_ai_chat_message                  │
   │  ├ google-generative-ai │  │  MySQL(TypeORM) + Redis(停止广播)     │
   │  └ bedrock-converse     │  └──────────────────────────────────────┘
   └────────────────────────┘
```

## 4. 主链路：一次对话（WebSocket）

```
  前端                 Gateway           ChatService        ContextBuilder / 其他        LLM / DB
   │                     │                    │                       │                    │
   │── auth {token} ────►│                    │                       │                    │
   │                     │── getSessionByAccessToken ──► UserService                       │
   │◄── auth.ok ─────────│                    │                       │                    │
   │                     │                    │                       │                    │
   │── chat.send ───────►│                    │                       │                    │
   │                     │─ handleChatSend ──►│                       │                    │
   │                     │                    │ ① isAiEnabled ───────►│ AiConfigService     │
   │                     │                    │ ② getOwnedSession ─────────────────────────►│
   │                     │                    │ ③ resolveModel ──────►│ 解密 apiKey         │
   │                     │                    │ ④ save user msg ──────────────────────────►│
   │◄─ chat.user_message─│◄───────────────────│                       │                    │
   │                     │                    │ ⑤ save assistant(streaming) ──────────────►│
   │◄─ chat.message_start│◄───────────────────│                       │                    │
   │                     │                    │ ⑥ semaphore.acquire()  │                    │
   │                     │                    │ ⑦ buildMessages ─────►│ 查历史+裁剪+预算     │
   │                     │                    │ ⑧ streamLlm ──────────────────────────────►│
   │◄─ chat.token × N ───│◄───────────────────│◄── yield {delta} ─────────────────────────│
   │                     │                    │ ⑨ save assistant(completed+usage) ────────►│
   │                     │                    │ ⑩ save session(count/title/lastMessageAt) ►│
   │◄─ chat.message_done─│◄───────────────────│                       │                    │
   │                     │                    │ ⑪ scheduleSummarize() ─► 异步，不阻塞      │
   │                     │                    │ ⑫ semaphore.release()  │                    │
```

### 4.1 前置校验（①~⑤）

见 `services/chat.service.ts:276-350`。

| 步骤 | 动作 | 失败处理 |
|---|---|---|
| ① | `isAiEnabled()` 读 `ai_enabled` 系统配置 | 抛 `BadRequestException('AI 助手未启用')` |
| ① | `content.trim()` 非空校验 | 抛 `BadRequestException` |
| ② | `getOwnedSession()` —— 按 `sessionUuid + userId + tenantId + deleteTime IS NULL` 查 | 抛 `NotFoundException`（防越权，不区分「不存在」和「无权」） |
| ③ | `resolveModel()` —— 校验模型存在、`tenantId ∈ {0, 当前租户}`、状态启用、供应商启用、`api_key_cipher` 已配 | 抛 `Error`（**注意**：不是 HttpException，会变成 500） |
| ④ | 用户消息落库：`seq = messageCount + 1`，`status='completed'` | — |
| ⑤ | 预建助手消息：`seq = nextSeq + 1`，`status='streaming'`，写入 `request_params` / `metadata` 快照 | 先落库再流式，保证中断也有记录 |

### 4.2 流式生成（⑥~⑫）

- **⑥ 并发闸门** —— `LlmSemaphoreService` 是**进程内**计数信号量，上限 `AI_MAX_CONCURRENT_STREAMS`（默认 10），超限直接抛 `ServiceUnavailableException`。
- **⑦ 上下文组装** —— 见第 6 节。
- **⑧ 流式调用** —— `streamLlm()` 返回 `AsyncGenerator<LlmStreamChunk, LlmStreamUsage>`，主循环 `stream.next()` 逐块 emit `chat.token`。
- **⑨ 落库** —— 写 `content` / `status='completed'` / `promptTokens` 等 / `latencyMs` / `metadata`（含 `prompt_cache_hit_tokens`、`context_ratio`）。
- **⑩ 会话更新** —— `messageCount += 2`、`lastMessageAt`、`defaultModelId = modelId`；若 `messageCount === 2 && title === '新对话'` 则用首条用户消息前 40 字做标题。
- **⑪ 摘要调度** —— `scheduleSummarize()` 是 `void ... .catch(...)` 的 fire-and-forget，**不阻塞 WebSocket 响应**。
- **⑫ 释放** —— `finally` 中 `release()` + `unregisterStreamAbort()`。

### 4.3 异常分支

见 `services/chat.service.ts:475-508`。区分 `aborted`（→ `status='stopped'`）和真错误（→ `status='error'` + `chat.error` 事件）。

**关键设计**：无论成功 / 失败 / 停止，都会执行 `messageCount += 2` 和 `lastMessageAt` 更新。代码注释说明了原因——否则后续消息的 seq 会与本次冲突，且列表计数、排序会失效。

### 4.4 WS 事件一览

| 方向 | 事件 | data |
|---|---|---|
| C→S | `auth` | `{ token }` |
| C→S | `chat.send` | `{ session_uuid, content, model_id?, agent_id?, temperature? }` |
| C→S | `chat.stop` | `{ session_uuid, message_uuid? }` |
| C→S | `ping` | `{}` |
| S→C | `auth.ok` / `auth.error` | `{ user_id }` / `{ message }` |
| S→C | `chat.user_message` | `{ session_uuid, message_uuid, content }` |
| S→C | `chat.message_start` | `{ session_uuid, message_uuid, model_id, model_name, provider_name }` |
| S→C | `chat.token` | `{ session_uuid, message_uuid, delta }` |
| S→C | `chat.message_done` | 见 `ai.types.ts` 的 `AiWsMessageDoneData`（含 usage / context / session_stats） |
| S→C | `chat.error` | `{ code, message }` |

## 5. Provider 适配层

统一入口 `providers/llm-adapter.ts` 按 `provider.adapterType` 分发，全部实现同一契约：`AsyncGenerator<LlmStreamChunk, LlmStreamUsage, undefined>`（yield 增量，return usage）。

| adapterType | 端点 | 认证 | 消息映射 | 增量字段 | usage 来源 |
|---|---|---|---|---|---|
| `openai-completions`（默认） | `POST {base}/chat/completions` | `Authorization: Bearer` | 原样 | `choices[0].delta.content` + `reasoning_content` | `usage`（靠 `stream_options.include_usage`） |
| `openai-responses` | `POST {base}/responses` | `Bearer` | 转 `input[]` | `response.output_text.delta` → `json.delta` | `response.completed` |
| `anthropic-messages` | `{base}/v1/messages`（base 已带 `/v1` 则不重复） | `x-api-key` + `anthropic-version: 2023-06-01` | **system 抽到顶层字段**，其余进 `messages` | `content_block_delta.delta.text` | `message_start.input_tokens` / `message_delta.output_tokens` |
| `google-generative-ai` | `{base}/models/{model}:streamGenerateContent?alt=sse` | `x-goog-api-key` | **system → `systemInstruction`**，`assistant → role=model` | `candidates[0].content.parts[].text` | `usageMetadata` |
| `bedrock-converse-stream` | `POST {base}/model/{model}/converse-stream` | **AWS SigV4**（apiKey 需 `accessKeyId:secretAccessKey` 格式） | system 顶层，`assistant → assistant` | AWS EventStream 二进制帧 `contentBlockDelta.delta.text` | `metadata.usage` |

共用实现细节：

- 全部手写 SSE 解析：`TextDecoder` 增量 decode → 按 `\r?\n` 切行 → 最后一段残行留在 `buffer` → 跳过 `:` / `event:` 注释行 → `data:` 剥前缀 → `JSON.parse` 失败静默 continue → `[DONE]` 跳过。
- 全部注册 `signal.addEventListener('abort', abortReader)`，并在抛错时把错误统一改写成 `name = 'AbortError'`，让上层能可靠区分「用户停止」和「真失败」。
- `parseLlmUsage()` 兼容两家缓存字段：DeepSeek 的 `prompt_cache_hit_tokens` 和豆包的 `prompt_tokens_details.cached_tokens`；miss 缺失时用 `prompt_tokens - hit` 兜底。
- `completeLlm()` 是把流式跑完拼成完整字符串的「伪非流式」封装，专供摘要等后台任务复用同一套适配器。

## 6. 上下文组装（ContextBuilderService）

模块最核心的一段，位于 `services/context-builder.service.ts`。

```
buildMessages()
   │
   ├─ 1. 读配置：maxRounds / reserveTokens / messageMaxTokens
   │
   ├─ 2. 查历史：role∈{user,assistant} AND status='completed'
   │           AND delete_time IS NULL AND seq > summaryUpToSeq   ← 摘要覆盖的不重复发
   │           ORDER BY seq DESC TAKE maxRounds*4 → reverse()
   │
   ├─ 3. messages = [ {system: 稳定提示词} ]        ← 放首位命中前缀缓存
   │              + {user: [会话背景]【历史摘要】}   ← 不塞 system，保持前缀稳定
   │
   ├─ 4. budget = contextWindow - maxOutputTokens - reserveTokens
   │              - token(当前输入) - token(system+摘要)
   │
   ├─ 5. 逐条 compactMessageContent()（超 messageMaxTokens 则截断+标注）
   │      从尾部往前 unshift 进 kept，三个 break：
   │        · rounds >= maxRounds
   │        · usedTokens + cost > budget（但 kept 非空才 break）
   │        · 数组走完
   │
   ├─ 6. messages += kept
   ├─ 7. messages += {user: 当前输入}
   └─ 8. 返回 { messages, historyRounds, estimatedPromptTokens, contextRatio }
```

两个设计要点：

1. **摘要用 `user` 角色而非 `system`** —— 前缀缓存要求 system 保持稳定。把可变内容挤到消息列表尾部，前缀（system）就能长期命中缓存，降低延迟与成本。
2. **截断单条而非丢弃整条** —— 一条超长的 assistant 回复如果整条丢弃会丢失语义连贯性；截断保留开头，完整内容仍在 DB 可查（注释：Reasonix 的 turn-end compaction 思路）。

Token 估算用 `utils/ai-token.util.ts` 的粗估（中文 ≈ 1.6 字/token，每条消息额外 +4 token 角色/格式开销），注释里标了升级路径 = tiktoken。

## 7. 摘要压缩（SessionSummaryService）

```
chat.message_done 之后
   └─ scheduleSummarize(sessionId, tenantId, modelId, contextRatio)   ← void + catch，不阻塞
        └─ maybeSummarize()
             ├─ isSummaryEnabled()?                              否则 return
             ├─ 触发判定（二者任一）：
             │    roundTrigger   = rounds > ai_summary_trigger_rounds (默认12)
             │    ratioTrigger   = contextRatio >= compact_proactive(默认40)
             │                      或 >= compact_threshold(默认80)
             ├─ cutoffSeq = messageCount - keepRounds*2 (默认8轮)
             │  若 cutoffSeq <= summaryUpToSeq → 无需摘要
             ├─ 取 seq ∈ (summaryUpToSeq, cutoffSeq] 的 completed 消息
             ├─ 拼 transcript（「用户：…」/「助手：…」）
             ├─ 选模型：ai_summary_model_id ?? session.defaultModelId ?? 当前模型
             ├─ completeLlm(temperature=0.2, maxTokens=800)
             │    prompt：已有摘要则「合并更新」，否则「生成」
             ├─ session.summary = 结果.slice(0, 4000)
             └─ session.summaryUpToSeq = cutoffSeq         ← 下次 buildMessages 少查一段
```

**增量摘要**是关键：总是把「已有摘要 + 新增对话」交给 LLM 合并，配合 `summaryUpToSeq` 游标，避免重复摘要、避免全量重算。

## 8. 停止生成（AiStreamStopService）

```
chat.stop ──► AiStreamStopService.publishStop()
                ├─ 本地 abortLocalStream()                   ← 立即中止本 worker
                └─ Redis PUBLISH 'ai:chat:stop'              ← 广播给所有 worker
                     └─ 各 worker 的 subscriber 收到
                          └─ ChatService.abortLocalStream()
```

`ChatService.activeStreams` 是**进程内** `Map<messageUuid, { abort, sessionUuid }>`。注释标了扩展方向：多 worker 场景靠这层 Redis pub/sub 补齐跨进程中止。

## 9. 管理端（AiAdminService）

- 供应商 / 模型 CRUD，租户隔离统一用「`tenantId = 0`（平台级）或 当前租户」的可见性规则。
- `api_key` 写入时 `encryptAiSecret()`，读取时只返回 `api_key_masked`（解密失败兜底 `'****'`），**明文永不出接口**。
- 删除供应商前校验旗下无未删模型；设 `is_default=1` 前先把同租户其他模型置 0。

## 10. 数据模型

| 表 | 作用 | 关键字段 |
|---|---|---|
| `sa_ai_provider` | 供应商 | `adapter_type`、`base_url`、`api_key_cipher`（加密）、`extra_headers`(json) |
| `sa_ai_model` | 模型 | `context_window`、`max_output_tokens`、`default_temperature`、`is_default` |
| `sa_ai_agent` | 角色预设 | `system_prompt`、`welcome_message`、`temperature`、`max_history_rounds` |
| `sa_ai_chat_session` | 会话 | `session_uuid`、`agent_id`、`default_model_id`、**`summary` + `summary_up_to_seq`**、`message_count`、`last_message_at` |
| `sa_ai_chat_message` | 消息 | `seq`（会话内序号）、`status`、`prompt/completion/total_tokens`、`latency_ms`、`request_params`/`metadata`(json) |

`sa_ai_chat_message.status` 取值：`pending` / `streaming` / `completed` / `error` / `stopped`。

全部继承 `BaseEntity`（软删除 + 审计字段 + 租户）。

## 11. 配置项

### 系统配置（`sys_config`，经 `AiConfigService` 读取，均有兜底默认）

| key | 默认 | 用途 |
|---|---|---|
| `ai_enabled` | 启用 | 总开关 |
| `ai_max_history_rounds` | 10 | 带入历史轮数 |
| `ai_context_reserve_tokens` | 1024 | 安全预留 |
| `ai_message_max_tokens` | 1500 | 单条历史截断阈值 |
| `ai_summary_enabled` | 启用 | 摘要开关 |
| `ai_summary_trigger_rounds` | 12 | 轮数触发阈值 |
| `ai_summary_keep_rounds` | 8 | 摘要后保留的原始轮数 |
| `ai_summary_model_id` | null | 摘要专用模型 |
| `ai_context_compact_threshold` | 80 | 紧急压缩阈值 % |
| `ai_context_compact_proactive` | 40 | 主动压缩阈值 % |

### 环境变量

| 变量 | 默认 | 用途 |
|---|---|---|
| `AI_MAX_CONCURRENT_STREAMS` | 10 | 单 worker 最大并发 LLM 流 |

## 12. 已知问题

按严重程度排序。

1. **`semaphore.acquire()` 在 `try` 之外**（`services/chat.service.ts:357`）。
   并发超限抛错时 `finally` 不会执行，导致三处不一致：助手消息永远停留在 `status='streaming'`；`activeStreams` 中该条 AbortController 泄漏；`messageCount += 2` **未执行**——而用户消息已用 `seq = messageCount + 1` 落库，下一次发消息会拿到**同一个 seq**。
   建议：把 `acquire()` 挪进 `try`，或移到落库之前。

2. **停止路径的 `chat.message_done` 字段不全**（`services/chat.service.ts:496-502`）。
   只发了 `session_uuid` / `message_uuid` / `content` / `usage` / `latency_ms`，缺 `AiWsMessageDoneData` 要求的 `context` 和 `session_stats`。因为 `WsEmitFn` 的 data 类型是 `unknown`，编译器不拦，需要前端容错。

3. **`abortLocalStream` 按会话中止只停一条**（`services/chat.service.ts:249-257`）。
   JSDoc 写的是「中止该会话下的所有流」，但循环内命中第一条就 `return true`。

4. **`resolveModel()` 抛裸 `Error`**，不是 `BadRequestException`。
   前端收到 500 而非可读的 400（「模型已停用」/「供应商 API Key 未配置」）。

5. **`@Controller('api/ai')` 硬编码了 `/api` 前缀**，与 `server/CLAUDE.md` 中「Controller 只写模块名」的约定不符。
   目前 `APP_API_PREFIX` 为空所以能正常工作，一旦设为 `api` 就会变成 `/api/api/ai`。前端 `services/ai.ts` 同样硬编码 `/api/ai`，属于同一处耦合。

6. **`handleChatSend` payload 中的 `agent_id` 不生效**。
   `ai.types.ts` 声明了该可选字段，但服务端只读 `session.agentId`。

7. **`fetchLimit = Math.max(maxRounds * 2, maxRounds * 4)`**（`services/context-builder.service.ts:78`）。
   两个参数中后者恒大于等于前者（`maxRounds` 为正数），等价于 `maxRounds * 4`，`Math.max` 是冗余的。

## 13. 相关文档

- [AI 前端页面设计：模型设置 + 聊天模块](superpowers/specs/2026-08-17-ai-frontend-pages-design.md)
- [AI 前端页面实施计划](superpowers/plans/2026-08-17-ai-frontend-pages.md)
- [后端协作说明](../server/CLAUDE.md)
