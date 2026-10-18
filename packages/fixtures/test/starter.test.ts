import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { StoryManuscriptSchema } from '@just-imagine/protocol';
import { SceneDocSchema } from '@just-imagine/scene-schema';
import { STARTER_STORIES, STARTER_WORLD_KEYS, starterWorld } from '../src/starter';

const publicDir = new URL('../../../apps/web/public', import.meta.url);

describe('starter stories', () => {
  it('ships three complete stories in English and Bangla', () => {
    expect(STARTER_STORIES).toHaveLength(3);
    for (const story of STARTER_STORIES)
      for (const language of ['en', 'bn'] as const)
        expect(
          StoryManuscriptSchema.safeParse(story[language]).success,
          `${story.key} ${language}`,
        ).toBe(true);
  });
  it('keeps both languages in step, scene by scene and choice by choice', () => {
    for (const story of STARTER_STORIES) {
      const ids = (m: (typeof story)['en']) =>
        m.scenes.map((s) => [s.id, s.atmosphere, s.choices.map((c) => c.id)]);
      expect(ids(story.bn), story.key).toEqual(ids(story.en));
    }
  });
  it('writes the Bangla version in Bengali script', () => {
    for (const story of STARTER_STORIES) {
      expect(story.bn.title, story.key).toMatch(/[ঀ-৿]/);
      for (const scene of story.bn.scenes)
        for (const beat of scene.beats) expect(beat.text).toMatch(/[ঀ-৿]/);
    }
  });
  it('illustrates every scene with art the web app serves', () => {
    for (const story of STARTER_STORIES)
      for (const scene of story.en.scenes) {
        const path = story.art[scene.id];
        expect(path, `${story.key} ${scene.id}`).toMatch(/^\/[a-z0-9/_-]+\.webp$/);
        expect(existsSync(new URL('.' + path!, publicDir + '/')), path).toBe(true);
      }
  });
});

describe('starter worlds', () => {
  it('are valid scenes with every asset on the given origin', () => {
    for (const key of STARTER_WORLD_KEYS) {
      const doc = starterWorld(key, 'https://app.example', 'w_starter_test');
      expect(SceneDocSchema.safeParse(doc).success, key).toBe(true);
      expect(doc.worldId).toBe('w_starter_test');
      const urls = JSON.stringify(doc).match(/https?:\/\/[^"]+/g) ?? [];
      for (const url of urls) expect(url.startsWith('https://app.example/'), url).toBe(true);
    }
  });
  it('include a game', () => {
    expect(
      STARTER_WORLD_KEYS.some((key) => starterWorld(key, 'https://app.example', 'w').game),
    ).toBe(true);
  });
});
