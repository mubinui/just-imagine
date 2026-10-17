import { readFileSync } from 'node:fs';
import { it, expect } from 'vitest';
import { validateScene } from '@just-imagine/scene-schema';
import { validateGameplayPlan, runGameplayPlan } from '../src/game-playtest';

function recording(name: 'portal' | 'planets') {
  const raw = JSON.parse(
    readFileSync(new URL(`./recordings/game-quality-${name}.json`, import.meta.url), 'utf8'),
  );
  const checked = validateScene(raw.doc);
  if (!checked.ok) throw new Error('Invalid recorded scene');
  return {
    doc: checked.doc,
    plan: validateGameplayPlan(raw.plan, checked.doc),
    source: checked.doc.game!.script.source,
  };
}

it.each(['portal', 'planets'] as const)(
  'replays real Argon %s mechanics and every causal input prefix without a key',
  async (name) => {
    const r = recording(name);
    expect(await runGameplayPlan(r.doc, r.source, r.plan)).toBeNull();
  },
);

it('rejects a generated portal programme if the disabled-state guard is broken', async () => {
  const r = recording('portal');
  const broken = r.source.replace('if (!portalOn)', 'if (false)');
  expect(broken).not.toBe(r.source);
  expect(await runGameplayPlan(r.doc, broken, r.plan)).toMatch(/Playtest.*position=/);
});

it('rejects planet artwork with the correct source except that tap interaction is disconnected', async () => {
  const r = recording('planets');
  const broken = r.source.replace("game.on('tap',", "game.on('flick',");
  expect(broken).not.toBe(r.source);
  expect(await runGameplayPlan(r.doc, broken, r.plan)).toMatch(/Playtest.*displacement=/);
});
