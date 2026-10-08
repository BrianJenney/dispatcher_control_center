# Monthly cost estimate

All prices are US dollars from each vendor's public pricing pages, read on 2026-10-08. Prices change, so check before quoting. Vendor pages are listed with what each one gave me in the Sources section at the end.

## Headline

Three scenarios:

- **A.** 20 users, a small fleet, about 5 dispatchers online at once.
- **B.** 200 users, about 40 dispatchers online at once.
- **C.** The idle demo that the scored test review sees, with almost no traffic.

"Expected" means the code as it is today, with the monitoring plan in `docs/tasks.md` (an uptime check on the health endpoint), on the plans the brief needs (a commercial Vercel plan, 7 day database restore).

| Service | Plan | A (20 users) | B (200 users) | C (idle demo) | Main cost driver |
|---|---|---|---|---|---|
| Vercel | Pro | $20 | $40 | $20 | Platform fee. B adds the $20 CDN capacity tier because polling passes 1 million requests |
| Neon Postgres | Launch | $19.89 | $24.74 | $19.88 | Compute hours. The health check keeps the database awake all month |
| Cloudflare R2 | Standard, pay as you go | $0 | $0 | $0 | Nothing. Inside the free tier, and downloads cost nothing |
| Sentry | Developer (A, C), Team (B) | $0 | $97.10 | $0 | Spans. Every poll is traced at 100 percent |
| Better Stack Uptime | Free | $0 | $0 | $0 | Nothing. 2 monitors fit inside 10 |
| **Total, expected** | | **$39.89** | **$161.84** | **$39.88** | |

Total per month, with a low to high range:

- **A, 20 users: about $40 a month. Range $40 to $102.**
- **B, 200 users: about $162 a month. Range $102 to $306.**
- **C, idle demo: about $40 a month. Range $0 to $41.**

How the range is built: low uses fewer open tabs (0.6 times the expected hours), fewer spans per poll and a smaller database. High uses 1.5 times the open tabs, more spans per poll, a bigger database and more memory per function. The full list is in each service section. C low is $0 because it assumes free plans everywhere (Vercel Hobby, Neon Free) and an uptime check that does not touch the database. Vercel Hobby is for personal, non commercial use, so a real client cannot use it.

With the three cheap levers below applied together, the expected totals fall to about $25 (A), $50 (B) and $21 (C).

The big finding: at 200 users the Sentry bill ($97) is bigger than Vercel and Neon combined, and nearly all of it is polling requests being traced at 100 percent.

## Usage model (derived from the code)

| Fact | Where in the code | Value |
|---|---|---|
| Poll interval | `src/components/live-query.ts`, `POLL_INTERVAL_MS` | 5,000 ms, so 12 polls a minute, 720 an hour per open tab |
| Polling when the tab is hidden | `useLiveQuery` sets `refetchInterval` and does not set `refetchIntervalInBackground`. TanStack Query's default for that option is false (from the library's documentation, not re-checked in this session) | Polling pauses in hidden tabs. I only count visible tab hours |
| What polls | Dashboard, Jobs, Schedule, Drivers, Fleet, Insights, Activity and Health views each poll one route handler | One page is on screen at a time, so one poll stream per open tab |
| Work per poll | `pollingRoute` in `src/server/route.ts`, then a query in `src/server/queries` | Session check, then 1 to 3 SQL queries. Dashboard runs 3 in parallel. Better Auth `cookieCache` (5 minutes) means most polls skip the session query |
| Database driver | `src/db/client.ts`, `pg` Pool, `max: 5` | Normal Postgres connection through Neon's pooled host |
| Trace sampling | `src/observability.ts` | `tracesSampleRate = 1`, used on both server and browser |
| Documents | `src/server/storage.ts`, `src/server/route.ts` | Presigned PUT and GET links that last 5 minutes. A file view is a short function call that answers with a redirect to R2, so file bytes never pass through Vercel |
| Driver photos | `src/components/people/driver-avatar.tsx` | Each photo on the Drivers page is one function call plus one R2 read |

Shared assumptions:

