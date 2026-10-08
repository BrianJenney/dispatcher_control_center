# Backups and restoring

## What this means in plain terms

The database keeps a running record of every change for the last 7 days. If someone deletes the wrong data, or a bad release scrambles it, we can rewind the database to any second inside that window, like rewinding a video. Nothing has to be unpacked from a backup file, and the rewind takes seconds.

## What is covered

| Data | Where it lives | How it is protected | How far back |
|---|---|---|---|
| Trips, drivers, vehicles, document records, accounts, sessions, history | Neon Postgres, one branch per environment | Continuous change history, restorable to any second | 7 days (raised from 24 hours on 2026-10-08) |
| Uploaded files (licences, registrations, photos) | Cloudflare R2, private buckets | Stored redundantly by R2. R2 has no undelete, so a deleted file is gone | Not restorable |
| Code and configuration | GitHub and Vercel | Full commit history, redeploy any commit | Unlimited |

Known limit: deleting a document removes the file from R2 for good. The database row can be rewound, the file cannot. If this matters to a client, add a soft delete that keeps the file for 30 days and removes it on a schedule.

## Restoring production

Use the Neon console, or the API. The console is safer when you are under pressure.

1. Open the Neon project `dispatch-lite`, choose Branches, then `main`.
2. Press Restore. Pick the exact time just before the damage. If you are unsure, first create a new branch from `main` at that time (choose "from a past point in time"), open it, and check the data looks right. A branch created this way is a free, isolated copy.
3. Confirm the restore. Neon keeps a copy of the pre-restore state in a branch called `main_old_<timestamp>`, so a restore can itself be undone.
4. Reload the app. Connections reconnect on their own. Check `/api/health` reads `"database":"ok"`, sign in, and look at the dashboard.
5. Delete the `main_old_...` branch once you are sure, so it does not keep costing storage.

What a restore does not do: it rewinds everything in that branch, including bookings made after the restore point and sign-in sessions. Tell the dispatchers which time you restored to, so they can re-enter anything from after it.

Restore through the API (replace the placeholders, the token is a Neon API key):

```
curl -X POST https://console.neon.tech/api/v2/projects/<project id>/branches/<branch id>/restore \
  -H "Authorization: Bearer $NEON_API_KEY" -H "Content-Type: application/json" \
  -d '{"source_branch_id": "<same branch id>", "source_timestamp": "2026-10-08T15:54:49Z", "preserve_under_name": "main_before_restore"}'
```

## Restore drill

Done on 2026-10-08. The drill never touches production: it uses a throwaway copy.

| Step | What happened | Time |
|---|---|---|
| 1 | Created branch `restore-drill` from `main` | 1.0 s |
| 2 | Counted the data: 12 vehicles, 10 drivers on duty, 281 trips | |
| 3 | Noted the restore point from the database clock: 2026-10-08 15:54:49 UTC | |
| 4 | Simulated a disaster: deleted all 12 vehicles and took all drivers off duty. Counts read 0 vehicles, 0 on duty | |
| 5 | Restored the branch to the noted time, keeping a copy of the damaged state | 3.0 s |
| 6 | Counted again: 12 vehicles, 10 drivers on duty, 281 trips. Identical to step 2 | |

Total drill time was 23 seconds. Both drill branches were deleted afterwards.

Repeat the drill monthly, and after any change to how the database is hosted. A backup you have never restored is only a hope.
