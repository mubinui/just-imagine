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

1. **A patch that removes the hero entity.** Expected: `applyScenePatch` returns `ok: false` with `HERO_MISSING`. Pinned in Task 6.
2. **A document whose `schemaVersion` is newer than the library.** Expected: `migrateScene` returns `NEWER_THAN_SUPPORTED`; nothing tries to render it. Pinned in Task 7.
3. **A generated scene with two materials named the same.** Expected: `fromGenerated` keeps the last one and `validateScene` still passes or fails deterministically; `GeneratedSceneSchema` rejects duplicate names. Pinned in Task 3.
4. **A binary WebSocket frame whose length is not a multiple of 2 bytes.** Expected: `splitPcm16Frames` throws rather than producing a half sample. Pinned in Task 11.
5. **Two concurrent `reserveWorld` calls at the last unit of quota.** Expected: exactly one succeeds. Pinned in Task 15.

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
    src/concepts.ts                 CONCEPTS (playground and lab), DIALS, presets
    src/limits.ts                   LIMITS constants
    src/schema.ts                   Zod schemas and inferred types for SceneDoc
                                    (schema.ts also holds the lab extension: TierSchema, VariableSchema, VisualSchema, ChallengeSchema; Task 17)
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
    src/bands.ts                    AgeBandSchema, TierSchema, defaultTierFor
    src/characters.ts               CharacterIdSchema, CHARACTERS (companions and guides), EmotionSchema, SpellSchema
    src/concept-bank.ts             curated Discovery Card titles and real-life notes (Task 18)
    src/ws.ts                       ClientMessageSchema, ServerMessageSchema, audio constants, codecs
    src/jobs.ts                     BuildWorldJobSchema, PatchWorldJobSchema, BuilderJobSchema
    src/firestore.ts                document schemas, paths, yyyymmdd
    src/rest.ts                     ROUTES and request/response schemas
    src/world-source.ts             WorldSource interface
    test/*.test.ts
  packages/fixtures/
    worlds/jelly-dragon.json  worlds/moon-bounce.json  worlds/pond-float.json  worlds/projectile-lab.json (Task 17)
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
    tier: 'playground',
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
  // Playground concepts
  'gravity', 'mass', 'buoyancy', 'friction', 'bounce', 'momentum',
  'airResistance', 'balance', 'springiness', 'density', 'force', 'speed',
  // Lab concepts
  'acceleration', 'energy', 'projectile', 'probability', 'fraction', 'graph', 'measurement',
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

export const TierSchema = z.enum(['playground', 'lab']);
export type Tier = z.infer<typeof TierSchema>;

export const SceneDocSchema = z.object({
  schemaVersion: z.literal(1),
  worldId: z.string().min(1),
  tier: TierSchema.default('playground'),
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

### Task 4: Material reference table and blocklist

Two pure data modules the validator reads.

**Files:**
- Create: `packages/scene-schema/src/materials-table.ts`, `packages/scene-schema/src/blocklist.ts`
- Modify: `packages/scene-schema/src/index.ts`
- Test: `packages/scene-schema/test/materials-table.test.ts`, `packages/scene-schema/test/blocklist.test.ts`

**Interfaces:**
- Produces: `MATERIAL_TABLE: Record<string, MaterialRange>`, `type MaterialRange`, `lookupMaterialRange(name: string): MaterialRange | undefined`, `BLOCKED_TERMS`, `findBlockedTerm(text: string): string | null`.
- Consumed by Task 5 and by Plan B2 (the builder prompt lists `MATERIAL_TABLE` keys as suggested material names).

- [ ] **Step 1: Write the failing tests**

`packages/scene-schema/test/materials-table.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { MATERIAL_TABLE, lookupMaterialRange } from '../src/materials-table';
import { LIMITS } from '../src/limits';

describe('MATERIAL_TABLE', () => {
  it('keeps every range inside the global density limits and ordered', () => {
    for (const [name, r] of Object.entries(MATERIAL_TABLE)) {
      for (const key of ['density', 'friction', 'restitution', 'softness'] as const) {
        const [lo, hi] = r[key];
        expect(lo, `${name}.${key}`).toBeLessThanOrEqual(hi);
      }
      expect(r.density[0]).toBeGreaterThanOrEqual(LIMITS.density.min);
      expect(r.density[1]).toBeLessThanOrEqual(LIMITS.density.max);
    }
  });
});

describe('lookupMaterialRange', () => {
  it('finds a material by exact name', () => {
    expect(lookupMaterialRange('jelly')).toBe(MATERIAL_TABLE['jelly']);
  });
  it('finds a material by its last word, ignoring case and separators', () => {
    expect(lookupMaterialRange('Green_Jelly')).toBe(MATERIAL_TABLE['jelly']);
    expect(lookupMaterialRange('old-wood')).toBe(MATERIAL_TABLE['wood']);
  });
  it('prefers the last known word when several match', () => {
    expect(lookupMaterialRange('stone_rubber')).toBe(MATERIAL_TABLE['rubber']);
  });
  it('returns undefined for unknown names', () => {
    expect(lookupMaterialRange('unobtainium')).toBeUndefined();
  });
});
```

`packages/scene-schema/test/blocklist.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { findBlockedTerm } from '../src/blocklist';

describe('findBlockedTerm', () => {
  it('returns null for ordinary kid content', () => {
    expect(findBlockedTerm('a friendly dragon made of jelly')).toBeNull();
  });
  it('matches whole words case-insensitively', () => {
    expect(findBlockedTerm('a Gun that shoots bubbles')).toBe('gun');
  });
  it('does not match inside other words', () => {
    expect(findBlockedTerm('a begun race')).toBeNull();
    expect(findBlockedTerm('a skilled painter')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @just-imagine/scene-schema test -- materials blocklist`
Expected: FAIL, modules not found.

- [ ] **Step 3: Write the data modules**

`packages/scene-schema/src/materials-table.ts`:

```ts
export interface MaterialRange {
  density: [number, number];
  friction: [number, number];
  restitution: [number, number];
  softness: [number, number];
  buoyant: boolean;
}

// Density is relative to water (1.0) in the 2D world; see spec 5.4.
export const MATERIAL_TABLE: Record<string, MaterialRange> = {
  stone:   { density: [2.2, 3.0],  friction: [0.6, 0.9], restitution: [0.0, 0.2],  softness: [0, 0.05], buoyant: false },
  rock:    { density: [2.2, 3.0],  friction: [0.6, 0.9], restitution: [0.0, 0.2],  softness: [0, 0.05], buoyant: false },
  metal:   { density: [5.0, 8.0],  friction: [0.3, 0.6], restitution: [0.1, 0.4],  softness: [0, 0.02], buoyant: false },
  wood:    { density: [0.4, 0.9],  friction: [0.4, 0.7], restitution: [0.2, 0.4],  softness: [0, 0.1],  buoyant: true },
  rubber:  { density: [0.9, 1.3],  friction: [0.7, 1.0], restitution: [0.6, 0.9],  softness: [0.1, 0.4], buoyant: false },
  jelly:   { density: [0.9, 1.2],  friction: [0.2, 0.5], restitution: [0.4, 0.7],  softness: [0.6, 1.0], buoyant: true },
  ice:     { density: [0.85, 0.95], friction: [0.02, 0.1], restitution: [0.1, 0.3], softness: [0, 0.05], buoyant: true },
  feather: { density: [0.05, 0.1], friction: [0.5, 0.9], restitution: [0.0, 0.2],  softness: [0.3, 0.7], buoyant: true },
  cloud:   { density: [0.05, 0.08], friction: [0.8, 1.0], restitution: [0.0, 0.2], softness: [0.3, 0.6], buoyant: true },
  grass:   { density: [0.8, 1.2],  friction: [0.7, 1.0], restitution: [0.0, 0.2],  softness: [0, 0.1],  buoyant: false },
  sand:    { density: [1.4, 1.8],  friction: [0.6, 0.9], restitution: [0.0, 0.1],  softness: [0.2, 0.5], buoyant: false },
  water:   { density: [0.95, 1.05], friction: [0.0, 0.1], restitution: [0.0, 0.1], softness: [0.9, 1.0], buoyant: false },
  balloon: { density: [0.05, 0.1], friction: [0.3, 0.6], restitution: [0.7, 0.95], softness: [0.5, 0.9], buoyant: true },
  glass:   { density: [2.2, 2.6],  friction: [0.1, 0.4], restitution: [0.1, 0.3],  softness: [0, 0.02], buoyant: false },
  paper:   { density: [0.1, 0.3],  friction: [0.3, 0.6], restitution: [0.0, 0.2],  softness: [0.1, 0.4], buoyant: true },
  fur:     { density: [0.2, 0.5],  friction: [0.6, 0.9], restitution: [0.1, 0.3],  softness: [0.3, 0.7], buoyant: true },
};

export function lookupMaterialRange(name: string): MaterialRange | undefined {
  const words = name.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  for (let i = words.length - 1; i >= 0; i--) {
    const range = MATERIAL_TABLE[words[i]!];
    if (range) return range;
  }
  return undefined;
}
```

`packages/scene-schema/src/blocklist.ts`:

```ts
// Backstop only. Primary content policy lives in the builder and gateway prompts (spec 12).
export const BLOCKED_TERMS = [
  'gun', 'guns', 'rifle', 'pistol', 'shotgun', 'knife', 'knives', 'dagger', 'sword', 'swords',
  'bomb', 'bombs', 'grenade', 'missile', 'blood', 'bloody', 'gore', 'zombie', 'zombies', 'corpse',
  'kill', 'kills', 'killing', 'murder', 'torture', 'demon', 'devil', 'naked', 'nude', 'sexy',
  'drunk', 'beer', 'wine', 'vodka', 'cigarette', 'drugs', 'cocaine', 'suicide',
] as const;

const pattern = new RegExp(`\\b(${BLOCKED_TERMS.join('|')})\\b`, 'i');

export function findBlockedTerm(text: string): string | null {
  const match = pattern.exec(text);
  return match ? match[1]!.toLowerCase() : null;
}
```

Add to `packages/scene-schema/src/index.ts`:

```ts
export * from './materials-table';
export * from './blocklist';
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @just-imagine/scene-schema test`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add packages/scene-schema
git commit -m "feat(scene-schema): add material reference table and content blocklist"
```

---

### Task 5: Physics validator

**Files:**
- Create: `packages/scene-schema/src/validator.ts`
- Modify: `packages/scene-schema/src/index.ts`
- Test: `packages/scene-schema/test/validator.test.ts`

**Interfaces:**
- Produces: `validateScene(input: unknown): ValidationResult`, `type ValidationResult = { ok: true; doc: SceneDoc; issues: Issue[] } | { ok: false; doc: SceneDoc | null; issues: Issue[] }`, `type Issue = { code: IssueCode; severity: 'error' | 'warning'; path: string; message: string }`, `type IssueCode`.
- Consumed by Plan B2 (after generation and after every patch), Plan A1 (before loading a document), Task 6 (after applying a patch).

- [ ] **Step 1: Write the failing tests**

`packages/scene-schema/test/validator.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { validateScene } from '../src/validator';
import { minimalScene } from './helpers';

const codes = (r: { issues: { code: string }[] }) => r.issues.map((i) => i.code);

describe('validateScene', () => {
  it('passes the minimal scene with no issues', () => {
    const r = validateScene(minimalScene());
    expect(r.ok).toBe(true);
    expect(r.issues).toEqual([]);
  });

  it('reports SCHEMA_INVALID with a null doc for garbage', () => {
    const r = validateScene({ hello: 'world' });
    expect(r.ok).toBe(false);
    expect(r.doc).toBeNull();
    expect(codes(r)).toContain('SCHEMA_INVALID');
  });

  it('clamps an implausible known material and warns', () => {
    const doc = minimalScene();
    doc.materials['jelly'] = { density: 5, friction: 0.3, restitution: 0.6, softness: 0.8, buoyant: true, breakable: false, pretend: false };
    const r = validateScene(doc);
    expect(r.ok).toBe(true);
    expect(r.doc?.materials['jelly']?.density).toBe(1.2);
    expect(r.issues).toContainEqual(expect.objectContaining({ code: 'MATERIAL_CLAMPED', path: 'materials.jelly.density' }));
  });

  it('keeps an implausible value when the material is marked pretend', () => {
    const doc = minimalScene();
    doc.materials['jelly'] = { density: 5, friction: 0.3, restitution: 0.6, softness: 0.8, buoyant: true, breakable: false, pretend: true };
    const r = validateScene(doc);
    expect(r.doc?.materials['jelly']?.density).toBe(5);
    expect(codes(r)).not.toContain('MATERIAL_CLAMPED');
  });

  it('requires exactly one ground unless the medium is space', () => {
    const noGround = minimalScene();
    noGround.entities = noGround.entities.filter((e) => e.kind !== 'ground');
    noGround.rules = [];
    noGround.rules.push({ id: 'r_tap', when: { event: 'tap', target: 'hero' }, then: [{ action: 'celebrate', style: 'sparkle' }], concept: 'bounce', once: false });
    expect(codes(validateScene(noGround))).toContain('GROUND_MISSING');

    noGround.environment.medium = 'space';
    expect(codes(validateScene(noGround))).not.toContain('GROUND_MISSING');

    const twoGrounds = minimalScene();
    twoGrounds.entities.push({ ...twoGrounds.entities[0]!, id: 'ground2', transform: { x: 8, y: 0.5, rotation: 0 } });
    expect(codes(validateScene(twoGrounds))).toContain('GROUND_MULTIPLE');
  });

  it('reports UNKNOWN_TAG when a rule references a tag no entity has', () => {
    const doc = minimalScene();
    doc.rules[0]!.when = { event: 'collision', a: 'hero', b: 'lava' };
    const r = validateScene(doc);
    expect(r.ok).toBe(false);
    expect(r.issues).toContainEqual(expect.objectContaining({ code: 'UNKNOWN_TAG', path: 'rules.0.when.b' }));
  });

  it('reports UNKNOWN_ENTITY_REF for a spawn template or joint endpoint that does not exist', () => {
    const doc = minimalScene();
    doc.rules[0]!.then.push({ action: 'spawn', template: 'ghost', at: 'hero', count: 1 });
    doc.joints.push({ type: 'pin', a: 'ball', b: 'nothing', anchor: { x: 0, y: 0 } });
    const r = validateScene(doc);
    expect(r.issues).toContainEqual(expect.objectContaining({ code: 'UNKNOWN_ENTITY_REF', path: 'rules.0.then.1.template' }));
    expect(r.issues).toContainEqual(expect.objectContaining({ code: 'UNKNOWN_ENTITY_REF', path: 'joints.0.b' }));
  });

  it('reports UNKNOWN_MATERIAL_REF for an entity or setMaterial action', () => {
    const doc = minimalScene();
    doc.entities[1]!.body.material = 'slime';
    doc.rules[0]!.then.push({ action: 'setMaterial', target: 'hero', material: 'goo' });
    const r = validateScene(doc);
    expect(r.issues).toContainEqual(expect.objectContaining({ code: 'UNKNOWN_MATERIAL_REF', path: 'entities.1.body.material' }));
    expect(r.issues).toContainEqual(expect.objectContaining({ code: 'UNKNOWN_MATERIAL_REF', path: 'rules.0.then.1.material' }));
  });

  it('moves an entity inside the bounds and warns', () => {
    const doc = minimalScene();
    doc.entities[1]!.transform.x = 20;
    doc.entities[1]!.transform.y = -3;
    const r = validateScene(doc);
    expect(r.ok).toBe(true);
    expect(r.doc?.entities[1]?.transform).toEqual({ x: 15.5, y: 0.5, rotation: 0 });
    expect(codes(r)).toContain('ENTITY_CLAMPED_TO_BOUNDS');
  });

  it('resizes a dynamic entity whose mass is below the minimum and warns', () => {
    const doc = minimalScene();
    doc.materials['feather'] = { density: 0.05, friction: 0.6, restitution: 0.1, softness: 0.5, buoyant: true, breakable: false, pretend: false };
    doc.entities[1]!.body.material = 'feather';
    doc.entities[1]!.body.size = { width: 0.2, height: 0.2 };
    const r = validateScene(doc);
    expect(r.ok).toBe(true);
    const size = r.doc!.entities[1]!.body.size;
    expect(size.width).toBeCloseTo(0.4472, 3);
    expect(size.height).toBeCloseTo(0.4472, 3);
    expect(codes(r)).toContain('MASS_CLAMPED');
  });

  it('reports ENTITY_TOO_LARGE for a sprite wider than 8 m', () => {
    const doc = minimalScene();
    doc.entities[1]!.body.size = { width: 10, height: 1 };
    const r = validateScene(doc);
    expect(r.ok).toBe(false);
    expect(codes(r)).toContain('ENTITY_TOO_LARGE');
  });

  it('reports STATIC_OVERLAP for two overlapping static non-ground entities', () => {
    const doc = minimalScene();
    const cloud = (id: string, x: number) => ({
      id, kind: 'sprite' as const, name: 'cloud', description: 'fluffy cloud',
      body: { shape: 'box' as const, material: 'grass', isStatic: true, size: { width: 3, height: 1 } },
      transform: { x, y: 3, rotation: 0 }, tags: ['cloud'], behaviors: [], pretend: false,
    });
    doc.entities.push(cloud('cloud1', 5), cloud('cloud2', 6));
    const r = validateScene(doc);
    expect(r.issues).toContainEqual(expect.objectContaining({ code: 'STATIC_OVERLAP', path: 'entities.3' }));
  });

  it('reports learning inconsistencies', () => {
    const doc = minimalScene();
    doc.learning.prediction.concept = 'buoyancy';
    doc.learning.heroEntityId = 'nobody';
    doc.rules[0]!.concept = undefined;
    doc.learning.dials = ['heroMaterial'];
    doc.materials = { rubber: doc.materials['rubber']!, grass: doc.materials['grass']! };
    doc.materials = { grass: doc.materials['grass']! };
    doc.entities[1]!.body.material = 'grass';
    const r = validateScene(doc);
    expect(r.ok).toBe(false);
    expect(codes(r)).toEqual(expect.arrayContaining(['LEARNING_CONCEPT_MISMATCH', 'HERO_MISSING', 'NO_CONCEPT_RULE', 'DIAL_UNUSABLE']));
  });

  it('reports BLOCKED_CATEGORY with the offending path', () => {
    const doc = minimalScene();
    doc.entities[1]!.description = 'a ball shaped like a gun';
    const r = validateScene(doc);
    expect(r.ok).toBe(false);
    expect(r.issues).toContainEqual(expect.objectContaining({ code: 'BLOCKED_CATEGORY', path: 'entities.1.description' }));
  });

  it('reports DUPLICATE_ID for repeated entity ids', () => {
    const doc = minimalScene();
    doc.entities.push({ ...doc.entities[1]!, transform: { x: 4, y: 2, rotation: 0 } });
    expect(codes(validateScene(doc))).toContain('DUPLICATE_ID');
  });

  it('does not mutate the input', () => {
    const doc = minimalScene();
    doc.entities[1]!.transform.x = 20;
    validateScene(doc);
    expect(doc.entities[1]!.transform.x).toBe(20);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @just-imagine/scene-schema test -- validator`
Expected: FAIL, "Cannot find module '../src/validator'".

- [ ] **Step 3: Write the validator**

`packages/scene-schema/src/validator.ts`:

```ts
import { SceneDocSchema, type Entity, type SceneDoc } from './schema';
import { LIMITS } from './limits';
import { lookupMaterialRange } from './materials-table';
import { findBlockedTerm } from './blocklist';

export type IssueSeverity = 'error' | 'warning';
export type IssueCode =
  | 'SCHEMA_INVALID' | 'DUPLICATE_ID' | 'MATERIALS_TOO_MANY' | 'MATERIAL_CLAMPED'
  | 'UNKNOWN_MATERIAL_REF' | 'ENTITY_TOO_LARGE' | 'MASS_CLAMPED' | 'MASS_OUT_OF_RANGE'
  | 'ENTITY_CLAMPED_TO_BOUNDS' | 'GROUND_MISSING' | 'GROUND_MULTIPLE' | 'STATIC_OVERLAP'
  | 'UNKNOWN_TAG' | 'UNKNOWN_ENTITY_REF' | 'LEARNING_CONCEPT_MISMATCH' | 'HERO_MISSING'
  | 'NO_CONCEPT_RULE' | 'DIAL_UNUSABLE' | 'BLOCKED_CATEGORY' | 'PATCH_INVALID';

export interface Issue { code: IssueCode; severity: IssueSeverity; path: string; message: string }

export type ValidationResult =
  | { ok: true; doc: SceneDoc; issues: Issue[] }
  | { ok: false; doc: SceneDoc | null; issues: Issue[] };

type Report = (code: IssueCode, path: string, message: string) => void;
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export function validateScene(input: unknown): ValidationResult {
  const parsed = SceneDocSchema.safeParse(input);
  if (!parsed.success) {
    const issues: Issue[] = parsed.error.issues.map((i) => ({
      code: 'SCHEMA_INVALID', severity: 'error', path: i.path.map(String).join('.'), message: i.message,
    }));
    return { ok: false, doc: null, issues };
  }
  const doc = structuredClone(parsed.data);
  const issues: Issue[] = [];
  const err: Report = (code, path, message) => issues.push({ code, severity: 'error', path, message });
  const warn: Report = (code, path, message) => issues.push({ code, severity: 'warning', path, message });

  checkIds(doc, err);
  checkMaterials(doc, err, warn);
  checkEntities(doc, err, warn);
  checkGround(doc, err);
  checkStaticOverlap(doc, err);
  checkReferences(doc, err);
  checkLearning(doc, err);
  checkBlocklist(doc, err);

  const ok = issues.every((i) => i.severity !== 'error');
  return ok ? { ok: true, doc, issues } : { ok: false, doc, issues };
}

function checkIds(doc: SceneDoc, err: Report): void {
  const seen = new Set<string>();
  doc.entities.forEach((e, i) => {
    if (seen.has(e.id)) err('DUPLICATE_ID', `entities.${i}.id`, `duplicate entity id "${e.id}"`);
    seen.add(e.id);
  });
  const ruleIds = new Set<string>();
  doc.rules.forEach((r, i) => {
    if (ruleIds.has(r.id)) err('DUPLICATE_ID', `rules.${i}.id`, `duplicate rule id "${r.id}"`);
    ruleIds.add(r.id);
  });
}

function checkMaterials(doc: SceneDoc, err: Report, warn: Report): void {
  const names = Object.keys(doc.materials);
  if (names.length > LIMITS.maxMaterials) {
    err('MATERIALS_TOO_MANY', 'materials', `${names.length} materials, max ${LIMITS.maxMaterials}`);
  }
  for (const name of names) {
    const m = doc.materials[name]!;
    const range = lookupMaterialRange(name);
    if (!range || m.pretend) continue;
    for (const prop of ['density', 'friction', 'restitution', 'softness'] as const) {
      const [lo, hi] = range[prop];
      if (m[prop] < lo || m[prop] > hi) {
        const was = m[prop];
        m[prop] = clamp(m[prop], lo, hi);
        warn('MATERIAL_CLAMPED', `materials.${name}.${prop}`, `${prop} ${was} clamped to ${m[prop]} for ${name}`);
      }
    }
  }
}

function checkEntities(doc: SceneDoc, err: Report, warn: Report): void {
  const { width: W, height: H } = doc.environment.bounds;
  doc.entities.forEach((e, i) => {
    const p = `entities.${i}`;
    const mat = doc.materials[e.body.material];
    if (!mat) err('UNKNOWN_MATERIAL_REF', `${p}.body.material`, `material "${e.body.material}" is not defined`);

    const isTerrain = e.kind === 'ground' || e.kind === 'water';
    const maxSize = isTerrain ? LIMITS.maxTerrainSize : LIMITS.maxEntitySize;
    if (e.body.size.width > maxSize || e.body.size.height > maxSize) {
      err('ENTITY_TOO_LARGE', `${p}.body.size`, `${e.kind} "${e.id}" is larger than ${maxSize} m`);
    }

    if (mat && !e.body.isStatic) {
      const mass = mat.density * e.body.size.width * e.body.size.height;
      if (mass < LIMITS.mass.min || mass > LIMITS.mass.max) {
        const target = clamp(mass, LIMITS.mass.min, LIMITS.mass.max);
        const factor = Math.sqrt(target / mass);
        const width = clamp(e.body.size.width * factor, LIMITS.minEntitySize, maxSize);
        const height = clamp(e.body.size.height * factor, LIMITS.minEntitySize, maxSize);
        const newMass = mat.density * width * height;
        if (newMass < LIMITS.mass.min || newMass > LIMITS.mass.max) {
          err('MASS_OUT_OF_RANGE', `${p}.body`, `mass ${mass.toFixed(3)} kg cannot be brought into range by resizing`);
        } else {
          e.body.size = { width, height };
          warn('MASS_CLAMPED', `${p}.body.size`, `resized so mass goes from ${mass.toFixed(3)} kg to ${newMass.toFixed(3)} kg`);
        }
      }
    }

    const hw = e.body.size.width / 2;
    const hh = e.body.size.height / 2;
    const x = clamp(e.transform.x, hw, W - hw);
    const y = clamp(e.transform.y, hh, H - hh);
    if (x !== e.transform.x || y !== e.transform.y) {
      e.transform.x = x;
      e.transform.y = y;
      warn('ENTITY_CLAMPED_TO_BOUNDS', `${p}.transform`, `"${e.id}" moved inside the world bounds`);
    }
  });
}

function checkGround(doc: SceneDoc, err: Report): void {
  if (doc.environment.medium === 'space') return;
  const grounds = doc.entities.filter((e) => e.kind === 'ground');
  if (grounds.length === 0) err('GROUND_MISSING', 'entities', 'a ground entity is required unless the medium is space');
  if (grounds.length > 1) err('GROUND_MULTIPLE', 'entities', 'only one ground entity is allowed');
}

function aabb(e: Entity): { l: number; r: number; t: number; b: number } {
  const hw = e.body.size.width / 2;
  const hh = e.body.size.height / 2;
  return { l: e.transform.x - hw, r: e.transform.x + hw, t: e.transform.y - hh, b: e.transform.y + hh };
}

function checkStaticOverlap(doc: SceneDoc, err: Report): void {
  const TOLERANCE = 0.1;
  const statics = doc.entities
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => e.body.isStatic && e.kind !== 'ground');
  for (let a = 0; a < statics.length; a++) {
    for (let b = a + 1; b < statics.length; b++) {
      const A = aabb(statics[a]!.e);
      const B = aabb(statics[b]!.e);
      const ox = Math.min(A.r, B.r) - Math.max(A.l, B.l);
      const oy = Math.min(A.b, B.b) - Math.max(A.t, B.t);
      if (ox > TOLERANCE && oy > TOLERANCE) {
        err('STATIC_OVERLAP', `entities.${statics[b]!.i}`, `static "${statics[b]!.e.id}" overlaps static "${statics[a]!.e.id}"`);
      }
    }
  }
}

function checkReferences(doc: SceneDoc, err: Report): void {
  const tags = new Set(doc.entities.flatMap((e) => e.tags));
  const ids = new Set(doc.entities.map((e) => e.id));
  const needTag = (t: string, path: string): void => {
    if (!tags.has(t)) err('UNKNOWN_TAG', path, `no entity has tag "${t}"`);
  };
  doc.rules.forEach((r, i) => {
    const p = `rules.${i}`;
    const w = r.when;
    if (w.event === 'collision') { needTag(w.a, `${p}.when.a`); needTag(w.b, `${p}.when.b`); }
    else if (w.event === 'tap' || w.event === 'enterMedium') needTag(w.target, `${p}.when.target`);
    r.then.forEach((act, j) => {
      const q = `${p}.then.${j}`;
      if (act.action === 'spawn' && !ids.has(act.template)) {
        err('UNKNOWN_ENTITY_REF', `${q}.template`, `no entity with id "${act.template}"`);
      }
      if (act.action === 'applyImpulse' || act.action === 'remove' || act.action === 'setMaterial') {
        needTag(act.target, `${q}.target`);
      }
      if (act.action === 'setMaterial' && !(act.material in doc.materials)) {
        err('UNKNOWN_MATERIAL_REF', `${q}.material`, `material "${act.material}" is not defined`);
      }
    });
  });
  doc.joints.forEach((j, i) => {
    for (const end of ['a', 'b'] as const) {
      if (!ids.has(j[end])) err('UNKNOWN_ENTITY_REF', `joints.${i}.${end}`, `no entity with id "${j[end]}"`);
    }
  });
}

function checkLearning(doc: SceneDoc, err: Report): void {
  const concepts = new Set(doc.learning.concepts);
  if (!concepts.has(doc.learning.prediction.concept)) {
    err('LEARNING_CONCEPT_MISMATCH', 'learning.prediction.concept', 'prediction concept is not in learning.concepts');
  }
  doc.rules.forEach((r, i) => {
    if (r.concept && !concepts.has(r.concept)) {
      err('LEARNING_CONCEPT_MISMATCH', `rules.${i}.concept`, `rule concept "${r.concept}" is not in learning.concepts`);
    }
  });
  if (!doc.entities.some((e) => e.id === doc.learning.heroEntityId)) {
    err('HERO_MISSING', 'learning.heroEntityId', `no entity with id "${doc.learning.heroEntityId}"`);
  }
  if (!doc.rules.some((r) => r.concept)) err('NO_CONCEPT_RULE', 'rules', 'at least one rule must carry a concept');
  if (doc.learning.dials.includes('heroMaterial') && Object.keys(doc.materials).length < 2) {
    err('DIAL_UNUSABLE', 'learning.dials', 'the heroMaterial dial needs at least two materials');
  }
}

function checkBlocklist(doc: SceneDoc, err: Report): void {
  const texts: Array<[string, string]> = [
    ['title', doc.title],
    ['narration.intro', doc.narration.intro],
    ['learning.prediction.question', doc.learning.prediction.question],
    ['theme.backdropDescription', doc.theme.backdropDescription],
  ];
  doc.entities.forEach((e, i) => texts.push([`entities.${i}.name`, e.name], [`entities.${i}.description`, e.description]));
  doc.rules.forEach((r, i) => r.then.forEach((a, j) => {
    if (a.action === 'say') texts.push([`rules.${i}.then.${j}.text`, a.text]);
  }));
  for (const [path, text] of texts) {
    const hit = findBlockedTerm(text);
    if (hit) err('BLOCKED_CATEGORY', path, `contains blocked term "${hit}"`);
  }
}
```

Add to `packages/scene-schema/src/index.ts`:

```ts
export * from './validator';
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @just-imagine/scene-schema test && pnpm --filter @just-imagine/scene-schema typecheck && pnpm --filter @just-imagine/scene-schema lint`
Expected: all pass. If `structuredClone` is flagged by TypeScript, confirm `lib` includes `ES2022` and `DOM` in the base tsconfig.

- [ ] **Step 5: Commit**

```bash
git add packages/scene-schema
git commit -m "feat(scene-schema): add deterministic physics and content validator"
```

---

### Task 6: JSON Patch application

**Files:**
- Create: `packages/scene-schema/src/patch.ts`
- Modify: `packages/scene-schema/src/index.ts`
- Test: `packages/scene-schema/test/patch.test.ts`

**Interfaces:**
- Produces: `PatchOpSchema`, `PatchOpsSchema`, `type PatchOp`, `applyScenePatch(doc: SceneDoc, ops: PatchOp[]): ValidationResult`.
- Consumed by Plan B2 (`patchScene` flow output is `PatchOpsSchema`), Task 9 (`WorldVersionDocSchema.patch`).

- [ ] **Step 1: Write the failing tests**

`packages/scene-schema/test/patch.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { applyScenePatch, PatchOpsSchema } from '../src/patch';
import { minimalScene } from './helpers';

describe('PatchOpsSchema', () => {
  it('accepts replace, add, remove, and move ops', () => {
    const ops = [
      { op: 'replace', path: '/title', value: 'New title' },
      { op: 'add', path: '/entities/1/tags/-', value: 'shiny' },
      { op: 'remove', path: '/joints/0' },
      { op: 'move', from: '/rules/0', path: '/rules/1' },
    ];
    expect(PatchOpsSchema.safeParse(ops).success).toBe(true);
  });
  it('rejects unknown ops and paths without a leading slash', () => {
    expect(PatchOpsSchema.safeParse([{ op: 'merge', path: '/title', value: 'x' }]).success).toBe(false);
    expect(PatchOpsSchema.safeParse([{ op: 'replace', path: 'title', value: 'x' }]).success).toBe(false);
  });
});

describe('applyScenePatch', () => {
  it('applies a valid patch and re-validates', () => {
    const doc = minimalScene();
    const r = applyScenePatch(doc, [{ op: 'replace', path: '/entities/1/body/size', value: { width: 2, height: 2 } }]);
    expect(r.ok).toBe(true);
    expect(r.doc?.entities[1]?.body.size).toEqual({ width: 2, height: 2 });
    expect(doc.entities[1]!.body.size.width).toBe(1);
  });

  it('rejects a patch that removes the hero entity with HERO_MISSING', () => {
    const r = applyScenePatch(minimalScene(), [{ op: 'remove', path: '/entities/1' }]);
    expect(r.ok).toBe(false);
    expect(r.issues.map((i) => i.code)).toContain('HERO_MISSING');
  });

  it('reports PATCH_INVALID when a path does not exist', () => {
    const r = applyScenePatch(minimalScene(), [{ op: 'replace', path: '/entities/9/name', value: 'x' }]);
    expect(r.ok).toBe(false);
    expect(r.doc).toBeNull();
    expect(r.issues[0]?.code).toBe('PATCH_INVALID');
  });

  it('reports SCHEMA_INVALID when the patched document breaks the schema', () => {
    const r = applyScenePatch(minimalScene(), [{ op: 'replace', path: '/schemaVersion', value: 7 }]);
    expect(r.ok).toBe(false);
    expect(r.issues.map((i) => i.code)).toContain('SCHEMA_INVALID');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @just-imagine/scene-schema test -- patch`
Expected: FAIL, "Cannot find module '../src/patch'".

- [ ] **Step 3: Write the implementation**

`packages/scene-schema/src/patch.ts`:

```ts
import { z } from 'zod';
import { applyPatch, type Operation } from 'fast-json-patch';
import type { SceneDoc } from './schema';
import { validateScene, type ValidationResult } from './validator';

const pointer = z.string().regex(/^\/[^\s]*$/, 'JSON pointer must start with /');

export const PatchOpSchema = z.discriminatedUnion('op', [
  z.object({ op: z.literal('add'), path: pointer, value: z.unknown() }),
  z.object({ op: z.literal('replace'), path: pointer, value: z.unknown() }),
  z.object({ op: z.literal('remove'), path: pointer }),
  z.object({ op: z.literal('move'), from: pointer, path: pointer }),
  z.object({ op: z.literal('copy'), from: pointer, path: pointer }),
]);
export type PatchOp = z.infer<typeof PatchOpSchema>;
export const PatchOpsSchema = z.array(PatchOpSchema).min(1).max(40);

export function applyScenePatch(doc: SceneDoc, ops: PatchOp[]): ValidationResult {
  const clone = structuredClone(doc);
  try {
    applyPatch(clone, ops as Operation[], true, true);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, doc: null, issues: [{ code: 'PATCH_INVALID', severity: 'error', path: '', message }] };
  }
  return validateScene(clone);
}
```

Add to `packages/scene-schema/src/index.ts`:

```ts
export * from './patch';
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @just-imagine/scene-schema test && pnpm --filter @just-imagine/scene-schema typecheck`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add packages/scene-schema
git commit -m "feat(scene-schema): add JSON Patch schema and applyScenePatch"
```

---

### Task 7: Gemini JSON-schema export and migrations

**Files:**
- Create: `packages/scene-schema/src/json-schema.ts`, `packages/scene-schema/src/migrate.ts`
- Modify: `packages/scene-schema/src/index.ts`
- Test: `packages/scene-schema/test/json-schema.test.ts`, `packages/scene-schema/test/migrate.test.ts`

**Interfaces:**
- Produces: `generatedSceneJsonSchema(): Record<string, unknown>`, `patchOpsJsonSchema(): Record<string, unknown>`, `toGeminiJsonSchema(schema: Record<string, unknown>): Record<string, unknown>`, `CURRENT_SCHEMA_VERSION`, `migrateScene(raw: unknown): MigrationResult`, `type MigrationResult = { ok: true; doc: unknown } | { ok: false; reason: 'NOT_AN_OBJECT' | 'MISSING_VERSION' | 'NEWER_THAN_SUPPORTED' }`.
- Consumed by Plan B2 (structured output config) and Plan A1 (`migrateScene` then `validateScene` before loading).

- [ ] **Step 1: Write the failing tests**

`packages/scene-schema/test/json-schema.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { generatedSceneJsonSchema, patchOpsJsonSchema, toGeminiJsonSchema } from '../src/json-schema';

function walk(node: unknown, visit: (key: string, value: unknown) => void): void {
  if (Array.isArray(node)) node.forEach((n) => walk(n, visit));
  else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) { visit(k, v); walk(v, visit); }
  }
}

describe('generatedSceneJsonSchema', () => {
  it('describes an object with entities, materials as an array, and no world id', () => {
    const s = generatedSceneJsonSchema() as { type: string; properties: Record<string, { type?: string }>; required?: string[] };
    expect(s.type).toBe('object');
    expect(s.properties['materials']?.type).toBe('array');
    expect(s.properties['entities']?.type).toBe('array');
    expect(s.properties['worldId']).toBeUndefined();
    expect(s.required).toContain('learning');
  });
});

describe('toGeminiJsonSchema', () => {
  it('strips keywords Gemini rejects', () => {
    const cleaned = toGeminiJsonSchema(generatedSceneJsonSchema());
    const seen = new Set<string>();
    walk(cleaned, (k) => seen.add(k));
    expect(seen.has('additionalProperties')).toBe(false);
    expect(seen.has('$schema')).toBe(false);
    expect(seen.has('$id')).toBe(false);
  });
  it('leaves enums and required lists intact', () => {
    const cleaned = toGeminiJsonSchema(patchOpsJsonSchema()) as { items: { anyOf?: unknown[]; oneOf?: unknown[] } };
    expect(cleaned.items.anyOf ?? cleaned.items.oneOf).toBeDefined();
  });
});
```

`packages/scene-schema/test/migrate.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { migrateScene, CURRENT_SCHEMA_VERSION } from '../src/migrate';
import { minimalScene } from './helpers';

describe('migrateScene', () => {
  it('passes a current document through unchanged', () => {
    const doc = minimalScene();
    const r = migrateScene(doc);
    expect(r).toEqual({ ok: true, doc });
  });
  it('refuses a document newer than the library', () => {
    expect(migrateScene({ ...minimalScene(), schemaVersion: CURRENT_SCHEMA_VERSION + 1 })).toEqual({ ok: false, reason: 'NEWER_THAN_SUPPORTED' });
  });
  it('refuses non-objects and missing versions', () => {
    expect(migrateScene('nope')).toEqual({ ok: false, reason: 'NOT_AN_OBJECT' });
    expect(migrateScene({ title: 'x' })).toEqual({ ok: false, reason: 'MISSING_VERSION' });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @just-imagine/scene-schema test -- json-schema migrate`
Expected: FAIL, modules not found.

- [ ] **Step 3: Write the implementations**

`packages/scene-schema/src/json-schema.ts`:

```ts
import { z } from 'zod';
import { GeneratedSceneSchema } from './gen';
import { PatchOpsSchema } from './patch';

const STRIP = new Set(['additionalProperties', '$schema', '$id', 'default']);

export function toGeminiJsonSchema(schema: Record<string, unknown>): Record<string, unknown> {
  const clean = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(clean);
    if (node && typeof node === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        if (STRIP.has(k)) continue;
        out[k] = clean(v);
      }
      return out;
    }
    return node;
  };
  return clean(schema) as Record<string, unknown>;
}

export function generatedSceneJsonSchema(): Record<string, unknown> {
  return z.toJSONSchema(GeneratedSceneSchema, { target: 'draft-7', unrepresentable: 'any' }) as Record<string, unknown>;
}

export function patchOpsJsonSchema(): Record<string, unknown> {
  return z.toJSONSchema(PatchOpsSchema, { target: 'draft-7', unrepresentable: 'any' }) as Record<string, unknown>;
}
```

`packages/scene-schema/src/migrate.ts`:

```ts
import { LIMITS } from './limits';

export const CURRENT_SCHEMA_VERSION = LIMITS.schemaVersion;

export type MigrationResult =
  | { ok: true; doc: unknown }
  | { ok: false; reason: 'NOT_AN_OBJECT' | 'MISSING_VERSION' | 'NEWER_THAN_SUPPORTED' };

// Each entry upgrades a document from version N to N+1. Empty until v2 exists.
const MIGRATIONS: Record<number, (doc: Record<string, unknown>) => Record<string, unknown>> = {};

export function migrateScene(raw: unknown): MigrationResult {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, reason: 'NOT_AN_OBJECT' };
  let doc = { ...(raw as Record<string, unknown>) };
  const version = doc['schemaVersion'];
  if (typeof version !== 'number') return { ok: false, reason: 'MISSING_VERSION' };
  if (version > CURRENT_SCHEMA_VERSION) return { ok: false, reason: 'NEWER_THAN_SUPPORTED' };
  for (let v = version; v < CURRENT_SCHEMA_VERSION; v++) {
    const step = MIGRATIONS[v];
    if (!step) return { ok: false, reason: 'MISSING_VERSION' };
    doc = { ...step(doc), schemaVersion: v + 1 };
  }
  return { ok: true, doc };
}
```

Add to `packages/scene-schema/src/index.ts`:

```ts
export * from './json-schema';
export * from './migrate';
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @just-imagine/scene-schema test && pnpm --filter @just-imagine/scene-schema typecheck && pnpm --filter @just-imagine/scene-schema lint`
Expected: all pass. If `z.toJSONSchema` is missing, the installed Zod is older than 4; fix the dependency, not the code.

- [ ] **Step 5: Commit**

```bash
git add packages/scene-schema
git commit -m "feat(scene-schema): export Gemini-safe JSON schema and add migration entry point"
```

---

### Task 8: Protocol package: plans, characters, WebSocket messages

**Files:**
- Create: `packages/protocol/package.json`, `packages/protocol/tsconfig.json`, `packages/protocol/eslint.config.js`, `packages/protocol/vitest.config.ts`
- Create: `packages/protocol/src/plans.ts`, `packages/protocol/src/bands.ts`, `packages/protocol/src/characters.ts`, `packages/protocol/src/ws.ts`, `packages/protocol/src/index.ts`
- Test: `packages/protocol/test/ws.test.ts`, `packages/protocol/test/plans.test.ts`, `packages/protocol/test/characters.test.ts`

**Interfaces:**
- Produces:
  - `PlanTierSchema`, `type PlanTier`, `PLAN_LIMITS: Record<PlanTier, PlanLimits>`, `type PlanLimits = { children; voiceSecondsPerDay; worldsPerDay; imagesPerWorld; savedWorlds }`
  - `AgeBandSchema`, `type AgeBand = '6-7' | '8-10' | '11-13'`, `TierSchema`, `type Tier`, `defaultTierFor(band): Tier`
  - `CharacterIdSchema`, `type CharacterId = 'mishti' | 'bhombol' | 'chandni' | 'pori' | 'onkomama' | 'jadukaka'`, `CompanionIdSchema`, `GuideIdSchema`, `CHARACTERS: Record<CharacterId, CharacterConfig>`, `guidesFor(band): CharacterConfig[]`, `DEFAULT_CHARACTER`, `EmotionSchema`, `type Emotion`, `SpellSchema`, `type Spell`
  - `ClientMessageSchema`, `type ClientMessage`, `ServerMessageSchema`, `type ServerMessage`, `AUDIO_IN`, `AUDIO_OUT`, `encodeMessage(m)`, `parseClientMessage(raw)`, `parseServerMessage(raw)`, `ErrorCodeSchema`, `ByeReasonSchema`, `WorldJobStatusSchema`
  - Lab and guide messages: client `variable`, `challengeResult`; server `summon`, `spell`, `variable`, `challenge`
- Consumed by Plans A2, A3 (client side) and B1 (gateway), B3 (plan limits).

- [ ] **Step 1: Create the package files**

`packages/protocol/package.json`:

```json
{
  "name": "@just-imagine/protocol",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": { "test": "vitest run", "typecheck": "tsc --noEmit", "lint": "eslint ." },
  "dependencies": {
    "@just-imagine/scene-schema": "workspace:*",
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

`tsconfig.json`, `eslint.config.js`, and `vitest.config.ts` are identical to Task 2's.

- [ ] **Step 2: Write the failing tests**

`packages/protocol/test/plans.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { PLAN_LIMITS, PlanTierSchema } from '../src/plans';

describe('PLAN_LIMITS', () => {
  it('matches the spec table', () => {
    expect(PLAN_LIMITS.free).toEqual({ children: 1, voiceSecondsPerDay: 900, worldsPerDay: 3, imagesPerWorld: 8, savedWorlds: 10 });
    expect(PLAN_LIMITS.family).toEqual({ children: 4, voiceSecondsPerDay: 3600, worldsPerDay: 20, imagesPerWorld: 16, savedWorlds: 200 });
  });
  it('has a limits entry for every tier', () => {
    for (const tier of PlanTierSchema.options) expect(PLAN_LIMITS[tier]).toBeDefined();
  });
});
```

`packages/protocol/test/ws.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  AUDIO_IN, AUDIO_OUT, ClientMessageSchema, ServerMessageSchema,
  encodeMessage, parseClientMessage, parseServerMessage, type ClientMessage, type ServerMessage,
} from '../src/ws';

const clientMessages: ClientMessage[] = [
  { type: 'hello', idToken: 't', childId: 'c1', characterId: 'bhombol' },
  { type: 'hello', idToken: 't', childId: 'c1', characterId: 'mishti', worldId: 'w1', sessionId: 's1' },
  { type: 'text', text: 'make a jelly dragon' },
  { type: 'interaction', kind: 'flick', entityId: 'dragon', entityName: 'jelly dragon' },
  { type: 'interaction', kind: 'dial', dial: 'gravity', value: 'moon' },
  { type: 'simEvent', ruleId: 'r1', concept: 'bounce', say: 'Boing!' },
  { type: 'predictionAnswer', answerIndex: 1 },
  { type: 'switchCharacter', characterId: 'chandni' },
  { type: 'variable', name: 'launch_speed', value: 12.5 },
  { type: 'challengeResult', challengeId: 'ch_cup', completed: true },
  { type: 'end' },
];

const serverMessages: ServerMessage[] = [
  { type: 'ready', sessionId: 's1', characterId: 'bhombol' },
  { type: 'interrupted' },
  { type: 'transcript', role: 'child', text: 'a dragon', final: true },
  { type: 'characterState', characterId: 'bhombol', emotion: 'thinking', speaking: false },
  { type: 'worldJob', jobId: 'j1', worldId: 'w1', status: 'placeholders' },
  { type: 'prediction', question: 'Bounce or splat?', options: ['bounce', 'splat'] },
  { type: 'discovery', concept: 'bounce', title: 'Boing!', kidExplanation: 'Squishy things spring back.', realLifeNote: 'Rubber balls bounce because they squish and spring back.' },
  { type: 'dial', dial: 'gravity', value: 'moon' },
  { type: 'summon', characterId: 'pori' },
  { type: 'spell', spell: 'reverseGravity' },
  { type: 'spell', spell: 'grow', target: 'hero' },
  { type: 'variable', name: 'launch_speed', value: 12.5 },
  { type: 'challenge', challengeId: 'ch_cup' },
  { type: 'quota', voiceSecondsLeft: 120 },
  { type: 'error', code: 'SESSION_ACTIVE_ELSEWHERE', message: 'already playing on another device' },
  { type: 'bye', reason: 'target_reached' },
];

describe('WebSocket protocol', () => {
  it('round-trips every client message', () => {
    for (const m of clientMessages) expect(parseClientMessage(encodeMessage(m))).toEqual(m);
  });
  it('round-trips every server message', () => {
    for (const m of serverMessages) expect(parseServerMessage(encodeMessage(m))).toEqual(m);
  });
  it('rejects unknown message types and malformed JSON', () => {
    expect(ClientMessageSchema.safeParse({ type: 'nope' }).success).toBe(false);
    expect(ServerMessageSchema.safeParse({ type: 'audio' }).success).toBe(false);
    expect(() => parseClientMessage('{not json')).toThrow();
  });
  it('fixes the audio frame sizes from the spec', () => {
    expect(AUDIO_IN).toEqual({ sampleRate: 16000, channels: 1, frameMs: 20, samplesPerFrame: 320, mimeType: 'audio/pcm;rate=16000' });
    expect(AUDIO_OUT).toEqual({ sampleRate: 24000, channels: 1, frameMs: 20, samplesPerFrame: 480, mimeType: 'audio/pcm;rate=24000' });
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm install && pnpm --filter @just-imagine/protocol test`
Expected: FAIL, modules not found.

- [ ] **Step 4: Write the modules**

`packages/protocol/src/plans.ts`:

```ts
import { z } from 'zod';

export const PlanTierSchema = z.enum(['free', 'family']);
export type PlanTier = z.infer<typeof PlanTierSchema>;

export interface PlanLimits {
  children: number;
  voiceSecondsPerDay: number;
  worldsPerDay: number;
  imagesPerWorld: number;
  savedWorlds: number;
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: { children: 1, voiceSecondsPerDay: 15 * 60, worldsPerDay: 3, imagesPerWorld: 8, savedWorlds: 10 },
  family: { children: 4, voiceSecondsPerDay: 60 * 60, worldsPerDay: 20, imagesPerWorld: 16, savedWorlds: 200 },
};

export const QUOTA_WARNING_SECONDS = 120;
```

`packages/protocol/src/bands.ts`:

```ts
import { z } from 'zod';

export const AgeBandSchema = z.enum(['6-7', '8-10', '11-13']);
export type AgeBand = z.infer<typeof AgeBandSchema>;

export const TierSchema = z.enum(['playground', 'lab']);
export type Tier = z.infer<typeof TierSchema>;

export function defaultTierFor(band: AgeBand): Tier {
  return band === '11-13' ? 'lab' : 'playground';
}
```

`packages/protocol/src/characters.ts`:

```ts
import { z } from 'zod';
import { AgeBandSchema, type AgeBand } from './bands';

export const CompanionIdSchema = z.enum(['mishti', 'bhombol', 'chandni']);
export const GuideIdSchema = z.enum(['pori', 'onkomama', 'jadukaka']);
export const CharacterIdSchema = z.enum([...CompanionIdSchema.options, ...GuideIdSchema.options]);
export type CharacterId = z.infer<typeof CharacterIdSchema>;

export const EmotionSchema = z.enum(['idle', 'happy', 'thinking', 'surprised', 'sleepy']);
export type Emotion = z.infer<typeof EmotionSchema>;

export const SpellSchema = z.enum(['reverseGravity', 'slowTime', 'grow', 'shrink', 'floatAll', 'restore']);
export type Spell = z.infer<typeof SpellSchema>;

export interface CharacterConfig {
  id: CharacterId;
  kind: 'companion' | 'guide';
  displayName: string;
  title: string;                 // shown to parents and in the Gallery
  look: string;                  // one-sentence art direction for the Rive character
  domain: 'play' | 'physics' | 'maths' | 'magic';
  leads: Array<'imagine' | 'predict' | 'play' | 'discover' | 'remix' | 'recap' | 'lab' | 'spell'>;
  bands: AgeBand[];
  catchphrase: string;
  // Live API voice name. Set after the week-2 listening test; the gateway reads it from here.
  voice: string;
}

const ALL_BANDS = AgeBandSchema.options;

export const CHARACTERS: Record<CharacterId, CharacterConfig> = {
  mishti: { id: 'mishti', kind: 'companion', displayName: 'Mishti', title: 'the dreamer', look: 'tiny cream kitten with huge sparkly eyes and a pink bow', domain: 'play', leads: ['imagine', 'remix'], bands: ['6-7', '8-10'], catchphrase: 'Ooh, what if...', voice: 'Leda' },
  bhombol: { id: 'bhombol', kind: 'companion', displayName: 'Bhombol', title: 'the tinkerer', look: 'chubby golden puppy with a tool belt and floppy ears', domain: 'play', leads: ['play', 'discover'], bands: ['6-7', '8-10'], catchphrase: 'Let us build it!', voice: 'Puck' },
  chandni: { id: 'chandni', kind: 'companion', displayName: 'Chandni', title: 'the thinker', look: 'sleek silver-grey cat with a crescent-moon pendant', domain: 'play', leads: ['predict', 'recap'], bands: ['6-7', '8-10'], catchphrase: 'What do you think will happen?', voice: 'Kore' },
  pori: { id: 'pori', kind: 'guide', displayName: 'Pori Apu', title: 'Physics Fairy', look: 'small glowing fairy with dragonfly wings and a star-tipped wand', domain: 'physics', leads: ['lab', 'discover'], bands: [...ALL_BANDS], catchphrase: 'Every push has a story!', voice: 'Aoede' },
  onkomama: { id: 'onkomama', kind: 'guide', displayName: 'Onko Mama', title: 'Math Man', look: 'cheerful caped uncle with round glasses, chalk in hand and a calculator belt', domain: 'maths', leads: ['lab', 'discover'], bands: ['8-10', '11-13'], catchphrase: 'Numbers are everywhere, let us find them!', voice: 'Charon' },
  jadukaka: { id: 'jadukaka', kind: 'guide', displayName: 'Jadu Kaka', title: 'Magic Man', look: 'tall magician in a top hat with a twirly moustache and a sparkly cloak', domain: 'magic', leads: ['spell', 'discover'], bands: [...ALL_BANDS], catchphrase: 'Abracadabra, but with science!', voice: 'Fenrir' },
};

export const DEFAULT_CHARACTER: CharacterId = 'bhombol';

export function guidesFor(band: AgeBand): CharacterConfig[] {
  return Object.values(CHARACTERS).filter((c) => c.kind === 'guide' && c.bands.includes(band));
}
```

`packages/protocol/test/characters.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { CHARACTERS, CharacterIdSchema, guidesFor } from '../src/characters';
import { defaultTierFor } from '../src/bands';

describe('characters', () => {
  it('has a config for every id with a non-empty voice', () => {
    for (const id of CharacterIdSchema.options) expect(CHARACTERS[id].voice.length).toBeGreaterThan(0);
  });
  it('offers Math Man only from 8-10 up and the other guides to everyone', () => {
    expect(guidesFor('6-7').map((c) => c.id)).toEqual(['pori', 'jadukaka']);
    expect(guidesFor('8-10').map((c) => c.id)).toEqual(['pori', 'onkomama', 'jadukaka']);
    expect(guidesFor('11-13').map((c) => c.id)).toEqual(['pori', 'onkomama', 'jadukaka']);
  });
  it('defaults 11-13 to the lab tier and younger bands to playground', () => {
    expect(defaultTierFor('11-13')).toBe('lab');
    expect(defaultTierFor('8-10')).toBe('playground');
  });
});
```

`packages/protocol/src/ws.ts`:

```ts
import { z } from 'zod';
import { ConceptSchema, DialSchema } from '@just-imagine/scene-schema';
import { CharacterIdSchema, EmotionSchema, SpellSchema } from './characters';

export const AUDIO_IN = { sampleRate: 16000, channels: 1, frameMs: 20, samplesPerFrame: 320, mimeType: 'audio/pcm;rate=16000' } as const;
export const AUDIO_OUT = { sampleRate: 24000, channels: 1, frameMs: 20, samplesPerFrame: 480, mimeType: 'audio/pcm;rate=24000' } as const;

export const InteractionKindSchema = z.enum(['tap', 'drag', 'flick', 'dial']);
export const WorldJobStatusSchema = z.enum(['queued', 'building', 'placeholders', 'hero', 'ready', 'failed']);
export const ErrorCodeSchema = z.enum(['UNAUTHENTICATED', 'FORBIDDEN', 'QUOTA_EXHAUSTED', 'SESSION_ACTIVE_ELSEWHERE', 'KILL_SWITCH', 'INTERNAL']);
export const ByeReasonSchema = z.enum(['ended', 'quota', 'target_reached', 'moderation', 'error']);

export const ClientMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('hello'),
    idToken: z.string().min(1),
    childId: z.string().min(1),
    characterId: CharacterIdSchema,
    worldId: z.string().min(1).optional(),
    sessionId: z.string().min(1).optional(),
  }),
  z.object({ type: z.literal('text'), text: z.string().min(1).max(500) }),
  z.object({
    type: z.literal('interaction'),
    kind: InteractionKindSchema,
    entityId: z.string().optional(),
    entityName: z.string().max(40).optional(),
    dial: DialSchema.optional(),
    value: z.string().max(32).optional(),
  }),
  z.object({ type: z.literal('simEvent'), ruleId: z.string(), concept: ConceptSchema.optional(), say: z.string().max(200).optional() }),
  z.object({ type: z.literal('predictionAnswer'), answerIndex: z.number().int().min(0).max(2) }),
  z.object({ type: z.literal('switchCharacter'), characterId: CharacterIdSchema }),
  z.object({ type: z.literal('variable'), name: z.string().min(1).max(32), value: z.number() }),
  z.object({ type: z.literal('challengeResult'), challengeId: z.string().min(1), completed: z.boolean() }),
  z.object({ type: z.literal('end') }),
]);
export type ClientMessage = z.infer<typeof ClientMessageSchema>;

export const ServerMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ready'), sessionId: z.string(), characterId: CharacterIdSchema, worldId: z.string().optional() }),
  z.object({ type: z.literal('interrupted') }),
  z.object({ type: z.literal('transcript'), role: z.enum(['child', 'character']), text: z.string(), final: z.boolean() }),
  z.object({ type: z.literal('characterState'), characterId: CharacterIdSchema, emotion: EmotionSchema, speaking: z.boolean() }),
  z.object({ type: z.literal('worldJob'), jobId: z.string(), worldId: z.string(), status: WorldJobStatusSchema }),
  z.object({ type: z.literal('prediction'), question: z.string(), options: z.array(z.string()).min(2).max(3) }),
  z.object({ type: z.literal('discovery'), concept: ConceptSchema, title: z.string(), kidExplanation: z.string(), realLifeNote: z.string() }),
  z.object({ type: z.literal('dial'), dial: DialSchema, value: z.string() }),
  z.object({ type: z.literal('summon'), characterId: CharacterIdSchema }),
  z.object({ type: z.literal('spell'), spell: SpellSchema, target: z.string().optional() }),
  z.object({ type: z.literal('variable'), name: z.string().min(1).max(32), value: z.number() }),
  z.object({ type: z.literal('challenge'), challengeId: z.string().min(1) }),
  z.object({ type: z.literal('quota'), voiceSecondsLeft: z.number().int() }),
  z.object({ type: z.literal('error'), code: ErrorCodeSchema, message: z.string() }),
  z.object({ type: z.literal('bye'), reason: ByeReasonSchema }),
]);
export type ServerMessage = z.infer<typeof ServerMessageSchema>;

export function encodeMessage(m: ClientMessage | ServerMessage): string {
  return JSON.stringify(m);
}
export function parseClientMessage(raw: string): ClientMessage {
  return ClientMessageSchema.parse(JSON.parse(raw));
}
export function parseServerMessage(raw: string): ServerMessage {
  return ServerMessageSchema.parse(JSON.parse(raw));
}
```

`packages/protocol/src/index.ts`:

```ts
export * from './plans';
export * from './bands';
export * from './characters';
export * from './ws';
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter @just-imagine/protocol test && pnpm --filter @just-imagine/protocol typecheck && pnpm --filter @just-imagine/protocol lint`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add packages/protocol pnpm-lock.yaml
git commit -m "feat(protocol): add plan limits, character config, and WebSocket message schemas"
```

---

### Task 9: Protocol package: builder jobs, Firestore documents, world source

**Files:**
- Create: `packages/protocol/src/jobs.ts`, `packages/protocol/src/firestore.ts`, `packages/protocol/src/world-source.ts`
- Modify: `packages/protocol/src/index.ts`
- Test: `packages/protocol/test/jobs.test.ts`, `packages/protocol/test/firestore.test.ts`

**Interfaces:**
- Produces:
  - `BuildWorldJobSchema`, `PatchWorldJobSchema`, `BuilderJobSchema`, `type BuilderJob`, `type BuildWorldJob`, `type PatchWorldJob`
  - `AvatarSchema`, `UserDocSchema`, `ChildDocSchema` (with `tier`, `labsUnlocked`, `captions`), `DiscoveryDocSchema`, `AssetStatusSchema`, `WorldDocSchema`, `WorldVersionDocSchema`, `SessionDocSchema`, `UsageDailyDocSchema`, `SubscriptionDocSchema`, `AssetCacheDocSchema`, `RuntimeConfigDocSchema`, inferred `type XxxDoc` for each, `paths`, `yyyymmdd(date: Date): string`
  - `interface WorldSource { subscribe(worldId: string, onUpdate: (world: WorldDoc & { id: string }) => void, onError?: (e: Error) => void): () => void }`
- Consumed by Plans B1, B2, B3 (documents and jobs), A3 (`WorldSource`, `WorldDoc`), Task 12 (`FakeWorldSource`).

- [ ] **Step 1: Write the failing tests**

`packages/protocol/test/jobs.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { BuilderJobSchema } from '../src/jobs';

const base = { jobId: 'j_1', worldId: 'w_1', uid: 'u_1', childId: 'c_1', sessionId: 's_1', plan: 'free' as const };

describe('BuilderJobSchema', () => {
  it('accepts a build job', () => {
    const r = BuilderJobSchema.safeParse({
      ...base, kind: 'build', description: 'a jelly dragon on a cloud', concepts: ['bounce'], ageBand: '6-7', tier: 'playground',
      styleVersion: 'style-v1', promptVersion: 'imagine-v1', conversationSummary: 'The child wants a jelly dragon.',
    });
    expect(r.success).toBe(true);
  });
  it('accepts a patch job', () => {
    const r = BuilderJobSchema.safeParse({ ...base, kind: 'patch', instruction: 'make the dragon bigger', promptVersion: 'patch-v1' });
    expect(r.success).toBe(true);
  });
  it('rejects a build job with four concepts', () => {
    const r = BuilderJobSchema.safeParse({
      ...base, kind: 'build', description: 'x', concepts: ['bounce', 'gravity', 'mass', 'speed'], ageBand: '6-7', tier: 'playground',
      styleVersion: 'style-v1', promptVersion: 'imagine-v1', conversationSummary: 'x',
    });
    expect(r.success).toBe(false);
  });
});
```

`packages/protocol/test/firestore.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { ChildDocSchema, SessionDocSchema, UsageDailyDocSchema, WorldDocSchema, paths, yyyymmdd } from '../src/firestore';

describe('paths', () => {
  it('builds the collection paths from the spec', () => {
    expect(paths.user('u1')).toBe('users/u1');
    expect(paths.child('u1', 'c1')).toBe('users/u1/children/c1');
    expect(paths.discovery('u1', 'c1', 'bounce')).toBe('users/u1/children/c1/discoveries/bounce');
    expect(paths.world('w1')).toBe('worlds/w1');
    expect(paths.worldVersion('w1', 3)).toBe('worlds/w1/versions/3');
    expect(paths.session('s1')).toBe('sessions/s1');
    expect(paths.usageDaily('u1', '20261015')).toBe('usageDaily/u1_20261015');
    expect(paths.subscription('u1')).toBe('subscriptions/u1');
    expect(paths.assetCache('abc')).toBe('assetCache/abc');
    expect(paths.runtimeConfig()).toBe('config/runtime');
  });
});

describe('yyyymmdd', () => {
  it('formats in UTC', () => {
    expect(yyyymmdd(new Date('2026-10-15T23:59:59Z'))).toBe('20261015');
    expect(yyyymmdd(new Date('2026-10-15T00:00:00+06:00'))).toBe('20261014');
  });
});

describe('document schemas', () => {
  it('accepts a child document and rejects an age band outside the product', () => {
    const child = { firstName: 'Ayaan', avatar: 'fox', ageBand: '6-7', tier: 'playground', labsUnlocked: false, captions: false, sessionTargetMinutes: 8, loopsCompleted: 0, createdAt: 1 };
    expect(ChildDocSchema.safeParse(child).success).toBe(true);
    expect(ChildDocSchema.safeParse({ ...child, ageBand: '14-16' }).success).toBe(false);
    expect(ChildDocSchema.safeParse({ ...child, ageBand: '11-13', tier: 'lab' }).success).toBe(true);
  });
  it('requires integer epoch timestamps', () => {
    const usage = { uid: 'u1', date: '20261015', voiceSeconds: 10, worlds: 1, images: 3 };
    expect(UsageDailyDocSchema.safeParse(usage).success).toBe(true);
    const session = { uid: 'u1', childId: 'c1', characterIds: ['bhombol'], worldIds: [], startedAt: '2026-10-15', endedAt: null, voiceSeconds: 0, turns: 0, beats: 0, summary: null, discoveries: [], predictions: [], endReason: null, active: true };
    expect(SessionDocSchema.safeParse(session).success).toBe(false);
  });
  it('requires a world document to embed a SceneDoc', () => {
    expect(WorldDocSchema.safeParse({ ownerUid: 'u1', childId: 'c1', title: 't', status: 'building', doc: {}, schemaVersion: 1, promptVersion: 'p', styleVersion: 's', assets: {}, concepts: [], thumbnailUrl: null, jobId: 'j', createdAt: 1, updatedAt: 1 }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @just-imagine/protocol test -- jobs firestore`
Expected: FAIL, modules not found.

- [ ] **Step 3: Write the modules**

`packages/protocol/src/jobs.ts`:

```ts
import { z } from 'zod';
import { ConceptSchema, LIMITS } from '@just-imagine/scene-schema';
import { PlanTierSchema } from './plans';
import { AgeBandSchema, TierSchema } from './bands';

const JobBase = z.object({
  jobId: z.string().min(1),
  worldId: z.string().min(1),
  uid: z.string().min(1),
  childId: z.string().min(1),
  sessionId: z.string().min(1),
  plan: PlanTierSchema,
});

export const BuildWorldJobSchema = JobBase.extend({
  kind: z.literal('build'),
  description: z.string().min(1).max(1000),
  concepts: z.array(ConceptSchema).max(LIMITS.maxConcepts),
  ageBand: AgeBandSchema,
  tier: TierSchema,
  labKind: z.enum(['projectile', 'galton', 'fractions']).optional(),
  styleVersion: z.string().min(1),
  promptVersion: z.string().min(1),
  conversationSummary: z.string().max(2000),
});
export type BuildWorldJob = z.infer<typeof BuildWorldJobSchema>;

export const PatchWorldJobSchema = JobBase.extend({
  kind: z.literal('patch'),
  instruction: z.string().min(1).max(500),
  promptVersion: z.string().min(1),
});
export type PatchWorldJob = z.infer<typeof PatchWorldJobSchema>;

export const BuilderJobSchema = z.discriminatedUnion('kind', [BuildWorldJobSchema, PatchWorldJobSchema]);
export type BuilderJob = z.infer<typeof BuilderJobSchema>;
```

`packages/protocol/src/firestore.ts`:

```ts
import { z } from 'zod';
import { ConceptSchema, PatchOpSchema, SceneDocSchema } from '@just-imagine/scene-schema';
import { PlanTierSchema } from './plans';
import { CharacterIdSchema } from './characters';
import { AgeBandSchema, TierSchema } from './bands';
import { ByeReasonSchema } from './ws';

const epochMs = z.number().int().nonnegative();

export const AvatarSchema = z.enum(['fox', 'owl', 'panda', 'bunny', 'whale', 'robot']);

export const UserDocSchema = z.object({
  email: z.string(),
  displayName: z.string(),
  consentAt: epochMs,
  plan: PlanTierSchema,
  stripeCustomerId: z.string().nullable(),
  createdAt: epochMs,
});
export type UserDoc = z.infer<typeof UserDocSchema>;

export const ChildDocSchema = z.object({
  firstName: z.string().min(1).max(30),
  avatar: AvatarSchema,
  ageBand: AgeBandSchema,
  tier: TierSchema,
  labsUnlocked: z.boolean(),
  captions: z.boolean(),
  sessionTargetMinutes: z.number().int().min(8).max(20),
  loopsCompleted: z.number().int().min(0),
  createdAt: epochMs,
});
export type ChildDoc = z.infer<typeof ChildDocSchema>;

export const DiscoveryDocSchema = z.object({
  concept: ConceptSchema,
  firstAt: epochMs,
  count: z.number().int().min(1),
  worldIds: z.array(z.string()),
  title: z.string(),
  kidExplanation: z.string(),
  realLifeNote: z.string(),
});
export type DiscoveryDoc = z.infer<typeof DiscoveryDocSchema>;

export const AssetStatusSchema = z.enum(['placeholder', 'generating', 'ready', 'failed']);
export const WorldStatusSchema = z.enum(['building', 'ready', 'failed']);

export const WorldDocSchema = z.object({
  ownerUid: z.string(),
  childId: z.string(),
  title: z.string(),
  status: WorldStatusSchema,
  doc: SceneDocSchema,
  schemaVersion: z.literal(1),
  promptVersion: z.string(),
  styleVersion: z.string(),
  assets: z.record(z.string(), z.object({ status: AssetStatusSchema, url: z.string().optional(), colliderUrl: z.string().optional() })),
  concepts: z.array(ConceptSchema),
  thumbnailUrl: z.string().nullable(),
  jobId: z.string(),
  createdAt: epochMs,
  updatedAt: epochMs,
});
export type WorldDoc = z.infer<typeof WorldDocSchema>;

export const WorldVersionDocSchema = z.object({
  doc: SceneDocSchema,
  patch: z.array(PatchOpSchema).nullable(),
  reason: z.string(),
  createdAt: epochMs,
});
export type WorldVersionDoc = z.infer<typeof WorldVersionDocSchema>;

export const SessionDocSchema = z.object({
  uid: z.string(),
  childId: z.string(),
  characterIds: z.array(CharacterIdSchema),
  worldIds: z.array(z.string()),
  startedAt: epochMs,
  endedAt: epochMs.nullable(),
  voiceSeconds: z.number().int().min(0),
  turns: z.number().int().min(0),
  beats: z.number().int().min(0),
  summary: z.string().nullable(),
  discoveries: z.array(ConceptSchema),
  predictions: z.array(z.object({ question: z.string(), answerIndex: z.number().int().nullable(), correctIndex: z.number().int() })),
  endReason: ByeReasonSchema.nullable(),
  active: z.boolean(),
});
export type SessionDoc = z.infer<typeof SessionDocSchema>;

export const UsageDailyDocSchema = z.object({
  uid: z.string(),
  date: z.string().regex(/^\d{8}$/),
  voiceSeconds: z.number().int().min(0),
  worlds: z.number().int().min(0),
  images: z.number().int().min(0),
});
export type UsageDailyDoc = z.infer<typeof UsageDailyDocSchema>;

export const SubscriptionDocSchema = z.object({
  stripeSubscriptionId: z.string(),
  status: z.enum(['active', 'past_due', 'canceled', 'trialing', 'incomplete']),
  tier: PlanTierSchema,
  currentPeriodEnd: epochMs,
});
export type SubscriptionDoc = z.infer<typeof SubscriptionDocSchema>;

export const AssetCacheDocSchema = z.object({
  url: z.string(),
  colliderUrl: z.string().nullable(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  safetyChecked: z.boolean(),
  createdAt: epochMs,
});
export type AssetCacheDoc = z.infer<typeof AssetCacheDocSchema>;

export const RuntimeConfigDocSchema = z.object({ killSwitch: z.boolean(), updatedAt: epochMs });
export type RuntimeConfigDoc = z.infer<typeof RuntimeConfigDocSchema>;

export const paths = {
  user: (uid: string) => `users/${uid}`,
  children: (uid: string) => `users/${uid}/children`,
  child: (uid: string, childId: string) => `users/${uid}/children/${childId}`,
  discoveries: (uid: string, childId: string) => `users/${uid}/children/${childId}/discoveries`,
  discovery: (uid: string, childId: string, concept: string) => `users/${uid}/children/${childId}/discoveries/${concept}`,
  worlds: () => 'worlds',
  world: (worldId: string) => `worlds/${worldId}`,
  worldVersions: (worldId: string) => `worlds/${worldId}/versions`,
  worldVersion: (worldId: string, n: number) => `worlds/${worldId}/versions/${n}`,
  sessions: () => 'sessions',
  session: (sessionId: string) => `sessions/${sessionId}`,
  usageDaily: (uid: string, date: string) => `usageDaily/${uid}_${date}`,
  subscription: (uid: string) => `subscriptions/${uid}`,
  assetCache: (hash: string) => `assetCache/${hash}`,
  runtimeConfig: () => 'config/runtime',
} as const;

export function yyyymmdd(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}
```

`packages/protocol/src/world-source.ts`:

```ts
import type { WorldDoc } from './firestore';

export type WorldWithId = WorldDoc & { id: string };

// Implemented by the Firestore listener in apps/web and by FakeWorldSource in packages/fixtures.
export interface WorldSource {
  subscribe(worldId: string, onUpdate: (world: WorldWithId) => void, onError?: (error: Error) => void): () => void;
}
```

Add to `packages/protocol/src/index.ts`:

```ts
export * from './jobs';
export * from './firestore';
export * from './world-source';
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @just-imagine/protocol test && pnpm --filter @just-imagine/protocol typecheck && pnpm --filter @just-imagine/protocol lint`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add packages/protocol
git commit -m "feat(protocol): add builder job payloads, Firestore document schemas, and WorldSource"
```

---

### Task 10: Protocol package: REST contract

**Files:**
- Create: `packages/protocol/src/rest.ts`
- Modify: `packages/protocol/src/index.ts`
- Test: `packages/protocol/test/rest.test.ts`

**Interfaces:**
- Produces: `ROUTES`, `ApiErrorSchema`, `ApiErrorCodeSchema`, `MeResponseSchema`, `CreateChildBodySchema`, `UpdateChildBodySchema`, `ChildResponseSchema`, `WorldSummarySchema`, `WorldListResponseSchema`, `WorldResponseSchema`, `SessionListResponseSchema`, `DiscoveryListResponseSchema`, `UsageTodayResponseSchema`, `CheckoutBodySchema`, `CheckoutResponseSchema`, `PortalResponseSchema`, and inferred types named `XxxResponse` / `XxxBody`.
- Consumed by Plan B3 (server handlers validate bodies and responses) and Plan A3 (typed client).

- [ ] **Step 1: Write the failing tests**

`packages/protocol/test/rest.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { ROUTES, CreateChildBodySchema, UpdateChildBodySchema, UsageTodayResponseSchema, ApiErrorSchema } from '../src/rest';

describe('ROUTES', () => {
  it('declares every endpoint from the spec under /v1', () => {
    const keys = Object.keys(ROUTES).sort();
    expect(keys).toEqual([
      'checkout', 'createChild', 'deleteAccountData', 'deleteChild', 'deleteWorld', 'getWorld', 'listDiscoveries',
      'listSessions', 'listWorlds', 'me', 'portal', 'stripeWebhook', 'updateChild', 'usageToday',
    ]);
    for (const r of Object.values(ROUTES)) expect(r.path.startsWith('/v1/')).toBe(true);
  });
});

describe('bodies', () => {
  it('accepts a child creation body with only the three allowed fields', () => {
    expect(CreateChildBodySchema.safeParse({ firstName: 'Mira', avatar: 'owl', ageBand: '8-10' }).success).toBe(true);
    expect(CreateChildBodySchema.safeParse({ firstName: 'Mira', avatar: 'owl', ageBand: '8-10', loopsCompleted: 9 }).success).toBe(false);
  });
  it('allows partial updates including the session target', () => {
    expect(UpdateChildBodySchema.safeParse({ sessionTargetMinutes: 12 }).success).toBe(true);
    expect(UpdateChildBodySchema.safeParse({ sessionTargetMinutes: 45 }).success).toBe(false);
  });
});

describe('responses', () => {
  it('shapes usage today with plan limits and used counters', () => {
    const r = UsageTodayResponseSchema.safeParse({
      plan: 'free',
      limits: { children: 1, voiceSecondsPerDay: 900, worldsPerDay: 3, imagesPerWorld: 8, savedWorlds: 10 },
      used: { voiceSeconds: 10, worlds: 1, images: 2 },
    });
    expect(r.success).toBe(true);
  });
  it('shapes errors as { error: { code, message } }', () => {
    expect(ApiErrorSchema.safeParse({ error: { code: 'NOT_FOUND', message: 'no such child' } }).success).toBe(true);
    expect(ApiErrorSchema.safeParse({ message: 'x' }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @just-imagine/protocol test -- rest`
Expected: FAIL, "Cannot find module '../src/rest'".

- [ ] **Step 3: Write the module**

`packages/protocol/src/rest.ts`:

```ts
import { z } from 'zod';
import { ConceptSchema } from '@just-imagine/scene-schema';
import { PlanTierSchema } from './plans';
import {
  ChildDocSchema, DiscoveryDocSchema, SessionDocSchema, SubscriptionDocSchema, UsageDailyDocSchema,
  UserDocSchema, WorldDocSchema, WorldStatusSchema,
} from './firestore';

export const ApiErrorCodeSchema = z.enum(['UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND', 'INVALID_ARGUMENT', 'QUOTA_EXHAUSTED', 'PLAN_LIMIT', 'INTERNAL']);
export const ApiErrorSchema = z.object({ error: z.object({ code: ApiErrorCodeSchema, message: z.string() }) });
export type ApiError = z.infer<typeof ApiErrorSchema>;

const withId = <T extends z.ZodRawShape>(s: z.ZodObject<T>) => s.extend({ id: z.string() });

export const ChildResponseSchema = withId(ChildDocSchema);
export type ChildResponse = z.infer<typeof ChildResponseSchema>;

export const MeResponseSchema = z.object({
  uid: z.string(),
  user: UserDocSchema,
  children: z.array(ChildResponseSchema),
  subscription: SubscriptionDocSchema.nullable(),
});
export type MeResponse = z.infer<typeof MeResponseSchema>;

export const CreateChildBodySchema = ChildDocSchema.pick({ firstName: true, avatar: true, ageBand: true }).strict();
export type CreateChildBody = z.infer<typeof CreateChildBodySchema>;

export const UpdateChildBodySchema = ChildDocSchema
  .pick({ firstName: true, avatar: true, ageBand: true, tier: true, labsUnlocked: true, captions: true, sessionTargetMinutes: true })
  .partial()
  .strict();
export type UpdateChildBody = z.infer<typeof UpdateChildBodySchema>;

export const WorldSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  status: WorldStatusSchema,
  concepts: z.array(ConceptSchema),
  thumbnailUrl: z.string().nullable(),
  createdAt: z.number().int(),
});
export const WorldListResponseSchema = z.object({ worlds: z.array(WorldSummarySchema) });
export type WorldListResponse = z.infer<typeof WorldListResponseSchema>;

export const WorldResponseSchema = withId(WorldDocSchema);
export type WorldResponse = z.infer<typeof WorldResponseSchema>;

export const SessionListResponseSchema = z.object({ sessions: z.array(withId(SessionDocSchema)) });
export type SessionListResponse = z.infer<typeof SessionListResponseSchema>;

export const DiscoveryListResponseSchema = z.object({ discoveries: z.array(DiscoveryDocSchema) });
export type DiscoveryListResponse = z.infer<typeof DiscoveryListResponseSchema>;

export const UsageTodayResponseSchema = z.object({
  plan: PlanTierSchema,
  limits: z.object({
    children: z.number().int(), voiceSecondsPerDay: z.number().int(), worldsPerDay: z.number().int(),
    imagesPerWorld: z.number().int(), savedWorlds: z.number().int(),
  }),
  used: UsageDailyDocSchema.pick({ voiceSeconds: true, worlds: true, images: true }),
});
export type UsageTodayResponse = z.infer<typeof UsageTodayResponseSchema>;

export const CheckoutBodySchema = z.object({ tier: z.literal('family') });
export const CheckoutResponseSchema = z.object({ url: z.string() });
export const PortalResponseSchema = z.object({ url: z.string() });

export const ROUTES = {
  me: { method: 'GET', path: '/v1/me' },
  deleteAccountData: { method: 'POST', path: '/v1/me/delete' },
  createChild: { method: 'POST', path: '/v1/children' },
  updateChild: { method: 'PATCH', path: '/v1/children/:childId' },
  deleteChild: { method: 'DELETE', path: '/v1/children/:childId' },
  listWorlds: { method: 'GET', path: '/v1/children/:childId/worlds' },
  listSessions: { method: 'GET', path: '/v1/children/:childId/sessions' },
  listDiscoveries: { method: 'GET', path: '/v1/children/:childId/discoveries' },
  getWorld: { method: 'GET', path: '/v1/worlds/:worldId' },
  deleteWorld: { method: 'DELETE', path: '/v1/worlds/:worldId' },
  usageToday: { method: 'GET', path: '/v1/usage/today' },
  checkout: { method: 'POST', path: '/v1/billing/checkout' },
  portal: { method: 'POST', path: '/v1/billing/portal' },
  stripeWebhook: { method: 'POST', path: '/v1/billing/webhook' },
} as const satisfies Record<string, { method: 'GET' | 'POST' | 'PATCH' | 'DELETE'; path: string }>;
export type RouteKey = keyof typeof ROUTES;
```

Add to `packages/protocol/src/index.ts`:

```ts
export * from './rest';
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @just-imagine/protocol test && pnpm --filter @just-imagine/protocol typecheck && pnpm --filter @just-imagine/protocol lint`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add packages/protocol
git commit -m "feat(protocol): add REST route table and request and response schemas"
```

---

### Task 11: Fixtures package: sample worlds and synthetic audio

**Files:**
- Create: `packages/fixtures/package.json`, `packages/fixtures/tsconfig.json`, `packages/fixtures/eslint.config.js`, `packages/fixtures/vitest.config.ts`
- Create: `packages/fixtures/worlds/jelly-dragon.json`, `packages/fixtures/worlds/moon-bounce.json`, `packages/fixtures/worlds/pond-float.json`
- Create: `packages/fixtures/src/worlds.ts`, `packages/fixtures/src/audio.ts`, `packages/fixtures/src/index.ts`
- Test: `packages/fixtures/test/worlds.test.ts`, `packages/fixtures/test/audio.test.ts`

**Interfaces:**
- Produces: `FIXTURE_WORLDS: Record<'jellyDragon' | 'moonBounce' | 'pondFloat', SceneDoc>`, `fixtureWorldDoc(key, overrides?): WorldWithId` (wraps a SceneDoc in a `WorldDoc` with status `ready`), `pcm16Tone(opts: { sampleRate: number; seconds: number; frequency: number; amplitude?: number }): Int16Array`, `splitPcm16Frames(bytes: Uint8Array, samplesPerFrame: number): Uint8Array[]`, `int16ToBytes(samples: Int16Array): Uint8Array`.
- Consumed by Plans A1 (engine tests), A2 (audio tests), A3 (local dev), B1 (gateway tests), B2 (builder few-shot examples), Tasks 12 and 13.

- [ ] **Step 1: Create the package files**

`packages/fixtures/package.json`:

```json
{
  "name": "@just-imagine/fixtures",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "dev": "tsx bin/fake-gateway.ts"
  },
  "dependencies": {
    "@just-imagine/protocol": "workspace:*",
    "@just-imagine/scene-schema": "workspace:*",
    "ws": "^8.18.0"
  },
  "devDependencies": {
    "@just-imagine/config": "workspace:*",
    "@types/node": "^22.15.0",
    "@types/ws": "^8.18.0",
    "eslint": "^9.30.0",
    "tsx": "^4.20.0",
    "typescript": "^5.9.0",
    "vitest": "^3.2.0"
  }
}
```

`tsconfig.json` as in Task 2 but with `"include": ["src", "test", "bin"]`. `eslint.config.js` and `vitest.config.ts` as in Task 2.

- [ ] **Step 2: Write the three fixture worlds**

`packages/fixtures/worlds/jelly-dragon.json`:

```json
{
  "schemaVersion": 1,
  "worldId": "w_fixture_jelly_dragon",
  "tier": "playground",
  "title": "Jelly Dragon on a Cloud",
  "theme": {
    "paletteHint": "sunset pastel with mint",
    "timeOfDay": "sunset",
    "backdropDescription": "rolling green meadow under a pastel sunset sky with soft fluffy clouds",
    "backdrop": { "url": "", "width": 1920, "height": 1080, "status": "placeholder" }
  },
  "environment": { "gravity": { "x": 0, "y": 9.81 }, "wind": { "x": 0, "y": 0 }, "medium": "air", "bounds": { "width": 16, "height": 9 }, "seed": 42 },
  "materials": {
    "jelly": { "density": 1.1, "friction": 0.3, "restitution": 0.6, "softness": 0.8, "buoyant": true, "breakable": false, "pretend": false },
    "cloud": { "density": 0.06, "friction": 0.9, "restitution": 0.1, "softness": 0.4, "buoyant": true, "breakable": false, "pretend": true },
    "grass": { "density": 1, "friction": 0.8, "restitution": 0.1, "softness": 0, "buoyant": false, "breakable": false, "pretend": false },
    "stone": { "density": 2.5, "friction": 0.7, "restitution": 0.1, "softness": 0, "buoyant": false, "breakable": false, "pretend": false }
  },
  "entities": [
    { "id": "ground", "kind": "ground", "name": "meadow", "description": "rolling green meadow edge with tiny flowers", "body": { "shape": "box", "material": "grass", "isStatic": true, "size": { "width": 16, "height": 1 } }, "transform": { "x": 8, "y": 8.5, "rotation": 0 }, "tags": ["ground"], "behaviors": [], "pretend": false },
    { "id": "cloud1", "kind": "sprite", "name": "fluffy cloud", "description": "fluffy white cartoon cloud with a smiling face", "body": { "shape": "auto", "material": "cloud", "isStatic": true, "size": { "width": 3, "height": 1.2 } }, "transform": { "x": 5, "y": 3, "rotation": 0 }, "tags": ["cloud", "platform"], "behaviors": [{ "type": "float", "amplitude": 0.1, "period": 4 }], "pretend": true },
    { "id": "dragon", "kind": "sprite", "name": "jelly dragon", "description": "small cute dragon made of wobbly translucent green jelly with big eyes", "body": { "shape": "auto", "material": "jelly", "isStatic": false, "size": { "width": 1.4, "height": 1.2 } }, "transform": { "x": 5, "y": 1.8, "rotation": 0 }, "tags": ["dragon", "hero"], "behaviors": [{ "type": "face", "target": "pointer" }], "pretend": false },
    { "id": "pebble", "kind": "sprite", "name": "pebble", "description": "small round grey pebble", "body": { "shape": "circle", "material": "stone", "isStatic": false, "size": { "width": 0.5, "height": 0.5 } }, "transform": { "x": 11, "y": 7.7, "rotation": 0 }, "tags": ["pebble"], "behaviors": [], "pretend": false }
  ],
  "joints": [],
  "rules": [
    { "id": "r_bounce", "when": { "event": "collision", "a": "hero", "b": "ground", "minImpulse": 2 }, "then": [{ "action": "sound", "cue": "boing" }, { "action": "celebrate", "style": "sparkle" }, { "action": "say", "text": "Boing! Jelly squishes and springs back. That is bounciness!" }], "concept": "bounce", "once": true },
    { "id": "r_tap_dragon", "when": { "event": "tap", "target": "hero" }, "then": [{ "action": "applyImpulse", "target": "hero", "impulse": { "x": 0, "y": -6 } }, { "action": "sound", "cue": "whoosh" }], "once": false },
    { "id": "r_pebble", "when": { "event": "collision", "a": "pebble", "b": "ground", "minImpulse": 2 }, "then": [{ "action": "sound", "cue": "ding" }, { "action": "say", "text": "The pebble landed with a thud and stayed put. Stone does not squish." }], "concept": "gravity", "once": true }
  ],
  "learning": {
    "concepts": ["bounce", "gravity"],
    "prediction": { "question": "If the dragon falls off the cloud, will it bounce or splat?", "options": ["bounce", "splat"], "correctIndex": 0, "concept": "bounce" },
    "dials": ["gravity", "heroMaterial"],
    "heroEntityId": "dragon"
  },
  "narration": { "intro": "Here is your jelly dragon, snoozing on a cloud. Try giving it a little flick!" }
}
```

`packages/fixtures/worlds/moon-bounce.json`:

```json
{
  "schemaVersion": 1,
  "worldId": "w_fixture_moon_bounce",
  "tier": "playground",
  "title": "Bouncy Ball on the Moon",
  "theme": {
    "paletteHint": "deep indigo with silver",
    "timeOfDay": "night",
    "backdropDescription": "cartoon moon surface with soft grey craters, a starry sky and a tiny Earth in the distance",
    "backdrop": { "url": "", "width": 1920, "height": 1080, "status": "placeholder" }
  },
  "environment": { "gravity": { "x": 0, "y": 1.62 }, "wind": { "x": 0, "y": 0 }, "medium": "air", "bounds": { "width": 16, "height": 9 }, "seed": 7 },
  "materials": {
    "moondust": { "density": 1.5, "friction": 0.8, "restitution": 0.1, "softness": 0.1, "buoyant": false, "breakable": false, "pretend": false },
    "rubber": { "density": 1.1, "friction": 0.8, "restitution": 0.85, "softness": 0.2, "buoyant": false, "breakable": false, "pretend": false },
    "metal": { "density": 6, "friction": 0.4, "restitution": 0.2, "softness": 0, "buoyant": false, "breakable": false, "pretend": false }
  },
  "entities": [
    { "id": "ground", "kind": "ground", "name": "moon ground", "description": "soft grey cartoon moon surface", "body": { "shape": "box", "material": "moondust", "isStatic": true, "size": { "width": 16, "height": 1 } }, "transform": { "x": 8, "y": 8.5, "rotation": 0 }, "tags": ["ground"], "behaviors": [], "pretend": false },
    { "id": "ball", "kind": "sprite", "name": "bouncy ball", "description": "bright red rubber bouncy ball with a white star", "body": { "shape": "circle", "material": "rubber", "isStatic": false, "size": { "width": 1, "height": 1 } }, "transform": { "x": 5, "y": 2, "rotation": 0 }, "tags": ["ball", "hero"], "behaviors": [], "pretend": false },
    { "id": "bolt_toy", "kind": "sprite", "name": "metal bolt", "description": "shiny chunky cartoon metal bolt", "body": { "shape": "box", "material": "metal", "isStatic": false, "size": { "width": 0.8, "height": 0.8 } }, "transform": { "x": 10, "y": 2, "rotation": 0 }, "tags": ["bolt"], "behaviors": [], "pretend": false }
  ],
  "joints": [],
  "rules": [
    { "id": "r_ball_bounce", "when": { "event": "collision", "a": "ball", "b": "ground", "minImpulse": 1 }, "then": [{ "action": "sound", "cue": "boing" }, { "action": "say", "text": "Look how slowly it falls! The Moon pulls much less than Earth does." }], "concept": "gravity", "once": true },
    { "id": "r_bolt_land", "when": { "event": "collision", "a": "bolt", "b": "ground", "minImpulse": 1 }, "then": [{ "action": "sound", "cue": "ding" }, { "action": "say", "text": "The heavy bolt fell just as slowly as the ball. Gravity pulls everything the same way!" }], "concept": "mass", "once": true },
    { "id": "r_earth", "when": { "event": "dial", "dial": "gravity", "value": "earth" }, "then": [{ "action": "say", "text": "Whoa, Earth gravity! Everything drops faster now." }], "once": false }
  ],
  "learning": {
    "concepts": ["gravity", "mass"],
    "prediction": { "question": "Which one lands first on the Moon, the ball or the heavy bolt?", "options": ["the ball", "the bolt", "same time"], "correctIndex": 2, "concept": "gravity" },
    "dials": ["gravity"],
    "heroEntityId": "ball"
  },
  "narration": { "intro": "Welcome to the Moon! Drop the ball and the bolt and watch what happens." }
}
```

`packages/fixtures/worlds/pond-float.json`:

```json
{
  "schemaVersion": 1,
  "worldId": "w_fixture_pond_float",
  "tier": "playground",
  "title": "Duck and Stone at the Pond",
  "theme": {
    "paletteHint": "fresh spring greens and sky blue",
    "timeOfDay": "day",
    "backdropDescription": "sunny cartoon pond with reeds, lily pads and a wooden dock",
    "backdrop": { "url": "", "width": 1920, "height": 1080, "status": "placeholder" }
  },
  "environment": { "gravity": { "x": 0, "y": 9.81 }, "wind": { "x": 0, "y": 0 }, "medium": "air", "bounds": { "width": 16, "height": 9 }, "seed": 3 },
  "materials": {
    "grass": { "density": 1, "friction": 0.8, "restitution": 0.1, "softness": 0, "buoyant": false, "breakable": false, "pretend": false },
    "water": { "density": 1, "friction": 0.05, "restitution": 0, "softness": 1, "buoyant": false, "breakable": false, "pretend": false },
    "wood": { "density": 0.6, "friction": 0.5, "restitution": 0.3, "softness": 0.05, "buoyant": true, "breakable": false, "pretend": false },
    "stone": { "density": 2.6, "friction": 0.7, "restitution": 0.1, "softness": 0, "buoyant": false, "breakable": false, "pretend": false }
  },
  "entities": [
    { "id": "ground", "kind": "ground", "name": "pond bed", "description": "muddy pond bed with pebbles", "body": { "shape": "box", "material": "grass", "isStatic": true, "size": { "width": 16, "height": 1 } }, "transform": { "x": 8, "y": 8.5, "rotation": 0 }, "tags": ["ground"], "behaviors": [], "pretend": false },
    { "id": "pond", "kind": "water", "name": "pond", "description": "clear blue cartoon pond water", "body": { "shape": "box", "material": "water", "isStatic": true, "size": { "width": 10, "height": 3 } }, "transform": { "x": 8, "y": 6.5, "rotation": 0 }, "tags": ["water"], "behaviors": [], "pretend": false },
    { "id": "duck", "kind": "sprite", "name": "wooden duck", "description": "cute painted wooden toy duck", "body": { "shape": "auto", "material": "wood", "isStatic": false, "size": { "width": 1, "height": 0.9 } }, "transform": { "x": 6, "y": 2, "rotation": 0 }, "tags": ["duck", "hero"], "behaviors": [{ "type": "face", "target": "pointer" }], "pretend": false },
    { "id": "stone", "kind": "sprite", "name": "smooth stone", "description": "smooth grey river stone", "body": { "shape": "circle", "material": "stone", "isStatic": false, "size": { "width": 0.7, "height": 0.7 } }, "transform": { "x": 10, "y": 2, "rotation": 0 }, "tags": ["stone"], "behaviors": [], "pretend": false }
  ],
  "joints": [],
  "rules": [
    { "id": "r_duck_water", "when": { "event": "enterMedium", "target": "duck", "medium": "water" }, "then": [{ "action": "sound", "cue": "splash" }, { "action": "celebrate", "style": "splash" }, { "action": "say", "text": "The duck floats! Wood is lighter than water, so the water pushes it up." }], "concept": "buoyancy", "once": true },
    { "id": "r_stone_water", "when": { "event": "enterMedium", "target": "stone", "medium": "water" }, "then": [{ "action": "sound", "cue": "splash" }, { "action": "say", "text": "Splash! The stone sinks because it is heavier than the water it pushes aside." }], "concept": "density", "once": true }
  ],
  "learning": {
    "concepts": ["buoyancy", "density"],
    "prediction": { "question": "Drop them in the pond. Which one floats?", "options": ["the duck", "the stone", "both"], "correctIndex": 0, "concept": "buoyancy" },
    "dials": ["heroMaterial"],
    "heroEntityId": "duck"
  },
  "narration": { "intro": "A duck, a stone and a pond. Drag them over the water and let go!" }
}
```

- [ ] **Step 3: Write the failing tests**

`packages/fixtures/test/worlds.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { validateScene } from '@just-imagine/scene-schema';
import { WorldDocSchema } from '@just-imagine/protocol';
import { FIXTURE_WORLDS, fixtureWorldDoc } from '../src/worlds';

describe('fixture worlds', () => {
  it('every fixture validates with no issues at all', () => {
    for (const [key, doc] of Object.entries(FIXTURE_WORLDS)) {
      const r = validateScene(doc);
      expect(r.ok, key).toBe(true);
      expect(r.issues, key).toEqual([]);
    }
  });
  it('covers water, space-free moon gravity and a pretend material between them', () => {
    expect(FIXTURE_WORLDS.pondFloat.entities.some((e) => e.kind === 'water')).toBe(true);
    expect(FIXTURE_WORLDS.moonBounce.environment.gravity.y).toBe(1.62);
    expect(FIXTURE_WORLDS.jellyDragon.materials['cloud']?.pretend).toBe(true);
  });
  it('wraps a fixture in a ready WorldDoc', () => {
    const world = fixtureWorldDoc('jellyDragon', { ownerUid: 'u1', childId: 'c1' });
    expect(WorldDocSchema.safeParse(world).success).toBe(true);
    expect(world.id).toBe('w_fixture_jelly_dragon');
    expect(world.status).toBe('ready');
    expect(world.ownerUid).toBe('u1');
  });
});
```

`packages/fixtures/test/audio.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { int16ToBytes, pcm16Tone, splitPcm16Frames } from '../src/audio';

describe('pcm16Tone', () => {
  it('produces the right number of samples and stays within amplitude', () => {
    const tone = pcm16Tone({ sampleRate: 16000, seconds: 0.5, frequency: 440, amplitude: 0.5 });
    expect(tone.length).toBe(8000);
    let max = 0;
    for (const s of tone) max = Math.max(max, Math.abs(s));
    expect(max).toBeLessThanOrEqual(16384);
    expect(max).toBeGreaterThan(16000);
  });
});

describe('splitPcm16Frames', () => {
  it('splits bytes into frames of samplesPerFrame samples and pads the last frame with silence', () => {
    const bytes = int16ToBytes(pcm16Tone({ sampleRate: 16000, seconds: 0.05, frequency: 440 }));
    const frames = splitPcm16Frames(bytes, 320);
    expect(frames.length).toBe(3);
    expect(frames.every((f) => f.byteLength === 640)).toBe(true);
    expect(Array.from(frames[2]!.slice(640 - 4))).toEqual([0, 0, 0, 0]);
  });
  it('throws on an odd byte length', () => {
    expect(() => splitPcm16Frames(new Uint8Array(641), 320)).toThrow(/multiple of 2/);
  });
});
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `pnpm install && pnpm --filter @just-imagine/fixtures test`
Expected: FAIL, modules not found.

- [ ] **Step 5: Write the modules**

`packages/fixtures/src/worlds.ts`:

```ts
import type { SceneDoc } from '@just-imagine/scene-schema';
import type { WorldDoc, WorldWithId } from '@just-imagine/protocol';
import jellyDragon from '../worlds/jelly-dragon.json' with { type: 'json' };
import moonBounce from '../worlds/moon-bounce.json' with { type: 'json' };
import pondFloat from '../worlds/pond-float.json' with { type: 'json' };

export const FIXTURE_WORLDS = {
  jellyDragon: jellyDragon as SceneDoc,
  moonBounce: moonBounce as SceneDoc,
  pondFloat: pondFloat as SceneDoc,
} as const;
export type FixtureWorldKey = keyof typeof FIXTURE_WORLDS;

export function fixtureWorldDoc(key: FixtureWorldKey, overrides: Partial<WorldDoc> = {}): WorldWithId {
  const doc = structuredClone(FIXTURE_WORLDS[key]);
  const now = 1_760_000_000_000;
  return {
    id: doc.worldId,
    ownerUid: 'u_fixture',
    childId: 'c_fixture',
    title: doc.title,
    status: 'ready',
    doc,
    schemaVersion: 1,
    promptVersion: 'fixture',
    styleVersion: 'fixture',
    assets: {},
    concepts: doc.learning.concepts,
    thumbnailUrl: null,
    jobId: `j_${key}`,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
```

`packages/fixtures/src/audio.ts`:

```ts
export function pcm16Tone(opts: { sampleRate: number; seconds: number; frequency: number; amplitude?: number }): Int16Array {
  const amplitude = opts.amplitude ?? 0.5;
  const n = Math.round(opts.sampleRate * opts.seconds);
  const out = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = Math.round(Math.sin((2 * Math.PI * opts.frequency * i) / opts.sampleRate) * amplitude * 32767);
  }
  return out;
}

export function int16ToBytes(samples: Int16Array): Uint8Array {
  const bytes = new Uint8Array(samples.length * 2);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < samples.length; i++) view.setInt16(i * 2, samples[i]!, true);
  return bytes;
}

export function splitPcm16Frames(bytes: Uint8Array, samplesPerFrame: number): Uint8Array[] {
  if (bytes.byteLength % 2 !== 0) throw new Error('PCM16 byte length must be a multiple of 2');
  const frameBytes = samplesPerFrame * 2;
  const frames: Uint8Array[] = [];
  for (let offset = 0; offset < bytes.byteLength; offset += frameBytes) {
    const frame = new Uint8Array(frameBytes);
    frame.set(bytes.subarray(offset, Math.min(offset + frameBytes, bytes.byteLength)));
    frames.push(frame);
  }
  return frames;
}
```

`packages/fixtures/src/index.ts` (grows in Tasks 12 and 13):

```ts
export * from './worlds';
export * from './audio';
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm --filter @just-imagine/fixtures test && pnpm --filter @just-imagine/fixtures typecheck && pnpm --filter @just-imagine/fixtures lint`
Expected: all pass. If the JSON import attribute syntax fails under Vitest, add `"resolveJsonModule": true` (already in the base config) and confirm Node is 22.

- [ ] **Step 7: Commit**

```bash
git add packages/fixtures pnpm-lock.yaml
git commit -m "feat(fixtures): add three validated sample worlds and synthetic PCM helpers"
```

---

### Task 12: Fixtures package: FakeWorldSource

A scripted `WorldSource` so the web app can render progressive world delivery without Firestore.

**Files:**
- Create: `packages/fixtures/src/fake-world-source.ts`
- Modify: `packages/fixtures/src/index.ts`
- Test: `packages/fixtures/test/fake-world-source.test.ts`

**Interfaces:**
- Produces: `class FakeWorldSource implements WorldSource` with `constructor(script: FakeWorldStep[], opts?: { timers?: { setTimeout; clearTimeout } })`, `type FakeWorldStep = { afterMs: number; world: WorldWithId }`, and `progressiveScript(key: FixtureWorldKey): FakeWorldStep[]` which yields building (placeholders) at 0 ms, hero asset ready at 400 ms, status ready at 800 ms.
- Consumed by Plan A3 (local dev and Playwright with the fake flag) and Plan A1 (engine progressive-load tests).

- [ ] **Step 1: Write the failing test**

`packages/fixtures/test/fake-world-source.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { FakeWorldSource, progressiveScript } from '../src/fake-world-source';

describe('FakeWorldSource', () => {
  it('emits the scripted steps in order on the fake clock and stops after unsubscribe', () => {
    vi.useFakeTimers();
    const script = progressiveScript('jellyDragon');
    const source = new FakeWorldSource(script);
    const seen: string[] = [];
    const unsubscribe = source.subscribe('w_fixture_jelly_dragon', (w) => seen.push(`${w.status}:${w.doc.entities[2]?.asset?.status ?? 'none'}`));

    vi.advanceTimersByTime(0);
    expect(seen).toEqual(['building:none']);
    vi.advanceTimersByTime(400);
    expect(seen).toEqual(['building:none', 'building:ready']);
    unsubscribe();
    vi.advanceTimersByTime(1000);
    expect(seen.length).toBe(2);
    vi.useRealTimers();
  });

  it('ignores subscriptions for other world ids', () => {
    vi.useFakeTimers();
    const source = new FakeWorldSource(progressiveScript('moonBounce'));
    const cb = vi.fn();
    source.subscribe('w_other', cb);
    vi.advanceTimersByTime(2000);
    expect(cb).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @just-imagine/fixtures test -- fake-world-source`
Expected: FAIL, module not found.

- [ ] **Step 3: Write the implementation**

`packages/fixtures/src/fake-world-source.ts`:

```ts
import type { WorldSource, WorldWithId } from '@just-imagine/protocol';
import { fixtureWorldDoc, type FixtureWorldKey } from './worlds';

export interface FakeWorldStep { afterMs: number; world: WorldWithId }

export function progressiveScript(key: FixtureWorldKey): FakeWorldStep[] {
  const ready = fixtureWorldDoc(key);
  const heroId = ready.doc.learning.heroEntityId;

  const building = structuredClone(ready);
  building.status = 'building';
  building.assets = Object.fromEntries(building.doc.entities.map((e) => [e.id, { status: 'generating' as const }]));

  const heroReady = structuredClone(building);
  const hero = heroReady.doc.entities.find((e) => e.id === heroId)!;
  hero.asset = { url: `https://cdn.invalid/fixtures/${key}/${heroId}.webp`, width: 1024, height: 1024, status: 'ready' };
  heroReady.assets[heroId] = { status: 'ready', url: hero.asset.url };

  return [
    { afterMs: 0, world: building },
    { afterMs: 400, world: heroReady },
    { afterMs: 800, world: ready },
  ];
}

export class FakeWorldSource implements WorldSource {
  constructor(private readonly script: FakeWorldStep[]) {}

  subscribe(worldId: string, onUpdate: (world: WorldWithId) => void): () => void {
    const handles = this.script
      .filter((step) => step.world.id === worldId)
      .map((step) => setTimeout(() => onUpdate(structuredClone(step.world)), step.afterMs));
    return () => handles.forEach((h) => clearTimeout(h));
  }
}
```

Add to `packages/fixtures/src/index.ts`:

```ts
export * from './fake-world-source';
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @just-imagine/fixtures test && pnpm --filter @just-imagine/fixtures typecheck`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add packages/fixtures
git commit -m "feat(fixtures): add scripted FakeWorldSource for progressive world delivery"
```

---

### Task 13: Fixtures package: fake gateway

A WebSocket server that speaks the protocol from scripted scenarios, so the web app can be developed and end-to-end tested without Vertex AI.

**Files:**
- Create: `packages/fixtures/scenarios/jelly-dragon.json`, `packages/fixtures/src/fake-gateway.ts`, `packages/fixtures/bin/fake-gateway.ts`
- Modify: `packages/fixtures/src/index.ts`
- Test: `packages/fixtures/test/fake-gateway.test.ts`

**Interfaces:**
- Produces: `startFakeGateway(opts: { port: number; scenario: Scenario; tone?: boolean }): Promise<FakeGateway>`, `type FakeGateway = { port: number; url: string; close(): Promise<void>; received: ClientMessage[] }`, `type Scenario = { onHello: ServerMessage[]; onInteraction: ServerMessage[]; onSwitchCharacter: ServerMessage[]; timeline: Array<{ afterMs: number; message: ServerMessage }> }`, `ScenarioSchema`, `SCENARIOS.jellyDragon`.
- Behavior: on `hello` it replies `ready` (session id `s_fake`, the requested character, the requested world id) then `onHello`; when `tone` is on it streams one second of a 440 Hz tone as 24 kHz PCM16 binary frames after `ready`; on `interaction` it replies `onInteraction`; on `switchCharacter` it replies `ready` for the new character then `onSwitchCharacter`; on `end` it replies `bye` with reason `ended` and closes; timeline messages fire relative to `hello`. Every parsed client message is appended to `received`. A message that fails `ClientMessageSchema` gets `error` with code `INTERNAL`.
- Consumed by Plan A2 (client tests), Plan A3 (dev server and Playwright), Plan B1 (as the reference behavior for the real gateway).

- [ ] **Step 1: Write the scenario**

`packages/fixtures/scenarios/jelly-dragon.json`:

```json
{
  "onHello": [
    { "type": "characterState", "characterId": "bhombol", "emotion": "happy", "speaking": true },
    { "type": "transcript", "role": "character", "text": "Hi! I am Bhombol. What shall we build today?", "final": true },
    { "type": "characterState", "characterId": "bhombol", "emotion": "idle", "speaking": false }
  ],
  "onInteraction": [
    { "type": "characterState", "characterId": "bhombol", "emotion": "surprised", "speaking": true },
    { "type": "transcript", "role": "character", "text": "Whoa, look at it wobble!", "final": true },
    { "type": "characterState", "characterId": "bhombol", "emotion": "idle", "speaking": false }
  ],
  "onSwitchCharacter": [
    { "type": "transcript", "role": "character", "text": "Hello, I am here now. What did you notice?", "final": true }
  ],
  "timeline": [
    { "afterMs": 1500, "message": { "type": "transcript", "role": "child", "text": "a jelly dragon on a cloud", "final": true } },
    { "afterMs": 2000, "message": { "type": "worldJob", "jobId": "j_fake", "worldId": "w_fixture_jelly_dragon", "status": "queued" } },
    { "afterMs": 2500, "message": { "type": "prediction", "question": "If the dragon falls off the cloud, will it bounce or splat?", "options": ["bounce", "splat"] } },
    { "afterMs": 3000, "message": { "type": "worldJob", "jobId": "j_fake", "worldId": "w_fixture_jelly_dragon", "status": "placeholders" } },
    { "afterMs": 4500, "message": { "type": "worldJob", "jobId": "j_fake", "worldId": "w_fixture_jelly_dragon", "status": "ready" } },
    { "afterMs": 5000, "message": { "type": "transcript", "role": "character", "text": "Here is your jelly dragon, snoozing on a cloud. Try giving it a little flick!", "final": true } },
    { "afterMs": 9000, "message": { "type": "discovery", "concept": "bounce", "title": "Boing!", "kidExplanation": "Squishy things squash and spring back.", "realLifeNote": "A rubber ball bounces for the same reason." } },
    { "afterMs": 12000, "message": { "type": "quota", "voiceSecondsLeft": 120 } }
  ]
}
```

- [ ] **Step 2: Write the failing test**

`packages/fixtures/test/fake-gateway.test.ts`:

```ts
import { describe, it, expect, afterEach } from 'vitest';
import { encodeMessage, parseServerMessage, type ServerMessage } from '@just-imagine/protocol';
import { startFakeGateway, SCENARIOS, type FakeGateway } from '../src/fake-gateway';

let gateway: FakeGateway | undefined;
afterEach(async () => { await gateway?.close(); gateway = undefined; });

function connect(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.binaryType = 'arraybuffer';
    ws.onopen = () => resolve(ws);
    ws.onerror = () => reject(new Error('connect failed'));
  });
}

function nextJson(ws: WebSocket): Promise<ServerMessage> {
  return new Promise((resolve) => {
    const handler = (ev: MessageEvent) => {
      if (typeof ev.data !== 'string') return;
      ws.removeEventListener('message', handler);
      resolve(parseServerMessage(ev.data));
    };
    ws.addEventListener('message', handler);
  });
}

describe('fake gateway', () => {
  it('answers hello with ready and the scenario greeting, and records what it received', async () => {
    gateway = await startFakeGateway({ port: 0, scenario: SCENARIOS.jellyDragon });
    const ws = await connect(gateway.url);
    const first = nextJson(ws);
    ws.send(encodeMessage({ type: 'hello', idToken: 't', childId: 'c1', characterId: 'bhombol', worldId: 'w_fixture_jelly_dragon' }));
    expect(await first).toEqual({ type: 'ready', sessionId: 's_fake', characterId: 'bhombol', worldId: 'w_fixture_jelly_dragon' });
    expect(await nextJson(ws)).toMatchObject({ type: 'characterState', emotion: 'happy' });
    expect(gateway.received[0]).toMatchObject({ type: 'hello', childId: 'c1' });
    ws.close();
  });

  it('streams a one-second 24 kHz tone as 50 binary frames when tone is on', async () => {
    gateway = await startFakeGateway({ port: 0, scenario: SCENARIOS.jellyDragon, tone: true });
    const ws = await connect(gateway.url);
    const frames: ArrayBuffer[] = [];
    const done = new Promise<void>((resolve) => {
      ws.addEventListener('message', (ev: MessageEvent) => {
        if (ev.data instanceof ArrayBuffer) { frames.push(ev.data); if (frames.length === 50) resolve(); }
      });
    });
    ws.send(encodeMessage({ type: 'hello', idToken: 't', childId: 'c1', characterId: 'mishti' }));
    await done;
    expect(frames.every((f) => f.byteLength === 960)).toBe(true);
    ws.close();
  });

  it('replies bye and closes on end', async () => {
    gateway = await startFakeGateway({ port: 0, scenario: SCENARIOS.jellyDragon });
    const ws = await connect(gateway.url);
    ws.send(encodeMessage({ type: 'hello', idToken: 't', childId: 'c1', characterId: 'chandni' }));
    await nextJson(ws);
    const closed = new Promise<void>((resolve) => ws.addEventListener('close', () => resolve()));
    const bye = nextJson(ws);
    ws.send(encodeMessage({ type: 'end' }));
    expect(await bye).toEqual({ type: 'bye', reason: 'ended' });
    await closed;
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm --filter @just-imagine/fixtures test -- fake-gateway`
Expected: FAIL, module not found.

- [ ] **Step 4: Write the implementation**

`packages/fixtures/src/fake-gateway.ts`:

```ts
import { WebSocketServer, type WebSocket as WsSocket } from 'ws';
import { z } from 'zod';
import {
  AUDIO_OUT, CHARACTERS, ClientMessageSchema, ServerMessageSchema, encodeMessage,
  type ClientMessage, type ServerMessage,
} from '@just-imagine/protocol';
import { int16ToBytes, pcm16Tone, splitPcm16Frames } from './audio';
import jellyDragonScenario from '../scenarios/jelly-dragon.json' with { type: 'json' };

export const ScenarioSchema = z.object({
  onHello: z.array(ServerMessageSchema),
  onInteraction: z.array(ServerMessageSchema),
  onSwitchCharacter: z.array(ServerMessageSchema),
  timeline: z.array(z.object({ afterMs: z.number().int().min(0), message: ServerMessageSchema })),
});
export type Scenario = z.infer<typeof ScenarioSchema>;

export const SCENARIOS = { jellyDragon: ScenarioSchema.parse(jellyDragonScenario) } as const;

export interface FakeGateway { port: number; url: string; close(): Promise<void>; received: ClientMessage[] }

export function startFakeGateway(opts: { port: number; scenario: Scenario; tone?: boolean }): Promise<FakeGateway> {
  const wss = new WebSocketServer({ port: opts.port });
  const received: ClientMessage[] = [];

  wss.on('connection', (ws: WsSocket) => {
    const timers: NodeJS.Timeout[] = [];
    const send = (m: ServerMessage): void => { if (ws.readyState === ws.OPEN) ws.send(encodeMessage(m)); };
    const sendAll = (ms: ServerMessage[]): void => ms.forEach(send);

    ws.on('message', (data, isBinary) => {
      if (isBinary) return; // child audio is accepted and dropped
      const parsed = ClientMessageSchema.safeParse(JSON.parse(data.toString()));
      if (!parsed.success) { send({ type: 'error', code: 'INTERNAL', message: 'malformed client message' }); return; }
      const m = parsed.data;
      received.push(m);
      switch (m.type) {
        case 'hello': {
          send({ type: 'ready', sessionId: 's_fake', characterId: m.characterId, ...(m.worldId ? { worldId: m.worldId } : {}) });
          sendAll(opts.scenario.onHello);
          if (opts.tone) {
            const bytes = int16ToBytes(pcm16Tone({ sampleRate: AUDIO_OUT.sampleRate, seconds: 1, frequency: 440 }));
            for (const frame of splitPcm16Frames(bytes, AUDIO_OUT.samplesPerFrame)) ws.send(frame, { binary: true });
          }
          for (const step of opts.scenario.timeline) timers.push(setTimeout(() => send(step.message), step.afterMs));
          break;
        }
        case 'interaction': sendAll(opts.scenario.onInteraction); break;
        case 'switchCharacter':
          if (CHARACTERS[m.characterId].kind === 'guide') send({ type: 'summon', characterId: m.characterId });
          send({ type: 'ready', sessionId: 's_fake', characterId: m.characterId });
          sendAll(opts.scenario.onSwitchCharacter);
          break;
        case 'end':
          send({ type: 'bye', reason: 'ended' });
          ws.close();
          break;
        default: break;
      }
    });
    ws.on('close', () => timers.forEach(clearTimeout));
  });

  return new Promise((resolve, reject) => {
    wss.once('error', reject);
    wss.once('listening', () => {
      const address = wss.address();
      const port = typeof address === 'object' && address ? address.port : opts.port;
      resolve({
        port,
        url: `ws://127.0.0.1:${port}`,
        received,
        close: () => new Promise<void>((res) => { for (const c of wss.clients) c.terminate(); wss.close(() => res()); }),
      });
    });
  });
}
```

`packages/fixtures/bin/fake-gateway.ts`:

```ts
import { SCENARIOS, startFakeGateway } from '../src/fake-gateway';

const port = Number(process.env['PORT'] ?? 8787);
const gateway = await startFakeGateway({ port, scenario: SCENARIOS.jellyDragon, tone: process.env['TONE'] === '1' });
console.log(`fake gateway listening on ${gateway.url}`);
process.on('SIGINT', () => { void gateway.close().then(() => process.exit(0)); });
```

Add to `packages/fixtures/src/index.ts`:

```ts
export * from './fake-gateway';
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter @just-imagine/fixtures test && pnpm --filter @just-imagine/fixtures typecheck && pnpm --filter @just-imagine/fixtures lint`
Expected: all pass. Node 22 provides the global `WebSocket` client used by the tests. Then run `pnpm --filter @just-imagine/fixtures dev` and confirm the log line prints; stop it with Ctrl-C.

- [ ] **Step 6: Commit**

```bash
git add packages/fixtures
git commit -m "feat(fixtures): add scripted fake gateway WebSocket server"
```

---

### Task 14: server-core: Firebase Admin, token verification, typed documents, ids

Node-only helpers shared by `services/gateway`, `services/api`, and `services/builder`. Tests run against the Firebase emulators, which need Java 21 and the Firebase CLI.

**Files:**
- Create: `firebase.json` (repo root)
- Create: `packages/server-core/package.json`, `packages/server-core/tsconfig.json`, `packages/server-core/eslint.config.js`, `packages/server-core/vitest.config.ts`
- Create: `packages/server-core/src/firebase.ts`, `packages/server-core/src/auth.ts`, `packages/server-core/src/docs.ts`, `packages/server-core/src/ids.ts`, `packages/server-core/src/index.ts`
- Test: `packages/server-core/test/emulator.ts`, `packages/server-core/test/auth.test.ts`, `packages/server-core/test/docs.test.ts`, `packages/server-core/test/ids.test.ts`

**Interfaces:**
- Produces:
  - `getAdminApp(): App`, `db(): Firestore`, `adminAuth(): Auth`, `isEmulator(): boolean`
  - `class AuthError extends Error { code: 'UNAUTHENTICATED' }`, `verifyIdToken(idToken: string): Promise<{ uid: string }>`
  - `readDoc<S extends ZodType>(path: string, schema: S): Promise<z.infer<S> | null>`, `writeDoc<S>(path, schema, data): Promise<void>`, `updateDoc<S>(path, schema, partial): Promise<void>`, `class DocShapeError extends Error`
  - `newId(prefix: 'w' | 's' | 'j' | 'c'): string` (prefix, underscore, 26-char lowercase ULID)
- Consumed by Plans B1, B2, B3 and Task 15.

- [ ] **Step 1: Create the emulator config and package files**

`firebase.json` (repo root):

```json
{
  "emulators": {
    "firestore": { "port": 8080 },
    "auth": { "port": 9099 },
    "ui": { "enabled": false },
    "singleProjectMode": true
  }
}
```

Add to the root `package.json` `devDependencies`: `"firebase-tools": "^14.0.0"`. Then `pnpm install`.

`packages/server-core/package.json`:

```json
{
  "name": "@just-imagine/server-core",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "test": "firebase emulators:exec --only firestore,auth --project demo-just-imagine \"vitest run\"",
    "test:unit": "vitest run test/ids.test.ts",
    "typecheck": "tsc --noEmit",
    "lint": "eslint ."
  },
  "dependencies": {
    "@just-imagine/protocol": "workspace:*",
    "@just-imagine/scene-schema": "workspace:*",
    "firebase-admin": "^13.4.0",
    "ulid": "^3.0.0",
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

`tsconfig.json`, `eslint.config.js`, `vitest.config.ts` as in Task 2, with `vitest.config.ts` also setting `test: { include: ['test/**/*.test.ts'], environment: 'node', fileParallelism: false }` so emulator tests do not interleave.

