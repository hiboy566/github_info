---
description: packages/db 数据库规范 —— Drizzle ORM + Neon Postgres(github_info)
---

# 数据库规范(packages/db)

## 客户端与驱动
- Drizzle + **Neon serverless HTTP**(`drizzle-orm/neon-http` + `@neondatabase/serverless`);经 `createDb()` 建实例,连接串取 `env.DATABASE_URL`(见 `src/index.ts`)。勿在别处另建连接。
- schema 经 `src/schema/index.ts` 桶导出;新表建 `src/schema/<name>.ts` 后 `export * from "./<name>"` 并入 barrel。

## Schema 约定(参照 `src/schema/auth.ts`)
- `pgTable("snake_case_name", { ... })`:DB 列名 snake_case,TS 字段 camelCase。
- 主键 `text("id").primaryKey()`(与 better-auth 风格一致)。
- 时间戳 `timestamp("created_at").defaultNow().notNull()`;更新列加 `.$onUpdate(() => new Date())`。
- 外键 `.references(() => other.id, { onDelete: "cascade" })`,并对外键列建 `index("<t>_<col>_idx").on(table.col)`。
- 关系用 `relations(...)` 显式声明(`one` / `many`)。
- **本产品**:存 GitHub 账户信息的表按 `docs/github-token-prd.md` 设计;PRD 要求字段可增删 → 走 migration 流程(见下),不要手改库结构。

## 迁移与命令(项目根跑,经 `--filter @github_info/db`)
- 改 schema 后:`pnpm db:generate`(生成 SQL 到 `src/migrations`)→ **审查 diff** → `pnpm db:migrate`(应用)。
- 本地快速同步可 `pnpm db:push`;可视化 `pnpm db:studio`。
- `drizzle.config.ts`:从 `apps/server/.env` 读 `DATABASE_URL`,dialect `postgresql`,migrations 输出 `./src/migrations`(提交进 git,但**勿手改**已生成的 migration)。
- **破坏性变更**(删列 / 改类型)先确认数据影响,别盲目对有数据的库 push。

## 查询
- 一律用 Drizzle query builder 或 `sql` 模板的参数化绑定,**禁止手拼 SQL 字符串**(防注入,见 `@rules/security.md`)。
