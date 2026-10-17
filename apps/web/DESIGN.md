---
name: Just Imagine web
description: A warm cream-and-forest world for children aged 6 to 13, with a calm parent area and a full-bleed child Studio stage.
colors:
  ground: '#fff9ee'
  surface: '#fffdf7'
  ink: '#243e36'
  soft: '#51675c'
  accent: '#245e4e'
  accent-ink: '#fffaf1'
  line: '#d6decb'
  peach: '#f9ceb0'
  yellow: '#f7d76e'
  mint: '#d5e7c9'
  focus-ochre: '#ad6524'
  parent-ground: '#fcfcf5'
  stage-pill: '#fff9eef2'
  stage-building: '#2f5b4f'
  stage-world-floor: '#eaf4f1'
  stage-alert: '#c7572b'
  error-ink: '#8a3b1c'
  danger: '#8f3e2c'
  learn-forest-panel: '#243e36e8'
  learn-feedback-cream: '#fff9eef5'
  learn-story-leaf: '#e2ead8'
  learn-chapter-selected: '#e1ebd4'
  learn-story-focus: '#c88643'
  learn-bookmark-forest: '#243e36eb'
typography:
  display:
    fontFamily: 'Baloo, serif'
    fontSize: 'clamp(50px, 5.7vw, 80px)'
    fontWeight: 800
    lineHeight: 1.12
    letterSpacing: '-0.025em'
  headline:
    fontFamily: 'Baloo, serif'
    fontSize: 'clamp(36px, 4.2vw, 58px)'
    fontWeight: 800
    lineHeight: 1.12
    letterSpacing: '-0.025em'
  stage-headline:
    fontFamily: 'Baloo, sans-serif'
    fontSize: 'clamp(28px, 4.2vmin, 48px)'
    fontWeight: 800
    lineHeight: 1.12
    letterSpacing: '-0.02em'
  title:
    fontFamily: 'Baloo, serif'
    fontSize: '27px'
    fontWeight: 800
    lineHeight: 1.12
  title-small:
    fontFamily: 'Baloo, serif'
    fontSize: '22px'
    fontWeight: 800
    lineHeight: 1.12
  body:
    fontFamily: 'Nunito, sans-serif'
    fontSize: '17px'
    fontWeight: 400
    lineHeight: 1.6
  lead:
    fontFamily: 'Nunito, sans-serif'
    fontSize: '21px'
    fontWeight: 400
    lineHeight: 1.65
  caption:
    fontFamily: 'Nunito, sans-serif'
    fontSize: 'clamp(15px, 2vmin, 21px)'
    fontWeight: 700
    lineHeight: 1.3
  label:
    fontFamily: 'Nunito, sans-serif'
    fontSize: '15px'
    fontWeight: 700
    lineHeight: 1.2
  dial-label:
    fontFamily: 'Baloo, sans-serif'
    fontSize: '13px'
    fontWeight: 800
    lineHeight: 1
  small:
    fontFamily: 'Nunito, sans-serif'
    fontSize: '13px'
    fontWeight: 400
    lineHeight: 1.6
  learn-mission:
    fontFamily: 'Baloo, sans-serif'
    fontSize: 'clamp(23px, 3cqw, 36px)'
    fontWeight: 800
    lineHeight: 1.05
  learn-feedback:
    fontFamily: 'Nunito, sans-serif'
    fontSize: '16px'
    fontWeight: 800
    lineHeight: 1.35
  learn-story-title:
    fontFamily: 'Baloo, sans-serif'
    fontSize: 'clamp(24px, 3cqw, 38px)'
    fontWeight: 800
    lineHeight: 1.08
  learn-story-copy:
    fontFamily: 'Nunito, sans-serif'
    fontSize: 'clamp(15px, 1.45cqw, 18px)'
    fontWeight: 700
    lineHeight: 1.45
rounded:
  field: '10px'
  button: '12px'
  card: '16px'
  panel: '18px'
  tray: '20px'
  drawer: '22px'
  world: '26px'
  sheet: '28px'
  pill: '999px'
spacing:
  xs: '6px'
  sm: '8px'
  md: '12px'
  lg: '16px'
  xl: '24px'
  gutter: '6%'
  stage-edge: '16px'
  strip: '132px'
components:
  button-default:
    backgroundColor: 'transparent'
    textColor: '{colors.ink}'
    rounded: '{rounded.button}'
    padding: '8px 18px'
    height: '44px'
  button-primary:
    backgroundColor: '{colors.accent}'
    textColor: '{colors.accent-ink}'
    rounded: '{rounded.button}'
    padding: '11px 23px'
    height: '48px'
  button-primary-hover:
    backgroundColor: '#194d3e'
    textColor: '{colors.accent-ink}'
  button-secondary:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    rounded: '{rounded.button}'
    padding: '11px 23px'
    height: '48px'
  button-danger:
    backgroundColor: '{colors.danger}'
    textColor: '#fff9ef'
    rounded: '{rounded.button}'
    padding: '8px 18px'
    height: '44px'
  input-default:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    rounded: '{rounded.field}'
    padding: '10px 12px'
    height: '44px'
  nav-rail-item:
    backgroundColor: 'transparent'
    textColor: '{colors.ink}'
    rounded: '{rounded.field}'
    padding: '12px 14px'
    height: '44px'
  nav-rail-item-active:
    backgroundColor: '#e4ecd9'
    textColor: '{colors.ink}'
  stage-pill:
    backgroundColor: '{colors.stage-pill}'
    textColor: '{colors.ink}'
    rounded: '{rounded.pill}'
    padding: '8px 18px'
    height: '52px'
  stage-pill-pressed:
    backgroundColor: '{colors.yellow}'
    textColor: '{colors.ink}'
  stage-pill-quiet:
    backgroundColor: '#fff9ee26'
    textColor: '{colors.ground}'
    rounded: '{rounded.pill}'
    padding: '8px 18px'
    height: '52px'
  stage-caption:
    backgroundColor: '{colors.ground}'
    textColor: '{colors.ink}'
    typography: '{typography.caption}'
    rounded: '{rounded.pill}'
    padding: '11px 22px'
  stage-dial:
    backgroundColor: '{colors.stage-pill}'
    textColor: '{colors.ink}'
    rounded: '{rounded.tray}'
    padding: '8px 14px'
  prediction-answer:
    backgroundColor: '{colors.accent}'
    textColor: '{colors.ground}'
    rounded: '{rounded.pill}'
    padding: '10px 26px'
    height: '64px'
  prediction-answer-warm:
    backgroundColor: '{colors.peach}'
    textColor: '{colors.ink}'
  prediction-answer-live:
    backgroundColor: '{colors.yellow}'
    textColor: '{colors.ink}'
  world-action-chip:
    backgroundColor: '#243e36cc'
    textColor: '{colors.ground}'
    rounded: '{rounded.pill}'
    padding: '6px 14px'
    height: '44px'
  lab-drawer:
    backgroundColor: '#fff9eef0'
    textColor: '{colors.ink}'
    rounded: '{rounded.drawer}'
    padding: '14px 14px 14px 16px'
  discovery-toast:
    backgroundColor: '{colors.ground}'
    textColor: '{colors.ink}'
    rounded: '{rounded.drawer}'
    padding: '14px 14px 16px'
    width: 'min(380px, 80vw)'
  learn-control:
    backgroundColor: '{colors.ground}'
    textColor: '{colors.ink}'
    rounded: '{rounded.button}'
    padding: '10px 16px'
    height: '44px'
  learn-control-pressed:
    backgroundColor: '{colors.yellow}'
    textColor: '{colors.ink}'
  learn-consequence:
    backgroundColor: '{colors.learn-feedback-cream}'
    textColor: '{colors.ink}'
    typography: '{typography.learn-feedback}'
    rounded: '{rounded.card}'
    padding: '12px 18px'
    height: '64px'
  learn-cast-choice:
    backgroundColor: '{colors.learn-forest-panel}'
    textColor: '{colors.ground}'
    rounded: '{rounded.button}'
    padding: '4px 12px 4px 4px'
    height: '48px'
  learn-story-primary:
    backgroundColor: '{colors.accent}'
    textColor: '{colors.ground}'
    rounded: '{rounded.button}'
    padding: '12px 16px'
    height: '48px'
  learn-story-secondary:
    backgroundColor: '{colors.learn-story-leaf}'
    textColor: '{colors.ink}'
    rounded: '{rounded.button}'
    padding: '12px 16px'
    height: '48px'
  learn-story-dialogue:
    backgroundColor: '{colors.learn-feedback-cream}'
    textColor: '{colors.ink}'
    typography: '{typography.learn-story-copy}'
    rounded: '{rounded.card}'
    padding: 'clamp(20px, 2.5cqw, 36px)'
  learn-story-mission:
    backgroundColor: '{colors.stage-pill}'
    textColor: '{colors.ink}'
    rounded: '{rounded.button}'
    padding: '12px 16px'
  learn-story-chapter:
    backgroundColor: 'transparent'
    textColor: '{colors.ink}'
    rounded: '{rounded.button}'
    padding: '8px 12px'
    height: '64px'
  learn-story-chapter-current:
    backgroundColor: '{colors.learn-chapter-selected}'
    textColor: '{colors.ink}'
