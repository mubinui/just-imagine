# Non-child web surfaces: landing, auth, parent area, billing, admin, privacy, app shell (judge-panel audit, 2026-10-17)

Evidence base. Screenshots: `SHOTS=/private/tmp/claude-502/-Users-mubinuiislam-Home-Hackathons-just-imagine/7ea1b76e-ae56-4b7f-80de-c9cec5c34ac9/scratchpad/shots/`. These come from an earlier Playwright run against the Docker real build on :3300 (Firebase emulators and a local api on :3301) and the fake-mode `next start` on :3005. The scripts that produced them are `judge-audit.cjs` and `reprobe.cjs` in the scratchpad, and their machine output is in `SHOTS/report-A.json`, `SHOTS/reprobe.json` and `scratchpad/real3-run.log`. Source paths below are relative to the repo root `/Users/mubinuiislam/Home/Hackathons/just-imagine/`.

Labels used in this file:

- **VERIFIED** means I saw it in a screenshot, in captured run output, or in a command I ran today. Today I ran curl against :3300, :3000 and :3005, a secret scan of `apps/web/.next/static`, and a chunk-size probe.
- **READ** means I only read the source.

I did not start or stop any server, and I did not edit any project file.

## Q1. Landing page: does a judge get who, what and why in 10 seconds, with real imagery, a CTA, a demo and trust signals?

### Takeaway

The landing page is tidy, calm and fast, and it has one genuinely good interactive moment: the Earth/Moon gravity drop. It still fails the 10-second test for a Google hackathon judge. It shows none of the product's existing character art, worlds or Bangla UI. It has no demo video, no mention of Gemini, Vertex AI or Google Cloud, no child-safety statement, no pricing and no language toggle. Its only images are abstract SVG circles.

### Cited Findings

- **The hero copy is generic.** It reads "A world of 'what if?'", then "A playful space where your child's imagination meets the wonderful rules of the real world.", then a "Start imagining" CTA, a "Parent sign in" link and "For curious minds, ages 6–13". Nothing says voice, AI characters, building worlds, physics or Gemini. VERIFIED — [shot real-landing-desktop.png](SHOTS/real-landing-desktop.png); [apps/web/app/page.tsx:20-47](apps/web/app/page.tsx); [apps/web/lib/strings/en.ts:28-31,100-105](apps/web/lib/strings/en.ts)
- **There are no product images, video or canvas on the landing page.** The audit reports `imageCount 0, video 0, canvas 0, svg 5`, and its h2s are "Little wonders. Big discoveries." plus three one-line steps. VERIFIED — [SHOTS/report-A.json, page real-landing-desktop metrics](SHOTS/report-A.json)
- **Rich product art exists but is not used on the landing.** The art includes a painted Bangladesh pond world, cute 3D-style animal friends, a mic button and Bangla captions. VERIFIED — [shot real4-world-open-ipad.png](SHOTS/real4-world-open-ipad.png); [shot real-fresh-children-one.png](SHOTS/real-fresh-children-one.png). The 2026-10-16 review already flagged "Abstract shapes, no characters" for the landing — [docs/reviews/2026-10-16-web-direction-check.md §2, §3](docs/reviews/2026-10-16-web-direction-check.md)
- **The gravity toy is the only "try it" element.** It has an Earth/Moon toggle and a "Drop the ball" button, and an e2e test covers it. VERIFIED — [shot real-landing-desktop-moon.png](SHOTS/real-landing-desktop-moon.png); e2e `flows.spec.ts:137` passed in [scratchpad/playwright.log](scratchpad/playwright.log)
- **The main CTA requires an account in the real build.** "Start imagining" goes to `/sign-up` in real mode and to `/play` only in fake mode, so there is no no-account demo path in production. READ — [apps/web/app/page.tsx:23](apps/web/app/page.tsx)
- **No trust strip.** The footer is only the brand mark, "Made for curious minds, together with their grown-ups." and a Privacy link. There is no safety statement, Google Cloud or Gemini credit, contact or terms. VERIFIED — [shot real-landing-desktop.png](SHOTS/real-landing-desktop.png); [apps/web/components/Shell.tsx:39-47](apps/web/components/Shell.tsx)
- **No Bangla toggle on the public pages.** The header has only "Let's play" and "Parent space". Language is chosen per child in parent Settings, and `setLanguage` is called only from `LanguagePreferencesForm` and the ChildForm. VERIFIED — [shot real-landing-desktop.png](SHOTS/real-landing-desktop.png); READ — [apps/web/components/Shell.tsx:19-29](apps/web/components/Shell.tsx), grep of `setLanguage(`
- **Pricing appears nowhere in the UI.** The spec sets Family at USD 9.99 per month with a 7-day trial. READ — [docs/superpowers/specs/2026-10-15-just-imagine-design.md §11](docs/superpowers/specs/2026-10-15-just-imagine-design.md); the only price text is `billingInfo` without a price — [apps/web/lib/strings/en.ts:76-77](apps/web/lib/strings/en.ts)
- **The age claim conflicts across documents.** The landing says "ages 6–13", which matches spec §2. CLAUDE.md says "children aged 6 to 10". VERIFIED — [apps/web/app/page.tsx:44](apps/web/app/page.tsx); [CLAUDE.md:3](CLAUDE.md)
- **Performance is good.** Measured on localhost: LCP 36 ms, CLS 0.001, no horizontal scroll at 390 px. JS is heavy for a marketing page at 16 scripts, 435 KB gzip and 1.44 MB decoded. VERIFIED — [SHOTS/report-A.json](SHOTS/report-A.json)
- **The OG/social image is wrong in two ways.** The `og:image` resolves to `http://localhost:3000/icons/og-mark.png` even when served from :3300, because `metadataBase` is not set; Next prints that warning at start. The image itself is the logo alone, with no name, tagline or product shot. VERIFIED — [SHOTS/report-A.json og metrics](SHOTS/report-A.json); [scratchpad/web-start.log](scratchpad/web-start.log); [apps/web/app/layout.tsx:6-10](apps/web/app/layout.tsx); [apps/web/public/icons/og-mark.png](apps/web/public/icons/og-mark.png)

### Inferences

- A judge's first 10 seconds on this landing page could equally be a meditation app or a generic edtech site. The project's two strongest differentiators are visible only after sign-up: voice-built, physics-true worlds with cute characters, and the Bangla/Bangladesh localisation.
- With the product imagery and a short looping demo clip in the hero, the same page would likely score far higher on the Best UI/UX prize and on "Problem/Impact".

### Gaps

- I did not see the landing in Bangla, because no toggle exists. What a Bangla-stored browser shows depends on the last chosen child's language (READ: [apps/web/components/LanguageRoot.tsx](apps/web/components/LanguageRoot.tsx)).

## Q2. Auth flows: email/Google sign-in, verification, error copy, secrets in the browser

### Takeaway

The server side of auth is solid: session cookies, an origin check, a recent-auth window, revocation checks and server-enforced consent. The client side looks unfinished:

- raw Firebase error codes are shown to parents
- a parental-consent checkbox sits on the sign-in page and blocks Google sign-in for returning parents
- there is no password reset and no email verification
- "Parent sign in" drops the parent into the child picker.

