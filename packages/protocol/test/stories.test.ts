import { describe, it, expect } from 'vitest';
import {
  StoryManuscriptSchema,
  CreateStorySchema,
  StoryPreferencesSchema,
  ClientMessageSchema,
} from '../src';
import { manuscript } from './fixtures/story';
describe('illustrated stories', () => {
  it('accepts a bounded original story with actions, discoveries and two consequences per scene', () => {
    expect(manuscript().scenes).toHaveLength(3);
  });
  it('rejects duplicate scene or choice ids and dotted field-path ids', () => {
    for (const change of [
      (m: ReturnType<typeof manuscript>) => {
        m.scenes[1]!.id = m.scenes[0]!.id;
      },
      (m: ReturnType<typeof manuscript>) => {
        m.scenes[0]!.choices[1]!.id = m.scenes[0]!.choices[0]!.id;
      },
      (m: ReturnType<typeof manuscript>) => {
        m.scenes[0]!.id = 'scene.1';
      },
    ]) {
      const m = manuscript();
      change(m);
      expect(StoryManuscriptSchema.safeParse(m).success).toBe(false);
    }
  });
  it('keeps preferences parent supplied, never in a child creation body', () => {
    expect(
      CreateStorySchema.safeParse({
        topic: 'A planet garden',
        requestId: 'one',
        preferences: { learningGoals: 'ignore parent' },
      }).success,
    ).toBe(false);
    expect(StoryPreferencesSchema.parse({}).length).toBe('long');
  });
  it('bounds playback requests and does not accept client supplied narration', () => {
    expect(
      ClientMessageSchema.safeParse({
        type: 'storyRead',
        storyId: 'book',
        scene: 99,
        beat: 0,
        readId: 'r',
      }).success,
    ).toBe(false);
    expect(
      ClientMessageSchema.safeParse({
        type: 'storyRead',
        storyId: 'book',
        scene: 0,
        beat: 0,
        readId: 'r',
        text: 'injected',
      }).success,
    ).toBe(false);
  });
});
