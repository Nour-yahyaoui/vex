-- Vex OS — Neon/Postgres schema
-- Paste this whole file into the Neon SQL editor (or `psql $DATABASE_URL -f db/schema.sql`)
-- and run it once. This is the standard Auth.js schema — it's ALL Vex needs
-- for Google/GitHub sign-in and "user tracking": every OAuth login creates or
-- refreshes a row in "user", which is your list of everyone who has opened Vex.
-- No Prisma, no ORM migration files — just plain SQL.

create extension if not exists pgcrypto;

create table if not exists "user" (
  "id"            text primary key default gen_random_uuid()::text,
  "name"          text,
  "email"         text unique,
  "emailVerified" timestamp,
  "image"         text,
  "createdAt"     timestamp default now()
);

create table if not exists "account" (
  "userId"             text not null references "user"("id") on delete cascade,
  "type"               text not null,
  "provider"           text not null,
  "providerAccountId"  text not null,
  "refresh_token"      text,
  "access_token"       text,
  "expires_at"         integer,
  "token_type"         text,
  "scope"              text,
  "id_token"           text,
  "session_state"      text,
  primary key ("provider", "providerAccountId")
);

create table if not exists "session" (
  "sessionToken" text primary key,
  "userId"       text not null references "user"("id") on delete cascade,
  "expires"      timestamp not null
);

create table if not exists "verificationToken" (
  "identifier" text not null,
  "token"      text not null,
  "expires"    timestamp not null,
  primary key ("identifier", "token")
);

create index if not exists account_user_id_idx on "account" ("userId");
create index if not exists session_user_id_idx on "session" ("userId");

-- Sanity check — run this after the above to confirm the tables exist:
-- select table_name from information_schema.tables where table_schema = 'public';
