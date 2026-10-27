# Characters and Art Guarantee Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every playground game has the child's friend in it as a drawn, named character, and a hero or character whose art fails never shows as a flat block.

**Architecture:** The builder adds the mic-holding companion to every non-lab scene as a named sprite that joins the play (the scene and script prompts ask for it; a deterministic insert guarantees it). The art phase retries hero and character images once within the art deadline, then assigns a painted stand-in from a small committed library served by the web app, matched to the entity by keywords; the friend's stand-in is a frame of their own acting sheet.

**Tech Stack:** TypeScript (strict, ESM), Zod 4, Vitest, sharp, Gemini image models through the builder's existing image call, Next.js static assets.

**Spec:** `docs/superpowers/specs/2026-10-26-game-generation-reliability-design.md` (6.4 hero rule, 6.5 art) plus the owner's decisions of 2026-10-27 recorded below.

## Decisions (owner, 2026-10-27)

| Decision | Choice | Alternatives considered |
|---|---|---|
| Characters | The friend always joins every playground world as a visible, named character | Any model-chosen named character; keep the child's idea literal |
| Art failure | Hero and character images retry once, then a painted stand-in, never a bare shape | Hold the world until art arrives; leave flat placeholders |

Controller's call (recorded for the owner): the friend joins **without** `character` metadata. They already speak to the child as the companion; a world persona would put a second copy of the friend in the conversation.

## Global Constraints

- Labs (`job.labKind` or `tier === 'lab'`) are exempt from the friend rule and from stand-ins.
- The friend entity: id `companionId` (or `companionId_N` if taken, as `ensureHero` does), tags `['friend', companionId]` (plus `'hero'` only when it is the hero), `name` = `CHARACTERS[companionId].displayName`, `description` = `CHARACTERS[companionId].look`, about 1.0 × 1.0 m, dynamic, standing on the ground near the hero, no `character` metadata, no locomotion unless the scene gives it one.
- Stand-ins apply only to the hero and to entities with `character` metadata or the `friend` tag, and only after one retry has also failed within the art deadline (`budget.deadlineFor(ART_PHASE_MS)`).
- Stand-in URLs are site-relative (`/standins/<key>.webp`), served from `apps/web/public/standins/`; every stand-in is a transparent WebP sprite processed by the builder's existing `processSprite` (or equivalent alpha cleanup), with dimensions recorded in a manifest.
- No Game API, Scene DSL or protocol change. No model ID changes; the one-time library generation uses the hero image model (`gemini-nano-banana-2.1`) through the builder's existing image call with the local `GEMINI_API_KEY`, never committed.
- Child-facing strings stay short, kind and in the child's language. Commits are Conventional Commits ending in prose with no Claude or Anthropic attribution.

## Review Focus

1. A scene already at the 24-entity maximum: the friend is not inserted; nothing fails (log `friend_insert_skipped`).
2. A wish where the child names the friend themselves ("Bhombol races a car"): no duplicate friend.
3. A voice edit (patch job has no `companionId`): the friend already in the world is preserved; nothing inserted twice.
4. A stand-in for an entity whose words match nothing in the manifest: the generic `crate` stand-in is used, never a missing image.
5. The friend's stand-in must be that companion's own frame, never another companion's.

---

### Task 1: The friend always joins

**Files:**
- Modify: `services/builder/src/hero.ts` (add `ensureFriend`), `services/builder/src/prompts/v1.ts` (scene prompt line), `services/builder/src/game-prompt.ts` (script prompt line), `services/builder/src/imagine-game.ts` and `services/builder/src/revisions.ts` (call sites, after `ensureHero`)
- Test: `services/builder/test/hero.test.ts`, `services/builder/test/designer-brief.test.ts` (or the prompt test that covers `gameScriptPrompt`)

**Interfaces:**
- Produces: `export function ensureFriend(doc: SceneDoc, job: BuildWorldJob): SceneDoc` — returns the doc unchanged for labs, without `companionId`, or when an entity already has id or tag equal to `companionId`; otherwise inserts the friend entity per the Global Constraints, placed on the ground 1.5 m beside the hero (left if there is room, else right, clamped to the stage), validated with `validateScene`; on validation failure or a full scene it returns the original doc and logs `friend_insert_skipped { jobId, worldId, reason }`.
- Scene prompt line when `companionId` is set and not a lab (exact): `The child's friend ${displayName} is always in this world: create a sprite entity with id "${companionId}", name "${displayName}", tags ["friend","${companionId}"], description "${look}". If the child named no character, ${displayName} is the hero (add "hero" to the tags and set learning.heroEntityId). Otherwise ${displayName} joins the hero's play. No character metadata.` (This replaces the Task 7 line of the reliability plan.)
- Script prompt line when the scene has a `friend`-tagged entity (exact): `The child's friend ${displayName} (entity "${id}") is in this world. Include them in the play: they cheer, follow, help or ride along with the hero, and react with game.say in the child's language when something good happens. Never make the friend an obstacle, a target or something to remove.`

- [ ] **Step 1: Failing tests** — `ensureFriend` inserts the friend beside a named hero (car scene: hero `car`, friend `bhombol` tagged `friend`, named "Bhombol", no `character`, validates); leaves a scene that already has `bhombol` unchanged; skips labs; skips without `companionId`; skips a 24-entity scene and logs the event; scene prompt contains the line for a playground job and not for a lab; script prompt contains the friend line only when a friend entity exists.
- [ ] **Step 2: Run, see them fail** — `cd services/builder && ./node_modules/.bin/vitest run test/hero.test.ts`.
- [ ] **Step 3: Implement** `ensureFriend`, the two prompt lines, and the call sites (after `ensureHero`, before `onScene`).
- [ ] **Step 4: Run the builder unit suite, tsc, eslint, prettier** → PASS.
- [ ] **Step 5: Commit** — `feat(builder): the child's friend joins every playground world`.

