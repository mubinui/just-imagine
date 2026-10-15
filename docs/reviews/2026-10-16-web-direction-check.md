# Web direction check: `apps/web`

Read-only review, 2026-10-16, against the design spec (sections 2, 3, 7.3, 8.10, 10–12, 14, 15), the master plan, Plan 0 tasks 8–10/18, Plan A3, and Codex's handoff notes. Verified locally: `vitest run` 12/12 pass, `tsc --noEmit` clean, tree matches commit `2273e1b`. No source file was modified.

## 1. Verdict

The web app is pointed the right way structurally: every boundary goes through `@just-imagine/protocol` (messages, `ROUTES`, `WorldDocSchema`, `CHARACTERS`, `PLAN_LIMITS`), world content arrives only through a `WorldSource`, the profile tap is the single audio gesture, reconnect keeps `sessionId`/`worldId`, and the parent area is a credible Operate surface. The single biggest risk is the Studio itself: it is a vertically scrolling form (title, 380 px canvas panel, `<select>` dials, rows of text buttons) with orange rectangles for a world and a grey CSS blob labelled "Bhombol", not the spec's full-bleed stage with three characters along the bottom edge, a mic indicator, a dial tray and a Discovery toast. A judge will open the hero screen and not see the pitch, and in real mode the Imagine phase has no UI at all before the first `worldJob`.

## 2. Spec coverage

