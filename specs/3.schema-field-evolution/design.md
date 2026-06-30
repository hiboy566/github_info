# schema-field-evolution — 技术设计

## 设计版本

| 日期 | 版本 | 说明 |
| ---- | ---- | ---- |
| 2026-06-30 | v1 | 初始设计 |

## 项目架构

- 架构类型: pnpm monorepo(Better-T-Stack)
- 涉及层: 数据库(packages/db schema + migration)、API(packages/api 适配层 + 返回)、前端(apps/web 信息卡)。
- 遵循 `.claude/rules/database.md`(migration 流程、破坏性变更谨慎)。

## 功能模块设计

### 模块 1: 字段新增 twitter_username(贯穿三层)

- DB: `schema/github-account.ts` 加 `twitterUsername text("twitter_username")`(可空);`pnpm db:generate` → 审查 → `pnpm db:migrate`。
- API: 适配层 `githubUserSchema` 加 `twitter_username`(GitHub `/user` 返回该字段,可空);映射进 `GithubAccount.twitterUsername`;upsert set 增加该列。
- 前端: `account-card.tsx` 增加一行展示 `twitter_username`(有值才显示)。

### 模块 2: 字段删除 blog(贯穿三层)

- DB: `schema/github-account.ts` 移除 `blog`;`pnpm db:generate` 产出 `DROP COLUMN` migration → 确认数据影响 → `pnpm db:migrate`。
- API: 适配层移除 `blog` 映射;`GithubAccount` 去掉 `blog`;upsert 不再写 blog。
- 前端: `account-card.tsx` 移除 blog 展示。

## 接口契约

```ts
// GithubAccount 变化:+ twitterUsername: string | null;  - blog
output: { account: GithubAccount; saved: boolean }
```

## 数据模型

`github_accounts` 终态:在 feature 2 基础上 **+ twitter_username**、**- blog**。

## 安全考虑

- 删除 `blog` 为破坏性变更:应用前在 studio / 备份确认无依赖数据丢失风险。
- 仍不涉及 token;Drizzle 参数化。

## 技术决策

| 决策 | 选项 | 理由 |
| ---- | ---- | ---- |
| 增删方式 | db:generate + migrate(非 push) | 可审查、可回溯,符合 PRD §9「通过 migration 管理」 |
| twitter_username 可空 | nullable | GitHub 资料该字段常缺省 |
| 演示顺序 | 先增后删,各自独立 migration | 清晰体现两类变更,互不耦合 |
