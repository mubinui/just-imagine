# Implementation todo

Current handoff: [CHECKPOINT.md](CHECKPOINT.md). Historical evidence and scoped reports: [docs/handoff/](docs/handoff/). Source coverage is distinct from staging/release acceptance.

## Implemented locally

- [x] Plan 0: workspace/config, Scene DSL/physics validation, protocol/REST, fixtures/fake gateway, Firebase core, quotas and CI source.
- [x] A1: Pixi/Rapier engine, interactions/rules/dials, variables/visuals/challenges, progressive assets, lifecycle and review regressions.
- [x] A2: PCM capture/playback, unlock/barge-in/reconnect, character adapter and six fallback character presentations.
- [x] A3: auth, profile picker, Studio/gallery, parent management, accessibility and browser flows.
- [x] B1: authenticated Live gateway, tools, pacing/quotas, summaries, session lease/metering and model adapter.
- [x] B2: scene/patch builder, safe image/collider pipeline, caching/progressive publishing, prompts/evals and extra Labs.
- [x] B3: account/profile/world API, test billing/webhooks, durable deletion/retry/writer fences.
- [x] B4: Terraform/Docker/CI/Cloud Build source, telemetry/dashboard/alerts/CDN option, load and evaluation scripts.
- [x] Close the initial engine/backend/web lifecycle and concurrency review findings with regressions.
- [x] Keep approved cream/forest palette and apply Impeccable judge-facing polish.
- [x] Add playable landing gravity experiment, refined explorer/parent flows, and honest empty states.
- [x] Integrate local dragon/cloud/meadow art with provenance; preserve teammate's Studio.
- [x] Persist preview Discovery Cards per child and remove them with child/account deletion.
- [x] Fix direction-review soft-body/flick/spawned rendering/facing/collider issues.
- [x] Fix backend schema adapter, patch repair, quota wrap-up, operational failure diagnostics, deletion jobs and foreign-world404.
- [x] Run the original seven browser flows and scoped package verification for these changes.
- [x] Refine all six SVG characters, stable selection sizing, responsive Studio geometry and accessible compact controls.
- [x] Complete the five-viewport interaction regression and record character/layout evidence.
- [x] Enrich all six preview worlds with appropriate art, larger objects, explicit play actions, readable measurements and real simulation feedback.
- [x] Fix tap/drag dispatch, preserve settings on retry, verify hollow-cup collisions and repeated fraction recombination.
- [x] Pass 9 browser flows, 45 engine tests and 17 web tests; capture six worlds on desktop and mobile.
- [x] Finish full-workspace verification and final fixed-step engine checks; record exact evidence in CHECKPOINT.

- [x] Add optional parent-photo companion service and ready-made friend setup with personal names.
- [x] Preserve the companion/voice session across child screens and add bounded Gemini navigation tools.
- [x] Verify photo ownership, input limits, attempt limits, concurrent/deletion fences, and same-session navigation.

## Remaining implementation / acceptance work

- [ ] Connect Gemini credentials and verify real parent photo→chibi generation, generated-art quality and Gemini3.8Live microphone/navigation behavior.
- [ ] Implement the Docker Compose/local service adapters discussed in the local full-stack feasibility check.

- [ ] Review bounded backend follow-through in `docs/handoff/backend-direction-fixes.md`: safe parallel moderation/tool gating, Live transport lifecycle coverage, permanent/transient task classification and asset failure diagnostics.
- [ ] Implement explicit buoyant-flag behavior and automatic splitting for breakable materials; density-based buoyancy alone does not cover the spec.
- [ ] Decide whether richer measurement visuals/replay API are required for the submission; see engine direction report.
- [ ] Supply final Rive assets and recorded reaction clips; verify browser/device playback and character state-machine inputs.
- [ ] Provision staging Firebase/GCP/Vertex/ADC and verify actual model availability/configuration.
- [ ] Exercise real voice→generated world→interaction→summary, reconnect/handoff, quotas and deletion end-to-end.
- [ ] Configure Stripe TEST price/keys/webhook and run real test checkout, reconciliation, portal and cancellation.
- [ ] Apply Terraform and verify IAM/URLs, App Hosting env, CDN/DNS/certificate, monitoring notification channels.
- [ ] Configure required GitHub CI and separate approval-controlled staging/production image promotion.
- [ ] Run credentialed model evaluations,200-session load and device speech-latency/frame-rate acceptance.
- [ ] Complete child usability sessions and production policy/release review.

Do not infer production readiness from completed source checkboxes. The preview uses local samples and synthetic voice, and does not accept payments.
