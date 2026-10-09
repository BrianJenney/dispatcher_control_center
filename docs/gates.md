# Gates

## Gate A: foundations

- [ ] Schema reads cleanly: tables, relations, constraints
- [ ] Open questions in T2 answered
- [ ] Transition table matches the brief exactly
- [ ] Illegal transition rejected by the database with the app bypassed
- [ ] Overlapping assignment rejected by the database
- [ ] Paved path example shows one read, one write, one form, one confirm
- [ ] Each banned pattern fails lint
- [ ] `pnpm verify health` produces evidence

## Gate B: nine features (automatic)

- [ ] One passing e2e test per required feature, 01 to 09
- [ ] Verification evidence for every flow at phone and desktop width
- [ ] Feature map covers every route
- [ ] Dashboard tiles change within one polling interval after a status move, a duty toggle, and a vehicle status change
- [ ] Assign a driver in three clicks or fewer, and by keyboard alone
- [ ] Logged out request to every protected route and every document link is refused
- [ ] No console errors in any flow

## Gate C: ship

- [ ] Lighthouse performance strong on dashboard and jobs, phone profile
- [ ] No layout shift on load or on polling updates
- [ ] axe report reviewed, serious issues fixed
- [ ] Mutation survivors in `src/domain` reviewed
- [ ] Jobs list and dashboard stay fast against the 100,000 trip seed
- [ ] Break tests pass: double submit, stale tab, concurrent assign
- [ ] Production deploy from `main`, preview environments isolated
- [ ] Sentry and Better Stack alerts fire in a test
- [ ] Backup restore drill done and written up
- [ ] No secrets in repo history
- [ ] README complete, time log and AI disclosure accurate
