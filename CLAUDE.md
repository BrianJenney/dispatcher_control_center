# Dispatch Lite

Dispatcher operations app for a luxury car service. Built for a scored dev test. The README is the source of truth for scope and what was built.

## How we work here

This repo follows one idea: agents are trusted because the environment makes the right thing the easy thing. In order of preference:

1. Make the mistake impossible (schema constraint, type, single entry point)
2. Catch it with static analysis (lint rule, type check, CI)
3. Guide with rules and skills (this file, `.claude/skills`)
4. Human review, last and least

If you are corrected twice for the same thing, do not just fix it. Move the fix up this list.

The codebase is memory. Agents copy what exists. Never leave a workaround, a TODO, or a second way to do something.

## Locked decisions

| Area | Choice |
|---|---|
| Framework | Next.js App Router, TypeScript strict |
| Hosting | Vercel, preview deploy per PR, production from `main` |
| Database | Neon Postgres, one branch per preview environment |
| ORM | Drizzle, SQL migrations checked in |
| Auth | Better Auth, email and password, users in Neon |
| Files | Cloudflare R2, private bucket, presigned URLs that expire |
| UI | Tailwind, shadcn/ui |
| Live updates | TanStack Query polling every 5s plus optimistic updates |
| Tests | Vitest (unit, integration), Playwright (e2e), Stryker on `src/domain` only |
| Alerts | Sentry for errors and slow requests, Better Stack for uptime |
| Accessibility | Best effort. axe runs and reports, does not block |
| Support libraries | `aws4fetch` (presigned R2 URLs), `sonner` (toasts), `s3rver` (local and CI storage), `clsx` + `tailwind-merge` (class names), `radix-ui` (shadcn primitives), `lucide-react` (icons) |

Do not add a dependency or a service outside this table without asking.

## The paved path

One way to do each thing. If the path does not fit, stop and say so. Do not invent a second path.

```
src/domain/     Pure functions and types. No I/O, no imports from db or next.
src/db/         Drizzle schema, migrations, seed.
src/server/     queries/ (reads) and actions/ (writes). The only code that touches the db.
src/app/        Routes. Server Components load data, client components poll.
src/components/ ui/ (shadcn primitives) and feature components.
```

- **Reads:** a function in `src/server/queries`, declared with `defineQuery` so it checks the session before it reads, called by a Server Component for first paint and by a route handler for polling. Pages never check the session themselves. Read helpers that several queries share live in `src/server/` (for example `trip-rows.ts`), are called only from inside a `defineQuery`, and are never imported by app code (lint enforces this).
- **Writes:** a server action in `src/server/actions`. Validate input with a zod schema, check the session, call the domain, write in one transaction.
- **Trip status:** changes only through `transitionTrip()`. Nothing else writes `trips.status`.
- **Forms:** one form helper, zod schema shared between client and server, error messages in plain language.
- **Screens:** every list and tile has designed empty, loading and error states. Use the shared components.
- **Links to one record** (a trip, driver or vehicle) use `RecordLink`, which warms the page on hover, focus or touch instead of prefetching every row on screen.
- **Destructive actions:** always behind the shared confirm dialog.
- **Money:** integer cents everywhere. Format only at the edge.
- **Time:** stored as `timestamptz`. "Today" means today in `APP_TIMEZONE`.

## Domain rules

These are enforced twice: in `src/domain` and by the database.

- Statuses: `offer`, `assigned`, `en_route`, `completed`, `cancelled`
- Allowed moves: `offer -> assigned -> en_route -> completed`
- `cancelled` is allowed from `offer`, `assigned`, `en_route`, and requires a reason
- `completed` and `cancelled` are final
- `assigned` and later require a driver
- A driver cannot hold two active trips whose time ranges overlap (Postgres exclusion constraint)
- Revenue counts completed trips only
- Every transition writes a row to `trip_events` (who, from, to, when, reason)

Driver matching, top 3 for an open trip: on duty, same vehicle class, no overlapping active trip, fewest trips today. Ties break on driver name, then id, so results are stable.

## Banned

- Code comments. If code needs explaining, rename or restructure it. A comment that excuses a workaround is the workaround spreading.
- `any`, non-null assertions, `@ts-ignore`, disabled lint rules
- Importing `src/db` outside `src/server`
- Fetching in `useEffect`
- Secrets in the repo. Env vars only, documented in `.env.example`
- Real personal data. All seed data is fake
- Anything copied from the reference app

## Before you say done

Run the verification skill (`.claude/skills/verify`) and attach its evidence. A change without evidence is not done. Then:

```
pnpm lint && pnpm typecheck && pnpm test && pnpm e2e
```

## Commits

Small, one concern each, conventional prefixes (`feat:`, `fix:`, `test:`, `chore:`). The commit history is scored. Never squash it away, never rewrite it.

## Phone first

Design at 375px first, then widen. Every page is checked at phone width by the verification skill.
