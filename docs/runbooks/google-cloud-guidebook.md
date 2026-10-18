# Deploying Just Imagine on Google Cloud

A step-by-step guidebook for a first deployment of Just Imagine to a Google Cloud staging project, then promotion of the same build to production. Follow the steps in order. Every command runs from the repository root unless a step says otherwise.

This guide turns the reference material in [deployment.md](deployment.md) into one ordered path. If the two disagree, the source files win: [`infra/terraform/`](../../infra/terraform/), [`cloudbuild.yaml`](../../cloudbuild.yaml), [`cloudbuild.promote.yaml`](../../cloudbuild.promote.yaml) and [`apps/web/apphosting.yaml`](../../apps/web/apphosting.yaml).

> **Cost and safety.** These steps create billable resources: Cloud Run, Vertex AI, Firestore, Cloud Storage, Cloud Tasks and Monitoring. Use a dedicated staging project first. Never put a secret in a `NEXT_PUBLIC_*` variable, an `apphosting.yaml` file, a `.tfvars` file you commit, or a log.

## What you are deploying

| Piece                               | Runs on                                               | Created by                        |
| ----------------------------------- | ----------------------------------------------------- | --------------------------------- |
| Web app (Next.js, `apps/web`)       | Firebase App Hosting                                  | You, in step 8                    |
| `imagine-api`                       | Cloud Run, public                                     | Terraform                         |
| `imagine-gateway` (voice WebSocket) | Cloud Run, public, min 1 instance, session affinity   | Terraform                         |
| `imagine-builder` (world builder)   | Cloud Run, private, invoked by Cloud Tasks            | Terraform                         |
| Database                            | Firestore Native, `(default)`, `nam5`                 | Terraform                         |
| Generated assets                    | Cloud Storage bucket, public read, optional Cloud CDN | Terraform                         |
| Job queues                          | Cloud Tasks `world-builds` and `deletions`            | Terraform                         |
| Deletion retries                    | Cloud Scheduler, every 5 minutes                      | Terraform                         |
| AI models                           | Vertex AI, `us-central1` (game model on `global`)     | Terraform enables the API         |
| Stripe secrets                      | Secret Manager                                        | Terraform creates, you add values |
| Alerts, dashboard, uptime           | Cloud Monitoring                                      | Terraform                         |
| Sign-in                             | Firebase Authentication                               | You, in step 3                    |

The three backend services share **one container image** built from the root [`Dockerfile`](../../Dockerfile); Cloud Run starts a different entrypoint for each. All resources live in `us-central1`. Every service authenticates to Google with its own service account through Application Default Credentials; there are no API keys in the cloud.

The order matters because of three dependencies:

1. Cloud Build needs the Artifact Registry repository before it can push the image.
2. Terraform needs the image digest and the web app's final HTTPS address (for CORS and origin checks).
3. The web build needs the API and gateway URLs, because `NEXT_PUBLIC_*` values are compiled into the browser bundle.

Cloud Run and App Hosting URLs are predictable, so you choose the names up front (step 1) and every later step can use them.

## Before you start

**Tools on your machine**

| Tool             | Version            | Check                          |
| ---------------- | ------------------ | ------------------------------ |
| Google Cloud CLI | current            | `gcloud --version`             |
| Terraform        | 1.9 or later       | `terraform -version`           |
| Node.js          | 22.12 or later     | `node --version`               |
| pnpm             | 10.34.7            | `pnpm --version`               |
| Firebase CLI     | from the workspace | `pnpm exec firebase --version` |

Install workspace dependencies once with `pnpm install --frozen-lockfile`.

**Access you need**

- A Google Cloud billing account you can link to new projects.
- Permission to create projects, or an owner on an existing empty project.
- Admin access to the GitHub repository, so App Hosting can connect to it.
- Vertex AI access and quota for the configured models in that project. Model IDs are settings, not a guarantee that a project can call them.

**Decisions to make first**

