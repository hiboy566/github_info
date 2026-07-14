---
description: 安全规范 —— 认证 / 密钥 / GitHub PAT / 输入校验(github_info)
---

# 安全规范

## GitHub Personal Access Token(本产品最敏感资产)
- PAT 是用户密钥:前端输入框 `type="password"` 掩码;**不写日志、不进 toast / 错误 message、不存 localStorage、不回传给前端**。
- 生产 Token 表单只允许经 CloudFront **HTTPS** 访问;S3 website HTTP 地址仅作源站,不得作为对外产品 URL。
- 只在 Go 服务端(`apps/server/github.go`)用 PAT 调 GitHub API(见 `@rules/backend-api.md`)。
- 若需持久化,遵循团队加密 / 脱敏策略,**绝不明文落库、绝不进 git**;能不存就不存(当前不落库)。
- 出错信息对用户保持模糊("Token 无效或权限不足"),细节留服务端(且日志里也不含 token 本身)。

## 认证
- 当前产品为公开页、**无登录/无鉴权**(MVP 有意取舍,better-auth 已随 Node 后端移除)。已知面:`/api/github-account/fetch` 是无鉴权的 GitHub API 代理/写入端(CWE-284/306),日后硬化方向:限流 / 鉴权门 / 记录归属 user_id。
- 若重新引入认证,方案与密钥管理按团队评审走,别在业务 handler 里自行解析 cookie/token。

## 密钥与环境变量
- 前端变量经 `@github_info/env/web`(t3-env + zod)读取并校验,**禁止裸读 `import.meta.env`**;只暴露 `VITE_` 前缀的非敏感量。
- Go 端环境变量经 `loadDotEnv` 后由 `databaseConfigFromEnv` / `envOr` 读取(`apps/server/main.go`);Lambda 的数据库密码单独放 `PGPASSWORD`,不拼接进 URL;新增机密变量缺失时应 fail fast。
- `.env`(`apps/*/.env`)已 gitignore,**绝不提交**。

## 输入与数据
- 前端外部输入(表单)用 **zod** 校验;Go 端对请求体限长(`http.MaxBytesReader`)、显式校验必填字段,GitHub API 返回做形状校验(id/login/created_at 非空)后再用。
- DB 访问只走 pgx 参数化绑定(`$1…`),禁止字符串拼 SQL。
- CORS 仅允许 env `CORS_ORIGIN` 白名单,新增来源走 env、别用通配。