- A dispatcher shift is 8 hours, 22 working days a month: 8 x 22 = **176 hours** per dispatcher.
- The concurrent dispatchers (5 in A, 40 in B) all work the same 8 hour window, each with one visible tab. If your fleet runs three shifts to cover 24 hours, the number of dispatchers online at once is what matters, not the user count.
- Tab hours: A is 5 x 176 = **880**. B is 40 x 176 = **7,040**.
- Polls: tab hours x 720. A is 880 x 720 = **633,600**. B is 7,040 x 720 = **5,068,800**.
- Other function calls (page loads, server actions, driver photos, document links) add an allowance on top: 6 percent for A, 14 percent for B. Cross check for B: 40 dispatchers x 5 visits a day to the Drivers page x 22 days x 120 photos is 528,000 photo calls, which is 10.4 percent of polls on its own, plus about 264,000 page loads and actions (40 x 22 x 300), 5.2 percent. Together that is 15.6 percent, so 14 percent is on the low side of right. The effect on the bill is small.
- One uptime check every 3 minutes on the health endpoint is 20 x 24 x 30 = **14,400** calls a month. It is public and runs 2 SQL queries.
- Invocations (A): 633,600 x 1.06 + 14,400 = **686,016**. Invocations (B): 5,068,800 x 1.14 + 14,400 = **5,792,832**.
- Fleet size: A has 15 drivers and 15 vehicles. B has 150 drivers and 120 vehicles. Drivers do not sign in, only dispatchers do.
- Trip volume: 6 trips per driver per day. A is 15 x 6 x 30 = 2,700 trips a month. B is 150 x 6 x 30 = 27,000 a month.

## Vercel

Plan: Pro, $20 a month. It includes one deploying seat and a $20 monthly usage credit that covers metered usage. Pro also includes the lowest Flat Rate CDN tier: 1 million CDN requests and 1 TB of data transfer. Hobby is free but limited to personal, non commercial use, so a client product needs Pro.

Rates I used (region Washington D.C., iad1, the cheapest US region):

| Item | Rate | Source |
|---|---|---|
| Invocations | $0.60 per million | Vercel docs, Fluid compute pricing |
| Active CPU | $0.128 per hour (billing pauses while waiting on the database) | same |
| Provisioned memory | $0.0106 per GB hour (billing runs while a request is in flight) | same |
| Fast Origin Transfer | $0.06 per GB (lowest regional rate) | Vercel pricing and regional pricing pages |
| CDN requests and data transfer | Included to 1M requests and 1 TB, then $20 a month buys 10M requests and 50 TB, then $100 for 50M | Flat Rate CDN docs |
| Build minutes | $0.007 per minute on a Basic machine (2 vCPU at $0.0035) | Vercel pricing docs |

Per poll assumptions (not published, my estimates): 20 ms of active CPU, 120 ms of wall time, 1 GB of memory, 8 KB of compressed JSON for A and 24 KB for B (a dashboard snapshot is about 40 KB in A and 120 KB in B before compression, roughly 5 to 1). Builds: 60 a month at 4 minutes each on a Basic machine.

Scenario A, arithmetic:

- Invocations: 686,016 / 1,000,000 x $0.60 = **$0.41**
- Active CPU: 686,016 x 0.020 s = 13,720 s = 3.81 h. 3.81 x $0.128 = **$0.49**
- Memory: 686,016 x 0.12 s x 1 GB = 82,322 GB s = 22.87 GB h. 22.87 x $0.0106 = **$0.24**
- Fast Origin Transfer: 686,016 x 8 KB = 5.49 GB. 5.49 x $0.06 = **$0.33**
- Builds: 60 x 4 min x $0.007 = **$1.68**
- Usage total: **$3.15**, inside the $20 credit. Nothing extra is billed.
- CDN requests: 686,016 + 22,000 for page loads and assets (20 users x 22 days x 50) = 708,016. That is under the 1 million included.
- Vercel bill: **$20**.

Scenario B, arithmetic:

- Invocations: 5,792,832 / 1,000,000 x $0.60 = **$3.48**
- Active CPU: 5,792,832 x 0.020 s = 115,857 s = 32.18 h. 32.18 x $0.128 = **$4.12**
- Memory: 5,792,832 x 0.12 s x 1 GB = 695,140 GB s = 193.09 GB h. 193.09 x $0.0106 = **$2.05**
- Fast Origin Transfer: 5,792,832 x 24 KB = 139.0 GB. 139.0 x $0.06 = **$8.34**
- Builds: **$1.68**
- Usage total: **$19.66**, just inside the $20 credit.
- CDN requests: 5,792,832 + 220,000 (200 users x 22 days x 50) = 6.01 million. That passes the 1 million included, so the $20 a month tier (10 million requests) is needed. Without it, on demand CDN costs more: 6.01M x $2 per million = $12.02 for requests plus 139 GB x $0.15 = $20.85 for transfer, so the tier at $20 is cheaper.
- Vercel bill: $20 platform fee + $20 CDN tier = **$40**. I assume the credit does not apply to the CDN tier subscription. If it does, B falls to $20 but there is no usage left to cover.