- Two separate projects: one for staging, one for production. Never share a database between them.
- The App Hosting backend ID (for example `web`). It fixes the web address.
- A globally unique name for the assets bucket.
- Whether you will use a custom domain for the web app or for assets (both optional).

**Check the release first.** Deploy only a commit whose checks pass:

```sh
pnpm install --frozen-lockfile
node --test scripts/local.test.mjs scripts/env-contract.test.mjs
pnpm format:check
pnpm lint
pnpm typecheck
env -u FIRESTORE_EMULATOR_HOST -u FIREBASE_AUTH_EMULATOR_HOST pnpm test
NEXT_PUBLIC_FAKE=1 JUST_IMAGINE_SAMPLE_BUILD=1 pnpm build
```

The `ci` workflow on `main` runs the same checks plus the browser suite. A green run is the minimum bar; it does not prove microphone, model or production behaviour.

## Step 1: Set your names once

Open one terminal and keep it for the whole deployment. Set these variables, replacing every value in angle brackets:

```sh
export PROJECT_ID='<staging-project-id>'
export REGION='us-central1'
export BACKEND_ID='web'                               # App Hosting backend ID
export ASSET_BUCKET='<globally-unique-assets-bucket>'
export ENV_NAME='staging'                             # App Hosting environment name
```

If the project does not exist yet, create it and link billing:

```sh
gcloud projects create "$PROJECT_ID"
gcloud billing accounts list
gcloud billing projects link "$PROJECT_ID" --billing-account='<BILLING_ACCOUNT_ID>'
```

Sign in twice: once for the CLI and once for Application Default Credentials, which Terraform and the admin scripts use:

```sh
gcloud auth login
gcloud auth application-default login
gcloud config set project "$PROJECT_ID"
gcloud auth application-default set-quota-project "$PROJECT_ID"
```

Now derive the addresses every later step needs:

```sh
export PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
export API_URL="https://imagine-api-$PROJECT_NUMBER.$REGION.run.app"
export GATEWAY_URL="wss://imagine-gateway-$PROJECT_NUMBER.$REGION.run.app"
export WEB_URL="https://$BACKEND_ID--$PROJECT_ID.$REGION.hosted.app"
echo "$API_URL"; echo "$GATEWAY_URL"; echo "$WEB_URL"
```

Terraform builds the Cloud Run addresses the same way (`https://imagine-<service>-<project-number>.us-central1.run.app`). If you will serve the web app from a custom domain, set `WEB_URL` to that exact `https://` origin instead. Every origin check in the system compares against this one value.

## Step 2: Add Firebase to the project

```sh
pnpm exec firebase login
pnpm exec firebase projects:addfirebase "$PROJECT_ID"
```

Do **not** create the Firestore database in the console. Terraform creates `(default)` in `nam5` with deletion protection. If one already exists, import it into Terraform state before step 6 (`terraform import google_firestore_database.default "projects/$PROJECT_ID/databases/(default)"`).

## Step 3: Turn on sign-in and register the web app

In the Firebase console for this project, open **Authentication** and choose **Get started**. Then:

1. Under **Sign-in method**, enable **Email/Password** and **Google**. Parents use both; operators use email and password.
2. Under **Settings → Authorized domains**, add the host part of `WEB_URL` (for example `web--my-project.us-central1.hosted.app`) and any custom domain.

Register a web app and print its public configuration:

```sh
pnpm exec firebase apps:create WEB 'Just Imagine Web' --project "$PROJECT_ID"
pnpm exec firebase apps:sdkconfig WEB --project "$PROJECT_ID"
```

Keep the printed `apiKey`, `authDomain`, `projectId` and `appId` for step 8. These values are public by design; they identify the project to the browser and grant no access on their own.

## Step 4: Give Terraform a state bucket

The repository does not configure a Terraform backend. Store state in a versioned Cloud Storage bucket so it is shared and recoverable:

```sh
gcloud storage buckets create "gs://$PROJECT_ID-tfstate" \
  --location="$REGION" --uniform-bucket-level-access
gcloud storage buckets update "gs://$PROJECT_ID-tfstate" --versioning
```

