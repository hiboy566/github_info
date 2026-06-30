# github_info

GitHub Token 工具:用户输入 GitHub Personal Access Token,经服务端校验后从 GitHub API 拉取账户信息(login / name / avatar / email / company / bio / public_repos / followers…),用 Drizzle 持久化,并支持按需增删存储字段。产品需求见 `docs/github-token-prd.md`,设计语言 "Clinical Precision" 见 `ui/DESIGN.md`。

## 技术栈

- **Monorepo**:pnpm workspaces(`apps/*` + `packages/*`),Node + ESM(`"type":"module"`),pnpm@11.7.0。
- **工具链**:**Vite+**(`vp` CLI,`vite-plus`)统一 dev/build/lint/fmt 与跨 workspace 任务;`vite`/`vitest` 被 override 为 `@voidzero-dev/vite-plus-*`。
- **前端** `apps/web`:React 19 + TanStack Router(文件路由)+ TanStack Query + tRPC client,Tailwind v4,shadcn/ui(来自 `packages/ui`)。
- **后端** `apps/server`:Hono + tRPC(`@hono/trpc-server`)+ `@hono/node-server`(:3000)。
- **API** `packages/api`:tRPC(`publicProcedure` / `protectedProcedure`,导出 `AppRouter` 供端到端推断)。
- **认证** `packages/auth`:better-auth(email+password,Drizzle adapter)。
- **数据库** `packages/db`:Drizzle ORM + Neon serverless(`neon-http`),PostgreSQL。
- **环境** `packages/env`:`@t3-oss/env-core` + zod(`./server` / `./web`)。
- **校验/格式化**:Biome 2(Tab 缩进、双引号、import 排序、tailwind class 排序)。
- **共享配置** `packages/config`:`tsconfig.base.json`(全包 `extends`)。
- **部署**:Docker Compose(web :3001、server :3000)。

## 常用命令(项目根)

| 操作 | 命令 |
| --- | --- |
| 安装 | `pnpm install` |
| 全部 dev | `pnpm dev`(web:`pnpm dev:web` / server:`pnpm dev:server`) |
| 构建 | `pnpm build` |
| 类型检查 | `pnpm check-types` |
| 校验+自动修 | `pnpm check`(= `biome check --write .`) |
| lint / format | `pnpm lint` / `pnpm format` |
| DB push/生成/迁移/studio | `pnpm db:push` / `db:generate` / `db:migrate` / `db:studio` |
| Docker | `pnpm docker:up` / `docker:down` / `docker:logs` |

> 测试:Vitest(经 vite-plus-test)已就绪但**尚无用例/脚本**——新增见 `@rules/testing.md`。

## 目录结构

```
apps/
  web/      # React + TanStack Router 前端(路径别名 @/ → src)
  server/   # Hono + tRPC 服务端入口(:3000)
packages/
  api/      # tRPC 路由 + context + procedure(导出 AppRouter)
  auth/     # better-auth 配置
  db/       # Drizzle schema / 客户端 / migrations
  env/      # t3-env + zod 环境校验(server / web)
  ui/       # 共享 shadcn/ui 组件与样式(@github_info/ui)
  config/   # 共享 tsconfig.base.json
docs/       # 产品 PRD(github-token-prd.md)
ui/         # 设计稿与设计系统(DESIGN.md / screen.png)
```

## 跨包导入约定

- workspace 包:`@github_info/{api,auth,db,env,ui,config}`;子路径如 `@github_info/db/schema/auth`、`@github_info/env/server`、`@github_info/ui/components/button`。
- `apps/web` 内部:`@/` → `apps/web/src`。
- **生成文件勿手改**:`apps/web/src/routeTree.gen.ts`(已 gitignore)、`packages/db/src/migrations/*`(提交但不手改)。
- 公共依赖走 catalog(`pnpm-workspace.yaml` 的 `catalog:`),子包用 `catalog:` 引用、勿写死版本。

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