| Requirement | Status | Evidence | Note |
|---|---|---|---|
| Who's playing? (3.5) | Met | `components/ProfilePicker.tsx:30-39,46` | PIN-free, avatars, 64 px targets |
| Studio: full-bleed canvas, 3 characters bottom edge, mic indicator, dial tray, toast, no text input (3.5) | Partial | `components/Studio.tsx:335-611`; `app/globals.css:575-600` | Canvas is a 380 px panel in document flow; one face in a side panel (`:418-426`), cast as text buttons (`:576-594`); no mic indicator, only "Voice connection: connected" text (`:422-424`); no free text ✓ (`e2e/flows.spec.ts:66`) |
| Gallery (3.5) | Met | `components/Gallery.tsx` | Tiles are CSS shapes; `thumbnailUrl` ignored (`:44-57`) |
| Dashboard (3.5, 11) | Met | `components/ParentPanels.tsx:101-208` | Minutes today, 7-day chart, loops, concepts, cards, worlds, sessions, per-child target |
| Children CRUD (3.5) | Met | `ParentPanels.tsx:210-231,346-457` | Plan-limit gate, confirm dialog, tier + early Labs unlock |
| Plan and billing (3.5, 11) | Partial | `ParentPanels.tsx:233-275` | Checkout/Portal via API ✓; usage-against-quota lives on the dashboard, not here |
| Settings: target overrides, deletion (3.5) | Partial | `ParentPanels.tsx:276-307` | Captions + deletion ✓; session target is in the Children form (`:431-443`) |
| Landing with sign-up (3.5) | Met | `app/page.tsx` | Abstract shapes, no characters |
| Play loop UI (3.1) | Partial | `Studio.tsx` | Predict ✓ Play ✓ Discover ✓; Imagine has no affordance (loading text `:381`); Remix has no UI |
| Prediction sheet | Met | `Studio.tsx:428-446` | Section, not a sheet; 64 px option buttons ✓ |
| Discovery Card from concept bank (3.4) | Partial | `Studio.tsx:447-462,256-264` | Real mode renders gateway fields; fake mode uses `conceptCard`/`CONCEPT_BANK` ✓; not a toast, no auto-dismiss, re-fires (defect 4) |
| Dial tray (3.4) | Partial | `Studio.tsx:463-494` | `<select>` with raw preset keys (`moon`, `jupiter`); sends `interaction` dial ✓ |
| Labs slider panel + keypad + clamping (3.5, 3.6) | Met (functional) | `Studio.tsx:495-524,612-646`; `lib/helpers.ts:8-14`; `test/helpers.test.ts:15-21` | Full-width below canvas, not collapsible/right; keypad accepts `9-9` (defect 7) |
| Graph strip + tool buttons (3.5) | Missing | engine draws `visuals` in-canvas (`packages/scene-schema/src/schema.ts:182-226`) | No top-edge strip, no ruler/stopwatch/vector toggles |
| Summon transition + spell flourish (3.7) | Missing | `Studio.tsx:126-133` | `summon` swaps a name; `spell` goes straight to engine |
| Captions default by band + parent toggle | Met | `helpers.ts:3-5`; `Studio.tsx:95,403-416`; `ParentPanels.tsx:281-296`; `helpers.test.ts:9-14` | |
| Who's playing tap = single audio gesture (7.3) | Met | `ProfilePicker.tsx:31-33`; `Studio.tsx:87`; `packages/characters/src/voice-client.ts:45` | Studio never calls `unlockAudio`; redirects if not unlocked |
| Connection lifecycle, reconnect keeps ids (14) | Met | `voice-client.ts:82-88,115-126`; `Studio.tsx:195-230` | Subscription keyed on `worldId` only ✓; terminal error copy wrong (defect 6); no web unit test (A3 Task 7) |
| Firestore WorldSource (8.10, 10) | Met | `lib/world-source.ts:46-57` | `onSnapshot` + `WorldDocSchema.safeParse` |
| Typed REST client over `ROUTES` | Partial | `lib/api.ts` | Paths typed; responses not parsed (section 5) |
| Consent at sign-up (11) | Met | `components/AuthForm.tsx:22-25,84-93`; `app/api/session/route.ts:21-34`; `test/session.test.ts:51-60` | Server-enforced on first user doc, `consentAt` stored |
| 64 px child targets | Met | `globals.css:1070-1080,1384` | Exception: picker `.text-link` ≈55 px (`globals.css:236`; `ProfilePicker.tsx:57`) |
| 44 px parent targets | Met | `globals.css:27,1387`; `.parent-nav a` | |
| Reduced motion | Met | `globals.css:1363-1373` | No JS motion exists to gate |
| Keyboard access | Met | `components/Modal.tsx:17-49`; `Studio.tsx:541-575` | Entity buttons give canvas an alternative |
| Fake mode via env flag (15) | Met | `lib/env.ts:3`; `api.ts:12`; `world-source.ts:14`; `lib/voice.ts:9-10` | Firebase Auth bypassed in fake (`ChildGuard.tsx:9-12`); plan expected emulator |
| Playwright flow coverage (15) | Partial | `e2e/flows.spec.ts` (5 tests) | Covers gesture→studio→prediction→dial→keypad→end, parent CRUD, responsive, origin, slider coalescing. Missing: discovery, handoff/summon, reconnect, sign-up, Gallery→Studio, dashboard assertions, axe |

## 3. Design quality

**Brief:** realistic cartoon, Disney-inspired, cute, tablet landscape. **Rule:** CLAUDE.md item 6 requires the `impeccable` skill for direction, each screen, and finish.

**Process.** The skill was not run as the rule describes. There is no `apps/web/.impeccable/` directory, no surface brief, no direction contract; `PRODUCT.md` is prose (the review notes the "legacy schema" flag); `web-report.md` says only that craft guidance "was read". `DESIGN.md` was written by hand. The two-direction split (child Experience world vs parent Operate world, plan Task 2 Steps 3–4) collapsed into one palette: `globals.css:13-28` defines a single `:root` set, and `[data-world='child']` (`:1070`) changes only `--tap`. The child world is the parent world with bigger buttons.

**Production-grade.** The parent dashboard (`test-results/parent-desktop.png`): calm cream/green, Baloo headings, clean nav rail, 44 px rows, native `<progress>`/`<meter>`, honest preview banner. Typography is consistent (Baloo 800 + Nunito, self-hosted with licences). Focus rings (`globals.css:93-98`), confirm `alertdialog`, Escape/Tab trapping. The brand mark (`components/Mark.tsx`) is a real logo. The landing is tidy and reads as a calm SaaS page.

