# Direction check, 2026-10-16

Four read-only reviews of branch `feat/full-development` at `ba020da` against the spec. Detailed reports with file and line references sit beside this file. CI on PR #1 is green (format, lint, typecheck, unit and emulator tests).

## Verdict

The build is going in the right direction. Every boundary goes through the shared contracts, the contracts match Plan 0 name for name, the engine implements the whole closed vocabulary on real Rapier, and both services implement the spec's lifecycles end to end with emulator-backed tests. Three things decide whether this becomes a winning submission, in this order:

1. **Nothing has ever touched Vertex AI.** Both the builder and the gateway send JSON Schemas with keywords outside Vertex's documented subset and bypass `toGeminiJsonSchema`, and the gateway swallows a failed Live setup. The first real call is likely to fail silently. A staging project and one smoke call unblock everything downstream.
2. **The child Studio is a form, not a stage.** The architecture is right, but judges will see a scrolling page with orange rectangles and a grey blob. The spec's full-bleed stage, cast strip, listening state, summon and spell presentation do not exist yet. This is the work Claude Code is taking now.
3. **The flagship jelly dragon cannot earn its Discovery Card.** Soft-body lattice bodies carry about 40 percent of their document mass and receive impulses on one of nine nodes, so the `bounce` rule's impulse threshold is never reached and a flick barely moves the dragon.

## Completion by area

| Area | Estimate | Owner now |
|---|---|---|
| Shared packages (scene-schema, protocol, fixtures, server-core) | 95% | done |
| API and billing | 80% | Codex |
| Builder | 70% | Codex |
| Gateway | 65% | Codex |
| Web app | 55% (functional 70%, child-facing design 30%) | Claude Code (Studio), Codex (parent area) |
| Engine | 60% | Codex |
| Characters and audio | 40% (audio core done; cast, summon, Rive layer missing) | Claude Code (stage presentation), Codex (package) |
| Infrastructure | 55% (validates; cannot deploy) | Codex, then whoever holds GCP credentials |
| Whole project, weighted | about 60% of the code, about 40% of the submission | |

## Priority fixes handed to Codex (its areas)

- P1 builder: route `responseJsonSchema` through `toGeminiJsonSchema` (`services/builder/src/vertex.ts:56`); same for gateway tool declarations (`services/gateway/src/tools.ts:35`).
- P1 gateway: surface Live setup failures instead of swallowing them (`services/gateway/src/gateway.ts:236-238`); tell the character about the quota warning (spec 8.9); version the prompt files (spec 9.2).
- P1 engine: soft-body mass and impulse distribution so `bounce` fires on the jelly dragon fixture (engine report, defect 1).
- P2 api: return 404, not 403, for another parent's world (`services/api/src/store.ts:124`); remove `builderJobs` on account deletion (`services/api/src/deletion.ts:72-100`).
- P2 builder: patch flow retry with issues, 16:9 backdrops, model fallback per session.
- P2 infra: staging pipeline with Playwright gate and manual promotion, Workload Identity Federation, Firestore indexes, App Hosting backend, budget alert.

## External gates that block everything else

GCP staging project with Vertex AI and `gemini-3.8-live` access, Stripe test keys and a Family price, the six character art assets, two child usability sessions, a load test from the judging location.