Scenario C: the platform fee only, **$20**. Usage is a few cents. (Hobby would be $0 if the terms allow your use.)

Seats: only people who deploy need a Vercel seat ($20 a month each beyond the first). Viewers are free. Dispatchers use the app and never need a seat.

Range: A high is $40 because 1.5 times the tab hours pushes requests over 1 million (1.08M) and triggers the $20 tier. B low is $40, B high is $72.73 (usage $52.73, which is $32.73 over the credit, plus $40).

## Neon Postgres

Plan: Launch, pay as you go, no monthly minimum. $0.106 per compute unit hour (CU hour), $0.35 per GB month of storage, up to 7 days of restore history, 10 branches included then $1.50 per extra branch a month. The Free plan gives 100 CU hours, 1 GB, and only 6 hours of restore history, which does not meet "backups you can restore" in the brief. Scale costs $0.222 per CU hour and is only needed for a 30 day restore window.

Compute assumptions:

- Autosuspend: 5 minutes, which is Neon's default. Free cannot change it. Launch can.
- Autoscaling range 0.25 to 1 CU (0.25 CU is 1 GB RAM). Average size during a shift: 0.25 CU for A, 0.5 CU for B (40 tabs is about 8 requests a second, around 24 simple indexed queries a second).
- Polling arrives every 5 seconds per tab, far inside the 5 minute window, so the database stays awake for the whole shift, plus 5 minutes after the last poll. Awake hours per month: 22 x (8 h + 5 min) = **177.8 h**. Off shift hours: 730 hours in a month minus 177.8 is **552.2 h**.
- The health endpoint (`/api/health`) runs 2 SQL queries and is public. The plan in `docs/tasks.md` points an uptime check at it every 3 minutes (Better Stack free plan interval). 3 minutes is shorter than the 5 minute autosuspend, so the database never suspends and bills 0.25 CU for the 552.2 off shift hours as well.
- Preview branches: 20 previews a month, each awake about 1 hour at 0.25 CU, which is 5 CU hours in total.

Scenario A, arithmetic:

- Shift: 177.8 h x 0.25 CU = 44.46 CU h
- Off shift, kept awake by the health check: 552.2 h x 0.25 CU = 138.04 CU h
- Previews: 5 CU h
- Total 187.5 CU h x $0.106 = **$19.875**
- Storage (month 12, about 32,400 trips, 42 MB): 0.042 GB x $0.35 = **$0.015**
- Neon bill: **$19.89**. With a health check that does not touch the database the off shift line disappears: (44.46 + 5) x $0.106 = $5.24, so the always awake health check costs **$14.63** a month.

Scenario B, arithmetic:

- Shift: 177.8 h x 0.5 CU = 88.92 CU h
- Off shift: 138.04 CU h
- Previews: 5 CU h
- Total 231.96 CU h x $0.106 = **$24.59**
- Storage (month 12, 324,000 trips, 421 MB): 0.421 GB x $0.35 = **$0.147**
- Neon bill: **$24.74**. Without the always awake health check it is $10.10.

Scenario C: no dispatchers, but the health check still wakes the database every 3 minutes. 730 h x 0.25 CU = 182.5 CU h, plus 5 for previews = 187.5 CU h x $0.106 = **$19.88**. On the Free plan this would use up the 100 CU hour allowance in about 16 days (100 / 0.25 = 400 h).

Storage: how big is 100,000 trips? Estimated from `src/db/schema.ts` and the migrations:

