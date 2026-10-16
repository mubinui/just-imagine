import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PACKS, PACK_IDS, loadPack } from '../src/index';
import { personaInstruction } from '../src/characters';
import { isBanglaScript, validatePack, type WorldPack } from '../src/schema';

const ROOT = resolve(import.meta.dirname, '..');
const packs: WorldPack[] = Object.values(PACKS);
const ANIMAL_PACK_IDS = ['animals_farm', 'animals_jungle', 'animals_ocean'] as const;

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wholeWord = (s: string): RegExp =>
  new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(s)}(?=$|[^\\p{L}\\p{N}])`, 'iu');

describe('PACKS', () => {
  it('ships the space pack and the three animal packs', () => {
    expect([...PACK_IDS].sort()).toEqual([
      'animals_farm',
      'animals_jungle',
      'animals_ocean',
      'space',
    ]);
    for (const id of PACK_IDS) expect(loadPack(id).id).toBe(id);
  });

  it('throws for an unknown pack id', () => {
    expect(() => loadPack('dinosaurs')).toThrow(/dinosaurs/);
  });

  it.each(packs.map((p) => [p.id, p] as const))('%s validates with zero issues', (_id, pack) => {
    expect(validatePack(pack)).toEqual([]);
  });

  it.each(packs.map((p) => [p.id, p] as const))(
    '%s keeps the scene under the entity limit and marks assets as placeholders',
    (_id, pack) => {
      expect(pack.scene.entities.length).toBeLessThanOrEqual(24);
      expect(pack.scene.theme.backdrop.status).toBe('placeholder');
      for (const entity of pack.scene.entities) {
        if (entity.asset) expect(entity.asset.status).toBe('placeholder');
      }
    },
  );

  it.each(packs.map((p) => [p.id, p] as const))(
    '%s gives every hotspot character a scene entity, and every challenge at least 6 accepted variants with 2 in Bangla',
    (_id, pack) => {
      const hotspotCharacters = new Set(pack.hotspots.map((h) => h.characterId));
      for (const character of pack.characters) {
        expect(hotspotCharacters.has(character.id)).toBe(true);
      }
      for (const challenge of pack.challenges) {
        expect(challenge.accepted.length).toBeGreaterThanOrEqual(6);
        expect(challenge.accepted.filter(isBanglaScript).length).toBeGreaterThanOrEqual(2);
        expect(isBanglaScript(challenge.questionBn)).toBe(true);
        expect(isBanglaScript(challenge.hintBn)).toBe(true);
      }
    },
  );

  it.each(packs.map((p) => [p.id, p] as const))(
    '%s characters carry Bangla names, catchphrases and facts',
    (_id, pack) => {
      for (const character of pack.characters) {
        expect(isBanglaScript(character.nameBn)).toBe(true);
        expect(isBanglaScript(character.catchphraseBn)).toBe(true);
        for (const fact of character.factsBn) expect(isBanglaScript(fact)).toBe(true);
        for (const fact of character.facts) expect(isBanglaScript(fact)).toBe(false);
      }
    },
  );

  it.each(packs.map((p) => [p.id, p] as const))(
    '%s persona instructions contain the facts and never an answer key',
    (_id, pack) => {
      for (const character of pack.characters) {
        const en = personaInstruction(pack, character.id, 'en');
        const bn = personaInstruction(pack, character.id, 'bn');
        for (const fact of character.facts) expect(en).toContain(fact);
        for (const fact of character.factsBn) expect(bn).toContain(fact);
        // The character who asks a challenge must not carry its answer in its own persona.
        for (const challenge of pack.challenges.filter((c) => c.characterId === character.id)) {
          expect(en).not.toMatch(wholeWord(challenge.answerKey));
          expect(bn).not.toMatch(wholeWord(challenge.answerKey));
        }
      }
    },
  );

  it.each(packs.map((p) => [p.id, p] as const))(
    '%s sound files exist on disk unless the provenance is marked missing',
    (_id, pack) => {
      for (const sound of pack.sounds) {
        const exists = existsSync(resolve(ROOT, sound.file));
        if (sound.provenance.source === 'missing') expect(exists).toBe(false);
        else {
          expect(exists).toBe(true);
          expect(statSync(resolve(ROOT, sound.file)).size).toBeLessThan(200 * 1024);
        }
      }
    },
  );
});

describe('space pack', () => {
  const space = loadPack('space');
  const planets = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

  it('has the Sun and the eight planets as characters', () => {
    expect(space.characters.map((c) => c.id).sort()).toEqual([...planets, 'sun'].sort());
    expect(space.scene.environment.medium).toBe('space');
  });

  it('has a swoop hotspot for every planet', () => {
    for (const planet of planets) {
      const hotspot = space.hotspots.find((h) => h.characterId === planet);
      expect(hotspot?.comesCloser).toBe('swoop');
    }
  });

  it('has ten challenges with two pet rewards', () => {
    expect(space.challenges).toHaveLength(10);
    expect(space.challenges.filter((c) => c.petReward).length).toBe(2);
  });

  it('says in its notes that sizes are not to scale', () => {
    expect(space.notes).toMatch(/not to (true )?scale/i);
  });
});

describe('animal packs', () => {
  const animalPacks = ANIMAL_PACK_IDS.map((id) => loadPack(id));

  it('share the animals section and cover twelve animals', () => {
    const ids = animalPacks.flatMap((p) => p.characters.map((c) => c.id)).sort();
    expect(ids).toEqual(
      [
        'cow',
        'sheep',
        'chicken',
        'horse',
        'lion',
        'elephant',
        'monkey',
        'parrot',
        'dolphin',
        'whale',
        'seal',
        'penguin',
      ].sort(),
    );
    for (const pack of animalPacks) expect(pack.section).toBe('animals');
  });

  it('give every animal a hotspot and a sound entry on the same entity', () => {
    for (const pack of animalPacks) {
      for (const character of pack.characters) {
        const hotspot = pack.hotspots.find((h) => h.characterId === character.id);
        expect(hotspot).toBeDefined();
        const sound = pack.sounds.find((s) => s.entityId === hotspot!.entityId);
        expect(sound, `${character.id} has no sound`).toBeDefined();
      }
    }
  });

  it('carry ten challenges across the three packs', () => {
    const total = animalPacks.reduce((n, p) => n + p.challenges.length, 0);
    expect(total).toBe(10);
  });
});
