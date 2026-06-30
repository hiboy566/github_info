---
description: 安全规范 —— 认证 / 密钥 / GitHub PAT / 输入校验(github_info)
---

# 安全规范

## GitHub Personal Access Token(本产品最敏感资产)
- PAT 是用户密钥:前端输入框 `type="password"` 掩码;**不写日志、不进 toast / 错误 message、不存 localStorage、不回传给前端**。
- 只在服务端 procedure 里用 PAT 调 GitHub API(见 `@rules/backend-api.md`)。
- 若需持久化,遵循团队加密 / 脱敏策略,**绝不明文落库、绝不进 git**;能不存就不存。
- 出错信息对用户保持模糊("Token 无效或权限不足"),细节留服务端(且日志里也不含 token 本身)。

## 认证(better-auth)
- 登录态统一经 `auth.api.getSession()`(`packages/api/context.ts`);受控接口用 `protectedProcedure`,勿在业务里自行解析 cookie。
- cookie 配置 `httpOnly + secure + sameSite:"none"`(见 `packages/auth`);`trustedOrigins` / CORS origin 取 `env.CORS_ORIGIN`。
- `BETTER_AUTH_SECRET` 至少 32 字符(env zod 已强校验);轮换密钥视作机密操作。

## 密钥与环境变量
- 一切密钥经 `@github_info/env/{server,web}`(t3-env + zod)读取并校验,**禁止裸读 `process.env` / `import.meta.env`**。
- `.env`(`apps/*/.env`)已 gitignore,**绝不提交**;web 端只暴露 `VITE_` 前缀的非敏感量。
- 新增机密变量:同时在对应 env schema 加 zod 校验项,缺失即启动失败(fail fast)。

## 输入与数据
- 所有外部输入(tRPC input、表单、GitHub API 返回)先用 **zod** 校验再用。
- DB 访问只走 Drizzle 参数化,禁止字符串拼 SQL。
- CORS 仅允许 `env.CORS_ORIGIN` + `credentials:true`,新增来源走 env、别用通配。
