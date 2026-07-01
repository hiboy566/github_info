# github_info

## 这个项目的功能简述

这是一个用于获取并保存 GitHub 个人账户信息的全栈项目。用户在前端输入自己的 GitHub Personal Access Token 后，系统会调用 GitHub API 获取个人资料，并通过后端接口把账号信息保存到 PostgreSQL 数据库中。

项目主要包含：

- 前端：React + TanStack Router + Vite
- 后端：Hono + tRPC，运行在 AWS Lambda
- 数据库：PostgreSQL，使用 Drizzle ORM 管理数据访问
- 部署：AWS SAM 管理后端、VPC、数据库和网络资源；GitHub Actions 自动部署

## 架构是什么

项目采用前后端分离架构：

- 浏览器访问前端静态页面
- 前端调用 AWS API Gateway 暴露的后端接口
- API Gateway 转发请求到 AWS Lambda
- Lambda 在 VPC 私有子网内访问数据库
- 数据库不对公网开放，只允许 VPC 内受控访问

## 部署架构

1、前端：AWS S3 静态网站托管，对公网提供访问；push 前端代码时由 GitHub Actions 自动构建并同步部署到 S3

2、后端：AWS Lambda 运行 Hono 应用，AWS API Gateway 对外暴露接口；Lambda 部署在 VPC 私有子网，不直接暴露公网；Lambda 执行角色（IAM Role）由 SAM 自动创建，授予 VPC 网络访问权限

3、数据库：Aurora PostgreSQL，部署在 VPC 私有子网；通过安全组限制，仅允许来自 Lambda 安全组和跳板机安全组的连接，不对外开放

4、VPC：公有子网部署 NAT Gateway、跳板机（用于本地通过 SSM 隧道连接数据库做数据库迁移）；私有子网部署 Lambda、数据库，两者通过 VPC 内网通信；Lambda 通过 NAT Gateway 访问外网，例如调用 GitHub API

5、CI/CD：

- 后端改动 -> GitHub Actions 自动构建（OIDC + IAM Role 认证）-> SAM 部署 Lambda
- 前端改动 -> GitHub Actions 自动构建 -> 部署到 AWS S3 静态网站

## 当前线上访问地址

- 前端页面：http://github-info-web-956959393973-ap-southeast-2.s3-website-ap-southeast-2.amazonaws.com
- 后端 API：https://xl59ygu7th.execute-api.ap-southeast-2.amazonaws.com/

## 本地开发

安装依赖：

```bash
pnpm install
```

启动本地开发环境：

```bash
pnpm run dev
```

本地访问：

- 前端：http://localhost:5173
- 后端：http://localhost:3000

## 常用命令

```bash
pnpm run build
pnpm run check-types
pnpm run db:push
pnpm run db:generate
pnpm run db:migrate
```

## 项目结构

```text
github_info/
├── apps/
│   ├── web/         # 前端应用
│   └── server/      # 后端 API
├── packages/
│   ├── ui/          # 共享 UI 组件
│   ├── api/         # API / 业务逻辑
│   ├── auth/        # 认证配置
│   └── db/          # 数据库 schema 和查询
├── template.yaml    # AWS SAM 基础设施和后端部署配置
├── samconfig.toml   # SAM 部署参数
└── .github/
    └── workflows/
        └── deploy.yml # GitHub Actions 自动部署配置
```
