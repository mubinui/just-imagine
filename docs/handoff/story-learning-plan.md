# Story-led learning completion — 2026-10-16

User asks to complete prior tasks and bring every Learning World to the Tooth Town reference, with a story and game for all learning. Existing character art/calls/quizzes/rewards remain real; the gap is single-activity play without narrative progression and generic repeated animal/space scenes.

## Research

`LearnSection` owns pack selection and shared voice. `LearningGame` provides six causal games with a separate reducer; `LearningActivity` contains secondary character demonstrations. Nine packs contain 40 characters. Quiz progress is durable and gateway-only, but game progress currently resets. Public content strips private quiz answers. Existing cinematic art, poses, sound recordings and bilingual facts can be reused. Preserve all user/teammate changes and the separate child-directed Studio authoring pipeline.

## Implementation

1. Add typed public adventure content in learning-content: nine authored stories, one playable chapter per character, English/Bangla setup, goal, consequence and ending. Mechanics cover brushing, oxygen/food delivery, moon phases, movement matching, assembly, path navigation, angle/orbit manipulation, sound/pattern memory, timed holding and cough covering.
2. Add a renderer-independent adventure reducer and browser boards. Reuse the five appropriate existing core games; make other chapters act on their specific scientific subject. Story opening → play with optional guide → consequence → next chapter/replay. Keep one compact HUD, a clear playfield and keyboard/touch alternatives. Chapter choice remains open.
3. Save chapter completion under the child via authenticated API transactions, separately from quiz rewards. Reload resumes the first unplayed chapter. Client game completion cannot award points or pets.
4. Extend bounded learning metadata with authored mission IDs/phases. Gateway resolves story/lesson text from content; active Gemini character calls explain the current chapter. Story calls stay pinned to gameplay. Quiz rewards keep the existing protected path.
5. Run causal/edge-case tests, content coverage, authenticated persistence integration, build, real local-service playtests for all chapters, desktop/phone screenshots and a real Gemini story-context test. Use the bounded Impeccable finish review/documentation handoffs. Keep CHECKPOINT/TODO current.

## Constraints and risks

No engine migration or fixed-template restriction on Studio creation. Narrative is fictional; educational consequences reuse the sourced pack facts. Motion must express actions and respect reduced motion. Bookmarks must merge concurrent completions, obey ownership/deletion fences and survive failed saves with a retry. No automatic microphone permission on page load, invented points or claim of film/skeletal animation. Existing session-only costume behavior stays accurately described.

Authorized by the user's explicit request to complete this work; implementation proceeds without another approval gate.

## Local acceptance and handoff

Implemented all five steps through deployed source and tests. Nine adventures cover all40 authored characters in English/Bangla: Tooth Town’s big picnic; the missing sky parade; the night-light workshop; the farm’s welcome morning; a message across the wild; the ocean lantern festival; a delivery inside you; the growing garden café; the movement park show.

Actual browser actions cover every chapter, including the final handwashing diagram, two explicitly replayed classic chapters, eight coach poses and phone Saturn drag. Server reload retained40 completions after deleting local bookmark caches; points/pets remained zero. A deliberately failed one-POST503 save retained pending progress; Retry saved through the real API and cleared pending state. No page errors. Real Gemini Saturn call returned823 audio frames, explained authored mission, stayed pinned while all6 ice pieces were assembled, honored wave and retained imagined-outfit controls. Completion did not automatically ask a quiz or award points.

Passing scoped checks: web226; learning-content101; protocol76; gateway36; APIunit8; characters23; isolated Firestore integration7. Relevant typechecks, lint, formatting and Docker/Next build passed. Final desktop and390×844 phone capture set is under `apps/web/.impeccable/review/learn-stories/`; final visual pass corrected cream mission backing, phone play-row height and dock reachability. DESIGN/sidecar/surface documentation was synchronized by a fresh documenter. Fresh review returned fix for phone trail copy, phone Coco pads and outdated Learn artwork wording. The bounded batch resolved all three; same-path recaptures passed and the reviewer returned ship for the scored fixes. Reports: `apps/web/.impeccable/review/learn-stories/{finish-review,verdict}.md`. No suppressions were added.

Temporary Story QA child and temporary real-voice family were deleted; Ari’s profile/language/worlds preserved. Main demo family’s emulator-only daily voice usage was refreshed for testing after exhaustion, with original document backed up under `localDemoMaintenance`; production limits/plan unchanged. Final persistent emulator export succeeded at `/data/firebase/snapshot`. The app remains on http://localhost:3300. See CHECKPOINT for log paths, the retained earlier implementation and honest remaining animation/wardrobe/child-usability limits. No commit, push or cloud deployment.
