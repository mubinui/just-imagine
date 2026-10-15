import { WorldDocSchema, paths, type WorldSource, type WorldWithId } from '@just-imagine/protocol';
import {
  FakeWorldSource,
  progressiveScript,
  type FixtureWorldKey,
  fixtureWorldDoc,
  LAB_WORLDS,
} from '@just-imagine/fixtures/browser';
import { doc, onSnapshot } from 'firebase/firestore';
import { firebase } from './firebase';
import { type PreviewKey } from './preview-worlds';
import { env } from './env';
import { playablePreview } from './playable-preview';
function previewArt(world: WorldWithId, key: PreviewKey): WorldWithId {
  const doc = playablePreview(world.doc, key, window.location.origin);
  return {
    ...world,
    doc,
    assets: Object.fromEntries(
      doc.entities
        .filter((e) => e.asset?.status === 'ready')
        .map((e) => [e.id, { status: 'ready' as const, url: e.asset!.url }]),
    ),
  };
}
export function createWorldSource(key: PreviewKey = 'jellyDragon'): WorldSource {
  if (env.fake)
    return new FakeWorldSource(
      (key in LAB_WORLDS
        ? [
            {
              afterMs: 0,
              world: fixtureWorldDoc('projectileLab', {
                doc: LAB_WORLDS[key as keyof typeof LAB_WORLDS],
              }),
            },
          ]
        : progressiveScript(key as FixtureWorldKey)
      ).map((step) => ({
        ...step,
        world: previewArt(step.world, key),
      })),
      {
        timers: {
          setTimeout: (fn, ms) => setTimeout(fn, ms),
          clearTimeout: (handle) => clearTimeout(handle),
        },
      },
    );
  return {
    subscribe(id, update, error) {
      return onSnapshot(
        doc(firebase().db, paths.world(id)),
        (snap) => {
          const parsed = WorldDocSchema.safeParse(snap.data());
          if (parsed.success) update({ ...parsed.data, id });
          else error?.(new Error('The world document could not be validated.'));
        },
        error,
      );
    },
  };
}