---

# Design System: Just Imagine web

## Overview

**Creative North Star: "The Theatre Built From the Mark"**

Just Imagine has a default Forest palette and two rooms. The parent room is a calm, paper-coloured page: warm cream ground (#fff9ee), deep green foreground (#243e36), forest actions (#245e4e), muted leaf, ochre and clay accents. Locally hosted Baloo provides soft rounded headings; Nunito provides readable body copy. The landing composition pairs a large question with an abstract geometric play window. It makes no claim that geometric placeholders are final illustration.

The child room is the same palette turned inside out. The Studio is a stage, not a page: the forest green that is ink on the parent side becomes the wings and floor, and the cream that is ground on the parent side becomes the pills, captions and sheets that float at the stage edges. The Dream Launch mark (forest tile, cream cloud, peach arc, sunshine star) supplies the whole stage vocabulary: forest for the house, cream for anything you can touch, peach for warmth, sunshine for anything live. The six preset friends and guides now carry their established identities into tactile registered raster poses inside the same SVG slots; optional external Rive assets retain their existing mounting path.

Learning Worlds adds the user-approved Tooth Town craft to this theatre: tactile sculpted characters, expressive acting poses, soft key and rim lighting, and eight active cinematic environments across nine story adventures. The warm cream-and-forest shell stays familiar. Learn’s rounded rectangular controls, painted scenery and scene gradients remain scoped to Learn. The Tooth Town acting standard now also covers the six preset Studio friends/guides and eight pets through shared registered raster presentation; identities, mounting slots and the optional Rive path remain intact.

The child and parent worlds share typography and semantic colors. Interface transition duration becomes zero with reduced-motion preferences; shared actor presentation retains semantic poses and audio-driven speech while removing repeated gestures and idle blinks. Physics remains interactive. Parent forms and all actionable child controls retain visible keyboard focus. Browser selection, progress meters and range inputs use the same palette.

**Key Characteristics:**

- One coordinated palette, inverted between rooms: Forest is the warm cream-and-forest default; authorized Ocean and Terracotta presets preserve the same semantic roles.
- Baloo for anything that names (headings, dial values, chip titles, answer buttons); Nunito for anything that explains (body, captions, pill labels). Bangla extends those roles with Baloo Da 2 and Noto Sans Bengali.
- Sunshine (#f7d76e) means live: mic ring, speaking friend's ring, pressed pill, connected dot, active challenge, spell banner.
- Fully rounded pills on the stage; 10 to 16 px corners in the parent room.
- Soft offset shadows cast toward the floor; no borders on the stage, quiet 1 px dividers in the parent room.
- The Studio summon remains its authored entrance; predefined Learn characters, preset friends/guides and pets share anchored pose changes, while Learn retains distance-driven locomotion and causal game feedback.
- Tooth Town’s tactile character craft extends across predefined actors; cream controls and forest structure keep the shared interface legible through stories, Studio, navigation and pets.

## Colors

The normative frontmatter records the unchanged default Forest palette: a warm cream and deep forest pair that trades places between the two rooms, with peach for warmth and sunshine for anything alive. The user-authorized preset extension below adapts those roles together.

### Primary

- **Forest** (`accent`): parent primary buttons, checkbox and range accent, the listening-state stage floor, the first prediction answer, the lab drawer's scrollbar thumb and numeric values. Hover deepens to a darker forest (#194d3e on the parent side, #2d7260 on the stage).
- **Deep Forest Ink** (`ink`): body and heading text in the parent room; the stage wings, floor and cast strip; the spell banner; the world-action chips at 80% (#243e36cc) and the summon scrim at 80%.

### Secondary

- **Sunshine** (`yellow`): the live signal. Mic ring and mic badge, the active friend's ring, pressed Captions pill, connected status dot and its pulse, the Discovery badge, the active challenge card, the third prediction answer, text selection, the spell burst and banner text. On the stage it is also the focus outline.
- **Peach** (`peach`): warmth and the softer alternative. Cheeks on every character, the second prediction answer, the building status dot, the quota note and the mark's arc. Character artwork retains its authored colours under every interface preset.

### Tertiary

- **Mint** (`mint`): quiet secondary controls on the stage (lab drawer chevron, toast close) and the completed challenge card.
- **Focus Ochre** (`focus-ochre`): the 3 px keyboard focus outline in the parent room and landing.
- **Alert Clay** (`stage-alert`, `error-ink`, `danger`): reconnecting and error status dot (#c7572b); stage error pill text (#8a3b1c) on cream; parent danger buttons (#8f3e2c).

### Neutral

- **Cream Ground** (`ground`): page background in the parent room and landing; on the stage, the opaque surface of captions, prediction cards, the Discovery toast, dial selects and selected storybook tabs; also stage text colour on forest.
- **Cream Surface** (`surface`): inputs, secondary buttons and keypad keys.
- **Stage Pill Cream** (`stage-pill`, 95% cream): floating pills, status chip and dial trays, so the forest shows faintly through the chrome.
- **Parent Ground** (`parent-ground`): the slightly cooler page behind the parent shell.
- **Line** (`line`): 1 px dividers and default button borders in the parent room; the 2 px ring on the lab drawer's number buttons.
- **Soft Green** (`soft`): paragraph text and secondary labels in both rooms.
- **Learn Forest Panel** (`learn-forest-panel`): the dark backing shared by character choices and the picnic/phase request, keeping cream labels readable over painted scenes.
- **Learn Feedback Cream** (`learn-feedback-cream`): consequence bands and story dialogue, preserving the scene behind a nearly opaque reading surface.
- **Learn Story Leaf** (`learn-story-leaf`): secondary story actions and game input buttons.
- **Learn Chapter Selected** (`learn-chapter-selected`): the current chapter in the open chapter chooser.
- **Learn Story Focus** (`learn-story-focus`): the story keyboard outline and selected manipulation piece.
- **Learn Bookmark Forest** (`learn-bookmark-forest`): the story footer backing, carrying played counts and actual save status.
- **World Floor** (`stage-world-floor`): the pale mint backing of the 16:9 engine canvas before the engine paints.

### Published appearance presets — 2026-10-16

The 2026-10-17 user-requested extension also exposes a personal device choice: App default, Forest, Ocean or Terracotta. A separate validated preference takes precedence over the published default through polling and reloads. The compact selector is reachable from shared family, Studio/Learn/story, school and operator headers, and parent Settings explains its scope. Fullscreen child surfaces hide the underlying shared header to avoid invisible duplicate keyboard controls. Operator publication remains the audited app default; its preview stays scoped independently of a personal choice. Original paintings and character pixels remain unchanged. See `.impeccable/surfaces/theme-picker.md`.

The user explicitly authorized admin theme personalization, including recolouring the existing brand icon. `packages/protocol/src/appearance.ts` owns the closed `forest | ocean | terracotta` enum and its 11-key `THEME_PALETTES`. Forest retains every existing frontmatter value; the additional Ocean and Terracotta values live in `extensions.appearance` in `.impeccable/design.json`. Runtime `--focus` maps to the default frontmatter's `focus-ochre` role. Shared UI surfaces use semantic CSS variables and `color-mix` for translucent or tonal derivatives. This does not introduce arbitrary CSS, freeform colour inputs, custom logo geometry or recolouring of generated character/subject pixels.

The Dream Launch geometry stays fixed: accent tile, ground cloud, peach arc and yellow five-point brand star. `lib/brand.ts` supplies both the inline mark and themed SVG browser icon; the manifest selects matching 192px, 512px, maskable and Apple-touch PNGs. Browser theme colour follows `accent`. Installed-icon refresh still depends on browser/platform caching and installation behavior.

The Appearance surface separates a draft preview from the published palette, labels the live choice and requires explicit Apply. Its public payload contains only `theme` and `revision`; verified admin writes use a revision comparison and audited transaction. Invalid, absent or unavailable configuration does not block play: the client retains its last validated cached palette, or Forest without one. Successful publication updates the current page, while other open pages refresh every 30 seconds while visible or on focus/visibility return. See `.impeccable/surfaces/appearance.md` for the operating flow and evidence scope.

### Named Rules

**The Sunshine-Means-Live Rule.** Yellow (#f7d76e) is reserved for things that are listening, speaking, pressed, connected, or just happened. It never decorates a resting surface. A yellow element the child cannot act on or that is not currently happening is a defect.

**The Inverted Rooms Rule.** The selected preset supplies both rooms: the parent room sets `ink` on `ground` and the stage sets `ground` on `ink`. Forest remains the default. Publish Ocean or Terracotta as a coordinated preset; do not invent a page-specific palette to tell rooms apart.

**The Quiet Chrome Rule.** On the stage, controls that leave or reset (home, gallery, reset) are translucent cream at 15% on forest; controls that act in the world (captions, finish, answers) are opaque cream or a full accent. A child should be able to tell "exit" from "play" by weight alone.

## Typography

**Display Font:** Baloo (with serif fallback), locally hosted, weight 800 only
**Body Font:** Nunito (with sans-serif fallback), locally hosted, weights 400 to 800

**Character:** Baloo's fat rounded letterforms name things and sound friendly even at 13 px; Nunito carries sentences. The pairing reads as a storybook with a clear speaking voice, and the two never swap roles.

### Hierarchy

- **Display** (800, clamp(50px, 5.7vw, 80px), 1.12, -0.025em): the landing question only, capped at 8ch.
- **Headline** (800, clamp(36px, 4.2vw, 58px), 1.12, -0.025em): parent page titles (39 px in the parent shell, 36 px on narrow screens).
- **Stage Headline** (800, clamp(28px, 4.2vmin, 48px), 1.12, -0.02em): the listening prompt and the summon name; sized in vmin so it scales with the stage, never the page.
- **Title** (800, 27px, 1.12): parent section headings; the prediction question runs clamp(22px, 3.4vmin, 34px) in the same face.
- **Title Small** (800, 22px, 1.12): lab drawer and Discovery toast headings; status chip and dial values use the same face at 17 to 18 px; prediction answers at 20 px.
- **Lead** (400, 21px, 1.65): landing and picker intros.
- **Body** (400, 17px, 1.6, max 70ch): paragraphs in both rooms; 16 px below 700 px.
- **Caption** (700, clamp(15px, 2vmin, 21px), 1.3, max 72ch): the friend's spoken line under the world, bold Nunito on cream.
- **Label** (700, 15 to 17px, 1.1 to 1.2): pill labels, friend names (14 px), world-action chips (14 px), the finish pill; always Nunito, sentence case.
- **Dial Label** (800, 13px, 1, Baloo, sentence case): the small name above a dial value and the lab variable names (15 px).
- **Small** (400 to 600, 12 to 13px): status chip detail, parent subtle text, preview banner.

- **Learn Mission** (`learn-mission`): a concise Baloo instruction above play, container-sized on desktop; the phone override is 25px.
- **Learn Feedback** (`learn-feedback`): bold Nunito consequences beneath play, 15px on phones.
- **Learn Story Title** (`learn-story-title`): opening and ending chapter names, 27px on phones.
- **Learn Story Copy** (`learn-story-copy`): setup, goal and consequence in the selected English or Bangla edition, 16px on phones and at most 65ch in the dialogue surface.

### English and Bangla type extension — 2026-10-17

The selected language keeps the rounded naming face and readable sentence face. English retains the existing Baloo/Nunito stack. `lib/i18n/fonts.css` supplies self-hosted Baloo Da 2 for Bangla display text (declared weights 400 to 800) and Noto Sans Bengali for body text (declared weights 400 to 700), with separate Bengali and Latin subsets and `font-display: swap`. Font provenance and licences remain in `public/fonts/NOTICE.md`. These are locale extensions of the existing roles; the default frontmatter stays intact.

On `bn-BD` content the body stack is Noto Sans Bengali, Nunito, sans-serif; headings, brand, named profile/world text and usage totals use Baloo Da 2, Baloo, serif with a 1.3 line-height. Bengali-only `@font-face` aliases also supply Baloo/Nunito component declarations with the corresponding Bengali glyphs. The aliases do not replace their Latin faces. Do not claim a supplied 800-weight Bengali body face: the current Noto declaration ends at 700.

Allow Bengali marks and longer labels their full reading space. Learn island names and notes use 1.45 leading; phone map rows grow to the translated content. These observed adjustments belong to the locale and surface, rather than a replacement global type scale. See `.impeccable/surfaces/learn.md` for the map rhythm.

### Named Rules

**The Naming Face Rule.** Baloo appears wherever a thing is named or chosen: headings, dial values, variable names, answer buttons, keypad digits, the spell banner. Nunito appears wherever a thing is explained: body, captions, pill labels, hints. A Baloo sentence or a Nunito heading is a defect. For Bengali glyphs, Baloo Da 2 carries the naming role and Noto Sans Bengali carries explanation.

**The Sentence Case Rule.** No uppercase labels anywhere. Small labels get Baloo weight and a darker colour, not tracking or capitals.

## Layout

The parent room is a centred page, max 1360 px wide with 6% side gutters. The parent shell is a two-column grid (240 px navigation rail, fluid content; 190 px rail below 1000 px) and collapses to a single column below 700 px, where the rail becomes a horizontally scrollable row under a 1 px divider. The landing hero is a two-column grid that stacks below 700 px. Forms are a two-column grid that stacks below 700 px. Parent spacing rhythm is 18 to 40 px: 18 px row padding, 20 to 25 px between groups, 30 to 40 px section margins.

The Studio is a fixed full-viewport stage (`position: fixed; inset: 0`) on forest, laid out as a scene above a 132 px cast strip. The scene letterboxes the world to 16:9 at `min(100%, (100dvh - strip - 72px - 70px) * 16/9)`, centred, with 72 px of headroom for the floating top chrome and a 54 px caption band beneath it. Everything else floats at a 16 px stage edge: home and gallery pills top-left, reset, captions and the status chip top-right, dial trays at the world's bottom-left, world-action chips at the world's top-left, the quota note at the strip's bottom-left and the finish pill at the strip's bottom-right. When a world carries variables the scene becomes two columns (fluid world, 300 px lab column, 16 px gap); the lab sits beside the world, never over it. The Discovery toast anchors bottom-right above the strip at `min(380px, 80vw)`; the prediction sheet and summon overlay cover the world.

Below 760 px wide or 520 px tall the stage keeps its structure and shrinks: the strip drops to 96 px (150 px when the finish corner stacks above the friends), pill labels and the status detail hide so the chrome is icons only, friends shrink to 48 px art (64 px active) and lose their names except the active one, the lab column moves below the world, the dial tray and world-action chips hide, and the toast spans the width.

Learning Worlds keeps a dominant painted environment through story opening, play and ending. The opening pairs the chapter actor with a cream dialogue surface; play uses a compact cream-backed mission above the board, optional guide/restart actions, causal feedback and a forest bookmark footer. The chapter chooser is an overlay grid: three columns, two at or below 1000px, one at or below 700px. The optional Meet your friend action retains the separate conversation and character rail.

On screens at or below 700px, the allocated scene scrolls. Story opening and ending frames are 760px tall; playing frames are 900px tall. Play rows size to their contents: adventure boards reserve 340px for the SVG, while reused classic games reserve 270px for their canvas, with Coco’s movement canvas reduced to 220px to make room for its two-by-two pad grid, then inputs and feedback. Adventure boards use 720×410 coordinates with mechanic-specific compact view boxes; classic games retain 720×450 coordinates. Both remain distinct from the Studio engine’s 16:9 canvas. The Learn dock reserves an inline Pip tile, 84px tall on desktop and 64px on phones; compact phone action tiles have a 56px minimum width and stay in one row. Pip does not float over another control.

### Named Rules

**The Stage-Not-Page Rule.** The Studio never scrolls and never shows a heading over the world. The world fills the viewport and everything else floats at the edges in pills.

**The Beside-Not-Over Rule.** The lab column and the cast strip share the viewport with the world; they never cover it. Only transient moments (prediction, summon, spell, toast) may overlay the world, and each one is dismissed by a child's answer or by time.

## Elevation & Depth

A hybrid: the parent room is almost flat and separates regions with 1 px lines and a single tonal step (cream page, cream-white cards and inputs, #e4ecd9 for hover and active rail items). The stage is layered: every cream element floats on the forest with a soft, long, downward shadow, and the world itself sits in a shallow well with a 2 px inset highlight along its top edge. Shadows are always tinted black at low alpha with negative spread, so they read as a floor shadow rather than a glow; the only coloured shadows are the prediction answers, which cast their own fill colour.

### Shadow Vocabulary

- **Parent card** (`box-shadow: 0 14px 35px -18px #31544659`): the `--shadow` token, used on the landing play window and parent world tiles.
- **Stage pill** (`box-shadow: 0 8px 20px -12px #000b`): floating pills, status chip; dials use `0 10px 24px -14px #000c`.
- **Stage caption** (`box-shadow: 0 10px 30px -14px #000c`): the caption line.
- **Stage world** (`box-shadow: 0 24px 60px -30px #000c, 0 2px 0 #fff9ee22 inset`): the 16:9 well.
- **Stage drawer and toast** (`box-shadow: 0 16px 40px -20px #000c` / `0 24px 50px -22px #000d`): lab column and Discovery toast.
- **Stage sheet** (`box-shadow: 0 30px 60px -30px #000d`): the prediction card.
- **Character drop** (`filter: drop-shadow(0 8px 12px #0008)`, `0 18px 24px #0007` large, `0 20px 30px #000a` summon): every SVG friend casts a shadow sized to its scale.
- **Answer tint** (`box-shadow: 0 10px 24px -12px <fill>`): prediction answers cast forest, peach-brown (#b3744e) or ochre (#a38a2d).

### Named Rules

**The Floor Shadow Rule.** Shadows always fall downward with negative spread and never spread outward evenly. A centred glow, a hard offset, or a coloured halo on a resting surface is a defect; the only radial light pools are the cream spotlight behind the listening friend and the sunshine burst of a spell, and both are moments, not surfaces.

**The Line-Or-Shadow Rule.** The parent room separates with lines and never with shadows on content; the stage separates with shadows and never with lines. The single exception is the 1 px cream line at 13% along the top of the cast strip.

## Shapes

Everything is rounded; nothing is square. The parent room uses modest corners: 10 px fields and rail items, 12 px buttons and callouts, 16 px cards and dialogs, 18 px panels and keypad. The landing play window and avatars use organic percentage radii (46% 46% 18px 18px, 43% 43% 46% 46%) to read as toys rather than cards.

The stage steps up to full pills and large corners: every button, caption, chip and banner on the stage is a 999 px pill; dial trays are 20 px, the lab drawer and Discovery toast 22 px, the world well 26 px, the prediction card and keypad 28 px. Rings (mic, friend, badges, close buttons) are true circles. Characters are built from circles and ellipses in a 100 unit viewBox; the mark is a 22 unit radius tile. Borders are absent on the stage; the lab drawer's number buttons are the only outlined control (2 px `line`). The parent room keeps 1 px borders on default buttons and inputs.

## Components

### Buttons

- **Shape:** gently rounded (12 px) in the parent room; full pill (999 px) on the stage.
- **Default (parent):** transparent with a 1 px `line` border, 44 px minimum height, 8 px 18 px padding, 700 weight. Hover fills #e4ecd9; active nudges down 1 px.
- **Primary (parent):** forest on cream-white (`accent` / `accent-ink`), 48 px, 11 px 23 px. Hover deepens to #194d3e.
- **Secondary (parent):** cream surface with a #9baf99 border; hover #edf1df.
- **Danger (parent):** clay #8f3e2c on cream, hover #733323; reserved for destructive account actions.
- **Stage pill:** 95% cream on forest, 52 px minimum height and width, 8 px 18 px, Nunito 700 17 px, 22 px inline SVG icon. Hover lifts 1 px and goes opaque; active drops 1 px; `aria-pressed` fills sunshine.
- **Stage pill, quiet:** cream at 15% with cream text and no shadow, for home, gallery and reset; hover 23%.
- **Prediction answer:** 64 px pill, Baloo 800 20 px; first answer forest on cream, second peach on ink, third sunshine on ink, each casting its own tint.
- **World-action chip:** 44 px pill, forest at 80% with cream Nunito 700 14 px text; hover opaque forest. Arrow keys flick the entity.
- **Focus:** parent room 3 px ochre outline at 5 px offset; stage 4 px sunshine outline at 3 px offset.

### Chips

- **Status chip:** 95% cream, 18 px corners, 52 px tall; a Baloo 800 17 px state word with a 10 px dot before it (forest at rest, sunshine with a 1.6 s pulse when connected, peach while building, clay when reconnecting or errored) and a Nunito 600 12 px detail line in `soft`. An inline 36 px ink pill retries on error.
- **Dial:** 95% cream tray, 20 px corners, Baloo 800 13 px label in `soft` over a borderless cream select (Baloo 800 18 px, 44 px, 12 px corners, forest chevron drawn inline).
- **Quota note:** peach Nunito 700 14 px, bottom-left of the strip.

### Cards / Containers

- **Parent:** cream-white or tonal fills (#e6eed7 discovery, #f7e9c0 connection, #f6e8c2 challenge, #fbe4d5 error), 12 to 16 px corners, 15 to 25 px padding, no shadow except the `--shadow` token on the play window and world tiles; the dialog and keypad use 16 to 18 px corners on cream ground with a forest scrim at 44%.
- **Stage world:** the 16:9 well, 26 px corners, pale mint floor (#eaf4f1), overflow hidden, the floor shadow plus a 2 px inset highlight.
- **Lab drawer:** 94% cream, 22 px corners, 14 px padding, floor shadow; a Baloo 22 px head with a 44 px mint chevron that rotates 180 degrees when closed; variables separated by 1 px #e3d8c3 rules; the active challenge card is sunshine, a finished one mint, both 16 px corners.
- **Prediction card:** cream ground, 28 px corners, 28 px 30 px padding, `min(86%, 620px)`, centred text, rises 24 px over 420 ms on a forest scrim at 40%.
- **Discovery toast:** cream ground, 22 px corners, a 56 px sunshine circle with a star, Baloo 22 px title, two Nunito 15 px lines (the second in `soft`), a 44 px mint close circle; slides up 40 px over 520 ms.
- **Stage error pill:** cream with #8a3b1c text and a 40 px #f6e2d6 close circle, centred under the top chrome.

### Inputs / Fields

- **Parent:** cream surface, 1 px #8d9f8c border, 10 px corners, 44 px minimum, 10 px 12 px padding; labels are stacked, 700 weight, 8 px gap. Checkboxes are 24 px (44 px in data rows), range inputs 64 px tall, both with forest accent.
- **Stage range:** 44 px tall, forest accent, full width under its Baloo label and a forest tabular-nums value.
- **Number entry:** a 44 px outlined pill (2 px `line`, forest Baloo 16 px) opens the keypad: 28 px corners, 64 px cream-white keys with 16 px corners and Baloo 26 px digits, 56 px pill actions.

### App and conversation language — 2026-10-17

The existing parent form vocabulary carries one labelled English/Bangla choice, an explicit save action and separate status/error feedback. Settings explains that the chosen language covers screens, learning, voice and saved stories/worlds, and that a first translation may take a moment. With an active explorer, switch the browser only after the child update succeeds; before an explorer exists, save the browser preference. Profile selection updates mounted shared navigation in the same tab. Document language, title, description and manifest language follow the selection after hydration; the initial server render remains English.

Authored controls, loading/error states, accessible labels and known preset names use the selected edition. Keep editable names, email addresses and technical identifiers as data. English and Bangla remain the only Live choices; new conversations and generation follow the parent setting. Saved display prose opens in a translated edition while original records, art, scripts, physics and progress retain their identity. First-open, translation failure and retry states must name the actual operation rather than imply a new book is being generated. Backend policy and edition boundaries live in `docs/handoff/language-operations.md` at the repository root; current wording conventions live in `docs/i18n/bangla-review.md`.

### Shared utility icons — 2026-10-16

`components/UiIcon.tsx` defines a single 24×24 SVG family with 1.9px rounded strokes, round caps/joins, `currentColor` and no fill. Mic/mic-off, controller, book, paw, captions, home/gallery, directional and session actions use recognizable control symbols. SVGs are decorative inside labelled controls (`aria-hidden`, not focusable); the owning button or link supplies its accessible name and target. Keep character portraits and scientific artwork separate from this utility vocabulary.

Decorative sparkle badges, summon particles and guide-name sparks are removed. Voice-off portraits have no particle halo; purposeful connected/listening/speaking feedback stays contained. Semantic reward stars, the authored five-point brand star and actual celestial subject art remain. Do not reintroduce a sparkle as the generic create or navigation action.

### Navigation

- **Parent rail:** 240 px column with a 1 px right line; links are Nunito 700 15 px, 44 px tall, 10 px corners, 12 px 14 px padding; the current page fills #e4ecd9. Below 700 px the rail becomes a horizontal scrolling row under a bottom line, 14 px links.
- **Site header:** brand in Baloo 30 px with the Dream Launch mark; links 700 weight, 44 px tall (64 px in the child room); 30 px 6% padding.
- **Stage chrome:** the floating pill row described under Buttons; nothing persistent sits over the world.

### Cast strip

The signature navigation of the child room. A 132 px forest band across the bottom of the stage with a 1 px cream line at 13% along its top. Up to six friends sit as 84 px transparent buttons with 22 px corners: 68 px art in an SVG viewport, a Nunito 700 14 px name at 79% cream, a 4 px sunshine ring hidden at rest. The active friend grows to 96 px art lifted 6 px, full cream name and the ring at 55%; while speaking the ring goes opaque and breathes on the 1.4 s mic pulse. Disabled friends sit at 45%. The finish pill and quota note live in the strip's corners, 20 px in.

### Characters

Six preset friends/guides retain their established colors, faces, accessories and proportions as tactile raster actors in the existing 100-unit SVG slot. `CharacterArt` and `PetArt` use the shared `Actor`, catalog, model and clock in `components/acting/`. Each expanded actor has eight poses: idle, blink, attentive listening, small/open speech, wave anticipation/extension and celebration. The renderer selects one fully opaque pose at a time, without crossfading faces. Voice playback amplitude selects small/open speech through `--mouth-open` on a matching `data-voice-character` owner; Studio and companion speaking ownership uses `VoiceClient.speakerId` so a guest persona does not animate the preset companion. Existing audio subscribers clean up and reset mouth state on unmount. Optional Rive assets still mount in the same slot through `CharacterFace`; registered local raster art is its fallback.

### Listening state

Before the first world, a clear portrait and the invitation occupy separate areas of the selected preset’s accent-backed well. Voice-off/idle shows no decorative particle orb. `ListeningStage` mounts `DotOrb` only for live listening/speaking feedback, with its footprint limited to 100% of the portrait column. At container heights up to 280px, the portrait column is `minmax(84px, 140px)` beside a shrinkable copy column. Building keeps its meaningful status dots. Final desktop/phone idle captures confirm the removed halo and clear copy; connected-feedback containment is source-backed, without a new live microphone call.

### Summon and spell

The authored Studio entrance. Summon: an ink scrim at 80% fades in over 300 ms; the guide rises from 60vh at 60% scale to centre over 900 ms with an overshoot, with their name in the stage headline and catchphrase at 18 px, then settles into the strip. Spell: a sunshine radial burst over 1.2 s behind a forest pill banner (Baloo clamp(22px, 3.6vmin, 36px) in sunshine) that pops in and drifts up over 1.5 s. All entrances use `cubic-bezier(0.22, 1, 0.36, 1)`.

### Playable preview worlds — 2026-10-16

The six local preview worlds extend the approved cream-and-forest stage. The dragon and cannon share a painted meadow; the Moon and pond have their own painted backdrops. Dragon, cloud, duck, cannon and catching-cup cutouts sit alongside deterministic toy silhouettes. The peg board and fraction workmat use native geometry so counting, equal lengths and physical relationships remain explicit. These are local demonstration assets; prompts and provenance live in `public/worlds/PROVENANCE.md` and `public/worlds/PLAYABLE-PROMPTS.json`. They do not establish a live generation pipeline or replace the preset character identities or optional Rive mounting contract.

The canvas remains exactly 16:9. The action area, dials and caption band align to its rendered width, with Lab tools beside it on desktop and below on phones. Each preview has a short invitation, a concrete play action and a repeat control: bounce the dragon, drop both Moon objects, drop into the pond, launch the ball, release one peg-board ball, or split and join equal halves. Action pills are at least 48px tall; their existing sunshine primary and translucent cream secondary fills describe this surface, rather than changing the system palette. Readouts use tabular numerals.

Objects are deliberately larger within the world: the whole fraction block is twice a half's width, and the cup has an open collision interior. Learning annotations use Nunito and scale to a minimum of 13 CSS pixels at the rendered canvas width; ruler labels and plots remain within the scene. Curves are tessellated at a larger drawing scale before conversion to world units, preserving smooth round toys and pegs. Generated painting supplies atmosphere while native geometry and measurements carry the experiment.

The desktop and phone review set covers all six worlds in `.impeccable/review/worlds/`. Source verification for this extension covers `lib/playable-preview.ts`, `components/studio/PlayActions.tsx`, `app/studio.css` and the engine renderer, placeholder and world-graphics modules. This is an ordinary extension: incumbent frontmatter and `.impeccable/design.json` remain unchanged; previously documented metadata drift is deferred.

### Newly generated world actors — 2026-10-17

New articulated world actors use the existing engine’s distance-driven locomotion and registered sprite-sheet presentation. The builder requests native 2K art with the hero image model, then registers complete silhouettes into three aligned columns with 6, 9 or 12 chronological poses. One scale applies across the actor’s poses; walking/running uses a shared foot anchor, swimming/flying a body-center anchor. Output uses 512px cells only when source dimensions and pose extents support that detail; smaller sources retain 256px cells. Clipped, merged, extra or ambiguously ordered subjects and unresolved backgrounds fail registration, and identity/safety review remains mandatory. Articulated assets use `motion-v5`; rolling chassis retain `motion-v2`. This does not regenerate saved art or add pose coverage to single-image photos or outfits.

The actor’s visual cycle follows actual travel and stops at rest; it does not move the physics body. Scene staging normally makes the main actor 3–4m across in a 16m world, while preserving explicit child size choices and balanced casts. The moderated child’s actual words travel independently of the model’s summary and govern creation and edits, including quiet open play and exclusions. Optional story structure must not add unrequested blocking scenery, characters, scores, timers or quizzes. The `wd4` guidance removes a contradictory compulsory-obstacle prompt. An independent strict-JSON scene review now checks request fidelity before script/art within the existing three scene attempts, for initial creation and owned edits; explicit Labs retain their established path. Review uses a 15s HTTP timeout, 20s abort and one SDK attempt; repeated rejection or unavailable review fails closed. This gate adds bounded checking, not a broad semantic guarantee.

Approved scenery supplies the painted base floor only for a full-width static ground body at the bottom of a generated playground. Collision stays intact, and platforms, walls, Lab geometry and missing-art placeholders remain visible. The renderer replaces a streamed placeholder when its body, kind or presentation tags change, so a loading rectangle is not a permanent cream strip over a painting. An intervening Fenn world failed gameplay because an unrequested solid lantern tree blocked arrival around x10.1 for a tap at x12; it produced no phone capture. After the scene-review correction, a fresh full Fenn flow passed arrival, rest and reversal, and inspected desktop/phone captures confirm the clear route and removed cream strip. The loading strip is a corrected defect, not a new surface treatment.

Recorded earlier real-service acceptance covers Turtle Tide swimming, the enlarged Kingfisher flying and Fenn running through native creation, actual input, arrival and rest, with desktop/phone captures. Those accepted sheets have 9/9/12 distinct poses in 512px cells; the later blocked Fenn test does not inherit that acceptance. Configured-model review controls rejected the retained blocked world and approved the clear Fenn scene. Final fresh Fenn acceptance then passed the full real Live → scene review → native scene/script/art → owned API → canvas flow without injected art or manual repair, preserved the exact typed wish and contained only `ground_forest` and `fenn`. Its native 1536×1536 sheet has nine 512px poses; arrival/rest and reverse travel passed, and inspected desktop/phone captures show no page errors or overflow. Separate synthesized English PCM passed the real gateway/Gemini ASR path and preserved the child’s exclusions in `originalWish`; that spoken world was not browser-playtested. Earlier failed generations, the undersized first bird and a stable-x-only stopping false positive do not establish acceptance. Model variation and bounded retries remain; these cases establish articulated 2D sprite acting, not arbitrary-request reliability, continuous rigs, physical-microphone quality or child enjoyment. Source, evidence and current operational limits are recorded in repository `docs/handoff/generated-animation-operations.md` and `.impeccable/surfaces/components-studio-tsx.md`.

### Personal companion — 2026-10-16

The optional personal friend extends the existing cream-and-forest rooms. Parent setup uses a portrait beside the form on desktop and above it on phones; forest selected pills and a leaf-filled personality choice reuse the incumbent controls. Baloo names the section and navigation panel; Nunito explains choices, permission and connection state. A saved friend retains its name and artwork in explorer selection, its matching Studio cast slot and child navigation. Ready-made authored characters remain available alongside the parent-owned photo-to-chibi path.

The child navigation panel is a temporary cream overlay with rounded corners, a downward shadow and three leaf-toned destination buttons with inline SVG arrows. It opens from the portrait dock outside Studio and the Explore together pill in Studio. The Studio reserves a separate control row above the cast, preserving each friend's hit target. Opening moves keyboard focus to the first destination; Escape and Close restore focus to the trigger. Its current-page state, connection status and optional spoken caption describe the current screen without adding child text entry.

Preset companion speech uses the shared registered facial poses and real playback amplitude; the former whole-portrait rise and rotation is removed. Parent-generated photo-to-chibi portraits remain single images and do not gain articulated acting or lip-sync. Preview explicitly says photo drawing needs the connected Gemini service and offers ready-made selection; microphone capture and actual photo generation remain unavailable there. Credentialed photo generation and Gemini Live conversation remain acceptance gates. Surface dimensions, route behavior and the eight desktop/phone captures are recorded in `.impeccable/surfaces/personal-companion.md`. The acting extension preserves the token frontmatter and updates only acting metadata and narrative in the design sidecar; previously recorded type, tonal-color and radius metadata drift remains deferred.

### Learning Worlds — approved cinematic cast, 2026-10-16

The user approved Tooth Town and said, “Yes—carry this craft across the cast.” All 40 Learn characters retain generated raster acting: 39 now share eight-pose registered atlases with the six preset friends/guides and eight pets, while Tooth Town’s eight-pose reference remains unchanged. Their tactile surfaces, expressive eyes, soft warm light and restrained forest/cream accents establish the shared art direction. Eight active generated environments carry the same material and lighting craft: a shared Space painting for the solar and galaxy stories, separate Farm, Jungle and Ocean paintings, and Body, Food, Tooth Town and Exercise. The earlier mixed-habitat Animals painting is retained as an archive, not a primary story backdrop. The same acting craft now supplies the six preset Studio friends/guides; optional external Rive delivery remains separate.

The shared renderer clips registered alpha WebP atlases inside SVG viewports. Fourteen new atlases contain 424 poses for 53 expanded actors, with eight columns of 256px cells and one row per actor. Registration isolates complete silhouettes, applies one scale per actor across its eight poses, centers them horizontally and places their bottoms at 236px within each cell. Source PNGs and registered PNG originals are retained; environment paintings remain opaque. Tooth Town keeps its existing eight-pose atlas, including its 800ms brushing alternation and 6.4s blink. Coco’s matching game separately retains its four arm poses and measured legacy exercise row bounds (0, 349, 687, 935, 1247 in the 1261×1247 atlas). ToothActor now selects one opaque atlas cell too, eliminating superimposed idle, blink, speech and brush bodies. Shared speech has a 180ms minimum pose dwell and a 180ms silence release; reduced motion keeps a stable speaking pose. All original atlas pixels remain unchanged. This is discrete sprite acting, not film, a continuous skeletal rig or phoneme lip-sync.

One shared display-synchronized clock capped at 30Hz updates visible actors without per-actor RAF or React frame rendering. Offscreen actors are skipped; when no actors are visible or the document is hidden, the timer stops. Idle blinks are staggered on a 6.2s period. Listen, rest and requested gestures have a 2400ms action window; wave and dance/bounce pose sequences settle sooner, while celebration holds its semantic pose for the active result state. Aquatic swim requests for Dolphin, Whale, Seal and Penguin use the existing six-frame Ocean locomotion cycle at 140ms per frame within that bounded window; distance-driven route/trail travel remains separate. Generic whole-image dance, wave, swim, rest, island and pet loops no longer stand in for acting. Existing bounded spin/bounce transforms and purposeful educational rhythms retain their own roles. Reduced motion suppresses idle blinks and repeated gestures/swimming, keeps representative action and speech poses, and preserves game state and feedback.

Animal locomotion extends the existing acting sheets with three registered 1536×1024 alpha atlases, each containing six frames for four characters in 256px cells. All 12 animal cycles are available; the current chapters actively use Lion running and Seal swimming on valid trail cells, Dolphin swimming between route targets, and Horse advancing after correct memory progress. Dolphin uses lateral tail/flipper poses with travel-facing and pitch. The Mars rover uses native mechanical geometry; its wheel angle follows signed travel divided by its 12px radius. These actions ease into motion and brake before arrival, queue valid destinations without cutting corners, commit trail/route actions on arrival and defer completion until the actor arrives. Travel pauses in hidden tabs and locomotion stops at rest. Single-image imagined costumes retain their image while moving; they do not acquire articulated atlas poses.

The shared engine motion helpers and optional generated-world locomotion/atlas metadata support the same distance-driven presentation without moving physics bodies. Existing saved worlds retain their authored behavior until they are authored or regenerated with that metadata. This capability does not establish a full cinematic rig or upgrade old generated worlds. Arbitrary generated animation-art reliability remains open; custom photo portraits and single-image outfits do not gain authored pose coverage.

**The Acting-Sheet Rule.** Keep each character’s identity, proportions, scale and registration consistent across its states. Shared gesture poses use their registered bottom anchor; dedicated swimming/flying locomotion uses a body center. Select one opaque authored pose and route speech to its playback owner; whole-character bobbing and blended faces do not fulfill the acting direction. Bound requested gestures, pause invisible/hidden actor updates and retain semantic states under reduced motion. Advance travel locomotion by actual distance, stop it at rest and preserve legal route corners. Keep crops within their cells and retain the separate coach matching sheet’s measured row bounds.

**The Causal-Play Rule.** A learning scene must expose a direct action and a visible consequence. Artwork supplies atmosphere; native hit targets, paths, phase geometry and progress carry the game’s meaning. A facts panel is an optional conversation, not the primary game.

- **Story structure:** nine bilingual adventures provide one chapter for each of the 40 characters. Every chapter has an opening, direct play and an ending with a sourced fact. The child may choose any chapter, retry it or continue; the first unplayed chapter is selected on reload. The separate per-child chapter bookmark does not award challenge points or pets.
- **Play structure:** the five appropriate classic games retain brushing, oxygen delivery, Moon phases, plate building and Coco’s movement matching. Other chapters use subject-specific assembly, ordered delivery routes, trail navigation, angle/orbit and distance manipulation, sound/pattern memory, timed washing/breathing/rest, and cough covering. Native geometry, explicit targets and state feedback carry the learning; the generated environment supplies atmosphere.
- **Controls:** cream rounded rectangles reuse the button corner token. Story actions are at least 48px tall, with a forest primary and leaf secondary fill. The chapter chooser uses at least 64px rows, 54px art, a quiet leaf current state and an actual played check. Story focus uses a 3px ochre outline with a 4px offset; selected manipulation pieces use the same ochre. Existing subject controls retain their 44px minimum, and Coco’s classic matching pads retain 90×76px dimensions in a two-by-two phone grid. Movement control containers allow shrinking with `min-width: 0`; long trail instructions wrap in an HTML span outside the compact SVG crop.
- **Reading surfaces:** opening/ending dialogue uses feedback cream, card corners, up to 65ch and responsive padding. The play mission uses stage-pill cream, button corners and a separate 12px/16px inset (10px/12px on phones). Scene washes remain behind these reading surfaces; they do not replace them over dark paintings. Consequence bands wrap on phones and report actual game state.
- **Character access and calls:** Meet your friend retains facts, costumes and toy-phone calls. Optional story help pins the current guide to play and sends the authored chapter and phase through the shared voice path. The separate conversation still has forest-backed character choices with visible names and horizontal scrolling. Connected-service acceptance is separate from local sprite rendering.
- **Bookmark footer:** cream copy on bookmark forest reports the played count and saving/saved/offline status. Failed remote saves expose Retry save; locally cached pending chapters are retried online. The authenticated chapter API and gateway quiz-reward path remain separate.
- **App acting provenance:** exact generation prompts and identity references are in `docs/art/app-acting-prompts.json`; registration correction prompts are in `docs/art/app-acting-registration-prompts.json`. `apps/web/scripts/normalize-acting.mjs` records measured placement in `docs/art/app-acting-registration.json`. Source plates are `docs/art/sources/{space-inner,space-outer,space-cosmos,animals-farm,animals-jungle,animals-ocean,body,food,hygiene-friends,exercise,friends-pets,friends-guides,pets-meadow,pets-wonder}-acting-source-v2.png`; registered PNG originals and rendering WebPs use those same 14 stems at `public/characters/acting/<stem>-acting-v2.{png,webp}`. Runtime source is `components/acting/{Actor.tsx,catalog.ts,model.ts,clock.ts}`. The direction and quality contract are `docs/handoff/app-acting-quality-plan.md` and `.impeccable/review/app-acting/quality-bar.md`. This documentation handoff checks source contracts and provenance only; it does not independently certify the review card’s browser or service evidence.
- **Locomotion provenance:** exact generation and registration prompts are in `docs/art/locomotion-prompts.json` and `docs/art/locomotion-registration-prompts.json`. Source plates remain in `docs/art/sources/`; `apps/web/scripts/normalize-locomotion.mjs` registers complete alpha silhouettes at a shared scale per character and writes `docs/art/locomotion-registration.json`. Registered PNG originals and rendering WebPs are `public/learn/cinematic/animals-{farm,jungle,ocean}-locomotion-v2.{png,webp}`. The action implementation is `components/learn/LocomotionArt.tsx`, `components/learn/useTravel.ts`, `components/learn/AdventureBoard.tsx` and `packages/engine/src/motion.ts`.
- **Provenance:** exact approved-reference cast prompts are in `docs/art/learning-cast-prompts.json`; the three habitat environment prompts are in `docs/art/story-environment-prompts.json`; existing cast dimensions, alpha and PNG/WebP sizes are in `docs/art/learning-assets.json`; educational and recording sources are in `docs/art/learning-content-sources.md`. Local artwork is not evidence of a live image-generation or voice connection. Story source and implementation scope are recorded in `docs/handoff/story-learning-plan.md`. This documentation pass records source contracts; it does not assert a fresh browser verdict, service test, build or deployment.

## Do's and Don'ts

### Do:

- **Do** keep both rooms on the selected semantic palette: ink on ground for parents, ground on ink for the stage; Forest remains the warm default.
- **Do** use sunshine (#f7d76e) only for what is live, pressed or just happened, and peach (#f9ceb0) for warmth and the softer option.
- **Do** use Baloo 800 for anything named or chosen and Nunito for anything explained; keep everything sentence case.
- **Do** make stage controls full pills with floor shadows (negative spread, black at low alpha) and no borders; keep parent controls at 10 to 16 px corners with 1 px lines.
- **Do** keep targets at 44 px in the parent room, 52 px for stage pills and 64 px for the child's answers and keypad keys; every actionable control keeps a visible focus ring (ochre on cream, sunshine on forest).
- **Do** let the world fill the viewport in the Studio with chrome floating at a 16 px edge and the lab beside the world, never over it.
- **Do** ease Studio entrances with `cubic-bezier(0.22, 1, 0.36, 1)`; keep acting discrete and requested gestures bounded, with semantic poses and feedback retained under `prefers-reduced-motion`.
- **Do** mount registered preset actor art in the existing fixed square SVG slot so optional Rive assets swap without layout change.
- **Do** use shared registered raster poses for predefined actors, preserve Tooth Town and coach matching poses, tie travel locomotion to actual distance, and keep Pip in its reserved dock tile.
- **Do** retain the cream-and-forest Learn shell while generated art supplies tactile material and light.
- **Do** render interface prose and accessible labels in the selected English or Bangla edition, using the Bengali font extension and enough leading for marks and wrapped copy.

### Don't:

- **Don't** put a heading, a card frame or a scrolling column over or around the world in the Studio.
- **Don't** use yellow on a resting interface surface. Learn paintings may contain their subjects’ natural colors; its scene washes are the documented readability exception to the Studio’s spotlight-and-spell gradient guidance.
- **Don't** add uppercase labels, letter-spaced eyebrows or kicker lines; small labels get Baloo weight and a darker colour instead.
- **Don't** use hard offset shadows, even glows or coloured halos on resting elements.
- **Don't** add page-specific palettes or freeform CSS themes; the authorized Forest, Ocean and Terracotta presets change the existing roles together.
- **Don't** present the geometric landing window or local registered raster cast as final external Rive assets. Delivered local artwork has its own documented limits.
- **Don't** describe sprite acting as finished film, a continuous skeletal rig or phoneme lip-sync, or claim pose coverage for single-image photos/outfits or old generated worlds.
- **Don't** replace inline SVG icons with glyph fonts or emoji in chrome.
- **Don't** compress Bengali labels to fit English measurements or show both languages as a loading shortcut.

## Welcome and parent refinements — 2026-10-16

The user explicitly chose to keep the warm palette and elevate its craft. At the 2026-10-16 checkpoint, the landing paired its original “what if?” headline with a working gravity experiment: equal drop height/restitution, Earth 9.81 m/s² and Moon 1.62 m/s². Motion started only on an explicit click. That composition had one primary preview entry, and the three learning stages formed a sequential explanation rather than repeated icon cards. Landing display type reached 88px; 12–14px supporting labels, 18–20px introductions and 23–46px section headings were intentional refinements of the existing Baloo/Nunito hierarchy. Earth/moon surfaces used subdued leaf/stone tonal steps; the moving ball used the existing clay accent family. The curved experiment frame continued the original arched play-window identity. These details retain the historical evidence; the current three-role entry composition is defined by [Landing entry paths](.impeccable/surfaces/app-page-tsx.md), with its implementation and verification recorded in [the landing handoff](../../docs/handoff/landing-entry-and-controller.md). It gives parents, students and teachers equal character-led entry rows and retains the working gravity experiment below them within the same visual system.

Explorer choices retain 64px minimum child targets, visible focus, stable avatar slots, and a small directional hover response. Parent charts display actual available session data and switch to a clear invitation when empty; no invented progress or synthetic success metrics are shown. Preview Discovery Cards persist per child locally and clear with profile/account deletion.

The jelly-dragon fixture uses three locally hosted generated picture-book assets; provenance and exact prompts are in public/worlds/PROVENANCE.md. They are sample art, not live model-generation evidence. Other fixtures use physically meaningful geometric silhouettes. The Studio layout and six-character presentation retain Claude Code's authored direction; the subsequent user-requested character and measurement pass is documented below.

Verification for that 2026-10-16 checkpoint included desktop/mobile captures, responsive overflow checks, actual gravity interaction, landing→profile→Studio navigation, and browser flows. The mechanical detector reported advisory differences from the earlier design metadata (type ramp, tonal colors and small control radii); these are documented refinements, not a new theme. The design sidecar refresh is deferred rather than repaired as an unrelated task.

## Character and measurement refinement — 2026-10-16

The user explicitly requested better characters and accurate, balanced measurements throughout the interface. The earlier vector refinement established the six identities and their SVG/Rive mounting slots. The acting extension now preserves those faces, accessories and proportions in registered tactile raster poses, including blink and separate small/open speech frames. This supersedes the vector eye/mouth animation; optional external Rive assets retain their existing mounting path.

The character slots are 76px square on desktop and 64px on phones; selection scales the art by 1.08 without resizing its button. Every name stays visible and has an explicit accessible label. The 2px sunshine ring fits inside the cast row instead of clipping its top. Buttons keep a common baseline and footprint; the phone cast scrolls horizontally to retain readable names and usable targets.

The full-screen stage now explicitly overrides the page's 1360px maximum. Header, scene and cast occupy separate grid rows. A size-contained frame fits the canvas to both available dimensions at exactly 16:9, and the obsolete 380px host minimum is overridden. Dials sit in a compact row directly below the world on all sizes; the Lab panel stays beside the canvas on desktop and below it on phones. Values use tabular numerals on the same line as their labels; the slider and number-entry button share the next row. Inherited dial margins and label directions are reset locally.

At compact heights (landscape ≤600px or phone ≤700px), the stage scrolls vertically as a whole, so content keeps its size and controls cannot be covered by fixed chrome. Predictions use the world frame with at least 240px of space on phones. Compact navigation targets are at least 44px and prediction answers at least 48px; the larger desktop targets are retained. This is a deliberate responsive exception to the landscape-tablet framing described above.

Verification covers 1440×900, 1180×820, 390×844, 320×640 and 844×390, including the original parent/landing flows and actual character selection, predictions, dials, numeric input and finishing a session. Review captures are in `/tmp/ji-craft/`; the maintained regression is `e2e/studio-layout.spec.ts`. No hook suppressions were added. The previously flagged thick challenge side border was removed; the warm palette, intentional cast selection ring and established stage identity remain.

School lesson publication exposes a compact, localized readiness report and requires server-verified private model solutions alongside explicit bilingual teacher review. Saved notes and unanswered worksheets use a restrained paper surface, scientific units and revision labels, with readable phone controls and A4 pagination; the original lesson artwork and child Studio remain intact.
