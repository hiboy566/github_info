---
description: apps/server 服务端规范 —— Go net/http / REST / GitHub API(github_info)
---

# 后端 / API 规范(apps/server,Go)

## 分层(单 package main)
- `main.go` —— 装配:.env 加载、`ConnectProfileStore`、路由注册、CORS、请求日志;本地/ECS 运行 HTTP server,Lambda 检测到 `INTERNAL_API_URL` 时不连数据库,经 payload v2 adapter 调用 `proxy.go`。
- `proxy.go` —— 仅负责 Lambda → Cloud Map → ECS 的内网反向代理;目标只允许 `http` 且禁止 URL credentials/query/fragment,失败统一返回 502 且不泄漏内部地址。
- `github.go` —— GitHub API 客户端:`GithubAccount`(前后端数据契约)、`GithubClientError`(域错误码)、`FetchUser`。
- `profiles.go` —— personal_info 数据访问 + 自动建库引导(见 `@rules/database.md`)。
- `handlers.go` —— HTTP handler:解析输入 → 调 client/store → `writeJSON`/`writeError`;fetch 成功后写 `personal_profiles`,保存失败 `saved=false` 并记日志(不阻塞返回)。
- `Makefile` —— `sam build` 的构建目标(交叉编译 linux/arm64 静态 `bootstrap`);SAM 的 `CodeUri: apps/server`。

## 路由与错误
- 路由用 Go 1.22+ pattern:`GET /{$}`(精确根路径)、`POST /api/github-account/fetch`、`GET /api/intro/{login}`(`r.PathValue("login")`,读 personal_info)。
- 错误响应统一 `writeError(w, status, code, message)` → `{"error":{"code","message"}}`;code 沿用旧 tRPC 码(`UNAUTHORIZED`/`FORBIDDEN`/`TOO_MANY_REQUESTS`/`NOT_FOUND`/`BAD_REQUEST`/`INTERNAL_SERVER_ERROR`),前端 `getErrorMessage` 按 code 映射中文文案,新增错误须两端同步。
- `GithubClientError.Code` → HTTP 状态的映射集中在 `githubErrorStatus`,别在 handler 里散写。
- message 面向前端、可读;内部细节只进服务端日志(`log.Printf`),**日志与错误信息里绝不出现 token**。

## 装配约定
- CORS:白名单来自 env `CORS_ORIGIN`(逗号分隔),`withCORS` 中间件统一处理(含 OPTIONS 预检);新增来源改 env,别放通配。
- 环境变量:`loadDotEnv(".env")` 后由 `databaseConfigFromEnv` / `envOr` 读取;本地数据库用 `DATABASE_URL`,ECS 用 pgx 原生 `PG*`(密码由 Secrets Manager 注入),Lambda 用 `INTERNAL_API_URL`,新增变量需同步 README 与部署模板。
- 请求体一律 `http.MaxBytesReader` 限长后再 decode;入库/外呼分别用带超时的 context。

## GitHub API 集成(本产品核心)
- 用用户提交的 PAT 调 GitHub REST 的逻辑**只放服务端**(`github.go`),前端**绝不直连**。
- 外呼超时 10s(`http.Client{Timeout}`,CWE-400);失败分类:401 → invalid-token、403+`x-ratelimit-remaining: 0` → rate-limited、403 → forbidden、其余 → upstream-error。
- 改 `GithubAccount` 字段时,同步改:`githubUser`(snake_case tag)→ 映射 → `profiles.go`(schema/upsert/select/scan)→ `apps/web/src/lib/api.ts` 类型 → 前端展示组件。
