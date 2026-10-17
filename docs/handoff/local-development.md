# Running the complete local app

Use **http://localhost:3300** for the Docker app. It runs the real application services with local Firebase Auth/Firestore, local task delivery and persistent Docker volumes. The separate preview on 3100 uses fixtures.

## Start and sign in

Follow [the root quick start](../../README.md#run-locally). Root `.env.local` holds the server-only Gemini key and model overrides; never copy its values into public docs, screenshots or `NEXT_PUBLIC_*` variables.

```sh
pnpm local:start
pnpm local:status
pnpm local:logs
pnpm local:reload-key
pnpm local:stop
```

Without host pnpm dependencies, use `node scripts/local.mjs start` (or `status`, `logs`, `reload-key`, `stop`). Docker Desktop/Engine with Compose must be running. `stop` preserves the volumes and gives the emulator time to export its data. Do not remove the volumes when keeping accounts and worlds.

Create your own local parent through `/sign-up`, give consent and add an explorer. Children use a parent-owned profile; they do not need an email/password. Existing operators may have saved private local credentials in ignored `.env.*` files. Ask the operator for access; shared passwords and PINs are intentionally omitted here.

For voice, start a call from a tap and permit microphone access on localhost. Typed/fixture tests do not establish microphone quality. Use the visible End call control to stop the conversation. A ready-made friend works without a photo; optional generated companion art needs model access.

## Separate school and operator setup

Use distinct accounts for family, teacher and operator roles. Teachers accept invitations; students sign in with school code, username and PIN, without entering the family signup flow.

The optional seed creates a demo school, two classes, thirty students and seven bilingual lessons. Supply a private `SCHOOL_DEMO_PASSWORD` of at least 12 characters when first creating its teacher. Read it into the process environment from a private operator file or secret prompt; do not paste it into shared commands. With host dependencies installed:

```sh
GOOGLE_CLOUD_PROJECT=demo-just-imagine-local \
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
SCHOOL_PIN_OUTPUT="$PWD/.env.school-pins.json" \
node scripts/seed-schools.mjs
```

The PIN sheet is owner-readable and ignored by Git; distribute it privately. A normal rerun preserves existing roster, PINs and credentials. Lesson refresh is an explicit content migration, not a routine restart; review revision history and existing attempts before using `--refresh-lessons`. Seeding a real project requires explicit `--staging` and separate approval from its operator.

To grant admin to an existing, separate local operator account:

```sh
GOOGLE_CLOUD_PROJECT=demo-just-imagine-local \
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
node scripts/grant-admin.mjs '<operator-email>'
```

For a new emulator-only operator identity, add `--create --password "$OPERATOR_PASSWORD"` after setting that environment variable privately. Sign in again to receive the claim. Use `/admin/sign-in`; do not grant it to an existing family or teacher identity. The script's real-project `--yes` flag is a deliberate administrative action, not part of local startup.

## Services and persistence

| Service          | Local endpoint                 |
| ---------------- | ------------------------------ |
| Web              | http://localhost:3300          |
| API              | http://localhost:3301/health   |
| Builder/artwork  | http://localhost:3302/health   |
| Voice gateway    | ws://localhost:8788            |
| Firestore / Auth | 127.0.0.1:8080 /127.0.0.1:9099 |

Published ports bind to 127.0.0.1. Firebase imports/exports `/data/firebase/snapshot` in its volume; generated world artwork uses a second volume. The local adapter requires `LOCAL_DEV=1`, a `demo-` project, both emulator hosts and no Cloud Run `K_SERVICE`. Cloud deployments use ADC, Cloud Tasks and Cloud Storage instead.

Do not run tests against this saved database. [The test runners](../runbooks/deployment.md#checks-before-release) use disposable emulators on 8085/9095.

## Acceptance limits

Earlier named checks verified family signup/sign-in, profile saving, Live audio/captions, generated companion art, and individual scene/image adapters. School runtime checks and later assessment/publication regressions have separate evidence. Those results do not certify every new generated game.

The latest end-to-end generated-world report records five genuine creation failures before artwork/publication. A successful provider probe or existing authored game is not a successful fresh Studio creation. The strict gameplay/physics gates remain enabled. Read [CHECKPOINT.md](../../CHECKPOINT.md), [school runtime evidence](school-runtime-acceptance.md) and [generated-world evidence](generated-world-runtime-acceptance.md) for current results.

Stripe requires separate TEST configuration. Cloud deployment, real-device latency, photo likeness and release acceptance remain distinct from local operation. Operational steps and troubleshooting are in the [DevOps guide](../runbooks/deployment.md).
