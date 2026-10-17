# Navigation and maintenance handoff — 17 October 2026

The integrated family and school work is the release source. The original creative worktree and its uncommitted files were not modified by this pass.

## Frontend

- Studio has one full-width footer for characters, one named Talk/Stop action, Studio/Learn/Stories/Worlds destinations and world controls. Its opaque theme background and paired text colors stay readable independently of the scene.
- Other child routes keep the paper navigation bar and named Live assistant panel. Opening the panel does not acquire the microphone; only the explicit Talk action starts a session. Navigation remains separate from shared voice ownership.
- Finish stops voice and music, then shows the selected character and real next steps. Back to Studio remounts its engine/resize observer and does not start voice.
- Native theme options declare their foreground, background and light color scheme. Existing palette contrast tests cover text/button/stage pairs in Forest, Ocean and Terracotta.
- The landing page keeps three distinct role entrances. A compact gravity experiment sits left on desktop and after the entrances on phones. One finite initial drop respects reduced motion; explicit Earth/Moon/drop controls remain usable.

The design documentation records this as an ordinary extension. Character art, normative tokens and the design sidecar were preserved. Screenshot provenance is in [the image directory](../images/PROVENANCE.md).

## Configuration and operations

Root `.env.example` now describes the Docker server settings. The runner validates its command before changing files, preserves existing private configuration, and makes a private copy only on first start. Setup/environment contract tests run in CI. The documented build queue matches Terraform (`world-builds`); API cloud source enables Vertex and scoped self-signing for student custom tokens. Terraform was validated in an isolated copy with the official Terraform 1.9.8 image, without a backend or cloud apply.

See the [README](../../README.md) and [DevOps guide](../runbooks/deployment.md) for startup, environment boundaries, staging and rollback. Repository main pushes run CI. No deployment was performed, and external cloud trigger settings were not inspected.

## Verification and limits

- Full workspace unit and disposable Firebase emulator suites passed. Package tests now run sequentially so strict sandbox watchdog tests do not contend with unrelated packages.
- Final web suite: 377 tests in 46 files passed. All 15 workspace typechecks and 15 lint tasks passed. Setup/environment contracts: 10 passed. Formatting and production API/web builds passed.
- Native captures cover 1440 × 900 laptop, 1024 × 768 tablet, 390 × 844 phone and 320 × 740 narrow phone. Finish/return preserved voice-off state. The landing Moon control changed the reading to 1.62 m/s² and moved the ball.
- Preview browser test selectors were updated; the complete browser automation suite was not run locally during this pass. These checks do not establish real microphone/model/cloud acceptance.
- Existing fresh generated-world failures remain recorded in [the acceptance handoff](generated-world-runtime-acceptance.md). They are not resolved or hidden by this interface/documentation work.

A fresh generic reviewer substituted for the unavailable specialized finish agent. The required captures were accepted; its one material finding was clipped invitation text at 320px. A scoped invitation-only layout correction was rebuilt and recaptured, then received a ship verdict. Open native popup rendering remains outside that visual approval.

Historical review reports were formatted to make the repository-wide formatting check pass; their findings were not reclassified as current acceptance.
