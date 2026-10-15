# Plan 0: Foundation and Contracts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the monorepo and every shared contract (Scene DSL schema and validator, WebSocket and job protocols, Firestore document schemas, REST contract, fixtures and fakes, server-core helpers, CI) so Dev A and Dev B can build their modules against each other's fakes from week 2.

**Architecture:** Four shared packages. `scene-schema` owns the Scene DSL (Zod schema, deterministic physics validator, JSON Patch application, Gemini JSON-schema export, migrations). `protocol` owns everything else that crosses a boundary (WebSocket messages, builder job payloads, Firestore documents, REST shapes, plan limits, character config). `fixtures` holds sample worlds, synthetic audio, a scripted fake world source, and a fake gateway WebSocket server. `server-core` wraps Firebase Admin for the three Node services.

**Tech Stack:** pnpm 10, Turborepo 2, TypeScript 5.9, Zod 4, Vitest 3, ESLint 9 flat config with typescript-eslint, `fast-json-patch`, `ws`, `ulid`, `firebase-admin`, Firebase emulators, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-15-just-imagine-design.md` (sections 5, 8.10, 10, 11, 16, 17). Global constraints and review focus: `docs/superpowers/plans/2026-10-15-just-imagine-master.md`.

## Global Constraints

See the master plan. Additional constraints for this plan:

- Package names are `@just-imagine/<dir>`. Every package has `test`, `typecheck`, and `lint` scripts.
- Tests live in `test/` next to `src/` and are named `<unit>.test.ts`.
- No package in this plan imports from `apps/` or `services/`.
- `scene-schema` has no Node-only dependencies (it runs in the browser). `protocol` depends only on `zod` and `scene-schema`. `fixtures` may depend on `ws` because it is dev-only. `server-core` is Node-only.

## Review Focus

Spec-implied inputs that the module plans do not test and that this plan's tests must pin:

1. **A patch that removes the hero entity.** Expected: `applyScenePatch` returns `ok: false` with `HERO_MISSING`. Pinned in Task 7.
2. **A document whose `schemaVersion` is newer than the library.** Expected: `migrateScene` returns `NEWER_THAN_SUPPORTED`; nothing tries to render it. Pinned in Task 8.
3. **A generated scene with two materials named the same.** Expected: `fromGenerated` keeps the last one and `validateScene` still passes or fails deterministically; `GeneratedSceneSchema` rejects duplicate names. Pinned in Task 3.
4. **A binary WebSocket frame whose length is not a multiple of 2 bytes.** Expected: `splitPcm16Frames` throws rather than producing a half sample. Pinned in Task 12.
5. **Two concurrent `reserveWorld` calls at the last unit of quota.** Expected: exactly one succeeds. Pinned in Task 16.

---

## File structure

```
just-imagine/
  package.json                      workspace root: scripts, turbo, prettier
  pnpm-workspace.yaml
  turbo.json
  .gitignore  .nvmrc  .prettierrc  .editorconfig  README.md
  firebase.json                     emulator ports (Firestore 8080, Auth 9099)
  .github/workflows/ci.yml          lint, typecheck, test on every PR
  packages/config/
    package.json  tsconfig.base.json  eslint.config.base.js
  packages/scene-schema/
    src/index.ts                    re-exports
    src/concepts.ts                 CONCEPTS, DIALS, presets
    src/limits.ts                   LIMITS constants
    src/schema.ts                   Zod schemas and inferred types for SceneDoc
    src/gen.ts                      GeneratedSceneSchema (what the model emits) and fromGenerated
    src/materials-table.ts          reference ranges and lookupMaterialRange
    src/blocklist.ts                BLOCKED_TERMS and findBlockedTerm
    src/validator.ts                validateScene and Issue types
    src/patch.ts                    PatchOpSchema and applyScenePatch
    src/json-schema.ts              generatedSceneJsonSchema, patchOpsJsonSchema, toGeminiJsonSchema
    src/migrate.ts                  CURRENT_SCHEMA_VERSION and migrateScene
    test/helpers.ts                 minimalScene()
    test/*.test.ts
  packages/protocol/
    src/index.ts
    src/plans.ts                    PlanTierSchema, PLAN_LIMITS
    src/characters.ts               CharacterIdSchema, CHARACTERS, EmotionSchema
    src/ws.ts                       ClientMessageSchema, ServerMessageSchema, audio constants, codecs
    src/jobs.ts                     BuildWorldJobSchema, PatchWorldJobSchema, BuilderJobSchema
    src/firestore.ts                document schemas, paths, yyyymmdd
    src/rest.ts                     ROUTES and request/response schemas
    src/world-source.ts             WorldSource interface
    test/*.test.ts
  packages/fixtures/
    worlds/jelly-dragon.json  worlds/moon-bounce.json  worlds/pond-float.json
    scenarios/jelly-dragon.json     fake gateway script
    src/index.ts                    typed exports of worlds and scenarios
    src/audio.ts                    pcm16Tone, splitPcm16Frames
    src/fake-world-source.ts        FakeWorldSource
    src/fake-gateway.ts             startFakeGateway
    bin/fake-gateway.ts             CLI entry
    test/*.test.ts
  packages/server-core/
    src/index.ts
    src/firebase.ts                 getAdminApp, db, auth
    src/auth.ts                     verifyIdToken, AuthError
    src/docs.ts                     readDoc, writeDoc, updateDoc (Zod-checked)
    src/ids.ts                      newId
    src/quota.ts                    reserveWorld, addVoiceSeconds, voiceSecondsRemaining, addImages, QuotaExceeded
    src/kill-switch.ts              isKillSwitchOn, watchKillSwitch
    test/*.test.ts                  run under the Firestore and Auth emulators
```

---

### Task 1: Monorepo scaffold

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.gitignore`, `.nvmrc`, `.prettierrc`, `.editorconfig`, `README.md`
- Create: `packages/config/package.json`, `packages/config/tsconfig.base.json`, `packages/config/eslint.config.base.js`

**Interfaces:**
- Produces: `@just-imagine/config/tsconfig.base.json` and `@just-imagine/config/eslint` consumed by every other package's `tsconfig.json` and `eslint.config.js`.

- [ ] **Step 1: Create the root files**

`package.json`:

```json
{
  "name": "just-imagine",
  "private": true,
  "engines": { "node": ">=22.12.0" },
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev --parallel",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  },
  "devDependencies": {
    "prettier": "^3.6.0",
    "turbo": "^2.5.0",
    "typescript": "^5.9.0"
  }
}
```

`pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "services/*"
  - "packages/*"
```

`turbo.json`:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**", "!.next/cache/**"] },
    "test": { "dependsOn": ["^build"] },
    "lint": {},
    "typecheck": { "dependsOn": ["^build"] },
    "dev": { "cache": false, "persistent": true }
  }
}
```

`.gitignore`:

```
node_modules/
dist/
.next/
.turbo/
coverage/
*.log
.env
.env.*
!.env.example
firebase-debug.log
firestore-debug.log
ui-debug.log
.DS_Store
```

`.nvmrc`: `22`

`.prettierrc`:

```json
{ "singleQuote": true, "trailingComma": "all", "printWidth": 100, "semi": true }
```

`.editorconfig`:

```
root = true
[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
insert_final_newline = true
```

`README.md` already exists at the repo root with the project overview and a Setup section; leave it as it is.

- [ ] **Step 2: Create the config package**

`packages/config/package.json`:

```json
{
  "name": "@just-imagine/config",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    "./tsconfig.base.json": "./tsconfig.base.json",
    "./eslint": "./eslint.config.base.js"
  },
  "dependencies": {
    "@eslint/js": "^9.30.0",
    "eslint": "^9.30.0",
    "typescript-eslint": "^8.40.0"
  }
}
```

`packages/config/tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "allowImportingTsExtensions": false,
    "noEmit": true,
    "sourceMap": true
  }
}
```

`packages/config/eslint.config.base.js`:

```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { ignores: ['**/dist/**', '**/.next/**', '**/node_modules/**', '**/*.config.*'] },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
);
```

- [ ] **Step 3: Install and verify the empty workspace runs**

Run:

```bash
corepack enable && corepack use pnpm@latest-10
pnpm install
pnpm turbo run typecheck
```

Expected: `pnpm install` succeeds and writes `pnpm-lock.yaml` and a `packageManager` field; turbo reports no tasks matched (there are no packages with a `typecheck` script yet). Both are correct at this point.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: scaffold pnpm and turborepo monorepo with shared config"
```

