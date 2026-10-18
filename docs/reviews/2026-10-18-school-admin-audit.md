# Student, teacher and admin audit — 2026-10-18

Goal: the student, teacher and admin experiences reach the same standard as the child version: stable, professional, premium and working, on laptop, tablet and phone, in English and Bangla, with live voice and simulations behaving reliably.

How it is checked: an isolated local stack (test emulators on 8085/9095, API 3401, builder 3402, gateway 8798, web 3400) seeded with the demo school (`scripts/seed-schools.mjs`) and an emulator-only operator (`scripts/grant-admin.mjs --create`). The persistent demo on 3300 and its data are not touched. Each item is ticked only after it was exercised in a browser and any defect found was fixed and re-checked. Screen sizes: laptop 1440×900 and 1366×768, tablet 1180×820 and 820×1180, phone 390×844 and 844×390.

Legend: `[x]` verified working, `[~]` works with a known limitation (noted), `[ ]` not yet verified.

## Student (`/study`)

- [x] S1 Sign in with school code, username and PIN; clear errors for a wrong PIN, unknown code and suspended school; Bangla and English
- [x] S2 Home: assigned lessons, progress, next step, leaderboard and lab entries
- [x] S3 Lesson: reading, embedded simulations, questions, submit, feedback and completion
- [x] S4 Lesson materials
- [x] S5 Lab: chemistry bench (mix, indicators, tasks) and simulations (motion graphs, Ohm's law, Newton's cart, linear graph, unit circle): controls respond, readouts are correct, grading matches the task
- [~] S6 Tutor dock (live voice): connect, talk, stop, interruption, character handoff, no crackle, captions — exercised with a fake microphone on the local stack (connect, one child line, one tutor line, stop, captions merge partial and final lines); a call with a real microphone and the live model is still to be heard
- [x] S7 Leaderboard
- [x] S8 Sign out and expired session
- [x] S9 Visual quality: hierarchy, spacing, contrast, theme, duotone icons, loading, empty and error states
- [x] S10 Every screen at every size without overflow or clipped controls

## Teacher (`/school`)

- [x] T1 Sign in; join with an invite; wrong password and non-teacher accounts refused
- [x] T2 Console overview
- [x] T3 Classes: create, rename, roster
- [x] T4 Students: add, new PIN, suspend and restore
- [~] T5 Lessons: list, create, edit with AI writing help, quality checks, materials, publish, copy a shared lesson — all work; editing a published lesson now warns that it goes offline until re-approved, because keeping the old version live while editing needs a separate published copy in the data model
- [x] T6 Results: per-student attempts, simulation and lab grading, quiz completion
- [x] T7 Leaderboard
- [x] T8 AI writing help with the real model: useful output, safe failure
- [x] T9 Visual quality, Bangla, states and every size

## Admin (`/admin`)

- [x] A1 Operator sign in; a parent or teacher account is refused
- [x] A2 Overview figures load from real data
- [x] A3 Families and the family drawer, with no child names shown
- [x] A4 Schools, catalog, content and lessons management
- [x] A5 Safety review, audit log, appearance themes and the system kill switch
- [x] A6 Visual quality, states and every size

## Across all roles

- [~] X1 No console errors or failed requests on any screen — no page errors on the screens exercised by each pass and by the browser suite; a sweep of every screen with the network log is still to do
- [x] X2 Keyboard focus visible and logical; controls named for assistive technology
- [~] X3 Bangla copy complete, with no clipped or overlapping lines — complete and unclipped on every audited screen; seeded demo names and a few readout labels from `lib/school/readings.ts` still use Western digits (new seeds use Bangla digits)
- [~] X4 Live voice stable for children, Learn characters and the student tutor — child and Learn voice fixed and checked (cushion, handoff, world voices, game taps no longer hand the call over); the student tutor is checked with a fake microphone only
- [~] X5 Simulations stable at 60 fps on a laptop and usable on a tablet — animation runs on requestAnimationFrame with a time slider; checked visually at 1180 and 390; dragging and frame rate on a real tablet are still to measure

