# Dashboard progress contract — task 0081

The native Home screen reads the number of completed tasks from
`GET /api/tasks?status=completed&limit=1`. It uses the filtered `totalCount`,
not the number of records on the first page. The response must contain a
task page with `status: "completed"` records and a valid count. Goals, habits
or task-count read failures show a retry state; they do not become empty data.
The demo uses the same task status, filtering and pagination shape.

The existing Tasks screen now unwraps the endpoint's `tasks` array and uses
each record's server `status` for its completed appearance and action state.
Malformed responses and failed reads show retry instead of an empty list.
This screen remains unregistered in `App.tsx`; no navigation entry or pagination
controls were added. Its list still shows the endpoint's default first page,
while Home's completion count includes all pages.

## Verification and boundaries

`npm test` exercises the real Dashboard component, the API query, more than
50 completed tasks, a genuine empty page, malformed responses, a failed
refresh followed by retry, and the demo contract. Actual Tasks screen tests
also exercise a partial page, demo completion, malformed responses and retry.
Run `npx tsc --noEmit`
from `mobile/` to check TypeScript. Native device and live-server verification
remain release gates; these isolated tests do not establish either.

Final local result on 2026-09-29: all 59 mobile tests passed, including 10
progress/task regressions. TypeScript, Prettier for all seven changed files,
and `git diff --check` passed. Logs are recorded in the portfolio workspace
at `work/lilove-audit/task0081-evidence-progress/mobile-*-final.log`.

The change preserves mobile source `1da715e`. At branch creation,
`origin/main` was `e5dac9c`, an ancestor 17 commits behind that source;
integration of those earlier release changes remains separate work.

## Open findings outside this change

- `src/screens/profile/ProfileScreen.tsx` requests `/api/analytics`, while
  the canonical server exposes routes such as `/api/analytics/overview`.
  The profile's Analytics action navigates to Home; no dedicated native
  analytics screen is registered.
- `src/screens/avatar/AvatarScreen.tsx` reads `profile.currentLevel` from
  `/api/user/stats`; the canonical server returns `currentLevel` at the top
  level. Its demo wrapper masks that mismatch.
- `src/components/GrowthSanctuaryMobile.tsx` initializes stage 3, 2500 XP
  and four unlocked elements without an account-data read. The screen is
  registered, but no normal navigation entry to it was found. Connect it to
  verified account state or identify it explicitly as a sample before exposing it.
- Native Home has no historical chart and does not fetch stats history.
  Its existing “total streaks” remains the sum of habit streaks, not a measure
  of consecutive active days.
