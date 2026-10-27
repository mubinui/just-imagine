import { api } from './api';
import { currentLanguage } from './i18n';
import { WorldDocSchema, paths, type WorldSource, type WorldWithId } from '@just-imagine/protocol';
import {
  FakeWorldSource,
  progressiveScript,
  type FixtureWorldKey,
  fixtureWorldDoc,
  LAB_WORLDS,
  GAME_WORLDS,
  isScriptedBuild,
  scriptedBuildWorld,
  type FakeWorldStep,
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
function fixtureScript(key: PreviewKey): FakeWorldStep[] {
  return (
    key in LAB_WORLDS || key in GAME_WORLDS
      ? [
          {
            afterMs: 0,
            world: fixtureWorldDoc('projectileLab', {
              doc:
                key in GAME_WORLDS
                  ? GAME_WORLDS[key as keyof typeof GAME_WORLDS]
                  : LAB_WORLDS[key as keyof typeof LAB_WORLDS],
            }),
          },
        ]
      : progressiveScript(key as FixtureWorldKey)
  ).map((step) => ({ ...step, world: previewArt(step.world, key) }));
}
const fakeTimers = {
  setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
  clearTimeout: (handle: ReturnType<typeof setTimeout>) => clearTimeout(handle),
};
export function createWorldSource(key: PreviewKey = 'jellyDragon'): WorldSource {
  if (env.fake)
    return {
      // The fake gateway's scripted build names its world; the game is served under that name.
      subscribe: (id, update, error) =>
        new FakeWorldSource(
          isScriptedBuild(id)
            ? [{ afterMs: 0, world: previewArt(scriptedBuildWorld(id), 'catchTheFlies') }]
            : fixtureScript(key),
          { timers: fakeTimers },
        ).subscribe(id, update, error),
    };
  return {
    subscribe(id, update, error) {
      let active = true,
        revision = 0;
      const language = currentLanguage();
      const stop = onSnapshot(
        doc(firebase().db, paths.world(id)),
        (snap) => {
          const current = ++revision;
          const parsed = WorldDocSchema.safeParse(snap.data());
          if (!parsed.success) {
            error?.(new Error('The world document could not be validated.'));
            return;
          }
          // Firestore remains the live invalidation source; only an owned translated API view is rendered.
          void api<WorldWithId>('getWorld', { worldId: id })
            .then((localized) => {
              if (active && current === revision && language === currentLanguage())
                update(localized);
            })
            .catch((failure) => {
              if (active && current === revision) error?.(failure);
            });
        },
        error,
      );
      return () => {
        active = false;
        stop();
      };
    },
  };
}
