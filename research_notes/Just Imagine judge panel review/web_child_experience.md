# Child-facing web experience of Just Imagine: a UX/design judge's audit

Scope: `apps/web` child surfaces (landing as entry, profile picker, Studio, GenerationShow, saved worlds gallery, Learn map and packs, Katha's story room, companion menu, pets). Judged against the project's stated bar, "realistic-cartoon, Disney-inspired, cute, legible on a tablet in landscape" ([CLAUDE.md](file:///Users/mubinuiislam/Home/Hackathons/just-imagine/CLAUDE.md)).

How the evidence was gathered: the Docker "real build" at http://localhost:3300 (web, API 3301, builder 3302, gateway 8788, Firebase emulators). Container env shows `NEXT_PUBLIC_FAKE=0` and real model IDs (`SCENE_MODEL=gemini-4-argon`, `LIVE_MODEL=gemini-3.8-live`), so voice and builds hit real models (docker inspect, this session). Playwright used Chromium with a fake microphone, iPad landscape 1180x820 as the main viewport. Screenshots are in `/private/tmp/claude-502/-Users-mubinuiislam-Home-Hackathons-just-imagine/7ea1b76e-ae56-4b7f-80de-c9cec5c34ac9/scratchpad/shots/`, shortened below as `shots/`. Files named `real-`, `real2-` and `real4-` come from the earlier auditor. I added `real5-` and `real6-` with `audit5.cjs` and `audit6.cjs` in the same scratchpad.

Labels: **VERIFIED** means I saw it in a screenshot or measured it in a run. **READ** means it comes from source code only.

Caveat: the working tree changed while I was auditing. `components/studio/CreationActions.tsx` gained `IdeaStarters` and stopped clearing the draft between my two reads of it. So the source may now differ from the Docker build I tested. Line numbers are from the working tree at about 17:00 on 2026-10-17.

---

## 1. How many taps from landing to "child talking to a character in a world", and where do a child or judge get stuck?

### Takeaway

A signed-in family needs 3 taps to start talking (Let's play, then the child's profile, then Talk). A first-time judge needs about 8 steps, including email and password typing and a browser mic prompt. In my real-build run, the step "talk and get a world" failed: after about 33 s of a generic waiting animation the build ended in "Your world could not finish". The friend never offered a ready-made world, because that offer is only wired in fake mode.

### Cited Findings

- **Signed-out path, VERIFIED.** Landing "Start imagining" goes to "Parent sign in": email, password, a consent checkbox shown even on sign-in, then Continue. Next is "Who's imagining today?" (tap Ari), then Studio, then Talk, then the browser mic permission, then speaking. That is about 8 interactions plus typing. There is no guest or sample-family path on the real build. The `previewSignIn` "Open sample family" exists only when `env.fake` is set. Sources: [shots/real-landing-ipad.png](shots/real-landing-ipad.png), [shots/real-signin-ipad.png](shots/real-signin-ipad.png), [shots/real-play-picker-ipad.png](shots/real-play-picker-ipad.png), [AuthForm.tsx:20-26,98-102](file:///Users/mubinuiislam/Home/Hackathons/just-imagine/apps/web/components/AuthForm.tsx), [en.ts:137](file:///Users/mubinuiislam/Home/Hackathons/just-imagine/apps/web/lib/strings/en.ts).
- **Speed, VERIFIED.** Sign-in through profile pick to the Studio took 2,048 ms. Profile tap to Studio took 221 ms. Sources: `real5-report.json` `signInToStudioMs`; `real2-report.json` `pickToStudioMs`.
- **Voice connects quickly, VERIFIED.** After tapping Talk the status reads "Connecting" at 1 s and "Listening" by 2.5-5 s. The gateway WebSocket delivered `ready`, `transcript` and binary audio frames (223 frames in about 13 s), so the friend really speaks. Sources: [shots/real2-studio-talk-1s.png](shots/real2-studio-talk-1s.png), [shots/real2-studio-talk-5s.png](shots/real2-studio-talk-5s.png), `real2-report.json` `ws`.
- **Real text build failed, VERIFIED.** I typed "A bouncy red dragon on the moon who juggles stars" and pressed "Make my world".
  - 0.8 s: Connecting. 2.5-5 s: Listening. About 9 s: `worldJob:queued` and GenerationShow appears.
  - 14-28 s: the show loops "Should it be big or tiny?". The job never progresses past `queued`.
  - About 35-40 s: `worldJob:failed`. A toast says "Your world could not finish. Please try making it again." The stage falls back to "Tell Pip what you imagine".
  - Builder log: `scene_build success:false durationMs:32680`, after one failed and one successful `game_plan_model` call to gemini-4-argon.
  - Sources: [shots/real5-build-9.0s.png](shots/real5-build-9.0s.png), [shots/real5-build-28.0s.png](shots/real5-build-28.0s.png), [shots/real5-build-40.0s.png](shots/real5-build-40.0s.png), `real5-report.json` `ws` (`ready, worldJob:queued, …, worldJob:failed`), `docker logs just-imagine-local-builder-1`.
- **No fallback world in real mode, READ.** The "late" beat's "Want to pick a world instead?" button is wired only when `env.fake` is set (`onOfferFallback={env.fake ? … : undefined}`). In real mode a slow or failed build leaves the child with an error toast and an empty stage. Sources: [Studio.tsx:754-762](file:///Users/mubinuiislam/Home/Hackathons/just-imagine/apps/web/components/Studio.tsx), [GenerationShow.tsx:24,36-38](file:///Users/mubinuiislam/Home/Hackathons/just-imagine/apps/web/components/studio/GenerationShow.tsx), [Studio.tsx:262-268](file:///Users/mubinuiislam/Home/Hackathons/just-imagine/apps/web/components/Studio.tsx).
- **"Build a game" does not build anything, VERIFIED + READ.** The dock tile sends `newGame`, which clears the current world (`selectWorldId(undefined)`) and starts a voice turn. With a fake mic the session sat at "Listening" for 60 s and nothing was built. Sources: [Studio.tsx:252-260,686-698](file:///Users/mubinuiislam/Home/Hackathons/just-imagine/apps/web/components/Studio.tsx), [shots/real2-studio-build-15s.png](shots/real2-studio-build-15s.png), [shots/real2-studio-build-60s.png](shots/real2-studio-build-60s.png).
- **Opening a saved world works, VERIFIED.** Gallery tile, then Studio with a painted backdrop and characters. This is the reliable path to "talking in a world". Source: [shots/real4-world-open-ipad.png](shots/real4-world-open-ipad.png).
- **No parent gate, VERIFIED + READ.** The child header's "Parent space" link goes straight to `/parent/dashboard`, which holds billing, settings and child deletion. Clicking it from `/studio` landed on the parent dashboard with no grown-up check. Sources: [Shell.tsx:26](file:///Users/mubinuiislam/Home/Hackathons/just-imagine/apps/web/components/Shell.tsx), [shots/real4-child-to-parent.png](shots/real4-child-to-parent.png).
- **Parent copy on the child loading screen, READ.** `ChildGuard` shows `s.load` = "Opening your family space…" while child screens authenticate. Sources: [ChildGuard.tsx:20](file:///Users/mubinuiislam/Home/Hackathons/just-imagine/apps/web/components/ChildGuard.tsx), [en.ts:82](file:///Users/mubinuiislam/Home/Hackathons/just-imagine/apps/web/lib/strings/en.ts).

### Inferences

- In a live judging demo, the headline promise ("say an idea and get a world") rests on one real build that I saw fail once in one attempt. Without a real-mode fallback, a failure in front of judges ends in an error toast. Whoever demos should open a saved world as the backup, and the fallback offer should be wired for real mode.
- "Build a game" clearing the child's world without building anything will look like a bug to a judge who taps it.

### Gaps

- I ran only one real text build because each one costs real model calls. The failure rate is unknown. The builder/gateway researcher should report the root cause of `scene_build success:false`.
- I could not test a real spoken wish: the fake microphone plays a tone, not words.

---

## 2. How well does the Studio communicate its state (listening, thinking, building, playing), and what are the error states?

### Takeaway

Idle and listening are clear: a big friend portrait, a headline, an animated dot-orb and a status pill. Building (GenerationShow) is the weakest screen. It is small and mostly CSS, its role text is nearly invisible, and it waits on one "Getting ready" state. Error states use the wrong words: denying the microphone tells a 7-year-old to "sign in with the correct account" in formal Bangla, and an unreachable gateway shows "Reconnecting" forever under a headline that still asks the child to speak.

### Cited Findings

- **Idle, VERIFIED.** "Tap a friend to start" with a large Pip portrait and a status pill ("Voice off"). At 1180x820 and 1024x768, the subtitle under the headline overflows the stage card and is cut off. The audit measured `listeningP.bottom 573 > containerBottom 552` (overflow true). Sources: [shots/real-studio-idle-laptop.png](shots/real-studio-idle-laptop.png), [shots/real-studio-idle-ipad-sm.png](shots/real-studio-idle-ipad-sm.png), [shots/real5-studio-en-idle.png](shots/real5-studio-en-idle.png), `real3-report.json` `studioLayout`.
- **Listening, VERIFIED.** A gold dot-orb ring around the friend, a mic badge, "Tell Pip what you imagine", and a "Listening" pill. Tapping a friend opens an introduction card ("Mishti · World artist …"). Sources: [shots/real2-studio-talk-5s.png](shots/real2-studio-talk-5s.png), [shots/real4-studio-tap-friend-5s.png](shots/real4-studio-tap-friend-5s.png).
- **No "thinking" or "speaking" pill, READ.** The status labels are only Connecting, Listening, Reconnecting, Voice lost and Voice off. Speaking is shown only by the orb mode and an `is-speaking` class. Sources: [en.ts:149-156](file:///Users/mubinuiislam/Home/Hackathons/just-imagine/apps/web/lib/strings/en.ts), [studio/parts.tsx:206](file:///Users/mubinuiislam/Home/Hackathons/just-imagine/apps/web/components/studio/parts.tsx).
- **GenerationShow visuals, VERIFIED.**
  - The show sits in a roughly 450x250 card above the form, with lots of empty dark green around it.
  - It contains a tiny Pip sprite at a desk (about 40 px), a pastel rectangle "canvas" and a soft spotlight blob.
  - The role line "Pip · Inventor & builder" is grey on green and almost unreadable, and it runs into "Putting the pieces together".
  - The status pill reads "Getting ready" for the whole 30 s, because the job never left `queued`.
  - The caption pill rotates through "Painting the sky and the ground…" and "Should it be big or tiny?".
  - Sources: [shots/real5-build-9.0s.png](shots/real5-build-9.0s.png), [shots/real5-build-28.0s.png](shots/real5-build-28.0s.png).
- **GenerationShow design is thoughtful, READ.** Beats are driven by job status and clocks, the 25 s `LATE_MS` triggers a "My paint spilled!" apology, and the code states "Nothing here is ever a static spinner". In practice the builder sent only `queued` and then `failed`, so the middle beats never ran. Sources: [GenerationShow.tsx:8-25,31-45](file:///Users/mubinuiislam/Home/Hackathons/just-imagine/apps/web/components/studio/GenerationShow.tsx), `real5-report.json` `ws`.
- **Build failure, VERIFIED.** A generic cream toast, "Your world could not finish. Please try making it again.", with no friend reaction and no alternative offered. The toast was still showing after the session moved on (seen at 6 s in a later state). Sources: [shots/real5-build-40.0s.png](shots/real5-build-40.0s.png), [shots/real5-offline-talk-6s.png](shots/real5-offline-talk-6s.png).
- **Mic denied, VERIFIED + READ.** With `getUserMedia` rejecting `NotAllowedError("Permission denied")`, the toast reads "এই কাজের অনুমতি নেই। সঠিক অ্যাকাউন্ট দিয়ে প্রবেশ করুন।" ("You do not have permission for this. Sign in with the correct account."), using the formal আপনি register. The cause is `uiError`, which sends any message matching `/permission|forbidden|administrator/` to an account-permission string. The English UI would show the raw "Permission denied". There is no microphone-specific copy anywhere in `en.ts`. Sources: [shots/real4-studio-mic-denied.png](shots/real4-studio-mic-denied.png), `real4-run.log` `micDenied`, [lib/i18n/ui.ts:47-62](file:///Users/mubinuiislam/Home/Hackathons/just-imagine/apps/web/lib/i18n/ui.ts), [Studio.tsx:167-180](file:///Users/mubinuiislam/Home/Hackathons/just-imagine/apps/web/components/Studio.tsx).
- **Gateway unreachable, VERIFIED.** With requests to the gateway port aborted, the status shows "আবার সংযোগ হচ্ছে" (Reconnecting) at 2 s and still at 12 s. There is no error, the headline keeps asking the child to talk, and the Stop button stays live. Sources: [shots/real4-studio-gateway-down-2s.png](shots/real4-studio-gateway-down-2s.png), [shots/real4-studio-gateway-down-12s.png](shots/real4-studio-gateway-down-12s.png), `real4-run.log` `gatewayDown`.
- **Offline, VERIFIED.**
  - Going offline and tapping Talk gives "Reconnecting" at 3 s and still at 12 s, with no offline message, under "Tell Pip what you imagine" (`real6-report.json` `offline3`/`offline12`; [shots/real6-offline-start-12s.png](shots/real6-offline-start-12s.png)).
  - Reloading the Studio while offline gives a blank white page, with no service worker or offline shell ([shots/real-studio-offline-reload.png](shots/real-studio-offline-reload.png)).
  - The copy has an unused-looking `localWorlds` string, "These sample worlds are playable offline…" ([en.ts:95-96](file:///Users/mubinuiislam/Home/Hackathons/just-imagine/apps/web/lib/strings/en.ts)).
- **Quota, READ.** `uiError` maps quota or limit messages to "এই মুহূর্তের বরাদ্দ শেষ… অভিভাবককে বলুন" (formal register). There are friendly `quotaFriendly` and `quotaSoon` strings. I did not trigger quota. Sources: [lib/i18n/ui.ts:55-57](file:///Users/mubinuiislam/Home/Hackathons/just-imagine/apps/web/lib/i18n/ui.ts), [en.ts:179-180](file:///Users/mubinuiislam/Home/Hackathons/just-imagine/apps/web/lib/strings/en.ts).
- **Reload mid-session, VERIFIED.** It returns cleanly to idle ("Voice off"). Source: [shots/real2-studio-after-reload.png](shots/real2-studio-after-reload.png).

### Inferences

- The states a child sees most often (waiting, failure, no connection) are where the friend character disappears and system-error language takes over. For ages 6-10 every failure should be voiced by the friend, with one big obvious next step.

### Gaps

- I could not capture a successful build's hero, props and reveal beats, or a world appearing after generation, because the build failed.

---

## 3. Are Studio, Learn, Stories, Companion and Pets coherent, or is this scope sprawl?

### Takeaway

There are at least five navigation patterns and three visual styles across the child screens, over twenty named characters, and four separate ways to start a voice conversation. Each screen is polished on its own, but a 7-year-old (or a judge in 3 minutes) has to learn several apps.

### Cited Findings

- **Navigation patterns, VERIFIED.**
  1. Landing, picker and gallery use a marketing top bar (logo, "Let's play", "Parent space") plus a "Back" button ([shots/real6-gallery-en.png](shots/real6-gallery-en.png)).
  2. The Studio has a title bar plus a 13-control bottom dock: 5-6 friends, Talk, Build a game, Start over, Captions, Learn, companion, Finish playing ([shots/real5-studio-en-idle.png](shots/real5-studio-en-idle.png); [Dock.tsx:102-221](file:///Users/mubinuiislam/Home/Hackathons/just-imagine/apps/web/components/studio/Dock.tsx)).
  3. The Learn map has a title bar plus a different dock (points, companion, My pets, Studio) ([shots/real-learn-ipad.png](shots/real-learn-ipad.png)).
  4. A Learn pack adds top-right chips (Meet your friend, Story chapters), in-scene action buttons and a third dock variant (Planets, Galaxy & Moon, My pets, Map) ([shots/real-learn-pack-ipad.png](shots/real-learn-pack-ipad.png), [shots/real6-learn-activity.png](shots/real6-learn-activity.png)).
  5. The story room has its own top bar ("← Learning worlds", title, "New story"), a footer link and a floating companion bubble ([shots/real6-story-open.png](shots/real6-story-open.png)).
  6. The companion popover is a list menu (Our adventure, Saved worlds, Choose explorer, Learning worlds, Katha's story room) with its own "Talk together" button ([shots/real5-companion-menu-learn.png](shots/real5-companion-menu-learn.png)).
  7. Pets is a modal grid ([shots/real5-pets-shelf.png](shots/real5-pets-shelf.png)).
- **Visual styles, VERIFIED.** Cream "calm" marketing for the landing, picker and gallery. Dark-green stage for the Studio and Learn. A photographic forest backdrop for Stories. Going from the dark Studio to "My worlds" switches back to the cream marketing style. Sources: [shots/real-gallery-ipad.png](shots/real-gallery-ipad.png) vs [shots/real-studio-idle-laptop.png](shots/real-studio-idle-laptop.png) vs [shots/real-stories-ipad.png](shots/real-stories-ipad.png).
- **Voice entry points, VERIFIED.** The Studio Talk button ("Talk to Pip"), the companion's "Talk together", the Learn "Call the sun" phone and "Ask Sun", and the story room's "Katha, read with me" and "Tell Katha". The explore menu sits next to the Studio Talk button and offers a second Talk control in the same view. Sources: [shots/real4-studio-explore-menu.png](shots/real4-studio-explore-menu.png), [shots/real2-learn-chapter-2.png](shots/real2-learn-chapter-2.png), [shots/real6-story-open.png](shots/real6-story-open.png).
- **Cast size, VERIFIED + READ.**
  - Studio friends: Mishti, Pip (Bhombol renamed by the parent's companion setting), Chandni, Pori Apu, Onko Mama, Jadu Kaka.
  - Six Learn hosts (Saturn, Lion, Heart, Carrot, Tooth, a girl), plus the Sun, Katha the owl, Neel the fox, and 8 pets.
  - The cast is documented three ways. CLAUDE.md says "Pip the kitten, Bolt the puppy, Luna the cat". The README says "Mishti, Bhombol, and Chandni". The UI shows "Pip" as a puppy.
  - Sources: [README.md:9](file:///Users/mubinuiislam/Home/Hackathons/just-imagine/README.md), [CLAUDE.md](file:///Users/mubinuiislam/Home/Hackathons/just-imagine/CLAUDE.md), [packages/protocol/src/characters.ts:40-102](file:///Users/mubinuiislam/Home/Hackathons/just-imagine/packages/protocol/src/characters.ts).
- **Inconsistent words for "world", VERIFIED.** Bangla uses জগৎ in the Studio, দুনিয়া in the gallery, and "শেখার জগত" (different spelling) in the story room back link. Sources: [shots/real-gallery-ipad.png](shots/real-gallery-ipad.png), [shots/real-stories-ipad.png](shots/real-stories-ipad.png), [shots/real-studio-idle-laptop.png](shots/real-studio-idle-laptop.png).
- **Age band disagrees, VERIFIED.** The landing says "ages 6–13" ([app/page.tsx:44](file:///Users/mubinuiislam/Home/Hackathons/just-imagine/apps/web/app/page.tsx)). CLAUDE.md says 6 to 10. The picker card shows "Ages 8-10".

### Inferences

- A judge will read this as breadth that pulls focus away from the "imagine → world → physics" core. The strongest single story is the Studio, but Learn and Stories look more finished, so the core looks like the weaker sibling.

### Gaps

- None material.

---

## 4. Art quality: real painted or generated assets, or CSS and emoji?

### Takeaway

The character and backdrop art is genuinely good and on brief: soft 3D-cartoon Pixar-style characters and painted cinematic scenes. It is uneven across screens, though. The gallery uses CSS blobs instead of world thumbnails, GenerationShow is mostly CSS, and opened worlds show unpainted collider rectangles.

### Cited Findings

- **Strong art, VERIFIED.**
  - Learn map hosts on floating islands ([shots/real-learn-ipad.png](shots/real-learn-ipad.png)).
  - The Sun host over a painted observatory ([shots/real-learn-pack-ipad.png](shots/real-learn-pack-ipad.png)).
  - The Katha owl and the story page illustration of a fox and owl with a cardboard rocket ([shots/real-stories-ipad.png](shots/real-stories-ipad.png), [shots/real6-story-open.png](shots/real6-story-open.png)).
  - Studio friend portraits ([shots/real-studio-idle-laptop.png](shots/real-studio-idle-laptop.png)).
  - A generated world backdrop of a Bengali pond village ([shots/real4-world-open-ipad.png](shots/real4-world-open-ipad.png)).
- **Asset inventory, VERIFIED (measured from `apps/web/public`).** Total 108 MB.
  - `characters/acting`: 14 sprite sheets as webp, about 215-500 KB each, plus 14 PNG sources.
  - `characters/specialists`: 3 webp and 3 PNG.
  - `learn/cinematic`: 24 webp and 23 PNG, 56 MB.
  - `learn/backdrops`: 9 hand-written SVG plus 9 small webp, 8-25 KB. These are gradient scenes, not painted.
  - `worlds`: 8 webp fixture sprites and backdrops. `PROVENANCE.md` says they were "AI-generated demonstration sprite … static local fixture asset, not evidence of live Vertex generation".
  - `sound`: 80 files; `music`: 12; `learn/sounds`: 27 (CC0 animal sounds plus a synthesized ring).
  - 40 PNGs over 500 KB, 82 MB of PNG in total, and no PNG is referenced by `components/`, `lib/` or `app/` (grep found no matches). They are dead weight in the deploy image.
  - Sources: `find`/`du` output this session, [public/worlds/PROVENANCE.md](file:///Users/mubinuiislam/Home/Hackathons/just-imagine/apps/web/public/worlds/PROVENANCE.md).
- **Gallery has no thumbnails, VERIFIED + READ.** All 11+ saved worlds show a pastel CSS blob, and most share the subtitle "Gravity pulls down". `Gallery.tsx` falls back to `world-thumbnail-missing` when `thumbnailUrl` is null. Sources: [shots/real6-gallery-en.png](shots/real6-gallery-en.png), [Gallery.tsx:19-28,112-113](file:///Users/mubinuiislam/Home/Hackathons/just-imagine/apps/web/components/Gallery.tsx), `real2-report.json` `galleryBtns`.
- **Opened world shows debug-looking shapes, VERIFIED.** A flat dark-green rectangle on the left, a translucent rectangle over the pond, a small pink circle, and a cream strip under the backdrop. The canvas is 661x372 inside a 1180x820 viewport, leaving large empty dark areas. Object-name chips ("Rain cloud", "Lily pad", "Raindrop") overlap the cloud sprite. Sources: [shots/real4-world-open-ipad.png](shots/real4-world-open-ipad.png), `real4-run.log` `worldPerf.canvas`.
- **Pets, VERIFIED.** 8 grey locked silhouettes at 10-250 points. The child has 3 points, so every pet is "?". Source: [shots/real5-pets-shelf.png](shots/real5-pets-shelf.png).

### Inferences

- The art direction itself would compete for a "Best UI/UX" prize. What lets it down is the places where the pipeline's output (thumbnails, collider shapes, GenerationShow) shows instead of authored art, which are exactly the surfaces that demonstrate the AI.

### Gaps

- I did not check whether the left green rectangle is an intended wall entity that is missing its sprite or a rendering defect. That belongs with the engine researcher.

---

## 5. Touch targets, contrast, copy level, typography and Bangla rendering

### Takeaway

Touch targets are generous: child screens set a 64 px minimum, and only a few small links remain. The biggest visual-quality bug is typography. On the real build, English body text renders in system Helvetica and Baloo 700 text renders in Times New Roman, because Bangla-range font faces registered under the same family names shadow the Latin faces. Bangla glyph shaping itself is good.

### Cited Findings

- **Touch targets, VERIFIED.**
  - The Studio has 19-20 visible controls. The only ones under 48 px are the logo link (200x42) and the companion "Close" (56x40). The Learn map has 13 controls with only the logo under 48 px. No control lacks an accessible name. Source: `real5-report.json` `a11y_studio`, `a11y_world`, `a11y_learn`.
  - Story room text links are 27 px tall ("← Learning worlds" 267x27, "Play in learning worlds" 116x27). Source: `real2-report.json` `storyBtns`.
  - Child CSS sets `--tap: 64px` and gives nav links and buttons a 64 px minimum. Source: [globals.css:1128-1139](file:///Users/mubinuiislam/Home/Hackathons/just-imagine/apps/web/app/globals.css).
  - World object chips are 44 px tall (84-99 px wide). Source: `real4-run.log` `worldPerf.labels`.
- **Fonts, VERIFIED + READ.**
  - Chrome DevTools platform-font probe on the landing page: `.home-hero p` (Nunito) renders in **Helvetica (system)** and `.gravity-reading strong` (Baloo) in **Times (system)**. Only the 800-weight h1 gets the Baloo web font.
  - Same pattern on the picker: "Ari" is Baloo 700, rendered in Times.
  - In the gallery, English world titles render in Times serif, visible in the screenshot.
  - In the story room, English body text renders in Helvetica.
  - `document.fonts` reports the Latin Nunito and Baloo faces as loaded, so they downloaded but were not chosen.
  - Likely cause (READ): `lib/i18n/fonts.css:72-85` declares extra `Baloo` (400-800) and `Nunito` (400-700) faces limited to Bengali Unicode. `globals.css:1-12` declares Latin Baloo at weight 800 only and Nunito at 400-800. The weight-matched Bengali-only face wins, so Latin text falls back to the generic fallback, or to Times where no fallback is given.
  - Sources: `fontprobe.cjs` output this session, `real3-report.json` `pickerFonts`/`landingFonts`, [shots/real6-gallery-en.png](shots/real6-gallery-en.png), [shots/real-play-picker-ipad.png](shots/real-play-picker-ipad.png), [lib/i18n/fonts.css:72-85](file:///Users/mubinuiislam/Home/Hackathons/just-imagine/apps/web/lib/i18n/fonts.css), [globals.css:1-12](file:///Users/mubinuiislam/Home/Hackathons/just-imagine/apps/web/app/globals.css).
- **Bangla rendering, VERIFIED.**
  - Headings use Baloo Da 2 and body text uses Noto Sans Bengali. Conjuncts render correctly: the shaping check returned `[true, true]`. Source: `real3-report.json` `studioFonts`, `banglaShaping`.
  - The Talk button's Bangla label falls back to Kohinoor Bangla (a macOS system font) because `.talk span` asks for `Baloo, sans-serif` at weight 800 and has no Baloo Da 2. On Android or Chromebook tablets it would render in a different system font. Source: `real3-report.json` `studioFonts`.
  - The sixth friend, "জাদু কাকা", is clipped off the dock at 1024, 1180 and 1280 px wide. Source: `real4-run.log` `friendsClip`; `real3-report.json` `studioLayout.friends`.
- **Contrast, VERIFIED (measured where possible).**
  - The Studio, landing and picker text pairs measured 5.4:1 to 11:1. Sources: `real3-report.json` `landingContrast`, `pickerContrast`, `studioContrast`, `storiesContrast`.
  - Visibly weak, not measured: "Pip · Inventor & builder" grey on green in GenerationShow ([shots/real5-build-9.0s.png](shots/real5-build-9.0s.png)); the Learn pack subtitle "1 / 9 · Switch on the welcome lights" over bright sky ([shots/real6-learn-activity.png](shots/real6-learn-activity.png)); "Tap a friend in this world" in muted grey ([shots/real-learn-pack-ipad.png](shots/real-learn-pack-ipad.png)).
- **Copy level for ages 6-10 (or 6-13), VERIFIED.**
  - Mostly short and warm ("Tap a friend to start", "Ta-da!").
  - Problems:
    - The status pill says "Voice connection: …".
    - The Learn activity repeats one instruction three times ("Turn the beam to light each waiting lantern." twice, plus "Turn or slide to match the marker").
    - "Dairy or fortified soy" for a food activity ([LearningActivity.tsx:13](file:///Users/mubinuiislam/Home/Hackathons/just-imagine/apps/web/components/learn/LearningActivity.tsx)).
    - Story pages are about 75-word paragraphs ("adjusted her ochre glasses").
    - Child error toasts and the companion "বন্ধ করুন" (Close) use the formal আপনি register, while the rest of the child UI uses তুমি.
  - Sources: [shots/real6-learn-activity.png](shots/real6-learn-activity.png), [shots/real6-story-open.png](shots/real6-story-open.png), [shots/real4-studio-explore-menu.png](shots/real4-studio-explore-menu.png), [lib/i18n/ui.ts:52-62](file:///Users/mubinuiislam/Home/Hackathons/just-imagine/apps/web/lib/i18n/ui.ts).
- **Hard-coded English, READ + VERIFIED.**
  - Child components pass English literals through `uiText()`, a catalogue lookup keyed by the English string. The strings I spot-checked (LearnMap notices, the build-failure text) are in `ui-bn.ts`.
  - In the Bangla screenshots of the Studio, the explore menu, the Learn map and pack, Stories and the Gallery, I saw no English leaking.
  - The risk is structural: any catalogue miss falls back silently to English (`localizedText` returns the input).
  - Sources: [lib/i18n/ui.ts:24-35](file:///Users/mubinuiislam/Home/Hackathons/just-imagine/apps/web/lib/i18n/ui.ts), [LearnMap.tsx:143-151](file:///Users/mubinuiislam/Home/Hackathons/just-imagine/apps/web/components/learn/LearnMap.tsx).

### Inferences

- The font fallback quietly undermines the "cute, Disney-inspired" brand on every English screen: Helvetica body text and Times titles where rounded Nunito and Baloo were designed. A design judge will notice Times New Roman on the gallery cards immediately. The fix is small (give the Bengali-range aliases distinct family names, or match the weight ranges).

### Gaps

- I did not test on a real iPad, an Android tablet or VoiceOver.

---

## 6. Accessibility, reduced motion, robustness, bundle weight, and what is mocked

### Takeaway

The accessibility basics are in place: landmarks, named icon tiles, reduced motion handled in CSS and in the JS animation loops. Robustness is weak when offline or when the gateway is unreachable. The engine chunk is heavy but lazy-loaded. Three Playwright failures come from assertions that no longer match the UI, not from new product bugs, but they leave the "world renders → predict → lab" path with no passing coverage.

### Cited Findings

- **Landmarks and names, VERIFIED.** Studio, world view and Learn each have one `main`, 2 `nav`, 2 `header` and `lang` set (`en` or `bn-BD`). No visible control lacks a name, and the companion tile has `aria-label="Chat with Pip"`. The page `<title>` is the same marketing title on every child route ("Just Imagine — little wonders, big discoveries"). The Studio has two `h1`s. Sources: `real5-report.json` `a11y_*`; [Companion.tsx:286-288](file:///Users/mubinuiislam/Home/Hackathons/just-imagine/apps/web/components/companion/Companion.tsx).
- **Reduced motion, READ + VERIFIED.** There are 12 `prefers-reduced-motion` blocks across studio, learn, stories, companion and globals CSS. `DotOrb.tsx:18-57` draws a static frame under reduce, and `acting/clock.ts:35` feeds `reduced` to the Actor sprites. The reduced-motion world screenshot renders correctly. Sources: grep counts this session, [DotOrb.tsx](file:///Users/mubinuiislam/Home/Hackathons/just-imagine/apps/web/components/studio/DotOrb.tsx), [shots/real4-world-open-reduced-motion.png](shots/real4-world-open-reduced-motion.png).
- **Bundle weight, VERIFIED.**
  - Engine chunk `3fs7egde3ggsu.js`: 1,788 KB raw, 663 KB gzip. It contains the base64 WASM magic `AGFzbQ` (Rapier) and Pixi's `WebGLRenderer`, and loads only when a world opens (644 KB transferred in `worldPerf`).
  - Firestore chunk: 652 KB raw, 192 KB gzip.
  - Studio idle transferred 1,630 KB across 59 requests, including 400 KB of fonts. The 417 KB `baloo.ttf` is served as uncompressed TTF (150 KB transferred).
  - The Learn map loads 2.55 MB of sprite-sheet webp (`learnImgTotalKb`).
  - Sources: `.next/static/chunks` with `gzip -c | wc -c`, `real2-report.json` `studioPerf`, `real4-run.log` `worldPerf`, `real3-report.json` `learnImgs`.
- **Playwright failures and what they mean, VERIFIED + READ.**
  - `flows.spec.ts:11` and `:108` wait for "Voice connection: idle" and "…: connected", but the UI now shows friendly labels ("Voice off", "Listening") ([en.ts:149-156](file:///Users/mubinuiislam/Home/Hackathons/just-imagine/apps/web/lib/strings/en.ts)). The tests are stale. The effect is that the end-to-end path "world renders → prediction → lab slider" is unverified.
  - `companion.spec.ts:14` could not find "Friend's name" inside the "Ari's companion" region. The label exists ([CompanionSetup.tsx:95,127](file:///Users/mubinuiislam/Home/Hackathons/just-imagine/apps/web/components/companion/CompanionSetup.tsx)), so the setup probably did not render, or rendered in a different state, for a child who already has a companion. That points to the parent-side setup rather than the child flow.
  - 11 tests passed, including generated-game, learn, learning-play, playable-worlds, language and studio-layout.
  - Source: `playwright.log`.
- **Mocked or fixture content a judge might take as real, READ + VERIFIED.**
  - `public/worlds/*` sprites (jelly dragon, cloud, meadow, pond garden, toy cannon) are pre-generated fixtures ([PROVENANCE.md](file:///Users/mubinuiislam/Home/Hackathons/just-imagine/apps/web/public/worlds/PROVENANCE.md)).
  - In fake mode, "Build a game" switches to a fixture world ([Studio.tsx:686-692](file:///Users/mubinuiislam/Home/Hackathons/just-imagine/apps/web/components/Studio.tsx)), and the GenerationShow fallback opens `jellyDragon` ([Studio.tsx:760-762](file:///Users/mubinuiislam/Home/Hackathons/just-imagine/apps/web/components/Studio.tsx)).
  - The Learn packs, story "Neel and Katha's Imaginary Space Adventure", and pets are authored content, not live generation, and are presented without labels saying so.
  - On the real build, the saved worlds in the gallery do come from the builder's asset service (`localhost:3302/assets/...`) ([`real4-run.log` `worldPerf.img`]).
- **Hard rule conflict, READ (out of my scope, flagged for the security/engine researcher).** `Studio.tsx:500-520` runs `world.doc.game.script.source` "in the sandbox" through `mountGameBridge`, while CLAUDE.md says "No generated code is executed anywhere." Source: [Studio.tsx:493-520](file:///Users/mubinuiislam/Home/Hackathons/just-imagine/apps/web/components/Studio.tsx).

### Inferences

- A tablet in a school or demo room with flaky Wi-Fi will show "Reconnecting" with no way forward. An offline shell and a friend-voiced "I can't hear the internet, let's play a saved world" would remove the worst dead end.

### Gaps

- Not checked: screen-reader announcements during a build (the `.show-caption` has `role=status aria-live=polite`, READ, [GenerationShow.tsx](file:///Users/mubinuiislam/Home/Hackathons/just-imagine/apps/web/components/studio/GenerationShow.tsx)), keyboard-only play, and focus order. `real-studio-focus-after-tabs.png` exists but I did not review it.

---

## 7. Findings by severity, screenshot index, genuine strengths, and verdict

### Takeaway

The child frontend has winner-level art and many careful details (64 px targets, reduced motion, real Bangla typography, a beat-driven wait). It is not yet winner-level as an experience. The core imagine-to-world loop has no real-mode fallback and failed in my one run, the error and offline states break character, the English typography is silently wrong, and the scope spreads across five navigation systems.

### Cited Findings

#### P0: demo-breaking or embarrassing

1. **A real build failed after about 33 s, with no fallback world offered in real mode.** VERIFIED ([shots/real5-build-40.0s.png](shots/real5-build-40.0s.png); builder log `scene_build success:false durationMs:32680`). READ: fallback is wired only when `env.fake` is set ([Studio.tsx:760-762](file:///Users/mubinuiislam/Home/Hackathons/just-imagine/apps/web/components/Studio.tsx)).
2. **Mic denied tells the child to sign in with the correct account**, in the formal register. VERIFIED ([shots/real4-studio-mic-denied.png](shots/real4-studio-mic-denied.png)). READ: the regex in [lib/i18n/ui.ts:59-60](file:///Users/mubinuiislam/Home/Hackathons/just-imagine/apps/web/lib/i18n/ui.ts). There is no microphone copy at all.
3. **English typography falls back to Helvetica and Times New Roman** on the landing, picker, gallery and story room. VERIFIED ([shots/real6-gallery-en.png](shots/real6-gallery-en.png); CDP font probe). READ: [lib/i18n/fonts.css:72-85](file:///Users/mubinuiislam/Home/Hackathons/just-imagine/apps/web/lib/i18n/fonts.css) vs [globals.css:1-12](file:///Users/mubinuiislam/Home/Hackathons/just-imagine/apps/web/app/globals.css).
4. **"Build a game" clears the child's world and builds nothing** unless the child then speaks a wish. VERIFIED ([shots/real2-studio-build-60s.png](shots/real2-studio-build-60s.png)). READ: [Studio.tsx:252-260,686-698](file:///Users/mubinuiislam/Home/Hackathons/just-imagine/apps/web/components/Studio.tsx).

#### P1

5. **No parent gate**: one tap from the child screens into billing, settings and deletion. VERIFIED ([shots/real4-child-to-parent.png](shots/real4-child-to-parent.png)). READ: [Shell.tsx:26](file:///Users/mubinuiislam/Home/Hackathons/just-imagine/apps/web/components/Shell.tsx).
6. **Gateway down or offline shows "Reconnecting" forever** under a "Tell Pip what you imagine" headline. An offline reload gives a white page. VERIFIED ([shots/real4-studio-gateway-down-12s.png](shots/real4-studio-gateway-down-12s.png), [shots/real6-offline-start-12s.png](shots/real6-offline-start-12s.png), [shots/real-studio-offline-reload.png](shots/real-studio-offline-reload.png)).
7. **GenerationShow is visually thin**: a small card, a 40 px sprite, CSS easel, an illegible role line, and no progress past "Getting ready". VERIFIED ([shots/real5-build-9.0s.png](shots/real5-build-9.0s.png)).
8. **Studio idle subtitle overflows the stage card** at 1180 and 1024 px. The sixth friend, "জাদু কাকা" (Jadu Kaka), is clipped off the dock. VERIFIED ([shots/real-studio-idle-ipad-sm.png](shots/real-studio-idle-ipad-sm.png); `real3-report.json` `listeningP.overflow:true`; `real4-run.log` `friendsClip`).
9. **Opened world shows untextured collider rectangles** and a canvas about 56% of the viewport width. VERIFIED ([shots/real4-world-open-ipad.png](shots/real4-world-open-ipad.png)).
10. **Gallery has no thumbnails**: CSS blobs with repeated "Gravity pulls down" subtitles. VERIFIED ([shots/real6-gallery-en.png](shots/real6-gallery-en.png)). READ: [Gallery.tsx:28](file:///Users/mubinuiislam/Home/Hackathons/just-imagine/apps/web/components/Gallery.tsx).
11. **Scope sprawl**: 5+ navigation patterns, 3 visual styles, 4+ voice entry points, and a Studio dock of about 13 controls. VERIFIED (section 3 screenshots).
12. **Learn activity screen is cluttered**: two stacked title bars, the instruction repeated three times, and a tiny slider as the "game". VERIFIED ([shots/real6-learn-activity.png](shots/real6-learn-activity.png)).

#### P2

13. **Formal আপনি register** in child error toasts and the companion "Close". VERIFIED ([shots/real4-studio-explore-menu.png](shots/real4-studio-explore-menu.png)). READ: [lib/i18n/ui.ts:52-62](file:///Users/mubinuiislam/Home/Hackathons/just-imagine/apps/web/lib/i18n/ui.ts).
14. **Inconsistent words**: জগৎ, দুনিয়া and জগত for "world". The age band reads 6–13 on the landing, 6–10 in docs and 8-10 on the picker. The cast differs between CLAUDE.md, the README and the UI. VERIFIED and READ (section 3).
15. **Parent copy on the child loading screen** ("Opening your family space…"). READ ([ChildGuard.tsx:20](file:///Users/mubinuiislam/Home/Hackathons/just-imagine/apps/web/components/ChildGuard.tsx)).
16. **Talk button Bangla label uses a system font** (Kohinoor Bangla) instead of Baloo Da 2. VERIFIED (`real3-report.json`).
17. **Small text links in the story room** (27 px tall) and a 56x40 companion Close. VERIFIED (`real2-report.json`, `real5-report.json`).
18. **82 MB of unreferenced PNG sources** in `public/`. VERIFIED (find/du/grep). The same page title on every child route. VERIFIED.
19. **Stale Playwright assertions** leave the world, predict and lab path untested. VERIFIED (`playwright.log`).
20. **Build failure toast lingers** into later states. The failure is not voiced by the friend. VERIFIED ([shots/real5-offline-talk-6s.png](shots/real5-offline-talk-6s.png)).

#### Screenshot index (paths relative to `shots/`)

| Screenshot                                         | Verdict                                                                                                                                  |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| real-landing-ipad.png                              | Calm, competent parent-facing landing with an interactive gravity toy. English text renders in Helvetica and Times, not the brand fonts. |
| real-signin-ipad.png                               | Clean parent sign-in. It is a wall before any child delight, and the consent checkbox appears on sign-in too.                            |
| real-play-picker-ipad.png                          | Cute puppy avatar card with a 64 px target. "Ari" renders in Times. Lots of empty space with a single child.                             |
| real-studio-idle-laptop.png                        | Bangla Studio idle: clear call to action and a big friend portrait. Sixth friend label clipped ("জাদু কা").                              |
| real-studio-idle-ipad-sm.png                       | At 1024x768 the subtitle is hidden behind the card edge.                                                                                 |
| real-studio-idle-phone.png                         | On phone, the dock overflows and Talk overlaps the friend row. Not the target device.                                                    |
| real2-studio-talk-5s.png                           | Listening state reads well: dot-orb, mic badge, "Listening" pill.                                                                        |
| real2-studio-build-15s.png / -60s.png              | After "Build a game", 60 s of "Listening" with no build. Identical frames.                                                               |
| real4-studio-tap-friend-5s.png                     | Friend introduction card ("Mishti · World artist"): charming.                                                                            |
| real4-studio-explore-menu.png                      | Companion menu: tidy, but a second Talk button and formal "বন্ধ করুন".                                                                   |
| real4-studio-mic-denied.png                        | Wrong, account-permission error for a denied mic. P0.                                                                                    |
| real4-studio-gateway-down-12s.png                  | "Reconnecting" forever, child still invited to talk.                                                                                     |
| real4-world-open-ipad.png                          | Painted Bengali pond backdrop (strong), but bare collider rectangles and a small canvas.                                                 |
| real4-world-open-reduced-motion.png                | Renders correctly with reduced motion.                                                                                                   |
| real2-gallery-opened-world-phone.png               | World view on phone is legible and stacks well.                                                                                          |
| real-gallery-ipad.png / real6-gallery-en.png       | CSS blob tiles, no thumbnails, Times-font titles.                                                                                        |
| real-learn-ipad.png / real5-learn-en.png           | Learn map is the most "Disney" screen: 3D-cartoon hosts on islands. Top row slightly cut by the header.                                  |
| real-learn-pack-ipad.png                           | Superb painted observatory with the Sun host. Low-contrast chapter subtitle.                                                             |
| real2-learn-chapter-2.png                          | The Sun's fact bubble over a blurred scene: friendly, readable.                                                                          |
| real6-learn-activity.png                           | Cluttered activity: stacked headers, repeated instruction, tiny slider.                                                                  |
| real-learn-pack-phone.png / real-learn-phone.png   | Phone layouts hold together.                                                                                                             |
| real-stories-ipad.png / real-stories-ipad-full.png | Katha's story room: lovely owl, forest backdrop, painted book cover.                                                                     |
| real6-story-open.png                               | Illustrated story page with "Katha, read with me": strong. Dense 75-word paragraph, Helvetica text.                                      |
| real5-pets-shelf.png                               | Pets modal: 8 locked silhouettes, nothing earned yet.                                                                                    |
| real5-companion-menu-learn.png                     | Companion list menu over the Learn map: a sixth navigation pattern.                                                                      |
| real5-studio-en-idle.png                           | English Studio idle. Subtitle cut off.                                                                                                   |
| real5-build-9.0s.png / -28.0s.png                  | GenerationShow: small, mostly CSS, unreadable role line, stuck on "Getting ready".                                                       |
| real5-build-40.0s.png                              | Real build failure toast; no fallback offered.                                                                                           |
| real5-offline-talk-6s.png                          | Stale failure toast still showing after the session stopped.                                                                             |
| real6-offline-start-12s.png                        | Offline: "Reconnecting" with no guidance.                                                                                                |
| real-studio-offline-reload.png                     | Offline reload: blank white page.                                                                                                        |
| real4-child-to-parent.png                          | Child tap lands in the parent dashboard with no gate (dashboard still loading).                                                          |

Not reviewed: admin, parent, theme and `fake-*` screenshots (other researchers' scope), and `real-studio-focus-after-tabs.png`.

#### Genuinely strong

- **Character and scene art**: the Learn hosts, the Sun, Katha and Neel, the Studio friend portraits and the generated pond-village backdrop meet the "realistic-cartoon, Disney-inspired, cute" bar (screenshots above).
- **Bangla as a first-class language**: Baloo Da 2 and Noto Sans Bengali self-hosted with unicode-range subsets, correct conjunct shaping, and Bengali numerals ("৩টির মধ্যে ১টি শেষ"). The whole child UI, including Learn content and the companion menu, was translated in the screenshots.
- **Touch targets**: a 64 px child minimum, with the Talk button at 112 px. Every visible control is named.
- **Reduced motion** handled in both CSS and the JS animation loops (`DotOrb.tsx`, `acting/clock.ts`).
- **The wait is designed as a performance**: GenerationShow's beat model, the 25 s late apology and alternating questions ([GenerationShow.tsx](file:///Users/mubinuiislam/Home/Hackathons/just-imagine/apps/web/components/studio/GenerationShow.tsx)). The intent is right even though the build and art did not deliver it here.
- **Voice really works**: Listening within about 3 s of a tap, with streamed audio from the friend. The profile-to-Studio transition takes 221 ms.
- **The story room** (painted page, read-along and question buttons) is the most complete, demo-ready child experience.

#### Verdict (one paragraph)

As a hostile-but-fair UX judge and the parent of a 7-year-old, I would score the art direction near the top of the field. Pip, the Sun and Katha are the kind of characters a child points at, and the Bangla localisation is a real differentiator. I would not yet give the child frontend "Best UI/UX". The central promise (say an idea, watch a friend paint it, play with real physics) is the least polished part. Its waiting screen is a small CSS card. In my one real attempt it failed after 33 s with a system-style toast and no friend-led recovery. The "Build a game" tile wipes the world, and the opened world shows bare collider rectangles in an undersized canvas. Around that core, a judge meets Times New Roman on English cards, an account-permission error when the mic is blocked, endless "Reconnecting" offline, and five different navigation systems across Studio, Learn, Stories, Companion and Pets. It reads as several beautiful apps rather than one confident product.

**The three upgrades that would most change a judge's score:**

1. **Make the core loop unbreakable and theatrical.**
   - Wire the late and failed fallback in real mode, with the friend voicing "my paint spilled, let's play this one" and opening a saved or library world.
   - Make GenerationShow full-stage, using the friend's painted acting sheet and the real backdrop fading in as the builder emits `building`, `placeholders` and `hero`.
   - Make "Build a game" either build or be removed.
2. **Fix the "first five seconds" polish bugs a design judge sees at once.**
   - The font-family collision in `fonts.css` that causes the Helvetica and Times fallback.
   - The Studio subtitle overflow and the clipped sixth friend.
   - World thumbnails in the gallery.
   - Painted sprites (or hidden debug shapes) for collider entities, and a canvas that fills the stage.
3. **Give failures the friend's voice, and give the app one shell.**
   - A microphone-denied flow with a picture of the browser prompt and text input as the fallback.
   - Offline and gateway-down states that time out to "let's play a saved world".
   - তুমি register everywhere.
   - A simple parent gate.
   - Fold Studio, Learn, Stories and Pets into one consistent dock and header pattern, so the child learns one way to move around.

### Inferences

- If the team has time for only one item, upgrade 1 gives the most for the judged demo: it turns the riskiest live moment into the most memorable one.

### Gaps

- One real build attempt is too few to estimate build success rate or latency. Device testing (iPad Safari, Android Chrome) and screen-reader testing were not done.
