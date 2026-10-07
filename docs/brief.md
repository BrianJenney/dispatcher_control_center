# Dispatch Lite: the brief

Source: Sailed Away AI dev test. Submission due end of day Sunday, Oct 11, 2026.

## What to build

An operations app that lets a dispatcher see the day at a glance, create trips, assign the right driver and track every trip to completion. The client is a luxury car service.

Reference app (look and feel only, copy no code or images): https://vipcrm.usebloomscale.com/

Every number and list comes from a database and changes when the data changes.

## Hard requirements

- Every page works smoothly on a phone
- Deployed to a live URL
- Login with a demo account
- Real data from a database, seeded with sample drivers, vehicles and trips

## Trip status flow, enforced by the app

Offer -> Assigned -> En route -> Completed

Cancelled is allowed from any status before Completed, with a reason. Only Completed trips count toward revenue.

## Nine required features

All nine must work for the submission to be scored.

| No. | Feature | What it must do |
|---|---|---|
| 01 | Login | Sign in and out; protected pages send logged out visitors to the login screen |
| 02 | Dashboard | Live KPI tiles for active jobs, drivers on duty, fleet ready and today's revenue |
| 03 | Jobs | Create, edit and cancel trips (customer, pickup, dropoff, date and time, passengers, vehicle class, fare), with search and status filters |
| 04 | Assign driver | Suggest the top 3 drivers for an open trip (on duty, right vehicle class, no overlapping trip, fewest trips today) and assign in one click |
| 05 | Status updates | Move trips through the status flow; the dashboard updates without a manual refresh |
| 06 | Drivers | List, add and edit drivers with photo, phone, vehicle class and an on duty toggle |
| 07 | Fleet | Vehicles with class and status (Ready or In service); changes update the Fleet ready tile |
| 08 | Schedule | Today's trips on a timeline in time order, filterable by driver and status |
| 09 | Documents | Upload, view and delete driver licenses and vehicle registrations (PDF or image, 10 MB max), visible only to logged in users |

## Stretch goals (all in scope, only after Gate B)

- Live updates across two open browser tabs
- Seven day trip volume chart and a revenue report
- Theme switcher like the reference app
- Guided first time tour
- CSV export of trips
- Activity log of who changed what, and when
- Automated tests on the driver matching logic
- Keyboard shortcuts for dispatchers

## Scoring: five categories, equal weight

**Tech.** Clean data model with proper relations. Numbers live and correct, status rules enforced on the server. Readable code, sensible structure, steady commit history. No secrets in the repo, protected routes, real access rules.

**UI.** Clear hierarchy. Consistent spacing, type, color and components on every page. A premium feel worthy of a luxury car service. Fully usable on a phone, with designed empty, loading and error states.

**Smoothness.** Fast first load and a strong Lighthouse performance score. Actions feel instant, no full page reloads. Quick, steady transitions with no layout jumps. Stays stable when they try to break it.

**User friendliness.** Someone non technical can use it with no instructions. Clear confirmations, and a safety step before anything destructive. Helpful form validation in plain language. Three clicks or fewer to assign a driver; works by keyboard.

**Infrastructure and storage.** Managed hosting, separate environments and automatic deploys. Files in proper object storage, with private documents on expiring links. Migrations and indexes ready for 100,000 trips. Backups you can restore, and a clear monthly cost estimate.

## Deliverables

1. Live URL plus the demo login
2. GitHub repo with real commit history
3. README: setup, database schema, where everything is hosted and stored, backups, estimated monthly running cost, key decisions, known issues, what to build next
4. Video walkthrough, 3 to 5 minutes, showing every required feature
5. Time log of hours by day, and which AI tools were used and for what
6. Price quote and salary expectations (Brian writes this)

## Ground rules

- Own work only, no help from other people
- AI coding assistants are welcome; disclose how they were used
- No full app generators (Lovable, Bolt, v0) for the core build
- No code or images copied from the reference app
- All customer and driver data must be fake

## Review call

60 minutes: demo, code walkthrough, **one small live change made on screen share**, questions, quote. The code has to stay small and conventional enough for Brian to change it live.
