export const tourStorageKey = "dispatch-tour-done";

export type TourHref = "/" | "/schedule" | "/jobs" | "/insights";

export type TourTarget = "kpis" | "needs-driver" | "nav-jobs" | "nav-schedule" | "nav-insights";

export type TourStep = {
  title: string;
  body: string;
  target?: TourTarget;
  link?: { href: TourHref; label: string };
};

export const tourSteps: readonly TourStep[] = [
  {
    title: "Welcome to Dispatch Lite",
    body: "A one-minute look at your day. Skip it any time.",
  },
  {
    title: "Your four live numbers",
    body: "The four tiles on the dashboard show active jobs, drivers on duty, fleet ready and today's revenue. They refresh by themselves every few seconds.",
    target: "kpis",
    link: { href: "/", label: "Open the dashboard" },
  },
  {
    title: "Give a trip a driver",
    body: "Trips waiting for a driver sit under Needs a driver. Press Assign driver, then Assign beside the best match. Suggestions are on duty, free at that time, and have the fewest trips that day.",
    target: "needs-driver",
    link: { href: "/", label: "Find trips that need a driver" },
  },
  {
    title: "Move trips along",
    body: "Start trip and Complete trip move a booking through its steps. Cancelling always asks for a reason first, so nothing is lost by accident.",
    target: "nav-schedule",
    link: { href: "/schedule", label: "Open the schedule" },
  },
  {
    title: "Book, search and export",
    body: "Jobs is where you book, edit and search trips, and export them to a spreadsheet.",
    target: "nav-jobs",
    link: { href: "/jobs", label: "Open jobs" },
  },
  {
    title: "Keep watch",
    body: "Insights shows what needs attention, and its Activity log shows who changed what.",
    target: "nav-insights",
    link: { href: "/insights", label: "Open insights" },
  },
];