- [ ] **Step 2: Write the emulator test helper and the failing tests**

`packages/server-core/test/emulator.ts`:

```ts
process.env['FIRESTORE_EMULATOR_HOST'] ??= '127.0.0.1:8080';
process.env['FIREBASE_AUTH_EMULATOR_HOST'] ??= '127.0.0.1:9099';
process.env['GOOGLE_CLOUD_PROJECT'] ??= 'demo-just-imagine';

export const PROJECT = process.env['GOOGLE_CLOUD_PROJECT'];

export async function clearFirestore(): Promise<void> {
  const res = await fetch(`http://${process.env['FIRESTORE_EMULATOR_HOST']}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`clearFirestore failed: ${res.status}`);
}

// Exchanges an Admin custom token for a real ID token through the Auth emulator.
export async function idTokenFor(uid: string): Promise<string> {
  const { adminAuth } = await import('../src/firebase');
  const custom = await adminAuth().createCustomToken(uid);
  const res = await fetch(`http://${process.env['FIREBASE_AUTH_EMULATOR_HOST']}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake-api-key`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: custom, returnSecureToken: true }),
  });
  const body = (await res.json()) as { idToken?: string };
  if (!body.idToken) throw new Error('no idToken from auth emulator');
  return body.idToken;
}
```

`packages/server-core/test/auth.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { idTokenFor } from './emulator';
import { verifyIdToken, AuthError } from '../src/auth';

