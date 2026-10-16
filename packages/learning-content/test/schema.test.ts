import { describe, expect, it } from 'vitest';
import { WorldPackSchema, validatePack, isBanglaScript } from '../src/schema';
import { minimalChallenge, minimalCharacter, minimalPack } from './helpers';

describe('WorldPackSchema', () => {
  it('accepts a minimal valid pack', () => {
    const result = WorldPackSchema.safeParse(minimalPack());
    expect(result.success).toBe(true);
  });

  it('rejects an unknown section', () => {
    const result = WorldPackSchema.safeParse({ ...minimalPack(), section: 'dinosaurs' });
    expect(result.success).toBe(false);
  });

  it('rejects a character with fewer than six facts', () => {
    const character = minimalCharacter({ facts: ['one', 'two'], factsBn: ['এক', 'দুই'] });
    const result = WorldPackSchema.safeParse(minimalPack({ characters: [character] }));
    expect(result.success).toBe(false);
  });

  it('rejects a character whose facts and factsBn differ in length', () => {
    const base = minimalCharacter();
    const character = minimalCharacter({ factsBn: base.factsBn.slice(0, 5) });
    const result = WorldPackSchema.safeParse(minimalPack({ characters: [character] }));
    expect(result.success).toBe(false);
  });

  it('rejects a character id that is not snake_case', () => {
    const character = minimalCharacter({ id: 'Rocky-One' });
    const result = WorldPackSchema.safeParse(minimalPack({ characters: [character] }));
    expect(result.success).toBe(false);
  });

  it('rejects a voice that is not a Live voice name', () => {
    const character = minimalCharacter({ voice: 'Morgan Freeman' as never });
    const result = WorldPackSchema.safeParse(minimalPack({ characters: [character] }));
    expect(result.success).toBe(false);
  });

  it('rejects a hotspot comesCloser style outside swoop, grow, ring', () => {
    const pack = minimalPack({
      hotspots: [{ entityId: 'rock_one', characterId: 'rocky', comesCloser: 'teleport' as never }],
    });
    expect(WorldPackSchema.safeParse(pack).success).toBe(false);
  });

  it('rejects a challenge with fewer than six accepted answers', () => {
    const challenge = minimalChallenge({ accepted: ['meteorite', 'meteor'] });
    const result = WorldPackSchema.safeParse(minimalPack({ challenges: [challenge] }));
    expect(result.success).toBe(false);
  });

  it('rejects challenge points above ten and below one', () => {
    for (const points of [0, 11, 2.5]) {
      const challenge = minimalChallenge({ points });
      expect(WorldPackSchema.safeParse(minimalPack({ challenges: [challenge] })).success).toBe(
        false,
      );
    }
  });

  it('rejects an unknown pet reward', () => {
    const challenge = minimalChallenge({ petReward: 'unicorn_of_doom' as never });
    expect(WorldPackSchema.safeParse(minimalPack({ challenges: [challenge] })).success).toBe(false);
  });

  it('rejects a sound file outside assets/sounds or not ogg', () => {
    const sound = minimalPack().sounds[0]!;
    for (const file of ['rock.ogg', 'assets/sounds/rock.mp3', '../rock.ogg']) {
      const pack = minimalPack({ sounds: [{ ...sound, file }] });
      expect(WorldPackSchema.safeParse(pack).success).toBe(false);
    }
  });

  it('requires licence and url unless the provenance source is missing', () => {
    const sound = minimalPack().sounds[0]!;
    const unlicensed = { ...sound, provenance: { source: 'somewhere', licence: '', url: '' } };
    expect(WorldPackSchema.safeParse(minimalPack({ sounds: [unlicensed] })).success).toBe(false);
    const missing = { ...sound, provenance: { source: 'missing', licence: '', url: '' } };
    expect(WorldPackSchema.safeParse(minimalPack({ sounds: [missing] })).success).toBe(true);
  });

  it('rejects an invalid scene', () => {
    const pack = minimalPack();
    const scene = { ...pack.scene, entities: [] };
    expect(WorldPackSchema.safeParse({ ...pack, scene }).success).toBe(false);
  });
});

