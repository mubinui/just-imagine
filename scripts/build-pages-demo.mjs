// Builds the UI-only demo for GitHub Pages: the web app in fake mode (sample worlds, no
// microphone, no payments) as static files served under a sub-path.
//
//   node scripts/build-pages-demo.mjs <output-dir> [base-path]
//
// It works on a throwaway git worktree of HEAD, so the working tree is never touched. Pages that
// need the live service cannot be exported and are left out: the server routes, the operator
// console and the per-lesson pages. Next.js prefixes its own links and scripts with the base
// path; files from public/ are referenced as root paths in code and CSS, so those are rewritten
// in the exported output.
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const [outArg, basePath = '/just-imagine/demo'] = process.argv.slice(2);
if (!outArg) {
  console.error('Usage: node scripts/build-pages-demo.mjs <output-dir> [base-path]');
  process.exit(1);
}
if (!/^\/[\w/-]+[^/]$/.test(basePath)) {
  console.error(
    'The base path must start with / and not end with one, for example /just-imagine/demo.',
  );
  process.exit(1);
}
const out = resolve(outArg);
const repo = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const tree = mkdtempSync(join(tmpdir(), 'just-imagine-demo-'));
const run = (cmd, args, cwd, env = {}) =>
  execFileSync(cmd, args, { cwd, stdio: 'inherit', env: { ...process.env, ...env } });

try {
  run('git', ['worktree', 'add', '--detach', tree, 'HEAD'], repo);
  run('pnpm', ['install', '--frozen-lockfile', '--prefer-offline'], tree);
  const web = join(tree, 'apps/web');

  for (const dir of ['app/api', 'app/admin', 'app/theme-manifest', 'test', 'e2e'])
    rmSync(join(web, dir), { recursive: true, force: true });
  for (const group of ['app/(school)', 'app/(study)']) removeDynamicRoutes(join(web, group));

  const configPath = join(web, 'next.config.ts');
  const config = readFileSync(configPath, 'utf8');
  const anchor = 'const config: NextConfig = {';
  if (!config.includes(anchor)) throw new Error('next.config.ts no longer has the expected shape.');
  writeFileSync(
    configPath,
    config.replace(
      anchor,
      `${anchor}\n  output: 'export',\n  basePath: '${basePath}',\n  trailingSlash: true,\n  images: { unoptimized: true },`,
    ),
  );

  run('pnpm', ['--filter', '@just-imagine/web', 'build'], tree, { NEXT_PUBLIC_FAKE: '1' });

  const exported = join(web, 'out');
  const publicDirs = readdirSync(join(web, 'public')).filter((name) =>
    statSync(join(web, 'public', name)).isDirectory(),
  );
  // public/learn holds art and sounds while /learn/... is also a page route, so only its asset
  // folders are rewritten.
  const learnAssets = readdirSync(join(web, 'public/learn')).filter((name) =>
    statSync(join(web, 'public/learn', name)).isDirectory(),
  );
  const roots = publicDirs.filter((name) => name !== 'learn');
  const pattern = new RegExp(
    `(?<=["'\`(])/(?=(?:${roots.join('|')}|learn/(?:${learnAssets.join('|')}))/)`,
    'g',
  );
  let rewritten = 0;
  for (const file of walk(exported)) {
    if (!/\.(html|js|css|txt|json|webmanifest)$/.test(file)) continue;
    const text = readFileSync(file, 'utf8');
    const next = text.replace(pattern, () => (rewritten++, basePath + '/'));
    if (next !== text) writeFileSync(file, next);
  }

  rmSync(out, { recursive: true, force: true });
  cpSync(exported, out, { recursive: true });
  writeFileSync(join(out, '.nojekyll'), '');
  console.log(`Demo written to ${out} (${rewritten} asset paths prefixed with ${basePath}).`);
} finally {
  run('git', ['worktree', 'remove', '--force', tree], repo);
}

function removeDynamicRoutes(dir) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (!statSync(path).isDirectory()) continue;
    if (name.startsWith('[')) rmSync(path, { recursive: true, force: true });
    else removeDynamicRoutes(path);
  }
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* walk(path);
    else yield path;
  }
}