Create `infra/terraform/backend.tf` with an empty backend block:

```hcl
terraform {
  backend "gcs" {}
}
```

Then initialise against this environment's bucket:

```sh
terraform -chdir=infra/terraform init \
  -backend-config="bucket=$PROJECT_ID-tfstate" \
  -backend-config="prefix=just-imagine"
```

When you later switch to the production project, run `init` again with `-reconfigure` and the production bucket. State, plans and `.tfvars` files can contain project details; the repository's `.gitignore` already excludes `*.tfstate`, `*.tfplan` and `*.tfvars`.

## Step 5: Write the environment's variables

Create `infra/terraform/staging.tfvars` (it is git-ignored):

```hcl
project_id   = "<staging-project-id>"
web_url      = "https://web--<staging-project-id>.us-central1.hosted.app"
asset_bucket = "<globally-unique-assets-bucket>"

# Leave billing off until Stripe test secrets exist (step 10).
enable_billing  = false
stripe_price_id = ""

# Optional: Monitoring channel IDs for alerts (step 10).
notification_channels = []

# Optional: a DNS name for Cloud CDN in front of the assets bucket (step 10).
asset_domain = ""
```

`web_url` must equal the `WEB_URL` you printed in step 1, with no trailing slash. The model IDs default to the project's standard set in [`variables.tf`](../../infra/terraform/variables.tf); override `models` here only if your project needs different ones.

## Step 6: Create the registry, build the image, apply Terraform

**6a. Create only the image registry.** On a brand-new project, Cloud Build has nowhere to push yet. Apply just the registry (and the APIs it depends on). This is the one time a targeted apply is used:

```sh
terraform -chdir=infra/terraform plan -var-file=staging.tfvars \
  -var='image=bootstrap-only' \
  -target=google_artifact_registry_repository.images -out=registry.tfplan
terraform -chdir=infra/terraform apply registry.tfplan
```

**6b. Build and push the services image.** Use a clean checkout of the commit you are releasing. Cloud Build uploads the working tree, and the tag records the Git revision:

```sh
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

The `service_urls` output must match the `API_URL` and gateway address from step 1. Apply creates the service accounts, Firestore, the assets bucket, both queues, the Scheduler job, Secret Manager entries, the three Cloud Run services and the Monitoring resources. Cloud Run services and Firestore have deletion protection; leave it on.

**6e. Publish the Firestore rules and indexes:**

```sh
pnpm exec firebase deploy --project "$PROJECT_ID" --only firestore:rules,firestore:indexes
```

## Step 7: Check the backend before the web app

```sh
curl -fsS "$API_URL/health" && echo ' api ok'
gcloud run services list --project "$PROJECT_ID" --region "$REGION"
```

All three services should show a ready revision. The builder is private, so an unauthenticated request to it returns 403; that is correct. Confirm the Cloud Tasks identity can invoke it:

```sh
gcloud run services get-iam-policy imagine-builder --region "$REGION" --project "$PROJECT_ID"
```

The policy should list `serviceAccount:imagine-tasks@$PROJECT_ID.iam.gserviceaccount.com` with `roles/run.invoker`. A health response proves the process started, not that models answer; step 9 tests that.

## Step 8: Deploy the web app on App Hosting

**8a. Add the build and runtime settings.** App Hosting reads [`apps/web/apphosting.yaml`](../../apps/web/apphosting.yaml) for every environment and an `apphosting.<environment>.yaml` file for one environment. Create `apps/web/apphosting.staging.yaml` with the values from steps 1 and 3:

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
```

These are all public values, so the file can be committed. The shared `apphosting.yaml` already sets `NEXT_PUBLIC_FAKE=0`. Never add `LOCAL_DEV`, emulator hosts, Admin credentials or Stripe keys. Commit and push the file before creating the backend.

**8b. Create the backend:**

```sh
pnpm exec firebase apphosting:backends:create --project "$PROJECT_ID" \
  --backend "$BACKEND_ID" --primary-region "$REGION" --root-dir apps/web
```

