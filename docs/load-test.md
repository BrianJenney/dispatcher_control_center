# Load test: 100,000 trips

The brief asks for migrations and indexes ready for 100,000 trips. This is the measurement behind that claim.

## How it was run

```
pnpm verify dashboard jobs-search schedule insights activity drivers --load
```

`--load` seeds the normal demo week plus 100,000 extra historical trips for 60 more drivers, eight a day each, which reaches back about seven months. It then drives each flow at phone and desktop width through a production build (`next start`). Each request is timed by the browser from sending it to receiving the whole response, so the numbers include server rendering, the database queries and the transfer.

| | |
|---|---|
| Trips | 100,287 |
| Status history rows (`trip_events`) | 388,933 |
| Database size, tables and indexes | 195 MB |
| Machine | 4 vCPU, 15 GB RAM, Postgres 16 on the same machine |
| Run | 2026-10-09, commit `d0d2d02` |

## Results

Milliseconds per request, across both widths and all six flows. Requests seen only once are left out.

| Request | Count | Median | 95th percentile | Slowest |
|---|---|---|---|---|
| `GET /` (dashboard) | 39 | 25 | 103 | 394 |
| `GET /jobs` | 41 | 23 | 62 | 106 |
| `GET /schedule` | 40 | 24 | 105 | 122 |
| `GET /insights` | 42 | 25 | 122 | 137 |
| `GET /activity` | 14 | 46 | 67 | 67 |
| `GET /drivers` | 42 | 24 | 57 | 70 |
| `GET /fleet` | 40 | 23 | 41 | 59 |
| `GET /drivers/[id]` | 12 | 30 | 48 | 48 |
| `GET /jobs/[id]/edit` | 18 | 17 | 62 | 62 |
| `GET /api/dashboard` (5 second poll) | 2 | 16 | 16 | 16 |
| `GET /api/jobs` (5 second poll) | 4 | 13 | 14 | 14 |
| `GET /api/insights` | 2 | 110 | 110 | 110 |
| `GET /api/activity` | 2 | 30 | 30 | 30 |
| `GET /api/trips/[id]/suggestions` (top 3 drivers) | 4 | 56 | 102 | 102 |
| `POST /jobs` (book a trip) | 3 | 22 | 23 | 23 |

The single 394 ms dashboard request is the first request after the server started. The dashboard and jobs polls that run every 5 seconds stay under 20 ms because they only read today, trips still on the road and one page of the list, whatever the size of the history. The Insights poll reads seven days of trips and took 110 ms.

## What keeps it fast

- Indexes on `(status, pickup_at)`, `(pickup_at)`, `(driver_id, pickup_at)` and a trigram index on `customer_name` serve the dashboard, schedule, matching and search.
- The trip number search uses the unique index on `reference`.
- `trip_events` and `trip_edits` are indexed by `(trip_id, created_at)` and `(created_at)` for the activity log.
- Lists are paged, and the polling queries only read a bounded window (today, the last seven days for Insights).

## Limits

- Postgres ran on the same machine as the app. In production Neon adds a network round trip of a few milliseconds per query from Vercel in the same region.
- This measures one dispatcher at a time. It is not a concurrency test.
