# github-account-persistence — 技术设计

## 设计版本

| 日期 | 版本 | 说明 |
| ---- | ---- | ---- |
| 2026-06-30 | v1 | 初始设计 |

## 项目架构

- 架构类型: pnpm monorepo(Better-T-Stack)
- 涉及层: 数据库(packages/db)、API(packages/api)、前端(apps/web,仅保存结果提示)。
- 遵循 `.claude/rules/database.md`(Drizzle schema / migration)、`security.md`(不存 token / 参数化)。

## 功能模块设计

### 模块 1: 数据表 github_accounts(数据库)

- 位置: `packages/db/src/schema/github-account.ts`(新增),`export * from "./github-account"` 并入 `schema/index.ts`。
- 约定(对齐 `schema/auth.ts`):列名 snake_case、TS 字段 camelCase。
- 字段:
  - `id` `text("id").primaryKey()`(应用生成,如 `crypto.randomUUID()`)
  - `githubId` `text("github_id").notNull().unique()`(GitHub 数字 id 存为 text,便于 upsert 与未来兼容)
  - `login text notNull`、`name text`、`avatarUrl text("avatar_url")`、`email text`、`company text`、`blog text`、`location text`、`bio text`
  - `publicRepos integer("public_repos").notNull().default(0)`、`followers integer notNull default 0`、`following integer notNull default 0`
  - `githubCreatedAt timestamp("github_created_at")`
  - `createdAt timestamp("created_at").defaultNow().notNull()`、`updatedAt timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull()`
  - 索引: `index("github_accounts_login_idx").on(login)`

### 模块 2: upsert 助手(数据库)

- 位置: `packages/db/src/queries/github-account.ts`(新增)。
- `upsertGithubAccount(db, account)`:`db.insert(githubAccounts).values({...}).onConflictDoUpdate({ target: githubAccounts.githubId, set: { ...更新字段, updatedAt: new Date() } })`。
- 参数化绑定,禁手拼 SQL。

### 模块 3: procedure 落库(API)

- 升级 feature 1 的 `githubAccount.fetch` 为「拉取 + 落库」:
  - 适配层成功后 `try { await upsertGithubAccount(db, account) } catch (e) { /* 不抛,标 saved=false,日志不含 token */ }`。
  - 返回 `{ account, saved: boolean }`。
- DB 实例: `db`(`@github_info/db`)。

### 模块 4: 前端保存结果提示(前端)

- `token-form` / `fetch-status` 接 `saved` 字段:`saved=true` 显示「已保存」轻提示;`saved=false` 显示「账户信息获取成功,但保存失败」(sonner warning),信息卡照常展示。

## 接口契约

```ts
// githubAccount.fetch(升级后)
input:  { token: string }
output: { account: GithubAccount; saved: boolean }
```

## 数据模型

见模块 1(表 `github_accounts`)。注意:**无 token 列**。

## 安全考虑

- Token 不进入任何 insert / update 语句与日志。
- 仅 Drizzle 参数化访问;`DATABASE_URL` 经 `@github_info/env/server`。
- 保存失败不向前端泄露内部错误细节(仅「保存失败」)。

## 技术决策

| 决策 | 选项 | 理由 |
| ---- | ---- | ---- |
| upsert 键 | github_id 唯一 | 同一账户重复获取应更新而非重复插入(PRD §5.3) |
| github_id 类型 | text | 存数字 id 为 text,upsert / 兼容更稳,避免 bigint 边界 |
| 保存失败处理 | 不阻断展示,返回 saved=false | 贴合 PRD §8「获取成功但保存失败」 |
| 主键 id | 应用生成 text | 对齐 auth 表 text PK 风格 |