describe('verifyIdToken', () => {
  it('returns the uid for a valid emulator token', async () => {
    const token = await idTokenFor('u_test');
    await expect(verifyIdToken(token)).resolves.toEqual({ uid: 'u_test' });
  });
  it('throws AuthError for garbage', async () => {
    await expect(verifyIdToken('not-a-token')).rejects.toBeInstanceOf(AuthError);
  });
});
```

`packages/server-core/test/docs.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { ChildDocSchema, paths } from '@just-imagine/protocol';
import { clearFirestore } from './emulator';
import { readDoc, writeDoc, updateDoc, DocShapeError } from '../src/docs';

const child = { firstName: 'Mira', avatar: 'owl' as const, ageBand: '8-10' as const, tier: 'playground' as const, labsUnlocked: false, captions: true, sessionTargetMinutes: 8, loopsCompleted: 0, createdAt: 1 };

describe('typed documents', () => {
  beforeEach(clearFirestore);

  it('writes and reads a document through its schema', async () => {
    await writeDoc(paths.child('u1', 'c1'), ChildDocSchema, child);
    await expect(readDoc(paths.child('u1', 'c1'), ChildDocSchema)).resolves.toEqual(child);
  });
  it('returns null for a missing document', async () => {
    await expect(readDoc(paths.child('u1', 'nope'), ChildDocSchema)).resolves.toBeNull();
  });
  it('refuses to write data that fails the schema', async () => {
    await expect(writeDoc(paths.child('u1', 'c1'), ChildDocSchema, { ...child, ageBand: '14-16' })).rejects.toBeInstanceOf(DocShapeError);
  });
  it('merges a partial update and re-validates the result', async () => {
    await writeDoc(paths.child('u1', 'c1'), ChildDocSchema, child);
    await updateDoc(paths.child('u1', 'c1'), ChildDocSchema, { loopsCompleted: 3 });
    await expect(readDoc(paths.child('u1', 'c1'), ChildDocSchema)).resolves.toEqual({ ...child, loopsCompleted: 3 });
  });
});
```

`packages/server-core/test/ids.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { newId } from '../src/ids';

