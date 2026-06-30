# github-account-fetch — 技术设计

## 设计版本

| 日期 | 版本 | 说明 |
| ---- | ---- | ---- |
| 2026-06-30 | v1 | 初始设计 |

## 项目架构

- 架构类型: pnpm monorepo(Better-T-Stack)
- 涉及层: 前端(apps/web)、API/后端(packages/api + apps/server);本 feature **不涉及数据库**。
- 遵循 `.claude/rules/`:backend-api(tRPC / GitHub 服务端调用)、frontend(TanStack / shadcn)、security(PAT 处理)。

## 功能模块设计

### 模块 1: GitHub API 适配层(服务端)

- 位置: `packages/api/src/github/client.ts`(新增)。
- 输入: PAT 字符串;输出: 规范化的 `GithubAccount`(见数据模型)。
- 实现: `fetch("https://api.github.com/user", { headers: { Authorization: "Bearer <token>", "User-Agent": "github_info-app", Accept: "application/vnd.github+json" } })`。
- 响应用 **zod**(`githubUserSchema`)解析,只取所需字段、容忍多余字段。
- 错误分类(抛领域错误,由 procedure 转 TRPCError):
  - 401 → `invalid-token`
  - 403 且 `x-ratelimit-remaining: 0` → `rate-limited`;否则 403 → `forbidden`
  - 网络 / 超时 / 解析失败 → `upstream-error`
- **绝不** `console.log` token;抛出的错误对象不带 token。

### 模块 2: tRPC procedure(服务端)

- 位置: `packages/api/src/routers/github-account.ts`(新增),并入 `appRouter`(`routers/index.ts`)。
- `githubAccount.fetch`: **publicProcedure**(公开页,无需登录)。
  - `.input(z.object({ token: z.string().min(1, "Token 不能为空") }))`
  - `.mutation(...)`:调适配层,成功 `return account`;失败 `throw new TRPCError({ code, message })`,映射:invalid-token→`UNAUTHORIZED`、forbidden→`FORBIDDEN`、rate-limited→`TOO_MANY_REQUESTS`、upstream-error→`INTERNAL_SERVER_ERROR`。
  - `message` 面向用户、不含 token / 堆栈。
- 用 mutation 而非 query:有副作用语义(feature 2 将在此落库),且 token 不宜进 query key / URL。

### 模块 3: 前端页面与表单(apps/web)

- 路由: 复用 `src/routes/index.tsx` 作为 Fetcher 页(公开,不在 `_auth` 下)。
- 组件:
  - `components/github/token-form.tsx`:`@tanstack/react-form` + zod;`<Input type="password">`(`@github_info/ui/components/input`);提交调 `useMutation(trpc.githubAccount.fetch.mutationOptions())`;pending 时禁用按钮、显示 loader。
  - `components/github/account-card.tsx`:展示账户字段(头像 + 资料 + 2 列 stats)。
  - `components/github/fetch-status.tsx`:loading / 错误文案。
- 错误文案映射(读 mutation error 的 TRPCError):UNAUTHORIZED→「Token 不正确或已失效」、FORBIDDEN→「Token 权限不足」、TOO_MANY_REQUESTS→「GitHub 限流,请稍后重试」、其它→「请求失败,请稍后重试」。
- 样式遵循 `ui/DESIGN.md`(Clinical Precision):800px 容器、8px 栅格、Navy 主色 / Sage 校验态、Plus Jakarta Sans 标题 + DM Sans 正文、数字用 tabular。

## 接口契约

```ts
// packages/api —— githubAccount.fetch
input:  { token: string }                 // min length 1
output: GithubAccount                      // 见数据模型
error:  TRPCError(UNAUTHORIZED | FORBIDDEN | TOO_MANY_REQUESTS | INTERNAL_SERVER_ERROR)
```

## 数据模型

本 feature 无 DB,仅运行时类型(zod 推断):

```ts
type GithubAccount = {
  githubId: number;       // GitHub id
  login: string;
  name: string | null;
  avatarUrl: string | null;
  email: string | null;
  company: string | null;
  blog: string | null;
  location: string | null;
  bio: string | null;
  publicRepos: number;
  followers: number;
  following: number;
  createdAt: string;      // GitHub created_at(ISO)
};
```

## 安全考虑(`.claude/rules/security.md`)

- PAT 仅经 tRPC input 到服务端,**只在适配层临时使用**,响应后不保留、不落库、不日志、不回包。
- 前端输入框 `type="password"`;不写 localStorage;mutation 不缓存 token。
- GitHub 调用只在服务端;错误信息脱敏。
- 输入 zod 校验;CORS / credentials 沿用现有 server 配置。

## 技术决策

| 决策 | 选项 | 理由 |
| ---- | ---- | ---- |
| 公开 vs 登录 | publicProcedure 公开页 | 贴合 MVP「不含权限系统」,2026-06-30 产品确认 |
| query vs mutation | mutation | token 有副作用语义、不宜进 query key/URL;后续可在同一 procedure 落库 |
| GitHub 调用位置 | 服务端适配层 | 避免 token 暴露、规避浏览器 CORS、统一错误处理 |
| 响应校验 | zod 解析 GitHub 返回 | 容错 + 类型安全,符合 coding-style / security 规则 |
