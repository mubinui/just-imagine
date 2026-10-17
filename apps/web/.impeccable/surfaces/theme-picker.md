---
version: 1
slug: 'theme-picker'
primary_target: 'components/ThemePicker.tsx'
related_targets: ['lib/appearance.ts', 'components/AppearanceProvider.tsx', 'app/theme-picker.css']
---

# Surface brief: Personal app theme

Mode: Operate. An end user chooses interface colors on this device: Follow app default, Forest, Ocean or Terracotta. Selection applies immediately. The existing semantic palettes, typography, character paintings and generated worlds remain intact; the operator still publishes the shared app default separately.

## Compact popover refinement — 2026-10-18

Headers use a compact button with the effective palette’s accent swatch, current preference label and chevron. It opens a native `popover="auto"` panel with a named nonmodal dialog, four native radio choices in a fieldset, palette swatches and actual saved/default/visit-only feedback. The trigger exposes expanded state and its controlled panel. Native Escape and light-dismiss behavior close the panel; the trigger is explicitly focused on activation so native dismissal can restore focus there. The panel is not a modal focus trap and does not start voice.

Stage and Stories controls pair ground text with dark tonal ink surfaces for both button and popup. Other headers use the existing light surface/ink pair. Targets are at least 44px; the popup is at most 288px wide, stays within 16px viewport gutters and scrolls within available height. Its position follows the trigger on scroll and resize. The stage header groups voice/build status with this button on the right; at 760px and below the status text is visually hidden while its accessible content and dot remain. Stories retains its separate compact phone row. Nonmodal theme popovers do not hide or reclaim the ordinary child appbar.

Parent Settings retains the full explanatory native select, paired ink/ground and option ink/surface colors, its light native color scheme and explicit status feedback. Header choices and Settings share the same preference and English/Bangla copy. The validated `ji-theme-preference` device value takes precedence over published-default `ji-appearance` cache and polling; Follow app default removes that override. Tokens, mark/favicon, browser color and theme manifest resolve from the same effective preset. Storage failure retains a working in-memory choice and states that it applies for this visit. Cross-tab changes update the selection without writing it back.

Source checked: `components/ThemePicker.tsx`, `app/theme-picker.css`, `components/studio/Dock.tsx`, `app/companion.css`, `test/theme-header.test.tsx` and `e2e/theme.spec.ts`. The regressions describe immediate selection, device persistence/default reset, Escape focus and Learn appbar visibility. They were read, not run by this documentation pass. The current native capture matrix is `.impeccable/review/premium/`; QA and finish review are pending, so this brief claims no native acceptance or new Live/provider evidence. DESIGN.md token frontmatter and `.impeccable/design.json` remain unchanged.

## Earlier native select contrast — 2026-10-17

At this checkpoint, both compact and Settings controls used native selects. The native select explicitly pairs ink text with ground, and option text with the surface role, so dark Studio/Learn/Stories chrome cannot pass light text into a light system menu. Hover and selected options pair accent with accent-ink. The control requests a light native color scheme and retains the existing semantic presets, selected edition, immediate device preference and visible focus behavior.

This earlier local contrast correction in `app/theme-picker.css` introduced no new palette or freeform colors; its select treatment now remains in Settings. Native popup rendering remains controlled by the browser and operating system; the source assignments alone do not certify every platform’s menu appearance. Root owns the desktop/phone native confirmation and final review; this documentation merge does not claim a new browser or provider test. DESIGN.md token frontmatter and `.impeccable/design.json` are unchanged.
