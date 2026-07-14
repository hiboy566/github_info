---
description: apps/web 前端规范 —— React 19 / TanStack Router / Query / REST / shadcn(github_info)
---

# 前端规范(apps/web)

## 路由(TanStack Router,文件路由)
- 路由文件在 `src/routes/**`;`src/routeTree.gen.ts` **自动生成,勿手改**(router 插件产出,已 gitignore)。当前路由:`/`(Token 获取)与 `/intro/$login`(个人介绍页),均为公开页。
- 根路由用 `createRootRouteWithContext<RouterAppContext>()`,context 注入 `{ queryClient }`(见 `main.tsx`,queryClient 来自 `src/lib/query-client.ts`)。

## 数据(TanStack Query + REST)
- 一律经 `src/lib/api.ts` 调后端:`GithubAccount` 类型、`fetchGithubAccount`/`getGithubAccount`、`ApiError`、`getErrorMessage`(code → 中文文案)。**不要**在组件里手写 `fetch`,新接口先在 api.ts 加封装。
- 调用形如 `useMutation({ mutationFn: fetchGithubAccount })` / `useQuery({ queryKey, queryFn })`;错误按 `ApiError.code` 分支,别解析 message 字符串。
- 全局错误已在 `QueryCache.onError` 弹 `sonner` toast 并给 retry,无需每处重复 try/catch;特殊场景(如 intro 页内联错误卡片)再单独处理。

## UI / 样式
- 共享原子组件来自 **`@github_info/ui/components/*`**(shadcn,style `base-lyra`,baseColor neutral,基于 `@base-ui/react`);新增共享原语:`npx shadcn@latest add <c> -c packages/ui`,app 专属块则在 `apps/web` 内跑 shadcn。
- 合并 class 用 `cn()`(`@github_info/ui/lib/utils`,clsx + tailwind-merge);Tailwind v4(`@tailwindcss/vite`),全局样式在 `packages/ui/src/styles/globals.css`。
- 主题用 `next-themes`(默认 `dark`,storageKey `vite-ui-theme`);toast 用 `sonner`(根已挂 `<Toaster richColors />`);图标 `lucide-react`。
- 视觉遵循 `ui/DESIGN.md`(Clinical Precision:Navy/Sage、Plus Jakarta Sans + DM Sans、8px 栅格、800px 容器、Token 输入卡片用 raised surface)。

## 表单与敏感输入
- 表单用 `@tanstack/react-form` + zod。
- **GitHub Token 输入框必须 `type="password"` 掩码**:不回显、不写日志、不放 localStorage(详见 `@rules/security.md`)。

## 环境变量
- 只经 `@github_info/env/web` 读取(`VITE_` 前缀,zod 校验),**勿直接读 `import.meta.env`**。
