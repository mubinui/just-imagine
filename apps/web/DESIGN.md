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
---

# Design System: Just Imagine web

## Overview

**Creative North Star: "The Theatre Built From the Mark"**

Just Imagine has one palette and two rooms. The parent room is a calm, paper-coloured page: warm cream ground (#fff9ee), deep green foreground (#243e36), forest actions (#245e4e), muted leaf, ochre and clay accents. Locally hosted Baloo provides soft rounded headings; Nunito provides readable body copy. The landing composition pairs a large question with an abstract geometric play window. It makes no claim that geometric placeholders are final illustration.

The child room is the same palette turned inside out. The Studio is a stage, not a page: the forest green that is ink on the parent side becomes the wings and floor, and the cream that is ground on the parent side becomes the pills, captions and sheets that float at the stage edges. The Dream Launch mark (forest tile, cream cloud, peach arc, sunshine star) supplies the whole stage vocabulary: forest for the house, cream for anything you can touch, peach for warmth, sunshine for anything live. Six authored SVG characters carry the mark's round geometry (big eyes, a mouth driven by the voice level, a blink every few seconds) and stand in for external Rive assets with identical mounting.

The child and parent worlds share typography and semantic colors. Motion duration is a token and becomes zero with reduced-motion preferences. Physics remains interactive. Parent forms and all actionable child controls retain visible keyboard focus. Browser selection, progress meters and range inputs use the same palette.

**Key Characteristics:**

- One palette, inverted between rooms: cream page with forest ink for parents; forest stage with cream pills for children.
- Baloo for anything that names (headings, dial values, chip titles, answer buttons); Nunito for anything that explains (body, captions, pill labels).
- Sunshine (#f7d76e) means live: mic ring, speaking friend's ring, pressed pill, connected dot, active challenge, spell banner.
- Fully rounded pills on the stage; 10 to 16 px corners in the parent room.
- Soft offset shadows cast toward the floor; no borders on the stage, quiet 1 px dividers in the parent room.
- One authored motion moment (the summon rise with sparkles); everything else is a short state transition or a breathing pulse.

## Colors

A warm cream and deep forest pair that trades places between the two rooms, with peach for warmth and sunshine for anything alive.

### Primary

- **Forest** (`accent`): parent primary buttons, checkbox and range accent, the listening-state stage floor, the first prediction answer, the lab drawer's scrollbar thumb and numeric values. Hover deepens to a darker forest (#194d3e on the parent side, #2d7260 on the stage).
- **Deep Forest Ink** (`ink`): body and heading text in the parent room; the stage wings, floor and cast strip; the spell banner; the world-action chips at 80% (#243e36cc) and the summon scrim at 80%.

### Secondary

- **Sunshine** (`yellow`): the live signal. Mic ring and mic badge, the active friend's ring, pressed Captions pill, connected status dot and its pulse, the Discovery badge, the active challenge card, the third prediction answer, text selection, the spell burst and banner text. On the stage it is also the focus outline.
- **Peach** (`peach`): warmth and the softer alternative. Cheeks on every character, the second prediction answer, the building status dot, the quota note, every other summon sparkle, the mark's arc.

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
- **World Floor** (`stage-world-floor`): the pale mint backing of the 16:9 engine canvas before the engine paints.

### Named Rules

**The Sunshine-Means-Live Rule.** Yellow (#f7d76e) is reserved for things that are listening, speaking, pressed, connected, or just happened. It never decorates a resting surface. A yellow element the child cannot act on or that is not currently happening is a defect.

**The Inverted Rooms Rule.** Forest ink and cream ground are the same two colours in both rooms; the parent room sets ink on cream and the stage sets cream on ink. Never introduce a third page colour to tell the rooms apart.

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

### Named Rules

**The Naming Face Rule.** Baloo appears wherever a thing is named or chosen: headings, dial values, variable names, answer buttons, keypad digits, the spell banner. Nunito appears wherever a thing is explained: body, captions, pill labels, hints. A Baloo sentence or a Nunito heading is a defect.

**The Sentence Case Rule.** No uppercase labels anywhere. Small labels get Baloo weight and a darker colour, not tracking or capitals.

## Layout

The parent room is a centred page, max 1360 px wide with 6% side gutters. The parent shell is a two-column grid (240 px navigation rail, fluid content; 190 px rail below 1000 px) and collapses to a single column below 700 px, where the rail becomes a horizontally scrollable row under a 1 px divider. The landing hero is a two-column grid that stacks below 700 px. Forms are a two-column grid that stacks below 700 px. Parent spacing rhythm is 18 to 40 px: 18 px row padding, 20 to 25 px between groups, 30 to 40 px section margins.

The Studio is a fixed full-viewport stage (`position: fixed; inset: 0`) on forest, laid out as a scene above a 132 px cast strip. The scene letterboxes the world to 16:9 at `min(100%, (100dvh - strip - 72px - 70px) * 16/9)`, centred, with 72 px of headroom for the floating top chrome and a 54 px caption band beneath it. Everything else floats at a 16 px stage edge: home and gallery pills top-left, reset, captions and the status chip top-right, dial trays at the world's bottom-left, world-action chips at the world's top-left, the quota note at the strip's bottom-left and the finish pill at the strip's bottom-right. When a world carries variables the scene becomes two columns (fluid world, 300 px lab column, 16 px gap); the lab sits beside the world, never over it. The Discovery toast anchors bottom-right above the strip at `min(380px, 80vw)`; the prediction sheet and summon overlay cover the world.

Below 760 px wide or 520 px tall the stage keeps its structure and shrinks: the strip drops to 96 px (150 px when the finish corner stacks above the friends), pill labels and the status detail hide so the chrome is icons only, friends shrink to 48 px art (64 px active) and lose their names except the active one, the lab column moves below the world, the dial tray and world-action chips hide, and the toast spans the width.

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

### Navigation

- **Parent rail:** 240 px column with a 1 px right line; links are Nunito 700 15 px, 44 px tall, 10 px corners, 12 px 14 px padding; the current page fills #e4ecd9. Below 700 px the rail becomes a horizontal scrolling row under a bottom line, 14 px links.
- **Site header:** brand in Baloo 30 px with the Dream Launch mark; links 700 weight, 44 px tall (64 px in the child room); 30 px 6% padding.
- **Stage chrome:** the floating pill row described under Buttons; nothing persistent sits over the world.

### Cast strip

The signature navigation of the child room. A 132 px forest band across the bottom of the stage with a 1 px cream line at 13% along its top. Up to six friends sit as 84 px transparent buttons with 22 px corners: 68 px SVG art, a Nunito 700 14 px name at 79% cream, a 4 px sunshine ring hidden at rest. The active friend grows to 96 px art lifted 6 px, full cream name and the ring at 55%; while speaking the ring goes opaque and breathes on the 1.4 s mic pulse. Guides carry a 12 px sunshine spark after their name. Disabled friends sit at 45%. The finish pill and quota note live in the strip's corners, 20 px in.

### Characters

Six authored SVGs in a 100 unit viewBox built from the mark's palette (ink, cream, peach, sunshine, forest) plus one or two character colours each. Shared parts: elliptical ink eyes with a white highlight that blink on a 4.6 s cycle, peach cheeks at 55% (100% when happy), and a rounded mouth whose vertical scale follows `--mouth-open` from the voice level in 40 ms steps. Emotions come from `data-emotion` on the host: surprised narrows and opens the mouth, sleepy closes the eyes, thinking lowers one eye. When a Rive canvas is available it mounts in the same slot at the same size.

### Listening state

Before the first world the 16:9 well fills with forest (`accent`) and shows the active friend at `clamp(150px, 28vmin, 260px)` over a cream radial spotlight, inside a 5 px sunshine mic ring that breathes outward on a 1.8 s pulse (a second ring sits still at 55% behind it; both still at 35% when not connected), with a sunshine mic badge at the friend's lower right. Under it: the stage headline "Tell {name} what you imagine" in cream and a Nunito hint at 80%. While building, the well deepens to #2f5b4f and three 12 px sunshine dots bounce.

### Summon and spell

The one authored motion moment. Summon: a forest scrim at 80% fades in over 300 ms; fourteen 14 px eight-point sparkles (sunshine and peach alternating) burst from the strip over 1.1 s; the guide rises from 60vh at 60% scale to centre over 900 ms with an overshoot, with their name in the stage headline and catchphrase at 18 px, then settles into the strip. Spell: a sunshine radial burst over 1.2 s behind a forest pill banner (Baloo clamp(22px, 3.6vmin, 36px) in sunshine) that pops in and drifts up over 1.5 s. All entrances use `cubic-bezier(0.22, 1, 0.36, 1)`.

### Playable preview worlds — 2026-10-16

The six local preview worlds extend the approved cream-and-forest stage. The dragon and cannon share a painted meadow; the Moon and pond have their own painted backdrops. Dragon, cloud, duck, cannon and catching-cup cutouts sit alongside deterministic toy silhouettes. The peg board and fraction workmat use native geometry so counting, equal lengths and physical relationships remain explicit. These are local demonstration assets; prompts and provenance live in `public/worlds/PROVENANCE.md` and `public/worlds/PLAYABLE-PROMPTS.json`. They do not establish a live generation pipeline or replace the SVG/Rive character contract.

The canvas remains exactly 16:9. The action area, dials and caption band align to its rendered width, with Lab tools beside it on desktop and below on phones. Each preview has a short invitation, a concrete play action and a repeat control: bounce the dragon, drop both Moon objects, drop into the pond, launch the ball, release one peg-board ball, or split and join equal halves. Action pills are at least 48px tall; their existing sunshine primary and translucent cream secondary fills describe this surface, rather than changing the system palette. Readouts use tabular numerals.

Objects are deliberately larger within the world: the whole fraction block is twice a half's width, and the cup has an open collision interior. Learning annotations use Nunito and scale to a minimum of 13 CSS pixels at the rendered canvas width; ruler labels and plots remain within the scene. Curves are tessellated at a larger drawing scale before conversion to world units, preserving smooth round toys and pegs. Generated painting supplies atmosphere while native geometry and measurements carry the experiment.

The desktop and phone review set covers all six worlds in `.impeccable/review/worlds/`. Source verification for this extension covers `lib/playable-preview.ts`, `components/studio/PlayActions.tsx`, `app/studio.css` and the engine renderer, placeholder and world-graphics modules. This is an ordinary extension: incumbent frontmatter and `.impeccable/design.json` remain unchanged; previously documented metadata drift is deferred.

### Personal companion — 2026-10-16

The optional personal friend extends the existing cream-and-forest rooms. Parent setup uses a portrait beside the form on desktop and above it on phones; forest selected pills and a leaf-filled personality choice reuse the incumbent controls. Baloo names the section and navigation panel; Nunito explains choices, permission and connection state. A saved friend retains its name and artwork in explorer selection, its matching Studio cast slot and child navigation. Ready-made authored characters remain available alongside the parent-owned photo-to-chibi path.

The child navigation panel is a temporary cream overlay with rounded corners, a downward shadow and three leaf-toned destination buttons with inline SVG arrows. It opens from the portrait dock outside Studio and the Explore together pill in Studio. The Studio reserves a separate control row above the cast, preserving each friend's hit target. Opening moves keyboard focus to the first destination; Escape and Close restore focus to the trigger. Its current-page state, connection status and optional spoken caption describe the current screen without adding child text entry.

Personal portrait speech uses a small whole-art rise and rotation, disabled by reduced-motion preference. This is an animated portrait, not a rigged Rive character or lip-sync. Preview explicitly says photo drawing needs the connected Gemini service and offers ready-made selection; microphone capture and actual photo generation remain unavailable there. Credentialed photo generation and Gemini Live conversation remain acceptance gates. Surface dimensions, route behavior and the eight desktop/phone captures are recorded in `.impeccable/surfaces/personal-companion.md`. This ordinary extension preserves the token frontmatter and design sidecar; previously recorded type, tonal-color and radius metadata drift remains deferred.

## Do's and Don'ts

### Do:

- **Do** keep the two rooms on the same two colours: ink on cream for parents, cream on ink for the stage.
- **Do** use sunshine (#f7d76e) only for what is live, pressed or just happened, and peach (#f9ceb0) for warmth and the softer option.
- **Do** use Baloo 800 for anything named or chosen and Nunito for anything explained; keep everything sentence case.
- **Do** make stage controls full pills with floor shadows (negative spread, black at low alpha) and no borders; keep parent controls at 10 to 16 px corners with 1 px lines.
- **Do** keep targets at 44 px in the parent room, 52 px for stage pills and 64 px for the child's answers and keypad keys; every actionable control keeps a visible focus ring (ochre on cream, sunshine on forest).
- **Do** let the world fill the viewport in the Studio with chrome floating at a 16 px edge and the lab beside the world, never over it.
- **Do** ease every entrance with `cubic-bezier(0.22, 1, 0.36, 1)`, run loops as slow breathing pulses, and zero all of it under `prefers-reduced-motion`.
- **Do** mount character art in a fixed square slot so authored SVG and Rive swap without layout change.

### Don't:

- **Don't** put a heading, a card frame or a scrolling column over or around the world in the Studio.
- **Don't** use yellow on a resting surface, or any gradient fill on a surface; the only gradients are the listening spotlight and the spell burst.
- **Don't** add uppercase labels, letter-spaced eyebrows or kicker lines; small labels get Baloo weight and a darker colour instead.
- **Don't** use hard offset shadows, even glows or coloured halos on resting elements.
- **Don't** add a third accent or a new page colour to distinguish screens; tonal steps of cream and forest do that.
- **Don't** present the geometric landing window or the authored SVG cast as finished illustration; the final painted and Rive assets are external.
- **Don't** replace inline SVG icons with glyph fonts or emoji in chrome.

## Welcome and parent refinements — 2026-10-16

The user explicitly chose to keep the warm palette and elevate its craft. The landing now pairs its original “what if?” headline with a working gravity experiment: equal drop height/restitution, Earth 9.81 m/s² and Moon 1.62 m/s². Motion starts only on an explicit click. It has one primary preview entry, and the three learning stages form a sequential explanation rather than repeated icon cards. Landing display type reaches 88px; 12–14px supporting labels, 18–20px introductions and 23–46px section headings are intentional refinements of the existing Baloo/Nunito hierarchy. Earth/moon surfaces use subdued leaf/stone tonal steps; the moving ball uses the existing clay accent family. The curved experiment frame continues the original arched play-window identity.

Explorer choices retain 64px minimum child targets, visible focus, stable avatar slots, and a small directional hover response. Parent charts display actual available session data and switch to a clear invitation when empty; no invented progress or synthetic success metrics are shown. Preview Discovery Cards persist per child locally and clear with profile/account deletion.

The jelly-dragon fixture uses three locally hosted generated picture-book assets; provenance and exact prompts are in public/worlds/PROVENANCE.md. They are sample art, not live model-generation evidence. Other fixtures use physically meaningful geometric silhouettes. The Studio layout and six-character presentation retain Claude Code's authored direction; the subsequent user-requested character and measurement pass is documented below.

Verification included desktop/mobile captures, responsive overflow checks, actual gravity interaction, landing→profile→Studio navigation, and browser flows. The mechanical detector reported advisory differences from the earlier design metadata (type ramp, tonal colors and small control radii); these are documented refinements, not a new theme. The design sidecar refresh is deferred rather than repaired as an unrelated task.

## Character and measurement refinement — 2026-10-16

The user explicitly requested better characters and accurate, balanced measurements throughout the interface. Preserve the existing six identities and SVG/Rive mounting contract. The SVG cast now has curved ear/fur silhouettes, distinct hair and clothing, fitted collars, a single crescent for Chandni, wing detail for Pori, clearer glasses for Onko Mama, and a visible hat silhouette for Jadu Kaka. Shared eyes and separate smile/open-mouth shapes retain amplitude-driven speech without stretching a smile line; both eyes blink together. These remain authored fallback characters, not final Rive assets.

The character slots are 76px square on desktop and 64px on phones; selection scales the art by 1.08 without resizing its button. Every name stays visible and has an explicit accessible label. The 2px sunshine ring fits inside the cast row instead of clipping its top. Buttons keep a common baseline and footprint; the phone cast scrolls horizontally to retain readable names and usable targets.

The full-screen stage now explicitly overrides the page's 1360px maximum. Header, scene and cast occupy separate grid rows. A size-contained frame fits the canvas to both available dimensions at exactly 16:9, and the obsolete 380px host minimum is overridden. Dials sit in a compact row directly below the world on all sizes; the Lab panel stays beside the canvas on desktop and below it on phones. Values use tabular numerals on the same line as their labels; the slider and number-entry button share the next row. Inherited dial margins and label directions are reset locally.

At compact heights (landscape ≤600px or phone ≤700px), the stage scrolls vertically as a whole, so content keeps its size and controls cannot be covered by fixed chrome. Predictions use the world frame with at least 240px of space on phones. Compact navigation targets are at least 44px and prediction answers at least 48px; the larger desktop targets are retained. This is a deliberate responsive exception to the landscape-tablet framing described above.

Verification covers 1440×900, 1180×820, 390×844, 320×640 and 844×390, including the original parent/landing flows and actual character selection, predictions, dials, numeric input and finishing a session. Review captures are in `/tmp/ji-craft/`; the maintained regression is `e2e/studio-layout.spec.ts`. No hook suppressions were added. The previously flagged thick challenge side border was removed; the warm palette, intentional cast selection ring and established stage identity remain.
