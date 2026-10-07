# Dispatch Lite

Dispatcher operations app for a luxury car service. See `docs/brief.md` for scope and `CLAUDE.md` for how the code is organised.

## Setup

Requirements: Node 22.19 or later, pnpm 10, Postgres 16 with the `btree_gist` and `pg_trgm` extensions (both ship with standard Postgres).

```
pnpm i
cp .env.example .env
pnpm db:reset
pnpm dev
```

`.env` needs `BETTER_AUTH_SECRET` set to a random value (`openssl rand -base64 32`). `pnpm db:reset` recreates the local database, applies migrations and seeds it. It refuses to run against anything other than localhost.

Open http://localhost:3000/health to see the paved path example: one read, one write, one form and one confirm.

## Checks

```
pnpm lint && pnpm typecheck && pnpm test && pnpm e2e
```

Integration tests use a separate `dispatch_test` database and e2e tests use `dispatch_e2e`. Both are recreated on every run.
