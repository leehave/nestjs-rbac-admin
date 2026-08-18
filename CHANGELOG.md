# 变更记录

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
