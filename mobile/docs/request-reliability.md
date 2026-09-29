# Request reliability — task 0090

The mobile API client retries only GET and HEAD. POST, PATCH, PUT and DELETE
are sent once, even when a caller supplies a retry option. A timeout or lost
response does not establish that the server rolled back a mutation. Until
the server supplies idempotency guarantees, silently replaying a write can
create duplicate goals or repeat task rewards.

Each operation captures its authorization token once. Read retries preserve
that account instead of acquiring a different token after an account switch.
The request-specific retry budget is honored; the default remains three
retries with a 30-second deadline per attempt and the existing exponential
backoff. This can wait through a Free Render cold start without extending a
single request deadline. It is not an availability guarantee.

The deadline remains active through response-body consumption and is cleared
in `finally` on every attempt. Native fetch TypeError failures are classified
as network errors; serialization or JSON decoding errors are not treated as
network failures. HEAD does not try to decode an absent JSON body. Demo
requests remain local.

An ambiguous mutation failure carries `outcomeUnknown` while preserving its
HTTP status and machine-readable error code. Goals and Tasks use the reviewed
seven-language message telling the user to refresh and check the result before
trying again. Draft fields remain available; the UI does not automatically
resubmit them. This does not make a later manual duplicate action impossible.

## Validation and remaining gates

The actual TypeScript API is exercised with mocked fetch and clocks. The
regressions cover every unsafe HTTP method, timeouts before and during body
reads, network failures, server/auth error codes, token pinning, per-request
retry budgets, safe cold-start recovery, HEAD and demo. Actual screen tests
cover uncertain goal create/edit/delete and task create/complete messages and
draft preservation. Evidence logs are held in the portfolio workspace at
`work/lilove-audit/task0090-request-reliability/`.

Final local verification: 206 mobile tests passed, including 14 request-engine
regressions and three added screen/localization cases; TypeScript, changed-file
Prettier and `git diff --check` passed. No lint command is configured in the
mobile package. The first typecheck's nullable-error diagnostics were fixed;
that failed log is retained. Native QA from task 0089 remains evidence only
for source `7c2b216`, not for this request-engine change.

The initial pre-fix run failed the four unsafe-method cases; a pending timeout
case caused the remaining tests to be cancelled. That failed record is kept.
Passing tests on the final source are recorded separately. These mocks do not
prove live Render timing or native-device behavior.

**P1 server gate:** the current task-completion route
(`server/routes.ts`, `/api/tasks/:id/complete`) updates an already completed task
and calls `gamificationService.awardXP` again. `awardXP` inserts another XP
transaction without a task/source uniqueness check. Disabling mobile automatic
replay reduces exposure but does not fix manual retries or multiple clients.
The server needs atomic completion/reward idempotency and concurrent replay
tests in a separate change. Goal creation can similarly commit its insert and
then return 500 after notification failure. Avatar unlock's coin deduction and
ownership writes are also separate. No server or purchase-ledger changes are
part of this mobile PR; the trusted Apple ledger has its own transaction replay
protection.

TasksScreen remains unregistered in navigation. Existing release, real SSO,
StoreKit, account-history and production infrastructure gates stay open.
