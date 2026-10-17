---
version: 1
slug: 'stories'
primary_target: 'app/(child)/stories/page.tsx'
related_targets:
  [
    'components/stories',
    'components/StoryPreferencesForm.tsx',
    'components/acting',
    'components/companion/Companion.tsx',
    'app/stories.css',
    'public/characters/specialists',
    '../../packages/protocol/src/stories.ts',
    '../../services/api/src/stories.ts',
    '../../services/builder/src/story-worker.ts',
  ]
---

# Surface brief: Katha’s story room (`/stories`)

Mode: Experience, with reading and direct choices. A child aged 6–13 brings a topic, explores an illustrated book, asks questions and keeps a bookmark. Parents set the learning aims separately. This is an ordinary extension of the user-confirmed warm cream/forest world and approved Tooth Town craft, with English and Bangla interface copy. The requested topic textarea is a local exception to PRODUCT.md’s earlier child-input restriction; the global product file is preserved.

## Direction contract

THESIS: The child’s idea becomes an owned illustrated book with discoveries and consequential choices. A generated scene leads the room; working controls make reading, asking and returning to a saved place explicit.

OWN-WORLD: retain forest structure, cream reading/control surfaces, Baloo names, Nunito explanation and the existing sunshine action/selected treatment. Katha is an original cream-and-caramel owl with spectacles, a forest cape and a book. Tactile feathers, materials and warm light extend the approved cast.

STORY: choose a topic by text or voice, see truthful workshop progress, read or request narration, reveal a discovery, choose an action, turn the page and reopen the saved book. Parent learning goals shape new books.

FIRST VIEWPORT: the invitation pairs a topic form with Katha. An open book uses a large illustration left and a 350–400px prose/control column right, within a 1600px spread. On narrower screens the illustration becomes sticky above the flowing script. Back and New story sit in the header; the companion has its own footer footprint.

FORM: precisely requested local extension, built in code. No concept-deal seed or replacement identity was introduced. The signature interaction is a passage-synchronized illustration focus with an optional discovery and two scene-ending choices.

MOTION: selected authored owl poses follow the active voice owner. Reading starts a bounded camera move; focus and choice action update the HTML scene state. Audio drain gates automatic passage advance. Reduced motion keeps illustration, facts, choices and speech states while removing camera, ripple and focus animation.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Composition and controls

`StoryRoom.tsx` hides the shared child header within this route and owns the forest room. The invitation caps at 1200px, with a large Katha opposite the topic form; phones bring the 130px owl above the form. A saved shelf uses illustrated book entries. Queue/writing states retain Katha and actual scene progress. Missing illustrations expose a readable fallback, and a partially illustrated manuscript can be read while pictures finish.

The final spread in `app/stories.css` supersedes its earlier single-column stage rules. Desktop uses a 16:10 illustration beside a separately scrollable script, each sized against available viewport height. At or below 900px the spread stacks, the 16:10 plate sticks to the top, and script height/overflow limits are removed. At or below 700px the header wraps, prose remains 19px, and choices stack. The open plate contains a focus label, discovery button and separate Katha overlay; story actors painted inside the image remain part of that image.

Room buttons have a 48px minimum height, cream fill and pill corners. The active passage and primary read/create/continue actions use existing sunshine; scene choices use cream 18px corners and a 76px minimum height. Focus is a visible 3px sunshine outline with a 4px offset. Passage buttons expose `aria-current`, choices expose `aria-pressed`, discoveries expose `aria-expanded`, errors use alerts, and save/workshop messages use status roles. Narration prose is not an autoplaying live region. The transcript is an optional disclosure.

At the final passage, two authored choices reveal different action responses and a shared learning explanation. The next-page control requires the last passage and a chosen response. Scene index navigation remains available. Choices rejoin the next scene; they do not generate a new branching film or new character animation. Ending completion is an explicit action and records actual progress rather than a timer reward.

## Owned books, preferences and recovery

`packages/protocol/src/stories.ts` defines bounded manuscripts, scene actions, discoveries, choices, image states and bookmarks. The worker currently writes three passages per scene; a long book has six scenes and a short book has three. The API checks family ownership and snapshots child language, age band and server-read parent preferences at creation. Topic creation is idempotent by request ID. Existing books retain their original learning goals when the parent later edits preferences.

`StoryPreferencesForm.tsx` saves learning goals, excluded topics and length through the existing child update API. Generated claims receive model safety/accuracy screening; this is not independent educational or clinical review.

The workshop persists an outline and each scene so bounded retries can resume. Accepted illustrations remain accepted on retry; failure keeps saved text readable and offers retry only while allowed. Owned book reads, revision-checked progress and deletion fences remain server responsibilities. The room remembers the current book ID locally and serializes progress requests to preserve write order. It reports saving/saved/failure truthfully; local remembered IDs are not a replacement for the owned server book.

## Narration and animation limits