| Part | Basis | Size |
|---|---|---|
| trips table | about 220 bytes a row (uuid, 3 text columns, timestamps, enums, integers, row header) x 100,000, with page overhead | 24 MB |
| trips indexes | primary key 3.5, reference 2.2, status plus pickup 3.1, pickup 2.2, driver plus pickup 4.0, customer name trigram about 4.0. The overlap constraint is a partial index on assigned and en route trips only, so it is tiny | 19 MB |
| trip_events table | about 3.5 events a trip (created, assigned, started, completed) = 350,000 rows x 116 bytes | 45 MB |
| trip_events indexes | primary key 14, trip plus time 16, time 8 | 38 MB |
| everything else | users, sessions, drivers, vehicles, documents | 4 MB |
| **Total** | | **about 130 MB, roughly 1.3 KB a trip** |

So 100,000 trips cost about **$0.05** a month in storage. Even 10 times that is under $0.50. B reaches 100,000 trips after about 4 months (27,000 a month). A would take about 3 years. The 7 day restore history is billed at $0.20 per GB month of changes. At B's write volume (about 6 MB a day, 42 MB a week) that is under $0.01 and is ignored here.

Range: low uses 0.25 CU for B too (A is already 0.25) and 2.5 CU hours of previews, which gives Neon $19.63 (A) and $19.76 (B). High uses 0.5 CU (A) and 1.0 CU (B) during shifts and 10 CU hours of previews: $25.13 (A) and $34.69 (B).

## Cloudflare R2

Plan: Standard storage, pay as you go. The free allowance each month is 10 GB of storage, 1 million Class A operations (writes, lists) and 10 million Class B operations (reads). Beyond that: $0.015 per GB month, $4.50 per million Class A, $0.36 per million Class B. Egress is free.

Document estimate:

- A: 15 drivers x 2 files (licence and photo) + 15 vehicles x 1 registration = **45 files**. B: 150 x 2 + 120 = **420 files**. At 2 MB each that is 90 MB (A) and 840 MB (B). Worst case, every file at the 10 MB limit, is 450 MB (A) and 4.2 GB (B). All of that is under 10 GB, so storage costs $0.
- Class A: uploads. Assume 10 percent of files are replaced a month. A is about 5 and B about 42 PUTs. Free allowance is 1,000,000.
- Class B: each upload is checked with one HEAD (`storage.describe`), and each view is one GET. B: 42 HEADs + 120 photos x 40 dispatchers x 5 visits x 22 days (528,000 photo reads) + about 1,000 document views = about **530,000**. Free allowance is 10,000,000. Deletes are not billed.
- Presigned links are signed on the server with `aws4fetch` and make no R2 call.
- **R2 bill: $0 in A, B and C.** R2 only shows up on the bill after more than 10 GB of documents, and then at $0.015 per GB a month.

## Sentry

Plans: Developer is free and limited to one user (5,000 errors, 5 million spans, 30 day lookback, email alerts). Team is $26 a month with unlimited users, 50,000 errors, 5 million spans and 90 day lookback. Business is $80. Extra errors and spans are pay as you go on Team. Span rates: **$0.0000020 each ($2.00 per million) from 5 to 100 million, $1.8 per million above that**. Errors above 50,000 cost $0.0003625 each up to 100,000.

Sampling: `tracesSampleRate = 1` on server and browser, so every poll is traced.

Spans per poll (my estimate, the Sentry pages do not give a number for Next.js route handlers): 1 root request span, about 2 framework spans, and 4 `pg` spans (one connect plus about 3 queries) = **7**. Low 4, high 10. Browser side spans only appear around page loads and I did not count them.

Scenario A, arithmetic:

- Spans: 686,016 x 7 = **4.80 million**. That is under the 5 million free quota, so the Developer plan holds, but with only 4 percent to spare. If traces stop appearing late in the month, you passed 5 million (traces are dropped, errors are counted separately).
- Errors: far under 5,000.
- Sentry bill: **$0**.

Scenario B, arithmetic:

- Spans: 5,792,832 x 7 = **40.55 million**
- Over the included 5 million: 35.55 million x $2.00 per million = **$71.10**
- Team plan: **$26**
- Sentry bill: 26 + 71.10 = **$97.10**. A pay as you go budget has to be set or Sentry drops data once the included volume is gone.
- Errors: under 50,000 unless something is broken. A broken release can create many thousands of errors in a day, which is the one spike to watch.

Scenario C: the health check is 14,400 x 7 = 0.1 million spans. Developer plan, **$0**.

Range: A low $0 (1.62M spans). A high $37.20 (10.60M spans: $26 + 5.60 x $2). B low $42.39 (13.20M spans: $26 + 8.20 x $2). B high $198.77 (91.38M spans: $26 + 86.38 x $2).

