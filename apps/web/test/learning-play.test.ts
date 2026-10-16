import { describe, expect, it } from 'vitest';
import {
  DANCE_SEQUENCE,
  FOOD_TEAM,
  OXYGEN_ROUTE,
  PLAQUE,
  initialPlay,
  moonLight,
  playReducer,
} from '../components/learn/play-model';
describe('learning game consequences', () => {
  it('cleans only plaque actually crossed by the brush and resets a completed game', () => {
    let s = initialPlay('hygiene');
    s = playReducer(s, { type: 'brush', x: 0, y: 0 });
    expect(s.cleaned).toEqual([]);
    s = playReducer(s, { type: 'brush', ...PLAQUE[0]! });
    expect(s.cleaned.length).toBeGreaterThan(0);
    expect(s.complete).toBe(false);
    for (const p of PLAQUE) s = playReducer(s, { type: 'brush', ...p });
    expect(s.complete).toBe(true);
    expect(s.cleaned).toHaveLength(24);
    expect(playReducer(s, { type: 'reset' })).toEqual(initialPlay('hygiene'));
  });
  it('requires blood to travel through the heart on both outward and return journeys', () => {
    let s = initialPlay('body');
    s = playReducer(s, { type: 'oxygen', target: 'body' });
    expect(s.oxygen).toBe(0);
    expect(s.feedback).toBe('oxygen_try');
    for (const target of OXYGEN_ROUTE) s = playReducer(s, { type: 'oxygen', target });
    expect(s.complete).toBe(true);
    expect(s.oxygen).toBe(4);
  });
  it('shows correct illumination and requires all three phase positions in order', () => {
    expect(moonLight(0)).toBe(1);
    expect(moonLight(Math.PI)).toBe(0);
    expect(moonLight(Math.PI / 2)).toBeCloseTo(0.5);
    let s = initialPlay('space');
    s = playReducer(s, { type: 'moon', angle: Math.PI });
    expect(s.phaseGoal).toBe(0);
    for (const angle of [0, Math.PI, Math.PI / 2]) s = playReducer(s, { type: 'moon', angle });
    expect(s.complete).toBe(true);
  });
  it('does not accept a wrong habitat or count repeat deliveries', () => {
    let s = initialPlay('animals');
    s = playReducer(s, { type: 'animal', animal: 'dolphin', home: 'farm' });
    expect(s.rescued).toEqual([]);
    s = playReducer(s, { type: 'animal', animal: 'dolphin', home: 'ocean' });
    s = playReducer(s, { type: 'animal', animal: 'dolphin', home: 'ocean' });
    expect(s.rescued).toEqual(['dolphin']);
  });
  it('uses nutrient requests instead of accepting every dropped food', () => {
    let s = initialPlay('food');
    s = playReducer(s, { type: 'food', food: 'milk' });
    expect(s.foods).toEqual([]);
    for (const food of FOOD_TEAM) s = playReducer(s, { type: 'food', food });
    expect(s.complete).toBe(true);
  });
  it('matches an authored movement sequence without claiming to track the child', () => {
    let s = initialPlay('exercise');
    s = playReducer(s, { type: 'dance', pad: 3 });
    expect(s.dance).toBe(0);
    for (const pad of DANCE_SEQUENCE) s = playReducer(s, { type: 'dance', pad });
    expect(s.complete).toBe(true);
  });
  it('does not let a different section’s input mutate a game', () => {
    const s = initialPlay('space');
    expect(playReducer(s, { type: 'brush', ...PLAQUE[0]! })).toBe(s);
    expect(playReducer(s, { type: 'food', food: 'carrot' })).toBe(s);
  });
});