`useStoryNarration.ts` starts real Live narration only after a child action. It identifies each passage read, waits for `voice.audio.whenPlaybackIdle()` after the matching finish cue, and advances only to another passage within the current scene when continuous reading is selected. Pause, question mode, passage/scene changes, interruption, connection loss and unmount invalidate pending continuation. A question opens a contextual call; continuing the book requires another read action. Unmount hangs up and flushes queued audio.

Katha uses the shared actor clock and an eight-pose registered atlas. Playback energy drives discrete small/open speech poses only when `speakerId` is `katha`; other speakers do not animate this mouth. Camera animation runs for 24 seconds during reading; ocean ripple is bounded to two iterations. Reduced motion suppresses these visual loops and transitions while preserving the information and interactions.

Scope is illustrated HTML scenes plus predefined 2D sprite acting. Generated cast members are painted into scene plates; they do not acquire articulated rigs, locomotion or phoneme lip-sync. Choice actions affect response/focus state, not a newly generated performance. This work does not establish film-quality animation, narrator identity consistency across arbitrary generated books, actual-child enjoyment or device-speaker listening quality. Old generated-world animation-art reliability remains a separate open issue.

## Provenance and finish evidence

Original owl, specialist and game-prop prompts are in `docs/art/story-specialist-prompts.json`; originals are `docs/art/sources/{katha,specialist-pets,specialist-guides,learning-props}-source-v1.png`. Registered originals/rendering assets live in `public/characters/specialists/` and `public/learn/cinematic/learning-props-v1.{png,webp}`; measured specialist registration is `docs/art/specialist-registration.json`. The invitation’s subdued jungle texture reuses the existing habitat painting and its recorded provenance.

Generated book plates are owned service assets, rather than bundled sample art. `services/builder/src/story-worker.ts` derives each illustration prompt from the stored cast description and scene illustration; local asset output stores `provenance.json` beside the content-hashed WebP. Cloud output publishes the WebP; this source path does not establish an equivalent cloud provenance sidecar. Preserve the manuscript and generation records when auditing an individual book.

This handoff inspected PRODUCT.md, DESIGN.md, `.impeccable/design.json`, the implementation plan, source/CSS, actor/protocol/worker contracts, the final review and the actual `ari-real-book-desktop.png` / `ari-real-book-mobile.png` captures under `.impeccable/review/story-stage/`. Those Bangla captures show the actual saved book, six-scene counter, plate, original Katha overlay, passages, choices and the companion footprint. The earlier English QA book recorded in `evidence.md` predates the fixed Katha appearance instruction and has a different painted narrator; do not treat that book as proof of identity consistency.

The reviewer’s final `disposition: ship` scores three named corrections resolved: assembly-number readability, Heart label clearance and phone map row spacing. This is a verdict at the correction scope, not a fresh global approval. Supplied evidence separately records real generation/image/Live and input/persistence checks; this documentation pass does not rerun or independently certify them, tests, deployment or broader animation acceptance.

The incumbent DESIGN.md frontmatter and `.impeccable/design.json` remain unchanged. Source retains cream/forest primitives and Baloo/Nunito; local sizes, tonal fills, rounded variants and motion are documented here rather than promoted to system tokens. Previously recorded type-ramp, tonal-color, control-radius and control-dimension metadata drift remains deferred. PRODUCT.md’s earlier no-text/no-live-configuration statements are not refreshed by this scoped handoff.

## Selected-language books and opening — 2026-10-17

The saved shelf, book prose, choices, discoveries, progress labels, errors and Katha controls follow the parent’s selected English/Bangla edition. Owned books receive cached display translations without replacing their canonical manuscript, IDs, illustrations, choices, learning goals or progress. Live narration reads the same cached edition displayed by the room. The original-language book and its creation-time preferences remain source data; the current language is a display and conversation choice. Edition/cache/ownership behavior is documented in `docs/handoff/language-operations.md` at the repository root.

Reopening begins with a distinct busy state while the remembered book and shelf load. `StoryRoom.tsx` clears the previous book during this operation and uses Katha with an operation-specific opening message; it does not claim a new story is being generated. The centered opening frame has a 55vh minimum, 32px/24px padding, 20px gaps, a 160px owl and a message capped at 34ch. Existing cream/forest composition, script wrapping and readable prose remain. Bangla uses the shared Bengali faces and heading leading documented in DESIGN.md.

The language documentation pass checked the final StoryRoom/stories.css source and supplied confirmation report, scoped finish review/verdict, ten real speaker/narration turns across English/Bangla and the synthetic English PCM → Bangla service report. It did not rerun QA or certify native-reader wording, pronunciation, physical-device listening or arbitrary generated-book quality. The later font/setting extension is recorded narrowly in DESIGN.md and its sidecar; the earlier unchanged-metadata statement above describes its original handoff. Unrelated existing metadata drift remains deferred.
