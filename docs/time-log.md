# Time log and AI disclosure

## Hours by day

Commit counts and times come from `git log` and are facts. The hours column is the developer's own estimate of hands-on time; it is not derived from commits, because an AI agent wrote most commits while the developer reviewed and directed.

| Day (UTC) | Commits | First commit | Last commit | Hands-on hours |
|---|---|---|---|---|
| 2026-10-07 | 73 | 16:10 | 23:41 | |
| 2026-10-08 | 4 and counting | 00:02 | 14:41 | |

Regenerate the commit columns with:

```
git log --no-merges --date=format:'%Y-%m-%d' --pretty='%ad %s'
```

## AI tools used and for what

| Tool | Used for |
|---|---|
| Claude Code, Anthropic's coding agent, running several Claude models over the build. Each commit it wrote names the exact model in its Co-Authored-By line, which is the accurate record | Wrote almost all application code, tests, SQL migrations, CI configuration, verification scripts and documentation, working from `docs/brief.md`, `CLAUDE.md` and `docs/tasks.md`. Ran the test suites and verification flows and fixed what failed. |
| Claude Code subagents | A reviewer agent (`.claude/agents/gardener.md`) checked changes for patterns that would spread. Short-lived worker agents handled separate pieces of work, such as the menu fix, the theme change and a pricing study, in separate working copies that were merged by hand. |
| Claude Code with provider APIs | Created and configured the Vercel project, the Neon project and branches, the Cloudflare R2 buckets, the Sentry project, alerts and dashboard, and the Better Stack monitors, using access tokens the developer supplied. |
| shadcn/ui CLI | Generated the UI primitives under `src/components/ui`. |

No full app generator (Lovable, Bolt, v0) was used. No code or images were copied from the reference app.

## What the developer did

- Set the scope, rules and locked technology choices, and approved each gate.
- Answered the open design questions (trip end time, who can edit, reassignment, time zone).
- Created the accounts and tokens for the hosting and monitoring services.
- Tested the app locally and reported problems that led to fixes (phone layout, side menu, theme choices, keyboard use).

## Human review

The developer reviewed behaviour in the browser at phone and desktop sizes, reported problems, and decided every change of scope. The structure, rules and checks that keep the agent on track (`CLAUDE.md`, the lint rules, the database rules, the gates and the verify flows) are how the build was run; "Where to look in the code" in the README is the map for reading it.
