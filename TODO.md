# Implementation todo

Based on [Plan 0](docs/superpowers/plans/2026-10-15-plan-0-foundation.md) and the [master plan](docs/superpowers/plans/2026-10-15-just-imagine-master.md).

## First implementation batch

- [x] 1. Scaffold pnpm/Turborepo and shared TypeScript/ESLint configuration.
- [x] 2. Implement the Scene DSL v1 schema and limits.
- [x] 3. Add generated-scene validation and conversion to persisted scenes.
- [x] 4. Add the material reference table and content blocklist.
- [x] 5. Implement deterministic physics and reference validation.
- [x] 6. Apply JSON Patch atomically and validate the resulting scene.
- [x] 7. Export model JSON schemas and reject unsupported document versions.
- [x] 17a. Add lab variables, visuals, challenges, and validation.
- [x] Verify the first batch with tests, type checking, lint, and formatting.

## Second implementation batch

- [x] 8. Define plan limits, age bands, characters, spells, and WebSocket contracts.
- [x] 9. Define builder jobs, Firestore documents, and the world-source interface.
- [x] 10. Define the REST contract.
- [x] 11. Add validated sample worlds and synthetic audio helpers.
- [x] 17b. Add and validate the projectile lab fixture with the other fixture worlds.
- [x] 12. Implement the fake world source.
- [x] 13. Implement the scripted fake WebSocket gateway.
- [x] 18. Add the curated Discovery Card concept bank.
- [x] Verify protocol and fixtures together with the existing scene package.

## Remaining foundation work

- [x] 14. Add Firebase Admin, authentication, typed document helpers, and IDs.
- [x] 15. Add transactional quotas and the kill switch; test with emulators.
- [x] 16. Add CI source and verify foundation packages locally.
- [ ] Complete the Plan 0 exit checks and configure the required CI check on GitHub.

## After foundation

- [ ] A1. Browser simulation engine.
- [ ] A2. Characters and browser audio.
- [ ] A3. Child Studio and parent web app.
- [ ] B1. Conversation gateway.
- [ ] B2. World builder and asset pipeline.
- [ ] B3. Accounts, billing, and SaaS API.
- [ ] B4. Infrastructure, deployment, and operations.

## Implementation decisions

- Start with Plan 0; the web plan depends on its shared contracts and fixtures.
- Keep the existing README and planning documents; track actual progress here.
- Treat the plan's code blocks as examples to verify against the design spec.
- Share the lab variable limit between persisted and generated schemas so model output cannot bypass it.
- Add the projectile fixture when the fixtures package exists (Task 11); Task 17's earlier ordering otherwise targets missing files.
- Keep commits, pushes, pull requests, and remote configuration separate from this local implementation batch.
- Corrected the examples' floating-point mass-boundary comparison, rotation-aware bounds, prediction indexes, polygon requirements, inherited material references, patch input checks, lab reward references, and invalid migration versions; regression tests cover these cases.
- Share tier, identifier, date, and quota-limit schemas across the new protocol boundaries; reject malformed control messages and invalid path segments.
- Provide `@just-imagine/fixtures/browser` for browser consumers and `/gateway` for Node consumers, with a direct Zod dependency for scenario and script validation.
- Keep the hero asset in the final progressive update and support injected clocks and cancellation. Synthetic tone frames are paced at 20 ms; the gateway listens on loopback, handles malformed JSON, enforces one hello, and cleans up on close or process shutdown.
- Correct the projectile fixture's rubber restitution to the material table's minimum and qualify the educational copy about buoyancy, balance, acceleration, and projectile range.
- Use the JSON Patch library's default export for native Node ESM compatibility; a subprocess test reproduces the original import failure and verifies patch application.

## Verification

- Tests were run before implementation and failed for missing modules; additional regression tests were observed failing before their fixes.
- The scene package currently has 84 passing tests across 10 test files.
- Protocol has 45 passing tests; fixtures has 35. All 164 tests pass across 24 test files, including real WebSocket traffic, the native CLI, and graceful SIGTERM shutdown.
- Frozen offline installation, formatting, lint, and type checks pass across the workspace. Package test suites were run separately so WebSocket integration tests could run with local TCP access.
- Scene schemas, protocol, and `fixtures/browser` bundle for the browser without Node polyfills.
- Local runtime: Node 25.8.0. The workspace declares Node >=22.12.0 and pins pnpm 10.34.7.

## Full-development follow-through

- [x] Implement all seven application/service package entry points.
- [x] Verify real/fake Next builds and four local browser flows.
- [x] Create durable account/child/world deletion jobs and writer fences.
- [x] Make patch commits and session metering idempotent.
- [ ] Finish engine and web/audio review fixes.
- [ ] Finish builder asset processing, evaluations, and operational telemetry.
- [ ] Run whole-workspace lint/typecheck/tests/build and final review.
- [ ] Credentialed staging models/payments/load test and real-device acceptance.

`CHECKPOINT.md` and `docs/handoff/` contain current evidence and known gaps; unchecked release items are not claims that source is absent.
