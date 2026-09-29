# Native stats and coach availability — task 0082

Profile and Avatar now read the canonical server's flat `GET /api/user/stats`
response. Profile uses `streakCount` and `totalGoals`; Avatar uses `currentLevel`.
The shared parser validates those fields and preserves the signed XP ledger
total. A missing response or the obsolete nested `profile` wrapper is an error,
not zero progress or level one. Demo stats use the same flat shape, with goal
counts derived from the current demo records.

Profile reloads on focus and exposes retry after a failed read. Its former
“Analytics” action is now “Track your progress” and opens the registered Home
tab, which contains progress counts. Avatar's initial reads no longer replace
failed requests with empty ownership data or an invented level; a generic
error and retry remain visible until those reads succeed.

The canonical contract was inspected in `server/routes.ts` at source `97a1076`
(`/api/user/stats`, `/api/avatar`, avatar zones/traits/equipment and
`/api/environment`). `server/storage.ts` explicitly converts the XP sum to a
number. The mobile branch preserves release source `fd4dd41`, stacked on
`Codex/task-0081-evidence-progress`; freshly fetched main `e5dac9c` was its
ancestor, 18 commits behind.

Coach checks authenticated `GET /api/ai/capabilities` before requesting an
insight or starting a conversation. `{available:false, code:"AI_UNAVAILABLE"}`
shows a localized unavailable notice, retry and a working Goals action.
Malformed capabilities and failed checks also keep generation closed. Draft
text remains editable and is preserved when availability changes or a request
fails with `503 AI_UNAVAILABLE`; only a successful answer clears a sent draft.
Chat and daily insight requests do not automatically retry. Demo capabilities
are unavailable and trigger no generation. The six translated locales use the
reviewed local-model copy; all seven locales include these messages. No notice
suggests that buying a subscription restores server availability.

Native QA found untranslated tab labels, a technical `MainTabs` back label
and a stale `v1.0.0` Profile footer. Tab labels now use the locale catalog;
Avatar's full, truncated and accessibility back labels are localized. Goals
and Habits reuse existing keys; four short navigation keys cover the missing
Home, Coach, Profile and Back labels. The footer reads the same Expo version
and iOS build-number source as Settings. The persistent demo banner reuses the
existing translated sample-data notice.

## Remaining release boundaries

- Growth Sanctuary still contains fixed stage 3, 2500 XP and four unlocked
  elements. A translated sample-data notice is now always visible. No new
  navigation entry was added; its Back action still works. Its five-stage
  thresholds and element identifiers differ from the server environment's
  level/XP/unlocked-element schema, so mapping it to account data requires a
  separate implementation. Its unlock cards do not perform purchases.
- No native analytics history screen was added. The corrected progress menu
  opens existing Home counts and does not claim historical analytics.
- Component/API tests isolate device services and network. A signed native
  build and authenticated staging-device verification remain release gates.
  No IAP, payment, deployment or paid-provider configuration changed.
- AI generation remains unavailable in the companion server change until
  metering and hard cost controls are implemented. The native capability check
  reflects that policy; it is not itself a spending control.
- Mixed language in the Goals modal and Avatar field labels was a separate
  gate at this checkpoint. Task 0083 addresses interface labels in
  [native-copy.md](native-copy.md); server trait names/descriptions still need
  a localized catalog contract.

## Verification

The focused tests execute the actual Profile, Avatar and Growth Sanctuary
components, Coach, the API methods and the demo adapter. They cover flat counts,
level display, malformed/failed reads, recovery, refocus, the real Home route,
the sample notice/Back action, fail-closed capability checks, preserved drafts,
manual Goals navigation and no automatic generation retries. Full mobile tests and type/format results
are recorded in `work/lilove-audit/task0082-release/mobile-*-final.log` in the
portfolio workspace.

Final local result on 2026-09-29: 74/74 mobile tests passed, including 15 new
native-contract tests; TypeScript, formatting of all 18 changed files and
`git diff --check` passed. These results do not certify a native build or release.
