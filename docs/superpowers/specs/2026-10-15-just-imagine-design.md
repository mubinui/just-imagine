# Just Imagine: Design Specification

| | |
|---|---|
| Status | Approved design, pending written-spec review |
| Date | 2026-10-15 |
| Target | Google Cloud AI competition submission, 4 to 6 weeks from this date |
| Team | Two programmers: Dev A (Experience), Dev B (Platform and AI) |

## 1. Purpose

Just Imagine is a web SaaS for children aged 6 to 10. A child talks with three cute animal characters and together they turn the child's imagination into a live, interactive, physics-respecting 2.5D world. The product is both entertainment and learning: every world teaches the real physics behind what the child imagined, and the session structure gradually lengthens the child's attention span.

Success for this round means:

- A child can speak a wish ("a jelly dragon that lives on a cloud"), see it appear within seconds as a painted world, play with it, and hear a character explain why it behaves the way it does.
- The system is deployed on Google Cloud with Gemini models through Vertex AI, with real accounts, child profiles, quotas, subscription tiers, and a parent dashboard.
- The system is production grade: validated contracts, tests at every layer, observability, safety controls, and documented operations.

## 2. Users and constraints

**Primary user: the child (6 to 10).** Early reader. Interacts by voice and touch. Text on screen is minimal and is always spoken aloud by a character.

**Secondary user: the parent.** Creates the account, gives consent, manages child profiles, sees progress, and pays.

**Platform.** Web, tablet-first in landscape, also usable on laptops. Chrome and Safari current versions. No native app this round.

**Language.** English. All user-facing strings and prompts live in isolated string tables so other languages can be added later.

**Competition requirements.** Functional prototype deployed on Google Cloud (Cloud Run or Firebase), built on Gemini models.

**Team and time.** Two programmers, 4 to 6 weeks, no dedicated artist. Art is produced with Gemini image models and assembled by the team.

## 3. Product experience

### 3.1 The play loop

Every session runs one loop repeatedly. The loop is also the learning loop.

1. **Imagine.** The child describes something with a character. The character asks one or two shaping questions ("What is the dragon made of?").
2. **Predict.** Before the world appears, the character asks a prediction question with two or three options ("Will the jelly dragon bounce or splat?"). The child answers by voice or by tapping.
3. **Play.** The world appears progressively. The child pokes, drags, flicks objects, and turns "what-if dials" (gravity, wind, material).
4. **Discover.** When something physically interesting happens (a collision, a float, a splat), the character explains the real physics in one or two sentences and a Discovery Card unlocks.
5. **Remix.** The character offers a twist ("What if we were on the Moon?"). The loop restarts from Imagine or Play.

### 3.2 Characters

Three characters with distinct jobs and voices. Names are placeholders and can be changed without code impact (they are configuration).

| Character | Animal | Role | Personality |
|---|---|---|---|
| Pip | kitten | The dreamer. Leads Imagine. Asks "what if" questions. | Bubbly, curious, quick |
| Bolt | puppy | The tinkerer. Leads Build and Discover. Explains physics. | Warm, enthusiastic, hands-on |
| Luna | cat | The thinker. Leads Predict, reflection, pacing, session recap. | Calm, gentle, wise |

**One mic-holder at a time.** Exactly one character holds the live voice conversation. The child taps a character to hand off. On handoff the gateway closes the current Live session and opens a new one with the new character's voice and persona, injecting a conversation summary so continuity is preserved. The other two characters react visually (Rive animations) and with short pre-generated voice lines (cached clips from the TTS model), never with a second live session.

**Visual style.** Disney and Pixar inspired 2D painterly cartoon: soft lighting, big expressive eyes, rounded shapes, warm palette. A written style bible and a style version tag govern every generated asset.

### 3.3 Attention engine

A pacing module in the gateway tracks turn rate, interaction rate, and silence. Rules:

- If 90 seconds pass without an "attention beat" (a question, a surprise event, a dial offer), the gateway injects a system note into the Live session asking the character to deliver one.
- Each session has a target length by profile. Initial targets: 8 minutes for the first three sessions, then rising by 2 minutes for every three completed loops, capped at 20 minutes.
- At target length, Luna runs a 60-second recap and the session ends gracefully. The child can start another session if quota allows.

The parent dashboard shows target length and actual engaged minutes over time. This is the "focus span grows with thinking" mechanic.

### 3.4 Learning layer

**Concept tags.** Every world carries one to three concept tags from a fixed list: gravity, mass, buoyancy, friction, bounce (restitution), momentum, air resistance, balance, springiness, density, force, speed. The list is data and can grow.

**Predictions.** One prediction question per world, generated by the builder and validated to reference the world's concept tags.

**Discovery Cards.** Unlocked when a rule fires that is tagged with a concept the child has not yet discovered in this world. A card holds a title, a one-sentence kid explanation, and a one-sentence "in real life" note. Cards persist per child.

