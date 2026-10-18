# Deploying Just Imagine on Google Cloud

A complete, ordered guide for deploying Just Imagine to a Google Cloud staging project, then promoting the same build to production. It lists every credential, where it comes from and where it goes, and every configuration value each component reads, then how to run, operate and test the system. Only payments are optional: every other part, including email and Google sign-in, student sign-in, voice, world building and schools, must be set up for a release. Follow the steps in order; every command runs from the repository root unless a step says otherwise.

The source files are the final word if anything here disagrees with them: [`infra/terraform/`](../../infra/terraform/), [`cloudbuild.yaml`](../../cloudbuild.yaml), [`cloudbuild.promote.yaml`](../../cloudbuild.promote.yaml), [`apps/web/apphosting.yaml`](../../apps/web/apphosting.yaml), the service entrypoints in `services/*/src/main.ts` and [`apps/web/lib/env.ts`](../../apps/web/lib/env.ts). [deployment.md](deployment.md) is the shorter reference.

> **Cost and safety.** These steps create billable resources: Cloud Run, Vertex AI, Firestore, Cloud Storage, Cloud Tasks, Cloud Scheduler and Monitoring. Use a dedicated staging project first. Never put a secret in a `NEXT_PUBLIC_*` variable, an `apphosting*.yaml` file, a committed `.tfvars` file, a ticket or a log.

## What you are deploying

| Piece                               | Runs on                                                     | Created by                        |
| ----------------------------------- | ----------------------------------------------------------- | --------------------------------- |
| Web app (Next.js, `apps/web`)       | Firebase App Hosting                                        | You, in step 8                    |
| `imagine-api`                       | Cloud Run, public                                           | Terraform                         |
| `imagine-gateway` (voice WebSocket) | Cloud Run, public, at least 1 instance, session affinity    | Terraform                         |
| `imagine-builder` (world builder)   | Cloud Run, private, invoked only by Cloud Tasks             | Terraform                         |
| Database                            | Firestore Native, `(default)`, location `nam5`              | Terraform                         |
| Generated assets                    | Cloud Storage bucket, public read, optional Cloud CDN       | Terraform                         |
| Job queues                          | Cloud Tasks `world-builds` and `deletions`                  | Terraform                         |
| Deletion retries                    | Cloud Scheduler job `imagine-retry-deletions`, every 5 min  | Terraform                         |
| AI models                           | Vertex AI, `us-central1` (the game model on `global`)       | Terraform enables the API         |
| Stripe secrets                      | Secret Manager `stripe-secret-key`, `stripe-webhook-secret` | Terraform creates, you add values |
| Alerts, dashboard, uptime checks    | Cloud Monitoring                                            | Terraform                         |
| Sign-in                             | Firebase Authentication (email/password and Google)         | You, in step 3                    |

The three backend services share **one container image** built from the root [`Dockerfile`](../../Dockerfile); Cloud Run starts `services/<name>/dist/main.js` for each. Everything runs in `us-central1`. Each service signs in to Google as its own service account through Application Default Credentials: **there are no API keys anywhere in the cloud**, including for Gemini.

The order matters because of three dependencies:

1. Cloud Build needs the Artifact Registry repository before it can push the image.
2. Terraform needs the image digest and the web app's final HTTPS address (for CORS and origin checks).
3. The web build needs the API and gateway URLs, because `NEXT_PUBLIC_*` values are compiled into the browser bundle.

Cloud Run and App Hosting addresses are predictable, so you choose the names up front (step 1) and every later step can use them.

## Deploy from `main` only

- **`main` is the production source.** Build images, Terraform plans and App Hosting rollouts from `main`, at a commit whose CI run is green.
- **Never deploy the `demo` branch.** It is `main` plus the static GitHub Pages UI demo.
- **Sample mode never ships.** `NEXT_PUBLIC_FAKE=1` serves sample worlds with no sign-in, voice or payments. A production web build in sample mode fails on purpose unless `JUST_IMAGINE_SAMPLE_BUILD=1` is also set, and only CI and the demo build set that. The shared `apphosting.yaml` sets `NEXT_PUBLIC_FAKE=0`.

## Before you start

**Tools on your machine**

| Tool             | Version            | Check                          |
| ---------------- | ------------------ | ------------------------------ |
| Git              | any recent         | `git --version`                |
| Google Cloud CLI | current            | `gcloud --version`             |
| Terraform        | 1.9 or later       | `terraform -version`           |
| Node.js          | 22.12 or later     | `node --version`               |
| pnpm             | 10.34.7            | `pnpm --version`               |
| Firebase CLI     | from the workspace | `pnpm exec firebase --version` |

Get the code and dependencies:

```sh
git clone https://github.com/mubinui/just-imagine.git
cd just-imagine
git switch main
pnpm install --frozen-lockfile
```

**Access you need**

| For                                 | You need                                                                                                                                                   |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Creating the projects               | A billing account you can link, and permission to create projects (or an empty project you own)                                                            |
| Running Terraform and the CLI steps | **Owner** on the staging project, or the equivalent admin roles for every resource in the table above, including Project IAM Admin and Service Usage Admin |
| App Hosting's GitHub connection     | Admin on the `mubinui/just-imagine` GitHub repository                                                                                                      |
| Stripe (optional)                   | An account on the Stripe Dashboard, in **test mode**                                                                                                       |
| AI                                  | Vertex AI access and quota for every configured model in this project (see the model table below)                                                          |

**Decisions to make first**

- Two separate projects: one for staging, one for production. Never share a database between them.
- The App Hosting backend ID (for example `web`). It fixes the web address.
- A globally unique name for the assets bucket.
- Whether you will use a custom domain for the web app or for assets (both optional).

**Check the release first.** Deploy only a commit whose checks pass:

```sh
node --test scripts/local.test.mjs scripts/env-contract.test.mjs
pnpm format:check
pnpm lint
pnpm typecheck
env -u FIRESTORE_EMULATOR_HOST -u FIREBASE_AUTH_EMULATOR_HOST pnpm test
NEXT_PUBLIC_FAKE=1 JUST_IMAGINE_SAMPLE_BUILD=1 pnpm build
```

The last line builds sample mode for the browser tests only; it is never what you deploy. The `ci` workflow on `main` runs the same checks plus the browser suite. A green run is the minimum bar; it does not prove microphone, model or production behaviour.

## Credentials: what they are and where to get them

Every credential the deployment uses, in the order you meet it. "Secret" means it must never be committed, logged or put in a `NEXT_PUBLIC_*` value.

