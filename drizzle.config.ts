import { defineConfig } from "drizzle-kit";

// Not required for setup — db/schema.sql is the source of truth you paste
// into Neon directly. This file only exists so `npx drizzle-kit studio` (a
// nice GUI for browsing your Neon tables) works if you ever want it, and so
// lib/db/schema.ts stays the TypeScript mirror of db/schema.sql.
export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://unconfigured:unconfigured@localhost/unconfigured",
  },
});
