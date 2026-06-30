# schema-field-evolution — 任务清单

## 任务版本

| 日期 | 版本 | 说明 |
| ---- | ---- | ---- |
| 2026-06-30 | v1 | 初始任务 |

## 项目信息

- 项目名: github_info
- 架构类型: pnpm monorepo(Better-T-Stack)
- specs 路径: specs/3.schema-field-evolution/

## 任务列表

### 功能 1: 字段新增演示(twitter_username)

- [ ] T-001: 三层加 `twitter_username`:schema 加列 → `pnpm db:generate` → `pnpm db:migrate`;适配层 zod + 映射、procedure 返回、account-card 展示 ~30min
- [ ] T-002: 新增验证:写入 twitter_username、页面展示、原有字段与数据不受影响(§5.4 AC) ~15min

### 功能 2: 字段删除演示(blog)

- [ ] T-003: 三层删 `blog`:schema 移除 → `pnpm db:generate`(DROP COLUMN)→ 确认数据影响 → `pnpm db:migrate`;移除适配层映射、procedure 返回、account-card 引用 ~30min
- [ ] T-004: 删除验证:DB 无 blog 列、接口不返回、页面不展示、系统不报错(§5.5 AC) ~15min

## 依赖关系

- 整个 feature 依赖 feature 2(`3.T-001 依赖 2.T-001`、`2.T-003`)与 feature 1 展示卡(`3.T-001 依赖 1.T-006`)
- T-002 依赖 T-001
- T-003 依赖 T-001(在同一 schema 上演进)
- T-004 依赖 T-003

## 风险点

- 破坏性删列:对已有数据不可逆,应用前备份 / 确认。
- Neon HTTP 驱动迁移:`drop column` 在 Neon 上正常,但需确保 migrate 连到正确库。
- 适配层 / 前端引用遗漏会导致类型错误:删 blog 后全量 `pnpm check-types` 兜底。
