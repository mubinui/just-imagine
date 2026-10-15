import { WorldDocSchema, paths, type WorldSource } from '@just-imagine/protocol';
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
        world: {
          ...step.world,
          doc: {
            ...step.world.doc,
            entities: step.world.doc.entities.map((e) => ({
              ...e,
              asset: e.asset ? { ...e.asset, status: 'placeholder' as const } : undefined,
            })),
          },
        },
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