describe('validatePack', () => {
  it('returns no issues for a valid pack', () => {
    expect(validatePack(minimalPack())).toEqual([]);
  });

  it('reports schema failures with a path', () => {
    const issues = validatePack({ ...minimalPack(), title: '' });
    expect(issues.some((i) => i.code === 'SCHEMA_INVALID' && i.path === 'title')).toBe(true);
  });

  it('reports a hotspot whose entity is not in the scene', () => {
    const pack = minimalPack({
      hotspots: [{ entityId: 'ghost', characterId: 'rocky', comesCloser: 'swoop' }],
    });
    const issues = validatePack(pack);
    expect(issues).toContainEqual(
      expect.objectContaining({ code: 'UNKNOWN_ENTITY_REF', path: 'hotspots.0.entityId' }),
    );
  });

  it('reports a hotspot whose character does not exist', () => {
    const pack = minimalPack({
      hotspots: [{ entityId: 'rock_one', characterId: 'nobody', comesCloser: 'swoop' }],
    });
    expect(validatePack(pack)).toContainEqual(
      expect.objectContaining({ code: 'UNKNOWN_CHARACTER_REF', path: 'hotspots.0.characterId' }),
    );
  });

  it('reports a challenge whose character does not exist', () => {
    const pack = minimalPack({ challenges: [minimalChallenge({ characterId: 'nobody' })] });
    expect(validatePack(pack)).toContainEqual(
      expect.objectContaining({ code: 'UNKNOWN_CHARACTER_REF', path: 'challenges.0.characterId' }),
    );
  });

  it('reports a sound whose entity is not in the scene', () => {
    const sound = { ...minimalPack().sounds[0]!, entityId: 'ghost' };
    expect(validatePack(minimalPack({ sounds: [sound] }))).toContainEqual(
      expect.objectContaining({ code: 'UNKNOWN_ENTITY_REF', path: 'sounds.0.entityId' }),
    );
  });

  it('reports duplicate accepted answers, ignoring case and spacing', () => {
    const challenge = minimalChallenge({
      accepted: ['meteorite', ' Meteorite', 'meteor', 'a meteorite', 'উল্কাপিণ্ড', 'উল্কা'],
    });
    expect(validatePack(minimalPack({ challenges: [challenge] }))).toContainEqual(
      expect.objectContaining({ code: 'DUPLICATE_ACCEPTED', path: 'challenges.0.accepted.1' }),
    );
  });

  it('reports duplicate character and challenge ids', () => {
    const pack = minimalPack({
      characters: [minimalCharacter(), minimalCharacter()],
      challenges: [minimalChallenge(), minimalChallenge()],
    });
    const issues = validatePack(pack);
    expect(issues).toContainEqual(
      expect.objectContaining({ code: 'DUPLICATE_ID', path: 'characters.1.id' }),
    );
    expect(issues).toContainEqual(
      expect.objectContaining({ code: 'DUPLICATE_ID', path: 'challenges.1.id' }),
    );
  });

  it('reports a challenge id that gives away its answer key', () => {
    const challenge = minimalChallenge({ id: 'ch_meteorite_name' });
    expect(validatePack(minimalPack({ challenges: [challenge] }))).toContainEqual(
      expect.objectContaining({ code: 'ANSWER_IN_ID', path: 'challenges.0.id' }),
    );
  });

  it('reports points outside one to ten', () => {
    const issues = validatePack(minimalPack({ challenges: [minimalChallenge({ points: 11 })] }));
    expect(issues.some((i) => i.path === 'challenges.0.points')).toBe(true);
  });

  it('surfaces scene validator issues, warnings included, under the scene path', () => {
    const pack = minimalPack();
    // Move the rock outside the bounds: the scene validator clamps it and warns.
    pack.scene.entities[0]!.transform.x = 40;
    const issues = validatePack(pack);
    expect(issues).toContainEqual(
      expect.objectContaining({ code: 'SCENE_ISSUE', path: 'scene.entities.0.transform' }),
    );
  });
});

describe('isBanglaScript', () => {
  it('detects Bangla letters and ignores Latin text', () => {
    expect(isBanglaScript('উল্কা')).toBe(true);
    expect(isBanglaScript('meteor')).toBe(false);
    expect(isBanglaScript('8')).toBe(false);
  });
});
