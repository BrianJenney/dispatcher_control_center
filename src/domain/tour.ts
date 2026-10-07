export const tourStorageKey = "dispatch-tour-done";

export type TourHref = "/" | "/schedule" | "/jobs";

export type TourStep = { title: string; body: string; link?: { href: TourHref; label: string } };

export const tourSteps: readonly TourStep[] = [
  {
    title: "Welcome to Dispatch Lite",
    body: "A quick tour of what you will do every day. It takes under a minute, and you can skip it at any time.",
  },
  {
    title: "Today at a glance",
    body: "The four tiles on the dashboard show active jobs, drivers on duty, fleet ready and today's revenue. They refresh by themselves every few seconds.",
    link: { href: "/", label: "Open the dashboard" },
  },
  {
    title: "Give a trip a driver",
    body: "Trips waiting for a driver sit under Needs a driver. Press Assign driver, then Assign beside the best match. Suggestions are on duty, free at that time, and have the fewest trips that day.",
    link: { href: "/", label: "Find trips that need a driver" },
  },
  {
    title: "Move trips along",
    body: "Start trip and Complete trip move a booking through its steps. Cancelling always asks for a reason first, so nothing is lost by accident.",
    link: { href: "/schedule", label: "Open the schedule" },
  },
  {
    title: "Book, search and keep watch",
    body: "Jobs is where you book, edit and search trips, and export them to a spreadsheet. Insights and Activity show what needs attention and who changed what.",
    link: { href: "/jobs", label: "Open jobs" },
  },
];
