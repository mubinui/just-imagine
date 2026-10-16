# Story, stage and specialists — teammate handoff

## Try the running experience

Open http://localhost:3300. Sign in with `parent@justimagine.test` / `ImaginePlay!2026`, choose **Ari**, then **Learn → Katha’s story room** (Bangla: কথার গল্পঘর). The enlarged companion portrait also opens navigation; its visible Explore label is removed. The real demo book **নীল ও কথার কল্পনার মহাকাশ অভিযান** has six generated illustrations and six scenes. Open a book, tap narration, discover the pictured fact and choose a response; questions pause reading. The default “Read the scene together” advances only after real queued playback drains, and stops for choices. New story accepts a child’s topic by text or live voice. A new long book takes several minutes; writing and illustration progress are real, and accepted scenes survive retry.

Ari’s existing profile, language, points and saved worlds were preserved. Demo book ID: `story_3d53cce8d4a7661966c64179c145edb902a4d2e7`. A new book intentionally consumes the ordinary creation/image allowance. Parent → Settings controls per-child learning goals, excluded topics and short/long length. Goals are snapshotted server-side when creating a book; changing them does not rewrite an existing book.

## Source map

- `packages/protocol/src/{stories,specialists}.ts`: owned story/scene/choice/progress contracts and six specialist roles.
- `services/api/src/stories.ts`: authenticated creation/list/read/bookmarks/retry/delete, parent settings, quotas, revision conflicts and deletion fences. Routes are exported in protocol `rest.ts`.
- `services/builder/src/story-worker.ts`: durable lease, outline → individual validated scene drafts → review → progressive real image generation/review. No template story substitution. `VertexModels.story()` uses bounded requests. Art attempts and text passes are capped; exhausted retries stay honest.
- `services/gateway/src/gateway.ts`, `prompts/v1.ts`: owned-passage Katha narration, story topic tool, questions, pause and turn cues. `packages/characters/src/{browser-audio,voice-client}.ts`: playback queue barrier, speaker ownership and cue delivery.
- `apps/web/components/stories/`: topic, library, reading, choices, illustration, Katha and narration hook. `/stories` owns its single companion footer; the global shelf is excluded there. `app/stories.css` contains desktop reading column and phone illustration/prose layout.
- `StoryPreferencesForm.tsx` / `ParentPanels.tsx`: per-child educational settings.
- `components/learn/{GameSet,AdventureBoard,LearningGame}.tsx`: tactile props, physical scenery, legal input consequences and explanation reveals. Chapter rules/content remain in `packages/learning-content/src/adventures.ts` (40 chapters, nine books).
- `components/studio/{Dock,GenerationShow}.tsx`, `components/acting/Actor.tsx`: six specialist introductions and eight-pose making performances. Working animation follows actual build state, not simulated success.

## Assets and motion

Exact source prompts are `docs/art/story-specialist-prompts.json`; registration is `docs/art/specialist-registration.json`. Original plates live in `docs/art/sources/`. Reproduce specialist atlases with `apps/web/scripts/normalize-specialists.mjs`. Production atlases are `public/characters/specialists/`; the 24-prop atlas is `public/learn/cinematic/learning-props-v1.webp`. Prompt scan found 53 scanned rasters, zero missing provenance. Generated book plates/provenance live in the persistent builder asset service, not checked-in demo substitutes.

Ghost assembly art and full-opacity number badges are separate. GameProp uses bounded SVG foreignObject/CSS backgrounds: embedding the complete atlas as an SVG image expanded click bounds over nearby trail buttons. Do not reintroduce that hit-area bug. Heart’s classic viewport is 720×500; other classic games remain 720×450. Phone Learn rows accommodate wrapped copy and scroll. Shared actor clock and existing distance-driven locomotion retain hidden-tab/reduced-motion handling. Generated story plates use HTML focus/camera/discovery layers; only the predefined cast has authored pose atlases.

## Local operations

The key remains server-side in root `.env.local` as `GEMINI_API_KEY`. Never print it or add it to client variables. Existing compose supplies model overrides to real adapters. Web3300, API3301, builder/assets3302, Live8788; persistent Firestore8080/Auth9099. No external account connection is needed for the fake demo identities; model calls are real.

Use `node scripts/local.mjs start|stop|status` for the normal reproducible workflow. For a source rebuild use the repository Dockerfile/compose workflow. After building an image, `docker compose --env-file .env.local -f compose.local.yaml up -d --no-deps api builder gateway web` refreshes only app services. Retain emulators and volumes. Do not restart a builder during a live generation. Export persistent emulator data after sessions finish with `firebase emulators:export` in the emulator container. This pass also used `/tmp/ji-motion-upgrade.Dockerfile` for incremental full workspace builds; it is a temporary acceleration, not the only copy of source.

Cloud story delivery requires explicit API `BUILDER_URL`, `BUILDER_QUEUE` and `TASK_SERVICE_ACCOUNT`, configured Cloud Tasks/OIDC and builder audience/assets configuration. It has source coverage; this pass did not provision or certify production Cloud Tasks. Local durable tasks were exercised with real models.

## Acceptance evidence

- Actual browser input completed all 40 chapters and saved 40 bookmarks, zero quiz points/page errors. After final reviewer fixes, five affected chapters replayed successfully; desktop/phone motion stops were reconfirmed. `/tmp/ji-story-stage-play2.log`, `/tmp/ji-story-review-play.log`.
- Real English isolated QA book: 1,035 narration words, six scenes/18 passages, six accepted illustrations. First one-shot generation timed out; resumable outline/scene generation fixed it. The QA family/book was deleted after acceptance.
- Real Live: 1,734 audio frames, speech poses, 172ms drain-delayed continuation, pause without advance, contextual question, voice topic → owned API book creation. `/tmp/ji-story-real-voice.log`; `real-voice-report.json` under the review directory. This is browser audio-pipeline evidence, not actual-device listening approval.
- Real Ari Bangla book: ready with six accepted illustrations; desktop/phone opening preserved profile and progress; zero page errors. `/tmp/ji-story-demo-{book,verify}.log`; captures `ari-real-book-{desktop,mobile}.png`.
- Protocol80, characters26, web231; isolated API55, builder85, gateway45 with proper security rules. Counts overlap standalone service runs; do not sum overlapping suites twice. Relevant lint/typecheck and production Docker/Next build passed. Logs `/tmp/ji-story-{tests-final,services-final2,lint-final,check-types8,review-build}.log`.
- 43-state desktop/phone/reduced-motion matrix, choice/save/reload and specialist introduction pose report: `apps/web/.impeccable/review/story-stage/`. Fresh reviewer initially found three clarity problems; the verdict pass scored all three **resolved**, disposition **ship at correction scope**. It does not expand animation acceptance. No rule/file/value suppression was added.

## Remaining limits

This is a substantial illustrated 2D story/game extension, not continuous film-quality rigging or animation of arbitrary generated cast. Custom photo/outfit images still have no articulated poses. The earlier generated-world animation-art reliability failure remains an open TODO, independently of accepted story-image generation. Long stories are bounded to six scenes; world creation/image/voice limits still apply. Model screening is not an educator’s review of every generated science claim; real-child enjoyment and listening on the target microphone/speaker need human acceptance. Individual-book DELETE fences resurrection but does not physically purge hash-addressed asset files or draft bookkeeping; family/child deletion cleans owned story/draft/attempt records. Do not claim complete asset-cache erasure. No cloud release, commit or push was performed. Preserve the extensive pre-existing uncommitted work.
