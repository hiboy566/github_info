---
description: apps/server + packages/api 服务端规范 —— Hono / tRPC / GitHub API(github_info)
---

# 后端 / API 规范

## 分层
- **`apps/server`** 只做传输层:Hono 应用、CORS、挂载 auth handler 与 tRPC,`@hono/node-server` 启动(:3000)。业务逻辑不写这里。
- **`packages/api`** 是 tRPC 核心:
  - `context.ts` —— 从 better-auth 取 `session`(`auth.api.getSession({ headers })`)。
  - `index.ts` —— `t`、`router`、`publicProcedure`、`protectedProcedure`。
  - `routers/**` —— 业务路由,合成 `appRouter` 并导出 `AppRouter` 类型(供 web 端到端推断)。

## Procedure
- 需登录的接口一律用 **`protectedProcedure`**(`ctx.session` 为空时已抛 `TRPCError({ code:"UNAUTHORIZED" })`);公开接口用 `publicProcedure`。勿在业务里自行解析 cookie 判断登录。
- 所有输入用 **zod** `.input(z.object({...}))` 校验后再用。
- 错误抛 `TRPCError`,选准 `code`(`UNAUTHORIZED` / `BAD_REQUEST` / `NOT_FOUND` / `TOO_MANY_REQUESTS` / `INTERNAL_SERVER_ERROR`);`message` 面向前端、可读,敏感细节放 `cause` 或服务端日志。
- 新增路由:在 `routers/` 下建文件,并入 `appRouter`;类型会自动经 `AppRouter` 传到前端,无需手写接口类型。

## Hono 装配(`apps/server/src/index.ts`)
- auth:`app.on(["POST","GET"], "/api/auth/*", c => auth.handler(c.req.raw))`。
- tRPC:`/trpc/*` 经 `trpcServer({ router: appRouter, createContext })`。
- CORS:origin = `env.CORS_ORIGIN`、`credentials:true`、显式 `allowMethods`/`allowHeaders`;新增跨域需求改这里(别放通配)。
- 环境变量只经 `@github_info/env/server`(zod 校验),**勿裸读 `process.env`**。

## GitHub API 集成(本产品核心)
- 用用户提交的 PAT 调 GitHub REST(如 `GET https://api.github.com/user`)的逻辑**只放服务端 procedure**,前端**绝不直连**(避免 token 暴露与 CORS)。
- 对失败分类给明确错误:401 token 无效、403 权限不足 / 触发 rate-limit(读 `x-ratelimit-*` 头)、网络/超时。
- PAT 不写日志、不回包、不进错误 message(见 `@rules/security.md`)。
