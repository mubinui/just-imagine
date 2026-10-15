# A3 Web implementation report

Implemented `apps/web` from the preserved partial A3 plan and approved design brief. No deployment, commits, push, external hosting, payment or credentialed cloud calls were made.

## Delivered source

- Next.js App Router with registry-confirmed Next 16.4.1 and React 19.3.1; workspace transpilation and server-only Admin boundaries.
- Landing/privacy, email and Google parent auth, explicit parental consent before signup/Google OAuth, Firebase emulators, authenticated parent layout, and browser Firebase child guard.
- Session POST validates Origin, revoked ID token, authentication within five minutes, explicit consent for first user document, and deletion lock inside a transaction. Cookies are HttpOnly, SameSite=Lax and Secure in production. DELETE checks Origin and clears the cookie. Admin code is absent from browser bundles (searched optimized static chunks for Admin/credential identifiers).
- Profile picker unlocks audio synchronously on its tap before navigation. Studio reuses the voice singleton, connects afterward, and keeps its WorldSource subscription independent of socket status. Voice reconnect identity/backoff lives in the characters package. The browser test exercises the actual AudioContext, socket and WebGL renderer.
- Firestore WorldSource validates WorldDocSchema. Preview selects all four progressive fixture worlds, strips invalid remote fixture assets to explicit geometry placeholders, and uses bound timer wrappers (the shared FakeWorldSource default native timer invocation raised Illegal invocation in Chrome).
- Studio implements engine canvas, pointer simulation events, prediction answers, discoveries, captions, age-filtered cast switching, gravity/material/wind choices, server spell/variable/challenge messages, sliders and numeric keypad clamping, lab entity actions, challenge banners, quota display, reconnect/error state and end screen. Lab visual tools are rendered by the engine from the scene specification.
- Gallery opens existing worlds; parent dashboard aggregates family worlds/sessions/discoveries, children supports create/update/delete with limits and session targets, settings updates captions and confirms family deletion, billing uses API checkout/portal and explicitly disables payments in preview. All REST contract routes have a real API transport; child/account/world preview mutations persist locally.
- Warm cream/green theme, locally hosted licensed Baloo/Nunito fonts, 64px child/44px parent targets, focus indicators, focus-trapped Escape-dismissable dialogs, reduced-motion CSS and responsive desktop/mobile layouts. Product/design documentation and local run instructions are in the app. Rive/illustration assets are visibly placeholders.

## Verification

- `pnpm --filter @just-imagine/web test`: 12 tests pass. Four helper boundary tests, three persistence/limit/deletion/billing tests, five session security tests.
- `pnpm --filter @just-imagine/web lint`: passes.
- `pnpm --filter @just-imagine/web typecheck`: passes; also typechecked as part of both builds.
- `NEXT_PUBLIC_FAKE=1 pnpm --filter @just-imagine/web build`: optimized build passes.
- `NEXT_PUBLIC_FAKE=0 pnpm --filter @just-imagine/web build`: optimized build passes; parent routes correctly appear dynamic behind cookies.
- `pnpm --filter @just-imagine/web e2e`: four Playwright tests pass against the optimized preview app and fixture gateway: profile gesture/audio/voice/canvas/prediction/dial/lab keypad/end, parent persistent CRUD/confirmation/billing, five mobile route overflow checks/no child free text, and session Origin rejection. No browser page errors on the Studio flow.
- Reviewed actual desktop landing/Studio/parent and mobile landing/parent screenshots. Captures are generated under ignored `apps/web/test-results`. Fixed mobile parent grid overflow and dial accessible naming found in those checks.
- Next dev generated `apps/web/AGENTS.md`; its local framework guide was read for dev-origin behavior. Added allowedDevOrigins for localhost/127.0.0.1 because Next 16.4 blocks mismatched dev HMR origins and stalls hydration.
- Final source-only correction after those checks: real-mode landing secondary action goes to parent sign-in rather than claiming a local preview. Main agent is running workspace-wide final checks.

## Processes and integration notes

All web-owned processes were stopped: Next on 3100 and fixture gateway on 8787. Port 3000 was already occupied before this work and was not touched. The final `.next` build was generated in real mode; rebuild with `NEXT_PUBLIC_FAKE=1` for a preview production server. Run instructions: `apps/web/README.md`.

With parent authorization, engine index/renderer relative `.js` imports were changed to extensionless imports so Next can consume workspace TypeScript source. No other engine changes were made by this task.

## Remaining release gates / limits

- No credentialed Firebase/Google OAuth/Firestore/real API/Stripe/Live model integration has been exercised from the browser. Session verification is mocked unit-tested plus real HTTP Origin rejection; it is not a claim of a full emulator auth browser run.
- No iOS Safari or real microphone verification, child usability session, load/performance budget audit, or production deployment.
- Rive animation files and final painterly character/world artwork are absent. Code-native character presentation and physical geometry are clearly labelled previews. These are functional source placeholders, not finished production art.
- The loopback fixture gateway contains a jelly-dragon conversation script; the web's other three local worlds use their own progressive WorldSource scripts and playable physics. Preview ignores conflicting server world IDs so selecting a different local world remains stable. Live mode accepts gateway world IDs normally.
- Dashboard currently presents session/discovery records and usage meters without a weekly chart; quota UI displays gateway remaining seconds rather than estimating client-side billable time. Engine-side correctness/performance gates remain owned by the engine review task.
- Impeccable context was provided by the parent and its craft guidance was read; review/documentation here is a bounded local visual pass, not an independent production design sign-off.
