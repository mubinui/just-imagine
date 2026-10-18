# UI demo

This branch is `main` plus the static UI demo published at https://mubinui.github.io/just-imagine/demo/. It is never deployed to Google Cloud: production builds and releases come from `main` only.

The demo is the web app in sample mode: authored sample worlds and a sample explorer, with no sign-in, voice, payments or model calls. Pages that need the live service are left out of the static build: the server routes, the operator console and the per-lesson pages.

## Update the demo

1. Bring the branch up to date with production code:

   ```sh
   git switch demo
   git merge main
   ```

2. Build the static site. The script works on a throwaway worktree of `HEAD`, so the working tree is not touched:

   ```sh
   node scripts/build-pages-demo.mjs ../demo-out /just-imagine/demo
   ```

3. Copy `../demo-out` into `just-imagine/demo/` of the `mubinui.github.io` repository, commit and push. That site keeps a root `.nojekyll` file so GitHub Pages serves the demo's `_next` folder.

Keep demo-only changes on this branch. Anything production needs belongs on `main` first, then reaches this branch through the merge.
