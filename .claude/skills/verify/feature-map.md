# Feature map

How a user reaches each feature and what "working" means. Routes and shortcuts are filled in as features land. Keep one row per flow.

| Flow | Feature | Route | Reach by click | Reach by keyboard | True when it works |
|---|---|---|---|---|---|
| `health` | Paved path example | `/health` | Open the URL directly | Tab to "Skip to content", Enter, Tab to "Check name", type, Enter records; Tab to "Clear all checks", Enter, Tab to "Clear checks", Enter | The database badge reads Connected; an empty name shows "Give the check a short name."; a recorded check appears as the latest; clearing asks for confirmation and then shows "No checks yet" |
| `login` | 01 Login | `/login` | Any protected page while signed out sends you here; "Sign in with the demo account" fills and submits the form; the sign out icon sits in the sidebar footer (desktop) or top bar (phone) | Tab to Email, type, Tab to Password, type, Enter; "Skip to content" is the first Tab stop inside the app | Demo user signs in and lands on the dashboard; signing out returns to login; a protected URL while logged out redirects to login |
| `dashboard` | 02 Dashboard | `/` | "Dashboard" in the sidebar (desktop) or bottom bar (phone) | Tab to "Dashboard" in the main navigation, Enter | Four tiles show active jobs, drivers on duty, fleet ready, today's revenue, and match the database |
| `jobs-create` | 03 Jobs | `/jobs/new` | "Jobs" in the navigation, then "New trip" | Tab to "New trip", Enter; Tab through the fields, Space opens a select, Enter on "Book trip" | A trip is created with all fields and appears in the list as Offer |
| `jobs-edit` | 03 Jobs | `/jobs/[id]/edit` | "Edit" on an offer or assigned trip card in Jobs, the dashboard or the schedule | Tab to the card's "Edit", Enter; Enter on "Save changes" | Edited fields persist |
| `jobs-cancel` | 03 Jobs | `/jobs` | "Cancel trip" on any trip card that is not finished | Tab to "Cancel trip", Enter, type the reason, Tab to "Cancel trip", Enter | Cancel asks for confirmation and a reason; trip shows Cancelled |
| `jobs-search` | 03 Jobs | `/jobs` | "Jobs" in the navigation; type in "Search by customer"; status buttons below it; "Show more" at the end | Tab to the search box and type; Tab to a status button, Enter | Search and status filters narrow the list |
| `assign` | 04 Assign driver | `/` and `/jobs` | Dashboard, "Assign driver" on a trip in "Needs a driver" (click 1), then "Assign" beside a suggested driver (click 2) | Tab to "Assign driver", Enter; the best match is focused, Enter assigns | Top 3 suggestions respect all four rules; one click assigns; three clicks or fewer from dashboard |
| `status` | 05 Status updates | `/schedule` and `/` | "Start trip", "Complete trip" and "Cancel trip" on each trip card on the dashboard or schedule | Tab to the trip's button, Enter; in the cancel dialog type the reason, Tab to "Cancel trip", Enter | Trip moves Offer to Completed step by step; illegal moves are not offered; tiles change without refresh |
| `drivers` | 06 Drivers | | | | Add and edit with photo, phone, class; on duty toggle changes the tile |
| `fleet` | 07 Fleet | | | | Vehicle status change updates the Fleet ready tile |
| `schedule` | 08 Schedule | `/schedule` | "Schedule" in the sidebar (desktop) or bottom bar (phone) | Tab to "Schedule" in the main navigation, Enter; Tab to the Status and Driver filters, Space opens, arrows choose, Enter | Today's trips in time order; driver and status filters work |
| `documents` | 09 Documents | | | | Upload, view, delete; 10 MB and file type limits enforced; link refused when logged out |
