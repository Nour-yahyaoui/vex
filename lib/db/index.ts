import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Falls back to a syntactically valid but unreachable connection string when
// DATABASE_URL isn't set yet, so `next build` (which imports this module
// through the auth config) never crashes just because env vars aren't
// configured in this environment. Any actual query will fail loudly at
// request time instead, which is what you want in production.
const connectionString =
  process.env.DATABASE_URL || "postgresql://unconfigured:unconfigured@localhost/unconfigured";

const sql = neon(connectionString);
export const db = drizzle(sql, { schema });
export const isDbConfigured = Boolean(process.env.DATABASE_URL);
