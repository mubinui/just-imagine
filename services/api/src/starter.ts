import { STARTER_STORIES, STARTER_WORLD_KEYS, starterWorld } from '@just-imagine/fixtures/browser';
import {
  StoryDocSchema,
  WorldDocSchema,
  languageOf,
  paths,
  storyPreferencesOf,
  type ChildDoc,
} from '@just-imagine/protocol';
import { ulid } from 'ulid';
import { db, newId } from '@just-imagine/server-core';

/**
 * Writes the starter shelf for a new explorer, inside the transaction that creates the profile:
 * three ready-to-play worlds (one of them a game) and three illustrated stories in the explorer's
 * language. Their art is served by the web app, so it lives on WEB_URL. Nothing here counts
 * against the family's daily creation allowance.
 */
export function writeStarterContent(
  tx: FirebaseFirestore.Transaction,
  uid: string,
  childId: string,
  child: ChildDoc,
) {
  const origin = process.env['WEB_URL'] || 'http://localhost:3000';
  const now = Date.now();
  STARTER_WORLD_KEYS.forEach((key, index) => {
    const worldId = newId('w');
    const doc = starterWorld(key, origin, worldId);
    tx.create(
      db().doc(paths.world(worldId)),
      WorldDocSchema.parse({
        ownerUid: uid,
        childId,
        title: doc.title,
        status: 'ready',
        doc,
        schemaVersion: 1,
        promptVersion: 'starter',
        styleVersion: 'starter',
        assets: {},
        concepts: doc.learning.concepts,
        thumbnailUrl: doc.theme.backdrop?.url ?? null,
        jobId: `starter_${key}`,
        // Oldest first, so the explorer's own creations appear above the starter shelf.
        createdAt: now - (STARTER_WORLD_KEYS.length - index) * 1000,
        updatedAt: now,
      }),
    );
  });
  const language = languageOf(child);
  STARTER_STORIES.forEach((story, index) => {
    const id = `story_${ulid().toLowerCase()}`; // the same shape as generated stories
    const manuscript = story[language];
    tx.create(
      db().doc(`stories/${id}`),
      StoryDocSchema.parse({
        id,
        ownerUid: uid,
        childId,
        topic: story.topic[language],
        generationId: newId('j'),
        canRetry: false,
        writtenScenes: manuscript.scenes.length,
        language,
        ageBand: child.ageBand,
        preferences: storyPreferencesOf(child),
        status: 'ready',
        manuscript,
        images: Object.fromEntries(
          manuscript.scenes.map((scene) => [
            scene.id,
            { status: 'ready', url: new URL(story.art[scene.id]!, origin).href },
          ]),
        ),
        progress: { scene: 0, beat: 0, choices: {}, completed: false },
        revision: 0,
        createdAt: now - (STARTER_STORIES.length - index) * 1000,
        updatedAt: now,
      }),
    );
  });
}