**Placeholder.** Everything a child looks at. The world is the engine's fallback geometry (orange rounded rectangles on `#eaf4f1`). The character is one of three CSS blobs chosen by hard-coded id (`CharacterFace.tsx:62-70`), so the golden puppy Bhombol renders as the grey "panda", Mishti and Chandni share one fox face, and the cast strip is six text buttons. The dial tray is two `<select>`s whose options are code keys (`Studio.tsx:480-489`). The Discovery Card is a green rectangle below the fold. The landing's "wonder window" is three coloured shapes and two ellipses (`globals.css:263-330`); nothing on the page says children, characters, or physics.

**What a judge notices first**, in order: (1) the Studio screenshot: a pale box with orange blocks and a grey blob, below a page header; no magic, no stage. (2) The page scrolls: on a 1180×820 iPad, the cast and world picker are below the fold; the spec's "three characters along the bottom edge" does not exist. (3) The parent dashboard says "You discovered something!", "My worlds" and "Sample worlds" (`ParentPanels.tsx:117,169,183`; `lib/strings/en.ts:16,41,118`), child/preview copy leaking into the grown-up space even in real mode. (4) The dial labels "moon", "jupiter", "none" in lowercase in a dropdown, where the spec's attention beat should be a tap.

What is good and should be kept: the token set is coherent and the parent area is already shippable in tone; the caption bar overlaid on the canvas (`globals.css:631-643`) and the status chip top-right are the right instincts for the stage.

## 4. Defects (by severity)

1. **P1 — Real-mode Imagine phase has no UI.** `Studio.tsx:267-292` mounts the engine only when `hasWorld`; `:381` shows `s.load` ("Opening your family space…", `en.ts:60`) until a `worldJob` arrives. Scenario: child taps Ari, gateway says "What shall we build?", screen shows a parent-space loading message over an empty panel, no mic cue, nothing says "speak". The first 10–30 s of every real session look broken.
2. **P1 — Summon and spell have no presentation.** `Studio.tsx:126-133`. Scenario: Jadu Kaka casts `reverseGravity`; the world flips with no flourish, caption or announcement; the child cannot tell a spell happened from a bug. Summoning Pori Apu swaps the face only.
3. **P2 — Studio layout is not the spec screen.** `globals.css:575-600` (`.studio-grid` 1fr/210 px, `.play-world` 380 px min-height). Scenario: on an iPad in landscape the cast strip and dials require scrolling past the canvas; the child loses the world while reaching the dials.
4. **P2 — Fake-mode Discovery Card re-fires on every concept-tagged engine event.** `Studio.tsx:256-264` sets a card for any event with `concept`. `galton-board.json` has `drop_ball:timer:REPEAT:probability`; `fractions-lab.json` `split:tap:REPEAT:fraction`. Scenario: pick "Peg Garden Probability", close the card, it reappears on the next ball drop, forever. This is the demo path.
5. **P2 — Character faces mapped by hard-coded id, three faces for six characters.** `CharacterFace.tsx:62-70`. Scenario: switch Mishti → Chandni, nothing changes; Bhombol/Onko Mama/Jadu Kaka are identical. `CHARACTERS[id].look` is never used.
6. **P2 — Terminal reconnect failure shows "reconnecting" forever.** `voice-client.ts:118-122` sets status `error` after five tries; `Studio.tsx:360-364` renders `s.disconnected` for both `reconnecting` and `error`, with no retry. Scenario: gateway down → child sees "Voice is reconnecting" indefinitely.
7. **P3 — Keypad accepts invalid sequences.** `Studio.tsx:623-627` appends `-`/`.` anywhere; `Number('9-9')` is `NaN` → `clampToVariable` returns `min` silently (`helpers.ts:9`). Scenario: child enters `1`, `-`, `5`, applies, gets the minimum with no feedback.
8. **P3 — `simEvent` sent for every `rule` event, unthrottled.** `Studio.tsx:238-243`; engine `tap()` fires rules on every call (`packages/engine/src/simulation.ts:652-656`), bypassing the 0.5 s input throttle. Spec 8.10 says throttled. Scenario: hammering the dragon 10×/s sends 10 `simEvent`/s; gateway drops them within 500 ms (`services/gateway/src/gateway.ts:496`) and closes at >30 control/s (`:527`), so this is noise, not a disconnect, until a repeat collision rule on a many-body world.
9. **P3 — Parent copy leaks child/preview strings** (see section 3, item 3). `s.worldSaved` "Sample worlds" renders in real mode (`ParentPanels.tsx:117`).
10. **P3 — Captions preference snapshot.** The child doc is frozen into `localStorage` at pick time (`ProfilePicker.tsx:35`; `Studio.tsx:84-95`); a parent toggling captions mid-session has no effect until re-pick.
11. **P3 — Google sign-in on `/sign-in` demands consent from returning parents.** `AuthForm.tsx:22` (`!form` branch). Friction, not a safety hole; the server only requires consent for a new user.
12. **P3 — Quota countdown is raw seconds.** `Studio.tsx:373-377` prints "Voice seconds remaining: 120"; spec 14 asks for a friendly countdown; `QUOTA_WARNING_SECONDS` unused.

