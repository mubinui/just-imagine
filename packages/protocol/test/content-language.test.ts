import { describe, expect, it } from 'vitest';
import { contentTexts, applyContentTexts, languageInstruction } from '../src';
import { manuscript } from './fixtures/story';
import { minimalScene } from '../../scene-schema/test/helpers';
describe('saved content translated editions', () => {
  it('changes only story display prose, retaining choices, illustrations, actions and progress', () => {
    const original = {
      id: 's_one',
      topic: 'A garden',
      language: 'en',
      manuscript: manuscript(),
      images: { s1: { url: 'https://owned/image.png' } },
      progress: { scene: 1, beat: 0, choices: { scene_1: 'help' }, completed: false },
    };
    const before = structuredClone(original),
      entries = contentTexts('story', original);
    const localized = applyContentTexts(
      original,
      entries,
      entries.map(() => 'বাংলা গল্প'),
    );
    expect(localized.manuscript.scenes[0]?.beats[0]?.text).toBe('বাংলা গল্প');
    expect(localized.manuscript.scenes[0]?.choices.map((c) => c.id)).toEqual(
      original.manuscript.scenes[0]?.choices.map((c) => c.id),
    );
    expect(localized.images).toEqual(original.images);
    expect(localized.progress).toEqual(original.progress);
    expect(localized.manuscript.castDescription).toBe(original.manuscript.castDescription);
    expect(original).toEqual(before);
  });
  it('retains exact world script, physics, IDs, tags, art, numeric controls and answer indices', () => {
    const doc = minimalScene();
    const original = { title: doc.title, doc };
    const entries = contentTexts('world', original),
      localized = applyContentTexts(
        original,
        entries,
        entries.map(() => 'বাংলা'),
      );
    expect(localized.doc.title).toBe('বাংলা');
    expect(localized.doc.environment).toEqual(doc.environment);
    expect(localized.doc.entities.map((e) => e.name)).toEqual(doc.entities.map(() => 'বাংলা'));
    expect(localized.doc.entities.map(({ name: _name, ...rest }) => rest)).toEqual(
      doc.entities.map(({ name: _name, ...rest }) => rest),
    );
    expect(localized.doc.game).toEqual(doc.game);
    expect(localized.doc.learning.prediction.correctIndex).toBe(
      doc.learning.prediction.correctIndex,
    );
    expect(localized.doc.learning.heroEntityId).toBe(doc.learning.heroEntityId);
  });
  it('rejects missing or overlong translations instead of silently publishing mixed editions', () => {
    const entries = contentTexts('world', { title: 'World' });
    expect(() => applyContentTexts({ title: 'World' }, entries, [])).toThrow();
    expect(() => applyContentTexts({ title: 'World' }, entries, ['a'.repeat(61)])).toThrow();
  });
});
describe('exclusive language policy', () => {
  it('pins Bangladesh vocabulary, script and settings precedence', () => {
    const bn = languageInstruction({ language: 'bn' });
    expect(bn).toContain('OUTPUT LANGUAGE: bn-BD');
    expect(bn).toContain('পানি');
    expect(bn).toContain('Do not switch languages because the child asks in a prompt');
    expect(languageInstruction({ language: 'en' })).toContain('Use ONLY natural English');
  });
});
