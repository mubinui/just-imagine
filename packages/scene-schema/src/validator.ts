import {
  GAME_SCRIPT_MAX_BYTES,
  SceneDocSchema,
  type Action,
  type Entity,
  type SceneDoc,
} from './schema';
import { LIMITS } from './limits';
import { lookupMaterialRange } from './materials-table';
import { findBlockedTerm } from './blocklist';

export type IssueSeverity = 'error' | 'warning';
export type IssueCode =
  | 'SCHEMA_INVALID'
  | 'DUPLICATE_ID'
  | 'MATERIALS_TOO_MANY'
  | 'MATERIAL_CLAMPED'
  | 'UNKNOWN_MATERIAL_REF'
  | 'ENTITY_TOO_LARGE'
  | 'MASS_CLAMPED'
  | 'MASS_OUT_OF_RANGE'
  | 'ENTITY_CLAMPED_TO_BOUNDS'
  | 'GROUND_MISSING'
  | 'GROUND_MULTIPLE'
  | 'STATIC_OVERLAP'
  | 'UNKNOWN_TAG'
  | 'UNKNOWN_ENTITY_REF'
  | 'LEARNING_CONCEPT_MISMATCH'
  | 'HERO_MISSING'
  | 'NO_CONCEPT_RULE'
  | 'DIAL_UNUSABLE'
  | 'BLOCKED_CATEGORY'
  | 'PATCH_INVALID'
  | 'LAUNCH_NEEDS_DYNAMIC'
  | 'LAB_EMPTY'
  | 'PLAYGROUND_HAS_LAB_FIELDS'
  | 'UNKNOWN_CHALLENGE_REF'
  | 'VARIABLE_RANGE'
  | 'GAME_SCRIPT_TOO_LARGE';

export interface Issue {
  code: IssueCode;
  severity: IssueSeverity;
  path: string;
  message: string;
}

export type ValidationResult =
  | { ok: true; doc: SceneDoc; issues: Issue[] }
  | { ok: false; doc: SceneDoc | null; issues: Issue[] };

type Report = (code: IssueCode, path: string, message: string) => void;
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export function validateScene(input: unknown): ValidationResult {
  const parsed = SceneDocSchema.safeParse(input);
  if (!parsed.success) {
    const issues: Issue[] = parsed.error.issues.map((i) => ({
      code: 'SCHEMA_INVALID',
      severity: 'error',
      path: i.path.map(String).join('.'),
      message: i.message,
    }));
    return { ok: false, doc: null, issues };
  }
  const doc = structuredClone(parsed.data);
  const issues: Issue[] = [];
  const err: Report = (code, path, message) =>
    issues.push({ code, severity: 'error', path, message });
  const warn: Report = (code, path, message) =>
    issues.push({ code, severity: 'warning', path, message });

  checkIds(doc, err);
  checkMaterials(doc, err, warn);
  checkEntities(doc, err, warn);
  checkGround(doc, err);
  checkStaticOverlap(doc, err);
  checkReferences(doc, err);
  checkLearning(doc, err);
  checkBlocklist(doc, err);
  checkLab(doc, err);
  checkGame(doc, err);

  const ok = issues.every((i) => i.severity !== 'error');
  return ok ? { ok: true, doc, issues } : { ok: false, doc, issues };
}

function checkGame(doc: SceneDoc, err: Report): void {
  const source = doc.game?.script.source;
  if (source === undefined) return;
  const bytes = new TextEncoder().encode(source).length;
  if (bytes > GAME_SCRIPT_MAX_BYTES)
    err(
      'GAME_SCRIPT_TOO_LARGE',
      'game.script.source',
      `the game script is ${bytes} bytes; the limit is ${GAME_SCRIPT_MAX_BYTES}`,
    );
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
  for (const [name, items] of [
    ['challenges', doc.challenges ?? []],
    ['visuals', doc.visuals ?? []],
  ] as const) {
    const itemIds = new Set<string>();
    items.forEach((item, i) => {
      if (!('id' in item)) return;
      if (itemIds.has(item.id))
        err('DUPLICATE_ID', `${name}.${i}.id`, `duplicate ${name} id "${item.id}"`);
      itemIds.add(item.id);
    });
  }
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
        warn(
          'MATERIAL_CLAMPED',
          `materials.${name}.${prop}`,
          `${prop} ${was} clamped to ${m[prop]} for ${name}`,
        );
      }
    }
  }
}