Sentry users: only people who log in to Sentry count. Dispatchers do not. If the client wants more than one person in Sentry, A needs Team ($26).

## Better Stack Uptime

Plan: Free. It gives 10 monitors and heartbeats, 1 status page, email and Slack alerts, and 3 minute checks (see the Sources note on that last point). Paid starts at about $34 a month ($29 billed yearly) per responder seat for phone call alerts and 30 second checks.

Monitors needed: 2, which is the live URL and the health endpoint (`docs/tasks.md`, T10). **$0 in A, B and C.** Phone call alerts are optional and would add about $34 a month to any scenario. They are not in the totals.

## What makes the bill jump

1. **Trace sampling at 100 percent.** Each poll is 7 spans and spans cost $2 per million past the first 5 million. This one setting is 60 percent of the B bill.
2. **Polling interval.** Every open tab is 720 requests an hour. Halving the rate halves invocations, CPU, memory, transfer and spans.
3. **Neon compute that never suspends.** The 3 minute uptime check on a database route stops the 5 minute autosuspend from ever firing, which costs about $14.63 a month in A and B and about $19 in C.
4. **CDN capacity tier steps on Vercel.** Under 1 million requests is free. Over it, the next tier is $20, then $100 at 10 million requests. B high (9.4 million requests) is close to the next jump.
5. **Vercel seats.** Each extra person who deploys is $20 a month. Viewers are free.
6. **R2 egress is free.** Documents and photos do not move the bill, and downloads go straight from R2, so they also use no Vercel transfer.
7. **Neon plan fit.** More than 10 branches costs $1.50 each a month. A 30 day restore window needs the Scale plan at $0.222 per CU hour, about twice the Launch rate.
8. **Number of dispatchers online at once, not the number of users.** 200 users who log in once a day cost almost nothing. 40 who stare at the dashboard for 8 hours cost the whole bill above.

## Three cheap levers

Savings are against the expected totals and are each measured on their own.

| Lever | What changes | A | B | C |
|---|---|---|---|---|
| 1. Point the uptime check at a route that does not touch the database (for example a small `/api/ping`) and keep the database check as a slower heartbeat or a manual check | One new route and one monitor setting. Neon suspends after each shift. Trade off: an outage of the database alone would show up in Sentry and the polls rather than in the uptime check | saves $14.63 (to $25.26) | saves $14.63 (to $147.21) | saves about $19 (to about $21) |
| 2. Lower `tracesSampleRate` to 0.1, or use a `tracesSampler` that keeps page loads and actions at 1 and polls at 0.05 | One line in `src/observability.ts`. B spans fall to 4.05 million, back under the free 5 million, so B can use the free Developer plan if only one person needs Sentry | saves $0 (already free, but 10 times more headroom) | saves $97.10 (to $64.74) when one Sentry user is enough. Saves $71.10 if Team is kept | saves $0 |
| 3. Poll every 10 seconds, not every 5 | Change `POLL_INTERVAL_MS`. Halves polls, so B spans are 20.3 million: $26 + 15.33 x $2 = $56.66. Updates arrive within 10 seconds, which still looks live | saves $0 (inside free allowances) | saves $40.44 (to $121.40) | saves $0 |

All three together: A is Vercel $20 + Neon $5.26 = **$25.26**. B is Vercel $40 + Neon $10.10 + Sentry $0 = **$50.10**. C is Vercel $20 + about $0.80 Neon = **about $21**. The B Vercel number stays at $40 because 2.9 million requests still passes the 1 million included.

Polling already pauses in hidden tabs, so pausing on hidden is not a lever. A possible fourth lever is stopping polls after 10 minutes without a mouse or key press, which cuts tab hours for dispatchers who walk away from a visible screen. That is what the "0.6 times" low case is.

## Total per month

| Scenario | Expected | Low | High |
|---|---|---|---|
| A, 20 users | **$40** ($39.89) | $40 ($39.63) | $102 ($102.33) |
| B, 200 users | **$162** ($161.84) | $102 ($102.15) | $306 ($306.19) |
| C, idle demo | **$40** ($39.88) | $0 | $41 ($40.4) |

Per user, expected: A is about $2.00 a user a month. B is about $0.81. With the levers applied: A $1.26, B $0.25.

Taxes are not included.

