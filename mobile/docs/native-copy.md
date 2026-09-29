# Native interface copy — task 0083

This change preserves mobile release source `f303301`. Freshly fetched main
was already its ancestor, 19 commits behind; `git merge --ff-only origin/main`
reported no changes before creating `Codex/task-0083-native-copy`.

Goals now localizes its create/edit modal, category choices, status labels,
section headings and delete confirmation. Display labels are mapped from the
existing server identifiers. Creating a goal still sends `status: active` and
`progress: "0"`; editing preserves the existing status and progress by omitting
those fields, as before. User titles, descriptions and outcomes stay untouched.

Avatar localizes all 25 known field names and six rarity labels, including
equipped field labels and the purchase modal. Level, the extra equipped-item
count, the default description and the coin accessibility label use localized
copy. Zone IDs, trait IDs, unlock types, rarity identifiers and category IDs
still drive the same behavior and API requests. Unknown field names fall back
to the server label. The Profile free-plan entry now says “Choose Your Plan”
instead of promising unlimited access; the existing Premium action is unchanged.

The 45 missing English keys were translated into Turkish, German, French,
Spanish, Italian and Japanese by the local Qwen model. The candidate was
reviewed before adoption. Corrections include a Turkish mistranslation of
“scars”, distinct rarity tiers, and clearer clothing/facial-hair labels.
Existing keys were reused where available. Source, raw candidate, reviewed
copy and correction evidence remain under
`work/local-efficiency/task0083-native-copy/` in the portfolio workspace.

## Verification and remaining gates

- The 18 focused native-contract tests pass, including three new tests across
  all seven locales. They exercise actual Goals create/edit controls and
  payloads, all Avatar fields and rarity labels, equipment IDs, modal text and
  the Profile plan action. TypeScript passes. The first run had a test fixture
  ID typo; its failure log is preserved alongside the passing result in
  `work/lilove-audit/task0083-native-copy/`.
- Server-authored trait names and descriptions remain server content. They
  need a separate localized catalog contract. Unknown future field/category
  labels also retain their source text rather than guessing a translation.
- Avatar trait-fetch/equip/purchase failures still use their existing handling;
  this copy change does not add purchase behavior or certify those flows.
- App navigation, native configuration, SSO and IAP were outside this UI scope.
  The combined branch also contains a separate session-correctness change;
  final full-suite and simulator evidence must cover that final source.
- The earlier Growth Sanctuary sample-data boundary, unavailable AI generation,
  authenticated QA, native build, stable Cloud distribution and App Store/IAP
  release gates remain open. Local component tests are not a release claim.
