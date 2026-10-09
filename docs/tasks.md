# Tasks

Each task is one agent. Read `CLAUDE.md` and `docs/brief.md` first. Finish means: checks green, verification evidence attached, small commits pushed.

Waves are ordered by dependency, not by time. Inside a wave, tasks run in parallel, one git worktree and one branch per agent.

## Wave 1: foundations (serial, ends at Gate A)

### T1 Paved path
Scaffold Next.js, TypeScript strict, Tailwind, shadcn/ui, Drizzle, TanStack Query, Vitest, Playwright, pnpm.
Build one tiny end to end example (a health page that reads one row) that shows the read path, write path, form helper, confirm dialog, and the shared empty, loading and error components.
Add lint rules for everything under "Banned" in `CLAUDE.md`, plus import boundaries between `domain`, `db`, `server`, `app`.
Add CI: lint, typecheck, unit, integration, e2e.
**Done when:** a fresh clone runs with `pnpm i && pnpm dev`, CI is green, and each banned pattern fails lint in a test fixture.

### T2 Domain core
Schema and migrations: `drivers`, `vehicles`, `trips`, `trip_events`, `documents`, plus Better Auth tables.
`src/domain`: transition table, `canTransition`, `transitionTrip`, `matchDrivers`, revenue and KPI calculations, all pure.
Database backstops: status enum, trigger rejecting illegal transitions, check requiring a cancel reason, check requiring a driver from `assigned` on, exclusion constraint on overlapping active trips per driver.
Indexes for 100,000 trips: status, pickup time, driver plus pickup time, customer search.
Seed script: fake drivers, vehicles, and trips spread across today and the last 7 days, in every status. Second seed mode that generates 100,000 trips for load checks.
**Done when:** unit tests cover every legal and illegal transition and every matching rule, integration tests prove the database rejects each illegal write even with the app bypassed, and Stryker runs on `src/domain`.

**Open questions for Gate A (do not guess, list them):**
- A trip has a start time but the brief gives no end. Overlap needs a range. Proposed: `duration_minutes`, default 60, editable.
- Which statuses allow editing a trip? Proposed: `offer` and `assigned` only.
- Can an assigned trip go back to `offer` (unassign)? The brief's flow says no. Proposed: reassign allowed while `assigned`, no move back.
- `APP_TIMEZONE` default. Proposed: `America/Los_Angeles`.

### T3 Verification skill
Build the CLI behind `.claude/skills/verify`: boot the app against a fresh seeded database, log in as the demo user, drive a named flow from the feature map, and write evidence to `.verify/` (screenshots at phone and desktop width, console errors, axe report, Lighthouse scores, response timings).
Fill in `feature-map.md` as features land. Add a CI job that fails when a route exists that the feature map does not mention.
**Done when:** `pnpm verify health` produces a full evidence folder for the T1 example page.

## Wave 2: required features (parallel, ends at Gate B)

Every feature agent: build on the paved path, phone first, add the flow to the feature map, add one e2e test for the feature, attach verification evidence.

### T4 Auth and shell
Better Auth with email and password, seeded demo account, sign in and out, middleware that sends logged out visitors to login, app shell with mobile navigation. Covers feature 01.

### T5 Jobs and assign
Trip create, edit, cancel with reason, search, status filters. Top 3 driver suggestions on open trips and one click assign. Three clicks or fewer from dashboard to assigned, fully keyboard operable. Covers features 03 and 04.

### T6 Dashboard, status, schedule
KPI tiles (active jobs, drivers on duty, fleet ready, today's revenue), status moves with optimistic updates, polling so tiles change without refresh, today's timeline filterable by driver and status. Covers features 02, 05, 08.

### T7 Drivers, fleet, documents
Driver list, add, edit with photo, phone, vehicle class, on duty toggle. Vehicles with class and Ready or In service. Document upload, view, delete for licenses and registrations: PDF or image, 10 MB max checked on client and server, private R2 bucket, presigned links that expire, session required. Covers features 06, 07, 09.

## Running alongside Wave 2

### T9 Tests
Own the pyramid. Many unit tests in `src/domain`, fewer integration tests on server actions against a real Postgres, one e2e per required feature. Keep the Stryker mutation score on `src/domain` high and report survivors as findings, not as numbers to game. Add "try to break it" cases: double submit, stale tab, two dispatchers assigning the same driver at once.

### T10 Infra and alerts
Vercel project, Neon branch per preview, production from `main`, migrations run on deploy. R2 buckets per environment. Sentry with alerts on new errors and slow requests. Better Stack uptime checks on the live URL and a health endpoint. Backup restore drill using Neon point in time restore, written up with the steps taken. Monthly cost estimate at 20 and 200 users.

### T11 Gardener
See `.claude/agents/gardener.md`. Runs on every merge.

## Wave 3: stretch and submission (parallel, ends at Gate C)

Starts only after Gate B.

### T8 Stretch
In this order, since the first two fall out of `trip_events`: activity log, CSV export of trips, seven day volume chart and revenue report, keyboard shortcuts with a help overlay, theme switcher, guided first time tour. Two tab live updates already work through polling; add an e2e test proving it.

### T12 Submission docs
README (setup, schema diagram, hosting and storage, backups, running cost, key decisions, known issues, what is next). Time log template and AI disclosure in `docs/time-log.md`, filled from real commit history, never invented.
