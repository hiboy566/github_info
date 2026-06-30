# github-account-persistence — 需求规格

## 概述

将 feature 1 拉取到的 GitHub 账户信息持久化到数据库表 `github_accounts`(Drizzle ORM / Neon Postgres);同一 GitHub 账户重复获取时更新(upsert)。Token 仍不落库。

## 项目信息

- 项目名: github_info
- 架构类型: pnpm monorepo(Better-T-Stack)
- specs 路径: specs/2.github-account-persistence/

## 需求版本

| 日期 | 版本 | 说明 |
| ---- | ---- | ---- |
| 2026-06-30 | v1 | 初始需求 |

## 用户故事

- 作为产品,我希望成功获取的 GitHub 账户信息被结构化保存,以便后续查询与管理(PRD §5.3)。

## 功能需求

1. [F-001] 新建数据表 `github_accounts`,字段含 id、github_id、login、name、avatar_url、email、company、blog、location、bio、public_repos、followers、following、github_created_at、created_at、updated_at(PRD §5.3)。
2. [F-002] 拉取成功后将账户信息写入 `github_accounts`;同一 `github_id` 已存在则更新(upsert)(PRD §5.3 / §7)。
3. [F-003] Token **不**写入数据库(PRD §5.3 / §9)。
4. [F-004] 保存失败时,页面提示「账户信息获取成功,但保存失败」,不影响信息展示(PRD §8)。
5. [F-005] 数据库结构变更通过 migration 管理,不手动改库(PRD §9)。

## 非功能需求

- 安全: 不存 Token;DB 访问走 Drizzle 参数化(`.claude/rules/database.md` / `security.md`)。
- 可维护: schema 变更经 `db:generate` → `db:migrate`,migration 入 git。

## 验收标准

- [ ] [AC-001] 成功获取的信息写入 `github_accounts`,字段值正确(PRD §11)。
- [ ] [AC-002] 同一 GitHub 账户二次获取后,记录被更新而非重复插入(PRD §5.3)。
- [ ] [AC-003] 数据库中不存在任何 Token 列 / 值(PRD §11)。
- [ ] [AC-004] 模拟保存失败时,页面提示「获取成功但保存失败」,信息仍展示(PRD §8)。

## 依赖

- feature 1.github-account-fetch(拉取链路与 `GithubAccount` 类型;`2.T-003 依赖 1.T-002`)。
- `packages/db`(Drizzle + Neon)、`env.DATABASE_URL`。

## 开放问题

- 无(Token 不落库已确认;upsert 键 = github_id 为本设计决策)。
