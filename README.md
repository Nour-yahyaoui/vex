# Vex OS

A fully simulated Linux desktop that runs in the browser — a real-feeling shell, a code editor
called VexBit, an AI assistant, and (optionally) real code execution via Vercel Sandbox. Sign-in
is Google/GitHub only — no password forms anywhere.

## Stack

- **Next.js 14** (App Router) + TypeScript + Tailwind
- **Auth.js v5** — Google + GitHub OAuth only, sessions stored in Postgres
- **Neon** (serverless Postgres) — the entire "user tracking" story: every OAuth sign-in
  creates/refreshes a row in the `user` table
- **Drizzle ORM** — typed queries against the schema below, but you don't need Drizzle's
  migration tooling: `db/schema.sql` is a plain SQL file you paste into Neon directly
- **Upstash Redis** — caches repeated AI answers and rate-limits the AI + Sandbox routes
- **Groq** (via the Vercel AI SDK) — powers the in-editor AI assistant, streamed token by token
- **Vercel Sandbox** — optional real Python/JS execution from VexBit (isolated microVMs)
- **Zustand** — window manager + local filesystem state (still localStorage-backed, as before)