## 5. Contract conformance

**Uses the contract correctly:** `ClientMessage`/`ServerMessage` types and the exhaustive `switch` (`Studio.tsx:108-159`); `hello` built per schema with `characterId` matched to the gateway's band check (`Studio.tsx:165-180`; `gateway.ts:563-564`); `interaction` dial/entity refinements satisfied (`:245-250,474`); `variable`, `challengeResult`, `predictionAnswer`, `switchCharacter`, `end` all schema-shaped and parsed by `VoiceClient.send` (`voice-client.ts:127-130`). `WorldDocSchema`, `paths.world` (`world-source.ts:49-51`). `ChildResponseSchema` for the stored profile (`Studio.tsx:84`). `CreateChildBodySchema`/`UpdateChildBodySchema` enforced in the demo transport (`lib/demo.ts:62,79`), and the children form sends only picked fields (`ParentPanels.tsx:367-372`). `UserDocSchema.parse` on account creation (`route.ts:26-33`). `PLAN_LIMITS`, `AgeBandSchema`, `AvatarSchema`, `defaultTierFor`, `conceptCard`, `CONCEPT_BANK`, `GRAVITY_PRESETS`/`WIND_PRESETS`.

**Drift / hand-rolled shapes:**

- `lib/api.ts:22-26` returns `response.json()` cast to `T` with no Zod parse; error bodies read as `error?.error?.message` instead of `ApiErrorSchema`. Master-plan constraint ("parsed at the boundary") not met on the read side.
- `ParentPanels.tsx:254,266` type checkout/portal as inline `{ url: string }` instead of `CheckoutResponse`/`PortalResponse`.
- `route.ts:18` hard-codes `deletionLocks/${uid}`; `paths` (`packages/protocol/src/firestore.ts:140-160`) has no such entry, so the api service and this route must agree out of band.
- `lib/helpers.ts:6-7` `castFor` re-implements band filtering rather than composing `guidesFor`; harmless but duplicative.
- Fake-mode discovery fills `kidExplanation` with `kidHint` (`Studio.tsx:262`); the bank marks `kidHint` as model input, not card copy.
- `Studio.tsx:410` renders `world.status` (`WorldStatus`) in the chip; `worldJob.status` (`WorldJobStatus`, six values) is received but never shown, so "placeholders"/"hero" progress is invisible.
- `demo.ts:14,89-90` and `ProfilePicker`/`Gallery` use ad-hoc storage keys (`ji-child`, `ji-world`, `ji-fixture`, `ji-deleted-worlds`) with no schema; `Gallery.tsx:15` parses `ji-child` without `ChildResponseSchema`.