## Simulation library (design: `docs/superpowers/specs/2026-10-18-stem-simulation-library-design.md`)

- [x] L1 Shared presentation: slider panel, graph, readout, vector arrow; existing five models upgraded — shared renderer kit (`components/stem/renderers/kit.tsx`), one colour per quantity, units and Bangla digits on every canvas; 68 screenshots reviewed at 1180 and 390 in both languages
- [x] L2 Physics presets: vectors, projectile, incline forces, pendulum energy, orbits, spring, collisions — registered, drawn and animated; textbook tests in `packages/stem-sims`
- [x] L3 Chemistry presets: pH and indicators, titration, flame test, reaction rate, gas laws — registered, drawn and animated
- [x] L4 Mathematics presets: function grapher, derivative, area under a curve, probability, trigonometry waves — registered, drawn and animated
- [~] L5 Teacher library, configure view (locks) and task editor — every preset is listed under its curriculum chapters in the lesson editor, with editable-parameter locks and a task editor whose arguments start at the preset's own reading; a dedicated preview-card library view is still to build
- [ ] L6 Teacher generation with `gemini-4-argon`, validated and reviewed before adding — designed in the simulation library spec, not built

## Live voice during play

- [x] V1 Measured main-thread load during a game with a live call; cause identified — no long tasks and a steady 60 fps during play; the cause was tapping a game character handing the call over (fixed in 8fad1dc)
- [x] V2 Voice stays smooth while a game runs and the child talks with the assistant

## Release

- [x] R1 README and docs screenshots refreshed from the new version: child Studio, Learn, worlds; school, student, teacher, admin and simulations — see `docs/images/PROVENANCE.md`
- [x] R2 Full checks green, pushed, tagged and published — v0.3.0 and v0.4.0 released; UI demo at https://mubinui.github.io/just-imagine/demo/ and the repository About links the demo and the Google Cloud guide

## Findings and fixes

Each finding records what was wrong, how it was fixed and how the fix was verified.