When prompted, connect GitHub, choose the `mubinui/just-imagine` repository, and set the live branch to `main` (or your release branch). The backend ID, region and root directory must match step 1, or `WEB_URL` will be wrong.

In the Firebase console, open the backend's **Settings → Environment** and set the environment name to `staging`, so the `apphosting.staging.yaml` file applies. App Hosting builds from the monorepo root, so the pnpm workspace and lockfile are available to the build.

**8c. Give the web runtime its permissions.** The web server is not only static pages: `/api/session` reads and writes family records and asks Firebase Auth to mint session cookies, and parent pages check for revoked sessions. Grant the App Hosting runtime identity access:

```sh
export WEB_SA="firebase-app-hosting-compute@$PROJECT_ID.iam.gserviceaccount.com"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$WEB_SA" --role='roles/datastore.user'
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$WEB_SA" --role='roles/firebaseauth.admin'
```

If you prefer least privilege, replace `roles/firebaseauth.admin` with a custom role holding `firebaseauth.users.get` and `firebaseauth.users.createSession`. Check the backend's settings for its actual service account; use that one if it differs.

**8d. Roll out.** Start a rollout from the console, or run:

```sh
pnpm exec firebase apphosting:rollouts:create "$BACKEND_ID" \
  --git-branch main --project "$PROJECT_ID"
```

Open `WEB_URL` when the rollout finishes. If the browser cannot reach the API or voice, the public URLs in the build are wrong; fix `apphosting.staging.yaml` and roll out again, because `NEXT_PUBLIC_*` values are fixed at build time.

## Step 9: Accept the staging release

**Make yourself an operator.** Sign up on the web app with email and password, then grant the operator claim (it refuses to touch a real project without `--yes`):

```sh
GOOGLE_CLOUD_PROJECT="$PROJECT_ID" \
  node scripts/grant-admin.mjs '<your-email>' --project "$PROJECT_ID" --yes
```

Sign out and back in, then open `/admin`. Operator → System holds the audited kill switch that stops new sessions and builds.

**Optional demo school data (staging only):**

```sh
GOOGLE_CLOUD_PROJECT="$PROJECT_ID" node scripts/seed-schools.mjs --staging
```

**Walk through the product with a synthetic family**, never a real child:

- [ ] Parent signs up with email and with Google, gives consent, creates a child profile.
- [ ] Child picks a profile; Studio loads; the first voice reply arrives.
- [ ] A spoken idea becomes a world; the world loads from Firestore and its assets load from the bucket.
- [ ] Voice ends cleanly, and reconnects after a network drop.
- [ ] Learn, Stories and the gallery open; a learning game plays.
- [ ] A teacher copies, publishes and grades a lesson (if schools are in scope).
- [ ] Deleting the child removes their data; the `deletions` queue drains.
- [ ] Operator pages load without showing child names.
- [ ] Cloud Monitoring shows the dashboard and the uptime checks for the web app and API.

## Step 10: Optional features

**Alerts.** Create a notification channel, then put its ID in `notification_channels` and apply again:

```sh
gcloud beta monitoring channels create --project "$PROJECT_ID" \
  --display-name='Just Imagine on-call' --type=email \
  --channel-labels=email_address='<on-call-email>'
gcloud beta monitoring channels list --project "$PROJECT_ID" --format='value(name)'
```

**Billing (Stripe test mode only).** The release rejects live Stripe keys and events. Add the secret values, then set `enable_billing = true` and `stripe_price_id` in the `.tfvars` file and apply:

```sh
printf '%s' '<sk_test_...>' | gcloud secrets versions add stripe-secret-key --data-file=- --project "$PROJECT_ID"
printf '%s' '<whsec_...>'   | gcloud secrets versions add stripe-webhook-secret --data-file=- --project "$PROJECT_ID"
```

**Cloud CDN for assets.** Set `asset_domain` to a hostname you control and apply. Point that hostname's DNS `A` record at the `assets_ip` output. The managed certificate becomes active only after DNS resolves, which can take a while; assets keep using `storage.googleapis.com` until you switch.

