---
description: TypeScript / Biome / monorepo 编码规范(github_info)
---

# 编码规范

## 语言与模块
- 全量 **TypeScript strict**(`packages/config/tsconfig.base.json`):`noUncheckedIndexedAccess`、`noUnusedLocals`、`noUnusedParameters`、`isolatedModules`、`forceConsistentCasingInFileNames` 均开。索引/数组访问后必须判空(`arr[0]` 是 `T | undefined`)。
- **ESM only**(`"type":"module"`)。`verbatimModuleSyntax: true` → 仅用于类型的导入**必须**写 `import type { X }`,值与类型混用时分开导入,否则编译/lint 报错。
- `moduleResolution: bundler`;路径别名见 CLAUDE.md「跨包导入约定」。

## Biome(权威,根 `biome.json`)
- **缩进 = Tab**;**字符串 = 双引号**;`organizeImports` 开(import 自动排序,勿手动调序)。
- 以下规则为 **error**,提交前必过:
  - `noParameterAssign`(勿重新赋值形参)、`useAsConstAssertion`、`useDefaultParameterLast`、`useEnumInitializers`、`useSelfClosingElements`、`useSingleVarDeclarator`(一条语句一个声明)、`noUnusedTemplateLiteral`、`useNumberNamespace`(用 `Number.parseInt` 等而非全局函数)、`noInferrableTypes`(别给字面量初始化加冗余注解)、`noUselessElse`。
- JSX `className` 用 `clsx` / `cva` / `cn` 包裹时会被 `useSortedClasses` 自动排序——统一用这三个函数,别手写长 class 串。
- 一键修复:`pnpm check`(= `biome check --write .`);提交时 lint-staged 自动跑(见 `@rules/git-workflow.md`)。

## 命名与约定
- 文件名 kebab-case(`sign-in-form.tsx`、`auth-client.ts`);React 组件以 PascalCase 导出。
- 列名 snake_case / TS 字段 camelCase(DB,见 `@rules/database.md`)。
- 校验与类型推断统一用 **zod**(catalog 已固定版本)。
- 升级公共依赖只改 `pnpm-workspace.yaml` 的 `catalog:`,子包写 `"dep": "catalog:"`。
- 勿手改生成物:`routeTree.gen.ts`、`db/src/migrations/*`。
