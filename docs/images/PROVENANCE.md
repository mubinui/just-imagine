# Project screenshots

Captured on 18 October 2026 with Playwright (headless Chromium) from the app running locally at commit `2936152` or the commits just before it. No new world generation, child photograph, microphone capture or live model call was used to make these images.

## How each set was captured

**Children and worlds** came from the app in local preview mode (`NEXT_PUBLIC_FAKE=1`), which serves the authored sample worlds and a sample explorer, Ari. The Studio, Learn and theme images use the Bangla interface and the Ocean theme; the world images use English and the app default theme. The sample worlds' own titles and lines are written in English, so they stay English in the Bangla captures.

**Schools and operators** came from an isolated local stack with test emulators, seeded with the demo school (`scripts/seed-schools.mjs`) and an emulator-only operator account. Student names are the seeded demo names. The interface is English.

**Simulation library** images were rendered by the app's own simulation component (`apps/web/components/stem/SimView.tsx`) on a temporary local page used for visual review, at the default parameters with the clock at 42 % of the run.

Two overlays were hidden during capture with an injected style rule and nothing else was changed: the local preview notice strip, and the Next.js development indicator. App content was not composited, retouched or generated.

| File                      | Route                                    | CSS viewport | Language | Theme       |
| ------------------------- | ---------------------------------------- | ------------ | -------- | ----------- |
| `landing.png`             | `/`                                      | 1440 × 900   | English  | App default |
| `learn.png`               | `/learn`                                 | 1440 × 900   | Bangla   | Ocean       |
| `learn-tablet.png`        | `/learn`                                 | 1024 × 768   | Bangla   | Ocean       |
| `theme.png`               | `/learn` with theme choices open         | 1440 × 900   | Bangla   | Ocean       |
| `studio.png`              | `/studio`                                | 1440 × 900   | Bangla   | Ocean       |
| `laptop.png`              | `/studio`, same capture as studio        | 1440 × 900   | Bangla   | Ocean       |
| `tablet.png`              | `/studio`                                | 1024 × 768   | Bangla   | Ocean       |
| `world-moon.png`          | `/studio`, Bouncy Ball on the Moon       | 1440 × 900   | English  | App default |
| `world-pond.png`          | `/studio`, Duck and Stone at the Pond    | 1440 × 900   | English  | App default |
| `world-cannon.png`        | `/studio`, Cannon and Cup                | 1440 × 900   | English  | App default |
| `world-pegs.png`          | `/studio`, Peg Garden Probability        | 1440 × 900   | English  | App default |
| `school-teacher.png`      | `/school`                                | 1440 × 900   | English  | App default |
| `school-editor.png`       | `/school/lessons/<id>`                   | 1440 × 900   | English  | App default |
| `school-results.png`      | `/school/results`                        | 1440 × 900   | English  | App default |
| `student.png`             | `/study`                                 | 1440 × 900   | English  | App default |
| `student-simulation.png`  | `/study/lessons/<id>`, step 2            | 1440 × 900   | English  | App default |
| `student-lab.png`         | `/study/lab`                             | 1440 × 900   | English  | App default |
| `student-leaderboard.png` | `/study/leaderboard`                     | 1440 × 900   | English  | App default |
| `admin.png`               | `/admin`                                 | 1440 × 900   | English  | App default |
| `sim-pendulum.png`        | simulation component, pendulum           | 1180 wide    | English  | App default |
| `sim-titration.png`       | simulation component, titration          | 1180 wide    | Bangla   | App default |
| `sim-riemann.png`         | simulation component, area under a curve | 1180 wide    | English  | App default |

Screenshots describe appearance, not production or model acceptance.
