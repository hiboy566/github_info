---
description: apps/server/store.go 数据库规范 —— Go pgx + 本地 PostgreSQL(github_info)
---

# 数据库规范(apps/server/profiles.go,Go + pgx)

## 唯一数据库 personal_info(默认 postgres 库已删除)
- **`personal_info`**(env `DATABASE_URL`)→ 表 `personal_profiles`,代码在 `profiles.go`(`ProfileStore`)。本机默认 `postgres` 库与早期 `github_info` 库已删,**不要假设它们存在**(psql 连接用 `-d personal_info`;GUI 工具初始数据库也填它)。
- 启动经 `ConnectProfileStore`:直连目标库;若报 SQLSTATE 3D000(库不存在)→ 连系统模板库 `template1` → `ensureDatabase` 自动 `CREATE DATABASE`(库名过白名单正则,防注入)→ 重连。本地与云上 Fargate/Aurora 同一套逻辑,**无需手工建库**。

## 客户端与连接
- `pgx/v5` 的 `pgxpool` 连接池,经 `ConnectProfileStore`(Ping + 确保 schema)建实例。勿在别处另建连接。
- 本地 PostgreSQL 用 Homebrew(postgresql@17,未设开机自启:`brew services run postgresql@17`)。

## Schema 约定
- schema 集中在 `profiles.go` 的 `profileSchemaSQL`,启动时 `CREATE TABLE IF NOT EXISTS` + `CREATE INDEX IF NOT EXISTS` 幂等执行 —— **无 ORM、无迁移工具**。
- 列名 snake_case;主键 `id text`(`gen_random_uuid()::text`);`login text UNIQUE`(介绍页以用户名寻址);`github_id text` 通过唯一索引作为 upsert 键(GitHub 数字 id 存字符串,Go 侧 `strconv` 转换);`created_at`/`updated_at` 默认 `now()`,更新时间由 upsert 的 `updated_at = now()` 维护。
- **加/删字段**:`CREATE TABLE IF NOT EXISTS` 对已存在的表不生效,需手写一次性 `ALTER TABLE`(psql 执行)并同步改 `profileSchemaSQL`;同时波及 `githubUser`/`GithubAccount`/upsert/select/scan/前端类型,改前先 `grep -rn <field>`。
- 破坏性变更(删列/改类型)前先确认行数与数据影响。

## 查询
- 一律参数化(`$1, $2…`),**禁止拼 SQL 字符串**(防注入);SQL 常量集中在 `profiles.go`(`profileUpsertSQL`/`profileSelectSQL`)。
- upsert 冲突键按不可变的 `github_id`,用户名变更时更新原记录;按 login 查询一律大小写不敏感(`lower(login) = lower($1)`)并使用表达式索引。
- 可空列 scan 到指针(`*string`/`*time.Time`);找不到行返回哨兵错误 `ErrAccountNotFound`(`errors.Is` 判断),不要把 `pgx.ErrNoRows` 泄漏到 handler。

## 测试
- `profiles_test.go` 对真实本地库做往返测试(插入→查询→upsert 更新→清理)+ 自动建库引导测试(一次性 `personal_info_bootstrap_test` 库,用完 `DROP ... WITH (FORCE)`),PG 不可达时 `t.Skipf` 跳过;测试数据用明显的假值并在 defer 里清理。