**What-if dials.** The builder chooses which dials a world exposes from: gravity (Earth, Moon, Jupiter, none), wind (none, breeze, storm), material of the hero entity (chosen from the world's material table). Turning a dial is an attention beat and is narrated.

**Pretend mode.** When the child asks for something physically impossible (a stone that floats in air), the validator keeps the wish but marks the entity as "pretend". The character says so in kid terms ("In real life stones sink, but in our world we're pretending. Want to see what really happens?") and the dial to switch to "real" mode becomes an attention beat.

### 3.5 Screens

Child app:

- **Who's playing?** Child profile picker with avatars, PIN-free (the parent gates the device).
- **Studio.** The main play screen: full-bleed world canvas, three characters along the bottom edge, mic indicator, dial tray, Discovery Card toast. No text input.
- **Gallery.** Saved worlds as thumbnails; tap to reopen.

Parent area (ordinary web UI):

- **Dashboard.** Minutes, loops completed, concepts explored, Discovery Cards, saved worlds, session summaries.
- **Children.** Add, edit, remove child profiles.
- **Plan and billing.** Current tier, usage against quota, upgrade through Stripe Checkout, manage through Stripe Customer Portal.
- **Settings.** Session target overrides, data deletion request.

Marketing: a landing page with sign-up.

## 4. Architecture

### 4.1 Overview

```
Browser (Next.js, tablet-first)
  ├─ Engine: PixiJS v8 render + Rapier2D physics + Scene DSL interpreter
  ├─ Characters: Rive state machines, amplitude lip-sync
  ├─ Audio: AudioWorklet mic capture (PCM16 16 kHz) + playback (PCM16 24 kHz), barge-in flush
  └─ Firestore realtime listener for world documents
        │ WSS (audio + events)              │ HTTPS
        ▼                                   ▼
  gateway (Cloud Run, WebSocket)       api (Cloud Run, REST)
  ├─ Firebase ID token auth            ├─ profiles, worlds, quotas
  ├─ Vertex AI Live session per child  ├─ Stripe Checkout, Portal, webhooks
  │   (gemini-3.8-live)                └─ parent dashboard data
  ├─ tool-call execution ──► Cloud Tasks ──► builder (Cloud Run worker, Genkit)
  ├─ moderation + pacing                    ├─ Imagine → DSL     (gemini-4-argon)
  └─ resumption, GoAway reconnect           ├─ Patch and edit    (gemini-3.8-flash)
                                            ├─ Physics validator (deterministic TS)
  Firestore ◄── world docs, progressive ◄───┤ Asset gen (gemini-nano-banana-2.1,
  GCS + Cloud CDN ◄── sprites, colliders ◄──┘            gemini-3.1-flash-lite-image)
```

### 4.2 Services

| Service | Runtime | Responsibility |
|---|---|---|
| web | Next.js on Firebase App Hosting | Child app, parent area, marketing. Server components for parent pages, client components for the Studio. |
| gateway | Node 22 on Cloud Run, WebSocket | Holds one Vertex AI Live session per connected child. Relays audio both ways. Executes tool calls. Moderation, pacing, metering, resumption. |
| api | Node 22 on Cloud Run, REST (Fastify) | Profiles, worlds, sessions, quotas, Stripe, dashboard queries. All Firestore writes from clients go through here or the gateway. |
| builder | Node 22 on Cloud Run, Cloud Tasks handler (Genkit) | World generation flows: conversation to DSL, patch, validate, assets, progressive publish to Firestore. |

api and builder share one codebase and image with different entrypoints; they deploy as separate Cloud Run services so they scale independently.

### 4.3 Model selection

| Job | Model ID | Why |
|---|---|---|
| Character voice conversation | `gemini-3.8-live` (Vertex AI, GA) | Native audio, function calling, proactive audio, session resumption. |
| World Builder (conversation to Scene DSL) | `gemini-4-argon` (GA 2026-10-13) | Best structured reasoning for physics-aware scene composition. |
| Fast paths: patches, summaries, moderation classifier, prediction validation | `gemini-3.8-flash` (GA) | Low latency, low cost, same structured-output schema. |
| Hero sprites and backdrops | `gemini-nano-banana-2.1` (GA) | Best quality, multi-turn consistency, reference images for style. |
| Props and low-cost sprites | `gemini-3.1-flash-lite-image` (GA) | Fastest and cheapest, 1K output is sufficient. |
| Pre-generated side-character lines | `gemini-3.8-flash-tts` (GA) | Expressive speech for cached reaction clips. |
| Character art for the three mascots (one-time, offline) | `gemini-3-pro-image` (GA) | Highest quality with style references; output is layered PNGs assembled in Rive. |

Fallback: if `gemini-4-argon` fails or exceeds its 6-second DSL generation budget (9.6) twice in a session, the builder uses `gemini-3.8-flash` with the same schema for the rest of that session.

All models are called through Vertex AI (Gemini Enterprise Agent Platform) in region us-central1 with Application Default Credentials. No API keys in the browser.

### 4.4 Google Cloud services

| Need | Service |
|---|---|
| Compute | Cloud Run (gateway, api, builder); Firebase App Hosting (web) |
| Auth | Firebase Authentication (Google and email/password for parents) |
| Database | Firestore (nam5 multi-region), realtime listeners for world delivery |
| Object storage | Cloud Storage (US multi-region) behind Cloud CDN for generated assets |
| Async jobs | Cloud Tasks queue to builder |
| Secrets | Secret Manager (Stripe keys, webhook secret) |
| Observability | Cloud Logging, Cloud Trace (OpenTelemetry from Genkit and services), Cloud Monitoring, Error Reporting, uptime checks |
| Delivery | Artifact Registry, Cloud Build triggered from GitHub Actions |
| Infra as code | Terraform, two projects: staging and prod |

## 5. The Scene DSL

The Scene DSL is the contract between Dev A and Dev B. It is a versioned JSON document validated by a Zod schema in `packages/scene-schema`. The builder produces it; the engine consumes it. Nothing else crosses that boundary.

### 5.1 Principles

- **Declarative only.** No executable code. Behaviors and rules are enumerated types with parameters.
- **Closed vocabulary.** Entity kinds, behaviors, rule events, and actions are enums. The engine implements every enum member; the builder's structured output schema is generated from the same Zod schema, so the model cannot emit anything the engine cannot render.
- **Versioned.** `schemaVersion` is an integer. The engine refuses documents newer than it understands. Migrations live in the schema package.
- **Deterministic.** Given the same document and the same input event stream, the simulation produces the same result (fixed timestep, seeded randomness).

### 5.2 Schema v1

```ts
type SceneDoc = {
  schemaVersion: 1;
  worldId: string;
  title: string;                       // kid-readable, spoken aloud
  theme: {
    paletteHint: string;               // e.g. "sunset pastel"
    timeOfDay: 'day' | 'sunset' | 'night';
    backdropDescription: string;       // generation prompt source for the backdrop
    backdrop: AssetRef;                // painted background, 16:9
    midLayerDescription?: string;      // generation prompt source for the parallax layer
    midLayer?: AssetRef;               // optional parallax layer
  };
  environment: {
    gravity: { x: number; y: number }; // m/s^2, default {0, 9.81}
    wind: { x: number; y: number };    // m/s^2 equivalent force on all dynamic bodies
    medium: 'air' | 'water' | 'space';
    bounds: { width: number; height: number }; // world units (meters); 16:9
    seed: number;
  };
  materials: Record<string, Material>;
  entities: Entity[];
  joints: Joint[];
  rules: Rule[];
  learning: {
    concepts: Concept[];               // 1 to 3 from the fixed list
    prediction: { question: string; options: string[]; correctIndex: number; concept: Concept };
    dials: Dial[];                     // subset of 'gravity' | 'wind' | 'heroMaterial'
    heroEntityId: string;
  };
  narration: { intro: string };        // one or two sentences the character says on reveal
};

type Material = {
  density: number;        // kg/m^2 (2D), clamped 0.05 to 20
  friction: number;       // 0 to 1
  restitution: number;    // 0 to 1
  softness: number;       // 0 rigid to 1 jelly; maps to spring-lattice stiffness
  buoyant: boolean;       // floats in water medium
  breakable: boolean;     // splits on hard impact
  pretend: boolean;       // marked by validator when physically implausible
};

type Entity = {
  id: string;
  kind: 'sprite' | 'ground' | 'water' | 'particle';
  name: string;                        // kid-readable
  description: string;                 // asset generation prompt source
  asset?: AssetRef;                    // absent until generated; engine shows silhouette
  body: {
    shape: 'auto' | 'circle' | 'box' | 'polygon';
    material: string;                  // key into materials
    isStatic: boolean;
    size: { width: number; height: number };   // meters
    vertices?: { x: number; y: number }[];     // for polygon
  };
  transform: { x: number; y: number; rotation: number };
  tags: string[];
  behaviors: Behavior[];
  pretend: boolean;
};

type Behavior =
  | { type: 'wander'; speed: number }
  | { type: 'float'; amplitude: number; period: number }
  | { type: 'bounceIdle' }
  | { type: 'glow'; color: string }
  | { type: 'emit'; particle: 'sparkle' | 'bubble' | 'smoke' | 'leaf'; rate: number }
  | { type: 'face'; target: 'pointer' | 'hero' };

type Joint =
  | { type: 'spring'; a: string; b: string; stiffness: number; damping: number; restLength: number }
  | { type: 'pin'; a: string; b: string; anchor: { x: number; y: number } };

type Rule = {
  id: string;
  when:
    | { event: 'collision'; a: string; b: string; minImpulse?: number }   // tags
    | { event: 'tap'; target: string }                                    // tag
    | { event: 'enterMedium'; target: string; medium: 'water' }
    | { event: 'timer'; everySeconds: number }
    | { event: 'dial'; dial: Dial; value: string };
  then: Action[];
  concept?: Concept;                   // firing this rule unlocks a Discovery Card
  once: boolean;
};

type Action =
  | { action: 'spawn'; template: string; at: 'hero' | 'pointer' | { x: number; y: number }; count: number }
  | { action: 'applyImpulse'; target: string; impulse: { x: number; y: number } }
  | { action: 'setMaterial'; target: string; material: string }
  | { action: 'remove'; target: string }
  | { action: 'celebrate'; style: 'confetti' | 'sparkle' | 'splash' }
  | { action: 'say'; text: string }    // forwarded to the gateway for the character to speak
  | { action: 'sound'; cue: 'boing' | 'splat' | 'splash' | 'whoosh' | 'ding' };

type AssetRef = { url: string; colliderUrl?: string; width: number; height: number; status: 'placeholder' | 'ready' }; // url is "" while status is 'placeholder'
type Concept = 'gravity' | 'mass' | 'buoyancy' | 'friction' | 'bounce' | 'momentum' | 'airResistance' | 'balance' | 'springiness' | 'density' | 'force' | 'speed';
type Dial = 'gravity' | 'wind' | 'heroMaterial';
```

Limits enforced by the schema and validator: at most 24 entities, 16 joints, 12 rules, 8 materials, 3 dials. Sprite and particle size between 0.2 and 8 meters; ground and water entities up to 16 meters. Bounds fixed at 16 by 9 meters in v1.

Shape `auto` means the collider comes from the generated asset's collider polygon once the asset is ready; until then, and for entities that never receive an asset, the engine uses a box of `size`.

### 5.3 Edits

Incremental edits ("make the dragon bigger", "add a second cloud") are produced as RFC 6902 JSON Patch arrays by the builder's patch flow on `gemini-3.8-flash`. The builder applies the patch to the current document, re-validates the full result against the schema and the physics validator, and only then writes a new version. Invalid patches are retried once with the validation errors appended to the prompt, then rejected with a kid-friendly reason the character speaks.

### 5.4 Physics validator

A deterministic TypeScript module in `packages/scene-schema`, run by the builder after generation and by the engine before loading (defense in depth). It never calls a model.

- **Material plausibility.** A reference table maps common material words (stone, wood, jelly, cloud, feather, metal, ice, rubber, water) to density, friction, restitution, softness ranges. Values outside the range are clamped and the material is marked `pretend` if the child explicitly asked for the implausible value.
- **Structural guarantees.** Exactly one `ground` entity unless medium is `space`. All entities start inside bounds. No two static bodies overlap. Every tag referenced by a rule or joint exists on at least one entity.
- **Mass sanity.** Computed mass per entity (density times area) between 0.01 and 2000 kg; otherwise clamp size or density.
- **Learning consistency.** `prediction.concept` and every `rule.concept` are in `learning.concepts`. `heroEntityId` exists. At least one rule carries a concept.
- **Category allowlist.** Entity descriptions are checked against a blocklist of categories (weapons, gore, horror, realistic violence, adult content). A hit fails validation; the builder regenerates with the category removed. This is a backstop to the prompt-level policy, not the primary control.

The validator returns `{ ok, doc, issues[] }` where issues are structured, so tests can assert on them.

### 5.5 Example world (abridged)

```json
{
  "schemaVersion": 1,
  "title": "Jelly Dragon on a Cloud",
  "environment": { "gravity": { "x": 0, "y": 9.81 }, "wind": { "x": 0, "y": 0 }, "medium": "air", "bounds": { "width": 16, "height": 9 }, "seed": 42 },
  "materials": {
    "jelly": { "density": 1.1, "friction": 0.3, "restitution": 0.6, "softness": 0.8, "buoyant": true, "breakable": false, "pretend": false },
    "cloud": { "density": 0.05, "friction": 0.9, "restitution": 0.1, "softness": 0.4, "buoyant": true, "breakable": false, "pretend": true },
    "grass": { "density": 1, "friction": 0.8, "restitution": 0.1, "softness": 0, "buoyant": false, "breakable": false, "pretend": false }
  },
  "entities": [
    { "id": "ground", "kind": "ground", "name": "meadow", "description": "rolling green meadow edge", "body": { "shape": "box", "material": "grass", "isStatic": true, "size": { "width": 16, "height": 1 } }, "transform": { "x": 8, "y": 8.5, "rotation": 0 }, "tags": ["ground"], "behaviors": [], "pretend": false },
    { "id": "cloud1", "kind": "sprite", "name": "fluffy cloud", "description": "fluffy white cartoon cloud", "body": { "shape": "auto", "material": "cloud", "isStatic": true, "size": { "width": 3, "height": 1.2 } }, "transform": { "x": 5, "y": 3, "rotation": 0 }, "tags": ["cloud", "platform"], "behaviors": [{ "type": "float", "amplitude": 0.1, "period": 4 }], "pretend": true },
    { "id": "dragon", "kind": "sprite", "name": "jelly dragon", "description": "small cute dragon made of wobbly green jelly", "body": { "shape": "auto", "material": "jelly", "isStatic": false, "size": { "width": 1.4, "height": 1.2 } }, "transform": { "x": 5, "y": 1.5, "rotation": 0 }, "tags": ["dragon", "hero"], "behaviors": [{ "type": "face", "target": "pointer" }], "pretend": false }
  ],
  "joints": [],
  "rules": [
    { "id": "r1", "when": { "event": "collision", "a": "hero", "b": "ground", "minImpulse": 2 }, "then": [{ "action": "sound", "cue": "boing" }, { "action": "celebrate", "style": "sparkle" }, { "action": "say", "text": "Boing! Jelly squishes and springs back. That's bounciness!" }], "concept": "bounce", "once": true }
  ],
  "learning": { "concepts": ["bounce", "gravity"], "prediction": { "question": "If the dragon falls off the cloud, will it bounce or splat?", "options": ["bounce", "splat"], "correctIndex": 0, "concept": "bounce" }, "dials": ["gravity", "heroMaterial"], "heroEntityId": "dragon" },
  "narration": { "intro": "Here is your jelly dragon, snoozing on a cloud. Try giving it a little flick!" }
}
```

## 6. Client engine

Package `packages/engine`, framework-agnostic TypeScript with a thin React mount in `apps/web`.

### 6.1 Rendering

PixiJS v8 with WebGPU where available and WebGL2 fallback. Layers in draw order: far backdrop, mid layer (parallax 0.5), entities, particles, interaction highlights. React DOM renders UI above the canvas (dial tray, cards, characters). Canvas resolution follows device pixel ratio capped at 2.

### 6.2 Physics

Rapier2D through `@dimforge/rapier2d-compat` (WASM inlined, no bundler special-casing). Fixed timestep 60 Hz with accumulator and render interpolation. World units are meters; the renderer scales to pixels. Materials map to collider density, friction, restitution. Softness above 0.2 turns a sprite into a spring lattice (a 3x3 grid of small circle bodies joined by springs, rendered as a mesh deformation of the sprite), which is how jelly wobbles. Buoyancy and medium drag are applied per step for bodies inside a `water` entity or when medium is `water`. `space` sets gravity to zero and drag to zero.

### 6.3 DSL interpreter

Loads a `SceneDoc`, creates bodies and sprites, attaches behaviors, and compiles rules into event listeners. Collision events come from Rapier's event queue with impulse magnitude. Tap, drag, and flick come from the interaction layer. `say` actions are not spoken by the engine; they are emitted as events that the app forwards to the gateway (see 8.4), which asks the character to speak them. Document updates (progressive assets, patches) are applied in place without resetting the simulation unless the patch touches bodies, in which case the affected bodies are rebuilt.

### 6.4 Interactions

Tap: highlight and emit tap event. Drag: kinematic hold with a spring to the pointer. Flick: release velocity from the last 80 ms of pointer movement, capped. Pinch and two-finger gestures are not used in v1. All interactions emit throttled summaries to the gateway (at most one event per 500 ms) so the character knows what the child is doing.

### 6.5 Dials

The dial tray renders only the dials the document exposes. Gravity presets: Earth 9.81, Moon 1.62, Jupiter 24.8, none 0. Wind presets: none 0, breeze 2, storm 8. Hero material: switches the hero's material among the document's material table. Changing a dial emits a `dial` rule event and a gateway event.

### 6.6 Determinism and replay

The engine records the input event stream with timestamps. A world plus its event stream replays identically, which the test suite relies on and which enables a "rewind" button later without new architecture.

### 6.7 Performance budgets

60 fps on a 2022 iPad at 24 entities. First paint of a fixture world under 500 ms after the document arrives. Engine bundle under 1.2 MB gzipped including Rapier WASM.

## 7. Characters and audio

Package `packages/characters`.

### 7.1 Rive characters

Each character is one Rive file with a state machine exposing inputs: `mouthOpen` (0 to 1), `emotion` (idle, happy, thinking, surprised, sleepy), `speaking` (bool), `lookX`, `lookY` (-1 to 1). Character art is produced as layered PNGs with `gemini-3-pro-image` using a fixed set of reference images for consistency, then assembled and animated in the Rive editor by Dev A. Layer-based animation (bob, blink, ear twitch, mouth shapes) is sufficient; no skeletal rig.

### 7.2 Lip-sync

The playback worklet reports RMS of each 20 ms output chunk. The app maps smoothed RMS to `mouthOpen`. Emotion is set from `characterState` messages sent by the gateway.

### 7.3 Browser audio

Capture: `getUserMedia` into an AudioWorklet that downsamples to 16 kHz mono PCM16 and posts 20 ms frames to the WebSocket as binary. Playback: a ring-buffer AudioWorklet consuming 24 kHz PCM16. On an `interrupted` message the ring buffer is flushed immediately so barge-in feels instant. iOS requires a user gesture to start audio; the "Who's playing?" tap serves as that gesture.

## 8. Conversation gateway

Service `services/gateway`. Node 22, `ws` on a Fastify server, `@google/genai` SDK in Vertex mode.

### 8.1 Session lifecycle

1. Client opens WSS and sends `hello` with a Firebase ID token, `childId`, `characterId`, and optional `worldId`.
2. Gateway verifies the token, loads the child profile and plan, checks the daily voice quota, and creates a session document.
3. Gateway opens a Vertex AI Live session with the character's configuration (8.2).
4. Audio and events flow until the child ends the session, the quota is exhausted, or the pacing engine ends it at target length.
5. On close, the gateway writes usage, asks `gemini-3.8-flash` for a 3-sentence session summary from the transcript, stores the summary and discoveries, and discards the transcript.

### 8.2 Live session configuration

- Model `gemini-3.8-live`, response modality audio, voice per character chosen from the Live voice list (a listening test in week 2 fixes the three names in configuration).
- System instruction composed from: character persona, kid-safety policy, the child's first name and age band, current world summary, learning goal, and the tool-use guide. Instructions are templated and versioned in `services/gateway/src/prompts`.
- Tools: the function declarations in 8.3. Google Search is not enabled (Vertex does not allow it alongside function tools, and the app must not browse).
- Proactive audio on. Input and output transcription on. Session resumption on. Context window compression on with a 100k-token trigger. Automatic voice activity detection with end-of-speech silence of 900 ms, which suits children's pauses.
- Vertex safety settings at the strictest threshold for all categories.

### 8.3 Tools exposed to the character

| Tool | Arguments | Effect |
|---|---|---|
| `build_world` | `description`, `concepts[]` | Enqueues a builder job. Returns `{ jobId }` immediately. |
| `modify_world` | `instruction` | Enqueues a patch job. Returns `{ jobId }`. |
| `set_dial` | `dial`, `value` | Sends a `dial` message to the client. |
| `ask_prediction` | `question`, `options[]`, `correctIndex` | Shows the prediction UI; the answer comes back as a client event. |
| `award_discovery` | `concept`, `title`, `kidExplanation`, `realLifeNote` | Persists a Discovery Card and shows the toast. |
| `switch_character` | `characterId` | Starts the handoff (8.5). |
| `end_session` | `reason` | Begins the recap and close. |

The gateway validates every tool argument with Zod before acting and returns a structured error to the model on failure.

### 8.4 Fire-and-notify

Tool calls that start jobs return immediately so the character keeps talking during generation. When the builder publishes a milestone to Firestore (placeholders ready, hero ready, world ready, failed), the gateway, which also listens to the world document, injects a short system note into the Live session as client content ("The world 'Jelly Dragon on a Cloud' is ready. Describe it in one sentence and invite the child to flick the dragon."). `say` actions from engine rules arrive from the client as events and are injected the same way. Vertex documents asynchronous function calling for this model; where available it is enabled as an optimization, but the design does not depend on it.

### 8.5 Character handoff

On `switch_character` (from the model or from a client tap), the gateway asks `gemini-3.8-flash` for a 5-sentence summary of the conversation and the child's current state, closes the Live session, opens a new one for the target character with the summary in the system instruction, and sends `ready` to the client. Target under 2 seconds. The departing character's Rive state goes to idle; the arriving one plays a greeting animation.

### 8.6 Pacing engine

A per-session timer module. It records attention beats (questions asked, predictions, discoveries, dial changes, surprises). Rules are in 3.3. It communicates with the model only by injecting system notes, never by speaking itself.

### 8.7 Moderation

Every final input transcript segment is classified by `gemini-3.8-flash` with a child-safety rubric (safe, redirect, block) in parallel with the live conversation so it adds no latency to the character's reply. On `redirect` the gateway injects a note asking the character to gently steer away. On `block` the gateway injects a note to change the subject and logs the event. Three blocks in a session end it with a friendly goodbye.

### 8.8 Resumption and GoAway

The gateway stores the latest resumption handle in memory. On `goAway` it reconnects before `timeLeft` expires. On an unexpected close it retries with the handle up to three times with backoff, playing a short "thinking" sound to the child. If resumption fails, it opens a fresh session with the summary injected, the same path as a handoff.

### 8.9 Metering and quotas

Voice seconds are counted from `hello` to close and written to the daily usage document every 30 seconds and on close. The gateway refuses `hello` when the daily voice quota is exhausted and warns the character 2 minutes before exhaustion so it can wrap up.

### 8.10 WebSocket protocol

Defined as Zod schemas in `packages/protocol`. JSON text frames for control, binary frames for audio.

Client to gateway: `hello`, `audio` (binary PCM16 16 kHz), `text` (accessibility and debug), `interaction` (tap, drag, flick, dial with entity or dial id), `simEvent` (rule fired with optional `say` text, throttled), `predictionAnswer`, `switchCharacter`, `end`.

Gateway to client: `ready` (sessionId, character), `audio` (binary PCM16 24 kHz), `interrupted`, `transcript` (role, text, final), `characterState` (emotion, speaking), `worldJob` (jobId, status), `prediction`, `discovery`, `dial`, `quota` (secondsLeft), `error` (code, message), `bye` (reason).

World content never travels over the WebSocket. The client subscribes to the world document in Firestore and renders updates as they land.

## 9. World builder pipeline

Service `services/builder`, Genkit with `@genkit-ai/google-genai` in Vertex mode. Triggered by Cloud Tasks from the gateway. Each job is idempotent on `jobId`.

### 9.1 Flows

1. **imagineToScene.** Input: conversation summary, child age band, requested concepts, style version. Output: `SceneDoc` via structured output constrained to the Zod-derived JSON schema on `gemini-4-argon`. Retries once with validator issues appended if validation fails; on second failure the job fails (see 14).
2. **patchScene.** Input: current doc, instruction. Output: JSON Patch on `gemini-3.8-flash`. Applied, validated, versioned.
3. **validate.** The deterministic physics validator (5.4).
4. **generateAssets.** For each entity with an absent asset, in priority order (hero, platforms, props), generate an image, post-process (9.3), safety-check, upload, update the document, up to the plan's images-per-world quota (11); entities beyond the quota keep their silhouettes. Backdrop and mid layer are generated first because they anchor the look and do not count against the quota.
5. **publish.** Writes the world document in stages: `building` with placeholders, then per-asset updates, then `ready`. The gateway and client both observe these writes.

### 9.2 Prompts

The builder system prompt contains the style bible, the physics rubric (material table, what counts as pretend), the age-band tone guide, the safety policy, and six few-shot examples drawn from `packages/fixtures`. Prompts are versioned files; the version is recorded on every world document for reproducibility.

### 9.3 Asset post-processing

Sprites are generated at 1K on a flat magenta background (`#FF00FF`) with the prompt suffix "full body, centered, soft rim light, no shadow on the background, no text". Pipeline: chroma-key with tolerance and edge feathering to alpha, despeckle, trim to content, pad 4 px, encode WebP with alpha. Collider: alpha threshold at 0.5, marching squares outline, Douglas-Peucker simplification to at most 40 points, convex decomposition to at most 12 parts, saved as JSON next to the sprite. If the chroma key leaves more than 2 percent magenta pixels inside the content box, the sprite is regenerated once with a stronger prompt; if it fails again the silhouette placeholder stays and the issue is logged.

Backdrops are generated at 16:9, 2K, no chroma key, stored as WebP.

### 9.4 Caching

Cache key is SHA-256 of normalized description (lowercased, articles removed) plus kind plus style version. Hits skip generation entirely. Expected hit rate climbs quickly because children ask for similar things.

### 9.5 Safety check on images

Every generated image is passed to `gemini-3.8-flash` with the image and the question "Is this appropriate for a six-year-old, and does it match the description?" returning a structured verdict. Rejected images are regenerated once; a second rejection leaves the placeholder.

### 9.6 Latency budgets

| Milestone | Target |
|---|---|
| First character audio after child stops speaking | p50 under 1.2 s, p95 under 2.0 s |
| Scene DSL generated and validated (before any assets) | under 6 s |
| World placeholders and backdrop visible after `build_world` | under 3 s (placeholders), under 8 s (backdrop) |
| Hero sprite | under 10 s |
| World `ready` | under 25 s |
| Patch applied | under 6 s |
| Character handoff | under 2 s |

## 10. Data model

Firestore collections. Clients have read access only to their own documents through security rules; all writes come from the gateway, api, or builder through the Admin SDK.

```
users/{uid}
  email, displayName, consentAt, plan ('free' | 'family'), stripeCustomerId, createdAt
users/{uid}/children/{childId}
  firstName, avatar, ageBand ('6-7' | '8-10'), sessionTargetMinutes, loopsCompleted, createdAt
users/{uid}/children/{childId}/discoveries/{concept}
  firstAt, count, worldIds[], title, kidExplanation, realLifeNote
worlds/{worldId}
  ownerUid, childId, title, status ('building' | 'ready' | 'failed'), doc (SceneDoc),
  schemaVersion, promptVersion, styleVersion, assets { entityId: { status, url, colliderUrl } },
  concepts[], thumbnailUrl, jobId, createdAt, updatedAt
worlds/{worldId}/versions/{n}
  doc, patch, reason, createdAt
sessions/{sessionId}
  uid, childId, characterIds[], worldIds[], startedAt, endedAt, voiceSeconds, turns,
  beats, summary, discoveries[], predictions[{ question, answerIndex, correctIndex }], endReason
usageDaily/{uid}_{yyyymmdd}
  voiceSeconds, worlds, images
subscriptions/{uid}
  stripeSubscriptionId, status, tier, currentPeriodEnd
assetCache/{hash}
  url, colliderUrl, width, height, safetyChecked, createdAt
```

All timestamps are stored as integer epoch milliseconds so that the same Zod schemas validate documents on the server and in the browser without converters.

Cloud Storage layout: `assets/{hash}/sprite.webp`, `assets/{hash}/collider.json`, `backdrops/{hash}/bg.webp`, `worlds/{worldId}/thumb.webp`. Generated assets contain no personal data and are served publicly through Cloud CDN with immutable cache headers. Character reaction clips live in `clips/{characterId}/{clipId}.mp3`.

Retention: raw audio is never stored. Live transcripts exist only in gateway memory for the session. Session summaries and discoveries persist. A parent can delete a child profile, which deletes its sessions, discoveries, and worlds within 24 hours through a Cloud Tasks job.

## 11. SaaS

**Auth.** Firebase Authentication for parents (Google sign-in, email and password). The Next.js parent pages verify session cookies server-side. The child app runs under the parent's signed-in session; choosing a child profile sets `childId` in local state.

**Consent.** Sign-up requires a checkbox acknowledging that the parent is an adult creating profiles for their children and consents to voice processing by Google Cloud for the purpose of the service. The consent timestamp is stored. This is a product control, not legal advice; a privacy policy page is part of the marketing site.

**Plans and quotas.** Defined in code, enforced server-side in Firestore transactions.

| | Free | Family |
|---|---|---|
| Children | 1 | 4 |
| Voice minutes per day | 15 | 60 |
| Worlds per day | 3 | 20 |
| Images per world | 8 | 16 |
| Saved worlds | 10 | 200 |

**Billing.** Stripe in test mode. Stripe Checkout for upgrade, Stripe Customer Portal for management. Webhooks (`checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`) update `subscriptions/{uid}` and `users/{uid}.plan`. Webhook signatures are verified; events are idempotent on event id.

**Parent dashboard.** Reads sessions, discoveries, usage, and worlds for the parent's children. Shows engaged minutes per day, loops completed, concept coverage, Discovery Cards, and session summaries.

## 12. Safety and privacy

- The child never enters free text. All child input is voice, tap, drag, or dial.
- Vertex safety settings at the strictest level on every model call.
- Prompt-level policy in every system instruction: no violence, weapons, horror, romance, real-world brands, or requests for personal information; redirect gently.
- Inline transcript moderation (8.7) and DSL category allowlist (5.4) and image safety check (9.5) as layered backstops.
- No raw audio stored; transcripts are discarded at session end; summaries only.
- Child profiles hold a first name, an avatar choice, and an age band only.
- Data stays in US regions. Service accounts are least-privilege per service. Secrets in Secret Manager. Firestore rules deny all client writes.
- A global kill switch (a Firestore config document watched by all services) disables world generation and new sessions within 10 seconds.

## 13. Infrastructure, deployment, observability

**Environments.** Two Google Cloud projects, `just-imagine-staging` and `just-imagine-prod`, created and configured by Terraform in `infra/terraform` with one workspace per project.

**Cloud Run settings.**

| Service | Min / max instances | Concurrency | CPU | Timeout | Notes |
|---|---|---|---|---|---|
| gateway | 1 / 50 | 80 | always allocated, 1 vCPU, 1 GiB | 3600 s | session affinity on |
| api | 0 / 20 | 80 | request-based, 1 vCPU, 512 MiB | 60 s | |
| builder | 0 / 20 | 4 | request-based, 2 vCPU, 2 GiB | 300 s | Cloud Tasks push target |

**CI/CD.** GitHub Actions runs lint, typecheck, unit tests, and contract tests on every pull request. Merges to `main` trigger Cloud Build to build images, push to Artifact Registry, deploy to staging, run Playwright end-to-end against staging, then wait for manual approval to deploy to prod. Firebase App Hosting deploys the web app from the same trigger.

**Observability.** Structured JSON logs with `sessionId`, `childId` (hashed), `worldId`, `jobId`. OpenTelemetry traces from Genkit flows and both services exported to Cloud Trace. Custom metrics: time to first audio, world build time per milestone, DSL validity rate, moderation hits, asset cache hit rate, concurrent sessions. Alerts: gateway 5xx rate above 2 percent for 5 minutes, p95 first audio above 3 s for 10 minutes, builder failure rate above 10 percent, any kill-switch activation. Uptime checks on web and api. Error Reporting on all services.

**Service level objectives for this round.** Gateway availability 99.5 percent monthly. First audio p50 under 1.2 s. World placeholders p95 under 4 s.

## 14. Error handling and resilience

| Failure | Behavior |
|---|---|
| WebSocket drop | Client reconnects with exponential backoff and the session id; gateway resumes the Live session with its handle. |
| Live session GoAway or unexpected close | Reconnect with resumption handle, three attempts; then fresh session with summary (8.8). |
| Builder validation fails twice | Job marked failed. Gateway injects a note; the character says the paint spilled and offers to try a simpler version. A cached fixture world of the nearest concept is offered as a fallback. |
| `gemini-4-argon` slow or failing | Session-level fallback to `gemini-3.8-flash` (4.3). |
| Asset generation fails | Silhouette placeholder remains; world still becomes `ready`; issue logged. |
| Quota exhausted mid-session | Character wraps up with 2 minutes' warning; `quota` message drives a friendly UI countdown. |
| Stripe webhook failure | Stripe retries; handler is idempotent. |
| Kill switch | New sessions refused with a friendly message; existing sessions finish without new worlds. |

The api and builder are stateless. The gateway holds only per-session memory and checkpoints usage every 30 seconds, so an instance loss costs at most 30 seconds of metering.

## 15. Testing strategy

| Layer | Tooling | What is tested |
|---|---|---|
| scene-schema | Vitest | Schema acceptance and rejection, validator rules with fixture worlds, JSON Patch application, migrations. |
| protocol | Vitest | Every message round-trips through Zod. |
| engine | Vitest with headless Rapier (no renderer) | Deterministic replay of fixture worlds and event streams; rule firing; dial effects; soft-body lattice construction. |
| characters | Vitest | RMS to mouthOpen mapping, emotion state transitions. |
| builder | Vitest and Genkit evaluators | Structured-output flows against a recorded model double; eval set of 50 imagination prompts measuring DSL validity rate (target 98 percent), concept-tag accuracy, safety hits (target 0). Evals run nightly against the real model on staging. |
| gateway | Vitest, fake Live server over WebSocket | Session lifecycle, tool-call validation, fire-and-notify injection, resumption, pacing, quota refusal, moderation paths. |
| api | Vitest with Firestore emulator | Quotas in transactions, Stripe webhook idempotency, security rules. |
| End-to-end | Playwright against staging with fake Live and fake builder toggled by a test flag | Sign-up, child profile, Studio loop with a fixture world, dial, prediction, discovery, handoff, parent dashboard. |
| Load | k6 WebSocket scenario | 200 concurrent sessions on staging for 15 minutes with synthetic audio; p95 first audio and error rate within SLO. |

Test-driven development applies to every package: tests are written before implementation for schema, validator, interpreter, gateway state machine, and quota logic.

## 16. Repository layout and ownership

```
just-imagine/
  apps/web/                 Next.js: child app, parent area, marketing        Dev A
  services/gateway/         WebSocket voice gateway                            Dev B
  services/api/             REST api, Stripe, dashboard queries                Dev B
  services/builder/         Genkit flows, validator runner, asset pipeline     Dev B
  packages/scene-schema/    Zod schema, types, validator, patch helpers        Shared (week 1), then Dev B owns, Dev A reviews
  packages/protocol/        WebSocket message schemas                          Shared (week 1), then Dev B owns, Dev A reviews
  packages/engine/          PixiJS + Rapier + DSL interpreter                  Dev A
  packages/characters/      Rive wrappers, lip-sync, emotion mapping           Dev A
  packages/fixtures/        Sample worlds, transcripts, audio clips, fake servers   Shared
  packages/server-core/     Firebase Admin init, token verification, typed Firestore access, quota transactions, kill switch   Dev B
  packages/config/          Shared tsconfig, eslint, prettier                  Shared
  infra/terraform/          Projects, Cloud Run, Firestore, GCS, CDN, IAM       Dev B
  .github/workflows/        CI                                                 Dev B
  docs/                     Specs, runbooks, ADRs                              Shared
```

Tooling: pnpm workspaces, Turborepo, TypeScript strict, Zod 4, Vitest, Playwright, ESLint and Prettier shared config, Node 22.

**How the two developers stay unblocked.** After week one, Dev A works against `packages/fixtures` (fixture worlds, a fake gateway that replays recorded transcripts and audio, and a fake Firestore world stream). Dev B works against the schema and the headless validator, with a minimal HTML test page for the gateway. Integration happens in week 4 on staging.

## 17. Milestones

| Week | Dev A (Experience) | Dev B (Platform and AI) | Exit criteria |
|---|---|---|---|
| 1 | Monorepo, shared packages, fixtures, fake gateway, design system tokens, Studio shell | Same shared work, Terraform for staging, hello-world deploys of all services, CI pipeline | Both devs can run the app locally against fakes; staging exists. |
| 2 | Engine renders fixture worlds with physics, interactions, dials; determinism tests | Gateway voice loop with one character on Vertex Live; `imagineToScene` flow producing valid DSL; validator complete | A child can talk to Bolt on staging; a fixture world plays locally. |
| 3 | Rive characters, lip-sync, emotion states, progressive loading UI, Gallery | Asset pipeline with chroma key and colliders, caching, Firestore progressive publish, all tools wired, fire-and-notify | A spoken wish becomes a generated world on staging. |
| 4 | Full loop integration, prediction and Discovery UI, character handoff, Who's playing | Auth, child profiles, pacing engine, moderation, resumption hardening | Full loop end-to-end on staging with real accounts. |
| 5 | Parent dashboard, marketing page, polish pass | Quotas, Stripe, observability dashboards and alerts, load test | SaaS complete; load test within SLO. |
| 6 | Demo worlds, evals review, submission video | Hardening, runbooks, prod deploy, buffer | Prod deployed; submission ready. |

## 18. Out of scope for this round

Native apps, multiplayer or shared worlds, user-uploaded images or photos, 3D rendering, languages other than English, teacher or classroom mode, offline play, Google Play or App Store billing, live avatars from the Live API, text chat for the child.

## 19. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Live API latency or regional capacity | us-central1 primary; measure in week 2; Provisioned Throughput is available if PAYG proves unstable. |
| Children's speech recognized poorly | VAD tuned for pauses; the character confirms by repeating back; `text` fallback for accessibility. |
| Generated sprites inconsistent in style | Style bible, style version tag, reference images, nightly eval review of samples. |
| Chroma-key artifacts | Feathering and despeckle; regenerate once; placeholder fallback; a background-removal model can be added behind the same interface later. |
| Soft-body feel unconvincing | Lattice parameters tuned on fixtures in week 2; softness can degrade to restitution-only without schema change. |
| Cloud Run WebSocket scaling | Session affinity, CPU always allocated, load test in week 5. |
| `gemini-4-argon` cost or latency | Session-level fallback to `gemini-3.8-flash`; cache hits reduce calls. |
| Two-developer integration risk | Contract-first packages, fakes, weekly integration on staging from week 2. |

## 20. Decisions log

| Decision | Choice | Alternatives considered |
|---|---|---|
| Deadline | 4 to 6 weeks | 2 to 3 weeks; 2 to 3 months |
| Rendering | 2.5D painted world, 2D physics, generated sprites | Full 3D; hybrid 3D stage |
| Age band | 6 to 10 | 4 to 7; 9 to 13 |
| SaaS depth | Full: accounts, profiles, quotas, Stripe tiers, dashboard | Auth and quotas only; single sign-in |
| Live session placement | Server-held in gateway on Vertex AI | Browser-direct with ephemeral tokens (Developer API only) |
| World representation | Declarative Scene DSL with Zod schema | Model-generated code in a sandbox |
| Character voice model | One mic-holder, handoff by new Live session | One voice for all; three concurrent sessions |
| Engine | PixiJS v8 + Rapier2D | Phaser; Matter.js |
| Agent framework | Genkit for builder flows; `@google/genai` directly for Live | ADK for TypeScript (repo warns against production use) |
| Backend language | TypeScript end-to-end | Python for AI services |
| Web hosting | Firebase App Hosting for Next.js | Cloud Run for web |
