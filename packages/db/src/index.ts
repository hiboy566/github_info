import { env } from "@github_info/env/server";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

export function createDb() {
  const sql = postgres(env.DATABASE_URL, {
    prepare: false,
  });
  return drizzle(sql, { schema });
}

export const db = createDb();
