# Builder, evaluations, and Lab fixtures

Implemented locally on 2026-10-15. No cloud model calls or deployment were performed.

## Source changes

- `services/builder/src/prompts/v1.ts` supplies the actual material ranges, all three age-band guides, child-safety policy, physics rubric, and six fixture-derived structured-output examples. The build pipeline enforces the supported `v1` prompt version rather than silently executing a different prompt version.
- `services/builder/src/vertex.ts` falls back from the configured scene model to the configured fast model when a model request, empty response, or JSON parsing fails. Subsequent scene requests for that session use the fast model; other sessions remain independent. Session tracking is bounded at 1,000 entries. Both calls retain JSON schema, timeout, and safety settings.
- `services/builder/src/fallback.ts` exports `nearestConceptFixture(job)`, returning `{ fixtureKey, doc }`. It ranks cached curated fixtures by requested concept overlap, filters to the requested tier, clones the selected document, sets the requested world ID, and revalidates. `SceneValidationError` identifies the two-invalid-scenes failure in the pipeline. Worker integration is owned by the parent task: mark the failed build and offer this cached fixture through the existing world update path.
- `LAB_WORLDS.galtonBoard` and `LAB_WORLDS.fractionsLab` are additive exports from fixtures/browser. The original four `FIXTURE_WORLDS` keys remain unchanged. Galton has ten staggered pegs, four bins, automatic and button-driven ball release, a live landing histogram, a speed variable, and a six-landings challenge. Fractions has physical whole/half bars, repeated split/recombine rules using existing spawn/remove actions, a collision challenge, and bar/pie reference visuals. No schema extensions were necessary.
- The evaluation corpus contains 50 distinct imagination requests covering all 19 concepts, both tiers, all age bands, and five explicit unsafe-request redirections. Each case declares expected concepts, tier, age, safety expectation, and targeted forbidden output terms.
- The evaluation runner supports a deterministic fixture double, supplied recorded generated outputs, and an explicitly selected real Vertex mode. Reports include validity rate, concept-tag recall, safety hits, per-case diagnostics, attempts, prompt version, model names for real runs, and limitations. Thresholds are validity >=98% and zero safety hits. Concept recall is reported without inventing an unspecified threshold.
- `.github/workflows/evals.yml` runs offline evaluation for relevant pull requests and adds nightly/manual staging Vertex evaluation with WIF authentication and uploaded reports. Staging requires repository/environment variables `GCP_PROJECT_ID`, `SCENE_MODEL`, `FAST_MODEL`, `WIF_PROVIDER`, and `EVAL_SERVICE_ACCOUNT`.

## Verification

- Builder Vitest: 13 tests passed, including model fallback/session isolation, six valid few-shot examples, nearest-concept selection, all-concept corpus coverage, honest double metrics, and negative evaluation cases.
- Fixtures Vitest: 36 tests passed, including both new Labs with zero schema/physics-validator issues, fractions area conservation, and unchanged original catalog keys.
- Builder and fixtures TypeScript checks passed.
- ESLint passed on all added/changed builder source and tests.
- Offline 50-case report: `docs/handoff/builder-eval-offline.json`; validity 100%, concept-tag recall 79%, lexical safety hits 0. The 79% recall reflects that six fixture doubles cannot faithfully generate every requested concept. It is a plumbing baseline, not a model-quality result.

## Running evaluations

```sh
pnpm --filter @just-imagine/builder eval:offline
pnpm --filter @just-imagine/builder eval --mode recorded --recordings /absolute/path/recordings.json
GOOGLE_CLOUD_PROJECT=staging-project SCENE_MODEL=configured-scene-model FAST_MODEL=configured-fast-model pnpm --filter @just-imagine/builder eval:vertex
```

Recorded input is a JSON object keyed by `imagination_01` through `imagination_50`; each value is a raw generated scene (materials array, no world identity or asset fields). Missing recordings become explicit failed cases. `--output /path/report.json` overrides the report destination. Direct real-mode CLI calls require both `--mode vertex` and `--allow-cloud`; the `eval:vertex` script supplies these intentionally.

## Remaining evidence

Credentialed staging evaluation, semantic/human safety review, and real-model concept accuracy remain unverified. Lexical safety checks are a deterministic backstop, not a complete content-safety evaluation. Engine play-through and web selection are being handled by the parent task; fixture schema/physics validation alone does not establish a working classroom interaction. Probability results are finite-sample observations, not a claim that six samples approximate a theoretical distribution. Fraction overlays are reference representations; existing schema mechanics split/recombine physical bars.
