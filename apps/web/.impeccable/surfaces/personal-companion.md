---
version: 1
slug: 'personal-companion'
primary_target: 'components/companion/Companion.tsx'
related_targets:
  [
    'components/companion/CompanionSetup.tsx',
    'app/companion.css',
    'app/(child)/layout.tsx',
    'components/ProfilePicker.tsx',
    'components/Studio.tsx',
  ]
---

# Surface brief: personal companion

Approved scope: an optional parent-supplied photo creates a chibi play friend, with ready-made friends available without a photo. The same name and artwork follow the selected explorer through child screens. The approved cream-and-forest identity, Baloo/Nunito pairing and authored cast remain the visual authority. Implementation and provider configuration are tracked in `docs/handoff/personal-companion-plan.md` at the repository root.

## Implemented composition

Parent setup sits within explorer editing. A 160px portrait column and fluid form share a 28px gap on desktop. At 600px and below the form stacks; the portrait becomes an 80px image beside its name. The form presents Choose a friend and Make a chibi from a photo, a parent-editable name, three personality choices, then the appropriate save action. Selected style pills use forest; selected personalities use a forest outline and leaf fill. Photo mode adds a file field, local preview, an explicit parent permission checkbox and provider explanation. Busy, error and saved states use the existing button and status vocabulary.

Child navigation uses a 344px cream panel constrained to viewport width and available height, with scrolling for overflow. Its 16px corners, 20px padding and downward shadow continue the established material language. A 72px portrait sits beside a 24px Baloo heading; Nunito carries the explanation and destination text. Destination rows are at least 48px tall, with 10px corners, leaf fills, a darker selected/hover state and inline SVG arrows. Voice and Close controls are at least 44px tall.

Outside Studio, the portrait-and-name trigger docks at bottom-right, with 64px art; Gallery reserves bottom padding. Studio mounts Explore together beside Finish playing in a separate row above the cast. The strip reserves 164px on desktop and 174px on phones, increasing to 198px when a phone quota note needs its own row. At phone widths the Studio panel becomes fixed above the cast with a bounded height. The open navigation panel may temporarily cover scene content; closing it restores the ordinary stage composition.

## Behavior and access

The three destinations are Our adventure (`/studio`), Saved worlds (`/gallery`) and Choose explorer (`/play`). The current destination exposes `aria-current`; the trigger exposes its expanded state and the personal name. This is a nonmodal navigation section. Opening focuses the first destination, Escape and Close restore trigger focus, and normal keyboard navigation remains available. Child controls use taps and voice; the editable name and file field belong to parent setup.

The shared child layout owns the voice session, allowing navigation among child routes without route-driven disconnection. It reports the current screen to the gateway and exposes connection state, optional spoken captions, and Talk together or Stop talking in real mode. Leaving the child layout, switching profiles or explicitly ending the session releases it. Voice navigation accepts only the named child destinations; parent/account routes remain outside that tool.

A saved companion's artwork and name appear in the explorer picker, matching active/inactive cast slot and navigation panel. Generated images fit the same square artwork wrapper as authored characters. Speaking animates the whole portrait through a 3px rise and 2-degree rotation over 0.7 seconds, with the loop removed under reduced-motion preference. This motion is neither a Rive rig nor facial lip-sync.

## Preview and provider boundaries

Preview supports persistent ready-made selection and tap navigation. It explicitly states that photo drawing needs the connected Gemini service, disables the draw action and offers a ready-made friend. It labels the companion Preview friend · tap to explore and omits microphone controls. A local photo preview is source input, not generated-art evidence.

Real photo generation requires parent permission and configured Gemini access. The app keeps generated artwork in the private child profile and does not save the source photo; provider-side retention is governed by the selected Gemini service. Later credentialed checks verified Gemini3.8Live speech, browser microphone transcription, voice-driven world creation and parent upload→generated chibi→save/reload. Image input was synthetic artwork; likeness on a parent-supplied photo and real child/device usability remain acceptance work. See CHECKPOINT.md and the local-development handoff for evidence.

## Evidence and finish

Checked source: `components/companion/Companion.tsx`, `components/companion/CompanionSetup.tsx`, `app/companion.css`, the shared child layout, profile/Studio integration and `e2e/companion.spec.ts`. Checked context: `PRODUCT.md`, `DESIGN.md` and the repository handoff plan. All eight review captures were inspected: `.impeccable/review/companion/{desktop,mobile}-{setup,photo,studio,gallery}.png`. They show ready-made artwork and preview UI, not a real generated child's portrait.

The fresh finish review shipped after first-action keyboard focus, Escape/Close restoration and SVG arrow consistency were corrected. The implementing agent reports 334 tests and 10 browser tests passed, followed by a passing focused keyboard-navigation test. This documentation pass inspected evidence and source; it did not rerun those suites.

This is an ordinary extension. DESIGN.md receives a narrow Components note; its token frontmatter and `.impeccable/design.json` remain unchanged. Earlier type-ramp, tonal-color, radius and original-stage-layout metadata drift is not promoted into new system rules or repaired in this pass.
