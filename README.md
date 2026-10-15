# Just Imagine

Imagination to simulation for children aged 6 to 13. Younger children talk with animal companions in Playgrounds; older children summon guides in Labs. Together they turn imagination into a live, interactive, physics-respecting 2.5D world. Every world teaches the real physics behind what the child imagined, and the session structure gradually lengthens attention span.

Built for the Google Cloud AI competition on Gemini and Google Cloud.

## How it works

- **Talk.** Mishti, Bhombol, and Chandni hold a live voice conversation through the Gemini Live API (`gemini-3.8-live` on Vertex AI), with Pori Apu, Onko Mama, and Jadu Kaka available as guides.
- **Build.** A world builder on `gemini-4-argon` turns the conversation into a strictly validated Scene DSL. A deterministic physics validator keeps materials, masses, and rules plausible, and marks impossible wishes as "pretend".
- **Play.** The browser renders the world with PixiJS and simulates it with Rapier2D. Children poke, drag, flick, and turn what-if dials for gravity, wind, and material.
- **Discover.** Characters explain what happened, Discovery Cards unlock, and the parent dashboard shows progress.

## Documents

- Design spec: [docs/superpowers/specs/2026-10-15-just-imagine-design.md](docs/superpowers/specs/2026-10-15-just-imagine-design.md)
- Master plan: [docs/superpowers/plans/2026-10-15-just-imagine-master.md](docs/superpowers/plans/2026-10-15-just-imagine-master.md)
- Module plans: [docs/superpowers/plans/](docs/superpowers/plans/)
- Working agreements for Claude Code: [CLAUDE.md](CLAUDE.md)
- Current handoff: [CHECKPOINT.md](CHECKPOINT.md)
- Implementation progress: [TODO.md](TODO.md)
- Local and deployment runbooks: [docs/runbooks/](docs/runbooks/)

## Setup

```bash
corepack enable
corepack use pnpm@10.34.7
pnpm install
pnpm lint && pnpm typecheck && pnpm test
```

## Local fixtures

Start the scripted WebSocket gateway without Firebase or Vertex AI credentials:

```bash
pnpm --filter @just-imagine/fixtures dev
# Optional: stream a one-second synthetic tone on hello.
TONE=1 pnpm --filter @just-imagine/fixtures dev
```

It listens at `ws://127.0.0.1:8787` (`PORT` overrides the port). Send a protocol `hello` with any non-empty development token, a child ID, and a character ID. Control messages and synthetic audio arrive over the socket; world documents come through a separate source:

```ts
import { FakeWorldSource, progressiveScript } from '@just-imagine/fixtures/browser';

const source = new FakeWorldSource(progressiveScript('jellyDragon'));
const unsubscribe = source.subscribe('w_fixture_jelly_dragon', (world) => {
  console.log(world.status, world.doc.title);
});
// Call unsubscribe() when the view closes.
```

Fixtures include Jelly Dragon, Moon Bounce, Pond Float, and a projectile lab. The additive `LAB_WORLDS` catalog includes a Galton board and a fractions lab. The progressive source simulates asset availability using placeholder image URLs. Node tests can import the gateway from `@just-imagine/fixtures/gateway`.

## Run the application

In separate terminals:

```sh
pnpm --filter @just-imagine/fixtures dev
NEXT_PUBLIC_FAKE=1 pnpm --filter @just-imagine/web dev --port 3100
```

Open `http://localhost:3100/play` and choose Ari. Preview mode uses local sample data, synthetic audio and playable fixtures; it does not open a microphone or accept payments. Public environment values are compiled into the web build, so rebuild when changing preview/real mode.

## Workspace

| Location                               | Responsibility                                                         |
| -------------------------------------- | ---------------------------------------------------------------------- |
| `packages/scene-schema`, `protocol`    | Validated scenes, physics rules and service contracts                  |
| `packages/fixtures`, `server-core`     | Offline worlds/fakes, Firebase, transactions and telemetry             |
| `packages/engine`, `characters`        | Pixi/Rapier simulation, browser audio, voice client and Rive adapter   |
| `apps/web`                             | Marketing/auth, child Studio/gallery, parent profiles/progress/billing |
| `services/gateway`                     | Authenticated Live voice, tools, pacing, quotas and session summaries  |
| `services/builder`                     | Versioned prompts, scene/patch generation, safe assets and evaluations |
| `services/api`                         | Ownership, profiles, worlds, Stripe test billing and durable deletion  |
| `infra`, `.github`, `cloudbuild*.yaml` | Terraform, operations, CI, load scenario and image promotion           |

Worlds arrive through Firestore. WebSockets carry control messages and PCM only. Raw audio is never stored; transcripts stay in gateway memory, while persisted summaries/learning records contain the session outcome. Build jobs use a deterministic age/tier/concept brief rather than transcript excerpts.

## Status

All application/service modules are implemented locally, with regression tests, emulator coverage, browser flows and deployment source. See [CHECKPOINT.md](CHECKPOINT.md) for the latest verified results and remaining gates. No cloud deployment or production release is implied: real Firebase/Vertex/Stripe integration, authored character assets, device performance and model/load acceptance require staging credentials and separate evidence. Model IDs are configurable; defaults preserve the design spec and must be verified in the selected project before use.