---

### Task 2: Scene DSL schema

**Files:**
- Create: `packages/scene-schema/package.json`, `packages/scene-schema/tsconfig.json`, `packages/scene-schema/eslint.config.js`, `packages/scene-schema/vitest.config.ts`
- Create: `packages/scene-schema/src/concepts.ts`, `packages/scene-schema/src/limits.ts`, `packages/scene-schema/src/schema.ts`, `packages/scene-schema/src/index.ts`
- Test: `packages/scene-schema/test/helpers.ts`, `packages/scene-schema/test/schema.test.ts`

**Interfaces:**
- Produces (consumed by every other plan):
  - `CONCEPTS: readonly Concept[]`, `type Concept`, `DIALS`, `type Dial`, `GRAVITY_PRESETS`, `WIND_PRESETS`
  - `LIMITS`
  - `SceneDocSchema`, `type SceneDoc`, `EntitySchema`, `type Entity`, `MaterialSchema`, `type Material`, `BehaviorSchema`, `type Behavior`, `JointSchema`, `type Joint`, `RuleSchema`, `type Rule`, `ActionSchema`, `type Action`, `AssetRefSchema`, `type AssetRef`, `ConceptSchema`, `DialSchema`, `LearningSchema`, `type Learning`

- [ ] **Step 1: Create the package files**