| #   | Area         | Finding                                                                                                   | Fix                                                                                                  | Verified                                                |
| --- | ------------ | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 1   | Student      | Quiz could be submitted with unanswered questions                                                         | Every answer is checked first; the first unanswered card is focused and marked                       | Browser, 1180                                           |
| 2   | Student      | Tutor captions duplicated partial and final lines; two voice buttons                                      | Final lines replace partials; one voice toggle; floating dock that collapses without ending the call | Fake microphone                                         |
| 3   | Student      | Wrong answers gave the first hint away                                                                    | Separate guidance for wrong answers; explanation only after a correct one                            | Browser                                                 |
| 4   | Student      | Points shown in practice; saved answers lost on reload                                                    | Points only on the quiz; answers restored from the stored attempt                                    | Browser, reload                                         |
| 5   | Student      | Tied scores ranked 1, 2, 3; zero points ranked first                                                      | Shared ranks (1, 1, 3); "Not ranked yet" at zero                                                     | Unit and browser                                        |
| 6   | Student      | Sidebar icons above their labels in Bangla; planet icon for the lab                                       | One icon and label alignment rule; flask icon                                                        | Browser, bn and en                                      |
| 7   | Student      | Leaderboard summary narrower than the table                                                               | Standing card above a framed board, medals for the top three, a "you" tag                            | Browser, bn 1440 and 390                                |
| 8   | Student      | Tutor launcher was a text pill                                                                            | Portrait medallion with live ring and status dot, matching the children's assistant                  | Browser                                                 |
| 9   | Student      | Landscape phones lost half the screen to the sidebar                                                      | Compact top bar below 900 px                                                                         | Browser, 844×390                                        |
| 10  | Lab          | Reagents in a fixed scroll box, indicators by formula                                                     | Grouped reagents with colour vials, sticky beaker, named indicators                                  | Browser, 820 and 390                                    |
| 11  | Teacher      | Sign-in errors revealed whether an email exists                                                           | One message for every credential failure; plain network wording                                      | Browser, bn and en                                      |
| 12  | Teacher      | A new PIN could be dismissed before it was saved                                                          | PIN dialog with copy and print that Escape cannot close                                              | Browser                                                 |
| 13  | Teacher      | No way to pause a student                                                                                 | Pause and restore, sign-out of live sessions, unlock after wrong PINs                                | Integration tests                                       |
| 14  | Teacher      | Results mixed progress and score                                                                          | Not started, in progress, submitted, with a separate score                                           | Unit tests                                              |
| 15  | Teacher      | Copying a shared lesson twice made duplicates                                                             | Copies record their source; a second copy is refused                                                 | Integration tests                                       |
| 16  | Teacher      | AI drafting failed on the first call                                                                      | Provider-compatible schema; strict server validation unchanged                                       | Live model, 25 s draft                                  |
| 17  | Teacher      | Tables overflowed on phones                                                                               | Cards per student below 700 px                                                                       | Browser, 390                                            |
| 18  | Admin        | Audit log called a draft upload "published"                                                               | catalog.create and catalog.update actions; status changes logged as they happen                      | Integration tests                                       |
| 19  | Admin        | Console only in English; raw error codes                                                                  | Bangla throughout; plain-language errors                                                             | Unit tests                                              |
| 20  | Children     | Assistant button was a wide text pill                                                                     | Larger portrait button, name kept for screen readers                                                 | Browser, 1366 to 360                                    |
| 21  | Children     | Back to Studio had a 3D ledge                                                                             | Flat finish with an icon disc                                                                        | Browser, 1366 and 390                                   |
| 22  | CI           | Preview worlds test sat at the 60 s limit                                                                 | One test per world                                                                                   | Local run, CI                                           |
| 23  | Children     | A discovery toast covered the world's own controls, such as the Moon gravity choice                       | Toast moved to the world's top-right corner, compact on phones                                       | Browser, overlap measured at 1440 and 390               |
| 24  | Children     | On phones the Studio action panel kept a 220 px basis as height, pushing controls under the speech bubble | Stacked layouts size the panel to its content                                                        | Browser at 390, 360 and 844 × 390; Studio browser suite |
| 25  | All consoles | Weight 800 on body text fell back to a static Regular face, so the current page looked unselected         | Body text uses 700; the font limit is documented in `globals.css`                                    | Rendered widths measured; screenshots                   |
| 26  | Teacher      | Tasks for new simulations started with empty arguments; shared task names got the wrong ones              | Defaults come from each simulation's own task schema and starting reading                            | Unit tests across all 22 simulations                    |
| 27  | Learn        | Four of six islands were missing from the static demo                                                     | All open islands are prerendered                                                                     | Unit test; live demo returns 200 for all six            |
| 28  | API          | Concurrent identical story requests failed one run in five against the emulator                           | A transaction the emulator closed under contention is retried                                        | 15 of 15 runs; full API suite                           |
| 29  | CI           | Each split world test had only the 30 s default                                                           | Each world test has a minute                                                                         | CI green                                                |

## Still open

Items that cannot be completed locally or need a decision are listed here with the reason.

- Live voice with a real microphone for the student tutor: needs a person speaking to the live model.
- Keeping a published lesson live while it is edited (T5): needs a separate published copy in the data model; for now the editor warns before taking it offline.
- Seeded demo names on the persistent demo stack keep Western digits; the demo data is not reset.
- A dedicated simulation library view with live preview cards (L5) and teacher generation with `gemini-4-argon` (L6): designed, not built.
- Physics and mathematics subject icons still use a planet and a pencil; proper atom and maths icons need two Phosphor files downloaded, awaiting approval.
- Simulation dragging and frame rate on a real tablet (X5): not yet measured on a device.
