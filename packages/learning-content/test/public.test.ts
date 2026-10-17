import { expect, it } from 'vitest';
import { loadPack } from '../src/index';
import { publicLearningPack } from '../src/public';

it('publishes facts and questions without answer keys, hints or assessment variations', () => {
  const source = loadPack('space'),
    published = publicLearningPack(source);
  const serialized = JSON.stringify(published);
  for (const property of ['answerKey', 'accepted', 'hint', 'hintBn', 'voice', 'personality'])
    expect(serialized).not.toContain(`"${property}":`);
  expect(published.challenges[0]?.questionBn).toBe(source.challenges[0]?.questionBn);
  expect(published.characters[0]?.facts).toEqual(source.characters[0]?.facts);
  published.scene.entities.splice(0);
  expect(source.scene.entities.length).toBeGreaterThan(0);
});
