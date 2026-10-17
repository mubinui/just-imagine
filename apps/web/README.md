# Web application

Next.js app for families (`/play`, `/studio`, `/learn`, `/stories`, `/gallery`, `/parent`), teachers (`/school`), students (`/study`) and operators (`/admin`). Run commands below from the repository root.

For the complete local stack, follow the [root README](../../README.md#run-locally) and open **http://localhost:3300**. Docker uses local Firebase services and the actual API/gateway/builder; it is separate from the preview below.

## Fixture preview

Requires Node 22.12+ and pnpm 10.34.7. It uses sample profiles in browser localStorage, playable authored fixtures and scripted voice controls. It does not use a microphone, billable models, real accounts or payments.

```sh
pnpm install --frozen-lockfile
# Terminal 1
pnpm --filter @just-imagine/fixtures dev
# Terminal 2
NEXT_PUBLIC_FAKE=1 pnpm --filter @just-imagine/web dev --port 3100
```

Open **http://localhost:3100/play** and choose a sample explorer. The fixture gateway listens on 8787. Family preview data is not a seeded school backend; use the full local stack for school workflows.

## Configuration

- Root `.env.local` belongs to the Docker runner and contains **server-only** Gemini settings. Keep it private.
- `apps/web/.env.example` describes standalone Next.js configuration. Copy it to `apps/web/.env.local` only when running this package directly; do not confuse it with root `.env.local`.
- `NEXT_PUBLIC_FAKE=1` selects fixtures. Real mode needs `NEXT_PUBLIC_FAKE=0`, public Firebase settings, and the API and WebSocket gateway URLs.
- `NEXT_PUBLIC_*` values become browser code at build time. Never put Gemini keys, Admin credentials, Stripe keys or student PINs there. Rebuild after changing public settings.
- The Docker web image fixes localhost3300/3301/8788 and emulator mode at build time; runtime variables alone do not retarget it to staging.

Server-rendered parent pages use Admin ADC and revocation-checked session cookies. `/api/session` verifies the origin, recent sign-in, consent and deletion/school-account fences; it creates the family profile and session cookie. A cloud web runtime therefore needs Firestore and Firebase Auth session permissions as well as public Firebase configuration. HTTPS is required for production cookies. See the [deployment guide](../../docs/runbooks/deployment.md#cloud-prerequisites).

## Checks

```sh
pnpm --filter @just-imagine/web test
pnpm --filter @just-imagine/web typecheck
pnpm --filter @just-imagine/web lint
NEXT_PUBLIC_FAKE=1 pnpm --filter @just-imagine/web build
```

For preview browser tests, first install Chromium, then keep the fixture gateway and built preview server running in separate terminals:

```sh
pnpm --filter @just-imagine/web exec playwright install chromium
pnpm --filter @just-imagine/fixtures dev
# Separate terminal, after the preview build above:
NEXT_PUBLIC_FAKE=1 pnpm --filter @just-imagine/web start --port 3100
# Another terminal:
pnpm --filter @just-imagine/web e2e
```

Playwright defaults to `http://127.0.0.1:3100`; `PLAYWRIGHT_BASE_URL` overrides it. Artifacts are ignored under `test-results/`. Preview tests do not establish live microphone, model-generation, OAuth, billing or cloud release acceptance; consult [CHECKPOINT.md](../../CHECKPOINT.md) for those boundaries.

Font licenses and sources are in [public/fonts/NOTICE.md](public/fonts/NOTICE.md). Read [AGENTS.md](AGENTS.md) and the installed Next.js documentation before changing app-router behaviour.
