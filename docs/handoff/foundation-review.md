# Foundation review: Plan 0 tasks 14–16

Reviewed the supplied diff, the current server-core source/tests/configuration, firebase.json, CI workflow, protocol usage/path schemas, and foundation implementation report against plan lines 3314–3877. No tests were rerun. No implementation files were changed.

## Findings

No critical or important code defects found in this scope.

## Spec verdict

Tasks 14 and 15 satisfy their functional contracts. Task 16's workflow is implemented as specified; actual GitHub execution and required-check/one-review branch protection remain external, unverified completion gates. The report accurately records those limits. Whole-workspace command success is not established by the scoped report.

Document reads and writes validate schema outputs; partial updates merge and validate inside a Firestore transaction (`packages/server-core/src/docs.ts:38`). Quota reads, identity/schema checks, limit decisions, and writes occur inside the same retryable transaction (`packages/server-core/src/quota.ts:48`). The callback has no external side effects, and concurrent callers cannot both consume the final world allowance. UTC rollover derives the document key once per operation. Voice usage can exceed its allowance and return a negative remainder.

The implementation deliberately strengthens the example: monotonic ULIDs, rejected invalid quota inputs, validation of the proposed usage before writing, and kill-switch fail-closed behavior for malformed state and read/listener errors. These changes are consistent with the intended safety and ordering guarantees. The phrase “never throws” for voice usage must be understood as no quota-exhaustion exception; invalid inputs, corrupt storage, and infrastructure failures can reject, as documented in the handoff.

## Quality verdict

Approve the reviewed implementation. Auth verification delegates to Firebase Admin with revocation checking enabled (`packages/server-core/src/auth.ts:13`) and wraps failures as AuthError. Stored usage schema and UID/date mismatches reject without overwriting the corrupt record (`packages/server-core/src/quota.ts:26`). All quota mutations share the same transaction helper, protecting independent counters from lost updates. Missing kill-switch configuration is off; malformed configuration and read/listener failures are on (`packages/server-core/src/kill-switch.ts:4`). The watcher returns the Firestore unsubscribe function.

## Evidence and limits

The supplied `.tools/foundation-tests.log` ends with six passing suites, 36 passing tests, duration 34.55 seconds, and successful emulator shutdown. Source inspection confirms ten parameterized last-unit races, each asserting one success and one QuotaExceeded. This supports the concurrency requirement without ten complete emulator restarts. The report states scoped typecheck, lint, and formatting passed; these were not independently rerun.

Coverage includes real Auth emulator token exchange, invalid tokens, schema writes/reads, partial updates, rollover, voice overdraft, images, invalid increments, corrupt stored usage, and normal/error kill-switch paths. Revoked/disabled-token behavior is delegated correctly but lacks a dedicated regression test. Document tests do not explicitly exercise concurrent partial updates or malformed stored reads; the implementation uses the correct transaction/schema pattern. These are optional coverage improvements, not blockers. Emulator Admin tests do not validate client Firestore security rules.
