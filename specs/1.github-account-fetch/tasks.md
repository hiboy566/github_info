# github-account-fetch — 任务清单

## 任务版本

| 日期 | 版本 | 说明 |
| ---- | ---- | ---- |
| 2026-06-30 | v1 | 初始任务 |

## 项目信息

- 项目名: github_info
- 架构类型: pnpm monorepo(Better-T-Stack)
- specs 路径: specs/1.github-account-fetch/

## 任务列表

### 功能 1: GitHub 拉取(服务端)

- [ ] T-001: GitHub API 适配层 `packages/api/src/github/client.ts`:用 PAT 调 `GET /user`,zod 解析为 `GithubAccount`,错误分类(401 invalid / 403 forbidden|rate-limited / 网络 upstream),不日志 token ~30min
- [ ] T-002: tRPC `githubAccount.fetch`(publicProcedure)`packages/api/src/routers/github-account.ts`:`.input({token})` zod 校验,调适配层,失败转 TRPCError(UNAUTHORIZED / FORBIDDEN / TOO_MANY_REQUESTS / INTERNAL),token 不回包;并入 appRouter ~30min

### 功能 2: 页面与表单(前端)

- [ ] T-003: Fetcher 页面骨架 `apps/web/src/routes/index.tsx`:标题、Token 输入区、状态区、信息区布局,遵循 ui/DESIGN.md(800px 容器 / 8px 栅格) ~30min
- [ ] T-004: Token 表单组件 `apps/web/src/components/github/token-form.tsx`:react-form + zod,`type="password"` 掩码、非空校验、提交调 `trpc.githubAccount.fetch` mutation、pending 禁用 + loader ~30min

### 功能 3: 展示与异常(前端)

- [ ] T-005: 状态 / 错误提示 `apps/web/src/components/github/fetch-status.tsx`:loading 指示 + 按 §8 映射错误文案(空 / 无效 / 权限 / 限流 / 未知) ~15min
- [ ] T-006: 账户信息卡 `apps/web/src/components/github/account-card.tsx`:头像 / login / name / bio / company / location / blog / public_repos / followers / following / created_at,DESIGN.md 样式(2 列 stats、数字 tabular) ~30min

### 集成与测试

- [ ] T-007: 联调:有效 token 展示信息、无效 token 清晰错误、空 token 前端拦截;观测响应 < 3s;确认网络面板 / 日志无完整 token ~30min

## 依赖关系

- T-002 依赖 T-001
- T-004 依赖 T-003、T-002
- T-005 依赖 T-003、T-002
- T-006 依赖 T-003
- T-007 依赖 T-001 ~ T-006

## 风险点

- GitHub API 限流(未认证 / 低配额 token):适配层读 `x-ratelimit-*` 给明确提示。
- `email` / `name` / `company` 等字段可能为 null(私密资料):类型与展示需容忍 null。
- TanStack Router 文件路由改 `index.tsx` 后需重生成 `routeTree.gen.ts`(由插件自动,勿手改)。