describe('newId', () => {
  it('produces prefixed lowercase ULIDs that sort by time', () => {
    const a = newId('w');
    const b = newId('w');
    expect(a).toMatch(/^w_[0-9a-z]{26}$/);
    expect(a < b || a === b).toBe(true);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm install && pnpm --filter @just-imagine/server-core test`
Expected: the emulators start, then FAIL with modules not found. If the emulators do not start, install Java 21 and run `pnpm exec firebase --version`.

- [ ] **Step 4: Write the modules**

`packages/server-core/src/firebase.ts`:

```ts
import { getApps, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';

export function isEmulator(): boolean {
  return Boolean(process.env['FIRESTORE_EMULATOR_HOST'] || process.env['FIREBASE_AUTH_EMULATOR_HOST']);
}

export function getAdminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;
  const projectId = process.env['GOOGLE_CLOUD_PROJECT'] ?? (isEmulator() ? 'demo-just-imagine' : undefined);
  return initializeApp(projectId ? { projectId } : {});
}

export function db(): Firestore {
  const firestore = getFirestore(getAdminApp());
  return firestore;
}

export function adminAuth(): Auth {
  return getAuth(getAdminApp());
}
```

`packages/server-core/src/auth.ts`:

```ts
import { adminAuth } from './firebase';

export class AuthError extends Error {
  readonly code = 'UNAUTHENTICATED' as const;
  constructor(message: string) { super(message); this.name = 'AuthError'; }
}

export async function verifyIdToken(idToken: string): Promise<{ uid: string }> {
  try {
    const decoded = await adminAuth().verifyIdToken(idToken, true);
    return { uid: decoded.uid };
  } catch (e) {
    throw new AuthError(e instanceof Error ? e.message : 'invalid token');
  }
}
```

`packages/server-core/src/docs.ts`:

```ts
import type { z, ZodType } from 'zod';
import { db } from './firebase';

export class DocShapeError extends Error {
  constructor(public readonly path: string, public readonly issues: unknown) {
    super(`document at ${path} does not match its schema`);
    this.name = 'DocShapeError';
  }
}

export async function readDoc<S extends ZodType>(path: string, schema: S): Promise<z.infer<S> | null> {
  const snap = await db().doc(path).get();
  if (!snap.exists) return null;
  const parsed = schema.safeParse(snap.data());
  if (!parsed.success) throw new DocShapeError(path, parsed.error.issues);
  return parsed.data as z.infer<S>;
}

export async function writeDoc<S extends ZodType>(path: string, schema: S, data: unknown): Promise<void> {
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new DocShapeError(path, parsed.error.issues);
  await db().doc(path).set(parsed.data as Record<string, unknown>);
}

export async function updateDoc<S extends ZodType>(path: string, schema: S, partial: Record<string, unknown>): Promise<void> {
  await db().runTransaction(async (tx) => {
    const ref = db().doc(path);
    const snap = await tx.get(ref);
    if (!snap.exists) throw new DocShapeError(path, 'missing');
    const merged = { ...snap.data(), ...partial };
    const parsed = schema.safeParse(merged);
    if (!parsed.success) throw new DocShapeError(path, parsed.error.issues);
    tx.set(ref, parsed.data as Record<string, unknown>);
  });
}
```

`packages/server-core/src/ids.ts`:

```ts
import { ulid } from 'ulid';

export type IdPrefix = 'w' | 's' | 'j' | 'c';

export function newId(prefix: IdPrefix): string {
  return `${prefix}_${ulid().toLowerCase()}`;
}
```

`packages/server-core/src/index.ts` (grows in Task 15):

```ts
export * from './firebase';
export * from './auth';
export * from './docs';
export * from './ids';
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter @just-imagine/server-core test && pnpm --filter @just-imagine/server-core typecheck && pnpm --filter @just-imagine/server-core lint`
Expected: all pass under the emulators.

- [ ] **Step 6: Commit**

```bash
git add firebase.json package.json pnpm-lock.yaml packages/server-core
git commit -m "feat(server-core): add Firebase Admin init, token verification, typed documents, and ids"
```

---

### Task 15: server-core: quota transactions and kill switch

**Files:**
- Create: `packages/server-core/src/quota.ts`, `packages/server-core/src/kill-switch.ts`
- Modify: `packages/server-core/src/index.ts`
- Test: `packages/server-core/test/quota.test.ts`, `packages/server-core/test/kill-switch.test.ts`

**Interfaces:**
- Produces:
  - `class QuotaExceeded extends Error { kind: 'voice' | 'worlds' | 'images'; limit: number }`
  - `reserveWorld(uid: string, plan: PlanTier, now?: Date): Promise<{ worldsUsed: number; worldsLeft: number }>` (throws `QuotaExceeded` when the day's worlds are used up; atomic)
  - `addVoiceSeconds(uid: string, plan: PlanTier, seconds: number, now?: Date): Promise<{ voiceSecondsLeft: number }>` (never throws; may return a negative number)
  - `voiceSecondsLeft(uid: string, plan: PlanTier, now?: Date): Promise<number>`
  - `addImages(uid: string, count: number, now?: Date): Promise<void>`
  - `isKillSwitchOn(): Promise<boolean>`, `watchKillSwitch(onChange: (on: boolean) => void): () => void`
- Consumed by Plan B1 (voice metering and refusal), Plan B2 (images), Plan B3 (worlds, usage endpoint), all services (kill switch).

- [ ] **Step 1: Write the failing tests**

`packages/server-core/test/quota.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { PLAN_LIMITS, UsageDailyDocSchema, paths, yyyymmdd } from '@just-imagine/protocol';
import { clearFirestore } from './emulator';
import { readDoc } from '../src/docs';
import { QuotaExceeded, addImages, addVoiceSeconds, reserveWorld, voiceSecondsLeft } from '../src/quota';

const now = new Date('2026-10-15T10:00:00Z');
const day = yyyymmdd(now);

describe('quota', () => {
  beforeEach(clearFirestore);

  it('counts worlds per day and refuses the fourth free world', async () => {
    await expect(reserveWorld('u1', 'free', now)).resolves.toEqual({ worldsUsed: 1, worldsLeft: 2 });
    await reserveWorld('u1', 'free', now);
    await reserveWorld('u1', 'free', now);
    await expect(reserveWorld('u1', 'free', now)).rejects.toMatchObject({ kind: 'worlds', limit: 3 });
    const usage = await readDoc(paths.usageDaily('u1', day), UsageDailyDocSchema);
    expect(usage?.worlds).toBe(3);
  });

  it('lets exactly one of two concurrent reservations through at the last unit', async () => {
    await reserveWorld('u1', 'free', now);
    await reserveWorld('u1', 'free', now);
    const results = await Promise.allSettled([reserveWorld('u1', 'free', now), reserveWorld('u1', 'free', now)]);
    const ok = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r) => r.status === 'rejected');
    expect(ok.length).toBe(1);
    expect(failed.length).toBe(1);
    expect((failed[0] as PromiseRejectedResult).reason).toBeInstanceOf(QuotaExceeded);
  });

  it('starts a new day with a fresh counter', async () => {
    for (let i = 0; i < 3; i++) await reserveWorld('u1', 'free', now);
    const tomorrow = new Date('2026-10-16T00:00:01Z');
    await expect(reserveWorld('u1', 'free', tomorrow)).resolves.toEqual({ worldsUsed: 1, worldsLeft: 2 });
  });

  it('accumulates voice seconds and reports what is left, going negative rather than throwing', async () => {
    expect(await voiceSecondsLeft('u1', 'free', now)).toBe(PLAN_LIMITS.free.voiceSecondsPerDay);
    await expect(addVoiceSeconds('u1', 'free', 30, now)).resolves.toEqual({ voiceSecondsLeft: 870 });
    await expect(addVoiceSeconds('u1', 'free', 900, now)).resolves.toEqual({ voiceSecondsLeft: -30 });
  });

  it('counts images', async () => {
    await addImages('u1', 4, now);
    await addImages('u1', 2, now);
    const usage = await readDoc(paths.usageDaily('u1', day), UsageDailyDocSchema);
    expect(usage?.images).toBe(6);
  });
});
```

`packages/server-core/test/kill-switch.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { RuntimeConfigDocSchema, paths } from '@just-imagine/protocol';
import { clearFirestore } from './emulator';
import { writeDoc } from '../src/docs';
import { isKillSwitchOn, watchKillSwitch } from '../src/kill-switch';

describe('kill switch', () => {
  beforeEach(clearFirestore);

  it('is off when the config document is missing', async () => {
    await expect(isKillSwitchOn()).resolves.toBe(false);
  });

  it('reflects the config document and notifies watchers', async () => {
    const seen: boolean[] = [];
    const stop = watchKillSwitch((on) => seen.push(on));
    await writeDoc(paths.runtimeConfig(), RuntimeConfigDocSchema, { killSwitch: true, updatedAt: 1 });
    await new Promise((r) => setTimeout(r, 500));
    await expect(isKillSwitchOn()).resolves.toBe(true);
    expect(seen.at(-1)).toBe(true);
    stop();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @just-imagine/server-core test`
Expected: FAIL, modules not found.

- [ ] **Step 3: Write the modules**

`packages/server-core/src/quota.ts`:

```ts
import { PLAN_LIMITS, UsageDailyDocSchema, paths, yyyymmdd, type PlanTier, type UsageDailyDoc } from '@just-imagine/protocol';
import { db } from './firebase';

export class QuotaExceeded extends Error {
  constructor(public readonly kind: 'voice' | 'worlds' | 'images', public readonly limit: number) {
    super(`${kind} quota of ${limit} exhausted`);
    this.name = 'QuotaExceeded';
  }
}

function emptyUsage(uid: string, date: string): UsageDailyDoc {
  return { uid, date, voiceSeconds: 0, worlds: 0, images: 0 };
}

async function bump(uid: string, now: Date, apply: (usage: UsageDailyDoc) => UsageDailyDoc): Promise<UsageDailyDoc> {
  const date = yyyymmdd(now);
  const ref = db().doc(paths.usageDaily(uid, date));
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists ? UsageDailyDocSchema.parse(snap.data()) : emptyUsage(uid, date);
    const next = apply(current);
    tx.set(ref, next);
    return next;
  });
}

export async function reserveWorld(uid: string, plan: PlanTier, now = new Date()): Promise<{ worldsUsed: number; worldsLeft: number }> {
  const limit = PLAN_LIMITS[plan].worldsPerDay;
  const next = await bump(uid, now, (u) => {
    if (u.worlds >= limit) throw new QuotaExceeded('worlds', limit);
    return { ...u, worlds: u.worlds + 1 };
  });
  return { worldsUsed: next.worlds, worldsLeft: limit - next.worlds };
}

export async function addVoiceSeconds(uid: string, plan: PlanTier, seconds: number, now = new Date()): Promise<{ voiceSecondsLeft: number }> {
  const limit = PLAN_LIMITS[plan].voiceSecondsPerDay;
  const next = await bump(uid, now, (u) => ({ ...u, voiceSeconds: u.voiceSeconds + Math.max(0, Math.round(seconds)) }));
  return { voiceSecondsLeft: limit - next.voiceSeconds };
}

export async function voiceSecondsLeft(uid: string, plan: PlanTier, now = new Date()): Promise<number> {
  const snap = await db().doc(paths.usageDaily(uid, yyyymmdd(now))).get();
  const used = snap.exists ? UsageDailyDocSchema.parse(snap.data()).voiceSeconds : 0;
  return PLAN_LIMITS[plan].voiceSecondsPerDay - used;
}

export async function addImages(uid: string, count: number, now = new Date()): Promise<void> {
  await bump(uid, now, (u) => ({ ...u, images: u.images + Math.max(0, count) }));
}
```

`packages/server-core/src/kill-switch.ts`:

```ts
import { RuntimeConfigDocSchema, paths } from '@just-imagine/protocol';
import { db } from './firebase';

export async function isKillSwitchOn(): Promise<boolean> {
  const snap = await db().doc(paths.runtimeConfig()).get();
  if (!snap.exists) return false;
  const parsed = RuntimeConfigDocSchema.safeParse(snap.data());
  return parsed.success ? parsed.data.killSwitch : false;
}

export function watchKillSwitch(onChange: (on: boolean) => void): () => void {
  return db().doc(paths.runtimeConfig()).onSnapshot((snap) => {
    const parsed = snap.exists ? RuntimeConfigDocSchema.safeParse(snap.data()) : null;
    onChange(parsed?.success ? parsed.data.killSwitch : false);
  });
}
```

Add to `packages/server-core/src/index.ts`:

```ts
export * from './quota';
export * from './kill-switch';
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @just-imagine/server-core test && pnpm --filter @just-imagine/server-core typecheck && pnpm --filter @just-imagine/server-core lint`
Expected: all pass. The concurrency test relies on Firestore transaction retries; it must pass ten times in a row (`for i in $(seq 10); do pnpm --filter @just-imagine/server-core test || break; done`).

- [ ] **Step 5: Commit**

```bash
git add packages/server-core
git commit -m "feat(server-core): add atomic daily quota counters and kill switch"
```

---

### Task 16: Continuous integration

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Produces: a required check named `ci` for pull requests to `main`. Plan B4 extends delivery with Cloud Build; this workflow stays the gate for correctness.

- [ ] **Step 1: Write the workflow**

`.github/workflows/ci.yml`:

```yaml
name: ci
on:
  pull_request:
  push:
    branches: [main]
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
jobs:
  ci:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 21
      - run: pnpm install --frozen-lockfile
      - run: pnpm format:check
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
```

- [ ] **Step 2: Verify locally that the same commands pass**

Run: `pnpm install --frozen-lockfile && pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`
Expected: all green. Fix formatting with `pnpm format` if `format:check` fails.

- [ ] **Step 3: Commit, push, and confirm the check runs**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: run format, lint, typecheck, and tests on pull requests"
git push
```

Open the Actions tab on GitHub and confirm the `ci` job is green. Then in repository settings, protect `main`: require the `ci` check and one approving review before merge.

---

### Task 17: Scene DSL lab extension and projectile fixture

Sequence: Dev A does this right after Task 7, before Task 11, so the fixtures package is created with four worlds. All new fields are optional, so every earlier test keeps passing.

**Files:**
- Modify: `packages/scene-schema/src/schema.ts` (lab schemas, new actions, new rule event, new SceneDoc fields)
- Modify: `packages/scene-schema/src/validator.ts` (`checkLab`, new issue codes)
- Create: `packages/fixtures/worlds/projectile-lab.json`
- Modify: `packages/fixtures/src/worlds.ts`, `packages/fixtures/test/worlds.test.ts`
- Test: `packages/scene-schema/test/lab.test.ts`

**Interfaces:**
- Produces: `VariableBindSchema`, `VariableSchema`, `type Variable`, `VisualSchema`, `type Visual`, `ChallengeSchema`, `type Challenge`, `LAB_LIMITS = { maxVariables: 6, maxVisuals: 6, maxChallenges: 3 }`, `SceneDoc.variables?`, `SceneDoc.visuals?`, `SceneDoc.challenges?`, actions `launch`, `setGravity`, `setTimeScale`, `scaleEntity`, rule event `challengeComplete`, issue codes `LAUNCH_NEEDS_DYNAMIC`, `LAB_EMPTY`, `PLAYGROUND_HAS_LAB_FIELDS`, `UNKNOWN_CHALLENGE_REF`, `VARIABLE_RANGE`, and `FIXTURE_WORLDS.projectileLab`.
- Consumed by Plan A1 (slider panel, visual overlays, launch), Plan B2 (lab builder prompts), Plan B1 (`set_variable`, `start_challenge` tools).

- [ ] **Step 1: Write the failing tests**

`packages/scene-schema/test/lab.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { SceneDocSchema, type SceneDoc } from '../src/schema';
import { validateScene } from '../src/validator';
import { minimalScene } from './helpers';

function minimalLab(): SceneDoc {
  const doc = minimalScene();
  doc.tier = 'lab';
  doc.learning.concepts = ['projectile', 'gravity'];
  doc.learning.prediction.concept = 'projectile';
  doc.rules[0]!.concept = 'gravity';
  doc.variables = {
    launch_speed: { label: 'Launch speed', min: 2, max: 20, step: 0.5, value: 10, unit: 'm/s', binds: { kind: 'launch', entity: 'ball', prop: 'speed' } },
    gravity: { label: 'Gravity', min: 1, max: 25, step: 0.1, value: 9.81, unit: 'm/s²', binds: { kind: 'gravity' } },
  };
  doc.visuals = [
    { type: 'plot', id: 'height', title: 'Height over time', x: 'time', y: { entity: 'ball', prop: 'height' }, maxSeconds: 6 },
    { type: 'vector', entity: 'ball', show: 'velocity' },
  ];
  doc.challenges = [
    { id: 'ch_ground', goal: 'Make the ball land past the middle', check: { event: 'collision', a: 'hero', b: 'ground' }, hint: 'Try a bigger angle', concept: 'projectile', reward: [{ action: 'celebrate', style: 'confetti' }] },
  ];
  doc.rules.push({ id: 'r_go', when: { event: 'tap', target: 'hero' }, then: [{ action: 'launch', target: 'hero' }], once: false });
  return doc;
}

const codes = (r: { issues: { code: string }[] }) => r.issues.map((i) => i.code);

describe('lab extension', () => {
  it('parses and validates a minimal lab world', () => {
    expect(SceneDocSchema.safeParse(minimalLab()).success).toBe(true);
    const r = validateScene(minimalLab());
    expect(r.ok).toBe(true);
    expect(r.issues).toEqual([]);
  });

  it('defaults tier to playground when absent', () => {
    const { tier: _t, ...withoutTier } = minimalScene();
    const parsed = SceneDocSchema.parse(withoutTier);
    expect(parsed.tier).toBe('playground');
  });

  it('rejects more than six variables at the schema level', () => {
    const doc = minimalLab();
    for (let i = 0; i < 6; i++) doc.variables![`v${i}`] = { ...doc.variables!['gravity']! };
    expect(SceneDocSchema.safeParse(doc).success).toBe(false);
  });

  it('reports VARIABLE_RANGE when value is outside min and max', () => {
    const doc = minimalLab();
    doc.variables!['gravity']!.value = 40;
    expect(codes(validateScene(doc))).toContain('VARIABLE_RANGE');
  });

  it('reports UNKNOWN_ENTITY_REF for a binding or visual on a missing entity', () => {
    const doc = minimalLab();
    doc.variables!['launch_speed']!.binds = { kind: 'launch', entity: 'rocket', prop: 'speed' };
    doc.visuals!.push({ type: 'label', entity: 'nobody', text: 'hi' });
    const r = validateScene(doc);
    expect(r.issues).toContainEqual(expect.objectContaining({ code: 'UNKNOWN_ENTITY_REF', path: 'variables.launch_speed.binds.entity' }));
    expect(r.issues).toContainEqual(expect.objectContaining({ code: 'UNKNOWN_ENTITY_REF', path: 'visuals.2.entity' }));
  });

  it('reports LAUNCH_NEEDS_DYNAMIC when a launch variable targets a static entity', () => {
    const doc = minimalLab();
    doc.variables!['launch_speed']!.binds = { kind: 'launch', entity: 'ground', prop: 'speed' };
    expect(codes(validateScene(doc))).toContain('LAUNCH_NEEDS_DYNAMIC');
  });

  it('reports LAB_EMPTY for a lab with no variables or visuals, and PLAYGROUND_HAS_LAB_FIELDS the other way round', () => {
    const empty = minimalLab();
    delete empty.variables;
    delete empty.visuals;
    expect(codes(validateScene(empty))).toContain('LAB_EMPTY');
    const playground = minimalLab();
    playground.tier = 'playground';
    expect(codes(validateScene(playground))).toContain('PLAYGROUND_HAS_LAB_FIELDS');
  });

  it('reports UNKNOWN_CHALLENGE_REF when a rule waits on a challenge that does not exist', () => {
    const doc = minimalLab();
    doc.rules.push({ id: 'r_done', when: { event: 'challengeComplete', id: 'ch_missing' }, then: [{ action: 'sound', cue: 'ding' }], once: true });
    expect(codes(validateScene(doc))).toContain('UNKNOWN_CHALLENGE_REF');
  });

  it('checks challenge concepts and tags like rules', () => {
    const doc = minimalLab();
    doc.challenges![0]!.concept = 'fraction';
    doc.challenges![0]!.check = { event: 'collision', a: 'hero', b: 'cup' };
    const r = validateScene(doc);
    expect(codes(r)).toEqual(expect.arrayContaining(['LEARNING_CONCEPT_MISMATCH', 'UNKNOWN_TAG']));
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @just-imagine/scene-schema test -- lab`
Expected: FAIL; `tier`, `variables`, and the `launch` action are unknown to the schema.

- [ ] **Step 3: Extend the schema**

In `packages/scene-schema/src/schema.ts`, add two members to `RuleWhenSchema`'s union and four to `ActionSchema`'s union:

```ts
  // append inside RuleWhenSchema's array
  z.object({ event: z.literal('challengeComplete'), id: IdSchema }),
```

```ts
  // append inside ActionSchema's array
  z.object({ action: z.literal('launch'), target: TagSchema }),
  z.object({ action: z.literal('setGravity'), y: z.number().min(-30).max(30) }),
  z.object({ action: z.literal('setTimeScale'), value: z.number().min(0.1).max(2) }),
  z.object({ action: z.literal('scaleEntity'), target: TagSchema, factor: z.number().min(0.5).max(2) }),
```

Then, after `ActionSchema` and before `RuleSchema`, add the lab schemas:

```ts
export const LAB_LIMITS = { maxVariables: 6, maxVisuals: 6, maxChallenges: 3 } as const;

export const VariableBindSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('gravity') }),
  z.object({ kind: z.literal('wind') }),
  z.object({ kind: z.literal('timeScale') }),
  z.object({ kind: z.literal('material'), entity: IdSchema, prop: z.enum(['density', 'friction', 'restitution']) }),
  z.object({ kind: z.literal('launch'), entity: IdSchema, prop: z.enum(['speed', 'angle']) }),
  z.object({ kind: z.literal('scale'), entity: IdSchema }),
]);
export type VariableBind = z.infer<typeof VariableBindSchema>;

export const VariableSchema = z.object({
  label: z.string().min(1).max(30),
  min: z.number(),
  max: z.number(),
  step: z.number().positive(),
  value: z.number(),
  unit: z.string().max(8),
  binds: VariableBindSchema,
});
export type Variable = z.infer<typeof VariableSchema>;

const EntityPropSchema = z.enum(['x', 'y', 'speed', 'height']);

export const VisualSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('plot'), id: IdSchema, title: z.string().min(1).max(40), x: z.literal('time'), y: z.object({ entity: IdSchema, prop: EntityPropSchema }), maxSeconds: z.number().min(1).max(60) }),
  z.object({ type: z.literal('vector'), entity: IdSchema, show: z.enum(['velocity', 'gravity', 'net']) }),
  z.object({ type: z.literal('ruler'), from: Vec2Schema, to: Vec2Schema }),
  z.object({ type: z.literal('stopwatch'), startOn: z.enum(['launch', 'tap']), stopOn: z.object({ event: z.literal('collision'), a: TagSchema, b: TagSchema }) }),
  z.object({ type: z.literal('numberLine'), from: z.number(), to: z.number(), step: z.number().positive(), marker: z.object({ entity: IdSchema, prop: z.literal('x') }) }),
  z.object({ type: z.literal('histogram'), id: IdSchema, title: z.string().min(1).max(40), bins: z.number().int().min(2).max(12), source: z.object({ tag: TagSchema, prop: z.literal('x') }) }),
  z.object({ type: z.literal('fraction'), id: IdSchema, numerator: z.number().int().min(0).max(12), denominator: z.number().int().min(1).max(12), style: z.enum(['bar', 'pie']), at: Vec2Schema }),
  z.object({ type: z.literal('label'), entity: IdSchema, text: z.string().min(1).max(40) }),
]);
export type Visual = z.infer<typeof VisualSchema>;

export const ChallengeCheckSchema = z.discriminatedUnion('event', [
  z.object({ event: z.literal('collision'), a: TagSchema, b: TagSchema }),
  z.object({ event: z.literal('histogramFilled'), id: IdSchema, count: z.number().int().min(1).max(500) }),
]);

export const ChallengeSchema = z.object({
  id: IdSchema,
  goal: z.string().min(1).max(120),
  check: ChallengeCheckSchema,
  hint: z.string().min(1).max(160),
  concept: ConceptSchema,
  reward: z.array(ActionSchema).min(1).max(3),
});
export type Challenge = z.infer<typeof ChallengeSchema>;
```

Finally add three optional fields to `SceneDocSchema` after `narration`:

```ts
  variables: z.record(IdSchema, VariableSchema).optional(),
  visuals: z.array(VisualSchema).max(LAB_LIMITS.maxVisuals).optional(),
  challenges: z.array(ChallengeSchema).max(LAB_LIMITS.maxChallenges).optional(),
```

and add a `.refine` to `SceneDocSchema` after the object closes:

```ts
export const SceneDocSchema = z.object({ /* ...as above... */ }).refine(
  (d) => !d.variables || Object.keys(d.variables).length <= LAB_LIMITS.maxVariables,
  { message: `at most ${LAB_LIMITS.maxVariables} variables`, path: ['variables'] },
);
```

Because `GeneratedSceneSchema` in `gen.ts` is derived with `.omit(...).extend(...)`, and Zod 4 does not allow `.omit` on a refined schema, change `gen.ts` to derive from the inner object: export the object as `SceneDocObjectSchema` before the refine, and have `gen.ts` import `SceneDocObjectSchema` instead of `SceneDocSchema` for its derivation. The exported `SceneDocSchema` (with the refine) stays the one everything else parses with.

- [ ] **Step 4: Extend the validator**

In `packages/scene-schema/src/validator.ts`, add the codes to `IssueCode`:

```ts
  | 'LAUNCH_NEEDS_DYNAMIC' | 'LAB_EMPTY' | 'PLAYGROUND_HAS_LAB_FIELDS' | 'UNKNOWN_CHALLENGE_REF' | 'VARIABLE_RANGE'
```

call `checkLab(doc, err);` after `checkBlocklist(doc, err);` in `validateScene`, and add:

```ts
function checkLab(doc: SceneDoc, err: Report): void {
  const ids = new Set(doc.entities.map((e) => e.id));
  const tags = new Set(doc.entities.flatMap((e) => e.tags));
  const concepts = new Set(doc.learning.concepts);
  const hasLabFields = Boolean(doc.variables && Object.keys(doc.variables).length) || Boolean(doc.visuals?.length) || Boolean(doc.challenges?.length);

  if (doc.tier === 'lab' && !(Object.keys(doc.variables ?? {}).length || doc.visuals?.length)) {
    err('LAB_EMPTY', 'tier', 'a lab world needs at least one variable or visual');
  }
  if (doc.tier === 'playground' && hasLabFields) {
    err('PLAYGROUND_HAS_LAB_FIELDS', 'tier', 'a playground world must not carry variables, visuals, or challenges');
  }

  for (const [name, v] of Object.entries(doc.variables ?? {})) {
    const p = `variables.${name}`;
    if (!(v.min < v.max) || v.value < v.min || v.value > v.max) err('VARIABLE_RANGE', `${p}.value`, `value ${v.value} must be within [${v.min}, ${v.max}]`);
    if ('entity' in v.binds) {
      const entity = doc.entities.find((e) => e.id === v.binds.entity);
      if (!entity) err('UNKNOWN_ENTITY_REF', `${p}.binds.entity`, `no entity with id "${v.binds.entity}"`);
      else if (v.binds.kind === 'launch' && entity.body.isStatic) err('LAUNCH_NEEDS_DYNAMIC', `${p}.binds`, `launch target "${entity.id}" must not be static`);
    }
  }

  (doc.visuals ?? []).forEach((vis, i) => {
    const p = `visuals.${i}`;
    const entityRef = vis.type === 'plot' ? vis.y.entity : vis.type === 'numberLine' ? vis.marker.entity : 'entity' in vis ? vis.entity : null;
    if (entityRef && !ids.has(entityRef)) err('UNKNOWN_ENTITY_REF', `${p}.entity`, `no entity with id "${entityRef}"`);
    if (vis.type === 'histogram' && !tags.has(vis.source.tag)) err('UNKNOWN_TAG', `${p}.source.tag`, `no entity has tag "${vis.source.tag}"`);
    if (vis.type === 'stopwatch') for (const end of ['a', 'b'] as const) if (!tags.has(vis.stopOn[end])) err('UNKNOWN_TAG', `${p}.stopOn.${end}`, `no entity has tag "${vis.stopOn[end]}"`);
  });

  const challengeIds = new Set((doc.challenges ?? []).map((c) => c.id));
  (doc.challenges ?? []).forEach((c, i) => {
    const p = `challenges.${i}`;
    if (!concepts.has(c.concept)) err('LEARNING_CONCEPT_MISMATCH', `${p}.concept`, `challenge concept "${c.concept}" is not in learning.concepts`);
    if (c.check.event === 'collision') for (const end of ['a', 'b'] as const) if (!tags.has(c.check[end])) err('UNKNOWN_TAG', `${p}.check.${end}`, `no entity has tag "${c.check[end]}"`);
    if (c.check.event === 'histogramFilled' && !(doc.visuals ?? []).some((v) => v.type === 'histogram' && v.id === c.check.id)) err('UNKNOWN_ENTITY_REF', `${p}.check.id`, `no histogram with id "${c.check.id}"`);
  });
  doc.rules.forEach((r, i) => {
    if (r.when.event === 'challengeComplete' && !challengeIds.has(r.when.id)) err('UNKNOWN_CHALLENGE_REF', `rules.${i}.when.id`, `no challenge with id "${r.when.id}"`);
    r.then.forEach((a, j) => { if (a.action === 'launch' && !tags.has(a.target)) err('UNKNOWN_TAG', `rules.${i}.then.${j}.target`, `no entity has tag "${a.target}"`); });
  });
}
```

- [ ] **Step 5: Run the scene-schema tests to verify they pass**

Run: `pnpm --filter @just-imagine/scene-schema test && pnpm --filter @just-imagine/scene-schema typecheck && pnpm --filter @just-imagine/scene-schema lint`
Expected: all pass, including every earlier test.

- [ ] **Step 6: Add the projectile lab fixture**

`packages/fixtures/worlds/projectile-lab.json`:

```json
{
  "schemaVersion": 1,
  "worldId": "w_fixture_projectile_lab",
  "tier": "lab",
  "title": "Cannon and Cup",
  "theme": {
    "paletteHint": "bright science-lab teal and orange",
    "timeOfDay": "day",
    "backdropDescription": "cheerful cartoon science lab lawn with a chalkboard wall showing a faint grid",
    "backdrop": { "url": "", "width": 1920, "height": 1080, "status": "placeholder" }
  },
  "environment": { "gravity": { "x": 0, "y": 9.81 }, "wind": { "x": 0, "y": 0 }, "medium": "air", "bounds": { "width": 16, "height": 9 }, "seed": 11 },
  "materials": {
    "grass": { "density": 1, "friction": 0.8, "restitution": 0.1, "softness": 0, "buoyant": false, "breakable": false, "pretend": false },
    "rubber": { "density": 1.1, "friction": 0.8, "restitution": 0.5, "softness": 0.2, "buoyant": false, "breakable": false, "pretend": false },
    "metal": { "density": 6, "friction": 0.4, "restitution": 0.2, "softness": 0, "buoyant": false, "breakable": false, "pretend": false }
  },
  "entities": [
    { "id": "ground", "kind": "ground", "name": "lawn", "description": "neat green lawn with chalk distance marks", "body": { "shape": "box", "material": "grass", "isStatic": true, "size": { "width": 16, "height": 1 } }, "transform": { "x": 8, "y": 8.5, "rotation": 0 }, "tags": ["ground"], "behaviors": [], "pretend": false },
    { "id": "cannon", "kind": "sprite", "name": "toy cannon", "description": "friendly round toy cannon on wheels, pointing up and to the right", "body": { "shape": "box", "material": "metal", "isStatic": true, "size": { "width": 1.2, "height": 1 } }, "transform": { "x": 2, "y": 7.5, "rotation": 0 }, "tags": ["cannon"], "behaviors": [], "pretend": false },
    { "id": "ball", "kind": "sprite", "name": "red ball", "description": "small bright red rubber ball", "body": { "shape": "circle", "material": "rubber", "isStatic": false, "size": { "width": 0.4, "height": 0.4 } }, "transform": { "x": 2.6, "y": 6.7, "rotation": 0 }, "tags": ["ball", "hero"], "behaviors": [], "pretend": false },
    { "id": "cup", "kind": "sprite", "name": "big cup", "description": "big friendly orange cup with a smiley face", "body": { "shape": "box", "material": "metal", "isStatic": true, "size": { "width": 0.9, "height": 0.8 } }, "transform": { "x": 12, "y": 7.6, "rotation": 0 }, "tags": ["cup", "target"], "behaviors": [], "pretend": false }
  ],
  "joints": [],
  "rules": [
    { "id": "r_fire", "when": { "event": "tap", "target": "cannon" }, "then": [{ "action": "launch", "target": "hero" }, { "action": "sound", "cue": "whoosh" }], "once": false },
    { "id": "r_land", "when": { "event": "collision", "a": "hero", "b": "ground", "minImpulse": 0.5 }, "then": [{ "action": "sound", "cue": "ding" }, { "action": "say", "text": "It curved! Gravity pulls down the whole time, so the path bends into an arc." }], "concept": "projectile", "once": true },
    { "id": "r_done", "when": { "event": "challengeComplete", "id": "ch_cup" }, "then": [{ "action": "say", "text": "Right in the cup! Now try the same angle with a different speed." }], "concept": "graph", "once": true }
  ],
  "learning": {
    "concepts": ["projectile", "gravity", "graph"],
    "prediction": { "question": "If we make the angle bigger, will the ball go further or higher?", "options": ["further", "higher", "both"], "correctIndex": 1, "concept": "projectile" },
    "dials": [],
    "heroEntityId": "ball"
  },
  "narration": { "intro": "Welcome to the cannon lab! Set the speed and angle, then tap the cannon to fire." },
  "variables": {
    "launch_speed": { "label": "Launch speed", "min": 2, "max": 20, "step": 0.5, "value": 10, "unit": "m/s", "binds": { "kind": "launch", "entity": "ball", "prop": "speed" } },
    "launch_angle": { "label": "Launch angle", "min": 0, "max": 90, "step": 1, "value": 45, "unit": "°", "binds": { "kind": "launch", "entity": "ball", "prop": "angle" } },
    "gravity": { "label": "Gravity", "min": 1, "max": 25, "step": 0.1, "value": 9.81, "unit": "m/s²", "binds": { "kind": "gravity" } }
  },
  "visuals": [
    { "type": "plot", "id": "height_plot", "title": "Height over time", "x": "time", "y": { "entity": "ball", "prop": "height" }, "maxSeconds": 6 },
    { "type": "vector", "entity": "ball", "show": "velocity" },
    { "type": "ruler", "from": { "x": 2, "y": 8.2 }, "to": { "x": 12, "y": 8.2 } },
    { "type": "stopwatch", "startOn": "launch", "stopOn": { "event": "collision", "a": "hero", "b": "ground" } }
  ],
  "challenges": [
    { "id": "ch_cup", "goal": "Land the ball in the cup", "check": { "event": "collision", "a": "hero", "b": "cup" }, "hint": "Forty-five degrees goes furthest. Then adjust the speed.", "concept": "projectile", "reward": [{ "action": "celebrate", "style": "confetti" }, { "action": "sound", "cue": "ding" }] }
  ]
}
```

In `packages/fixtures/src/worlds.ts` add the import and entry:

```ts
import projectileLab from '../worlds/projectile-lab.json' with { type: 'json' };
// inside FIXTURE_WORLDS:
  projectileLab: projectileLab as SceneDoc,
```

In `packages/fixtures/test/worlds.test.ts` add:

```ts
  it('ships one lab-tier fixture with variables, visuals, and a challenge', () => {
    const lab = FIXTURE_WORLDS.projectileLab;
    expect(lab.tier).toBe('lab');
    expect(Object.keys(lab.variables ?? {})).toEqual(['launch_speed', 'launch_angle', 'gravity']);
    expect(lab.visuals?.length).toBe(4);
    expect(lab.challenges?.[0]?.id).toBe('ch_cup');
  });
```

- [ ] **Step 7: Run the fixtures tests to verify they pass**

Run: `pnpm --filter @just-imagine/fixtures test && pnpm --filter @just-imagine/fixtures typecheck`
Expected: all pass; the "every fixture validates with no issues" test now covers four worlds.

- [ ] **Step 8: Commit**

```bash
git add packages/scene-schema packages/fixtures
git commit -m "feat(scene-schema): add lab extension with variables, visuals, challenges, and a projectile fixture"
```

---

### Task 18: Curated concept bank

**Files:**
- Create: `packages/protocol/src/concept-bank.ts`
- Modify: `packages/protocol/src/index.ts`
- Test: `packages/protocol/test/concept-bank.test.ts`

**Interfaces:**
- Produces: `CONCEPT_BANK: Record<Concept, { title: string; realLifeNote: string; kidHint: string }>`, `conceptCard(concept): { title, realLifeNote }`.
- Consumed by Plan B1 (`award_discovery` fills `title` and `realLifeNote` from here and takes only `kidExplanation` from the model) and Plan A3 (card rendering, Gallery filters).

- [ ] **Step 1: Write the failing test**

`packages/protocol/test/concept-bank.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { CONCEPTS } from '@just-imagine/scene-schema';
import { CONCEPT_BANK, conceptCard } from '../src/concept-bank';

describe('CONCEPT_BANK', () => {
  it('has a card for every concept with short, non-empty copy', () => {
    for (const c of CONCEPTS) {
      const card = CONCEPT_BANK[c];
      expect(card, c).toBeDefined();
      expect(card.title.length).toBeGreaterThan(0);
      expect(card.title.length).toBeLessThanOrEqual(30);
      expect(card.realLifeNote.length).toBeGreaterThan(20);
      expect(card.realLifeNote.length).toBeLessThanOrEqual(160);
      expect(card.kidHint.length).toBeLessThanOrEqual(120);
    }
  });
  it('returns only the fields the card shows', () => {
    expect(conceptCard('bounce')).toEqual({ title: CONCEPT_BANK.bounce.title, realLifeNote: CONCEPT_BANK.bounce.realLifeNote });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @just-imagine/protocol test -- concept-bank`
Expected: FAIL, module not found.

- [ ] **Step 3: Write the bank**

`packages/protocol/src/concept-bank.ts`:

```ts
import type { Concept } from '@just-imagine/scene-schema';

export interface ConceptCardCopy {
  title: string;        // on the Discovery Card
  realLifeNote: string; // fixed, curated
  kidHint: string;      // given to the model as the fact it must stay true to
}

export const CONCEPT_BANK: Record<Concept, ConceptCardCopy> = {
  gravity: { title: 'Gravity pulls down', realLifeNote: 'Earth pulls everything toward the ground. That is why a dropped toy falls instead of floating away.', kidHint: 'Everything falls because the Earth pulls it down.' },
  mass: { title: 'Heavy and light', realLifeNote: 'A full backpack is harder to lift than an empty one because it has more stuff inside, more mass.', kidHint: 'Mass is how much stuff is in a thing.' },
  buoyancy: { title: 'Float or sink', realLifeNote: 'A rubber duck floats in the bath because the water pushes it up harder than it is pulled down.', kidHint: 'Water pushes up on things; light things float.' },
  friction: { title: 'Rough and slippery', realLifeNote: 'Socks slide on a wooden floor but grip a carpet. Rough surfaces slow things down more.', kidHint: 'Rough surfaces slow sliding things down.' },
  bounce: { title: 'Boing!', realLifeNote: 'A rubber ball squashes when it hits the floor and springs back, so it bounces. Clay just squashes and stays.', kidHint: 'Springy things squash and spring back.' },
  momentum: { title: 'Hard to stop', realLifeNote: 'A fast, heavy shopping trolley is hard to stop. The faster and heavier, the more it keeps going.', kidHint: 'Fast and heavy things are hard to stop.' },
  airResistance: { title: 'Air pushes back', realLifeNote: 'A feather drifts down slowly because the air pushes against it. A stone cuts through the air.', kidHint: 'Air slows down light, wide things.' },
  balance: { title: 'Balanced', realLifeNote: 'A seesaw balances when both sides push down the same amount. Move one friend closer and it tips.', kidHint: 'Things balance when both sides push the same.' },
  springiness: { title: 'Springy', realLifeNote: 'A trampoline stretches when you land and pushes you back up. Jelly wobbles for the same reason.', kidHint: 'Springy things stretch and then push back.' },
  density: { title: 'Packed tight', realLifeNote: 'A stone and a sponge can be the same size, but the stone is packed tighter, so it is heavier and sinks.', kidHint: 'Density is how tightly stuff is packed.' },
  force: { title: 'Push and pull', realLifeNote: 'Every push and pull is a force. A bigger push makes a toy car go faster.', kidHint: 'A force is a push or a pull.' },
  speed: { title: 'Fast and slow', realLifeNote: 'Speed is how far something goes each second. A cheetah covers a whole playground in one second.', kidHint: 'Speed is how far something moves each second.' },
  acceleration: { title: 'Speeding up', realLifeNote: 'A bike rolling down a hill goes faster and faster. Speeding up or slowing down is acceleration.', kidHint: 'Acceleration is speed changing.' },
  energy: { title: 'Stored energy', realLifeNote: 'A ball held high has stored energy. Let go and it turns into moving energy as it falls.', kidHint: 'Energy can be stored and then turned into motion.' },
  projectile: { title: 'The arc', realLifeNote: 'A thrown ball curves because it keeps moving forward while gravity pulls it down. Forty-five degrees goes furthest.', kidHint: 'A thrown thing curves because gravity pulls it down while it moves forward.' },
  probability: { title: 'Likely or not', realLifeNote: 'Drop many balls through pegs and most land in the middle bins. Some outcomes are just more likely.', kidHint: 'Some outcomes happen more often than others.' },
  fraction: { title: 'Parts of a whole', realLifeNote: 'Cut a pizza into four equal slices and each slice is one quarter. Two slices make a half.', kidHint: 'A fraction is equal parts of a whole.' },
  graph: { title: 'The picture of numbers', realLifeNote: 'A graph draws how something changes. A height graph of a jump goes up, then comes back down.', kidHint: 'A graph shows how a number changes over time.' },
  measurement: { title: 'Measure it', realLifeNote: 'A ruler tells you how far and a stopwatch tells you how long. Measuring turns a guess into a number.', kidHint: 'Measuring gives you a number you can compare.' },
};

export function conceptCard(concept: Concept): { title: string; realLifeNote: string } {
  const { title, realLifeNote } = CONCEPT_BANK[concept];
  return { title, realLifeNote };
}
```

Add to `packages/protocol/src/index.ts`:

```ts
export * from './concept-bank';
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @just-imagine/protocol test && pnpm --filter @just-imagine/protocol typecheck && pnpm --filter @just-imagine/protocol lint`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add packages/protocol
git commit -m "feat(protocol): add curated Discovery Card concept bank"
```

---

## Exit criterion for Plan 0

`pnpm install && pnpm format:check && pnpm lint && pnpm typecheck && pnpm test` is green on `main`, `pnpm --filter @just-imagine/fixtures dev` serves the jelly-dragon scenario, and the `ci` check is required on `main`. Dev A proceeds to Plan A1; Dev B proceeds to Plan B1. Task order for Dev A is 2, 3, 4, 5, 6, 7, 17, 11, 12, 13; for Dev B it is 8, 9, 10, 18, 14, 15, 16.
