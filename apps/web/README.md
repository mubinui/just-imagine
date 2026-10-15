# Web application

From the repository root:

```sh
pnpm install
NEXT_PUBLIC_FAKE=1 pnpm --filter @just-imagine/web dev --port 3100
# Optional live local conversation script, in another terminal:
pnpm --filter @just-imagine/fixtures dev
```

Open http://localhost:3100/play and tap Ari. The tap unlocks audio before navigation. The four local worlds remain playable if the optional gateway is unavailable; the voice connection state remains visible. Sample profile writes persist in browser localStorage. Gallery worlds and sample data are explicitly previews, and billing is disabled.

For production mode, copy `.env.example` to `.env.local`, set `NEXT_PUBLIC_FAKE=0`, configure Firebase and the API/gateway URLs, and provide Admin ADC (or emulator variables). Public variables are compiled at build time, so rebuild when switching modes. Session cookies use Secure in production and require HTTPS. The parent layout verifies revoked sessions on the server. The session route checks Origin, authentication freshness, parental consent and account deletion locks.

```sh
pnpm --filter @just-imagine/web test
pnpm --filter @just-imagine/web typecheck
pnpm --filter @just-imagine/web lint
NEXT_PUBLIC_FAKE=1 pnpm --filter @just-imagine/web build
NEXT_PUBLIC_FAKE=1 pnpm --filter @just-imagine/web start --port 3100
pnpm --filter @just-imagine/web e2e
```

Browser tests expect the preview server on port 3100 and fixture gateway on 8787. Chromium is required. Screenshots are generated under ignored `test-results/`. Live Firebase, Google OAuth, Stripe, microphone/Safari and deployment integration need credentialed staging verification. Font files are sourced from Google Fonts: Baloo 2 (v23), Nunito (v32), licensed under SIL Open Font License; source URLs and licenses are in `public/fonts/NOTICE.md`.

The Studio's fallback face follows playback amplitude and character emotion. Set `NEXT_PUBLIC_CHARACTER_ASSET_BASE_URL` to switch to the final Rive files (`<characterId>.riv`, `Character` state machine with mouthOpen/emotion/speaking/lookX/lookY inputs). Those authored files are not included; the fallback is shown until configured.