`packages/scene-schema/package.json`:

```json
{
  "name": "@just-imagine/scene-schema",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "lint": "eslint ."
  },
  "dependencies": {
    "fast-json-patch": "^3.1.1",
    "zod": "^4.1.0"
  },
  "devDependencies": {
    "@just-imagine/config": "workspace:*",
    "@types/node": "^22.15.0",
    "eslint": "^9.30.0",
    "typescript": "^5.9.0",
    "vitest": "^3.2.0"
  }
}
```

`packages/scene-schema/tsconfig.json`:

```json
{
  "extends": "@just-imagine/config/tsconfig.base.json",
  "compilerOptions": { "types": ["node"] },
  "include": ["src", "test"]
}
```

`packages/scene-schema/eslint.config.js`:

```js
export { default } from '@just-imagine/config/eslint';
```

`packages/scene-schema/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['test/**/*.test.ts'], environment: 'node' } });
```

- [ ] **Step 2: Write the test helper and the failing schema tests**

`packages/scene-schema/test/helpers.ts`:

```ts
import type { SceneDoc } from '../src/schema';

export function minimalScene(): SceneDoc {
  return {
    schemaVersion: 1,
    worldId: 'w_test',
    title: 'Test World',
    theme: {
      paletteHint: 'pastel',
      timeOfDay: 'day',
      backdropDescription: 'a sunny meadow with soft hills',
      backdrop: { url: '', width: 1920, height: 1080, status: 'placeholder' },
    },
    environment: {
      gravity: { x: 0, y: 9.81 },
      wind: { x: 0, y: 0 },
      medium: 'air',
      bounds: { width: 16, height: 9 },
      seed: 1,
    },
    materials: {
      grass: { density: 1, friction: 0.8, restitution: 0.1, softness: 0, buoyant: false, breakable: false, pretend: false },
      rubber: { density: 1.1, friction: 0.8, restitution: 0.8, softness: 0.2, buoyant: false, breakable: false, pretend: false },
    },
    entities: [
      {
        id: 'ground',
        kind: 'ground',
        name: 'meadow',
        description: 'green meadow ground',
        body: { shape: 'box', material: 'grass', isStatic: true, size: { width: 16, height: 1 } },
        transform: { x: 8, y: 8.5, rotation: 0 },
        tags: ['ground'],
        behaviors: [],
        pretend: false,
      },
      {
        id: 'ball',
        kind: 'sprite',
        name: 'bouncy ball',
        description: 'red rubber bouncy ball',
        body: { shape: 'circle', material: 'rubber', isStatic: false, size: { width: 1, height: 1 } },
        transform: { x: 8, y: 2, rotation: 0 },
        tags: ['ball', 'hero'],
        behaviors: [],
        pretend: false,
      },
    ],
    joints: [],
    rules: [
      {
        id: 'r_bounce',
        when: { event: 'collision', a: 'hero', b: 'ground', minImpulse: 1 },
        then: [{ action: 'sound', cue: 'boing' }],
        concept: 'bounce',
        once: true,
      },
    ],
    learning: {
      concepts: ['bounce', 'gravity'],
      prediction: { question: 'Will the ball bounce or stop?', options: ['bounce', 'stop'], correctIndex: 0, concept: 'bounce' },
      dials: ['gravity'],
      heroEntityId: 'ball',
    },
    narration: { intro: 'Here is a bouncy ball. Tap it!' },
  };
}
```