No secrets are in the browser bundle.

### Cited Findings

- **Raw Firebase errors reach the user.** A wrong password shows "Firebase: Error (auth/wrong-password)." and an unknown email shows "Firebase: Error (auth/user-not-found)." in the alert. VERIFIED — [shot reprobe-signin-wrong-password.png](SHOTS/reprobe-signin-wrong-password.png); [SHOTS/reprobe.json wrongPassword/unknownEmail](SHOTS/reprobe.json). The cause is that `uiError` returns `error.message` unchanged in English — [apps/web/lib/i18n/ui.ts:47-50](apps/web/lib/i18n/ui.ts); [apps/web/components/AuthForm.tsx:60-61](apps/web/components/AuthForm.tsx)
- **The sign-in page shows the sign-up consent checkbox.** Google sign-in on `/sign-in` refuses with "Please confirm parental consent to create an account." unless the box is ticked, because the `(signup || !form) && !consent` branch applies to Google on both pages. VERIFIED — [SHOTS/reprobe.json googleAfterPopupClosed](SHOTS/reprobe.json); [apps/web/components/AuthForm.tsx:25-28,87-96](apps/web/components/AuthForm.tsx). The same issue was already listed as defect 11 on 2026-10-16 and is still open — [docs/reviews/2026-10-16-web-direction-check.md §4](docs/reviews/2026-10-16-web-direction-check.md)
- **No password reset and no email verification.** A grep finds no `sendPasswordResetEmail`, no `sendEmailVerification` and no `emailVerified` in web or api, and the form has no "Forgot password?" link. VERIFIED by grep; [shot real-signin-desktop.png](SHOTS/real-signin-desktop.png)
- **"Parent sign in" lands on the child picker.** Sign-in redirects to `/play`, which is "Who's imagining today?", while sign-up goes to `/parent/children`. VERIFIED — [SHOTS/report-A.json probes.parentSignIn = http://localhost:3300/play](SHOTS/report-A.json); [apps/web/components/AuthForm.tsx:59](apps/web/components/AuthForm.tsx)
- **The session route is well hardened.** It enforces a same-origin check, verifies the ID token with revocation, requires `auth_time` within 300 s, requires `consent === true` only when creating the user doc (and stores `consentAt`), refuses sign-in while a deletion lock exists, and sets an httpOnly, SameSite=Lax cookie (Secure in production) for 5 days. READ — [apps/web/app/api/session/route.ts:5-51](apps/web/app/api/session/route.ts). The wrong-origin rejection is VERIFIED as a 403 — [SHOTS/report-A.json probes.sessionWrongOrigin](SHOTS/report-A.json)
- **The session route leaks raw Firebase Admin error text.** A bad token returns 401 with "Decoding Firebase ID token failed. Make sure you passed the entire string JWT…". VERIFIED — [SHOTS/report-A.json probes.sessionBadToken](SHOTS/report-A.json); [apps/web/app/api/session/route.ts:52-55](apps/web/app/api/session/route.ts)
- **The consent copy omits Google Cloud.** It reads "I am a parent or guardian and consent to creating this family account and processing my child's play data as described in the privacy policy." Spec §11 asks for consent "to voice processing by Google Cloud". READ — [apps/web/lib/strings/en.ts:46-47](apps/web/lib/strings/en.ts); [spec §11](docs/superpowers/specs/2026-10-15-just-imagine-design.md)
- **No secrets in the browser.**
  - The client env uses only `NEXT_PUBLIC_FAKE`, `_GATEWAY_URL`, `_API_URL`, `_FIREBASE_*` (API key, auth domain, project id, app id, emulator) and `_CHARACTER_ASSET_BASE_URL`.
  - A grep of `apps/web/.next/static` for `sk_test_`, `sk_live_`, `whsec_`, `PRIVATE KEY`, `STRIPE_SECRET` and `ADMIN_PASSWORD` returned nothing.
  - Stripe keys live only in the api's env schema.

  VERIFIED (command run) — [apps/web/lib/env.ts](apps/web/lib/env.ts); [apps/web/lib/firebase.ts:11-15](apps/web/lib/firebase.ts); [services/api/src/main.ts:25-27](services/api/src/main.ts); [apps/web/apphosting.yaml](apps/web/apphosting.yaml)

- **Silent localhost fallbacks.** The gateway and api URLs fall back to `ws://127.0.0.1:8787` and `http://localhost:8081`, and the Firebase config falls back to `demo-key`/`demo-just-imagine`. A misconfigured production build would quietly point at localhost. READ — [apps/web/lib/env.ts:4-5](apps/web/lib/env.ts); [apps/web/lib/firebase.ts:11-15](apps/web/lib/firebase.ts)

### Inferences

- A judge who mistypes a password sees a developer error string. That one screen undermines "real SaaS" more than any missing feature.
- Parents who use Google sign-in will hit the consent wall on every return visit.

### Gaps

- I could not exercise a real Google popup in headless mode (`googlePopup: "no popup"` in [SHOTS/reprobe.json](SHOTS/reprobe.json)).

## Q3. Parent dashboard and child profiles: real data or fixtures, progress, summaries, goals, controls, the data hard rule

### Takeaway

The parent area runs on real API data and is calm and legible. It has real parental controls: per-child language, captions, Labs gating, session target, story learning goals with "topics to leave out", and real account deletion. It still leaks preview copy ("Sample worlds"), and its brand body font never renders. Its numbers contradict the admin view. The delete dialogs use alarming copy that is wrong for single items. The child-profile data model also goes beyond the "first name, avatar, age band only" hard rule.

### Cited Findings

- **The data is real.** A cold dashboard load makes 7–8 api calls (`/v1/me`, `/v1/usage/today`, and `/v1/children/{id}/worlds|sessions|discoveries`) in 290–500 ms. VERIFIED — [SHOTS/reprobe.json dashboardColdLoad1/2](SHOTS/reprobe.json); [apps/web/components/ParentPanels.tsx:46-70](apps/web/components/ParentPanels.tsx)
- **Dashboard content.** It shows minutes of voice today against the cap, a 7-day bar chart, loops completed, concepts discovered, child rows, Discovery cards, saved worlds with delete buttons, and session summaries. VERIFIED — [shot real-parent-dashboard-desktop-fold.png](SHOTS/real-parent-dashboard-desktop-fold.png); [shot real-fresh-dashboard-empty.png](SHOTS/real-fresh-dashboard-empty.png)
- **"Sample worlds" appears on the real build.** The world-count stat is labelled with the preview string, even in a fresh real account. VERIFIED — [shot real-fresh-dashboard-empty.png](SHOTS/real-fresh-dashboard-empty.png); [apps/web/lib/strings/en.ts:140 `worldSaved: 'Sample worlds'`](apps/web/lib/strings/en.ts); [apps/web/components/ParentPanels.tsx:157](apps/web/components/ParentPanels.tsx). This was flagged on 2026-10-16 (defect 9) and is still open — [docs/reviews/2026-10-16-web-direction-check.md](docs/reviews/2026-10-16-web-direction-check.md)
- **The brand body font never renders for Latin text.** Measured faces: "Nunito" text renders in **Helvetica (system)** (89 glyph runs on the landing, 50 on the picker), and non-800-weight "Baloo" renders in **Times (system)**. This affects "Earth", the child name "Ari", and the dashboard stat labels "Minutes of voice today"/"Sample worlds", which are visibly serif. VERIFIED — [scratchpad/real3-run.log landingFonts/pickerFonts](scratchpad/real3-run.log); [shot real-parent-dashboard-desktop-fold.png](SHOTS/real-parent-dashboard-desktop-fold.png); [shot real-gallery-signedin-desktop.png](SHOTS/real-gallery-signedin-desktop.png). The root cause is in [apps/web/lib/i18n/fonts.css:73-86](apps/web/lib/i18n/fonts.css):
  - That file redeclares the families `Baloo` (400–800) and `Nunito` (400–700) with Bengali-only files and a Bengali `unicode-range`. Those faces win weight matching, or come later in source order, over [apps/web/app/globals.css:1-12](apps/web/app/globals.css).
  - The globals declare `Baloo` at weight 800 only and Nunito as a TTF.
  - Latin glyphs therefore fall through to the generic fallback, which is Times because of `font: 16px Nunito` with no fallback at [globals.css:957-958](apps/web/app/globals.css) and `font-family: Baloo` at [globals.css:963](apps/web/app/globals.css).
- **The numbers contradict each other.**
  - The parent chart shows **81 minutes** on Friday for a family whose daily cap is 60 minutes.
  - The admin Overview shows **21 voice minutes** on Fri 16 Oct across all families.

  At least one metric is wrong. The parent chart sums `session.voiceSeconds`, while admin reads usage counters. VERIFIED — [shot real-parent-dashboard-desktop-fold.png](SHOTS/real-parent-dashboard-desktop-fold.png); [shot real-admin-overview-desktop.png](SHOTS/real-admin-overview-desktop.png); READ — [apps/web/components/ParentPanels.tsx:107-120](apps/web/components/ParentPanels.tsx)

- **Wrong, alarming copy on single-item deletes.** The same confirm dialog body, "This removes child profiles, worlds, discoveries and session records. This cannot be undone.", is shown when deleting one world or one child. READ — [apps/web/components/ParentPanels.tsx:410-425](apps/web/components/ParentPanels.tsx) (`<p>{s.dangerInfo}</p>` for every kind); text VERIFIED in the dialog — [SHOTS/reprobe.json deleteDialog](SHOTS/reprobe.json)
- **Account deletion is real but undersold.** `POST /v1/me/delete` enqueues a deletion job that ends with `adminAuth().deleteUser(uid)`. The UI calls it "Delete family data" and never says the account itself is closed. READ — [services/api/src/app.ts:294-300](services/api/src/app.ts); [services/api/src/deletion.ts:105](services/api/src/deletion.ts); [apps/web/lib/strings/en.ts:72-75](apps/web/lib/strings/en.ts)
- **No data export.** A grep of ParentPanels and api routes finds no export or download path. READ.
- **Child form fields.** The form has first name (max 30), age band, avatar (a raw enum shown as "fox"), language, learning mode (Playgrounds/Labs), "Allow Labs for younger children" and session target (8–20). A separate "play friend" block offers preset characters or "Make a chibi from a photo". VERIFIED — [shot real-fresh-children-one.png](SHOTS/real-fresh-children-one.png); [apps/web/components/ParentPanels.tsx:445-575](apps/web/components/ParentPanels.tsx)
- **The child doc stores more than first name, avatar and age band.** `ChildDocSchema` holds firstName, avatar, `companion`, ageBand, tier, labsUnlocked, captions, language, points, `storyPreferences`, pets, sessionTargetMinutes, loopsCompleted and createdAt. `companion` can be `kind:'chibi'` with an inline base64 WebP of up to 180 KB, generated by Gemini from a **photo of the child**; `storyPreferences` is parent free text. The photo UI says "We send it to Gemini to draw a cartoon, then keep only the generated artwork in your child's profile." READ — [packages/protocol/src/firestore.ts:39-56](packages/protocol/src/firestore.ts); [packages/protocol/src/characters.ts:134-146](packages/protocol/src/characters.ts); VERIFIED UI copy — [SHOTS/reprobe.json chibiUi](SHOTS/reprobe.json); [shot reprobe-chibi-photo-ui.png](SHOTS/reprobe-chibi-photo-ui.png). The CLAUDE.md hard rule is "Child profiles hold a first name, an avatar choice, and an age band only" — [CLAUDE.md](CLAUDE.md); spec §12.
- **Character naming is incoherent.**
  - CLAUDE.md describes the cast as "Pip the kitten, Bolt the puppy, Luna the cat".
  - The parent UI offers personalities Mishti, Bhombol and Chandni.
  - The "Friend's name" field defaults to "Pip" while the selected puppy is labelled "Bhombol".
  - Settings mentions "Katha, their storytelling friend".

  VERIFIED — [shot real-fresh-children-one.png](SHOTS/real-fresh-children-one.png); [shot real-fresh-settings.png](SHOTS/real-fresh-settings.png); [CLAUDE.md:3](CLAUDE.md)

- **Real parental controls exist.** Settings has a language per child, captions per child, "What would you like them to learn?", "Topics to leave out (optional)", story length, and the note "science and health stories are learning material, not personal advice". VERIFIED — [shot real-fresh-settings.png](SHOTS/real-fresh-settings.png)
- **Systematic missing-space bugs.** Examples: "2 completed learning loops ·3 concepts discovered" (parent), and "0 of15 min", "0 of3 worlds", "Last 7 days:0 voice min,0 worlds", "Page1", "World builds in the last 30 days:25 finished" and "·3 aged 8–10" (admin). The cause is JSX line breaks between `{uiText(...)}` expressions, which JSX collapses. VERIFIED — [shot real-admin-family-drawer-desktop.png](SHOTS/real-admin-family-drawer-desktop.png); [shot real-admin-overview-desktop.png](SHOTS/real-admin-overview-desktop.png); READ — [apps/web/components/admin/FamilyDrawer.tsx:32-33](apps/web/components/admin/FamilyDrawer.tsx); [apps/web/components/ParentPanels.tsx:208-212](apps/web/components/ParentPanels.tsx)
- **The loader never clears on error.** Any load error shows the error and "Opening your family space…" together indefinitely, because `!data` keeps the loader. The admin-cookie case shows "Complete parent sign-up first." plus the stuck loader. VERIFIED — [shot real-admin-cookie-on-parent-dashboard.png](SHOTS/real-admin-cookie-on-parent-dashboard.png); READ — [apps/web/components/ParentPanels.tsx:128-136](apps/web/components/ParentPanels.tsx)
- **Empty and plan-limit states are weak.** An empty "My worlds" section renders as a bare heading with no empty-state text. A free plan at "1 / 1 children" shows no upsell. VERIFIED — [shot real-fresh-dashboard-empty.png](SHOTS/real-fresh-dashboard-empty.png); [shot real-fresh-children-one.png](SHOTS/real-fresh-children-one.png)
- **Layout shift.** Parent pages measure CLS 0.088–0.14, above the 0.1 "good" line, as the loader is replaced by content. VERIFIED — [SHOTS/report-A.json](SHOTS/report-A.json)
- **Themes are not applied fully.** Under the terracotta theme the active nav pill keeps its green tint and the usage progress bar stays green, while headings, bars and the logo change. VERIFIED — [shot theme-terracotta-parent-dashboard-fold.png](SHOTS/theme-terracotta-parent-dashboard-fold.png)

### Inferences

- A child-safety judge will ask "you send children's photos to an AI?". The hard-rule wording in the team's own docs contradicts the shipped data model. The team should either re-word the rule to "…plus an optional generated companion image, never the photo" and surface that in privacy, or make the photo flow opt-in behind an explicit second consent. The consent checkbox already exists; the policy page is the gap.
- "Sample worlds", the serif fallback and the missing spaces are each small. Together they read as "not finished" on the one surface a parent judge will open.

### Gaps

- I did not verify whether any session summary contains child utterances. Summaries are stored per spec. `WorldDoc.creation.originalWish` and `changes` store the child's wish text up to 4000 characters ([packages/protocol/src/firestore.ts:74-78](packages/protocol/src/firestore.ts)). Whether that counts as a "transcript" under the hard rule is a policy question for the platform researcher.

## Q4. Billing: what happens on checkout, and is it presented like a real SaaS?

### Takeaway

Stripe Checkout, Customer Portal and webhooks are implemented in the api. In the real Docker build Stripe is not configured, so "Explore Family" returns 503 "Billing is not configured yet." The page also shows an upgrade CTA to a family that is already on Family, raw camelCase quota keys, and no price.

### Cited Findings

- **Checkout fails in the real build.** Clicking "Explore Family" sends `POST /v1/billing/checkout` and gets **503**. After about 500 ms the alert reads "Billing is not configured yet.". `real-parent-billing-checkout-error.png` was captured mid-request: the button is disabled and the alert has not yet rendered. `reprobe-billing-after-click.png` shows the alert. VERIFIED — [SHOTS/reprobe.json checkoutClick/checkoutNet](SHOTS/reprobe.json); [shot real-parent-billing-checkout-error.png](SHOTS/real-parent-billing-checkout-error.png); [shot reprobe-billing-after-click.png](SHOTS/reprobe-billing-after-click.png); READ — [services/api/src/app.ts:301-305](services/api/src/app.ts)
- **Stripe exists but has to be configured.** It turns on only when `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` and `STRIPE_PRICE_ID` are all set. READ — [services/api/src/main.ts:25-40](services/api/src/main.ts); [services/api/src/billing.ts](services/api/src/billing.ts)
- **The upgrade CTA ignores the current plan.** "Your plan: Family" sits above an enabled "Explore Family" button, because the button never checks `data.user.plan`. VERIFIED — [shot reprobe-billing-after-click.png](SHOTS/reprobe-billing-after-click.png); READ — [apps/web/components/ParentPanels.tsx:310-336](apps/web/components/ParentPanels.tsx)
- **Quota keys are shown raw.** The allowance table prints "Voice Seconds Per Day 3600", "Images Per World 16" and "Saved Worlds 200", generated by `key.replace(/([A-Z])/g, ' $1')`. VERIFIED — [shot real-parent-billing-checkout-error.png](SHOTS/real-parent-billing-checkout-error.png); READ — [apps/web/components/ParentPanels.tsx:318-323](apps/web/components/ParentPanels.tsx)
- **No price, trial or test-mode badge.** Spec §11 sets Family at USD 9.99 per month with a 7-day trial in Stripe test mode. READ — [spec §11](docs/superpowers/specs/2026-10-15-just-imagine-design.md)
- **Fake mode is labelled honestly.** It disables both buttons and shows "Billing is unavailable in the local preview. No payment has been taken." READ — [apps/web/lib/strings/en.ts:78](apps/web/lib/strings/en.ts)

### Inferences

- If the demo or judge build goes out without Stripe test keys, the business-case slide ("Family $9.99") has no working counterpart in the product. Configuring test keys plus a visible "Test mode — use 4242…" note would turn this from a P0 into a strength.

### Gaps

- I did not test the webhook path or the Customer Portal; Stripe is unconfigured locally.

## Q5. Admin console: capabilities, server-side gating, child-data exposure, theme leakage

### Takeaway

The admin console is the most "real SaaS" surface in the app. It shows:

- live KPIs and an estimated model cost (with a caveat)
- family search with an audited comp/reset/suspend/delete flow
- a kill switch and a model-id table
- an audit log
- theme publishing.

It is gated server-side by a verified session cookie with revocation checks plus an `admin` custom claim, and child names are never shown. In the demo build it advertises its own gaps: services "Not configured", a pack catalogue "not connected to the api yet", no smoke runs, and every world tagged "images rejected".

### Cited Findings

- **Gating is server-side.** The console layout calls `adminGate()`, which runs `verifySessionCookie(cookie, true)` and then `isAdmin`. A signed-out user is redirected to `/admin/sign-in` and a non-admin to `/`. The operator session route refuses non-admin tokens with "This account is not an operator account.", requires `auth_time` within 300 s, uses a SameSite=Strict 8-hour cookie, and runs `robots: noindex`. READ — [apps/web/app/admin/(console)/layout.tsx](<apps/web/app/admin/(console)/layout.tsx>); [apps/web/app/admin/_lib/session.ts](apps/web/app/admin/_lib/session.ts); [apps/web/app/admin/session/route.ts](apps/web/app/admin/session/route.ts); [apps/web/app/admin/layout.tsx](apps/web/app/admin/layout.tsx). VERIFIED that the parent is refused — [shot real-admin-signin-parent-refused.png](SHOTS/real-admin-signin-parent-refused.png) — and that a parent cookie on `/admin` lands on the landing page — [shot real-parent-cookie-on-admin.png](SHOTS/real-parent-cookie-on-admin.png), same bytes as real-landing-desktop.png.
- **Parent and admin share one cookie.** Both use the cookie name `__session`, and `getParentSession` accepts any valid session, so an operator cookie passes the parent-area gate. The parent UI then shows "Complete parent sign-up first." alongside a stuck "Opening your family space…". Signing into admin also signs the browser out of the parent area. VERIFIED — [shot real-admin-cookie-on-parent-dashboard.png](SHOTS/real-admin-cookie-on-parent-dashboard.png); READ — [apps/web/lib/session.ts](apps/web/lib/session.ts); [apps/web/app/(parent)/layout.tsx:5](<apps/web/app/(parent)/layout.tsx>)
- **Overview.**
  - Families: 3; explorer profiles: 3, split by age band.
  - Paying, comped and free plan counts.
  - Today/7-day/30-day sessions, voice minutes, worlds built, images generated, moderation blocks and estimated model cost ($0.72 today, $6.07 over 30 days).
  - A cost footnote: "Compare it with the Cloud Billing export before acting on it."

  VERIFIED — [shot real-admin-overview-desktop.png](SHOTS/real-admin-overview-desktop.png)

- **Family drawer.** It shows plan, status, explorers as "1 aged 8–10" with no names, billing state, usage against limits, a reason field "Recorded in the audit log", and comp/reset/suspend/delete buttons that stay disabled until a reason is entered. VERIFIED — [shot real-admin-family-drawer-desktop.png](SHOTS/real-admin-family-drawer-desktop.png). This matches the quality spec §9b privacy rule — [docs/superpowers/specs/2026-10-16-quality-program-design.md §9b](docs/superpowers/specs/2026-10-16-quality-program-design.md)
- **Safety page reads as a disaster.** Moderation log: "No moderation events recorded." All 13 "Worlds to review" carry "N images rejected", and the Family column shows a raw uid. The label actually maps `world.failedAssets`, which are asset failures and not necessarily safety rejections, to "images rejected". VERIFIED — [shot real-admin-safety-desktop.png](SHOTS/real-admin-safety-desktop.png); READ — [apps/web/components/admin/SafetyPanel.tsx:15](apps/web/components/admin/SafetyPanel.tsx)
- **System page shows services unconfigured.** The kill switch works ("Generation running", plus reason). The services table shows api Healthy but builder and gateway "Not configured" / "Not reported", the deploy shows "Local build" / "Commit Not recorded", and model ids match CLAUDE.md. VERIFIED — [shot real-admin-system-desktop.png](SHOTS/real-admin-system-desktop.png)
- **Content page is mostly empty.** It shows "The pack catalogue is not connected to the api yet.", "No smoke runs recorded." and "No library assets recorded.". Its saved-world count (17 total, 1 failed) also disagrees with the Overview (25 finished, 2 failed builds). VERIFIED — [shot real-admin-content-desktop.png](SHOTS/real-admin-content-desktop.png); [shot real-admin-overview-desktop.png](SHOTS/real-admin-overview-desktop.png)
- **Audit log.** It records who, action, target, before→after and reason. The target column wraps mid-word ("system appearan ce"). VERIFIED — [shot real-admin-audit-desktop.png](SHOTS/real-admin-audit-desktop.png)
- **Appearance and theme scope.** There are three palettes (Forest Live, Ocean, Terracotta) with a live preview, plus the note "Character art and learning worlds keep their original colours." The provider fetches `/v1/appearance` every 30 s and on focus, and swaps CSS variables, favicon, manifest, apple icon and theme colour. The palette therefore applies to the child UI too, by design, but not to character or world art. VERIFIED — [shot real-admin-appearance-desktop.png](SHOTS/real-admin-appearance-desktop.png); [shot theme-ocean-landing-fold.png](SHOTS/theme-ocean-landing-fold.png); READ — [apps/web/components/AppearanceProvider.tsx](apps/web/components/AppearanceProvider.tsx); [apps/web/lib/appearance.ts:14-40](apps/web/lib/appearance.ts). The preview card writes "Just Imagine." in title case while the brand everywhere else is "just imagine.".
- **Admin e2e is skipped in the default run.** `e2e/admin.spec.ts` needs env credentials, and the last full Playwright run had 3 skipped and 3 failed (Studio and companion flows, outside this scope). VERIFIED — [scratchpad/playwright.log](scratchpad/playwright.log); READ — [apps/web/e2e/admin.spec.ts:19,47](apps/web/e2e/admin.spec.ts)

### Inferences

- In front of judges, the admin console is a strong "this is a business" proof (cost per day, kill switch, audit trail). But only if `ADMIN_HEALTH_TARGETS` is set and Safety's "images rejected" label is fixed or explained. As it stands, a judge sees 2 of 3 services "Not configured" and image failures on every world.

### Gaps

- I did not exercise the comp, suspend or delete writes. The audit log shows only theme changes.

## Q6. Privacy page: consistent with the code, or boilerplate?

### Takeaway

The privacy page is trust-breaking for a children's product. It is one paragraph that ends with internal draft text: "This local preview stores sample data only in this browser. Production policies and service configuration must be reviewed before release.", and that text is shown on the real build. It never mentions:

- Vertex AI, us-central1 or Google Cloud
- transcripts being discarded at session end
- retention periods
- a contact, an operator identity, COPPA or GDPR-K, or a date.

### Cited Findings

- **The real build shows draft text.** The rendered body names stored data (parent account details, child first names and age bands, saved worlds, discoveries, session summaries), says "Child audio is processed for live conversation and is not stored by this application", says deletion is available in Settings, and then gives the local-preview and "must be reviewed before release" sentences. VERIFIED — [shot real-privacy-desktop.png](SHOTS/real-privacy-desktop.png); [apps/web/lib/strings/en.ts:97-98](apps/web/lib/strings/en.ts); [apps/web/app/privacy/page.tsx:12-13](apps/web/app/privacy/page.tsx)
- **Photo section.** It says metadata is stripped, the original is not saved, and the generated art is stored and removed with the profile. It then adds "Processing by Gemini is subject to the selected provider service and its data terms", which is vague and names neither Vertex AI nor a region. VERIFIED — [shot real-privacy-desktop.png](SHOTS/real-privacy-desktop.png); [apps/web/app/privacy/page.tsx:14-19](apps/web/app/privacy/page.tsx)
- **The code's guarantees are missing from the page.** The page omits "transcripts live only in gateway memory and are discarded at session end", Vertex AI in us-central1 with ADC, "data stays in US regions", "Firestore rules deny all client writes" and the strict safety settings. The page does say "the companion is an AI play friend". READ — [CLAUDE.md Hard rules](CLAUDE.md); [spec §12](docs/superpowers/specs/2026-10-15-just-imagine-design.md)
- **The page states its data list too narrowly.** It lists "child first names and age bands" but not avatar or companion art, language, story preferences, points, pets or world wish text, all of which the schema stores. READ — [packages/protocol/src/firestore.ts:39-56,74-78](packages/protocol/src/firestore.ts)
- **The admin Safety page makes a stronger claim than the public policy.** It says "Transcripts are never stored or shown." VERIFIED — [shot real-admin-safety-desktop.png](SHOTS/real-admin-safety-desktop.png)

### Inferences

- The product's real privacy engineering is good: no audio storage, transcripts in memory only, a moderation log without words, admin without child names, and real deletion. The page undersells it and reads as a draft. This is the cheapest high-impact fix in the web app.

### Gaps

- I did not check whether a terms page or contact email exists anywhere. No route exists under `apps/web/app` besides `/privacy`, which I confirmed with a directory listing.

## Q7. App shell, config, security headers, performance and test coverage

### Takeaway

The shell is minimal:

- the 404 and error pages are a bare heading
- there are no security headers or CSP at all, and `X-Powered-By: Next.js` is sent
- there is no metadataBase, robots.txt, sitemap or service worker, although the manifest declares a standalone PWA
- JS is about 1.4 MB decoded on every page.

Unit tests are green, but parent e2e runs only in fake mode and admin e2e is skipped.

### Cited Findings

- **No security headers or CSP.** Headers today on :3300, :3000 and :3005 include only `X-Powered-By: Next.js`, with no CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy or COOP/COEP. There is no `headers()` in `next.config.ts` and no middleware or proxy file. VERIFIED (curl today); [apps/web/next.config.ts](apps/web/next.config.ts)
- **Bare 404 page.** It shows "Let's try that again" plus a "Home" link: no "page not found" wording, no header, footer or illustration. The error page uses the same title. VERIFIED — [shot real-404-desktop.png](SHOTS/real-404-desktop.png); READ — [apps/web/app/not-found.tsx](apps/web/app/not-found.tsx); [apps/web/app/error.tsx](apps/web/app/error.tsx)
- **Manifests work, but there is no service worker.** `/manifest.json` and `/theme-manifest?theme=ocean&lang=bn` return valid manifests, including Bangla names, while `/robots.txt`, `/sitemap.xml` and `/sw.js` return 404. VERIFIED — [SHOTS/report-A.json probes](SHOTS/report-A.json); [apps/web/app/theme-manifest/route.ts](apps/web/app/theme-manifest/route.ts)
- **Viewport.** It is `width=device-width, initial-scale=1`, with theme colour #245e4e. There is no horizontal scroll at 390 px or 1440 px on any audited page. VERIFIED — [SHOTS/report-A.json](SHOTS/report-A.json)
- **Root layout gaps.** The root layout hard-codes `<html lang="en">`, and `LanguageRoot` swaps the language after hydration, so Bangla users get English server HTML first. Metadata has no `metadataBase`. READ — [apps/web/app/layout.tsx](apps/web/app/layout.tsx); [apps/web/components/LanguageRoot.tsx:7-19](apps/web/components/LanguageRoot.tsx)
- **JS weight.** The landing loads 16 scripts at about 435 KB gzip and 1.44 MB decoded. Sign-in loads 1.38 MB decoded, the parent pages 1.53 MB and even the 404 page 720 KB. The `.next/static` output totals 5.1 MB, and its largest chunk is 1.79 MB. VERIFIED — [SHOTS/report-A.json](SHOTS/report-A.json); `du`/`ls` run today on `apps/web/.next/static`
- **The fake preview on :3005 is broken right now.** Its HTML references `/_next/static/chunks/17bc1kf39fw-_.css`, which returns **500**. `apps/web/.next` was rebuilt at 16:50, after that server started (`BUILD_ID` mtime), which is why `fake-*` screenshots are unstyled and `fake-admin` shows the error page. This is an environment artifact, not a code bug, but anyone demoing from that server sees an unstyled site. VERIFIED (curl today) — [shot fake-landing-desktop.png](SHOTS/fake-landing-desktop.png); [shot fake-admin.png](SHOTS/fake-admin.png)
- **Tests.** Web unit tests: 28 files and 238 tests pass. VERIFIED — [scratchpad/unit-web.log](scratchpad/unit-web.log).
  - The only parent or auth coverage is `session.test.ts` (5 tests) and `admin-format.test.ts` (10). READ — [apps/web/test](apps/web/test)
  - The e2e parent test runs against fake mode (`flows.spec.ts:35`). Admin e2e needs credentials and is skipped by default.
  - The last Playwright run ended with 11 passed, 3 failed and 3 skipped. VERIFIED — [scratchpad/playwright.log](scratchpad/playwright.log)
  - No e2e covers real sign-up, sign-in errors, billing or deletion.

### Inferences

- On a panel where Technical carries 40%, a children's SaaS with no CSP and no frame-ancestors is an easy point for a security-minded judge. Adding a header block in `next.config.ts` is low effort and visible to anyone running curl or securityheaders.com.

### Gaps

- I did not test COOP/COEP needs. They would matter only if SharedArrayBuffer is used in the Studio, which is outside this scope.

## Q8. Overall: severity-ranked findings, screenshot index, strengths, and verdict

### Takeaway

The parent and admin surfaces have real substance: live data, real deletion, audited operator tools and good session security. They are wrapped in a landing page that hides the product, a privacy page that reads as a draft, broken typography, developer error strings and an unconfigured billing step. Today they signal "strong prototype". About a day of focused polish would make them signal a real SaaS.

### Cited Findings

**P0: demo-breaking or trust-breaking**

1. **The privacy page shows draft text in the real build.** It says "This local preview stores sample data only in this browser. Production policies… must be reviewed before release." and has no Vertex, region, transcript-discard, retention or contact information, on a product for children. VERIFIED — [shot real-privacy-desktop.png](SHOTS/real-privacy-desktop.png); [apps/web/lib/strings/en.ts:97-98](apps/web/lib/strings/en.ts)
2. **The upgrade fails in the real build.** `POST /v1/billing/checkout` returns 503 "Billing is not configured yet."; the CTA appears for a family already on Family; no price is shown anywhere. VERIFIED — [shot reprobe-billing-after-click.png](SHOTS/reprobe-billing-after-click.png); [SHOTS/reprobe.json](SHOTS/reprobe.json); [apps/web/components/ParentPanels.tsx:310-336](apps/web/components/ParentPanels.tsx)
3. **The landing page does not show the product.** It has zero images, characters, video, Gemini or Google Cloud mention, safety statement, pricing or Bangla toggle; the only visual is abstract SVG circles. VERIFIED — [shot real-landing-desktop.png](SHOTS/real-landing-desktop.png); [SHOTS/report-A.json](SHOTS/report-A.json)

**P1** 4. **The brand font never renders.** Nunito falls back to Helvetica and weights 400–700 of Baloo fall back to Times across landing, picker and parent pages. The cause is the Bengali-only `Baloo`/`Nunito` @font-face redeclarations at [apps/web/lib/i18n/fonts.css:73-86](apps/web/lib/i18n/fonts.css), combined with [globals.css:1-12,957-963](apps/web/app/globals.css). VERIFIED — [scratchpad/real3-run.log](scratchpad/real3-run.log); [shot real-parent-dashboard-desktop-fold.png](SHOTS/real-parent-dashboard-desktop-fold.png) 5. **Raw Firebase errors in auth**, such as "Firebase: Error (auth/wrong-password).". VERIFIED — [shot reprobe-signin-wrong-password.png](SHOTS/reprobe-signin-wrong-password.png); [apps/web/lib/i18n/ui.ts:49-50](apps/web/lib/i18n/ui.ts) 6. **Sign-in flow defects:**

- the consent checkbox appears on sign-in and blocks returning Google users (VERIFIED)
- there is no password reset or email verification (READ)
- "Parent sign in" lands on the child picker `/play` (VERIFIED)

[apps/web/components/AuthForm.tsx:25,59,87-96](apps/web/components/AuthForm.tsx) 7. **"Sample worlds" label on the real parent dashboard**, still open after the 2026-10-16 review. VERIFIED — [shot real-fresh-dashboard-empty.png](SHOTS/real-fresh-dashboard-empty.png); [apps/web/lib/strings/en.ts:140](apps/web/lib/strings/en.ts) 8. **Contradictory metrics:** the parent chart shows 81 min on Friday against a 60-min cap, while admin shows 21 voice minutes on Friday across all families. VERIFIED — [shot real-parent-dashboard-desktop-fold.png](SHOTS/real-parent-dashboard-desktop-fold.png); [shot real-admin-overview-desktop.png](SHOTS/real-admin-overview-desktop.png) 9. **The delete-one-world or delete-one-child dialog says it removes "child profiles, worlds, discoveries and session records".** READ — [apps/web/components/ParentPanels.tsx:410-425](apps/web/components/ParentPanels.tsx); VERIFIED text — [SHOTS/reprobe.json](SHOTS/reprobe.json) 10. **The parent and admin share one `__session` cookie**, and any load failure leaves the error and "Opening your family space…" on screen together. VERIFIED — [shot real-admin-cookie-on-parent-dashboard.png](SHOTS/real-admin-cookie-on-parent-dashboard.png); [apps/web/lib/session.ts](apps/web/lib/session.ts); [apps/web/components/ParentPanels.tsx:128-136](apps/web/components/ParentPanels.tsx) 11. **The child data model exceeds the stated hard rule.** It stores a Gemini chibi generated from a child photo, story free text, language and pets, and the privacy page does not disclose this precisely. READ — [packages/protocol/src/firestore.ts:39-56](packages/protocol/src/firestore.ts); [packages/protocol/src/characters.ts:134-146](packages/protocol/src/characters.ts) 12. **The admin demo build looks unfinished:** - builder and gateway "Not configured" - "pack catalogue is not connected to the api yet" - "No smoke runs" and "No library assets" - Safety labels asset failures as "images rejected" on 13 of 13 worlds.

    VERIFIED — [shot real-admin-system-desktop.png](SHOTS/real-admin-system-desktop.png); [shot real-admin-content-desktop.png](SHOTS/real-admin-content-desktop.png); [shot real-admin-safety-desktop.png](SHOTS/real-admin-safety-desktop.png); [apps/web/components/admin/SafetyPanel.tsx:15](apps/web/components/admin/SafetyPanel.tsx)

13. **No security headers or CSP**, and `X-Powered-By` is sent. VERIFIED (curl) — [apps/web/next.config.ts](apps/web/next.config.ts) 14. **The billing allowance shows raw keys**, such as "Voice Seconds Per Day 3600". VERIFIED — [shot real-parent-billing-checkout-error.png](SHOTS/real-parent-billing-checkout-error.png) 15. **Systematic missing spaces:** "0 of15 min", "Page1", "loops ·3", "days:0". VERIFIED — [shot real-admin-family-drawer-desktop.png](SHOTS/real-admin-family-drawer-desktop.png); [apps/web/components/admin/FamilyDrawer.tsx:32-33](apps/web/components/admin/FamilyDrawer.tsx) 16. **Character naming is incoherent:** CLAUDE.md says Pip, Bolt and Luna; the UI says Mishti, Bhombol and Chandni; the friend name defaults to "Pip" on the puppy; the avatar select shows the raw "fox". VERIFIED — [shot real-fresh-children-one.png](SHOTS/real-fresh-children-one.png)

**P2** 17. **Missing `metadataBase`**, so `og:image` points at `http://localhost:3000/...`, and the OG image is the logo only. VERIFIED — [SHOTS/report-A.json](SHOTS/report-A.json); [scratchpad/web-start.log](scratchpad/web-start.log) 18. **The 404 page has no "not found" message and no navigation.** VERIFIED — [shot real-404-desktop.png](SHOTS/real-404-desktop.png) 19. **Missing web basics:** no robots.txt, sitemap or service worker despite a "standalone" manifest. VERIFIED — [SHOTS/report-A.json probes](SHOTS/report-A.json) 20. **JS weight:** about 1.4–1.5 MB decoded on every page, including 720 KB on the 404; parent pages have CLS up to 0.14. VERIFIED — [SHOTS/report-A.json](SHOTS/report-A.json) 21. **Theme leak:** the terracotta theme leaves the nav pill and progress bar green. VERIFIED — [shot theme-terracotta-parent-dashboard-fold.png](SHOTS/theme-terracotta-parent-dashboard-fold.png) 22. **`/api/session` returns raw Firebase Admin error text.** VERIFIED — [SHOTS/report-A.json probes.sessionBadToken](SHOTS/report-A.json) 23. **Env fallbacks silently target localhost or demo Firebase.** READ — [apps/web/lib/env.ts](apps/web/lib/env.ts); [apps/web/lib/firebase.ts](apps/web/lib/firebase.ts) 24. **Admin presentation nits:** "1 images rejected" pluralisation, a raw uid in the Family column, and the audit target wrapping as "appearan ce". VERIFIED — [shot real-admin-safety-desktop.png](SHOTS/real-admin-safety-desktop.png); [shot real-admin-audit-desktop.png](SHOTS/real-admin-audit-desktop.png) 25. **"Delete family data" closes the whole Firebase account without saying so; there is no data export.** READ — [services/api/src/deletion.ts:105](services/api/src/deletion.ts) 26. **Bangla is never visible on public pages.** There is no toggle, and server HTML is always English. READ — [apps/web/app/layout.tsx:14](apps/web/app/layout.tsx) 27. **The age range conflicts:** the landing says "ages 6–13" (matching spec §2) and CLAUDE.md says 6–10. VERIFIED — [apps/web/app/page.tsx:44](apps/web/app/page.tsx); [CLAUDE.md:3](CLAUDE.md) 28. **The fake preview on :3005 serves CSS as 500** because it is stale after the 16:50 rebuild; restart it before any demo. VERIFIED (curl today) 29. **Parent and admin flows have little real-mode e2e coverage**: admin specs are skipped and parent specs run fake-only. VERIFIED — [scratchpad/playwright.log](scratchpad/playwright.log)

**Screenshot index** (all under `SHOTS/`)

Landing:

- `real-landing-desktop.png` and `-fold` — calm, tidy hero with the gravity toy; no product imagery or trust strip; serif "Earth".
- `real-landing-desktop-moon.png` — Moon toggle works; this is the landing's one interactive moment.
- `real-landing-mobile(-fold).png`, `-phone`, `-ipad(-sm)`, `-laptop` — responsive with no overflow; the nav wraps under the logo on phone.
- `real-landing-signedin-desktop.png`, `real-admin-cookie-landing.png`, `real-parent-cookie-on-admin(-families).png` — identical to the landing, which confirms that a non-admin hitting `/admin` is silently redirected to `/`.

Auth:

- `real-signin-desktop.png`, `-mobile`, `-ipad` — clean form, but the sign-up consent box is on sign-in and there is no "forgot password".
- `real-signin-error.png` and `reprobe-signin-wrong-password.png` — raw "Firebase: Error (auth/wrong-password)." (P1).
- `real-signup-desktop.png`, `-mobile`, `real-signup-validation.png` — sign-up with consent; browser-native validation only.
- `real-parent-unauth-redirect.png`, `real-studio-unauthed.png` — unauthenticated users are redirected to sign-in (correct).

Parent area:

- `real-parent-dashboard-desktop(-fold).png`, `-mobile(-fold)` — real data, 7-day chart, but "Sample worlds", serif stat labels, 81 minutes over a 60-minute cap, "·3" spacing.
- `real-fresh-dashboard-empty(-fold).png` — empty state is OK; "My worlds" has no empty copy; "Sample worlds 0".
- `real-fresh-children-empty.png`, `real-fresh-children-one.png`, `real-parent-children-desktop/mobile.png` — rich child form and companion picker; raw "fox"; "Pip" default name on Bhombol.
- `reprobe-chibi-photo-ui.png` — photo-to-Gemini chibi flow with parental permission checkbox (trust-sensitive).
- `real-fresh-settings.png`, `real-parent-settings-desktop/mobile.png` — strong parental controls (language, captions, learning goals, topics to leave out); deletion.
- `reprobe-delete-family-dialog.png` — confirm dialog; the same copy is reused for deleting a single world (P1).
- `real-admin-cookie-on-parent-dashboard.png` — operator cookie on the parent area: "Complete parent sign-up first." plus a stuck "Opening your family space…" (P1).
- `reprobe-dashboard-loaded-full.png` — full loaded dashboard.

Billing:

- `real-fresh-billing.png`, `real-parent-billing-desktop/mobile.png` — plan page with raw quota keys and no price.
- `real-parent-billing-checkout-error.png` — captured mid-request (button disabled, alert not yet shown).
- `reprobe-billing-after-click.png` — "Billing is not configured yet." (P0).

Admin:

- `real-admin-signin-desktop.png`, `real-admin-unauth-redirect.png` — operator sign-in; unauthenticated `/admin` is redirected there.
- `real-admin-signin-parent-refused.png` — "This account is not an operator account." (good).
- `real-admin-overview-desktop(-fold).png`, `-mobile` — strong KPI and cost view; spacing bugs.
- `real-admin-families-desktop/mobile.png`, `real-admin-family-drawer-desktop.png` — search, audited actions, no child names (good); "0 of15 min".
- `real-admin-safety-desktop.png` — empty moderation log; every world shows "images rejected" (P1 perception).
- `real-admin-content-desktop.png` — three of four sections empty or "not connected yet".
- `real-admin-system-desktop.png`, `-mobile` — kill switch and model ids are good; builder and gateway "Not configured".
- `real-admin-appearance-desktop/mobile.png` — polished theme picker with live preview.
- `real-admin-audit-desktop.png` — clear audit trail; the target column wraps mid-word.

Themes:

- `theme-ocean-*.png`, `theme-terracotta-*.png` — palettes apply to landing, sign-in and parent pages; the nav pill and progress bar stay green.

Privacy and 404:

- `real-privacy-desktop.png`, `-mobile` — draft "local preview… must be reviewed before release" text (P0).
- `real-404-desktop.png`, `-mobile` — bare "Let's try that again" (P2).

Fake mode (:3005):

- `fake-landing-desktop.png`, `fake-signin-desktop.png`, `fake-parent-dashboard-desktop.png`, `fake-parent-billing-desktop.png`, `fake-admin.png` — unstyled because the stale server returns 500 for CSS; the `fake-admin` error page is the same cause. Environment, not code.

Gallery:

- `real-gallery-signedin-desktop.png` — without a chosen child, the gallery redirects to the picker; child name "Ari" renders in Times.

**What is genuinely strong**

- **Admin console**:
  - live KPIs with a per-day model-cost estimate and an honest caveat
  - audited writes that require a reason
  - a kill switch and a model-id table
  - no child names, per spec §9b
  - server-side claim gating with revocation checks
  - parents refused at operator sign-in.

  VERIFIED — [shot real-admin-overview-desktop.png](SHOTS/real-admin-overview-desktop.png); [shot real-admin-family-drawer-desktop.png](SHOTS/real-admin-family-drawer-desktop.png); [apps/web/app/admin/_lib/session.ts](apps/web/app/admin/_lib/session.ts)

- **Session security**: origin check, a 300 s recent-auth window, revocation checks, httpOnly cookies, server-side consent with `consentAt`, a deletion lock, and no secrets in the client bundle. READ, plus a VERIFIED scan — [apps/web/app/api/session/route.ts](apps/web/app/api/session/route.ts)
- **Real parent data and real controls**: per-child language, captions, Labs gating, session target, story learning goals with "topics to leave out", and a full account deletion that also removes the auth user. VERIFIED — [shot real-fresh-settings.png](SHOTS/real-fresh-settings.png); [SHOTS/reprobe.json](SHOTS/reprobe.json)
- **Runtime theming published from admin**, which also swaps favicon, manifest and theme colour, plus a Bangla PWA manifest. VERIFIED — [shot real-admin-appearance-desktop.png](SHOTS/real-admin-appearance-desktop.png); [SHOTS/report-A.json probes.themeManifestBn](SHOTS/report-A.json)
- **Landing performance and responsiveness**: LCP 36 ms locally, no overflow at 390 px, and the interactive gravity demo. VERIFIED — [SHOTS/report-A.json](SHOTS/report-A.json)
- **Visual tone**: the calm cream and green parent area with consistent headings and good contrast (body text measured at 5.82:1). VERIFIED — [scratchpad/real3-run.log landingContrast](scratchpad/real3-run.log)

### Inferences

- **Verdict.** Against the rubric (Technical 40%, Problem/Impact 25%, Innovation 25%, UX 10%, plus a Best UI/UX prize), these surfaces carry real technical weight: admin, sessions and deletion would impress a technical judge who digs in. But the first-60-second impression is "polished template":
  - The landing never shows the voice-built worlds, the characters or the Bangla localisation.
  - The parent dashboard says "Sample worlds" in a fallback serif.
  - A wrong password prints a Firebase error code.
  - The upgrade button errors.
  - The privacy page admits it is a draft.

  None of these is deep, and all are fixable in about a day. As it stands, the non-child web reads as a strong prototype, not a winner-level SaaS. For the business-case slide, the missing price and the broken checkout are the biggest liability.

- **The three upgrades that would most change a judge's score:**
  1. **Rebuild the landing hero around the real product.** Use the cast art and a 10–20 s looping capture of a child's wish becoming the painted pond world (the asset already exists, as `real4-world-open-ipad.png` shows). Add an EN/বাংলা toggle, a three-badge trust strip ("Gemini Live on Vertex AI, Google Cloud us-central1", "No audio stored, transcripts discarded", "Parent-controlled"), and a pricing card (Free vs Family $9.99, 7-day trial). This moves Problem/Impact, Innovation and the UI/UX prize at once.
  2. **A trust and polish pass on copy and type.**
     - Rewrite `/privacy` to match the code: retention, Vertex region, the photo-chibi flow, deletion, a contact and a date; remove the "local preview" sentence.
     - Fix the Nunito/Baloo @font-face collision.
     - Map Firebase errors to human copy, and add password reset.
     - Remove the consent box from sign-in.
     - Rename "Sample worlds", fix the JSX spacing bugs, and use per-kind delete copy.
     - Add a security-headers block (CSP, frame-ancestors, HSTS, Referrer-Policy) in `next.config.ts`.
  3. **Make the business loop work live.**
     - Configure Stripe test keys and the webhook in the demo stack.
     - Show the price and a "Test mode: use card 4242…" note, and hide the upgrade button on Family.
     - Present the allowance as "60 voice minutes a day".
     - Set `ADMIN_HEALTH_TARGETS` and fix the Safety "images rejected" label so the operator console shows green health and a coherent safety story.

### Gaps

- I did not run Lighthouse or axe. The accessibility evidence is limited to the contrast and target-size data already in `report-A.json` and `real3-run.log`.
- I did not see the admin console on a tablet in landscape; there are only desktop and mobile shots.
- I could not observe the rendered wording of `uiError` in Bangla for auth errors, because no Bangla auth run was captured.