| Credential                                                                                                                      | What it is                                              | Where you get it                                                                                           | Where it goes                                                         | Secret?                                                    |
| ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------- |
| Your Google account                                                                                                             | Runs `gcloud`, Terraform and the admin scripts          | `gcloud auth login`, then `gcloud auth application-default login` (step 1)                                 | Your machine only                                                     | Yes                                                        |
| Firebase CLI login                                                                                                              | Runs `firebase` commands                                | `pnpm exec firebase login` (step 2)                                                                        | Your machine only                                                     | Yes                                                        |
| Billing account ID                                                                                                              | Links billing to the project                            | `gcloud billing accounts list`                                                                             | `gcloud billing projects link` (step 1)                               | No                                                         |
| Project number                                                                                                                  | Part of every Cloud Run address                         | `gcloud projects describe` (step 1)                                                                        | Derived URLs, tfvars                                                  | No                                                         |
| Firebase web config: `apiKey`, `authDomain`, `projectId`, `appId`                                                               | Identifies the project to the browser for sign-in       | `firebase apps:sdkconfig WEB` (step 3), or Firebase console → Project settings → Your apps                 | `apps/web/apphosting.<env>.yaml` as `NEXT_PUBLIC_FIREBASE_*` (step 8) | No, public by design; restrict it to your domains (step 3) |
| Service accounts `imagine-api`, `imagine-gateway`, `imagine-builder`, `imagine-tasks`                                           | Each service's own Google identity                      | Created by Terraform (step 6)                                                                              | Attached to Cloud Run, Cloud Tasks and Scheduler by Terraform         | No key files exist; never create one                       |
| App Hosting runtime identity `firebase-app-hosting-compute@<project>.iam.gserviceaccount.com`                                   | The web server's Google identity                        | Created by App Hosting (step 8)                                                                            | You grant it two roles (step 8c)                                      | No key files                                               |
| Vertex AI (Gemini) access                                                                                                       | All voice, world, image and text models                 | Granted to the service accounts by Terraform (`roles/aiplatform.user`); model access and quota per project | Nothing to copy: ADC                                                  | Never set `GEMINI_API_KEY` in the cloud                    |
| Teacher invite link                                                                                                             | Lets a teacher create their account and join a school   | Operator console → Schools → the school → Invite (step 9)                                                  | Sent to the teacher by you                                            | Treat as private; it expires                               |
| Student school code, username and PIN                                                                                           | How a student signs in; there is no student email       | Teacher console → Students (step 9)                                                                        | Given to the student                                                  | Yes for the PIN                                            |
| Stripe secret key `sk_test_…` (optional)                                                                                        | Creates checkout and billing-portal sessions            | Stripe Dashboard, test mode → Developers → API keys → Secret key                                           | Secret Manager `stripe-secret-key` (step 10)                          | **Yes**                                                    |
| Stripe webhook signing secret `whsec_…` (optional)                                                                              | Verifies Stripe's webhook calls                         | Stripe Dashboard, test mode → Developers → Webhooks → your endpoint → Signing secret                       | Secret Manager `stripe-webhook-secret` (step 10)                      | **Yes**                                                    |
| Stripe price ID `price_…` (optional)                                                                                            | The Family plan's subscription price                    | Stripe Dashboard, test mode → Product catalog → your product → Pricing                                     | `stripe_price_id` in tfvars (step 10)                                 | No                                                         |
| Monitoring channel ID                                                                                                           | Where alerts go                                         | `gcloud beta monitoring channels list` (step 10)                                                           | `notification_channels` in tfvars                                     | No                                                         |
| GitHub variables for nightly evaluations: `GCP_PROJECT_ID`, `SCENE_MODEL`, `FAST_MODEL`, `WIF_PROVIDER`, `EVAL_SERVICE_ACCOUNT` | Let GitHub Actions call staging Vertex AI without a key | Commands in step 10                                                                                        | GitHub → Settings → Environments → `staging` → Variables              | No; Workload Identity Federation replaces keys             |

Payments are optional. Without Stripe, parents can take the Family plan **without payment** (on by default, `subscriptions_without_payment`), so a release does not need any Stripe value. The only secrets that live in the cloud are the two Stripe values, and only in Secret Manager, and only once you turn real billing on. The release accepts **test-mode Stripe keys only**: the API refuses a key that does not start with `sk_test_` and rejects live-mode webhook events.

## Configuration reference

### Terraform variables (`infra/terraform/<env>.tfvars`)

| Variable                        | Required            | Value                                                                 | Notes                                                                                                                    |
| ------------------------------- | ------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `project_id`                    | Yes                 | The environment's project ID                                          |                                                                                                                          |
| `web_url`                       | Yes                 | The web app's exact HTTPS origin, no trailing slash                   | Equal to `WEB_URL` from step 1. Drives CORS, origin checks, Stripe redirects, invite links and the web uptime check      |
| `asset_bucket`                  | Yes                 | A globally unique bucket name                                         | Terraform creates the bucket                                                                                             |
| `image`                         | Yes                 | `us-central1-docker.pkg.dev/<project>/just-imagine/services@sha256:…` | Passed with `-var` at plan time (step 6c); always a digest, never a tag                                                  |
| `enable_billing`                | No, default `false` | `true` only after the Stripe secrets exist                            | Adds the two Stripe secrets to the API                                                                                   |
| `subscriptions_without_payment` | No, default `true`  | `true` or `false`                                                     | While billing is off, parents can start and stop the Family plan without paying. Ignored when `enable_billing` is `true` |
| `stripe_price_id`               | No, default `""`    | `price_…` from Stripe test mode                                       |                                                                                                                          |
| `notification_channels`         | No, default `[]`    | Monitoring channel resource names                                     | Alerts are silent until set                                                                                              |
| `asset_domain`                  | No, default `""`    | A hostname you control, for example `assets.example.org`              | Turns on Cloud CDN with a managed certificate                                                                            |
| `models`                        | No                  | Map of model settings                                                 | Defaults below. Every key in this map is passed to all three services as an environment variable                         |

### Backend services (Cloud Run, set by Terraform)

You do not type these; Terraform sets them from the tfvars. Check them after step 6 with `gcloud run services describe imagine-<name> --region us-central1 --format=yaml(spec.template.spec.containers[0].env)`.

