# Daily focus (0092)

Home asks for an explicit active goal, displays its target outcome and the next pending/active task, and reads exactly seven local calendar days from `GET /api/progress/overview?timeZone=...&goalId=...`. Completion uses the existing atomic task endpoint; counts describe tasks the user marked complete, not verified goal achievement.

Only the selected goal ID is saved on the device, under a UID/demo-specific key. API tokens are pinned to the initiating account. Account changes invalidate reads and mutations, including A–B–A transitions. Foreground, focus and pull-to-refresh resolve the current device time zone again; UTC fallback is disclosed. Unknown completion outcomes require a successful refresh before another attempt. Partial or malformed evidence is not shown as zero.

Goals display their existing target outcome instead of an unmaintainable percentage; stored progress is unchanged. Profile removes closed new-sales prompts while preserving subscription management/restoration. AI and new subscriptions remain unavailable under their existing release policy.

## Validation and limits

The mobile suite covers exact response validation, local dates/DST, aliases and unavailable Intl, account/token races, selection persistence, deleted goals, duplicate taps, uncertain completion, timezone changes during hydration/completion, demo behavior and seven-locale card rendering. Existing subscriber management and free-account restore navigation are exercised.

Native QA uses the existing iOS development shell with an explicit in-memory fixture and disabled remote fetch. It demonstrates UI interactions, not production authentication, payment, physical-device performance, retention or willingness to pay. Backend deployment of the overview contract is required. App Store, real SSO/IAP, and paid-value validation remain separate gates.
