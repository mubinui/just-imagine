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

## Navigation and Live assistant placement — 2026-10-17

Mode: Operate. This extension supersedes the earlier portrait-menu and separate Studio-row placement. The user asks for easily found navigation and Live assistant controls. Preserve the approved characters, existing destinations and voice ownership/cancellation.

## Direction contract

THESIS: A child sees where to go and where to ask for help without opening an unlabeled portrait menu.

OWN-WORLD: A cream bottom bar carries the existing rounded SVG family and forest text, a mint current-page state and the unchanged personal companion portrait. Studio merges destinations into its existing opaque theme-ink character footer, with cream labels, mint current state and yellow keyboard focus. Its existing named Talk/Stop button is the single live voice action. Other child pages retain their paper navigation and companion panel. Sunshine anchors the named voice action and its live feedback.

STORY: Studio, Learn, Stories and Worlds are always visible for a selected explorer. Live assistant opens a named voice panel; microphone capture still requires an explicit Talk action. Choose explorer remains a utility in the panel.

FIRST VIEWPORT: One bottom bar on ordinary family child screens. Studio places destinations inside its existing character/game footer, with a single named voice action and no second navigation strip. The stage reserves the bar's actual footprint; ordinary pages reserve matching bottom space. Phone labels stay visible, with a compact labeled assistant; narrow phones wrap instead of clipping.

FORM: Local placement/clarity extension, no new visual world or seed. Current destinations expose aria-current, the assistant reports expanded state, and Escape/Close restore focus. Character dialogs temporarily hide the global bar and reclaim its space.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Implemented composition

Parent setup sits within explorer editing. A 160px portrait column and fluid form share a 28px gap on desktop. At 600px and below the form stacks; the portrait becomes an 80px image beside its name. The form presents Choose a friend and Make a chibi from a photo, a parent-editable name, three personality choices, then the appropriate save action. Selected style pills use forest; selected personalities use a forest outline and leaf fill. Photo mode adds a file field, local preview, an explicit parent permission checkbox and provider explanation. Busy, error and saved states use the existing button and status vocabulary.

Outside Studio, a shared paper bottom bar exposes Studio, Learn, Stories and Worlds beside a named Live assistant trigger. The bar reserves 80px plus the bottom safe area. Destination targets are at least 56px tall, with visible labels, a mint current-page fill and ink text. The assistant uses a 44px portrait beside its title and friend name; on phones these become 36px art and a compact labeled trigger. At 360px and below, navigation and assistant stack in a 120px bar plus the safe area. Child pages reserve the same footprint; character dialogs temporarily hide this bar and reclaim its space.

The assistant opens a 360px cream panel constrained to viewport width and available height, with scrolling for overflow. Its 16px corners, 24px desktop padding and downward shadow continue the established material language. A 72px portrait sits beside a 24px Baloo heading; Nunito carries the explanation, captions and status. Voice and Close controls are at least 44px tall; Choose explorer is a separate 48px utility row. The four primary destinations stay in the bottom bar instead of being repeated in this panel.

On `/studio`, the shared bar and assistant panel are suppressed. One opaque theme-ink Dock owns the cast, a single named Talk/Stop voice action, the same four visible destinations and the existing game controls. Ground-colored labels, mint selection with ink text and yellow keyboard focus remain paired with the dark footer. The footer uses its own grid rows and wraps on phones, with no second navigation strip. The finished-session surface replaces this stage and footer with the selected character, a quiet return and real next destinations; its behavior is recorded in `components-studio-tsx.md`.

## Behavior and access

The four visible destinations are Studio (`/studio`), Learn (`/learn`), Stories (`/stories`) and Worlds (`/gallery`); nested routes retain their matching current-page state. Choose explorer (`/play`) remains a utility in the assistant panel. The current destination exposes `aria-current`; the assistant trigger exposes its expanded state and the personal name. The panel is nonmodal. Opening focuses Talk/Stop in real mode or Close in preview; Escape and Close restore trigger focus, and an outside pointer closes it. Opening or navigating does not start microphone capture. Child controls use taps and voice; the editable name and file field belong to parent setup.

The shared child layout owns the voice session, allowing navigation among child routes without route-driven disconnection. It reports the current screen to the gateway and exposes connection state, optional spoken captions, and Talk together or Stop talking in real mode. Leaving the child layout, switching profiles or explicitly ending the session stops it; finishing Studio also stops its music. Voice navigation accepts only the named child destinations; parent/account routes remain outside that tool.