| Variable                                                              | api | gateway | builder | Value                                                                           |
| --------------------------------------------------------------------- | :-: | :-----: | :-----: | ------------------------------------------------------------------------------- |
| `GOOGLE_CLOUD_PROJECT`                                                |  ✓  |    ✓    |    ✓    | `project_id`                                                                    |
| `WEB_URL`                                                             |  ✓  |    ✓    |    ✓    | `web_url`                                                                       |
| `BUILDER_URL`                                                         |  ✓  |    ✓    |    ✓    | `https://imagine-builder-<project-number>.us-central1.run.app`                  |
| `BUILDER_AUDIENCE`                                                    |  ✓  |    ✓    |    ✓    | Same as `BUILDER_URL`; the builder checks Cloud Tasks tokens against it         |
| `API_AUDIENCE`                                                        |  ✓  |    ✓    |    ✓    | `https://imagine-api-<project-number>.us-central1.run.app`                      |
| `TASK_SERVICE_ACCOUNT`                                                |  ✓  |    ✓    |    ✓    | `imagine-tasks@<project>.iam.gserviceaccount.com`                               |
| `ASSET_BUCKET`                                                        |  ✓  |    ✓    |    ✓    | `asset_bucket`                                                                  |
| `ASSET_BASE_URL`                                                      |  ✓  |    ✓    |    ✓    | `https://storage.googleapis.com/<bucket>`, or `https://<asset_domain>` with CDN |
| `STRIPE_PRICE_ID`                                                     |  ✓  |    ✓    |    ✓    | `stripe_price_id`                                                               |
| `OTEL_ENABLED`                                                        |  ✓  |    ✓    |    ✓    | `1` (Cloud Trace)                                                               |
| `LIVE_MODEL`, `FAST_MODEL`, `SCENE_MODEL`, `HERO_MODEL`, `PROP_MODEL` |  ✓  |    ✓    |    ✓    | From `models`                                                                   |
| `COMPANION_VERTEX`                                                    |  ✓  |         |         | `1`: companion text and portraits use Vertex AI                                 |
| `ADMIN_HEALTH_TARGETS`                                                |  ✓  |         |         | Builder and gateway addresses for the operator System page                      |
| `SUBSCRIPTIONS_WITHOUT_PAYMENT`                                       |  ✓  |         |         | `1` when `subscriptions_without_payment` is on and billing is off, else `0`     |
| `STRIPE_SECRET_KEY`                                                   |  ✓  |         |         | Secret Manager `stripe-secret-key`, only when `enable_billing = true`           |
| `STRIPE_WEBHOOK_SECRET`                                               |  ✓  |         |         | Secret Manager `stripe-webhook-secret`, only when `enable_billing = true`       |

Cloud Run itself sets `PORT=8080`, `K_SERVICE` and `K_REVISION`. Queue names default to `world-builds` (`BUILDER_QUEUE`) and `deletions` (`DELETION_QUEUE`), matching what Terraform creates; leave them unset.

### Models

Model IDs are settings, not a guarantee that a project can call them. Before step 9, confirm each one in Vertex AI (Model Garden, or a test call) for this project and region.

| Setting                 | Default                       | Used for                                            | Location              |
| ----------------------- | ----------------------------- | --------------------------------------------------- | --------------------- |
| `LIVE_MODEL`            | `gemini-3.8-live`             | Live voice                                          | `us-central1`         |
| `SCENE_MODEL`           | `gemini-4-argon`              | World builder                                       | `us-central1`         |
| `FAST_MODEL`            | `gemini-3.8-flash`            | Patches, summaries, moderation, lesson writing help | `us-central1`         |
| `HERO_MODEL`            | `gemini-nano-banana-2.1`      | Hero sprites and backdrops                          | `us-central1`         |
| `PROP_MODEL`            | `gemini-3.1-flash-lite-image` | Props                                               | `us-central1`         |
| `GAME_MODEL`            | `gemini-4-argon`              | Generated games                                     | `GAME_MODEL_LOCATION` |
| `GAME_MODEL_LOCATION`   | `global`                      | Location for the game model                         |                       |
| `COMPANION_IMAGE_MODEL` | `gemini-nano-banana-2.1`      | Companion portraits                                 | `us-central1`         |

The first five are set by Terraform. The last three use the defaults built into the services; to change any of them, add the key to `models` in the tfvars, for example `models = { …the five defaults…, GAME_MODEL_LOCATION = "us-central1" }`. Include all five defaults when you override `models`, because the map replaces the default.

### Web app (App Hosting)

Set in `apps/web/apphosting.yaml` (shared) and `apps/web/apphosting.<env>.yaml` (one per environment, step 8). Every value here is public, so both files can be committed.

| Variable                               | Available at   | Value                                                        | Where it comes from                                                |
| -------------------------------------- | -------------- | ------------------------------------------------------------ | ------------------------------------------------------------------ |
| `NEXT_PUBLIC_FAKE`                     | Build, runtime | `0`                                                          | Already in `apphosting.yaml`; never change it                      |
| `NEXT_PUBLIC_API_URL`                  | Build          | `https://imagine-api-<project-number>.us-central1.run.app`   | Step 1 (`API_URL`)                                                 |
| `NEXT_PUBLIC_GATEWAY_URL`              | Build          | `wss://imagine-gateway-<project-number>.us-central1.run.app` | Step 1 (`GATEWAY_URL`); note `wss://`                              |
| `NEXT_PUBLIC_FIREBASE_API_KEY`         | Build          | `apiKey`                                                     | Step 3                                                             |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`     | Build          | `authDomain`                                                 | Step 3                                                             |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`      | Build          | `projectId`                                                  | Step 3                                                             |
| `NEXT_PUBLIC_FIREBASE_APP_ID`          | Build          | `appId`                                                      | Step 3                                                             |
| `NEXT_PUBLIC_FIREBASE_EMULATOR`        | Build          | `0`                                                          | Fixed                                                              |
| `WEB_URL`                              | Runtime        | The same origin as `web_url`                                 | Step 1; the session routes check request origins against it        |
| `GOOGLE_CLOUD_PROJECT`                 | Runtime        | The project ID                                               | Step 1; tells the server's Firebase Admin SDK which project to use |
| `NEXT_PUBLIC_CHARACTER_ASSET_BASE_URL` | Build          | Leave unset                                                  | Optional base URL for final Rive character files                   |

`NEXT_PUBLIC_*` values are compiled into the browser bundle at build time: after changing one, start a new rollout.

### Never set in the cloud

| Variable                                                                                                                                   | Why                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `GEMINI_API_KEY`                                                                                                                           | Production uses Vertex AI through each service account. A key would bypass the project's identity and quota controls |
| `LOCAL_DEV`                                                                                                                                | Local Docker mode only; it refuses to run on Cloud Run                                                               |
| `FIRESTORE_EMULATOR_HOST`, `FIREBASE_AUTH_EMULATOR_HOST`, `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_PORT`, `NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT` | Point at local emulators instead of the real database                                                                |
| `NEXT_PUBLIC_FIREBASE_EMULATOR=1`, `NEXT_PUBLIC_FAKE=1`, `JUST_IMAGINE_SAMPLE_BUILD`                                                       | Local, CI and demo modes only                                                                                        |
| `ASSET_DIRECTORY`                                                                                                                          | Local disk storage for the Docker stack                                                                              |
| Any Admin SDK key file, `GOOGLE_APPLICATION_CREDENTIALS`                                                                                   | Services use their attached service accounts; key files are a leak waiting to happen                                 |

## Step 1: Set your names once

Open one terminal and keep it for the whole deployment. Set these, replacing every value in angle brackets:

```sh
export PROJECT_ID='<staging-project-id>'
export REGION='us-central1'
export BACKEND_ID='web'                               # App Hosting backend ID
export ASSET_BUCKET='<globally-unique-assets-bucket>'
export ENV_NAME='staging'                             # App Hosting environment name
```

