import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('both world and story queue defaults refer to a provisioned Cloud Tasks queue', () => {
  const terraform = source('infra/terraform/main.tf');
  const queues = terraform.match(
    /resource "google_cloud_tasks_queue" "queue" \{\s*for_each = toset\(\[([^\]]+)\]\)/,
  )?.[1];
  assert.ok(queues, 'Terraform must provision the shared build queue');
  for (const service of ['api', 'gateway']) {
    const queue = source(`services/${service}/src/main.ts`).match(
      /BUILDER_QUEUE: z\.string\(\)\.default\('([^']+)'\)/,
    )?.[1];
    assert.ok(queue, `${service} must define its build queue default`);
    assert.ok(queues.includes(`"${queue}"`), `${service} build queue must exist in Terraform`);
  }
  const apiQueue = source('services/api/src/tasks.ts');
  assert.match(apiQueue, /url: `\$\{config\.url\}\/jobs`/);
  assert.match(
    source('services/builder/src/main.ts'),
    /StoryBuildJobSchema\.safeParse\(input\)\.success/,
  );
});

test('the deployed API opts into its existing Vertex adapters and has the scoped Vertex role', () => {
  const terraform = source('infra/terraform/main.tf');
  const vertex = terraform.match(
    /resource "google_project_iam_member" "vertex" \{([\s\S]*?)\n\}/,
  )?.[1];
  assert.ok(vertex);
  assert.match(vertex, /for_each = toset\(\[[^\]]*"api"[^\]]*\]\)/);
  assert.match(vertex, /role\s*= "roles\/aiplatform\.user"/);
  assert.match(terraform, /each\.key == "api" \? \{ COMPANION_VERTEX = "1" \} : \{\}/);
  assert.doesNotMatch(terraform, /GEMINI_API_KEY\s*=/);
});

test('ADC student custom tokens can sign only as the API identity using the enabled IAM Credentials API', () => {
  const terraform = source('infra/terraform/main.tf');
  assert.match(source('services/api/src/school/login.ts'), /adminAuth\(\)\.createCustomToken\(uid/);
  assert.match(
    source('packages/server-core/src/firebase.ts'),
    /initializeApp\(projectId \? \{ projectId \} : \{\}\)/,
  );
  assert.match(terraform, /apis = toset\(\[[^\]]*"iamcredentials\.googleapis\.com"/);
  const signer = terraform.match(
    /resource "google_service_account_iam_member" "api_custom_token_signer" \{([\s\S]*?)\n\}/,
  )?.[1];
  assert.ok(signer, 'Student token signing must use a service-account-scoped grant');
  assert.match(signer, /service_account_id\s*= google_service_account\.service\["api"\]\.name/);
  assert.match(
    signer,
    /member\s*= "serviceAccount:\$\{google_service_account\.service\["api"\]\.email\}"/,
  );
  assert.match(signer, /role\s*= "roles\/iam\.serviceAccountTokenCreator"/);
  assert.doesNotMatch(signer, /for_each/);
  for (const binding of terraform.matchAll(
    /resource "google_project_iam_(?:member|binding)" "[^"]+" \{([\s\S]*?)\n\}/g,
  ))
    assert.doesNotMatch(binding[1], /roles\/iam\.serviceAccountTokenCreator/);
  assert.match(
    terraform,
    /depends_on = \[[^\]]*google_service_account_iam_member\.api_custom_token_signer/,
  );
});

test('local model overrides remain server-only and all compose-interpolated models are in the public template', () => {
  const template = source('.env.example');
  const keys = [...template.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((match) => match[1]);
  assert.ok(keys.includes('GEMINI_API_KEY'));
  assert.doesNotMatch(template, /^GEMINI_API_KEY=.+$/m);
  assert.equal(
    keys.some((key) => key.startsWith('NEXT_PUBLIC_')),
    false,
  );
  const compose = source('compose.local.yaml');
  for (const match of compose.matchAll(/\$\{([A-Z][A-Z0-9_]*):-/g))
    assert.ok(keys.includes(match[1]), `${match[1]} must be discoverable in .env.example`);
  assert.match(compose, /LIVE_MODEL: \$\{LIVE_MODEL:-/);
  assert.match(compose, /ports: \['127\.0\.0\.1:3300:3300'\]/);
  assert.match(compose, /volumes:\n  firebase-data:\n  world-assets:/);
});
