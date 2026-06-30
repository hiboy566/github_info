# 开发计划索引

## 本次 PRD(2026-06-30)切分为 3 个 feature

来源:`docs/github-token-prd.md`(GitHub Token 获取个人账户信息与字段管理)。

| 序号 | feature | 说明 | 依赖 | 状态 |
| ---- | ------- | ---- | ---- | ---- |
| 1 | github-account-fetch | 输入 PAT → 服务端校验并调 GitHub API → 展示账户信息(不落库) | - | ✅ 完成 (2026-06-30) |
| 2 | github-account-persistence | 将拉取到的账户信息落库(Drizzle `github_accounts` + upsert) | 1 | 待开发 |
| 3 | schema-field-evolution | Drizzle 字段新增(twitter_username)与删除(blog)演示 | 2 | 待开发 |

**推荐执行顺序**:1 → 2 → 3(线性依赖链,无可并行项)。

## 关键决策(2026-06-30 与产品确认)

- **认证门槛**:GitHub 账户获取页为**公开页面,无需登录**;用 `publicProcedure`,不挂 `_auth` 保护路由。better-auth 脚手架本期不启用(MVP 不含权限系统)。
- **Token 存储**:用户 PAT **不落库、用完即弃** —— 仅服务端临时用于调 GitHub API,响应后丢弃,绝不写库/日志/回包。

## ID 编号约定

- 功能需求 / 任务 / 验收标准 ID **在单个 feature 内编号**,跨 feature 用 `{序号}.` 前缀区分。
- 例:`2.T-001` = 序号 2 这个 feature 的 T-001;`3.F-002` = 序号 3 的 F-002。
- **跨 feature 依赖**写全限定 ID,如 `2.T-003 依赖 1.T-002`。

## 技术基线(见 `.claude/CLAUDE.md` 与 `.claude/rules/`)

- Monorepo:pnpm + Vite+(`vp`);前端 `apps/web`(React 19 / TanStack Router+Query / shadcn);后端 `apps/server`(Hono)+ `packages/api`(tRPC);DB `packages/db`(Drizzle + Neon Postgres);env `packages/env`(t3-env)。
- 安全:PAT 掩码输入、不日志、不落库;GitHub API 只在服务端调;输入 zod 校验;DB 走 Drizzle 参数化、变更走 migration。
