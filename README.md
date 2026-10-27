# Just Imagine

**A bilingual (English and Bangla) imagination and learning app that turns screen time into talk time.** Children talk with friendly characters, build playable worlds and stories, and learn through play; schools run interactive STEM lessons. Built with Gemini on Google Cloud.

[![Watch the Just Imagine demo video](https://img.youtube.com/vi/ZwjqJ2DGuAA/maxresdefault.jpg)](https://youtu.be/ZwjqJ2DGuAA)

| Resource                                                                       | What it is                                                                                                                                |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **[Live app](https://justimagine.mymentor.bd)**                                | The deployed app at justimagine.mymentor.bd                                                                                               |
| **[Demo video](https://youtu.be/ZwjqJ2DGuAA)**                                 | A four-minute walkthrough of the problem, the product and the architecture                                                                |
| **[UI demo](https://mubinui.github.io/just-imagine/demo/)**                    | Sample content with no microphone, sign-in or payments, built from the [`demo` branch](https://github.com/mubinui/just-imagine/tree/demo) |
| **[Google Cloud guide](https://mubinui.github.io/just-imagine/google-cloud/)** | Every credential, variable, run and test step for deploying on Google Cloud                                                               |

## Overview

Families with children aged 6–13 can meet a play friend, explore illustrated learning worlds, play story adventures and collect their own creations, while parents choose what their child learns and avoids. A separate school workspace serves class 9/10 STEM lessons, teachers and students.

Built by Team Bare Metal (Mubin and Sanzar) for the Google Cloud AI Builder Cup 2026, theme Media, Content & Digital Experiences.

## Features

- **Families:** parent signup and consent, explorer profiles, character voice calls, English/Bangla, illustrated stories, Learn activities, Studio and gallery.
- **Schools:** teacher invitations, classes, CSV rosters and student PINs; bilingual lesson authoring, AI text proposals, language approval and publication checks.
- **Students:** deterministic physics/maths simulations and a virtual chemistry bench, practice, section-based quizzes, progressive hints, results, leaderboards and printable notes/worksheets.
- **Operators:** separate admin access for school management, shared content, moderation, appearance and audited controls.

## Built with

| Layer     | Technology                                                                                                                                                       |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Models    | Gemini through Vertex AI (`us-central1`): Gemini Live voice, Gemini 4 Argon world building, Gemini Flash moderation, Nano Banana and Gemini image models for art |
| Backend   | Cloud Run services (API, voice gateway, world builder), Firebase App Hosting (web), Cloud Tasks, Cloud Storage, Secret Manager                                   |
| Data      | Firebase Authentication and Firestore                                                                                                                            |
| Client    | Next.js, PixiJS rendering and Rapier2D physics                                                                                                                   |
| Contracts | TypeScript, Zod-validated declarative Scene DSL: generated worlds are data, never executed code                                                                  |

## Project screenshots

All images are captures of the running app; see [capture details](docs/images/PROVENANCE.md).

### Children

| Welcome                                               | Learn                                                     | Studio                                                  |
| ----------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------- |
| ![Just Imagine welcome page](docs/images/landing.png) | ![Illustrated learning island map](docs/images/learn.png) | ![Studio with a playable world](docs/images/studio.png) |

Open the full Studio views: [laptop, 1440 × 900](docs/images/laptop.png) · [tablet, 1024 × 768](docs/images/tablet.png).

| Learn on tablet                                         | Theme choices                                            |
| ------------------------------------------------------- | -------------------------------------------------------- |
| ![Learning map on tablet](docs/images/learn-tablet.png) | ![Theme choices on the Learn map](docs/images/theme.png) |

The Studio keeps the friend, voice and the world's own controls together with one Exit Studio action. Learn is an island map with a featured story harbour; theme choices follow the surrounding light or dark surface.

### Worlds

| Moon gravity                                           | Sink or float                                             |
| ------------------------------------------------------ | --------------------------------------------------------- |
| ![Bouncy Ball on the Moon](docs/images/world-moon.png) | ![Duck and Stone at the Pond](docs/images/world-pond.png) |
| **Projectile**                                         | **Probability**                                           |
| ![Cannon and Cup](docs/images/world-cannon.png)        | ![Peg Garden Probability](docs/images/world-pegs.png)     |

### Schools

| Teacher overview                                            | Lesson editor                                                               |
| ----------------------------------------------------------- | --------------------------------------------------------------------------- |
| ![Teacher console overview](docs/images/school-teacher.png) | ![Bilingual lesson editor](docs/images/school-editor.png)                   |
| **Student home**                                            | **Lesson simulation**                                                       |
| ![Student lessons home](docs/images/student.png)            | ![Motion graphs simulation in a lesson](docs/images/student-simulation.png) |
| **Chemistry lab**                                           | **Leaderboard**                                                             |
| ![Virtual chemistry bench](docs/images/student-lab.png)     | ![Class leaderboard](docs/images/student-leaderboard.png)                   |

Teachers also see per-student results: [results](docs/images/school-results.png).

### Simulation library

| Pendulum energy                                             | Titration (Bangla)                                               | Area under a curve                                      |
| ----------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------- |
| ![Pendulum energy simulation](docs/images/sim-pendulum.png) | ![Titration simulation in Bangla](docs/images/sim-titration.png) | ![Riemann sums simulation](docs/images/sim-riemann.png) |

Twenty-two simulations across physics, chemistry and mathematics, each with adjustable parameters, units, graphs and gradable tasks.

### Operators

![Operator console overview](docs/images/admin.png)

## Run locally

Requires **Node 22.12+**, **pnpm 10.34.7**, and Docker Desktop/Engine with Compose. Run commands from the repository root.

```sh
git clone https://github.com/mubinui/just-imagine.git
cd just-imagine
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env.local
chmod 600 .env.local
```

On a fresh clone, edit `.env.local` and set the server-only `GEMINI_API_KEY`, then:

```sh
pnpm local:start
```

Open **http://localhost:3300**. Create a local parent account, give consent and add an explorer. For an existing checkout, preserve its `.env.local` and local accounts. AI features require access and quota for the configured models; no key is needed for the separate [fixture preview](apps/web/README.md#fixture-preview).

| Person        | Entry point                                                      |
| ------------- | ---------------------------------------------------------------- |
| Parent/family | `/sign-up`, `/sign-in`, `/parent/dashboard`                      |
| Explorer      | `/play`, then Studio, Learn, Stories or My worlds                |
| Teacher       | `/school/sign-in`; accept an operator invitation first           |
| Student       | `/study/sign-in`; use the school's code, username and issued PIN |
| Operator      | `/admin/sign-in`; requires an admin claim                        |

Keep teacher, student and operator identities separate from family accounts. There are no public shared credentials. For school seeding and operator setup, see the [local guide](docs/handoff/local-development.md).

```sh
pnpm local:status
pnpm local:logs
pnpm local:reload-key  # recreate API/builder/gateway after a key change
pnpm local:stop        # stop services and preserve saved data
```

The local runner also works as `node scripts/local.mjs start` without host pnpm dependencies. Docker installs its own dependencies. Local ports are web 3300, API 3301, builder/assets 3302 and voice 8788; Firebase data stays in Docker volumes. Browser-facing URLs are built into the local web image, so URL changes require a rebuild.

## Develop and verify

Java 21 is required for the isolated Firebase tests.

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
NEXT_PUBLIC_FAKE=1 JUST_IMAGINE_SAMPLE_BUILD=1 pnpm build
```

`pnpm test` includes an isolated emulator run on 8085/9095. Do not point tests at the saved local demo on 8080/9099. Preview browser-test commands are in the [web README](apps/web/README.md).

## Repository map

| Path                                                                     | Purpose                                                                      |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `apps/web`                                                               | Next.js family, school, student and operator interfaces                      |
| `services/api`                                                           | Authenticated profiles, lessons, grading, catalogs, billing and deletion     |
| `services/gateway`                                                       | Live voice, character handoffs, tutor tools and quotas                       |
| `services/builder`                                                       | Scene/game/story generation, validation and artwork                          |
| `packages/engine`, `game-runtime`                                        | PixiJS/Rapier rendering and sandboxed generated behaviour                    |
| `packages/characters`, `learning-content`                                | Audio lifecycle, character presentation and authored learning content        |
| `packages/stem-sims`, `stem-content`                                     | Deterministic STEM models, chemistry and chapter content                     |
| `packages/protocol`, `scene-schema`, `server-core`, `fixtures`, `config` | Contracts, validation, Firebase services, offline doubles and shared tooling |
| `infra`, `.github`, `cloudbuild*.yaml`                                   | Infrastructure, CI, evaluations and image promotion                          |

WebSockets carry control messages and PCM; worlds and persistent progress use Firestore. Raw voice audio is not stored. Transcripts are bounded gateway memory; summaries, learning records and generated content are persisted. Server credentials and private student answer keys are not bundled into public client assets.

## Project status

The app is deployed at [justimagine.mymentor.bd](https://justimagine.mymentor.bd) and verified by unit, emulator and browser tests. Fresh generated-world creation is still being hardened: the latest five recorded creation requests failed before artwork or publication. Authored games and school workflows are separately verified paths. See [current status](CHECKPOINT.md) and [generation evidence](docs/handoff/generated-world-runtime-acceptance.md).

For operations, environment boundaries, staging, deployment and rollback, use the [DevOps guide](docs/runbooks/deployment.md).

## Fixes after 18 October 2026

The competition guidelines we were given do not mention a code freeze after 18 October, so we kept making small fixes after that date. They are listed here so reviewers can tell them apart from the submitted build.

**The live app is still the 18/19 October build.** [justimagine.mymentor.bd](https://justimagine.mymentor.bd) runs the last deployment from 18–19 October: `main` at [`0748a66`](https://github.com/mubinui/just-imagine/commit/0748a66), which merged the branches `feat/deploy-gcp-cheap` ([#6](https://github.com/mubinui/just-imagine/pull/6), low-cost Cloud Run deployment) and `fix/builder-art-rate-limits` ([#7](https://github.com/mubinui/just-imagine/pull/7), Vertex rate-limit backoff for world art). Release [v0.4.0](https://github.com/mubinui/just-imagine/releases/tag/v0.4.0) is from the same day. Nothing below is deployed yet.

Merged into `main` afterwards (26–27 October):

| Pull request                                                                                                  | What it fixes                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#8](https://github.com/mubinui/just-imagine/pull/8)                                                          | Teacher, student and operator console layouts fit every screen size.                                                                                                                                                                                                                                                              |
| [#9](https://github.com/mubinui/just-imagine/pull/9), [#10](https://github.com/mubinui/just-imagine/pull/10)  | An example lesson for every simulation; teachers can describe a lab and Gemini configures a tested simulation for the teacher to accept.                                                                                                                                                                                          |
| [#11](https://github.com/mubinui/just-imagine/pull/11)                                                        | The study tutor sees the simulation settings and graphs on screen, and no longer repeats a reply.                                                                                                                                                                                                                                 |
| [#12](https://github.com/mubinui/just-imagine/pull/12)–[#17](https://github.com/mubinui/just-imagine/pull/17) | Game generation, the open issue in Project status: impossible acceptance tests removed, a children's game designer brief in the prompts, two script candidates per round inside one time budget, art started in parallel, a 900-second builder limit, and a template game as the last resort so a build ends in a playable world. |
| [#18](https://github.com/mubinui/just-imagine/pull/18)                                                        | A raw Firestore "Missing or insufficient permissions" message no longer reaches a child's screen.                                                                                                                                                                                                                                 |
| [#19](https://github.com/mubinui/just-imagine/pull/19)                                                        | The child's friend joins every playground world as a drawn character, and art that does not arrive becomes a painted stand-in instead of a flat block.                                                                                                                                                                            |
| [#20](https://github.com/mubinui/just-imagine/pull/20)                                                        | A new account found while signing in gets a clear consent step instead of an error under a "Parent sign in" heading.                                                                                                                                                                                                              |

Deploying these needs the infrastructure change in #16 (`terraform apply` for the 900-second builder timeout and the alerts) together with the new services.
