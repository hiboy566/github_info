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

1、前端：AWS S3 托管静态页面，对公网访问，代码 push 后自动构建并同步到 S3

2、后端：API Gateway 对外提供接口，AWS Lambda 在 VPC 私有子网运行 Hono 应用

3、数据库：Aurora PostgreSQL 部署在私有子网，仅允许 Lambda 和跳板机内网访问

4、VPC：公有子网放 NAT Gateway 和 SSM 跳板机；私有子网放 Lambda 和数据库，Lambda 通过 NAT 出网

5、CI/CD：

- 后端改动 -> GitHub Actions（OIDC）-> SAM 部署 Lambda
- 前端改动 -> GitHub Actions -> 构建并同步到 S3

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
