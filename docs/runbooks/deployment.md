# Deployment preparation

No cloud resources have been created by this implementation session.

1. Create/choose separate staging and production Google Cloud projects and attach billing. Configure Firebase parent Auth (Google and email/password) and Firebase App Hosting root `apps/web`. Keep the projects separate; use distinct Terraform state backends/workspaces.
2. Review `infra/terraform`. Supply project_id, web_url, asset_bucket and an immutable image digest. It enables APIs, creates regional services, Firestore nam5, US assets, service identities, queues, secret containers and deletion maintenance. It intentionally does not supply secret values. CloudRun service deletion protection and Firestore prevent-destroy are enabled.
3. Build the service image with CloudBuild; the Dockerfile bundles all service entrypoints. Use a bootstrap image only during initial resource bring-up, then deploy the reviewed immutable digest. api and builder share the image with separate entrypoints.
4. Configure model IDs only after checking their actual availability in Vertex AI us-central1. Defaults preserve the design spec but have not been exercised. ADC is server-only. Run a real live-speech smoke and generated-scene/image evaluation before admitting users.
5. Add Stripe TEST key/webhook secret to SecretManager. Create the $9.99/month Family price and configure its ID. Enable billing only after secret versions exist. Register the API webhook for checkout completion and subscription update/delete. The app rejects live Stripe keys/events in this release.
6. Deploy Firestore rules/indexes from the repository. Configure App Hosting env and runtime identity access for session verification/account bootstrap. Set web URL exactly in API/gateway CORS and Firebase authorized domains. Verify HttpOnly session cookie and recent-auth consent checks on the deployed HTTPS origin.
7. Run the full test suite and browser tests against staging, then real voice/build/handoff/billing/deletion smoke tests. Use synthetic audio and dedicated test accounts for the k6 scenario; never capture real audio.
8. Require GitHub `ci` before merging. Promote the same tested image digest to production only through a separately approved release. CloudBuild here builds images; it does not silently promote production.

## Incident controls

Set `config/runtime` to `{killSwitch:true,updatedAt:<epoch-ms>}` to block new sessions/builds. Existing sessions may finish. Watchers/read checks fail closed on invalid configuration. Stop generation before investigating model failures; retain only identifiers and aggregate timings in logs.

Deletion failures: inspect `deletionJobs` status and the scheduler/task retry logs, then rerun authenticated `/internal/deletions`. The worker is idempotent and tolerates already-absent Firebase identities. Keep the deletion fence present while retrying.

Rollback: shift CloudRun traffic to the previous verified revision and restore the last web version; do not roll back database documents blindly. Generated worlds carry schemaVersion/promptVersion/styleVersion. Keep schema compatibility while rolling code back.

## Remaining deployment gates

A credentialed Terraform plan/apply, actual CloudRun URL/IAM checks, CDN/custom-domain setup, telemetry dashboards/alerts, real-model evals, 200-session load result, iPad/Safari performance, child usability feedback and production launch are not proven by local builds. The checkpoint is the current authority on implementation gaps.

## Operations source and promotion

Terraform now includes Cloud Trace writer roles, log-based metrics, alert policies, uptime checks, an operations dashboard and optional HTTPS Cloud CDN (`asset_domain`). Supply existing Monitoring `notification_channels` so alerts reach an operator; empty channels create policies without delivery. Set the CDN DNS A record to `assets_ip` and wait for the managed certificate before using that hostname. App Hosting settings are in `apps/web/apphosting.yaml`; environment-specific public Firebase/API/gateway variables must be supplied before its build.

Cloud Build `cloudbuild.promote.yaml` accepts only `_IMAGE_DIGEST` containing a SHA256 digest and updates the three service revisions. Create distinct staging and production triggers and require approval on the production trigger. The production project must be allowed to pull the tested staging image (or copy the identical digest into its registry). Apply rules/indexes and the matching App Hosting release as part of the same reviewed release; retain the digest in Terraform variables to avoid drift. These triggers, approval policies and project grants have not been configured from this workspace.

Telemetry is enabled by `OTEL_ENABLED=1` in deployed services. Events contain only operational IDs, hashed child IDs, counts, status and timing; model text/audio are never logged. The first-audio event measures from completed input transcription to first output frame, a backend proxy that excludes client capture/playback delay. The k6 text-to-first-audio probe includes moderation and model response, and uses silent synthetic PCM for sustained transport load. Neither substitutes for a real-device speech end-to-playback latency measurement. A load run fails when sessions never produce audio rather than reporting an empty successful latency distribution.
