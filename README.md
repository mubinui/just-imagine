# Just Imagine

Imagination to simulation for children aged 6 to 10. A child talks with three animal characters and together they turn the child's imagination into a live, interactive, physics-respecting 2.5D world. Every world teaches the real physics behind what the child imagined, and the session structure gradually lengthens attention span.

Built for the Google Cloud AI competition on Gemini and Google Cloud.

## How it works

- **Talk.** Pip, Bolt, and Luna hold a live voice conversation through the Gemini Live API (`gemini-3.8-live` on Vertex AI).
- **Build.** A world builder on `gemini-4-argon` turns the conversation into a strictly validated Scene DSL. A deterministic physics validator keeps materials, masses, and rules plausible, and marks impossible wishes as "pretend".
- **Play.** The browser renders the world with PixiJS and simulates it with Rapier2D. Children poke, drag, flick, and turn what-if dials for gravity, wind, and material.
- **Discover.** Characters explain what happened, Discovery Cards unlock, and the parent dashboard shows progress.

## Documents

- Design spec: [docs/superpowers/specs/2026-10-15-just-imagine-design.md](docs/superpowers/specs/2026-10-15-just-imagine-design.md)
- Master plan: [docs/superpowers/plans/2026-10-15-just-imagine-master.md](docs/superpowers/plans/2026-10-15-just-imagine-master.md)
- Module plans: [docs/superpowers/plans/](docs/superpowers/plans/)
- Working agreements for Claude Code: [CLAUDE.md](CLAUDE.md)

## Setup

```bash
corepack enable
corepack use pnpm@latest-10
pnpm install
pnpm lint && pnpm typecheck && pnpm test
```

## Status

Design and planning complete. Implementation starts with Plan 0 (foundation and contracts).
