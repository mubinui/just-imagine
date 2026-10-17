# DevOps guide

Use this guide for local operations and a reviewed staging/cloud release. Run commands from the repository root unless noted. The repository contains deployment source; it does not prove that any cloud project, trigger, secret, domain or monitoring channel has been configured. Current acceptance limits are in [CHECKPOINT.md](../../CHECKPOINT.md).

## Local development

1. Install Node 22.12+, pnpm 10.34.7 and Docker Desktop/Engine with Compose. Java 21 is needed only for host emulator tests; the local image includes Java.
2. Follow the [quick start](../../README.md#run-locally). Root `.env.local` contains the private server Gemini key/model overrides. Preserve an existing file; never commit credentials.
3. Run `pnpm local:start`, then open http://localhost:3300. This builds one local image and starts web, API, builder, gateway, Auth and Firestore. The fixture preview on 3100 is a different mode.
4. Use `pnpm local:status` and `pnpm local:logs` to inspect it. After changing server key/model values, `pnpm local:reload-key` recreates API/builder/gateway. After source/public web changes, `pnpm local:start` rebuilds the image.
5. Run `pnpm local:stop` to preserve volumes and export emulator data. Keep volumes when retaining accounts, progress and worlds. Restarting or reseeding is not a repair for a failed model request.

No host package installation is needed for `node scripts/local.mjs start`; Docker installs dependencies. Host editing/tests use `pnpm install --frozen-lockfile`.

| Configuration       | Local Docker                                        | Cloud                                                                |
| ------------------- | --------------------------------------------------- | -------------------------------------------------------------------- |
| App origin          | `http://localhost:3300`                             | Exact deployed HTTPS web origin in `WEB_URL`                         |
| Browser API / voice | 3301 / 8788, baked into web image                   | Public API `https://` and gateway `wss://` URLs at web build time    |
| Firebase            | `demo-just-imagine-local`, Auth 9099/Firestore 8080 | Separate staging/production Firebase projects; no emulator variables |
| AI credentials      | Server-only `GEMINI_API_KEY` in root `.env.local`   | Runtime identity with ADC/Vertex permissions                         |
| Jobs / assets       | Local queue and persistent Docker volumes           | Cloud Tasks OIDC and Cloud Storage/CDN                               |
| Test database       | Disposable 8085/9095                                | Dedicated test environment; never a user database                    |

`LOCAL_DEV=1` requires a `demo-` project and both emulator hosts, and refuses Cloud Run. Public `NEXT_PUBLIC_*` values are compiled into the browser; putting a secret there exposes it. Root and standalone web `.env.local` files serve different purposes; see [web configuration](../../apps/web/README.md#configuration).

Model IDs are server settings, not availability guarantees. Check the actual project/provider access and quota before enabling AI. `SCENE_MODEL` and `GAME_MODEL` are distinct from `FAST_MODEL`, image models and `LIVE_MODEL`; programming has strict local validation and no silent model fallback. Current defaults are in [root environment examples](../../.env.example), [Compose](../../compose.local.yaml) and the service entrypoints.

## Checks before release

Use a clean shell without saved-demo emulator overrides. The standard test command runs unit packages and the disposable emulator suite; the latter runs server-core, API, builder and gateway sequentially.

```sh
pnpm install --frozen-lockfile
node --test scripts/local.test.mjs scripts/env-contract.test.mjs
pnpm format:check
pnpm lint
pnpm typecheck
env -u FIRESTORE_EMULATOR_HOST -u FIREBASE_AUTH_EMULATOR_HOST pnpm test
NEXT_PUBLIC_FAKE=1 pnpm build
```

For one targeted backend command, without touching the saved demo:

```sh
node scripts/test-emulators-for.mjs \
  'pnpm --filter @just-imagine/api exec vitest run test/school-assessment.integration.test.ts'
```

Only one emulator runner should own 8085/9095 at a time. Preview Playwright setup is in the [web README](../../apps/web/README.md#checks). CI runs these checks and preview browser tests; passing fixture tests does not establish microphone, model or production acceptance. The builder evaluation workflow also schedules real, billable staging evaluations and supports an opt-in manual run; it requires project/model/WIF configuration.

## Cloud prerequisites

Before applying infrastructure, choose separate staging/production projects, billing, Terraform state backends and operator/build identities. Terraform requires 1.9+ and Google provider 6.x; a remote state backend is not configured in this repository. Keep state, plans and `.tfvars` private.

Review [Terraform](../../infra/terraform/) and its IAM before deployment. It defines Cloud Run API/gateway/builder, service accounts, Artifact Registry, Firestore, public generated-asset storage, queues, deletion retries and optional monitoring/CDN. It does not create the web App Hosting backend, enable Auth sign-in providers, upload secret values or configure release approvals. App Hosting and its runtime identity are an explicit deployment prerequisite. The Terraform source grants the API Vertex access, enables its companion adapters and configures API-self token signing for school login, using a service-account-scoped Token Creator grant. This supports the Admin SDK’s [ADC custom-token signing requirement](https://firebase.google.com/docs/auth/admin/create-custom-tokens); it does not grant permissions to a separate web runtime.

The web runtime does more than serve static files: `/api/session` reads/writes family records and calls Firebase Auth to create a session cookie; server parent pages check revoked cookies. Its actual runtime identity needs Firestore read/write and Auth permissions including `firebaseauth.users.get` and `firebaseauth.users.createSession`. Configure and verify those permissions in the selected project; public Firebase config alone is insufficient. [Firebase documents the Auth permissions](https://firebase.google.com/docs/projects/iam/permissions).

For Firebase App Hosting, select the repository and app root `apps/web`, retaining access to the root pnpm workspace/lockfile. Start from [apphosting.yaml](../../apps/web/apphosting.yaml), set `NEXT_PUBLIC_FAKE=0`, Firebase public config, HTTPS API/WSS gateway URLs at build time, and runtime `WEB_URL`/project settings. Set emulator mode off and omit emulator hosts/`LOCAL_DEV`. Follow the official [monorepo](https://firebase.google.com/docs/app-hosting/monorepos) and [environment configuration](https://firebase.google.com/docs/app-hosting/configure) guides; the exact backend/runtime-IAM setup has not been verified by local Docker builds.

Match API/gateway CORS, Firebase authorized domains, asset CORS and `WEB_URL` to that HTTPS origin. Supply `notification_channels` before expecting alert delivery. Optional CDN requires DNS and a ready certificate. Retain Firestore and Cloud Run deletion protection.

## Build and deploy to staging

These commands deploy resources and can incur costs. Use the reviewed staging project, approved identity and Terraform state. Fill the non-secret settings below; obtain credentials through your normal `gcloud`/ADC setup.

```sh
export PROJECT_ID='your-staging-project'
export TF_VAR_project_id="$PROJECT_ID"
export TF_VAR_web_url='https://your-staging-web-origin'
export TF_VAR_asset_bucket='your-globally-unique-assets-bucket'
terraform -chdir=infra/terraform init
```

For a new project only, the image registry must exist before Cloud Build can publish. Bootstrap the registry/APIs through a reviewed infrastructure plan. A narrowly targeted bootstrap does not deploy application services. This is the one-time registry dependency exception; use a full plan afterward, as described by [Terraform resource targeting guidance](https://developer.hashicorp.com/terraform/tutorials/state/resource-targeting):

```sh
TF_VAR_image=bootstrap-only terraform -chdir=infra/terraform plan \
  -target=google_artifact_registry_repository.images -out=registry.tfplan
terraform -chdir=infra/terraform apply registry.tfplan
```

Use a clean, committed checkout: Cloud Build uploads the working tree, while the tag below names its Git revision. [cloudbuild.yaml](../../cloudbuild.yaml) builds the root **Dockerfile**, not Dockerfile.local, and pushes an image containing all three backend entrypoints. It does not deploy the web or promote production. `COMMIT_SHA` is supplied explicitly for manual submissions, as supported by [Cloud Build](https://docs.cloud.google.com/sdk/gcloud/reference/builds/submit).

```sh
export REVISION="$(git rev-parse HEAD)"
gcloud builds submit . --project "$PROJECT_ID" \
  --config cloudbuild.yaml --substitutions="COMMIT_SHA=$REVISION"
gcloud artifacts docker images describe \
  "us-central1-docker.pkg.dev/$PROJECT_ID/just-imagine/services:$REVISION"
```

Copy the returned immutable `...@sha256:...` image reference, then plan and apply all resources:

```sh
export TF_VAR_image='us-central1-docker.pkg.dev/your-project/just-imagine/services@sha256:YOUR_DIGEST'
terraform -chdir=infra/terraform plan -out=staging.tfplan
terraform -chdir=infra/terraform apply staging.tfplan
pnpm exec firebase deploy --project "$PROJECT_ID" --only firestore:rules,firestore:indexes
```

Confirm actual Cloud Run URLs/audiences against Terraform `service_urls`; verify the task identity can invoke the private builder. Roll out the matching web commit in App Hosting only after its build/runtime configuration is ready.

Keep `enable_billing=false` until Stripe TEST secret versions, webhook endpoint and price ID are configured. The current release rejects live Stripe keys/events. School teacher invites, student PINs and operator claims are separate from parent signup; provision them privately. Use a synthetic staging family/school for consent, voice/end/reconnect, curriculum copy/publish/grade, assets, billing and deletion acceptance. A health response checks process readiness, not model availability or end-to-end generation.

## Promote and roll back

Promote the **same accepted digest** with [cloudbuild.promote.yaml](../../cloudbuild.promote.yaml) through a separately configured, approved production trigger. Its `_IMAGE_DIGEST` input updates API, gateway and builder. Grant cross-project image pull access or copy the identical accepted image. Deploy matching rules/indexes and web commit, and retain the image digest in Terraform configuration to avoid drift. The workflow does not create those triggers or approvals for you.

Record the previously accepted service revisions and web release before deployment. To roll back one backend after reviewing schema compatibility:

```sh
gcloud run services update-traffic imagine-api \
  --project "$PROJECT_ID" --region us-central1 \
  --to-revisions='PREVIOUS_VERIFIED_REVISION=100'
```

Repeat for affected gateway/builder revisions and restore the matching web release. [Cloud Run documents this traffic rollback](https://docs.cloud.google.com/sdk/gcloud/reference/run/services/update-traffic). Do not restore old database documents over current user data. Lesson revisions, historical attempts, jobs and generated-source schemas must remain compatible with the rollback.

## Troubleshooting and incidents

| Symptom                              | First check                                                                                                             |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Local app unavailable                | Docker running, `pnpm local:status`, then `pnpm local:logs`; confirm 3300, not 3100                                     |
| Login/session fails                  | Correct family/school role, matching Firebase project, origin and cookie; cloud web runtime IAM                         |
| AI unavailable / provider timeout    | Private key or ADC, configured model access and quota, safe error category/job phase; never force a failed world ready  |
| Wrong API/gateway endpoint           | Rebuild the web image; public URLs do not change at runtime                                                             |
| No voice / call resumes unexpectedly | Explicit call state, microphone permission, selected speaker and reconnect/end events; health alone does not test Live  |
| Cloud job never dispatches           | `BUILDER_QUEUE=world-builds`, task OIDC service account, builder audience/URL and Cloud Run invoker grant               |
| Deletion pending                     | `deletionJobs`, queue/Scheduler retry logs and authenticated `/internal/deletions`; keep deletion fences while retrying |
| Alerts never arrive                  | Configured Monitoring notification channels and deployment of the observability resources                               |

Use Operator → System to set the audited runtime kill switch when new sessions/builds must stop. Existing sessions may finish. Preserve job IDs, safe error categories and timing for diagnosis; never record keys, tokens, transcripts, child photos or raw PCM in logs/tickets. Do not disable physics, moderation or causal validation to make a failed build appear successful.

Before production launch, obtain actual cloud IAM/URL verification, real model/device/latency and generated-world acceptance, load results, billing/deletion smoke evidence and user usability feedback. Local tests and deployment source do not replace those checks.