`packages/scene-schema/test/schema.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { SceneDocSchema } from '../src/schema';
import { LIMITS } from '../src/limits';
import { minimalScene } from './helpers';

describe('SceneDocSchema', () => {
  it('accepts a minimal valid scene', () => {
    expect(SceneDocSchema.safeParse(minimalScene()).success).toBe(true);
  });

  it('rejects more than the entity limit', () => {
    const doc = minimalScene();
    const template = doc.entities[1]!;
    doc.entities = Array.from({ length: LIMITS.maxEntities + 1 }, (_, i) => ({ ...template, id: `e${i}` }));
    expect(SceneDocSchema.safeParse(doc).success).toBe(false);
  });

  it('rejects an uppercase entity id', () => {
    const doc = minimalScene();
    doc.entities[1]!.id = 'Ball';
    expect(SceneDocSchema.safeParse(doc).success).toBe(false);
  });

  it('rejects an unknown behavior type', () => {
    const doc = minimalScene() as unknown as { entities: { behaviors: unknown[] }[] };
    doc.entities[1]!.behaviors.push({ type: 'teleport' });
    expect(SceneDocSchema.safeParse(doc).success).toBe(false);
  });

  it('rejects bounds other than 16 by 9', () => {
    const doc = minimalScene() as unknown as { environment: { bounds: { width: number } } };
    doc.environment.bounds.width = 20;
    expect(SceneDocSchema.safeParse(doc).success).toBe(false);
  });

  it('rejects a schemaVersion other than 1', () => {
    const doc = { ...minimalScene(), schemaVersion: 2 };
    expect(SceneDocSchema.safeParse(doc).success).toBe(false);
  });

  it('rejects a material density above the limit', () => {
    const doc = minimalScene();
    doc.materials['rubber']!.density = LIMITS.density.max + 1;
    expect(SceneDocSchema.safeParse(doc).success).toBe(false);
  });

  it('rejects a prediction with one option', () => {
    const doc = minimalScene();
    doc.learning.prediction.options = ['only'];
    expect(SceneDocSchema.safeParse(doc).success).toBe(false);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm install && pnpm --filter @just-imagine/scene-schema test`
Expected: FAIL, "Cannot find module '../src/schema'".

- [ ] **Step 4: Write the schema**

`packages/scene-schema/src/concepts.ts`:

