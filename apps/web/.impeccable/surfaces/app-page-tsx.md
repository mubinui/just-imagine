---
version: 1
slug: 'app-page-tsx'
primary_target: 'app/page.tsx'
related_targets: ['components/Shell.tsx', 'app/welcome.css', 'components/UiIcon.tsx']
---

# Landing entry paths

Mode: Persuade. Extend the existing home page for the now-integrated family and school app. User confirmed equal, clear paths for parents, students and teachers; preserve the original characters and warm identity. The game controller also needs a cleaner silhouette in the shared icon family.

## Direction contract

THESIS: One imagination, three clear entrances. Visitors recognize their role and reach the matching existing sign-in without decoding family-versus-school terminology.

OWN-WORLD: Inherit the cream/forest theme, Baloo/Nunito and Bangla fonts, restrained paper surfaces and original registered character artwork. Katha welcomes parents, Pori students and Onko Mama teachers, matching their sign-in companions.

STORY: Understand learning through play, choose a role, or try the existing working gravity experiment. Family registration remains a separate explicit action; school credentials and teacher access remain unchanged.

FIRST VIEWPORT: Preserve the desktop split hero: concise invitation on the left, three equal character-led entry rows on the right. Phone stacks the invitation and compact entry rows, with no hidden or horizontally scrolling audiences. The compact gravity experiment lives beneath the desktop invitation on the left, retaining all three entrances on the right. Phones place the same experiment after the entrances. It makes one finite opening drop unless reduced motion is requested; explicit drop and gravity controls remain available.

FORM: Local extension of the incumbent split hero; no concept seed or replacement visual world. One shared controller path with recognizable grips, D-pad and face buttons. Existing actor clock supplies quiet, visibility-aware idle motion; no new entrance animation.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Implemented placement and evidence — 2026-10-17

The compact experiment occupies the left hero column beneath the invitation, with the three role entries spanning the right column. Its scene is 150–190px tall on desktop within a 450px maximum width; on phones the invitation and all three role links precede the 190px experiment. Earth and Moon keep equal drop height and restitution with their existing 9.81m/s² and 1.62m/s² gravity values. The initial drop is finite and is suppressed by the initial reduced-motion preference; explicit planet and drop controls remain available.

Source checked: `app/page.tsx`, `app/welcome.css` and `components/GravityPlayground.tsx`. Root’s initial Chrome inspection reports the compact-left composition, a working Moon control, the 1.62 readout and visible ball movement. That is a scoped interaction check; the final native finish verdict is separate. Repository `docs/images/landing.png` and `.impeccable/review/navigation/` hold capture evidence, including first passes that can predate the final layout. This ordinary placement change introduces no new design tokens or character artwork and makes no Live/provider claim.
