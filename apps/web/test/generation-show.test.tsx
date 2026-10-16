import { describe, it, expect } from 'vitest';
import {
  HEARD_MS,
  LATE_MS,
  LOOP_AFTER_MS,
  LOOP_LINE_MS,
  REVEAL_MS,
  loopLine,
  milestoneFor,
  showBeatFor,
  type Beat,
} from '../components/studio/GenerationShow';
import type { JobStatus } from '../components/studio/parts';

const STATUSES: JobStatus[] = ['queued', 'building', 'placeholders', 'hero', 'ready', 'failed'];

describe('showBeatFor: the five beats', () => {
  it('opens with the wish-heard beat for the first 400 ms after queued', () => {
    expect(HEARD_MS).toBe(400);
    expect(showBeatFor('queued', 0)).toBe('heard');
    expect(showBeatFor('queued', 399)).toBe('heard');
    expect(showBeatFor(undefined, 0)).toBe('heard');
  });
  it('starts painting the backdrop once the brush is out, even before the builder reports building', () => {
    expect(showBeatFor('queued', HEARD_MS)).toBe('backdrop');
    expect(showBeatFor('queued', 1500)).toBe('backdrop');
    expect(showBeatFor('building', 0)).toBe('backdrop');
    expect(showBeatFor('building', 3999)).toBe('backdrop');
  });
  it('maps placeholders to props and hero to hero', () => {
    expect(showBeatFor('placeholders', 0)).toBe('props');
    expect(showBeatFor('placeholders', 2000)).toBe('props');
    expect(showBeatFor('hero', 0)).toBe('hero');
    expect(showBeatFor('hero', 3999)).toBe('hero');
  });
  it('reveals for 1.8 s after ready, then idles in the loop', () => {
    expect(REVEAL_MS).toBe(1800);
    expect(showBeatFor('ready', 0)).toBe('reveal');
    expect(showBeatFor('ready', REVEAL_MS - 1)).toBe('reveal');
    expect(showBeatFor('ready', REVEAL_MS)).toBe('loop');
  });
  it('never apologises over a reveal, however late the world is', () => {
    expect(showBeatFor('ready', LATE_MS + 5000, 100)).toBe('reveal');
  });
});

describe('showBeatFor: the loop beat', () => {
  it('loops any beat that has gone 4 s without a new status', () => {
    expect(LOOP_AFTER_MS).toBe(4000);
    for (const job of ['queued', 'building', 'placeholders', 'hero'] as const) {
      expect(showBeatFor(job, LOOP_AFTER_MS - 1)).not.toBe('loop');
      expect(showBeatFor(job, LOOP_AFTER_MS)).toBe('loop');
    }
  });
  it('measures staleness from the last status, not from the start of the show', () => {
    expect(showBeatFor('placeholders', 9000, 500)).toBe('props');
    expect(showBeatFor('hero', 12000, 4000)).toBe('loop');
  });
  it('alternates the two ambient lines every few seconds once looping', () => {
    expect(loopLine(0)).toBe(0);
    expect(loopLine(LOOP_AFTER_MS)).toBe(0);
    expect(loopLine(LOOP_AFTER_MS + LOOP_LINE_MS - 1)).toBe(0);
    expect(loopLine(LOOP_AFTER_MS + LOOP_LINE_MS)).toBe(1);
    expect(loopLine(LOOP_AFTER_MS + 2 * LOOP_LINE_MS)).toBe(0);
    expect(loopLine(LOOP_AFTER_MS + 3 * LOOP_LINE_MS)).toBe(1);
  });
  it('keeps every loop line shorter than the two-second static ceiling, counting the ambient motion', () => {
    expect(LOOP_LINE_MS).toBeLessThanOrEqual(4000);
    expect(LOOP_LINE_MS).toBeGreaterThan(0);
  });
});

describe('showBeatFor: the late fallback', () => {
  it('apologises and offers a world after 25 s without a reveal', () => {
    expect(LATE_MS).toBe(25000);
    for (const job of ['queued', 'building', 'placeholders', 'hero', undefined] as const) {
      expect(showBeatFor(job, LATE_MS - 1, 100)).not.toBe('late');
      expect(showBeatFor(job, LATE_MS, 100)).toBe('late');
    }
  });
  it('still apologises when the document never arrives after ready', () => {
    expect(showBeatFor('ready', LATE_MS - 1, REVEAL_MS)).toBe('loop');
    expect(showBeatFor('ready', LATE_MS, REVEAL_MS)).toBe('late');
  });
  it('treats a failed job as late straight away', () => {
    expect(showBeatFor('failed', 0)).toBe('late');
    expect(showBeatFor('failed', 100, 100)).toBe('late');
  });
  it('wins over the loop beat', () => {
    expect(showBeatFor('building', LATE_MS, LATE_MS)).toBe('late');
  });
  it('clamps a skewed clock to the opening beat rather than throwing', () => {
    expect(showBeatFor('queued', -500)).toBe('heard');
    expect(showBeatFor('building', -1, -1)).toBe('backdrop');
  });
});

describe('showBeatFor: exhaustiveness', () => {
  it('returns a known beat for every status at every phase', () => {
    const beats = new Set<Beat>(['heard', 'backdrop', 'props', 'hero', 'reveal', 'loop', 'late']);
    for (const job of [...STATUSES, undefined]) {
      for (const t of [0, HEARD_MS, 1000, LOOP_AFTER_MS, 10000, LATE_MS, 60000]) {
        expect(beats.has(showBeatFor(job, t))).toBe(true);
        expect(beats.has(showBeatFor(job, t, 0))).toBe(true);
      }
    }
  });
});

describe('milestoneFor: what has been painted so far', () => {
  it('accumulates the canvas layers in builder order', () => {
    expect(milestoneFor('queued', 0)).toBe(0);
    expect(milestoneFor('queued', HEARD_MS)).toBe(1);
    expect(milestoneFor('building', 0)).toBe(1);
    expect(milestoneFor('placeholders', 0)).toBe(2);
    expect(milestoneFor('hero', 0)).toBe(3);
    expect(milestoneFor('ready', 0)).toBe(4);
  });
  it('keeps the painted layers while looping or late rather than wiping the canvas', () => {
    expect(milestoneFor('hero', LOOP_AFTER_MS)).toBe(3);
    expect(milestoneFor('placeholders', LATE_MS)).toBe(2);
  });
  it('paints nothing for a failed job or before the first status', () => {
    expect(milestoneFor('failed', 0)).toBe(0);
    expect(milestoneFor(undefined, 0)).toBe(0);
    expect(milestoneFor(undefined, 5000)).toBe(0);
  });
});
