# Firebase Hosting in front of the web app

`firebase.json` sends every request to the `imagine-web` Cloud Run service. Hosting's CDN keeps
the responses whose `Cache-Control` allows it (static art, sound, fonts and `/_next/static`) at
edges near the visitor; signed-in pages are `no-store` and always reach Cloud Run. Only the
`__session` cookie is forwarded, which is the one the web app uses.

The `predeploy` step copies `apps/web/public` into `public/` (git-ignored), so Hosting serves the
art, sound and fonts itself. Static files are cached at the edge once for every visitor, whereas
responses from Cloud Run are cached per `__session` cookie. Everything else goes to Cloud Run.
Deploy with:

```sh
pnpm exec firebase deploy --only hosting --project "$PROJECT_ID"
```