```ts
export const CONCEPTS = [
  'gravity', 'mass', 'buoyancy', 'friction', 'bounce', 'momentum',
  'airResistance', 'balance', 'springiness', 'density', 'force', 'speed',
] as const;
export type Concept = (typeof CONCEPTS)[number];

export const DIALS = ['gravity', 'wind', 'heroMaterial'] as const;
export type Dial = (typeof DIALS)[number];

export const GRAVITY_PRESETS = { earth: 9.81, moon: 1.62, jupiter: 24.8, none: 0 } as const;
export type GravityPreset = keyof typeof GRAVITY_PRESETS;

export const WIND_PRESETS = { none: 0, breeze: 2, storm: 8 } as const;
export type WindPreset = keyof typeof WIND_PRESETS;
```

`packages/scene-schema/src/limits.ts`:

```ts
export const LIMITS = {
  schemaVersion: 1,
  maxEntities: 24,
  maxJoints: 16,
  maxRules: 12,
  maxMaterials: 8,
  maxDials: 3,
  maxConcepts: 3,
  minEntitySize: 0.2,
  maxEntitySize: 8,
  maxTerrainSize: 16,
  bounds: { width: 16, height: 9 },
  density: { min: 0.05, max: 20 },
  mass: { min: 0.01, max: 2000 },
} as const;
```

`packages/scene-schema/src/schema.ts`:

