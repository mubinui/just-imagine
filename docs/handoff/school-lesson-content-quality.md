# School demo lesson content and material quality

Source review and deterministic checks: 2026-10-17. The seven lessons are original bilingual demonstration activities, not a complete textbook course, an NCTB certification or a recorded independent teacher review. The chapter mapping covers activities in motion, force, current electricity, straight-line graphs, trigonometry, acid–base chemistry and chemical reactions.

## What changed

Each lesson now includes paired English/Bangla learning goals, a short worked example, explicit assumptions and a misconception clarification. The investigations use a predict–observe–explain sequence. Their low-stakes practice questions differ from the graded questions. All 42 question entries have two specific progressive bilingual hints (84 hint entries); these are private lesson keys, not printed material. The 22 multiple-choice questions across practice and quiz place correct answers in positions 0/1/2 with counts 7/7/8. Reordering moves the complete bilingual option together and preserves the answer meaning.

The motion task starts at zero acceleration and requires changing it to reach the requested speed. The circuit task starts at 3 V and requires changing it to reach the requested current. Each of the seven model/lab tasks has a private example solution plus a negative test witness. Example solutions remain in private keys. Source lessons and keys are revision 2. Existing persisted lessons are not silently reseeded or upgraded by this source change.

| Activity      | Independent numeric check                                                                                                              | Task witness / non-solution                                            |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Motion        | u = 4 m/s, a = 2 m/s², t = 4 s gives v = 12 m/s and x = 32 m                                                                           | a = 2 / a = 1                                                          |
| Force         | 2 kg, μs = 0.3 gives a 5.88 N threshold; at a 10 N push with μk = 0.2, a = 3.04 m/s². Under a 4 N push, actual static friction is 4 N. | 5.9 N / 10 N for the “just moves” task                                 |
| Circuit       | 10 Ω + 20 Ω in series gives 30 Ω; 6 V gives 0.2 A                                                                                      | 6 V / 3 V                                                              |
| Straight line | y = 2x + 1 gives y = 7 at x = 3; vertical intercept = 1                                                                                | m = 3 / m = 2 for the authored point target                            |
| Unit circle   | sin 30° = 0.5 and cos 0° = 1                                                                                                           | 90° / 30° for sine = 1                                                 |
| Acid–base     | Equal 50 mL portions of 0.1 M HCl and NaOH each supply 0.005 mol; the ideal dilute, strong-acid/base model is neutral at 25 °C.        | Equal portions / 100 mL acid against 50 mL base                        |
| Reactions     | 2H₂ + O₂ → 2H₂O has four hydrogen atoms on each side                                                                                   | HCl + CaCO₃ gives the required gas / HCl + Zn produces a different gas |

Tests also check all authored MCQ answer meanings in both languages, unique prompts/options, useful non-repeated hints and an unsolved initial state for every sim task. They exercise the actual locked-parameter and lab grading adapters; they do not trust client-reported observations. Numeric assertions derive expected values independently rather than snapshotting the implementation output.

## Model boundaries and translation

Motion uses one-dimensional, constant acceleration and holds an object at rest after braking, without reversing it. The cart uses an ideal horizontal dry-friction model with g = 9.8 m/s². The circuit assumes an ideal source and resistors. Graphs and the unit circle use their defined mathematical relations. Chemical outcomes are restricted to the virtual bench and supported model; pH reasoning is explicitly for ideal dilute strong-acid/base solutions and not arbitrary real mixtures. Visual colour or bubbles alone are not proof of a specific substance.

Both languages were authored as paired original explanations with shared values, units and formulas. Regression tests guard the paired options and numeric meanings. This is source review, not a claim of independent native-speaker or classroom validation. Teachers should review scientific claims, translation and answer keys before approval. Automated publication checks do not establish pedagogical certification.

## Notes and worksheets

Saved materials are available through `/school/lessons/[id]/materials`, `/admin/lessons/[id]/materials` and `/study/lessons/[id]/materials`. Notes contain authored explanations, assumptions and investigation prompts. Worksheets contain the same investigation givens plus practice/quiz prompts, options, units and writing space; they omit explanatory worked solutions. Both show the saved revision and mark draft/archived content for review. Unsaved editor changes are not included.

The student route calls only the existing authorized public lesson endpoint. The shared renderer accepts public lesson content and never reads keys, hints, example answers or attempts. It adds labels and layout, not scientific explanations or generated outcomes. The print action opens the browser print dialog; the user can print or choose its PDF destination. Print CSS uses A4 margins, separates navigation from the document and avoids splitting individual questions where practical. Rendered-markup tests cover language, units, notes/worksheet separation, private-data omission, review labels and escaped teacher text. Native print pagination acceptance is recorded in the combined quality handoff: all three A4 preview pages of the saved revision-2 Bangla unit-circle worksheet were inspected, then printing was cancelled.

## Primary references and evidence limits

Chapter identities follow the [official NCTB 2026 class 9–10 directory](https://nctb.gov.bd/pages/static-pages/695b99afc4774958d7b70612). The repository's [content verification record](./school-content-verification.md) documents the earlier downloaded official contents pages and their government-hosted PDF links. Fresh requests to that directory/government download service during this pass failed (502/timeout); this pass does not claim a second independent PDF inspection or verification of every textbook exercise.

Scientific cross-checks used the original publisher's educational texts, without copying their prose:

- [OpenStax Physics: velocity–time graphs](https://openstax.org/books/physics/pages/2-4-velocity-vs-time-graphs) supports slope/acceleration and area/displacement reasoning.
- [OpenStax University Physics: friction](https://openstax.org/books/university-physics-volume-1/pages/6-2-friction) distinguishes responsive static friction from its limiting value and the approximate kinetic-friction model.
- [OpenStax Physics: series circuits](https://openstax.org/books/physics/pages/19-2-series-circuits) supports summed series resistance and ideal circuit calculations.
- [OpenStax Precalculus: unit-circle sine and cosine](https://openstax.org/books/precalculus-2e/pages/5-2-unit-circle-sine-and-cosine-functions) supports the coordinate interpretation of the ratios.
- [OpenStax Chemistry: classifying reactions](https://openstax.org/books/chemistry-2e/pages/4-2-classifying-chemical-reactions) supports precipitation and acid/base reaction distinctions.
- [OpenStax Chemistry: pH and pOH](https://openstax.org/books/chemistry-2e/pages/14-2-ph-and-poh) supports the stated temperature-dependent neutrality convention.

The parallel source-authoring review made no live AI or data calls. Root subsequently upgraded only the seven exact-match original seeds to revision2, with version archives and private backups; the teacher-authored lesson was preserved. The combined native and data acceptance is recorded in [school-quality-assurance.md](school-quality-assurance.md). Content checks are reproducible in `services/api/test/demo-lesson-quality.test.ts`; document rendering checks are in `apps/web/test/lesson-materials.test.tsx`.
