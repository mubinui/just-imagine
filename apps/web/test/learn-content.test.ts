import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { PACKS, loadPack } from '@just-imagine/learning-content';
import { learnIslands, publicPack, sectionPacks } from '../components/learn/content';

describe('public packs for the browser', () => {
  it('never carry answer keys, accepted answers or hints', () => {
    for (const pack of Object.values(PACKS)) {
      const text = JSON.stringify(publicPack(pack));
      expect(text).not.toContain('"answerKey"');
      expect(text).not.toContain('"accepted"');
      expect(text).not.toMatch(/"hint(Bn)?"/);
      for (const challenge of pack.challenges) {
        expect(text).not.toContain(challenge.hint);
        expect(text).not.toContain(challenge.hintBn);
      }
    }
  });
  it('keeps questions in both languages and the authored points', () => {
    const space = publicPack(loadPack('space'));
    expect(space.challenges.find((c) => c.id === 'ch_saturn_bath')).toEqual({
      id: 'ch_saturn_bath',
      characterId: 'saturn',
      question: expect.stringContaining('bathtub'),
      questionBn: expect.stringMatching(/[ঀ-৿]/),
      points: 4,
    });
  });
  it('lets the stage draw characters and scenery while the engine keeps their physics', () => {
    const farm = publicPack(loadPack('animals_farm'));
    const cow = farm.scene.entities.find((e) => e.id === 'cow')!;
    expect(cow.tags).toContain('painted_ground');
    expect(farm.scene.entities.find((e) => e.id === 'barn')!.tags).toContain('painted_ground');
    // The ball is a toy the child flicks: the engine still draws it.
    expect(farm.scene.entities.find((e) => e.id === 'ball')!.tags).not.toContain('painted_ground');
    expect(farm.scene.theme.backdrop).toMatchObject({
      url: '/learn/cinematic/animals-farm-world-v1.webp',
      status: 'ready',
    });
    expect(farm.sounds).toContainEqual({ entityId: 'cow', clip: '/learn/sounds/cow' });
  });
});

describe('the map', () => {
  it('lists six sections in the demo order with every destination open', () => {
    const islands = learnIslands();
    expect(islands.map((i) => i.section)).toEqual([
      'space',
      'animals',
      'body',
      'food',
      'hygiene',
      'exercise',
    ]);
    expect(islands.filter((i) => i.open).map((i) => i.section)).toEqual(
      islands.map((i) => i.section),
    );
    expect(islands[0]!.challengeIds).toHaveLength(13);
    expect(islands[1]!.challengeIds).toHaveLength(10);
    expect(islands[2]!.challengeIds).toHaveLength(5);
  });
  it('groups the three animal places into one section', () => {
    expect(sectionPacks('animals').map((p) => p.id)).toEqual([
      'animals_farm',
      'animals_jungle',
      'animals_ocean',
    ]);
    expect(sectionPacks('body').map((p) => p.id)).toEqual(['body']);
    expect(sectionPacks('nonsense')).toEqual([]);
  });
});

describe('answer keys stay on the server', () => {
  it('no client component imports the content package or the server content module', () => {
    const root = join(__dirname, '..');
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.tsx?$/.test(name)) files.push(path);
      }
    };
    for (const dir of ['components', 'app', 'lib']) walk(join(root, dir));
    const offenders = files.filter((file) => {
      const text = readFileSync(file, 'utf8');
      return (
        /^['"]use client['"]/.test(text) &&
        /@just-imagine\/learning-content(?!\/(?:play|schema)\b)|learn\/content['"]/.test(text)
      );
    });
    expect(offenders).toEqual([]);
  });
});