```ts
import { z } from 'zod';
import { CONCEPTS, DIALS } from './concepts';
import { LIMITS } from './limits';

const ID_PATTERN = /^[a-z][a-z0-9_]{0,31}$/;
export const IdSchema = z.string().regex(ID_PATTERN, 'ids are lowercase snake_case, max 32 chars');
export const TagSchema = z.string().regex(ID_PATTERN, 'tags are lowercase snake_case, max 32 chars');
const unit = z.number().min(0).max(1);
export const Vec2Schema = z.object({ x: z.number(), y: z.number() });
export type Vec2 = z.infer<typeof Vec2Schema>;

export const ConceptSchema = z.enum(CONCEPTS);
export const DialSchema = z.enum(DIALS);

export const AssetRefSchema = z.object({
  url: z.string(),
  colliderUrl: z.string().optional(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  status: z.enum(['placeholder', 'ready']),
});
export type AssetRef = z.infer<typeof AssetRefSchema>;

export const MaterialSchema = z.object({
  density: z.number().min(LIMITS.density.min).max(LIMITS.density.max),
  friction: unit,
  restitution: unit,
  softness: unit,
  buoyant: z.boolean(),
  breakable: z.boolean(),
  pretend: z.boolean(),
});
export type Material = z.infer<typeof MaterialSchema>;

export const ParticleKindSchema = z.enum(['sparkle', 'bubble', 'smoke', 'leaf']);

export const BehaviorSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('wander'), speed: z.number().min(0).max(5) }),
  z.object({ type: z.literal('float'), amplitude: z.number().min(0).max(2), period: z.number().min(0.5).max(20) }),
  z.object({ type: z.literal('bounceIdle') }),
  z.object({ type: z.literal('glow'), color: z.string().regex(/^#[0-9a-fA-F]{6}$/) }),
  z.object({ type: z.literal('emit'), particle: ParticleKindSchema, rate: z.number().min(0).max(50) }),
  z.object({ type: z.literal('face'), target: z.enum(['pointer', 'hero']) }),
]);
export type Behavior = z.infer<typeof BehaviorSchema>;

const SizeSchema = z.object({
  width: z.number().min(LIMITS.minEntitySize).max(LIMITS.maxTerrainSize),
  height: z.number().min(LIMITS.minEntitySize).max(LIMITS.maxTerrainSize),
});

export const BodySchema = z.object({
  shape: z.enum(['auto', 'circle', 'box', 'polygon']),
  material: z.string().min(1),
  isStatic: z.boolean(),
  size: SizeSchema,
  vertices: z.array(Vec2Schema).min(3).max(16).optional(),
});
export type Body = z.infer<typeof BodySchema>;

export const EntityKindSchema = z.enum(['sprite', 'ground', 'water', 'particle']);

export const EntitySchema = z.object({
  id: IdSchema,
  kind: EntityKindSchema,
  name: z.string().min(1).max(40),
  description: z.string().min(1).max(200),
  asset: AssetRefSchema.optional(),
  body: BodySchema,
  transform: z.object({ x: z.number(), y: z.number(), rotation: z.number() }),
  tags: z.array(TagSchema).max(8),
  behaviors: z.array(BehaviorSchema).max(4),
  pretend: z.boolean(),
});
export type Entity = z.infer<typeof EntitySchema>;

export const JointSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('spring'),
    a: IdSchema,
    b: IdSchema,
    stiffness: z.number().min(0).max(1000),
    damping: z.number().min(0).max(100),
    restLength: z.number().min(0).max(16),
  }),
  z.object({ type: z.literal('pin'), a: IdSchema, b: IdSchema, anchor: Vec2Schema }),
]);
export type Joint = z.infer<typeof JointSchema>;

export const RuleWhenSchema = z.discriminatedUnion('event', [
  z.object({ event: z.literal('collision'), a: TagSchema, b: TagSchema, minImpulse: z.number().min(0).optional() }),
  z.object({ event: z.literal('tap'), target: TagSchema }),
  z.object({ event: z.literal('enterMedium'), target: TagSchema, medium: z.literal('water') }),
  z.object({ event: z.literal('timer'), everySeconds: z.number().min(1).max(120) }),
  z.object({ event: z.literal('dial'), dial: DialSchema, value: z.string().min(1).max(32) }),
]);
export type RuleWhen = z.infer<typeof RuleWhenSchema>;

export const ActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('spawn'),
    template: IdSchema,
    at: z.union([z.literal('hero'), z.literal('pointer'), Vec2Schema]),
    count: z.number().int().min(1).max(10),
  }),
  z.object({ action: z.literal('applyImpulse'), target: TagSchema, impulse: Vec2Schema }),
  z.object({ action: z.literal('setMaterial'), target: TagSchema, material: z.string().min(1) }),
  z.object({ action: z.literal('remove'), target: TagSchema }),
  z.object({ action: z.literal('celebrate'), style: z.enum(['confetti', 'sparkle', 'splash']) }),
  z.object({ action: z.literal('say'), text: z.string().min(1).max(200) }),
  z.object({ action: z.literal('sound'), cue: z.enum(['boing', 'splat', 'splash', 'whoosh', 'ding']) }),
]);
export type Action = z.infer<typeof ActionSchema>;

export const RuleSchema = z.object({
  id: IdSchema,
  when: RuleWhenSchema,
  then: z.array(ActionSchema).min(1).max(5),
  concept: ConceptSchema.optional(),
  once: z.boolean(),
});
export type Rule = z.infer<typeof RuleSchema>;

export const PredictionSchema = z.object({
  question: z.string().min(1).max(160),
  options: z.array(z.string().min(1).max(40)).min(2).max(3),
  correctIndex: z.number().int().min(0).max(2),
  concept: ConceptSchema,
});
export type Prediction = z.infer<typeof PredictionSchema>;

export const LearningSchema = z.object({
  concepts: z.array(ConceptSchema).min(1).max(LIMITS.maxConcepts),
  prediction: PredictionSchema,
  dials: z.array(DialSchema).max(LIMITS.maxDials),
  heroEntityId: IdSchema,
});
export type Learning = z.infer<typeof LearningSchema>;

export const ThemeSchema = z.object({
  paletteHint: z.string().max(60),
  timeOfDay: z.enum(['day', 'sunset', 'night']),
  backdropDescription: z.string().min(1).max(200),
  backdrop: AssetRefSchema,
  midLayerDescription: z.string().min(1).max(200).optional(),
  midLayer: AssetRefSchema.optional(),
});

export const EnvironmentSchema = z.object({
  gravity: Vec2Schema,
  wind: Vec2Schema,
  medium: z.enum(['air', 'water', 'space']),
  bounds: z.object({ width: z.literal(LIMITS.bounds.width), height: z.literal(LIMITS.bounds.height) }),
  seed: z.number().int().min(0),
});
export type Environment = z.infer<typeof EnvironmentSchema>;

export const SceneDocSchema = z.object({
  schemaVersion: z.literal(1),
  worldId: z.string().min(1),
  title: z.string().min(1).max(60),
  theme: ThemeSchema,
  environment: EnvironmentSchema,
  materials: z.record(z.string(), MaterialSchema),
  entities: z.array(EntitySchema).min(1).max(LIMITS.maxEntities),
  joints: z.array(JointSchema).max(LIMITS.maxJoints),
  rules: z.array(RuleSchema).max(LIMITS.maxRules),
  learning: LearningSchema,
  narration: z.object({ intro: z.string().min(1).max(240) }),
});
export type SceneDoc = z.infer<typeof SceneDocSchema>;
```

