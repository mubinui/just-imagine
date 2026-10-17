# Navigation and maintenance handoff — 18 October 2026

The integrated family and school work is the release source. The original creative worktree and its uncommitted files were not modified by this pass.

## Frontend

- Studio has one full-width footer for characters, one named Talk/Stop action and four play controls, ending with Exit Studio. The cast, voice and controls share one row on laptop/tablet; phones use the cast/voice row followed by the four controls. Studio has no destination navigation row.
- Other child routes keep the paper navigation bar and named Live assistant panel. Opening the panel does not acquire the microphone; only the explicit Talk action starts a session. Navigation remains separate from shared voice ownership.
- Finish stops voice and music, then shows the selected character and real next steps. Back to Studio remounts its engine/resize observer and does not start voice.
- Compact theme controls use a swatch, current name and a native nonmodal popover with radio choices. Dark stages and Stories use coordinated dark surfaces; light headers use the existing light palette. Escape returns to the trigger, choices apply immediately and the global navigation remains available. Parent Settings retains its native select. Existing palette contrast tests cover text/button/stage pairs in Forest, Ocean and Terracotta.
- Learn presents six world links with original habitat paintings and larger original characters, clear titles, actual counts and progress. Points and pets sit in the introduction instead of a second map footer. The shared points badge uses a warm star, an actual total and a visible phone label. Scrollable content reserves the global navigation height.
- The landing page keeps three distinct role entrances. A compact gravity experiment sits left on desktop and after the entrances on phones. One finite initial drop respects reduced motion; explicit Earth/Moon/drop controls remain usable.

The design documentation records this as an ordinary extension. Character art, normative tokens and the design sidecar were preserved. Screenshot provenance is in [the image directory](../images/PROVENANCE.md).

## Configuration and operations

Root `.env.example` now describes the Docker server settings. The runner validates its command before changing files, preserves existing private configuration, and makes a private copy only on first start. Setup/environment contract tests run in CI. The documented build queue matches Terraform (`world-builds`); API cloud source enables Vertex and scoped self-signing for student custom tokens. Terraform was validated in an isolated copy with the official Terraform 1.9.8 image, without a backend or cloud apply.

See the [README](../../README.md) and [DevOps guide](../runbooks/deployment.md) for startup, environment boundaries, staging and rollback. Repository main pushes run CI. No deployment was performed, and external cloud trigger settings were not inspected.

## Verification and limits

- Full workspace unit and disposable Firebase emulator suites passed. Package tests now run sequentially so strict sandbox watchdog tests do not contend with unrelated packages.
- Final web suite: 377 tests in 46 files passed. All 15 workspace typechecks and 15 lint tasks passed. Setup/environment contracts: 10 passed. Formatting and production API/web builds passed.
- Native captures cover 1440 × 900 laptop, 1024 × 768 tablet, 390 × 844 phone and 320 × 740 narrow phone. Exit preserved voice-off state. Theme choices were exercised in Forest, Ocean and Terracotta; Escape/Enter closed and reopened the chooser. Learn's final world titles and story entrance scroll above navigation. The earlier landing Moon check changed the reading to 1.62 m/s² and moved the ball.
- Preview browser test selectors were updated; the complete browser automation suite was not run locally during this pass. These checks do not establish real microphone/model/cloud acceptance.
- Existing fresh generated-world failures remain recorded in [the acceptance handoff](generated-world-runtime-acceptance.md). They are not resolved or hidden by this interface/documentation work.

A fresh generic reviewer substituted for the unavailable specialized finish agent. Its full review accepted all 15 native captures and listed one material fix: the clipped phone lesson points badge. The phone footer was rebuilt with a complete points/buddy row above its contextual actions, recaptured and scored resolved, with a ship verdict at that correction's scope. The evidence is in `apps/web/.impeccable/review/premium/`. This supersedes the earlier combined-navigation approval; native theme popovers are now included in the evidence. Design frontmatter and the sidecar remain unchanged.

The previous main CI rerun passed unit/emulator suites and production build, then exposed stale browser assertions and a real rendering issue. Updated journeys use Exit Studio and current accessible labels. A sustained sequence of slow visible frames now advances physics with the existing bounded step, while hidden tabs and the first suspension gap still pause. The regression failed before the change and passes afterward; all 83 engine tests pass. Browser tests retain their touch-size and settled-ball assertions, and add theme persistence, keyboard dismissal and navigation visibility checks.

Historical review reports were formatted to make the repository-wide formatting check pass; their findings were not reclassified as current acceptance.
