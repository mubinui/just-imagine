# Plan 0 foundation implementation

Scope: tasks 14–16 on `feat/full-development`. No commits, pushes, cloud writes, deployment, branch protection changes, or production credentials were used.

Implemented Firebase Admin initialization, revoked-token verification with a typed authentication error, schema-validated document reads/writes and transactional partial updates, monotonic lowercase prefixed ULIDs, daily transactional quotas, and the runtime kill switch. Added emulator configuration, Firebase CLI dependency and lockfile, and a GitHub Actions `ci` job with Node 22 and Java 21 running frozen installation, formatting, lint, typecheck, and tests.

Quota writes validate caller IDs, dates, plan tiers, finite nonnegative increments, safe integer counters, stored schemas, and stored UID/date identity. Voice usage keeps integer rounding and may exceed the daily allowance; malformed increments reject instead of corrupting usage. Images require integer increments. Kill switch is off for a missing document and on for malformed documents, read errors, and watcher errors.

## Verification

Tests were written before implementation. The first actual Firestore/Auth emulator run started successfully with Java 21 and failed to collect all five suites because the implementation modules did not exist. Typecheck and lint passed after implementation. Final actual emulator run passed all 36 tests across six suites in approximately 34 seconds. All ten concurrent last-unit cases passed consecutively, each with exactly one fulfillment and one `QuotaExceeded` rejection. Scoped formatting also passed.

Emulator suite includes real Auth custom-token exchange and verification, Firestore document operations, daily rollover, voice overdraft, image totals, invalid increments, corrupt stored identity/schema, malformed kill-switch state, watcher notifications, and ten separate concurrent last-world reservation cases. Error-path watcher/read tests use isolated mocks; normal paths use emulators.

Local runner (pnpm was absent):

```sh
CI=true npm exec --yes --cache .npm-cache --package pnpm@10.34.7 -- pnpm install --no-frozen-lockfile
JAVA_HOME="$PWD/.tools/amazon-corretto-21.jdk/Contents/Home" PATH="$PWD/.tools/amazon-corretto-21.jdk/Contents/Home/bin:$PATH" npm exec --yes --cache .npm-cache --package pnpm@10.34.7 -- pnpm --filter @just-imagine/server-core test
npm exec --yes --cache .npm-cache --package pnpm@10.34.7 -- pnpm --filter @just-imagine/server-core typecheck
npm exec --yes --cache .npm-cache --package pnpm@10.34.7 -- pnpm --filter @just-imagine/server-core lint
```

The machine initially had Java 17. Downloaded Amazon Corretto 21 to ignored `.tools/amazon-corretto-21.jdk`; CI installs Temurin 21. Firebase CLI resolved to 14.27.0; Firestore emulator resolved to 1.19.8. Full emulator output is in ignored `.tools/foundation-tests.log`.

## Deviations and remaining external gates

Used `monotonicFactory` instead of the example's plain `ulid` to guarantee same-millisecond ordering. Invalid quota input/storage is rejected. Kill-switch malformed/read-error behavior fails closed. Concurrency repeats are ten individual parameterized tests rather than ten full emulator restarts. Raised emulator test timeout to 60 seconds because real Firestore pessimistic lock contention exceeds Vitest's default five seconds; the initial short-timeout run was interrupted and emulators restarted to avoid outstanding transactions contaminating later cases.

GitHub Actions execution and required-check/branch-protection configuration remain unverified because no push or repository-settings mutation was authorized. Parent agent owns whole-workspace integration verification while other packages are implemented. Emulator server-core tests exercise Admin access, not Firestore client security rules; those belong to the API/security workstream.
