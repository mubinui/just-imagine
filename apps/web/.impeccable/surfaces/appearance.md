---
version: 1
slug: 'appearance'
primary_target: 'app/admin/(console)/appearance/page.tsx'
related_targets:
  [
    'components/admin/AppearancePanel.tsx',
    'components/AppearanceProvider.tsx',
    'components/UiIcon.tsx',
    'lib/appearance.ts',
    'lib/brand.ts',
    'app/admin/admin.css',
    'app/globals.css',
    'app/theme-manifest/route.ts',
    '../../packages/protocol/src/appearance.ts',
    '../../services/api/src/admin.ts',
  ]
---

# Surface brief: Appearance (`/admin/appearance`)

Mode: Operate. A verified operator selects a coordinated interface palette, inspects its effect on the existing brand mark, child stage and parent reading surfaces, then explicitly publishes it for families. This user-authorized system extension retains the incumbent warm default, tactile characters, typography and two-room structure.

## Direction contract

THESIS: make one clear, reviewable colour decision for the shared interface. Forest is the default; Ocean and Terracotta are the only additional presets. `THEME_PALETTES` in `packages/protocol/src/appearance.ts` owns the exact eleven values per preset. `DESIGN.md` frontmatter preserves the Forest primitives; `.impeccable/design.json` records additional preset values and runtime-to-default token mappings under `extensions.appearance`.

OWN-WORLD: retain Baloo names, Nunito explanations, cream reading surfaces, quiet dividers and rounded controls. The selected semantic `ink` becomes the child-stage background and parent foreground; `ground` supplies the inverse. Dream Launch keeps its existing geometry: `accent` tile, `ground` cloud, `peach` arc and `yellow` five-point star. Characters, paintings, scientific colours, reward meaning and family progress retain their authored identity. No arbitrary CSS, freeform colour picker, custom logo upload or generated-art recolouring is introduced.

FIRST VIEWPORT: show a heading and concise consequence, then three labelled radio choices with swatches, descriptions and a visible Live marker on the published choice. Keep a representative brand/stage/paper preview beside the form on desktop. The form/preview grid is `minmax(0, 1.15fr) minmax(280px, 0.85fr)` with a 32px gap. At or below 1050px it stacks; preview width caps at 540px. The preview uses 16px corners and its own scoped CSS variables, so choosing a draft does not recolour the surrounding console or publish to visitors.

ACTIONS: Apply names the selected preset and is disabled when unchanged, loading, busy or the resource has failed. Reset preview appears for a changed draft. Loading uses the existing skeleton; read failure retains Refresh. Applying disables the fieldset/actions and says Applying…. A status message distinguishes preview from published state. Save failure uses an alert; a stale revision tells the operator to refresh before applying again. Preserve native radio keyboard behavior and explicit labels. Shared control SVGs use `UiIcon`'s 24px view box, 1.9px rounded stroke and `currentColor`; the owning control provides its accessible name.

PUBLICATION: public `GET /v1/appearance` is a no-store safe read containing only `theme` and `revision`. Writes use the existing verified admin-claim guard at `POST /v1/admin/appearance`, strict enum/revision/reason validation, an audited Firestore transaction and compare-and-set revision. A stale revision receives 409 rather than silently overwriting another operator. An absent document resolves to Forest/revision zero. Successful publication updates the current publisher through `ji:appearance`, then reloads the resource.

VISITOR UPDATE: `AppearanceProvider` validates its cached value before applying it, fetches the public resource and retains the last valid palette if unavailable. Without a valid cache Forest stays usable. Other open pages poll every 30 seconds while visible and refresh on focus or visibility return. Root `data-theme` and semantic variables change together. Browser theme colour uses `accent`; SVG favicon, Apple-touch link and the selected manifest/icons follow the same preset. The manifest supplies matching 192px, 512px and maskable PNGs. Already installed icons may remain cached by the browser/platform; this flow does not promise an immediate operating-system icon refresh.

QUIET CHROME: utility symbols communicate mic, controller, book, paw, captions, navigation and session actions. Decorative sparkle badges, summon particles and guide-name sparks are removed. Voice-off Studio has no particle orb. Live listening/speaking feedback stays inside the portrait's 100% footprint; compact containers up to 280px high give portrait and copy separate grid columns. Semantic reward stars, the fixed five-point brand star and actual celestial subject art remain.

## Evidence and handoff — 2026-10-16

The implementation scope is `docs/handoff/ui-consistency-theme-release-plan.md`. The supplied `.impeccable/review/ui-theme/capture-report.json` lists 25 route/viewport/palette captures and records actual admin publication, independent-visitor update, preview isolation, unchanged Ari profile data, no page errors and final Forest selection. Those are supplied implementation evidence, not new acceptance runs by this documenter.

The original `finish-review.md` reviewed that full set and requested one correction: remove the idle Studio particle halo and keep feedback clear of phone copy. Final `finish-verdict.md` says `disposition: ship` for that single scored correction, with desktop/phone idle recaptures showing it resolved. Connected-feedback containment is supported by source; a fresh connected microphone call was not captured.

This handoff inspected protocol/client/API source, CSS, the existing product/design records, plan, both review artifacts and representative final `appearance-preview-ocean`, `learn-short-desktop`, `learn-mobile`, `parent-terracotta` and `studio-mobile` captures. It made scoped documentation changes only. Existing unrelated type, tonal-colour, radius and component-snapshot metadata drift remains deferred. No new browser QA, tests, model calls, deployment or whole-surface approval is asserted.
