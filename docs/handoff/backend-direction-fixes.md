# Backend direction fixes — 2026-10-16

Implemented the bounded correctness pass requested against the gateway/builder and platform reviews. No contract shape changes, cloud model calls, deployments, commits, or pushes.

## Fixed

- Builder scene/patch responses and all Live tool declarations now pass through `toGeminiJsonSchema`. The existing conservative helper additionally removes unsupported string/property/exclusive-bound constraints and preserves literal discriminators as singleton enums, including numeric world dimensions. Runtime Zod/physics validation remains authoritative. User property names such as `default` remain intact.
- Live setup and transport failures now log only allowlisted operational fields: session ID, attempt count, optional numeric status, and a fixed diagnostic category (ADC/IAM, model/schema, region, quota, timeout, connection). Provider messages, tokens, prompts, and child text are never logged.
- Quota warnings now tell the character once to recap and finish without starting another world.
- Added `services/gateway/src/prompts/v1.ts`, with distinct personalities, age guidance, Labs/domain guidance, untrusted context boundaries, and tool sequencing. Every tool now has an actionable description. Prompt version is in the instruction; persisting it on session documents would require a separate contract addition.
- Moderation outages and invalid moderation responses fail closed as an operational `error`, not a child `moderation` strike. No outage is accepted as safe. Moderation remains serialized with tool execution so this bounded change does not introduce a race that executes unmoderated requests.
- Patches now have one repair retry with validation diagnostics, including identity/tier and approved-asset checks. Every attempt uses the original scene, preserving immutability and atomic publication.
- Backdrop/mid-layer requests now actually pass `imageConfig: { aspectRatio: '16:9', imageSize: '2K' }`; sprite requests use 1:1/1K. Existing final 2048×1152 normalization remains a fallback for model output dimensions.
- Foreign worlds return 404 before document parsing, including malformed foreign documents; deletion inherits the same behavior.
- Durable world/child/account deletion removes owned `builderJobs`. Builder admission-failure, running-failure, and completion writes now honor deletion fences; missing parent/child profiles do not recreate job records after deletion. Existing publish/patch fences remain in place.

## Evidence and documentation nuance

Verified against the installed Google Gen AI SDK declarations and Google's primary documentation. The review overstates the claim that every raw-schema extra necessarily causes HTTP 400: `responseJsonSchema` supports a broader subset than `responseSchema`, and unsupported response-schema fields may be ignored. The installed SDK explicitly supports string and numeric enums for `responseJsonSchema`. This patch conservatively uses the existing sanitizer and preserves local validation; it does not claim real-model acceptance has been proven.

- [Google structured output documentation](https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/control-generated-output): supported schema subset and local validation considerations.
- [Google GenerationConfig reference](https://cloud.google.com/vertex-ai/generative-ai/docs/reference/rest/v1/GenerationConfig): distinguishes response JSON schema from response schema. Current documentation marks older response and image config fields deprecated in favor of response formats; they remain present in the pinned SDK. A broader SDK/API migration is outside this pass.
- [Google image-generation documentation](https://ai.google.dev/gemini-api/docs/generate-content/image-generation): 16:9 and 2K image controls. Runtime model support still needs staging verification.

## Tests

- Schema package: 85 unit tests passed, including discriminator preservation and property-name regression.
- Gateway: 16 unit tests passed, including character quota warning, operational moderation failure, sanitized diagnostics, and tool schemas.
- Builder: 16 unit tests passed, including patch repair and actual API request configuration regressions.
- API: 5 unit tests passed; emulator regressions cover foreign-world 404, child/world builder-job cleanup, and durable fences.
- TypeScript and ESLint passed for all four affected packages.
- Final Firestore/Auth emulator run passed: API 15/15, builder 19/19, gateway 18/18. Run log: `/tmp/backend-direction-emulators.log`. Initial failures exposed the malformed foreign-world parsing issue and old tests assuming no patch repair / retained jobs for deleted profiles; code and expectations were corrected before the final clean run.

## Deliberately unhandled

Parallel moderation with safe tool gating, new session/job document contracts, fake Live websocket coverage, goAway overlap/draining, missing tool-call IDs, asset failure diagnostics, permanent-versus-transient task responses, speaking/recap state, and real Vertex evaluation remain separate work. Patch failure messaging to the child remains the existing generic gateway note. No real Vertex or image call was made.