## Assumptions most likely to be wrong

1. **Spans per poll (7).** Sentry's pages do not say how many spans a Next.js route handler with `pg` creates. If it is 3, B has 17.4 million spans and Sentry is $26 + 12.4 x $2 = about $51. If it is 12, B has 69.5 million spans and Sentry is $26 + 64.5 x $2 = about $155. A could cross the 5 million span line with a single extra span per poll.
2. **How many dispatchers are online at once.** 5 and 40 in one 8 hour window with one visible tab each. Two tabs per dispatcher doubles the polls. A 24 hour operation with three overlapping shifts roughly triples the polls and also makes the Neon always awake cost real in a way it already is.
3. **Neon staying awake because of the health check, and the size of Neon compute.** I have not been able to confirm from Neon's pages whether idle pooled connections, rather than queries, keep a compute awake. The estimate assumes only queries do (and `pg` closes idle clients after 10 seconds by default). The average of 0.5 CU for B is a guess without a load test.
4. Smaller ones: per poll CPU time and memory size on Vercel (20 ms, 1 GB), whether the $20 credit applies to the Flat Rate CDN tier, and that Vercel counts each poll as one CDN request.

## Sources

Every row was read on 2026-10-08. "Fetched" means I opened the vendor page and read the numbers.

| Number | Page | Status |
|---|---|---|
| Vercel Pro $20, 1 seat, $20 credit, viewer seats free, extra seat $20 | https://vercel.com/pricing and https://vercel.com/docs/plans/pro (redirects to /docs/plans/pro-plan, page dated 2026-09-15) | Fetched |
| Vercel included CDN tier, tiers $20 and $100 | https://vercel.com/docs/pricing/flat-rate-cdn (2026-09-14) | Fetched |
| Vercel iad1 rates: CPU $0.128 per hour, memory $0.0106 per GB hour, invocations $0.60 per million | https://vercel.com/docs/functions/usage-and-pricing (2026-06-16) | Fetched |
| Vercel Fast Origin Transfer from $0.06 per GB, builds $0.007 per minute, Hobby non commercial | https://vercel.com/docs/pricing, https://vercel.com/docs/pricing/regional-pricing and https://vercel.com/pricing | Fetched |
| Neon Launch $0.106 per CU hour, $0.35 per GB month, Free 100 CU hours, 5 minute autosuspend, 7 day restore, branches | https://neon.com/pricing and https://neon.com/docs/introduction/plans | Fetched |
| Neon scale to zero, 5 minute default | https://neon.com/docs/introduction/scale-to-zero | Fetched. Silent on whether idle pooled connections block suspension |
| Neon pooled connection details | https://neon.com/docs/connect/connection-pooling | Fetched. Gave a 10,000 client connection limit only |
| R2 $0.015 per GB month, $4.50 and $0.36 per million operations, 10 GB and 1M and 10M free, free egress | https://developers.cloudflare.com/r2/pricing/ | Fetched |
| R2 egress free | https://www.cloudflare.com/developer-platform/products/r2/ | Fetched. It had no rate card, only "R2 doesn't charge for egress" and a pointer to the pricing page |
| Sentry plans, quotas, Team $26 | https://sentry.io/pricing/ | Fetched. The $26 Team price is shown as billed annually and the page shows no separate monthly price |
| Sentry span rates $0.000002 and $0.0000018, error rates | https://docs.sentry.io/pricing/ | Fetched. It did not say how a span is counted or what Developer does past quota |
| Sentry span definition | https://docs.sentry.io/pricing/quotas/ | Fetched. Not helpful on how spans are counted per request |
| Better Stack free plan 10 monitors, 1 status page, paid responder $34 monthly or $29 yearly, 30 second checks | https://betterstack.com/pricing | Fetched. It does not state the free plan check interval |
| Better Stack free plan 3 minute checks | https://betterstack.com/uptime-robot-alternative | Fetched. This is a Better Stack comparison page, not the pricing page, so treat it as a softer source. A Better Stack FAQ URL I tried (`/docs/uptime/faq/`) returned 404 |

Could not be confirmed from any page: the Vercel Pro included amounts for CPU, memory and invocations beyond the credit (the docs describe Pro as on demand with the credit applied), whether the credit covers the Flat Rate CDN tier, and Sentry Developer behaviour past quota. No secondary or third party blog was used for any price in the tables.