function checkEntities(doc: SceneDoc, err: Report, warn: Report): void {
  const { width: W, height: H } = doc.environment.bounds;
  doc.entities.forEach((e, i) => {
    const p = `entities.${i}`;
    const mat = Object.hasOwn(doc.materials, e.body.material)
      ? doc.materials[e.body.material]
      : undefined;
    if (!mat)
      err(
        'UNKNOWN_MATERIAL_REF',
        `${p}.body.material`,
        `material "${e.body.material}" is not defined`,
      );

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
        // Resizing to a boundary can differ by a few floating-point ulps.
        const tolerance = 1e-12;
        if (
          newMass < LIMITS.mass.min * (1 - tolerance) ||
          newMass > LIMITS.mass.max * (1 + tolerance)
        ) {
          err(
            'MASS_OUT_OF_RANGE',
            `${p}.body`,
            `mass ${mass.toFixed(3)} kg cannot be brought into range by resizing`,
          );
        } else {
          e.body.size = { width, height };
          warn(
            'MASS_CLAMPED',
            `${p}.body.size`,
            `resized so mass goes from ${mass.toFixed(3)} kg to ${newMass.toFixed(3)} kg`,
          );
        }
      }
    }

    const { hw, hh } = halfExtents(e);
    if (hw * 2 > W + 1e-12 || hh * 2 > H + 1e-12) {
      err(
        'ENTITY_TOO_LARGE',
        `${p}.body.size`,
        `"${e.id}" cannot fit inside the world at its rotation`,
      );
      return;
    }
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
  if (grounds.length === 0 && doc.learning.mode !== 'incidental')
    err('GROUND_MISSING', 'entities', 'a ground entity is required unless the medium is space');
  if (grounds.length > 1) err('GROUND_MULTIPLE', 'entities', 'only one ground entity is allowed');
}

function halfExtents(e: Entity): { hw: number; hh: number } {
  const hw = e.body.size.width / 2;
  const hh = e.body.size.height / 2;
  if (e.body.shape === 'circle') return { hw, hh };
  const cos = Math.abs(Math.cos(e.transform.rotation));
  const sin = Math.abs(Math.sin(e.transform.rotation));
  return { hw: hw * cos + hh * sin, hh: hw * sin + hh * cos };
}

function aabb(e: Entity): { l: number; r: number; t: number; b: number } {
  const { hw, hh } = halfExtents(e);
  return {
    l: e.transform.x - hw,
    r: e.transform.x + hw,
    t: e.transform.y - hh,
    b: e.transform.y + hh,
  };
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
        err(
          'STATIC_OVERLAP',
          `entities.${statics[b]!.i}`,
          `static "${statics[b]!.e.id}" overlaps static "${statics[a]!.e.id}"`,
        );
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
  const checkActions = (actions: Action[], path: string): void => {
    actions.forEach((act, j) => {
      const q = `${path}.${j}`;
      if (act.action === 'spawn' && !ids.has(act.template)) {
        err('UNKNOWN_ENTITY_REF', `${q}.template`, `no entity with id "${act.template}"`);
      }
      if ('target' in act) {
        needTag(act.target, `${q}.target`);
      }
      if (
        act.action === 'launch' &&
        doc.entities.some((entity) => entity.tags.includes(act.target) && entity.body.isStatic)
      ) {
        err('LAUNCH_NEEDS_DYNAMIC', `${q}.target`, 'launch targets must be dynamic');
      }
      if (act.action === 'setMaterial' && !Object.hasOwn(doc.materials, act.material)) {
        err('UNKNOWN_MATERIAL_REF', `${q}.material`, `material "${act.material}" is not defined`);
      }
    });
  };
  doc.rules.forEach((r, i) => {
    const p = `rules.${i}`;
    const w = r.when;
    if (w.event === 'collision') {
      needTag(w.a, `${p}.when.a`);
      needTag(w.b, `${p}.when.b`);
    } else if (w.event === 'tap' || w.event === 'enterMedium')
      needTag(w.target, `${p}.when.target`);
    checkActions(r.then, `${p}.then`);
  });
  doc.challenges?.forEach((challenge, i) =>
    checkActions(challenge.reward, `challenges.${i}.reward`),
  );
  doc.joints.forEach((j, i) => {
    for (const end of ['a', 'b'] as const) {
      if (!ids.has(j[end]))
        err('UNKNOWN_ENTITY_REF', `joints.${i}.${end}`, `no entity with id "${j[end]}"`);
    }
  });
}

