# github_info

GitHub Token 工具:用户输入 GitHub Personal Access Token,经服务端校验后从 GitHub API 拉取账户信息(login / name / avatar / email / company / bio / public_repos / followers…),持久化到本地 PostgreSQL,并可用用户名生成个人介绍页(`/intro/:login`)。产品需求见 `docs/github-token-prd.md`,设计语言 "Clinical Precision" 见 `ui/DESIGN.md`。

## 技术栈

- **Monorepo**:pnpm workspaces(`apps/*` + `packages/*`),前端 Node + ESM,pnpm@11.7.0。
- **工具链**:**Vite+**(`vp` CLI,`vite-plus`)统一前端 dev/build/lint/fmt;`vite`/`vitest` 被 override 为 `@voidzero-dev/vite-plus-*`。
- **前端** `apps/web`:React 19 + TanStack Router(文件路由)+ TanStack Query,Tailwind v4,shadcn/ui(来自 `packages/ui`);经 `src/lib/api.ts` 的 fetch 封装调后端 REST。
- **后端** `apps/server`:**Go 1.26**,标准库 `net/http`(Go 1.22+ method 路由)+ `pgx/v5` 连接池;单 package main(main/github/profiles/handlers);`package.json` 里的 dev/build/check-types 分别代理到 `go run` / `go build` / `go vet`;检测到 `AWS_LAMBDA_FUNCTION_NAME` 时经 `aws-lambda-go-api-proxy/httpadapter`(payload v2)跑 Lambda,否则本地 `ListenAndServe`。
- **数据库**:PostgreSQL **唯一库 `personal_info`**(表 `personal_profiles`,`profiles.go`);本地默认 `postgres` 库与早期 `github_info` 库已删除。缺库时启动经系统模板库 `template1` 引导 `CREATE DATABASE`,表 `CREATE TABLE IF NOT EXISTS`,**无 ORM、无迁移工具**。本地 Homebrew postgresql@17。
- **认证**:无(MVP 公开页,无登录;better-auth 已随 Node 后端一并移除)。
- **环境** `packages/env`:`@t3-oss/env-core` + zod(仅 `./web`);Go 端自己读 `.env`(`apps/server/main.go` 的 loadDotEnv;本地用 DATABASE_URL, Lambda 用 PG* 连接变量;另有 CORS_ORIGIN / PORT)。
- **校验/格式化**:前端 Biome 2(Tab 缩进、双引号);Go 用 gofmt/go vet。
- **部署**:Docker Compose(web :3001、server :3000);**AWS SAM 已迁移 Go**——Lambda `provided.al2023`/arm64,`CodeUri: apps/server` + `apps/server/Makefile` 交叉编译 `bootstrap`,CI 在 `.github/workflows/deploy.yml`(setup-go + sam build/deploy + S3 前端)。

## 常用命令(项目根)

| 操作 | 命令 |
| --- | --- |
| 安装 | `pnpm install` |
| 后端 dev | `pnpm dev:server`(= `go -C apps/server run .`,:3000) |
| 前端 dev | `pnpm dev:web`(:3001) |
| 构建 | `pnpm build` |
| 类型检查 | `pnpm check-types`(web/ui 跑 tsc,server 跑 go vet) |
| 校验+自动修 | `pnpm check`(= `biome check --write .`) |
| Go 测试 | `cd apps/server && go test ./...`(PG 不可达时自动 skip) |
| Docker | `pnpm docker:up` / `docker:down` / `docker:logs` |

> 本地 PG:`brew services run postgresql@17`;**无需手工建库**(`personal_info` 由服务经 template1 自动创建)。后端环境变量在 `apps/server/.env`(DATABASE_URL / CORS_ORIGIN / PORT)。SAM 自检:`sam validate` / `sam build`。

## 目录结构

```
apps/
  web/      # React + TanStack Router 前端(路径别名 @/ → src)
    src/lib/api.ts            # REST 客户端:GithubAccount 类型、ApiError、getErrorMessage
    src/routes/index.tsx      # 首页(Token → 获取/保存账户)
    src/routes/intro.$login.tsx  # 个人介绍页(读库生成)
  server/   # Go 后端(:3000;Lambda 双模式)
    main.go / github.go / profiles.go / handlers.go / Makefile / profiles_test.go
packages/
  ui/       # 共享 shadcn/ui 组件与样式(@github_info/ui)
  env/      # t3-env + zod 环境校验(仅 web)
  config/   # 共享 tsconfig.base.json
docs/       # 产品 PRD(github-token-prd.md)
ui/         # 设计稿与设计系统(DESIGN.md / screen.png)
```

## 跨包导入约定

- workspace 包:`@github_info/{env,ui,config}`;子路径如 `@github_info/env/web`、`@github_info/ui/components/button`。
- `apps/web` 内部:`@/` → `apps/web/src`。
- **生成文件勿手改**:`apps/web/src/routeTree.gen.ts`(已 gitignore)。
- 公共依赖走 catalog(`pnpm-workspace.yaml` 的 `catalog:`),子包用 `catalog:` 引用、勿写死版本。
- 前后端数据契约:Go 结构体的 json tag(camelCase)必须与 `apps/web/src/lib/api.ts` 的 `GithubAccount` 保持一致,改字段要两边同步。

## 规则

@rules/coding-style.md
@rules/frontend.md
@rules/backend-api.md
@rules/database.md
@rules/security.md
@rules/testing.md
@rules/git-workflow.md

## 学习记忆

每完成一个 task,把踩坑 / 约定 / 决策按日期追加到根目录 `AGENTS.md`;新 task 冷启动先读它,避免重复踩坑。