`packages/scene-schema/src/index.ts` (grows in later tasks):

```ts
export * from './concepts';
export * from './limits';
export * from './schema';
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter @just-imagine/scene-schema test && pnpm --filter @just-imagine/scene-schema typecheck && pnpm --filter @just-imagine/scene-schema lint`
Expected: 8 tests pass, typecheck and lint clean.

- [ ] **Step 6: Commit**

```bash
git add packages/scene-schema pnpm-lock.yaml
git commit -m "feat(scene-schema): add Scene DSL v1 Zod schema and limits"
```

---

### Task 3: Generated-scene schema and conversion

The model never emits URLs or a world id, and Gemini's JSON-schema support is safest without `additionalProperties` records, so the builder asks the model for a `GeneratedScene` (materials as a named array, no assets) and converts it.

**Files:**
- Create: `packages/scene-schema/src/gen.ts`
- Modify: `packages/scene-schema/src/index.ts`
- Test: `packages/scene-schema/test/gen.test.ts`

**Interfaces:**
- Produces: `GeneratedSceneSchema`, `type GeneratedScene`, `fromGenerated(gen: GeneratedScene, worldId: string): SceneDoc`, `PLACEHOLDER_ASSET`, `PLACEHOLDER_BACKDROP`.
- Consumed by Plan B2 (builder) and Task 8 (JSON schema export).

- [ ] **Step 1: Write the failing tests**

`packages/scene-schema/test/gen.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { GeneratedSceneSchema, fromGenerated, type GeneratedScene } from '../src/gen';
import { SceneDocSchema } from '../src/schema';
import { minimalScene } from './helpers';

function minimalGenerated(): GeneratedScene {
  const { schemaVersion: _v, worldId: _w, theme, materials, entities, ...rest } = minimalScene();
  return {
    ...rest,
    theme: { paletteHint: theme.paletteHint, timeOfDay: theme.timeOfDay, backdropDescription: theme.backdropDescription },
    materials: Object.entries(materials).map(([name, m]) => ({ name, ...m })),
    entities: entities.map(({ asset: _a, ...e }) => e),
  };
}

describe('GeneratedSceneSchema', () => {
  it('accepts a minimal generated scene', () => {
    expect(GeneratedSceneSchema.safeParse(minimalGenerated()).success).toBe(true);
  });

  it('rejects duplicate material names', () => {
    const gen = minimalGenerated();
    gen.materials.push({ ...gen.materials[0]! });
    expect(GeneratedSceneSchema.safeParse(gen).success).toBe(false);
  });

  it('rejects an entity with an asset', () => {
    const gen = minimalGenerated() as unknown as { entities: Record<string, unknown>[] };
    gen.entities[1]!['asset'] = { url: 'x', width: 1, height: 1, status: 'ready' };
    expect(GeneratedSceneSchema.safeParse(gen).success).toBe(false);
  });
});

describe('fromGenerated', () => {
  it('produces a valid SceneDoc with placeholder assets', () => {
    const doc = fromGenerated(minimalGenerated(), 'w_abc');
    expect(SceneDocSchema.safeParse(doc).success).toBe(true);
    expect(doc.worldId).toBe('w_abc');
    expect(doc.schemaVersion).toBe(1);
    expect(doc.theme.backdrop.status).toBe('placeholder');
    expect(doc.theme.backdrop.url).toBe('');
    expect(Object.keys(doc.materials)).toEqual(['grass', 'rubber']);
    expect(doc.entities.every((e) => e.asset === undefined)).toBe(true);
  });

  it('adds a mid layer placeholder only when a description is present', () => {
    const gen = minimalGenerated();
    expect(fromGenerated(gen, 'w1').theme.midLayer).toBeUndefined();
    gen.theme.midLayerDescription = 'soft distant hills';
    const doc = fromGenerated(gen, 'w1');
    expect(doc.theme.midLayer?.status).toBe('placeholder');
    expect(doc.theme.midLayerDescription).toBe('soft distant hills');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @just-imagine/scene-schema test -- gen`