---

### Task 2: A painted stand-in library

**Files:**
- Create: `services/builder/scripts/make-standins.mts` (one-time generator; not run in CI), `apps/web/public/standins/*.webp`, `apps/web/public/standins/PROVENANCE.md`, `services/builder/src/standins.ts` (manifest)
- Test: `services/builder/test/standins.test.ts`

**Interfaces:**
- Produces: `export interface StandIn { key: string; url: string; width: number; height: number; words: readonly string[] }`, `export const STANDINS: readonly StandIn[]`, `export const FRIEND_STANDINS: Record<'mishti' | 'bhombol' | 'chandni', StandIn>`.
- Generic subjects (key → match words): `car` (car, cart, kart, racer, vehicle), `truck` (truck, lorry, bus, van, tractor), `ball` (ball, marble, orb), `rocket` (rocket, spaceship, ship in space, shuttle), `boat` (boat, ship, raft, canoe, submarine), `robot` (robot, droid, machine), `dog` (dog, puppy), `cat` (cat, kitten), `bird` (bird, chick, duck, owl, parrot), `fish` (fish, shark, whale, dolphin), `child` (child, kid, boy, girl, person, friend), `crate` (generic default; box, block, crate, cube).
- Generation prompt per subject (exact frame, subject inserted): `Single transparent 2D game sprite for the Just Imagine children's physics playground: one friendly ${subject}, side view facing right, broad simple readable silhouette, warm painterly 2D cartoon with soft rounded forms, premium picture-book gouache feel, cheerful but not goofy. Entire subject visible and centered with generous transparent padding. Actual transparent background, no ground, no cast shadow, no props, no text, no border, no scene.` Outputs go through the builder's alpha cleanup (`processSprite` or the same steps), max 512 px on the long side, WebP.
- Friend stand-ins: cut column 0 (relaxed smile) of row 0/1/2 of `apps/web/public/characters/acting/friends-pets-acting-v2.webp` (8 columns × 3 rows; mishti, bhombol, chandni) with sharp, trim transparent margins, save `apps/web/public/standins/friend-<id>.webp`.
- `PROVENANCE.md` records, per file: model, date, prompt, source, size — following `apps/web/public/worlds/PROVENANCE.md`.

- [ ] **Step 1: Failing test** — every manifest entry's file exists under `apps/web/public/standins/`, is a WebP with alpha whose decoded size equals the manifest's `width`/`height`; `crate` exists; every friend id has a stand-in; match words are lowercase and unique across entries.
- [ ] **Step 2: Run, see it fail** (no files yet).
- [ ] **Step 3: Write and run the generator once** with the local key (`set -a && . ../../.env.local && set +a && ./node_modules/.bin/tsx scripts/make-standins.mts`), never printing the key; visually check each output (read each image) and regenerate any subject that has text, a ground line, a cast shadow, a clipped edge or an off-style look; write the manifest and provenance.
- [ ] **Step 4: Run the test** → PASS; tsc, eslint, prettier.
- [ ] **Step 5: Commit** — `feat(builder): a small painted stand-in library for art that does not arrive` (the WebP files, the manifest, the provenance and the generator; not the PNG sources).

---

### Task 3: Retry, then a painted stand-in

**Files:**
- Modify: `services/builder/src/art-phase.ts` (retry and stand-in assignment), `services/builder/src/worker.ts` (log), `services/builder/src/standins.ts` (add `standInFor`)
- Test: `services/builder/test/art-phase.test.ts`, `services/builder/test/standins.test.ts`

**Interfaces:**
- Consumes: `STANDINS`, `FRIEND_STANDINS` (Task 2), the friend entity shape (Task 1).
- Produces: `export function standInFor(entity: Entity, companionId?: string): StandIn` — the friend (tag `friend`) gets its own `FRIEND_STANDINS` entry; otherwise the entry whose words best match the entity's `name`, `tags` and `description` (whole-word, lowercase), falling back to `crate`.
- `startArt`: a request with `hero: true` (hero and characters) that fails gets exactly one more attempt if the art deadline allows; `applyArt` (or a new `applyStandIns(world, outcomes)`, called before `ready`) sets a failed hero/character/friend entity's `asset` to `{ status: 'ready', url, width, height }` from `standInFor`; backdrop and props are unchanged. Log `art_standin_used { jobId, worldId, count }` (a count only, never ids or words).

- [ ] **Step 1: Failing tests** — a hero request failing once then succeeding uses the second result; failing twice gets a stand-in (`car` for a car entity, `crate` for an unmatched one, the friend's own for the friend); a prop failing twice stays failed (placeholder); no retry starts after the deadline; the event carries only a count.
- [ ] **Step 2: Run, see them fail.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the builder unit suite and the worker integration file under the emulator (`FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`), tsc, eslint, prettier** → PASS.
- [ ] **Step 5: Commit** — `feat(builder): hero and character art retries once, then a painted stand-in`.

---

## Self-review

- Owner decision 1 → Task 1; decision 2 → Tasks 2 and 3; labs exempt in both; Review Focus 1–3 in Task 1's tests, 4–5 in Task 3's.
- Names consistent: `ensureFriend`, `StandIn`, `STANDINS`, `FRIEND_STANDINS`, `standInFor`, events `friend_insert_skipped`, `art_standin_used`.
