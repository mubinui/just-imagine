# Just Imagine: project instructions for Claude Code

Just Imagine is a Google Cloud SaaS for children aged 6 to 10. A child talks with three animal characters (Pip the kitten, Bolt the puppy, Luna the cat) and together they turn imagination into an interactive, physics-respecting 2.5D world. Voice runs on `gemini-3.8-live` through Vertex AI; worlds are built by `gemini-4-argon` as a validated Scene DSL and rendered in the browser with PixiJS and Rapier2D.

## Read these first

- Design spec: `docs/superpowers/specs/2026-10-15-just-imagine-design.md`
- Master plan (global constraints, review focus, plan index, team workflow): `docs/superpowers/plans/2026-10-15-just-imagine-master.md`
- Module plans: `docs/superpowers/plans/2026-10-15-plan-*.md`

## Mandatory workflow and skills

Skills are invoked with the Skill tool. Use them in this order; do not skip a step because the task looks small.

1. **Starting any work:** `superpowers:using-superpowers` is loaded at session start. Check for an applicable skill before any action.
2. **New feature, module, or behavior change:** `superpowers:brainstorming`. Classify as spike, bounded, or architectural and follow that path. Architectural work ends in a spec under `docs/superpowers/specs/` and then `superpowers:writing-plans`.
3. **Stress-testing a decision, plan, or idea:** the `grilling` skill. Interview in rounds: ask every question on the current frontier at once, number each, give a recommended answer, wait for the answers, recompute the frontier, repeat until nothing is silently assumed. Look up facts yourself; only decisions go to the user. Do not act on the decision until shared understanding is confirmed. Use it before changing a shared contract (`packages/scene-schema`, `packages/protocol`) and before any change to the spec's section 20 decisions.
4. **Executing a plan:** `superpowers:subagent-driven-development` (preferred) or `superpowers:executing-plans`. Each task is a short-lived branch and a pull request.
5. **Writing code:** `superpowers:test-driven-development`. The failing test comes first and is seen to fail for the right reason.
6. **Any UI in `apps/web` (screens, components, design tokens, motion, copy, accessibility):** the `impeccable` skill. Run it to set the design direction and design system before the first screen, to build each screen, and to audit, polish, and harden before a screen is called done. The child-facing Studio and the parent dashboard are separate directions; both must be realistic-cartoon, Disney-inspired, cute, and legible on a tablet in landscape.
7. **Before claiming anything is done, fixed, or passing:** `superpowers:verification-before-completion`. Run the commands and quote the output.
8. **Before merging:** `superpowers:requesting-code-review`; for pull requests, `pr-review-toolkit:review-pr` or `/code-review`.
9. **Finishing a branch:** `superpowers:finishing-a-development-branch`.
10. **Debugging:** `superpowers:systematic-debugging` before proposing any fix.

## Repository conventions

- pnpm workspaces and Turborepo. Package names are `@just-imagine/<dir>`. Layout and ownership are in the master plan; shared packages are `packages/scene-schema`, `packages/protocol`, `packages/fixtures`, `packages/server-core`.
- Commands: `pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm --filter @just-imagine/<pkg> test`.
- Tests live in `test/` beside `src/` and are named `<unit>.test.ts`. `packages/server-core` tests run under the Firebase emulators.
- TypeScript strict with `noUncheckedIndexedAccess`; ESM only; Zod 4 for every boundary schema.
- Branch per task: `feat/<plan>-<task-number>-<slug>`. Conventional Commits (`feat(engine): ...`). Pull request to `main`, green CI, squash merge. Changes to `packages/scene-schema` or `packages/protocol` need the other developer's review.
- Commit messages, pull request bodies, tags, and release notes end with prose. Never add a `Co-Authored-By: Claude` trailer, a "Generated with Claude Code" line, or any other Claude or Anthropic attribution.

## Hard rules

- Every model call goes through Vertex AI in `us-central1` with Application Default Credentials. No API keys in the browser, ever.
- Model IDs: voice `gemini-3.8-live`; world builder `gemini-4-argon`; patches, summaries, moderation, image checks `gemini-3.8-flash`; hero sprites and backdrops `gemini-nano-banana-2.1`; props `gemini-3.1-flash-lite-image`; cached reaction clips `gemini-3.8-flash-tts`; mascot art `gemini-3-pro-image`.
- No raw audio is ever stored. Transcripts live only in gateway memory and are discarded at session end. Child profiles hold a first name, an avatar choice, and an age band only.
- World content never travels over the WebSocket; the browser reads world documents from Firestore.
- The Scene DSL is declarative. No generated code is executed anywhere.
- Secrets come from Secret Manager or local `.env` files that are git-ignored.
