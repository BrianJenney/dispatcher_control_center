---
name: verify
description: Run the app and collect evidence that a change works. Use before calling any task done, when reproducing a bug, and when checking performance or accessibility.
---

# Verify

You do not claim a change works. You show it. This skill has two parts: a CLI that drives the app the same way every time, and a feature map that says how a user reaches each feature.

## The CLI

`scripts/verify/cli.ts`. Flows live in `scripts/verify/flows.ts`, one entry per row of the feature map.

```
pnpm verify <flow>               Run one flow from the feature map
pnpm verify --all                Run every flow
pnpm verify <flow> --phone       Phone width only (375px)
pnpm verify <flow> --skip-build  Reuse the last production build while iterating
pnpm verify <flow> --load        Measure against 100,000 extra historical trips
```

Each run:

1. Starts a fresh database (`dispatch_verify`) and seeds it, and reseeds the demo day before each width so phone and desktop start from the same data (with `--load` the 100,000 trip database is seeded once and kept)
2. Builds the app and boots it with `next start` on port 3200
3. Logs in as the demo user
4. Drives the flow with Playwright
5. Writes evidence to `.verify/<flow>/`

Evidence written per flow:

- `<NN-step>/phone.png`, `<NN-step>/desktop.png` at each step, taken once animations settle
- `console.json`: any console errors or warnings
- `axe.json`: accessibility findings
- `lighthouse.json`: performance, accessibility, best practices (phone uses the Lighthouse mobile profile), plus `lighthouse-<viewport>.html`
- `timings.json`: server response times per request
- `summary.md`: pass or fail per step, in plain words
- `.verify/server.log`: the app's own output for the run

A run fails when a step fails or the console logs an error. axe and Lighthouse findings are reported, never blocking.

Never write a one off script to check something. If the CLI cannot do it, extend the CLI.

## The feature map

`feature-map.md` in this folder. It lists every feature, the route, how a user gets there by click and by keyboard, and what should be true when it works. When a request is vague ("the tile is wrong"), find it in the map first.

When you add or change a route or flow, update the map in the same commit. CI fails if a route is missing from it.

## Reporting

Paste `summary.md` into your final message, and name any finding in `console.json`, `axe.json` or `lighthouse.json` that you did not fix, with the reason.