## 6. Remaining work

Ordered by value. "Safe" means a second agent can do it now without touching Codex's open files (`globals.css`, `Studio.tsx`, `ParentPanels.tsx`, `world-source.ts`, `e2e/flows.spec.ts`).

1. **Imagine-phase stage** (defect 1): mount a listening state with the character, mic pulse and "Tell me what you imagine" caption before the first world; replace `s.load` in the Studio. `Studio.tsx`, `en.ts`. — conflicts with Codex.
2. **Studio stage layout** (defect 3, section 3): full-bleed canvas with cast strip at the bottom edge, overlay dial tray, toast-style Discovery Card, status chip showing `worldJob.status`. `Studio.tsx`, `globals.css`. — conflicts.
3. **`SummonOverlay.tsx` and `SpellFlourish.tsx`** (defect 2): new components with reduced-motion fallbacks and announced copy; wire on `summon`/`spell`. New files — safe; wiring into `Studio.tsx` — conflicts.
4. **Six distinct character faces** (defect 5): derive from `CHARACTERS[id].look`/`kind`; SVG or CSS per id, emotion states. `CharacterFace.tsx` — safe; `globals.css` additions — conflicts (put styles in a new `character.css` imported by the component to stay safe).
5. **Dial tray as 64 px segmented buttons** with friendly option labels from `en.ts`. `Studio.tsx`, `en.ts` — conflicts.
6. **Discovery de-dup and auto-dismiss** (defect 4): per-world `Set<Concept>` in fake mode, timed dismiss, keep accessible. `Studio.tsx` — conflicts.
7. **Graph strip and tool toggles**: needs an engine API to show/hide `visuals`; coordinate with the engine owner first. `Studio.tsx` + engine — conflicts.
8. **Typed API client** (section 5): parse every response with the matching `*ResponseSchema`, errors with `ApiErrorSchema`, 204 handling. `lib/api.ts` — safe. Add `test/api.test.ts` — safe.
9. **Reconnect terminal state** (defect 6): distinct `error` copy and a retry that re-runs `connect` with the stored hello. `Studio.tsx`, `en.ts` — conflicts/safe.
10. **Keypad validation** (defect 7): one leading `-`, one `.`, live clamp preview. `Studio.tsx` — conflicts.
11. **Parent copy** (defect 9): `s.parentWorlds`, `s.parentDiscoveries`, `s.savedWorlds`; move session target to Settings or cross-link. `en.ts` — safe; `ParentPanels.tsx` — conflicts.
12. **Playwright gaps**: discovery card, handoff/summon (add a `switchCharacter`→`summon` step to `packages/fixtures/scenarios/jelly-dragon.json`), reconnect (stop the gateway mid-test), 6-7 profile captions-off, Gallery→Studio, dashboard assertions, axe scan. New file `e2e/studio-extra.spec.ts` — safe; editing `flows.spec.ts` — conflicts.
13. **Studio lifecycle unit tests** (A3 review-focus items 1 and 5): needs jsdom + Testing Library in `package.json` (coordinate the install), then `test/studio-session.test.tsx` — safe once deps land.
14. **Gallery thumbnails**: render `thumbnailUrl` when present, keep CSS tile as fallback. `Gallery.tsx` — safe.
15. **Impeccable pass**: run the skill for both directions, write `.impeccable/` briefs and contracts, regenerate `DESIGN.md` with the documenter. Process task that will rewrite `globals.css` — conflicts; schedule after Codex's current edit lands.
16. **Landing hero art**: replace the shape composition with character/world illustration (needs assets). `page.tsx`, `globals.css` — conflicts.

## 7. Completion estimate

**About 55 %**: the screens, flows, contract wiring and parent area are roughly 70 % of the functional spec, but the child-facing design direction (stage layout, characters, summon/spell, Labs chrome) is nearer 30 %, and that is what the submission is judged on.