If the project does not exist yet, create it and link billing (App Hosting also needs billing, the Firebase Blaze plan):

```sh
gcloud projects create "$PROJECT_ID"
gcloud billing accounts list
gcloud billing projects link "$PROJECT_ID" --billing-account='<BILLING_ACCOUNT_ID>'
```

Sign in twice: once for the CLI, once for Application Default Credentials, which Terraform and the admin scripts use:

```sh
gcloud auth login
gcloud auth application-default login
gcloud config set project "$PROJECT_ID"
gcloud auth application-default set-quota-project "$PROJECT_ID"
```

Derive the addresses every later step needs:

```sh
export PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
export API_URL="https://imagine-api-$PROJECT_NUMBER.$REGION.run.app"
export GATEWAY_URL="wss://imagine-gateway-$PROJECT_NUMBER.$REGION.run.app"
export WEB_URL="https://$BACKEND_ID--$PROJECT_ID.$REGION.hosted.app"
echo "$API_URL"; echo "$GATEWAY_URL"; echo "$WEB_URL"
```

Terraform builds the Cloud Run addresses the same way (`https://imagine-<service>-<project-number>.us-central1.run.app`). If you will serve the web app from a custom domain, set `WEB_URL` to that exact `https://` origin instead: every origin check compares against this one value.

## Step 2: Add Firebase to the project

```sh
pnpm exec firebase login
pnpm exec firebase projects:addfirebase "$PROJECT_ID"
```

Do **not** create the Firestore database in the console. Terraform creates `(default)` in `nam5` with deletion protection. If one already exists, import it into Terraform state before step 6: `terraform -chdir=infra/terraform import -var-file=staging.tfvars -var='image=bootstrap-only' google_firestore_database.default "projects/$PROJECT_ID/databases/(default)"`.

## Step 3: Turn on sign-in and register the web app

Sign-in must work for every role before release:

| Role     | Signs in with                                            | Needs                                                                                                                                           |
| -------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Parent   | Email and password, or Google                            | Both providers, an authorized domain, the Google consent screen in production                                                                   |
| Teacher  | Email and password, or Google, after accepting an invite | The same, plus the `WEB_URL` the invite link uses                                                                                               |
| Student  | School code, username and PIN (no email)                 | The API signs a Firebase custom token; Terraform grants it `roles/iam.serviceAccountTokenCreator` on itself and enables the IAM Credentials API |
| Operator | Email and password, plus the operator claim              | Step 9                                                                                                                                          |

**3a. Turn on the providers.** In the Firebase console for this project, open **Authentication** and choose **Get started**. Then:

1. Under **Sign-in method**, enable **Email/Password**.
2. Enable **Google**. The console asks for a **project support email**; choose a team address, not a personal one.
3. Under **Settings → Authorized domains**, add the host part of `WEB_URL` (for example `web--my-project.us-central1.hosted.app`) and any custom domain. `localhost` and `<project>.firebaseapp.com` are listed already; leave them.

**3b. Make Google sign-in work for every Google account.** In the Google Cloud console, open **Google Auth Platform** (formerly **APIs & Services → OAuth consent screen**) for this project:

1. **Branding:** set the app name to `Just Imagine`, the user support email and the developer contact email. Add the `WEB_URL` host and `<project>.firebaseapp.com` under **Authorized domains**, and the web app's privacy page (`WEB_URL/privacy`) as the privacy policy link.
2. **Audience:** user type **External**, then **Publish app** so the publishing status is **In production**. While it says **Testing**, only the test users listed there can sign in with Google.
3. **Clients:** Firebase created a **Web client (auto created by Google Service)**. Open it and check that **Authorized JavaScript origins** include `https://<authDomain>` and that **Authorized redirect URIs** include `https://<authDomain>/__/auth/handler`. Firebase normally fills these in; add them if missing. A custom web domain does not change them, because sign-in runs through `authDomain`.

Just Imagine asks Google only for the basic profile and email, so publishing does not need Google's verification review.

**3c. Register the web app** and print its public configuration:

```sh
pnpm exec firebase apps:create WEB 'Just Imagine Web' --project "$PROJECT_ID"
pnpm exec firebase apps:sdkconfig WEB --project "$PROJECT_ID"
```

Keep the printed `apiKey`, `authDomain` (normally `<project>.firebaseapp.com`), `projectId` and `appId` for step 8. They are public by design and grant no access on their own.

**3d. Limit where the key works.** In the Google Cloud console, open **APIs & Services → Credentials** and select the **Browser key** Firebase created. Under **Application restrictions**, choose **Websites** and add `https://<WEB_URL host>/*`, `https://<authDomain>/*` and any custom domain. Leave **API restrictions** off. If your organisation requires them, allow at least the **Identity Toolkit API**, **Token Service API** and **Cloud Firestore API**: the browser uses them to sign in and to read worlds.

## Step 4: Give Terraform a state bucket

The repository does not configure a Terraform backend. Store state in a versioned Cloud Storage bucket so it is shared and recoverable:

```sh
gcloud storage buckets create "gs://$PROJECT_ID-tfstate" \
  --location="$REGION" --uniform-bucket-level-access
gcloud storage buckets update "gs://$PROJECT_ID-tfstate" --versioning
```

Create `infra/terraform/backend.tf` with an empty backend block (do not commit it):

```hcl
terraform {
  backend "gcs" {}
}
```

Initialise against this environment's bucket:

```sh
terraform -chdir=infra/terraform init \
  -backend-config="bucket=$PROJECT_ID-tfstate" \
  -backend-config="prefix=just-imagine"
```

When you later switch to the production project, run `init` again with `-reconfigure` and the production bucket. State, plans and `.tfvars` files can contain project details; `.gitignore` already excludes `*.tfstate`, `*.tfplan` and `*.tfvars`.

## Step 5: Write the environment's variables

