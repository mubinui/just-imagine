# Student, teacher and admin audit — 2026-10-18

Goal: the student, teacher and admin experiences reach the same standard as the child version: stable, professional, premium and working, on laptop, tablet and phone, in English and Bangla, with live voice and simulations behaving reliably.

How it is checked: an isolated local stack (test emulators on 8085/9095, API 3401, builder 3402, gateway 8798, web 3400) seeded with the demo school (`scripts/seed-schools.mjs`) and an emulator-only operator (`scripts/grant-admin.mjs --create`). The persistent demo on 3300 and its data are not touched. Each item is ticked only after it was exercised in a browser and any defect found was fixed and re-checked. Screen sizes: laptop 1440×900 and 1366×768, tablet 1180×820 and 820×1180, phone 390×844 and 844×390.

Legend: `[x]` verified working, `[~]` works with a known limitation (noted), `[ ]` not yet verified.

## Student (`/study`)

- [ ] S1 Sign in with school code, username and PIN; clear errors for a wrong PIN, unknown code and suspended school; Bangla and English
- [ ] S2 Home: assigned lessons, progress, next step, leaderboard and lab entries
- [ ] S3 Lesson: reading, embedded simulations, questions, submit, feedback and completion
- [ ] S4 Lesson materials
- [ ] S5 Lab: chemistry bench (mix, indicators, tasks) and simulations (motion graphs, Ohm's law, Newton's cart, linear graph, unit circle): controls respond, readouts are correct, grading matches the task
- [ ] S6 Tutor dock (live voice): connect, talk, stop, interruption, character handoff, no crackle, captions
- [ ] S7 Leaderboard
- [ ] S8 Sign out and expired session
- [ ] S9 Visual quality: hierarchy, spacing, contrast, theme, duotone icons, loading, empty and error states
- [ ] S10 Every screen at every size without overflow or clipped controls

## Teacher (`/school`)

- [ ] T1 Sign in; join with an invite; wrong password and non-teacher accounts refused
- [ ] T2 Console overview
- [ ] T3 Classes: create, rename, roster
- [ ] T4 Students: add, new PIN, suspend and restore
- [ ] T5 Lessons: list, create, edit with AI writing help, quality checks, materials, publish, copy a shared lesson
- [ ] T6 Results: per-student attempts, simulation and lab grading, quiz completion
- [ ] T7 Leaderboard
- [ ] T8 AI writing help with the real model: useful output, safe failure
- [ ] T9 Visual quality, Bangla, states and every size

## Admin (`/admin`)

- [ ] A1 Operator sign in; a parent or teacher account is refused
- [ ] A2 Overview figures load from real data
- [ ] A3 Families and the family drawer, with no child names shown
- [ ] A4 Schools, catalog, content and lessons management
- [ ] A5 Safety review, audit log, appearance themes and the system kill switch
- [ ] A6 Visual quality, states and every size

## Across all roles

- [ ] X1 No console errors or failed requests on any screen
- [ ] X2 Keyboard focus visible and logical; controls named for assistive technology
- [ ] X3 Bangla copy complete, with no clipped or overlapping lines
- [ ] X4 Live voice stable for children, Learn characters and the student tutor
- [ ] X5 Simulations stable at 60 fps on a laptop and usable on a tablet

## Simulation library (design: `docs/superpowers/specs/2026-10-18-stem-simulation-library-design.md`)

- [ ] L1 Shared presentation: slider panel, graph, readout, vector arrow; existing five models upgraded
- [ ] L2 Physics presets: vectors, projectile, incline forces, pendulum energy, orbits, spring, collisions
- [ ] L3 Chemistry presets: pH and indicators, titration, flame test, reaction rate, gas laws
- [ ] L4 Mathematics presets: function grapher, derivative, area under a curve, probability, trigonometry waves
- [ ] L5 Teacher library, configure view (locks) and task editor
- [ ] L6 Teacher generation with `gemini-4-argon`, validated and reviewed before adding

## Live voice during play

- [ ] V1 Measured main-thread load during a game with a live call; cause identified
- [ ] V2 Voice stays smooth while a game runs and the child talks with the assistant

## Release

- [ ] R1 README and docs screenshots refreshed from the new version: child Studio, Learn, worlds; school, student, teacher, admin and simulations
- [ ] R2 Full checks green, pushed, tagged and published

## Findings and fixes

Each finding records what was wrong, how it was fixed and how the fix was verified.

| #   | Area | Finding | Fix | Verified |
| --- | ---- | ------- | --- | -------- |

## Still open

Items that cannot be completed locally or need a decision are listed here with the reason.
