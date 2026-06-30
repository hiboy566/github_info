# schema-field-evolution — 需求规格

## 概述

演示通过 Drizzle 对 `github_accounts` 表做字段**新增**(`twitter_username`)与**删除**(`blog`)的完整工作流:改 schema → 生成 migration → 应用 → 同步接口与页面。验证 PRD「字段可增删、数据模型可快速迭代」的能力。

## 项目信息

- 项目名: github_info
- 架构类型: pnpm monorepo(Better-T-Stack)
- specs 路径: specs/3.schema-field-evolution/

## 需求版本

| 日期 | 版本 | 说明 |
| ---- | ---- | ---- |
| 2026-06-30 | v1 | 初始需求 |

## 用户故事

- 作为开发者,我希望用 Drizzle 快速增删 `github_accounts` 字段并同步到接口与页面,以便数据模型随产品迭代(PRD §5.4 / §5.5)。

## 功能需求

1. [F-001] 新增字段 `twitter_username`:schema 加字段 → 生成并应用 migration → 适配层映射 GitHub 返回的 `twitter_username` → 接口返回 → 页面展示(PRD §5.4)。
2. [F-002] 删除字段 `blog`:schema 移除 → 生成并应用 migration → 移除适配层映射、接口返回与页面引用(PRD §5.5)。
3. [F-003] 增删均通过 migration 完成,不手动改库;原有字段与数据不受影响(PRD §5.4 / §5.5 / §9)。

## 非功能需求

- 数据安全: 字段删除为破坏性变更,需先确认数据影响再应用(`.claude/rules/database.md`)。
- 可回溯: migration 文件入 git,体现 schema 演进。

## 验收标准

- [ ] [AC-001] 新增:数据库出现 `twitter_username` 列,可写入,页面可展示,原有字段 / 数据不受影响(PRD §5.4)。
- [ ] [AC-002] 删除:数据库 `blog` 列被删除,接口不再返回,页面不再展示,系统不报错(PRD §5.5)。
- [ ] [AC-003] 两次变更均由 `db:generate` 产出的 migration 应用,migration 文件已提交(PRD §9)。

## 依赖

- feature 2.github-account-persistence(`github_accounts` 表与写库链路;`3.T-001 依赖 2.T-001`)。
- feature 1 的适配层与信息卡(映射 / 展示;`3.T-001 依赖 1.T-006`)。

## 开放问题

- 无。