Expected: FAIL, "Cannot find module '../src/gen'".

- [ ] **Step 3: Write the implementation**

`packages/scene-schema/src/gen.ts`:

```ts
import { z } from 'zod';
import { LIMITS } from './limits';
import {
  AssetRefSchema, EntitySchema, IdSchema, MaterialSchema, SceneDocSchema,
  type AssetRef, type Material, type SceneDoc,
} from './schema';

export const PLACEHOLDER_ASSET: AssetRef = { url: '', width: 1024, height: 1024, status: 'placeholder' };
export const PLACEHOLDER_BACKDROP: AssetRef = { url: '', width: 1920, height: 1080, status: 'placeholder' };

export const GeneratedMaterialSchema = MaterialSchema.extend({ name: IdSchema });
export type GeneratedMaterial = z.infer<typeof GeneratedMaterialSchema>;

export const GeneratedEntitySchema = EntitySchema.omit({ asset: true }).strict();

export const GeneratedThemeSchema = z.object({
  paletteHint: z.string().max(60),
  timeOfDay: z.enum(['day', 'sunset', 'night']),
  backdropDescription: z.string().min(1).max(200),
  midLayerDescription: z.string().min(1).max(200).optional(),
});

export const GeneratedSceneSchema = SceneDocSchema
  .omit({ schemaVersion: true, worldId: true, theme: true, materials: true, entities: true })
  .extend({
    theme: GeneratedThemeSchema,
    materials: z
      .array(GeneratedMaterialSchema)
      .min(1)
      .max(LIMITS.maxMaterials)
      .refine((ms) => new Set(ms.map((m) => m.name)).size === ms.length, 'material names must be unique'),
    entities: z.array(GeneratedEntitySchema).min(1).max(LIMITS.maxEntities),
  });
export type GeneratedScene = z.infer<typeof GeneratedSceneSchema>;

export function fromGenerated(gen: GeneratedScene, worldId: string): SceneDoc {
  const materials: Record<string, Material> = {};
  for (const { name, ...m } of gen.materials) materials[name] = m;
  const { theme, materials: _m, entities, ...rest } = gen;
  const doc: SceneDoc = {
    schemaVersion: 1,
    worldId,
    ...rest,
    theme: {
      paletteHint: theme.paletteHint,
      timeOfDay: theme.timeOfDay,
      backdropDescription: theme.backdropDescription,
      backdrop: { ...PLACEHOLDER_BACKDROP },
      ...(theme.midLayerDescription
        ? { midLayerDescription: theme.midLayerDescription, midLayer: { ...PLACEHOLDER_BACKDROP } }
        : {}),
    },
    materials,
    entities: entities.map((e) => ({ ...e })),
  };
  return doc;
}

// Re-exported so callers can validate asset refs the builder writes later.
export { AssetRefSchema };
```

Add to `packages/scene-schema/src/index.ts`:

```ts
export * from './gen';
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @just-imagine/scene-schema test && pnpm --filter @just-imagine/scene-schema typecheck`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/scene-schema
git commit -m "feat(scene-schema): add generated-scene schema and fromGenerated conversion"
```

---