Create `infra/terraform/staging.tfvars` (git-ignored). See the [Terraform variables](#configuration-reference) table for every option:

```hcl
project_id   = "<staging-project-id>"
web_url      = "https://web--<staging-project-id>.us-central1.hosted.app"
asset_bucket = "<globally-unique-assets-bucket>"

# Leave billing off until the Stripe test secrets exist (step 10).
enable_billing  = false
stripe_price_id = ""

# Optional: Monitoring channel resource names for alerts (step 10).
notification_channels = []

# Optional: a DNS name for Cloud CDN in front of the assets bucket (step 10).
asset_domain = ""
```

`web_url` must equal `WEB_URL` from step 1, with no trailing slash. Omit `models` to use the defaults.

## Step 6: Create the registry, build the image, apply Terraform

**6a. Create only the image registry.** On a brand-new project Cloud Build has nowhere to push yet. Apply just the registry (and the APIs it depends on); this is the one time a targeted apply is used:

```sh
terraform -chdir=infra/terraform plan -var-file=staging.tfvars \
  -var='image=bootstrap-only' \
  -target=google_artifact_registry_repository.images -out=registry.tfplan
terraform -chdir=infra/terraform apply registry.tfplan
```

**6b. Build and push the services image** from a clean checkout of the `main` commit you are releasing. Cloud Build uploads the working tree, and the tag records the Git revision:

```sh
git switch main && git pull --ff-only
git status --short        # must print nothing
export REVISION="$(git rev-parse HEAD)"
gcloud builds submit . --project "$PROJECT_ID" \
  --config cloudbuild.yaml --substitutions="COMMIT_SHA=$REVISION"
```

If the push fails with a permission error, grant the build's service account `roles/artifactregistry.writer` on the project and submit again.

**6c. Pin the image by digest.** Terraform deploys an immutable digest, never a moving tag:

```sh
export IMAGE="$(gcloud artifacts docker images describe \
  "$REGION-docker.pkg.dev/$PROJECT_ID/just-imagine/services:$REVISION" \
  --format='value(image_summary.fully_qualified_digest)')"
echo "$IMAGE"            # ...services@sha256:...
```

**6d. Plan and apply everything.** Read the plan before you apply it, especially the IAM changes:

```sh
terraform -chdir=infra/terraform plan -var-file=staging.tfvars \
  -var="image=$IMAGE" -out=staging.tfplan
terraform -chdir=infra/terraform apply staging.tfplan
terraform -chdir=infra/terraform output service_urls
```

`service_urls` must match `API_URL` and the gateway address from step 1. Apply creates the service accounts and their roles, Firestore, the assets bucket, both queues, the Scheduler job, the Secret Manager entries, the three Cloud Run services with every variable in the [backend table](#backend-services-cloud-run-set-by-terraform), and the Monitoring resources. Cloud Run services and Firestore have deletion protection; leave it on.

**6e. Publish the Firestore rules and indexes:**

```sh
pnpm exec firebase deploy --project "$PROJECT_ID" --only firestore:rules,firestore:indexes
```

## Step 7: Check the backend before the web app

```sh
curl -fsS "$API_URL/health" && echo ' api ok'
gcloud run services list --project "$PROJECT_ID" --region "$REGION"
for s in api gateway builder; do
  echo "== imagine-$s"
  gcloud run services describe "imagine-$s" --project "$PROJECT_ID" --region "$REGION" \
    --format='value(spec.template.spec.containers[0].env)' | tr ';' '\n' | sed 's/,.*value=/ = /'
done
```

All three services should show a ready revision, and each should list the variables from the [backend table](#backend-services-cloud-run-set-by-terraform). The builder is private, so an unauthenticated request to it returns 403; that is correct. Confirm Cloud Tasks may invoke it:

```sh
gcloud run services get-iam-policy imagine-builder --region "$REGION" --project "$PROJECT_ID"
```

The policy must list `serviceAccount:imagine-tasks@$PROJECT_ID.iam.gserviceaccount.com` with `roles/run.invoker`. A health response proves the process started, not that models answer; step 9 tests that.

## Step 8: Deploy the web app on App Hosting

**8a. Add the build and runtime settings.** App Hosting reads [`apps/web/apphosting.yaml`](../../apps/web/apphosting.yaml) for every environment and `apphosting.<environment>.yaml` for one. Create `apps/web/apphosting.staging.yaml` with the values from steps 1 and 3 (see the [web app table](#web-app-app-hosting)):

```yaml
env:
  - variable: NEXT_PUBLIC_API_URL
    value: https://imagine-api-<project-number>.us-central1.run.app
    availability: [BUILD]
  - variable: NEXT_PUBLIC_GATEWAY_URL
    value: wss://imagine-gateway-<project-number>.us-central1.run.app
    availability: [BUILD]
  - variable: NEXT_PUBLIC_FIREBASE_API_KEY
    value: <apiKey>
    availability: [BUILD]
  - variable: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
    value: <authDomain>
    availability: [BUILD]
  - variable: NEXT_PUBLIC_FIREBASE_PROJECT_ID
    value: <projectId>
    availability: [BUILD]
  - variable: NEXT_PUBLIC_FIREBASE_APP_ID
    value: <appId>
    availability: [BUILD]
  - variable: NEXT_PUBLIC_FIREBASE_EMULATOR
    value: '0'
    availability: [BUILD]
  - variable: WEB_URL
    value: https://web--<staging-project-id>.us-central1.hosted.app
    availability: [RUNTIME]
  - variable: GOOGLE_CLOUD_PROJECT
    value: <staging-project-id>
    availability: [RUNTIME]
```

Every value is public, so commit the file on `main` and push it before creating the backend. The shared `apphosting.yaml` already sets `NEXT_PUBLIC_FAKE=0`. Never add anything from [Never set in the cloud](#never-set-in-the-cloud).

**8b. Create the backend:**

```sh
pnpm exec firebase apphosting:backends:create --project "$PROJECT_ID" \
  --backend "$BACKEND_ID" --primary-region "$REGION" --root-dir apps/web
```

When prompted, connect GitHub, choose `mubinui/just-imagine`, and set the live branch to **`main`**. The backend ID, region and root directory must match step 1, or `WEB_URL` will be wrong.

In the Firebase console, open the backend's **Settings → Environment** and set the environment name to `staging`, so `apphosting.staging.yaml` applies. App Hosting builds from the monorepo root, so the pnpm workspace and lockfile are available; it reads Node and pnpm versions from the root `package.json` (`engines.node >=22.12.0`, `packageManager pnpm@10.34.7`).

**8c. Give the web runtime its permissions.** The web server is not only static pages: `/api/session` reads and writes family records and asks Firebase Auth to mint session cookies, and parent pages check for revoked sessions:

```sh
export WEB_SA="firebase-app-hosting-compute@$PROJECT_ID.iam.gserviceaccount.com"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$WEB_SA" --role='roles/datastore.user'
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$WEB_SA" --role='roles/firebaseauth.admin'
```

For least privilege, replace `roles/firebaseauth.admin` with a custom role holding `firebaseauth.users.get` and `firebaseauth.users.createSession`. Check the backend's settings for its actual service account and use that one if it differs.

**8d. Roll out.** Start a rollout from the console, or run:

```sh
pnpm exec firebase apphosting:rollouts:create "$BACKEND_ID" \
  --git-branch main --project "$PROJECT_ID"
```

Open `WEB_URL` when the rollout finishes. If the browser cannot reach the API or voice, the public URLs in the build are wrong: fix `apphosting.staging.yaml` and roll out again, because `NEXT_PUBLIC_*` values are fixed at build time.

## Step 9: Accept the staging release

Work through every role with synthetic accounts, never a real child. The [testing guide](#testing-guide) has the full acceptance list; these are the steps that set the roles up.

**9a. Make yourself an operator.** Sign up on the web app with email and password, then grant the operator claim (the script refuses to touch a real project without `--yes`):

```sh
GOOGLE_CLOUD_PROJECT="$PROJECT_ID" \
  node scripts/grant-admin.mjs '<your-email>' --project "$PROJECT_ID" --yes
```

Sign out, then sign in at `WEB_URL/admin/sign-in`. **Operator → System** must show the API, builder and gateway up and list the configured models; it also holds the audited kill switch that stops new sessions and builds.

**9b. Parent and child.** In a private window, open `WEB_URL`, sign up once with email and once with **Continue with Google**, give consent, and add a child. Open **Plan & billing**: with payments off it says the Family plan needs no payment; **Start the Family plan** must switch the plan to Family, and **Return to the free plan** back.

**9c. School, teacher and student.** In the operator console, open **Schools**, create a school, and **Invite** a teacher's email. Copy the invite link it shows (`WEB_URL/school/join?invite=…`) and open it in another private window: the teacher creates an account (email or Google) and lands in the teacher console. There, create a class, add a student and note the school code, username and PIN shown once. In a third window, sign in at `WEB_URL/study/sign-in` with those three values.

**Optional demo school data (staging only, never production):**

```sh
GOOGLE_CLOUD_PROJECT="$PROJECT_ID" node scripts/seed-schools.mjs --staging
```

It writes the demo students' sign-in details once to an owner-only file (default `/tmp/just-imagine-school-pins.json`, or `SCHOOL_PIN_OUTPUT`). Keep that file out of tickets and chat, and delete it when you are done.

## Step 10: Optional features

**Alerts.** Create a notification channel, put its resource name in `notification_channels`, and apply again:

```sh
gcloud beta monitoring channels create --project "$PROJECT_ID" \
  --display-name='Just Imagine on-call' --type=email \
  --channel-labels=email_address='<on-call-email>'
gcloud beta monitoring channels list --project "$PROJECT_ID" --format='value(name)'
```

**Subscriptions without payment (the default).** Nothing to configure. With `enable_billing = false` and `subscriptions_without_payment = true`, Terraform sets `SUBSCRIPTIONS_WITHOUT_PAYMENT=1` on the API: parents start and stop the Family plan on **Plan & billing** with no card, and the operator overview counts these plans as **Family plans without payment**. To offer only the free plan instead, set `subscriptions_without_payment = false` and apply.

**Real billing with Stripe (optional, test mode only).** Turning this on replaces subscriptions without payment.

1. In the Stripe Dashboard, switch to **test mode**.
2. **Product catalog → Add product**: the Family plan with a recurring price. Copy its price ID (`price_…`).
3. **Developers → API keys**: copy the **Secret key** (`sk_test_…`).
4. **Developers → Webhooks → Add endpoint**: URL `$API_URL/v1/billing/webhook`, events `checkout.session.completed`, `customer.subscription.updated` and `customer.subscription.deleted`. Copy the endpoint's **Signing secret** (`whsec_…`).
5. Store the two secrets, typed straight from the clipboard so they never land in shell history:

   ```sh
   read -rs STRIPE_KEY && printf '%s' "$STRIPE_KEY" | gcloud secrets versions add stripe-secret-key --data-file=- --project "$PROJECT_ID"
   read -rs STRIPE_WHSEC && printf '%s' "$STRIPE_WHSEC" | gcloud secrets versions add stripe-webhook-secret --data-file=- --project "$PROJECT_ID"
   unset STRIPE_KEY STRIPE_WHSEC
   ```

6. Set `enable_billing = true` and `stripe_price_id = "price_…"` in the tfvars, then plan and apply (step 6d).

**Cloud CDN for assets.** Set `asset_domain` to a hostname you control and apply. Point that hostname's DNS `A` record at the `assets_ip` output. The managed certificate becomes active only after DNS resolves, which can take a while; assets keep using `storage.googleapis.com` until you switch.

**Custom web domain.** Add it under App Hosting → Settings → Domains, to Firebase Auth authorized domains, to the Google Auth Platform authorized domains and to the Browser key's website restrictions. Then change `web_url` in the tfvars and `WEB_URL` in `apphosting.<env>.yaml` to the new origin, apply Terraform and roll out the web app again.

**Nightly model evaluations.** The `builder-evaluations` workflow runs a billable evaluation against staging Vertex AI each night, signing in with Workload Identity Federation instead of a key. Create the identity once:

```sh
gcloud iam workload-identity-pools create github --project "$PROJECT_ID" \
  --location=global --display-name='GitHub Actions'
gcloud iam workload-identity-pools providers create-oidc just-imagine --project "$PROJECT_ID" \
  --location=global --workload-identity-pool=github \
  --issuer-uri='https://token.actions.githubusercontent.com' \
  --attribute-mapping='google.subject=assertion.sub,attribute.repository=assertion.repository' \
  --attribute-condition="assertion.repository=='mubinui/just-imagine'"
gcloud iam service-accounts create imagine-evals --project "$PROJECT_ID" \
  --display-name='Nightly builder evaluations'
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:imagine-evals@$PROJECT_ID.iam.gserviceaccount.com" \
  --role='roles/aiplatform.user'
gcloud iam service-accounts add-iam-policy-binding \
  "imagine-evals@$PROJECT_ID.iam.gserviceaccount.com" --project "$PROJECT_ID" \
  --role='roles/iam.workloadIdentityUser' \
  --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github/attribute.repository/mubinui/just-imagine"
```

Then in GitHub, open **Settings → Environments**, create `staging`, and add these **variables** (not secrets; none of them grants access by itself):

| Variable               | Value                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------ |
| `GCP_PROJECT_ID`       | The staging project ID                                                                           |
| `SCENE_MODEL`          | `gemini-4-argon` (or your `SCENE_MODEL`)                                                         |
| `FAST_MODEL`           | `gemini-3.8-flash` (or your `FAST_MODEL`)                                                        |
| `WIF_PROVIDER`         | `projects/<project-number>/locations/global/workloadIdentityPools/github/providers/just-imagine` |
| `EVAL_SERVICE_ACCOUNT` | `imagine-evals@<staging-project-id>.iam.gserviceaccount.com`                                     |

Until they exist, the scheduled job stops at its configuration check.

## Step 11: Promote to production

Production is a separate project that receives the **same image digest** staging accepted. Nothing is rebuilt.

1. Repeat steps 1 to 5 for the production project, with its own names, state bucket and `production.tfvars`, and run `terraform init -reconfigure` with the production bucket. Repeat step 3 too: production has its own Firebase web config and authorized domains.
2. Let production pull the staging image. Grant the production Cloud Run service agent read access on the staging registry:

   ```sh
   export PROD_NUMBER="$(gcloud projects describe '<prod-project-id>' --format='value(projectNumber)')"
   gcloud artifacts repositories add-iam-policy-binding just-imagine \
     --project '<staging-project-id>' --location "$REGION" \
     --member="serviceAccount:service-$PROD_NUMBER@serverless-robot-prod.iam.gserviceaccount.com" \
     --role='roles/artifactregistry.reader'
   ```

   Alternatively, copy the identical image into a production registry and keep the same digest.

3. Run step 6d with `-var-file=production.tfvars` and `-var="image=<accepted-digest>"`, then step 6e against the production project. The production Terraform also creates a `just-imagine` registry, unused when you pull from staging.
4. Create the production App Hosting backend (step 8) with an `apphosting.production.yaml` holding production values, and roll out the **same Git commit** staging accepted.
5. Do **not** run the demo school seed in production. Run step 9's checks with a synthetic production family.
6. Billing in production stays off until live payments are approved and the API's test-mode guard is lifted in a reviewed release.

**Later backend releases** use [`cloudbuild.promote.yaml`](../../cloudbuild.promote.yaml). Create a manual Cloud Build trigger in the production project that uses this file, requires approval and takes `_IMAGE_DIGEST` as a substitution. Its build service account needs `roles/run.admin`, plus `roles/iam.serviceAccountUser` on the three `imagine-*` service accounts. The file refuses anything that is not an `@sha256:` digest. After each promotion, update the digest in `production.tfvars` so the next Terraform plan shows no drift.

## Release checklist

Tick every line before calling an environment done.

**Project and access**

- [ ] Separate staging and production projects, billing linked, Firebase added.
- [ ] Deploying from a green `main` commit; nothing from `demo`.

**Sign-in**

- [ ] Email/Password and Google enabled, with a project support email.
- [ ] Google Auth Platform branding set and the app **In production**, so any Google account can sign in.
- [ ] `WEB_URL` host (and any custom domain) in Firebase Auth authorized domains.
- [ ] Browser key restricted to the web and auth domains.

**Terraform**

- [ ] State in the versioned `<project>-tfstate` bucket.
- [ ] `project_id`, `web_url`, `asset_bucket` set; `image` is a `@sha256:` digest.
- [ ] `service_urls` output matches `API_URL` and `GATEWAY_URL`.
- [ ] Firestore rules and indexes deployed.

**Services**

- [ ] All three Cloud Run services ready, each with the variables in the backend table.
- [ ] `imagine-tasks` holds `roles/run.invoker` on `imagine-builder`.
- [ ] No `GEMINI_API_KEY`, `LOCAL_DEV` or emulator variable on any service.
- [ ] Every model in the model table answers in this project.

**Web**

- [ ] `apphosting.<env>.yaml` has all nine variables, with `wss://` for the gateway.
- [ ] Backend live branch is `main` and its environment name matches the file.
- [ ] The newest web rollout and the Cloud Run image tag are both the released `main` commit (see [Verify what is deployed](#testing-guide)).
- [ ] App Hosting runtime identity has `roles/datastore.user` and `roles/firebaseauth.admin` (or the custom role).

**Every role signs in**

- [ ] Parent with email and with Google; child profile created.
- [ ] Teacher through an invite link, with email or Google.
- [ ] Student with school code, username and PIN.
- [ ] Operator at `/admin/sign-in`.
- [ ] Family plan starts and stops without payment (unless Stripe is on).

**Operations**

- [ ] An operator account exists; System shows every service up.
- [ ] Notification channels set and applied.
- [ ] Stripe (if enabled): test-mode secrets in Secret Manager, webhook endpoint with three events, `stripe_price_id` set.
- [ ] Current Cloud Run revisions and App Hosting rollout written down for rollback.

## Run and operate

### Run it on your machine

| Mode             | Command                                                                                     | Open                  | What it is                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------- | --------------------- | --------------------------------------------------------------------------------------------------- |
| Full local stack | `pnpm local:start`                                                                          | http://localhost:3300 | Web, API, builder, gateway, Auth and Firestore emulators in Docker. Data persists in Docker volumes |
| Sample mode      | `pnpm --filter @just-imagine/fixtures dev`, then `pnpm --filter @just-imagine/web dev:fake` | http://localhost:3000 | Sample worlds only, no sign-in, voice or payments                                                   |

For the full stack, Docker Desktop (or Engine with Compose) is the only requirement. `pnpm local:start` copies the root `.env.example` to a private `.env.local` the first time; add a `GEMINI_API_KEY` there for live voice and AI on your machine only. Then:

```sh
pnpm local:status          # container health
pnpm local:logs            # follow every service
pnpm local:reload-key      # after changing a key or model in .env.local
pnpm local:stop            # stop and keep all data
```

Never point the local stack at a cloud project, and never copy a cloud credential into `.env.local`. [local-development.md](../handoff/local-development.md) has the details.

### Operate the cloud environment

**Logs.** Every service writes structured JSON to Cloud Logging:

```sh
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="imagine-api" AND severity>=WARNING' \
  --project "$PROJECT_ID" --freshness=1h --limit=50
```

Replace `imagine-api` with `imagine-gateway` or `imagine-builder`. Web logs are in the App Hosting backend's **Logs** tab.

**Stop new sessions and builds in an emergency.** Operator console → **System → Kill switch**, with a reason. It is audited and takes effect at once; turn it off the same way.

**Scale.** Instance limits live in `infra/terraform/main.tf` (`services`): gateway 1 to 50, API and builder 0 to 20. Change them there and apply; do not edit Cloud Run by hand, or the next plan reverts it.

**Rotate a Stripe secret** (only if billing is on): add a new version with the step 10 command, then start a new API revision so its instances read `latest`:

```sh
gcloud run services update imagine-api --region "$REGION" --project "$PROJECT_ID" \
  --revision-suffix="rotate-$(date +%s)"
```

**Release a new backend version.** Repeat steps 6b to 6d with the new `main` commit in staging, accept it (the [testing guide](#testing-guide)), then promote the same digest (step 11). Roll out the web app from the same commit.

**Watch.** The Monitoring dashboard **Just Imagine operations** shows first-audio latency, builder failures and gateway errors; uptime checks cover the web app and `/health` on the API. Alerts go to `notification_channels`.

## Testing guide

### Before a release (on your machine and in CI)

```sh
pnpm install --frozen-lockfile
node --test scripts/local.test.mjs scripts/env-contract.test.mjs   # deployment contract
pnpm format:check
pnpm lint
pnpm typecheck
env -u FIRESTORE_EMULATOR_HOST -u FIREBASE_AUTH_EMULATOR_HOST pnpm test   # unit + emulator suites
```

`pnpm test` starts disposable Firestore and Auth emulators itself (Java 21 needed) and runs the server-core, API, builder and gateway suites against them. It never touches a real project.

**Browser tests** run the web app in sample mode:

```sh
NEXT_PUBLIC_FAKE=1 JUST_IMAGINE_SAMPLE_BUILD=1 pnpm build
pnpm --filter @just-imagine/web exec playwright install chromium
pnpm --filter @just-imagine/fixtures dev &                          # fixture gateway on 8787
NEXT_PUBLIC_FAKE=1 pnpm --filter @just-imagine/web start --port 3100 &
pnpm --filter @just-imagine/web e2e
```

The `ci` workflow runs all of this on every push to `main`. Deploy only a commit whose run is green.

### After deploying (staging, then production)

**Verify what is deployed first.** The web app and the backend are built separately, so check both against the `main` commit you meant to release:

```sh
export RELEASE="$(git rev-parse origin/main)"     # the commit you meant to deploy
git log -1 --oneline "$RELEASE"

# Web: App Hosting's newest rollout must be from branch main at $RELEASE.
#   Firebase console → App Hosting → <backend> → Rollouts (commit and branch per rollout)
#   Firebase console → App Hosting → <backend> → Settings → Deployment → Live branch = main

# Backend: the image every service runs, and the commit it was built from.
for s in api gateway builder; do
  gcloud run services describe "imagine-$s" --region "$REGION" --project "$PROJECT_ID" \
    --format='value(spec.template.spec.containers[0].image)'
done
gcloud artifacts docker tags list "$REGION-docker.pkg.dev/$PROJECT_ID/just-imagine/services" \
  --project "$PROJECT_ID" --format='table(tag,version)'
```

All three services must run the same `@sha256:` digest, and that digest's tag in the list must be `$RELEASE`. If the web rollout or the image tag is an older commit or another branch, you are looking at old code: set the live branch to `main` and roll out again, or rebuild the image from a clean `main` checkout (steps 6b to 6d). Only `main` (and `demo`, which is never deployed) carries the current app; older `feat/*` branches on GitHub have the previous UI.

**Smoke checks** (one minute):

```sh
curl -fsS "$API_URL/health" && echo ' api ok'
curl -s -o /dev/null -w 'web %{http_code}\n' "$WEB_URL/"
curl -s -o /dev/null -w 'gateway %{http_code} (426 is correct)\n' "${GATEWAY_URL/wss:/https:}/"
gcloud tasks queues list --location "$REGION" --project "$PROJECT_ID"
```

**Acceptance** with synthetic accounts. Tick each line in staging, and the sign-in and plan lines again in production:

| Area              | Check                                                                                                                             |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Parent sign-in    | Email sign-up with consent; Google sign-in with a second account; sign out and back in                                            |
| Child             | Add a child; the child picks the profile; Studio loads                                                                            |
| Voice             | Talk to the friend: the first reply arrives within a few seconds; voice ends cleanly and reconnects after a network drop          |
| Worlds            | A spoken idea becomes a world; it opens from **My worlds**; its pictures load from the asset bucket                               |
| Learn and stories | Learn islands open, a learning game plays, a story builds and reads                                                               |
| Plan              | **Start the Family plan** without payment and **Return to the free plan** (or a Stripe test checkout if billing is on)            |
| School            | Operator creates a school and invites a teacher; the teacher joins through the link with email or Google                          |
| Teacher           | Creates a class and a student; copies, edits and publishes a lesson; sees results                                                 |
| Student           | Signs in with school code, username and PIN; opens a lesson, runs a simulation, submits the quiz; the score shows for the teacher |
| Operator          | System shows every service up and the right models; overview figures load without child names; the kill switch turns on and off   |
| Deletion          | Deleting a child, then the family, removes their data; the `deletions` queue drains                                               |
| Monitoring        | The dashboard has data; both uptime checks pass                                                                                   |

Keep job IDs, error categories and timings as evidence. Never copy keys, tokens, PINs, transcripts, child photos or audio into tickets.

## Rolling back

Before every release, write down the current Cloud Run revisions and the current App Hosting rollout:

```sh
for s in api gateway builder; do
  gcloud run revisions list --service "imagine-$s" --region "$REGION" --project "$PROJECT_ID" --limit 3
done
```

To return a service to a known good revision:

```sh
gcloud run services update-traffic imagine-api \
  --project "$PROJECT_ID" --region "$REGION" \
  --to-revisions='<PREVIOUS_GOOD_REVISION>=100'
```

Repeat for `imagine-gateway` and `imagine-builder` as needed, and roll the web app back to the matching rollout in the App Hosting console. Check first that stored lessons, attempts, jobs and generated worlds are still readable by the older code. Never restore old database documents over current user data.

## Troubleshooting

| Symptom                                                           | Check first                                                                                                                                                                                  |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cloud Build cannot push the image                                 | Step 6a ran; the build service account has `roles/artifactregistry.writer`                                                                                                                   |
| Terraform says Firestore already exists                           | Import it (step 2) instead of creating a second database                                                                                                                                     |
| Web build fails with "Refusing a production build in sample mode" | Something set `NEXT_PUBLIC_FAKE=1`; deployments must use `0`                                                                                                                                 |
| Browser shows CORS or origin errors                               | `web_url` in tfvars, `WEB_URL` in App Hosting and the address bar are the exact same origin                                                                                                  |
| Sign-in popup fails                                               | The web host is an authorized domain; Google is enabled; the Browser key allows the web and auth domains                                                                                     |
| Parent session fails after sign-in                                | The runtime identity has the step 8c roles; `GOOGLE_CLOUD_PROJECT` and the Firebase config belong to this project                                                                            |
| Old screens after a deploy                                        | The web rollout's branch and commit, and the Cloud Run image tag, match the released `main` commit (Testing guide → verify what is deployed); then reload on the device or use a private tab |
| Web calls the wrong API or gateway                                | Fix `apphosting.<env>.yaml` and roll out again; public URLs are fixed at build time                                                                                                          |
| Voice never connects                                              | Gateway URL uses `wss://`; `WEB_URL` matches the page origin; the gateway revision is ready                                                                                                  |
| Worlds stay "building"                                            | `world-builds` queue, the `imagine-tasks` invoker grant on the builder, builder logs for the job ID                                                                                          |
| AI unavailable or timing out                                      | Vertex AI model access and quota in `us-central1` (and `global` for the game model); the error category in logs                                                                              |
| Checkout says billing is unavailable                              | `enable_billing = true` was applied, both secrets have a version, and the key starts with `sk_test_`                                                                                         |
| Stripe webhook returns 400                                        | The endpoint's signing secret matches `stripe-webhook-secret`; the event is from test mode                                                                                                   |
| Deletion stays pending                                            | `deletions` queue, the Scheduler job's runs, `/internal/deletions` logs on the API                                                                                                           |
| System page shows a service unconfigured                          | The API revision predates `ADMIN_HEALTH_TARGETS`; apply Terraform again                                                                                                                      |
| No alerts arrive                                                  | `notification_channels` is set and Terraform was applied after setting it                                                                                                                    |
| Nightly evaluation fails at its configuration check               | The five GitHub `staging` environment variables exist                                                                                                                                        |

When collecting evidence for an incident, keep job IDs, error categories and timings. Never copy keys, tokens, transcripts, child photos or audio into logs or tickets.
