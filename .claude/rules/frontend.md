---
description: apps/web 前端规范 —— React 19 / TanStack Router / Query / tRPC / shadcn(github_info)
---

# 前端规范(apps/web)

## 路由(TanStack Router,文件路由)
- 路由文件在 `src/routes/**`;`src/routeTree.gen.ts` **自动生成,勿手改**(router 插件产出,已 gitignore)。
- 受保护页面放 `_auth/` 布局下:`beforeLoad` 里 `await authClient.getSession()`,无 session 则 `throw redirect({ to: "/login" })`(见 `routes/_auth/route.tsx`)。
- 根路由用 `createRootRouteWithContext<RouterAppContext>()`,context 注入 `{ trpc, queryClient }`(见 `main.tsx`)。

## 数据(TanStack Query + tRPC)
- 用 `src/utils/trpc.ts` 导出的 `trpc`(`createTRPCOptionsProxy`)与 `queryClient`,**不要**手写 `fetch` 调后端。
- 调用形如 `useQuery(trpc.privateData.queryOptions())` / `useMutation(trpc.x.mutationOptions())`;client 已 `credentials:"include"`(自动带 cookie)。
- 全局错误已在 `QueryCache.onError` 弹 `sonner` toast 并给 retry,无需每处重复 try/catch;特殊场景再单独处理。

## UI / 样式
- 共享原子组件来自 **`@github_info/ui/components/*`**(shadcn,style `base-lyra`,baseColor neutral,基于 `@base-ui/react`);新增共享原语:`npx shadcn@latest add <c> -c packages/ui`,app 专属块则在 `apps/web` 内跑 shadcn。
- 合并 class 用 `cn()`(`@github_info/ui/lib/utils`,clsx + tailwind-merge);Tailwind v4(`@tailwindcss/vite`),全局样式在 `packages/ui/src/styles/globals.css`。
- 主题用 `next-themes`(默认 `dark`,storageKey `vite-ui-theme`);toast 用 `sonner`(根已挂 `<Toaster richColors />`);图标 `lucide-react`。
- 视觉遵循 `ui/DESIGN.md`(Clinical Precision:Navy/Sage、Plus Jakarta Sans + DM Sans、8px 栅格、800px 容器、Token 输入卡片用 raised surface)。

## 表单与敏感输入
- 表单用 `@tanstack/react-form` + `@hookform/resolvers` + zod。
- **GitHub Token 输入框必须 `type="password"` 掩码**:不回显、不写日志、不放 localStorage(详见 `@rules/security.md`)。

## 环境变量
- 只经 `@github_info/env/web` 读取(`VITE_` 前缀,zod 校验),**勿直接读 `import.meta.env`**。
