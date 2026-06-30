---
description: Git 工作流 —— Husky / lint-staged / Biome 闸门(github_info)
---

# Git 工作流

## 提交前闸门(已自动化)
- Husky `pre-commit` 跑 **lint-staged**(`.husky/pre-commit`);lint-staged 对暂存的 `*.{js,ts,cjs,mjs,jsx,tsx,json,jsonc}` 跑 `biome check --write .`。
- 首次 clone 后 `pnpm install` 会经 `prepare: husky` 装好钩子;钩子没生效就手动 `pnpm run prepare`。
- 提交前本地自查:`pnpm check`(格式 + lint 一键修)、`pnpm check-types`(全 workspace 类型)。

## 不要提交
- `.env` / `apps/*/.env`(密钥,已 gitignore)、`node_modules`、`dist` / `build`、`*.tsbuildinfo`。
- 生成物 `apps/web/src/routeTree.gen.ts`(已 ignore)。
- 注:`packages/db/src/migrations/*` **要**提交(是 schema 演进历史),但勿手改已生成的 migration。

## 约定
- 小步提交,信息写清"做了什么、为什么";一次提交聚焦一件事。
- 改了 DB schema → 连同 `db:generate` 产出的 migration 一起提交。
- 改了依赖 → 一并提交 `pnpm-lock.yaml`。
