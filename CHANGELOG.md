# 变更记录

## 2026-09-11

### 数据库：`t_*` 表对齐 `sa_*` 约定

`init.sql` 里的表原本分成两套互不兼容的约定：`sa_*` 实体继承 `BaseEntity`，有完整审计字段和软删除；从上游 mind 项目整体移植进来的 5 张 `t_*` 表只有 `create_time`，删除是物理删除。本次把后者对齐到前者，**不改表名**（保留移植带来的可读性代价，换取零重命名风险）。

- **实体**：`mind-history-record` / `mind-memory-detail` / `mind-system-model` / `mind-system-setting` / `mind-system-document` 改为 `extends BaseEntity`，删掉各自重复的 `createTime` 声明。`mind-user-profile` 本就正确继承，未动。
  - `BaseEntity` 只声明列、不声明主键，各实体保留自己的 `@PrimaryColumn varchar(50)`。
  - `mind-system-document` 保留 `upload_time` 作为业务字段（文件的上传时刻），`create_time` 由基类提供。
- **新增 `database/schema-alignment.sql`**：按 `information_schema` 状态判断每一步的幂等迁移。为 5 张 `t_*` 表补 `update_time` / `created_by` / `updated_by` / `delete_time`；把 `create_time` 对齐实体推导出的 `datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`（否则 `synchronize` 每次启动都会反复 ALTER）；`t_system_document` 新增 `create_time` 并从 `upload_time` 回填，不丢真实时间；修正 `t_system_document.status` 的类型漂移（`mediumint` → `tinyint`）；补齐 `sa_system_plugin` 与 `t_user_profile` 的建表语句（这两张表此前只有实体，没有 DDL，只靠 `synchronize` 在启动时凭空创建）。
  - 幂等是**按状态**的：重复执行不会重建表，在全新装载 `init.sql` 的库上完全空转。
- **`database/init.sql`**：5 张 `t_*` 表的建表块改写为目标结构；插入 `sa_system_plugin`（放在 `sa_system_oper_log` 与 `sa_system_post` 之间）和 `t_user_profile`（文件末尾）。种子数据不重新 dump。
- **服务层 4 处物理删除改软删除**：`mind-document.service.ts` 删文档、`mind-history.service.ts` 删历史记录及详情、`mind-model.service.ts` 删模型。
- **`PluginEntity`** 的 `name` 唯一键改为显式命名 `@Unique('uk_plugin_name', ['name'])`，与 DDL 中的键名一致，避免 TypeORM 自动生成的 `IDX_<hash>` 与手写 DDL 不一致导致 `synchronize` 反复建索引。

### 修复

- **`synchronize` 硬编码为 `true`**（`app.module.ts`）。`DB_SYNC` 环境变量此前根本不生效——`configuration.ts` 读了它，但唯一的消费方 `src/config/database.config.ts` 是死代码。文档承诺的「生产环境 `DB_SYNC=false` 可禁止自动改表」从来没生效过。现在 `synchronize` 读 `DB_SYNC`（默认 `false`），`NODE_ENV=production` 时无条件 `false`；死代码 `src/config/database.config.ts` 已删除。
- **`database/init.sql` 原本无法装载**（预先存在的问题，本次一并修复）。43 条 INSERT 是审计列加进来之前写的，用了不带列名的定位写法，执行时全部报 `ERROR 1136 Column count doesn't match value count`：`sa_ai_chat_message`(38)、`sa_ai_provider`(3)、`t_system_setting`(2)。全部补上显式列名。这不只是整洁问题——它让文档里的初始化步骤和本次改动的验证都无法进行。
- **`ensureHistoryMemory` 会静默丢对话**（`mind-history.service.ts`）。这是加 `@DeleteDateColumn` 之后必须同步做的配套修改，不是独立缺陷：软删除的行仍然存在于表中，`findOne({ id })` 因自动注入的 `delete_time IS NULL` 查不到它，代码于是拿同一个主键去 `save()`；TypeORM 按主键加载目标时会带上已软删的行，走的是一条不会清 `delete_time` 的 UPDATE，结果是这条会话继续不可见，新消息却不断累积。现在查询带 `withDeleted: true`，命中已删除的行时先 `restore()`。触发路径在 `mind-agent.service.ts`、`mind-retrieval.service.ts`、`mind-modal.service.ts` 的对话热路径上。

### 文档

- 根 `README.md`：`database/` 说明、多租户一节的覆盖范围、初始化加载顺序（加入 `schema-alignment.sql`，并说明全新安装不需要它）、`DB_SYNC` 措辞从建议改为事实描述；「Known rough edges」新增 `t_*` 前缀保留、`sa_*` 建表块时间戳类型滞后、以及 `migration:*` 脚本不可用三条。
- `server/README.md`：数据库初始化改为「唯一受支持的方式是跑 SQL 脚本」，并写明 `migration:*` 不可用（`src/data-source.ts` 指向的 `server/migrations` 和 `src/migrations` 下都只有 `index.html`）与 `DB_SYNC` 的实际行为；新增「数据库迁移」一节说明改表的正确流程；生产检查清单标注 `DB_SYNC=false` 已由代码强制；修正 `DB_NAME=nestjs` / `CREATE DATABASE nestjs` 与全文 `rbac_admin` 不一致的问题。
- `server/CLAUDE.md`：MySQL 规则段补充表结构唯一来源、`DB_SYNC` 强制行为、以及加列后定位 INSERT 会报 1136 的注意事项。

## 2026-07-28

### 修复
- **web-antd**: CaptchaImage 组件验证码渲染修复 — 将 `dangerouslySetInnerHTML` 改为 `<img src={...}>`
  - 文件: `web-antd/src/pages/Login/index.tsx`
  - 原因: 后端返回 base64 data URL，需用 `<img>` 标签显示

### 数据库初始化
- 插入默认租户 `sa_system_tenant` (ID=1, code=default)
- 插入管理员用户 `sa_system_user` (admin / admin123)
- 关联用户-租户 `sa_system_user_tenant` (超级管理员+默认)
- 插入默认部门 `sa_system_dept` (总公司), 关联到 admin

### 对齐 Vue 版登录交互 (web-antd)
- **类型定义** `typings.d.ts` — 新增 `TenantItem`、更新 `LoginAccountParams`（加 `tenant_id`）、更新 `LoginAccountResult`
- **API 服务** `auth.ts` — 新增 `queryTenantsByUsername`
- **Store** `profile.ts` — 新增 `setProfile` 方法
- **登录页** `Login/index.tsx` — 重写：
  - 新增租户选择下拉框（输入用户名自动加载，单个自动选中，默认标记）
  - 验证码加载失败/成功/刷新逻辑对齐 Vue
  - 登录请求带上 `tenant_id`
  - 登录成功自动获取用户信息并存储
  - 登录失败自动刷新验证码

### 新增后端接口
- **config.controller.ts** — 新增 `SystemWebConfigController` (路由: `/api/system/config/web`)
  - GET: 返回站点配置 (siteName, theme, siteLogo, siteDescription, siteTitle)
  - POST: 更新站点配置
- **sa_system_config** — 插入默认初始配置 (站点名称、标题、主题等)

### 初始化菜单数据
- **sa_system_menu** — 插入 22 条菜单记录，包含:
  - 系统管理: 用户/角色/菜单/部门/岗位/参数配置/字典管理
  - 监控管理: 在线用户/登录日志/操作日志/服务监控/缓存监控
  - 按钮权限: 用户和角色的增删改查权限
