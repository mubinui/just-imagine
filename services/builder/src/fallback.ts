import { FIXTURE_WORLDS, LAB_WORLDS } from '@just-imagine/fixtures/browser';
import { validateScene, type SceneDoc } from '@just-imagine/scene-schema';
import type { BuildWorldJob } from '@just-imagine/protocol';

/** Curated cached fallback only: never pass malformed generated content through. */
export function nearestConceptFixture(job: Pick<BuildWorldJob, 'worldId' | 'tier' | 'concepts'>): {
  fixtureKey: string;
  doc: SceneDoc;
} {
  const candidates = Object.entries({ ...FIXTURE_WORLDS, ...LAB_WORLDS }).filter(
    ([, doc]) => doc.tier === job.tier,
  );
  const score = (doc: SceneDoc) =>
    doc.learning.concepts.filter((concept) => job.concepts.includes(concept)).length;
  candidates.sort((a, b) => score(b[1]) - score(a[1]));
  const [fixtureKey, fixture] = candidates[0]!;
  const doc = structuredClone(fixture);
  doc.worldId = job.worldId;
  const checked = validateScene(doc);
  if (!checked.ok) throw new Error(`Cached fallback fixture ${fixtureKey} is invalid`);
  return { fixtureKey, doc: checked.doc };
}
