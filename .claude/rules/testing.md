---
description: 测试规范 —— Vitest(经 vite-plus-test)(github_info)
---

# 测试规范

## 现状
- 测试框架为 **Vitest**,经 vite-plus 的 `@voidzero-dev/vite-plus-test`(根 `package.json` 的 `overrides` 已把 `vitest` 指向它)。
- 目前**尚无测试用例,也无 `test` 脚本** —— 这是空白区。新增功能时补测试是加分项;先把基础设施落稳再逐步铺开。

## 新增测试
- 用例与被测代码 colocate:`x.ts` 旁放 `x.test.ts`(组件 `x.test.tsx`)。
- 给需要测的包加脚本:`"test": "vitest"`(CI 用 `vitest run` 跑一次);根级可 `vp run -r test` 汇总。
- 断言用 Vitest(`describe` / `it` / `expect`);异步与定时器用 Vitest fake timers。

## 优先测什么
- `packages/api` tRPC procedure:鉴权分支(`protectedProcedure` 无 session 应 `UNAUTHORIZED`)、zod 输入校验、GitHub API 适配层(mock `fetch` 或用 `msw`,workspace 已 `allowBuilds: msw`)。
- `packages/db` 查询与 schema 约束(对测试库或 mock)。
- `apps/web` 关键组件 / 表单交互;E2E(如需)走 Playwright(未内置,按需引入)。
- **不要**把真实 GitHub PAT 或密钥写进测试 / 快照,用假值。