function checkLearning(doc: SceneDoc, err: Report): void {
  const concepts = new Set(doc.learning.concepts);
  if (!concepts.has(doc.learning.prediction.concept)) {
    err(
      'LEARNING_CONCEPT_MISMATCH',
      'learning.prediction.concept',
      'prediction concept is not in learning.concepts',
    );
  }
  doc.rules.forEach((r, i) => {
    if (r.concept && !concepts.has(r.concept)) {
      err(
        'LEARNING_CONCEPT_MISMATCH',
        `rules.${i}.concept`,
        `rule concept "${r.concept}" is not in learning.concepts`,
      );
    }
  });
  if (!doc.entities.some((e) => e.id === doc.learning.heroEntityId)) {
    err(
      'HERO_MISSING',
      'learning.heroEntityId',
      `no entity with id "${doc.learning.heroEntityId}"`,
    );
  }
  if (doc.learning.mode !== 'incidental' && !doc.rules.some((r) => r.concept))
    err('NO_CONCEPT_RULE', 'rules', 'at least one rule must carry a concept');
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
  if (doc.theme.midLayerDescription)
    texts.push(['theme.midLayerDescription', doc.theme.midLayerDescription]);
  doc.learning.prediction.options.forEach((text, i) =>
    texts.push([`learning.prediction.options.${i}`, text]),
  );
  doc.entities.forEach((e, i) => {
    texts.push([`entities.${i}.name`, e.name], [`entities.${i}.description`, e.description]);
    if (e.character)
      for (const [key, value] of Object.entries(e.character))
        texts.push([`entities.${i}.character.${key}`, value]);
  });
  doc.rules.forEach((r, i) =>
    r.then.forEach((a, j) => {
      if (a.action === 'say') texts.push([`rules.${i}.then.${j}.text`, a.text]);
    }),
  );
  Object.entries(doc.variables ?? {}).forEach(([name, variable]) => {
    texts.push(
      [`variables.${name}.label`, variable.label],
      [`variables.${name}.unit`, variable.unit],
    );
  });
  doc.visuals?.forEach((visual, i) => {
    if ('title' in visual) texts.push([`visuals.${i}.title`, visual.title]);
    if (visual.type === 'label') texts.push([`visuals.${i}.text`, visual.text]);
  });
  doc.challenges?.forEach((challenge, i) => {
    texts.push([`challenges.${i}.goal`, challenge.goal], [`challenges.${i}.hint`, challenge.hint]);
    challenge.reward.forEach((action, j) => {
      if (action.action === 'say') texts.push([`challenges.${i}.reward.${j}.text`, action.text]);
    });
  });
  for (const [path, text] of texts) {
    const hit = findBlockedTerm(text);
    if (hit) err('BLOCKED_CATEGORY', path, `contains blocked term "${hit}"`);
  }
}

