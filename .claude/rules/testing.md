---
description: 测试规范 —— Vitest(经 vite-plus-test)(github_info)
---

# 测试规范

## 现状
- **Go 后端**:标准库 `testing`,`cd apps/server && go test ./...`;`profiles_test.go` 覆盖真实本地 PG 往返与建库,`github_test.go` / `handlers_test.go` 覆盖外部响应分类和输入边界;PG 不可达时仅数据库用例跳过。
- **前端**:Vitest(经 vite-plus 的 `@voidzero-dev/vite-plus-test`,根 `overrides` 已重映射),目前尚无用例/脚本 —— 空白区,新增功能时补测试是加分项。

## 新增测试
- Go:`x.go` 旁放 `x_test.go`(同 package);连库测试沿用 store_test.go 的模式 —— 假 github_id、defer 清理、不可达即 skip。
- 前端:用例与被测代码 colocate(`x.test.ts` / `x.test.tsx`);给包加 `"test": "vitest"`(CI 用 `vitest run`);测试文件 import vitest 时该包 devDependencies 必须自己声明 `vitest`(见 AGENTS.md 2026-06-30 的坑)。

## 优先测什么
- `apps/server`:GitHub 错误分类(401/403/限流/超时,mock 一个 `httptest.Server`)、store 查询与 upsert 约束、handler 的错误码映射。
- `apps/web`:`lib/api.ts` 错误映射、关键组件 / 表单交互;E2E(如需)走 Playwright(未内置,按需引入)。
- **不要**把真实 GitHub PAT 或密钥写进测试 / 快照,用假值。
