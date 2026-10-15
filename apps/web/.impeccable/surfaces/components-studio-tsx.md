---
version: 1
slug: 'components-studio-tsx'
primary_target: 'components/Studio.tsx'
related_targets: ['components/CharacterFace.tsx', 'components/studio']
---

# Surface brief: child Studio (`components/Studio.tsx`, route `/studio`)

Scope: the child-facing play screen, Experience mode. The visitor is a child aged 6 to 13 on a landscape tablet held in two hands, in a living room in daylight or lamplight, with a parent nearby. The job: speak an idea, watch it become a world, poke it, hear why it behaved that way. Actions are voice, tap, drag, flick, dial, slider, keypad; never typed text. Proof is the live world itself. Constraints: the engine canvas is 16:9 and resizes to its host width; the voice client and world source are fixed contracts; e2e flows rely on the names "Voice connection: connected", the prediction option buttons, the `gravity` select with preset values, "Cannon and Cup", "Lab tools", "Enter a number", "Clear", "Apply number", range sliders, "Start over", "Finish playing", and the "World actions" region.

Memorable moment: a friend is already waiting on the stage, and when a guide is summoned they arrive in a burst of sparkles and conjure the world.

Unresolved: Rive characters and painted art are external; the authored SVG cast stands in with identical mounting so the swap costs no layout.

## Direction contract

THESIS: The Studio is a stage, not a page. The world fills the viewport and everything else floats over it at the edges; it refuses the category default of a canvas inside a card with a stack of controls and headings scrolling below.

OWN-WORLD: A theatre built from the Dream Launch mark. Deep forest wings and floor (#243e36, #245e4e) frame a bright 16:9 world; controls are cream pills (#fff9ee) with Baloo labels and 64 px targets; accents are peach (#f9ceb0) for warmth and sunshine (#f7d76e) for anything live (mic pulse, active friend, spell burst). Radii 24 to 32 px, soft offset shadows, no gradient washes. Six authored SVG characters with the mark's round geometry: big eyes, a mouth driven by the voice level, a blink every few seconds.

STORY: The child sees their friend waiting and hears "tell me what you imagine"; the world appears progressively while the friend keeps talking; the child flicks and twists; a Discovery Card rises from the friend's corner; a guide can be summoned and does magic.

FIRST VIEWPORT: Landscape 1180x820. The 16:9 world letterboxed to the width with forest wings. Top-left: home and gallery pills (the gallery link is the only way to a saved world in real mode). Top-right: reset (a world action, so it sits with the world chrome), captions toggle, and the status chip (listening, building, ready, reconnecting). The finish pill sits in the strip's bottom-right corner, one reach from the friends and away from the two exits top-left, so a child cannot leave by accident; the quota note sits in the strip's bottom-left. Bottom edge, full width: the cast strip, up to six friends, the active one larger with a sunshine ring that pulses while they speak. Along the world's bottom edge: dial tray (playground) at left and the captions line beside it, filling to the right margin; when the world has variables the Lab tools panel is a column beside the world, never over it, so the cup the child must hit stays visible. Before the first world: the active friend large at centre of the stage under a cream spotlight with the prompt "Tell Bhombol what you imagine" and a pulsing mic ring; this is the primary action. Prediction sheet centred over the world with two or three pill answers. Discovery toast slides up from the bottom-right over the strip. Summon overlay: sparkle burst from the strip, the guide rises to centre, name and catchphrase, then settles into the strip. Spell flourish: radial burst and a banner naming the spell.

FORM: Full-bleed stage with cast strip, first of three structures considered (stage with cast strip; world plus side panel; split lab layout). Code-led. The concept roll was not run: on 2026-10-16 the user answered the structured three-option question with "Full-bleed stage (Recommended)", "Six authored SVG characters (Recommended)" and "A storybook tray on stage (Recommended)"; that pick stands in for the roll by the user's own choice. Seed key: none.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Implemented extension — 2026-10-16

The user approved retaining the warm cream-and-forest direction while improving the six characters and making the six preview worlds richer and playable. The existing direction contract records the original composition; the following describes its implemented responsive refinement.

Header, scene and cast occupy separate rows. A size-contained frame keeps the world exactly 16:9; the action area, dials and captions align with the actual canvas width. Lab tools sit beside the world on desktop and below on phones. Phone content uses a vertical scene flow, and compact-height windows scroll the stage as a whole to preserve usable controls. The six SVG identities retain visible names, stable slots, shared blink and voice-driven mouths; final Rive assets remain external.

Local preview art now includes painted meadow, Moon and pond backgrounds plus dragon, cloud, duck, cannon and cup cutouts. The peg board and fraction workmat retain native geometry for exact counts and proportions. These local assets are documented in `public/worlds/PROVENANCE.md`; they do not imply live model generation. Larger objects, smooth native curves and learning annotations of at least 13 CSS pixels keep the experiment readable at phone scale.

Each world offers a named action and Try again in the World actions region. The actions bounce the dragon, drop Moon objects together, drop duck and stone into the pond, launch a ball toward the open cup, release a peg-board ball, or split a whole into equal halves; fractions also offer Join the halves. These controls act on the simulation. Play-action buttons retain a 48px minimum height, with real gravity, flight-time, settled-ball or fraction readouts where relevant.

Review evidence: `.impeccable/review/worlds/{desktop,mobile}-{dragon,moon,pond,cannon,pegs,fractions}.png`. The final review shipped after all twelve captures and the bounded mobile annotation fix. This extension preserves the incumbent token frontmatter and sidecar; pre-existing metadata drift is outside its scope.