function checkLab(doc: SceneDoc, err: Report): void {
  const ids = new Set(doc.entities.map((e) => e.id));
  const tags = new Set(doc.entities.flatMap((e) => e.tags));
  const concepts = new Set(doc.learning.concepts);
  const hasLabFields =
    Boolean(doc.variables && Object.keys(doc.variables).length) ||
    Boolean(doc.visuals?.length) ||
    Boolean(doc.challenges?.length);

  if (doc.tier === 'lab' && !(Object.keys(doc.variables ?? {}).length || doc.visuals?.length)) {
    err('LAB_EMPTY', 'tier', 'a lab world needs at least one variable or visual');
  }
  const onlyGameVariables = Object.values(doc.variables ?? {}).every(
    (v) => v.binds.kind === 'game',
  );
  if (
    doc.tier === 'playground' &&
    hasLabFields &&
    (!onlyGameVariables || Boolean(doc.visuals?.length) || Boolean(doc.challenges?.length))
  ) {
    err(
      'PLAYGROUND_HAS_LAB_FIELDS',
      'tier',
      'a playground may carry game-rule variables, but physics variables, visuals and challenges need a lab',
    );
  }

  for (const [name, v] of Object.entries(doc.variables ?? {})) {
    const p = `variables.${name}`;
    if (!(v.min < v.max) || v.value < v.min || v.value > v.max)
      err('VARIABLE_RANGE', `${p}.value`, `value ${v.value} must be within [${v.min}, ${v.max}]`);
    const binding = v.binds;
    if ('entity' in binding) {
      const entity = doc.entities.find((e) => e.id === binding.entity);
      if (!entity)
        err('UNKNOWN_ENTITY_REF', `${p}.binds.entity`, `no entity with id "${binding.entity}"`);
      else if (binding.kind === 'launch' && entity.body.isStatic)
        err(
          'LAUNCH_NEEDS_DYNAMIC',
          `${p}.binds`,
          `launch target "${entity.id}" must not be static`,
        );
    }
  }

  (doc.visuals ?? []).forEach((vis, i) => {
    const p = `visuals.${i}`;
    const entityRef =
      vis.type === 'plot'
        ? vis.y.entity
        : vis.type === 'numberLine'
          ? vis.marker.entity
          : 'entity' in vis
            ? vis.entity
            : null;
    if (entityRef && !ids.has(entityRef))
      err('UNKNOWN_ENTITY_REF', `${p}.entity`, `no entity with id "${entityRef}"`);
    if (vis.type === 'histogram' && !tags.has(vis.source.tag))
      err('UNKNOWN_TAG', `${p}.source.tag`, `no entity has tag "${vis.source.tag}"`);
    if (vis.type === 'stopwatch')
      for (const end of ['a', 'b'] as const)
        if (!tags.has(vis.stopOn[end]))
          err('UNKNOWN_TAG', `${p}.stopOn.${end}`, `no entity has tag "${vis.stopOn[end]}"`);
  });

  const challengeIds = new Set((doc.challenges ?? []).map((c) => c.id));
  (doc.challenges ?? []).forEach((c, i) => {
    const p = `challenges.${i}`;
    if (!concepts.has(c.concept))
      err(
        'LEARNING_CONCEPT_MISMATCH',
        `${p}.concept`,
        `challenge concept "${c.concept}" is not in learning.concepts`,
      );
    const check = c.check;
    if (check.event === 'collision')
      for (const end of ['a', 'b'] as const)
        if (!tags.has(check[end]))
          err('UNKNOWN_TAG', `${p}.check.${end}`, `no entity has tag "${check[end]}"`);
    if (
      check.event === 'histogramFilled' &&
      !(doc.visuals ?? []).some((v) => v.type === 'histogram' && v.id === check.id)
    )
      err('UNKNOWN_ENTITY_REF', `${p}.check.id`, `no histogram with id "${check.id}"`);
  });
  doc.rules.forEach((r, i) => {
    if (r.when.event === 'challengeComplete' && !challengeIds.has(r.when.id))
      err('UNKNOWN_CHALLENGE_REF', `rules.${i}.when.id`, `no challenge with id "${r.when.id}"`);
  });
}
