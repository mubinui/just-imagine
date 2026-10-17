# Development entry points

Use the maintained guides below; this page keeps older development links working.

- [Root README](../../README.md#run-locally): clone, install and start the complete local Docker app.
- [Local operation and private account setup](../handoff/local-development.md): parent, school and operator access without shared credentials in documentation.
- [Web README](../../apps/web/README.md): fixture preview and frontend/browser checks.
- [DevOps guide](deployment.md): environment boundaries, isolated tests, staging, deployment, rollback and troubleshooting.
- [Checkpoint](../../CHECKPOINT.md): current verification evidence and unresolved acceptance limits.

The complete local app is **http://localhost:3300**. The fixture preview is **http://localhost:3100**. They are separate modes; public web variables are fixed at build time.

Host development uses Node 22.12+, pnpm 10.34.7 and Java 21 for Firebase tests. The disposable test runners own ports **8085/9095**; the saved Docker app uses **8080/9099**. Keep tests off saved local or real user databases.

Preserve private `.env.*` files, Docker volumes and existing identities. Logs and review artifacts should contain operational identifiers/status/timing only, without credentials, transcripts or raw audio. Local package/browser checks do not establish cloud deployment or fresh generated-world acceptance.