A saved companion's artwork and name appear in the explorer picker, matching active/inactive cast slot and navigation panel. Generated images fit the same square artwork wrapper as authored characters. Preset speech uses shared registered poses and playback amplitude. Single-image chibi portraits retain restrained playback-responsive presence, suppressed under reduced motion; they do not gain authored facial poses, a Rive rig or lip-sync.

## Preview and provider boundaries

Preview supports persistent ready-made selection and tap navigation. It explicitly states that photo drawing needs the connected Gemini service, disables the draw action and offers a ready-made friend. It labels the companion Preview friend · tap to explore and omits microphone controls. A local photo preview is source input, not generated-art evidence.

Real photo generation requires parent permission and configured Gemini access. The app keeps generated artwork in the private child profile and does not save the source photo; provider-side retention is governed by the selected Gemini service. Later credentialed checks verified Gemini3.8Live speech, browser microphone transcription, voice-driven world creation and parent upload→generated chibi→save/reload. Image input was synthetic artwork; likeness on a parent-supplied photo and real child/device usability remain acceptance work. See CHECKPOINT.md and the local-development handoff for evidence.

## Navigation extension evidence — 2026-10-17

This merge checked the current navigation/provider source, Dock and finished-session source, companion/theme/stage styles, and the navigation and break regressions. Root reports passing source tests and workspace checks; the latest combined-footer build and native review are recorded separately. `docs/images/{landing,learn,studio,laptop,tablet}.png` at the repository root and `.impeccable/review/navigation/` are the capture destinations. First-pass captures in that review directory may show earlier composition. This documenter did not run browser automation, independently approve those captures or perform a new Live/provider call.

The current extension preserves DESIGN.md token frontmatter and `.impeccable/design.json`. Earlier type-ramp, tonal-color, radius and original-stage-layout metadata drift remains deferred.

## Earlier companion evidence and finish

Checked source: `components/companion/Companion.tsx`, `components/companion/CompanionSetup.tsx`, `app/companion.css`, the shared child layout, profile/Studio integration and `e2e/companion.spec.ts`. Checked context: `PRODUCT.md`, `DESIGN.md` and the repository handoff plan. All eight review captures were inspected: `.impeccable/review/companion/{desktop,mobile}-{setup,photo,studio,gallery}.png`. They show ready-made artwork and preview UI, not a real generated child's portrait.

The fresh finish review shipped after first-action keyboard focus, Escape/Close restoration and SVG arrow consistency were corrected. The implementing agent reports 334 tests and 10 browser tests passed, followed by a passing focused keyboard-navigation test. This documentation pass inspected evidence and source; it did not rerun those suites.

This is an ordinary extension. DESIGN.md receives a narrow Components note; its token frontmatter and `.impeccable/design.json` remain unchanged. Earlier type-ramp, tonal-color, radius and original-stage-layout metadata drift is not promoted into new system rules or repaired in this pass.

## App-wide language extension — 2026-10-17

The parent’s chosen English/Bangla setting now covers companion setup, destination labels, known preset names, connection feedback, accessible names and Live conversation across shared and child routes. Parent copy uses আপনি and child copy uses তুমি. Authored names use deliberate Bangla-script forms; editable child/friend names and technical identifiers remain stored data. Switching language closes an old-language conversation while retaining the newly unlocked audio context; the next session follows the active child’s setting. Parent language saves take effect only after successful persistence, while profile selection updates mounted navigation immediately.

Preserve the current portrait footprints, cream panel, forest actions, tactile registered acting and optional photo path. Bengali text uses the shared Baloo Da 2/Noto Sans Bengali extension and appropriate leading, rather than a new composition. The earlier whole-portrait speech description is historical: the later shared registered-actor contract in DESIGN.md governs current authored actors and retains the stated limits for single-image portraits.

This merge checked the shared language root/form/catalog source and the supplied language evidence. Real-service reports record companion, authored/created character, Katha-question and selected-edition narration turns in both languages; a synthesized English PCM question requesting French received Bangla with Bangla selected. These are service samples, not native-reader or pronunciation certification, physical microphone/device evidence or new photo-likeness acceptance. The language finish verdict covers its two scored copy corrections only. No new QA, test suite or deployment was run by this documentation handoff; earlier evidence and deferred metadata drift retain their scope.
