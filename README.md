# github_info

## 这个项目的功能简述

这是一个用于获取并保存 GitHub 个人账户信息的全栈项目。用户在前端输入自己的 GitHub Personal Access Token 后，系统会调用 GitHub API 获取个人资料，并通过后端接口把账号信息保存到 PostgreSQL 数据库中；保存后可以用用户名生成一个个人介绍页面（`/intro/:login`）。

项目主要包含：

- 前端：React + TanStack Router + Vite
- 后端：**Go**（标准库 `net/http` + pgx），REST API；本地跑 HTTP server，云上以同一份代码跑 AWS Lambda（`provided.al2023`）
- 数据库：PostgreSQL，**唯一数据库 `personal_info`**（表 `personal_profiles`），保存个人信息；本地默认的 `postgres` 库与早期的 `github_info` 库均已删除。库和表由 Go 服务启动时自动创建（缺库时经系统模板库 `template1` 引导 `CREATE DATABASE`，再 `CREATE TABLE IF NOT EXISTS`）
- 页面：首页（Token 获取/保存账户信息）+ 个人介绍页（按用户名从 `personal_info` 库读取并生成介绍）

> 历史说明：后端最初是 Node（Hono + tRPC + Drizzle + Neon），2026-07 全量替换为 Go；AWS SAM / GitHub Actions 部署配置也已同步迁移为 Go 版（见「云端部署」）。

## 架构是什么

前后端分离。本地：

- 浏览器访问前端页面（Vite dev server，:3001）
- 前端通过 REST 调用 Go 后端（:3000）
- Go 后端用 pgx 连接本地 PostgreSQL（:5432）的 `personal_info` 库
- 拉取 GitHub 资料时，由 Go 服务端调用 GitHub API（PAT 只在服务端使用，不落库、不写日志）；成功后个人信息写入 `personal_profiles`

## 后端 API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/` | 健康检查，返回 `OK` |
| POST | `/api/github-account/fetch` | body `{"token": "..."}`，校验 PAT → 拉取 GitHub 用户 → 写入 `personal_profiles`，返回 `{account, saved}` |
| GET | `/api/intro/:login` | 按用户名（大小写不敏感）从 `personal_info` 读取个人信息，返回 `{account, updatedAt}` |

错误统一为 `{"error": {"code", "message"}}`，code 与旧 tRPC 版一致（`UNAUTHORIZED` / `FORBIDDEN` / `TOO_MANY_REQUESTS` / `NOT_FOUND` / `BAD_REQUEST` / `INTERNAL_SERVER_ERROR`）。

## 本地开发

前置条件：

- Go 1.26+
- 本地 PostgreSQL 运行中即可，**无需手工建库**（`personal_info` 库与表由 Go 服务首次启动时自动创建）：

```bash
brew services run postgresql@17   # 启动本地 PG（未设开机自启）
```

安装前端依赖：

```bash
pnpm install
```

启动（两个终端，或先后台跑 server）：

```bash
pnpm dev:server   # Go 后端 -> http://localhost:3000
pnpm dev:web      # 前端   -> http://localhost:3001
```

后端环境变量在 `apps/server/.env`（已 gitignore）：

```
DATABASE_URL=postgres://Admin@localhost:5432/personal_info
CORS_ORIGIN=http://localhost:3001
PORT=3000
```

## 云端部署（AWS SAM，已迁移到 Go）

- **Lambda**：`Runtime: provided.al2023` + `Architectures: arm64`，Handler 为 Go 编译出的 `bootstrap`；代码里检测到 `AWS_LAMBDA_FUNCTION_NAME` 即走 API Gateway(HTTP API, payload v2) 适配器，本地则照常起 HTTP server。
- **构建**：`sam build` 经 `apps/server/Makefile`（`CodeUri: apps/server`）交叉编译 `GOOS=linux GOARCH=arm64` 静态二进制，产物 zip 里只有 `bootstrap`。
- **数据库**：Aurora PostgreSQL 不变；应用只用 `personal_info`（`PersonalDatabaseName` 参数），缺库时由 Lambda 冷启动经 `template1` 自动 `CREATE DATABASE`；`DatabaseName` 参数只是集群初始库（不可变属性，应用不使用）。
- **连接配置**：本地继续使用 `DATABASE_URL`；Lambda 使用 pgx 原生的 `PGHOST` / `PGUSER` / `PGPASSWORD` / `PGDATABASE` 等变量，数据库密码无需拼进 URL，特殊字符也可安全解析。
- **前端 HTTPS**：S3 website 只作为 CloudFront 源站；用户通过模板输出的 `FrontendUrl`（HTTPS）访问 Token 表单，Go/API Gateway 的 CORS 也只允许该 CloudFront 域名。CI 同步 S3 后会自动创建 CloudFront invalidation。
- **CI**（`.github/workflows/deploy.yml`）：增加 `actions/setup-go`；`sam build && sam deploy` 后照旧构建前端同步 S3。所需 secrets 只剩 `AWS_ROLE_ARN`、`DB_PASSWORD`（`BETTER_AUTH_SECRET` 已随 Node 版移除，可从仓库 secrets 删除）。
- 本地可用 `sam validate` / `sam build` 自检（已验证通过）；`sam deploy` 由 push main 触发 CI 执行。

## 常用命令

```bash
pnpm run build        # 全部构建（server 走 go build，web 走 vite）
pnpm run check-types  # web/ui 跑 tsc，server 跑 go vet
pnpm run check        # biome 全仓 lint + 格式化
cd apps/server && go test ./...   # Go 测试（含数据库往返测试，PG 不可达时自动跳过）
```

## 项目结构

```text
github_info/
├── apps/
│   ├── web/         # 前端应用（React + TanStack Router）
│   │   └── src/
│   │       ├── lib/api.ts          # REST 客户端（类型 + 错误映射）
│   │       └── routes/
│   │           ├── index.tsx       # 首页：Token 获取账户信息
│   │           └── intro.$login.tsx # 个人介绍页（新功能）
│   └── server/      # Go 后端
│       ├── main.go      # 入口：路由、CORS、日志、.env 加载、Lambda/本地双模式
│       ├── github.go    # GitHub API 客户端（错误分类，token 不进日志/错误信息）
│       ├── profiles.go  # personal_info 库：自动建库（template1 引导）、personal_profiles 读写
│       ├── handlers.go  # HTTP handler 与错误响应
│       ├── Makefile     # sam build 用的 Go 交叉编译目标（bootstrap）
│       └── profiles_test.go # 数据库往返 + 自动建库引导测试
├── packages/
│   ├── ui/          # 共享 UI 组件（shadcn）
│   ├── env/         # 前端环境变量校验（VITE_SERVER_URL）
│   └── config/      # 共享 tsconfig
├── template.yaml    # AWS SAM：HTTP API + Lambda(provided.al2023, Go) + VPC + Aurora
└── docs/            # 产品 PRD
```
