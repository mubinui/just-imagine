import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import {
  cueForEvent,
  getMixer,
  releaseMixer,
  soundForEngineEvents,
  useSoundForEngineEvents,
  type SoundEngineEvent,
} from '../lib/sound';
import type { Mixer } from '../lib/sound/mixer';

const table: [string, SoundEngineEvent, string | null][] = [
  ['DSL sound action', { type: 'sound', value: { action: 'sound', cue: 'boing' } }, 'boing'],
  ['sound with a bare cue', { type: 'sound', value: { cue: 'ding' } }, 'ding'],
  ['sound with a string', { type: 'sound', value: 'splat' }, 'splat'],
  ['sound with an unknown cue', { type: 'sound', value: 'kazoo' }, null],
  ['celebrate confetti action', { type: 'celebrate', value: { style: 'confetti' } }, 'confetti'],
  ['celebrate sparkle string (spell)', { type: 'celebrate', value: 'sparkle' }, 'chime_magic'],
  ['celebrate splash', { type: 'celebrate', value: { style: 'splash' } }, 'splash'],
  ['celebrate unknown style', { type: 'celebrate', value: 'fireworks' }, 'chime_magic'],
  ['spawn', { type: 'spawn', value: { action: 'spawn', count: 3 } }, 'pop'],
  ['impact as a number', { type: 'impact', value: 3 }, 'thud'],
  ['impact as an object', { type: 'impact', value: { impulse: 12 } }, 'thud_big'],
  ['collision alias', { type: 'collision', value: { impulse: 1 } }, 'tap_soft'],
  ['impact under the floor', { type: 'impact', value: 0.1 }, null],
  ['impact without a value', { type: 'impact' }, null],
  ['water entry', { type: 'enterMedium', value: 'water' }, 'splash'],
  ['waterEntry alias', { type: 'waterEntry' }, 'splash'],
  ['entering another medium', { type: 'enterMedium', value: 'space' }, null],
  ['dial', { type: 'dial', target: 'gravity', value: 'moon' }, 'tick'],
  ['variable', { type: 'variable', target: 'mass', value: 2 }, 'tock'],
  ['spell default', { type: 'spell', value: 'reverseGravity' }, 'chime_magic'],
  ['spell grow', { type: 'spell', value: 'grow' }, 'swoosh_up'],
  ['spell shrink', { type: 'spell', value: 'shrink' }, 'swoosh_down'],
  ['spell restore', { type: 'spell', value: 'restore' }, 'swoosh_down'],
  ['discovery rule', { type: 'rule', concept: 'gravity' }, 'star'],
  ['rule without a concept', { type: 'rule' }, null],
  ['challenge complete', { type: 'challengeComplete', target: 'c1' }, 'level_up'],
  ['tap', { type: 'tap', target: 'ball' }, 'tap'],
  ['flick', { type: 'flick', target: 'ball', value: { x: 3, y: -4 } }, 'whoosh'],
  ['launch', { type: 'launch', target: 'rocket' }, 'launch'],
  ['land', { type: 'land' }, 'land'],
  ['drag is silent', { type: 'drag', value: { x: 1, y: 1 } }, null],
  ['say is silent', { type: 'say', say: 'hello' }, null],
  ['applyImpulse bounce', { type: 'applyImpulse' }, 'boing'],
  ['remove', { type: 'remove' }, 'pop_soft'],
  ['scale up', { type: 'scaleEntity', value: { factor: 1.5 } }, 'swoosh_up'],
  ['scale down', { type: 'scaleEntity', value: { factor: 0.5 } }, 'swoosh_down'],
  ['setGravity', { type: 'setGravity', value: { y: -3 } }, 'swoosh_down'],
  ['setTimeScale', { type: 'setTimeScale', value: { value: 0.5 } }, 'chime'],
  ['setMaterial', { type: 'setMaterial' }, 'tock'],
  ['draw start', { type: 'drawStart' }, 'draw_start'],
  ['draw end', { type: 'drawEnd' }, 'draw_end'],
  ['unknown event', { type: 'teleport' }, null],
];

describe('cueForEvent', () => {
  it.each(table)('%s', (_name, event, expected) => {
    const hit = cueForEvent(event);
    if (expected === null) {
      expect(hit).toBeNull();
      return;
    }
    expect(hit?.name).toBe(expected);
    expect(hit!.gain).toBeGreaterThan(0);
    expect(hit!.gain).toBeLessThanOrEqual(1);
  });

  it('scales flick gain with speed', () => {
    const slow = cueForEvent({ type: 'flick', value: { x: 1, y: 0 } })!;
    const fast = cueForEvent({ type: 'flick', value: { x: 12, y: 0 } })!;
    expect(slow.gain).toBeLessThan(fast.gain);
    expect(fast.gain).toBeLessThanOrEqual(1);
  });

  it('scales spawn gain with count', () => {
    const one = cueForEvent({ type: 'spawn', value: { count: 1 } })!;
    const many = cueForEvent({ type: 'spawn', value: { count: 10 } })!;
    expect(one.gain).toBeLessThan(many.gain);
    expect(many.gain).toBeLessThanOrEqual(1);
  });

  it('follows the impact bands for gain', () => {
    expect(cueForEvent({ type: 'impact', value: 1 })!.gain).toBeLessThan(
      cueForEvent({ type: 'impact', value: 20 })!.gain,
    );
  });
});

function fakeMixer() {
  return { playCue: vi.fn() } as unknown as Mixer & { playCue: ReturnType<typeof vi.fn> };
}

describe('soundForEngineEvents', () => {
  it('plays the mapped cue with its gain and skips silent events', () => {
    const mixer = fakeMixer();
    const handle = soundForEngineEvents(mixer);
    handle({ type: 'tap', target: 'ball', time: 0 } as SoundEngineEvent);
    handle({ type: 'drag', value: { x: 0, y: 0 } });
    expect(mixer.playCue).toHaveBeenCalledTimes(1);
    expect(mixer.playCue).toHaveBeenCalledWith('tap', { gain: expect.any(Number) });
  });

  it('drops a repeat of the same cue inside the debounce window', () => {
    const mixer = fakeMixer();
    let now = 0;
    const handle = soundForEngineEvents(mixer, { now: () => now });
    handle({ type: 'launch' });
    handle({ type: 'launch', value: { action: 'launch', target: 'rocket' } });
    expect(mixer.playCue).toHaveBeenCalledTimes(1);
    handle({ type: 'tap' });
    expect(mixer.playCue).toHaveBeenCalledTimes(2);
    now = 100;
    handle({ type: 'launch' });
    expect(mixer.playCue).toHaveBeenCalledTimes(3);
  });

  it('is exposed as a hook that binds the handler to the given mixer', () => {
    const mixer = fakeMixer();
    let handler: ((event: SoundEngineEvent) => void) | undefined;
    function Probe() {
      handler = useSoundForEngineEvents(mixer);
      return null;
    }
    renderToString(createElement(Probe));
    expect(typeof handler).toBe('function');
    handler!({ type: 'dial', value: 'moon' });
    expect(mixer.playCue).toHaveBeenCalledWith('tick', { gain: expect.any(Number) });
  });
});

describe('getMixer', () => {
  it('returns one shared mixer until it is released', () => {
    const first = getMixer();
    expect(getMixer()).toBe(first);
    releaseMixer();
    const second = getMixer();
    expect(second).not.toBe(first);
    expect(() => {
      second.playCue('tap');
      second.setSpeaking(true);
    }).not.toThrow();
    releaseMixer();
  });
});
