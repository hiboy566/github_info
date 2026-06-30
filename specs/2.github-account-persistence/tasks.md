# github-account-persistence — 任务清单

## 任务版本

| 日期 | 版本 | 说明 |
| ---- | ---- | ---- |
| 2026-06-30 | v1 | 初始任务 |

## 项目信息

- 项目名: github_info
- 架构类型: pnpm monorepo(Better-T-Stack)
- specs 路径: specs/2.github-account-persistence/

## 任务列表

### 功能 1: 数据表与查询(数据库)

- [x] T-001: `github_accounts` Drizzle schema `packages/db/src/schema/github-account.ts`(§5.3 字段,github_id unique,login 索引,timestamps),并入 barrel,`pnpm db:generate` 生成 migration 并审查 diff ~30min
- [x] T-002: upsert 助手 `packages/db/src/queries/github-account.ts`:按 github_id `onConflictDoUpdate`,参数化绑定 ~15min

### 功能 2: 落库链路(API + 前端)

- [x] T-003: 升级 `githubAccount.fetch`:拉取成功后 upsert 落库,保存失败不阻断、返回 `{account, saved}`;token 不入库 / 日志 ~30min
- [x] T-004: 前端接 `saved`:成功显示「已保存」,失败显示「获取成功但保存失败」(sonner),信息卡照常展示 ~15min

### 集成与测试

- [x] T-005: 应用 migration `pnpm db:migrate`;联调:成功写库、同 github_id 二次获取走更新(upsert)、保存失败路径提示正确;确认无 token 列 ~30min

## 依赖关系

- 整个 feature 依赖 feature 1(`2.T-003 依赖 1.T-002`、`2.T-004 依赖 1.T-005`)
- T-002 依赖 T-001
- T-003 依赖 T-002、1.T-002
- T-004 依赖 T-003
- T-005 依赖 T-001 ~ T-004

## 风险点

- Neon HTTP 驱动对 `onConflictDoUpdate` 的支持:用 drizzle-orm pg 标准 API,migrate 前本地验证。
- `DATABASE_URL` 未配置会导致 migrate / 运行失败:确保 `apps/server/.env` 就绪(drizzle.config 从此读取)。
- `github_created_at` 为 GitHub ISO 字符串,入库需转 `Date`。
