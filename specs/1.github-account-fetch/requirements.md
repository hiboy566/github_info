# github-account-fetch — 需求规格

## 概述

用户在公开页面输入自己的 GitHub Personal Access Token,系统在**服务端**校验并调用 GitHub API 拉取其账户基础信息并展示。本 feature 只做「拉取 + 展示」,不落库(持久化见 feature 2.github-account-persistence)。

## 项目信息

- 项目名: github_info
- 架构类型: pnpm monorepo(Better-T-Stack:apps/web + apps/server + packages/*)
- specs 路径: specs/1.github-account-fetch/

## 需求版本

| 日期 | 版本 | 说明 |
| ---- | ---- | ---- |
| 2026-06-30 | v1 | 初始需求 |

## 用户故事

- 作为一个开发者,我想输入我的 GitHub Token 并看到自己的账户信息,以便快速确认 Token 是否可用并查看资料。

## 功能需求

1. [F-001] 提供单页表单:GitHub Token 输入框、提交按钮、加载状态、错误提示区、信息展示区(PRD §5.1 / §6)。
2. [F-002] Token 输入框默认隐藏内容(`type="password"`),避免明文暴露(PRD §5.1 / §9)。
3. [F-003] 提交后由**服务端**用该 Token 调 GitHub 用户接口(`GET /user`)拉取账户信息,前端不直连 GitHub(PRD §5.2)。
4. [F-004] 成功后展示字段:GitHub 用户 ID、login、name、avatar_url、email、company、blog、location、bio、public_repos、followers、following、created_at(PRD §5.2)。
5. [F-005] 失败时给出明确提示并区分场景:空 Token、Token 无效/失效、权限不足、GitHub API 失败/限流、网络错误(PRD §5.2 / §8)。
6. [F-006] 交互流程:进入页面 → 输入 → 提交 → 加载 → 成功展示 / 失败提示(PRD §7)。

## 非功能需求

- 安全: Token 不在前端/服务端日志打印,不回传给前端,不写入任何存储(PRD §9;`.claude/rules/security.md`)。
- 性能: 页面对一次拉取的响应尽量控制在 3 秒内(PRD §9)。
- 体验: 错误信息清晰但不暴露敏感细节(PRD §9)。

## 验收标准

- [ ] [AC-001] 输入有效 Token 提交后,页面展示当前 GitHub 账户的基础信息(PRD §11)。
- [ ] [AC-002] 输入无效 Token 提交后,页面展示清晰错误提示,不泄露 Token 或内部细节(PRD §11)。
- [ ] [AC-003] Token 输入框默认掩码;全链路(网络面板/日志)不出现完整 Token 回传或打印(PRD §11 / §9)。
- [ ] [AC-004] 空 Token 提交被前端拦截并提示「请输入 Token」(PRD §8)。

## 依赖

- GitHub REST API(`https://api.github.com/user`)。
- 现有技术栈:tRPC(packages/api)、TanStack Query/Form(apps/web)、shadcn/ui(packages/ui)。

## 开放问题

- 无(认证门槛=公开页面、Token=不落库,已于 2026-06-30 与产品确认,见 PLAN.md)。
