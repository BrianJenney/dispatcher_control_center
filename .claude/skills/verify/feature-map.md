# Feature map

How a user reaches each feature and what "working" means. Routes and shortcuts are filled in as features land. Keep one row per flow.

| Flow | Feature | Route | Reach by click | Reach by keyboard | True when it works |
|---|---|---|---|---|---|
| `health` | Paved path example | `/health` | Open the URL directly | Tab to "Skip to content", Enter, Tab to "Check name", type, Enter records; Tab to "Clear all checks", Enter, Tab to "Clear checks", Enter | The database badge reads Connected; an empty name shows "Give the check a short name."; a recorded check appears as the latest; clearing asks for confirmation and then shows "No checks yet" |
| `login` | 01 Login | `/login` | Any protected page while signed out sends you here; "Sign in with the demo account" fills and submits the form; the sign out icon sits in the sidebar footer (desktop) or top bar (phone) | Tab to Email, type, Tab to Password, type, Enter; "Skip to content" is the first Tab stop inside the app | Demo user signs in and lands on the dashboard; signing out returns to login; a protected URL while logged out redirects to login |
| `dashboard` | 02 Dashboard | `/` | "Dashboard" in the sidebar (desktop) or bottom bar (phone) | Tab to "Dashboard" in the main navigation, Enter | Four tiles show active jobs, drivers on duty, fleet ready, today's revenue, and match the database |
| `jobs-create` | 03 Jobs | | | | A trip is created with all fields and appears in the list as Offer |
| `jobs-edit` | 03 Jobs | | | | Edited fields persist |
| `jobs-cancel` | 03 Jobs | | | | Cancel asks for confirmation and a reason; trip shows Cancelled |
| `jobs-search` | 03 Jobs | | | | Search and status filters narrow the list |
| `assign` | 04 Assign driver | | | | Top 3 suggestions respect all four rules; one click assigns; three clicks or fewer from dashboard |
| `status` | 05 Status updates | | | | Trip moves Offer to Completed step by step; illegal moves are not offered; tiles change without refresh |
| `drivers` | 06 Drivers | | | | Add and edit with photo, phone, class; on duty toggle changes the tile |
| `fleet` | 07 Fleet | | | | Vehicle status change updates the Fleet ready tile |
| `schedule` | 08 Schedule | | | | Today's trips in time order; driver and status filters work |
| `documents` | 09 Documents | | | | Upload, view, delete; 10 MB and file type limits enforced; link refused when logged out |
