# Landing entry paths and controller icon

Date: 2026-10-17. Worktree: `../just-imagine-integrated`.

The user requested equally clear paths for parents, students and teachers, preservation of the existing characters, and a more recognizable game controller icon. This is an ordinary extension of the integrated app's warm cream/forest identity. The authoritative composition brief is [Landing entry paths](../../apps/web/.impeccable/surfaces/app-page-tsx.md); [PRODUCT.md](../../apps/web/PRODUCT.md) supplies the durable product context and [DESIGN.md](../../apps/web/DESIGN.md) retains the visual system.

## Implemented surface

The desktop split hero keeps the invitation on the left and gives each audience one equally styled, fully linked row on the right. Katha welcomes parents, Pori students and Onko Mama teachers, matching the existing sign-in companions. Phones stack the invitation and all three rows; audience selection does not depend on a horizontal carousel. Family account creation remains a separate action below the rows in real mode.

| Entry                   | Existing destination                 | Local preview behavior                           |
| ----------------------- | ------------------------------------ | ------------------------------------------------ |
| Parents                 | `/sign-in`                           | `/play`, with the existing preview sign-in label |
| Students                | `/study/sign-in`                     | Same school sign-in destination                  |
| Teachers                | `/school/sign-in`                    | Same school sign-in destination                  |
| Create a family account | `/sign-up`                           | Omitted in fake mode                             |
| Operator sign in        | `/admin/sign-in`, in the home footer | Same operator sign-in destination                |

The home header repeats the three audience links and groups the English/Bangla selector with the existing theme picker. Choosing a language updates the family and school language preferences. This combined preference group is scoped to `/`; the existing theme picker on other ordinary header surfaces remains. The main element declares the selected language. English and Bangla landing copy live in their existing string tables. The operator link is a footer utility rather than a fourth audience row.

The existing working gravity experiment follows the entry section. Its equal drop height, restitution, Earth acceleration of 9.81 m/s², Moon acceleration of 1.62 m/s² and explicit user-triggered drop behavior remain in `GravityPlayground`. Discovery copy accompanies it, followed by a compact invitation and school sign-in guidance.

All character images and original raster assets remain unchanged. The landing mounts the registered actors in the existing SVG slot and uses their shared visibility-aware acting clock; it introduces no new entrance animation. The role art uses peach, mint and a mint/surface mix. Focus uses the established `--focus` token. Baloo/Nunito, Bangla font support, semantic theme roles and the existing paper surfaces remain the visual baseline.

## Source map and corrections

- `apps/web/app/page.tsx`: role entries, route mapping, existing actor mounts, gravity section and supporting copy.
- `apps/web/app/welcome.css`: desktop/phone composition, equal entry treatment, art wells and preference layout. `.role-art > svg` styles only the outer art viewport so the nested `Actor` SVG retains `overflow="hidden"` and clips its atlas to one pose.
- `apps/web/components/Shell.tsx`: home audience navigation, grouped language/theme preferences and home-only operator footer link.
- `apps/web/lib/strings/en.ts` and `apps/web/lib/i18n/bn.ts`: localized landing content.
- `apps/web/components/UiIcon.tsx`: one revised `UI_PATHS.game` path with controller grips, D-pad and face buttons. The shared 24px rounded stroke family, `currentColor` and decorative SVG semantics remain. Existing consumers in `components/studio/parts.tsx` and `components/studio/Dock.tsx` receive the same path.

Source review corrected an undefined `--focus-ochre` reference to `--focus` and replaced a resting yellow teacher art well with the mint/surface mix. Initial native inspection exposed whole sprite sheets because a descendant SVG rule overrode the actor's clipping; the direct-child selector above is the bounded correction. No raster was created or regenerated, so this change introduces no new image-generation provenance.

## Verification record

The documentation pass checked the surface brief, product/design context, the changed landing/CSS/Shell/icon/string sources, the existing gravity and actor implementations, shared controller consumers, and the detector artifact. The following implementation-session outcomes were supplied by the coordinating agent; this documentation pass did not rerun those suites or independently approve rendered output:

- Web suite: 368 tests passed across 44 files.
- Workspace typecheck/lint: all 30 tasks passed.
- Final production build passed after all source corrections. The rebuilt web container serves all six changed runtime sources with matching SHA-256 hashes; web and API health return HTTP 200. Only web was recreated, using the already validated dependency image; API, builder, gateway and persistent emulators were retained.
- Native desktop English and Bangla, plus a 390 × 844 Bangla viewport, were inspected before the atlas-clipping correction. Those checks discovered the exposed-sheet defect and do not establish a final visual pass.
- The revised controller path was rendered in native Chrome at 16, 24, 32 and 48px and reported recognizable.
- A fresh independent source review found no other material issue. Independent visual approval was withheld because rendered captures were not available to that reviewer.

The inspected `/tmp/just-imagine-landing-detect.json` contains **18 advisory findings**, with no blocking severity: 13 type-ramp differences, four existing gravity tonal colors and one existing gravity control radius. These are the documented incumbent typography/tonal/radius tradeoffs. This localized extension does not refresh the global token frontmatter or `.impeccable/design.json`, and does not resolve their preexisting metadata drift.

**Final confirmation:** Native Safari confirmed the corrected landing at 390 × 844 and 1512 × 844 in Bangla with the Ocean theme: all three role entrances are visible, character atlases clip to a single pose, copy stays readable and the teacher well uses the quiet tint. The phone footer and lower invitation also fit. The earlier English desktop composition and the separate native controller preview were inspected; a final English phone/language-change round was not established because native window focus changed and selector actions were not reliably observed. Chrome's later desktop capture was blank and was discarded, not counted as evidence. Keyboard focus uses the source-reviewed runtime token; native keyboard traversal was not independently established.

Final running web image: `sha256:33ca0ff55f6b38743c4c7663fd5ce2e010ca6b1a451f5387e456f6a631f5b1bd`. Final source corrections were accepted by a fresh reviewer. The generic fresh reviewer and documenter substituted for the skill's named agent types because this harness exposes no agent-type selector; source approval does not imply an independent screenshot verdict.

## Limits and handoff

The native API emitted screenshots in tool output but offered no documented filesystem export in this session; no saved capture files are claimed. The coordinating agent’s final native confirmation remains separate from independent source review and from the earlier observations. No full-page screenshot archive or independent visual approval is claimed. Authentication destinations are existing routes; this landing work does not establish new live identity, school credential, provider or production deployment acceptance. Registered sprite acting retains its existing discrete-pose limits.

The dated welcome section in `apps/web/DESIGN.md` now distinguishes its historical 2026-10-16 composition and checks from the current surface brief. Every other design section, token, palette and the design sidecar remain untouched by this documentation change. No code, artwork, staging or commit operation is part of this documentation handoff.