**Custom web domain.** Add it under App Hosting → Settings → Domains, add it to Firebase Auth authorized domains, change `web_url` in the `.tfvars` file and `WEB_URL` in `apphosting.<env>.yaml` to the new origin, then apply Terraform and roll out the web app again.

**Nightly model evaluations.** The `builder-evaluations` workflow runs a billable evaluation against staging Vertex AI each night. It needs a GitHub environment named `staging` with the variables `GCP_PROJECT_ID`, `SCENE_MODEL`, `FAST_MODEL`, `WIF_PROVIDER` (a Workload Identity Federation provider for this repository) and `EVAL_SERVICE_ACCOUNT` (a service account with `roles/aiplatform.user`). Until those exist, the scheduled job fails at its configuration check.

## Step 11: Promote to production

Production is a separate project that receives the **same image digest** staging accepted. Nothing is rebuilt.

1. Repeat steps 1 to 5 for the production project, with its own names, state bucket and `production.tfvars`. Run `terraform init -reconfigure` with the production bucket.
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
4. Create the production App Hosting backend (step 8) with an `apphosting.production.yaml`, and roll out the **same Git commit** staging accepted.
5. Run step 9's checks with a synthetic production family.

**Later backend releases** use [`cloudbuild.promote.yaml`](../../cloudbuild.promote.yaml). Create a manual Cloud Build trigger in the production project that uses this file, requires approval, and takes `_IMAGE_DIGEST` as a substitution. Its build service account needs `roles/run.admin`, plus `roles/iam.serviceAccountUser` on the three `imagine-*` service accounts. The file refuses anything that is not an `@sha256:` digest. After each promotion, update the digest in `production.tfvars` so the next Terraform plan shows no drift.

## Rolling back

Before every release, write down the current Cloud Run revisions and the current App Hosting rollout:

```sh
gcloud run revisions list --service imagine-api --region "$REGION" --project "$PROJECT_ID"
```

To return a service to a known good revision:

```sh
gcloud run services update-traffic imagine-api \
  --project "$PROJECT_ID" --region "$REGION" \
  --to-revisions='<PREVIOUS_GOOD_REVISION>=100'
```

Repeat for `imagine-gateway` and `imagine-builder` as needed, and roll the web app back to the matching rollout in the App Hosting console. Check first that stored lessons, attempts, jobs and generated worlds are still readable by the older code. Never restore old database documents over current user data.

## Troubleshooting

| Symptom                                 | Check first                                                                                                     |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Cloud Build cannot push the image       | Step 6a ran; the build service account has `roles/artifactregistry.writer`                                      |
| Terraform says Firestore already exists | Import it (step 2) instead of creating a second database                                                        |
| Browser shows CORS or origin errors     | `web_url` in `.tfvars`, `WEB_URL` in App Hosting and the address bar are the exact same origin                  |
| Sign-in popup fails                     | The web host is in Firebase Auth authorized domains; Google provider is enabled                                 |
| Parent session fails after sign-in      | App Hosting runtime identity has the step 8c roles; the Firebase config belongs to this project                 |
| Web calls the wrong API or gateway      | Fix `apphosting.<env>.yaml` and roll out again; public URLs are fixed at build time                             |
| Voice never connects                    | Gateway URL uses `wss://`; `WEB_URL` matches the page origin; the gateway revision is ready                     |
| Worlds stay "building"                  | `world-builds` queue, the `imagine-tasks` invoker grant on the builder, and builder logs for the job ID         |
| AI unavailable or timing out            | Vertex AI model access and quota in `us-central1` (and `global` for the game model); the error category in logs |
| Deletion stays pending                  | `deletions` queue, the Scheduler job's runs, and `/internal/deletions` logs on the API                          |
| No alerts arrive                        | `notification_channels` is set and Terraform was applied after setting it                                       |

When collecting evidence for an incident, keep job IDs, error categories and timings. Never copy keys, tokens, transcripts, child photos or audio into logs or tickets.
