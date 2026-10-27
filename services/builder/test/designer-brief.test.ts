import { describe, it, expect } from 'vitest';
import { FIXTURE_WORLDS } from '@just-imagine/fixtures/browser';
import { SCRIPTED_INPUTS } from '@just-imagine/game-runtime';
import type { BuildWorldJob } from '@just-imagine/protocol';
import {
  DESIGNER_BRIEF,
  SMOKE_EXAM,
  HERO_RULE,
  TARGET_SIZE_RULE,
  closestExamples,
  feedbackLint,
} from '../src/designer-brief';
import { GAME_EXAMPLES } from '../src/game-examples';
import {
  GAME_SCENE_HINT,
  GAME_PROMPT_VERSION,
  gameScriptPrompt,
  retryFeedback,
} from '../src/game-prompt';
import { gameplayPlanPrompt } from '../src/game-playtest';
import { creationReviewPrompt } from '../src/creation-review';

const doc = structuredClone(FIXTURE_WORLDS.moonBounce);
const job = { description: 'catch flies', childRequest: 'catch flies' } as unknown as BuildWorldJob;

describe('designer brief', () => {
  it('states the smoke exam with the runtime constants', () => {
    expect(SMOKE_EXAM).toContain(`from second ${SCRIPTED_INPUTS.tapStart}`);
    expect(SMOKE_EXAM).toContain(`every ${SCRIPTED_INPUTS.tapInterval} s`);
    expect(SMOKE_EXAM).toContain('game.score or game.win');
  });
  it('numbers eight rules', () => {
    for (let i = 1; i <= 8; i++) expect(DESIGNER_BRIEF).toContain(`${i}. `);
    expect(TARGET_SIZE_RULE).toContain('0.6');
    expect(HERO_RULE).toContain('0.9');
  });
  it('picks the two examples whose wishes share the most words with the child wish', () => {
    expect(
      closestExamples('a frog that must catch flies before the owl wakes').map((e) => e.name)[0],
    ).toBe('catch-the-flies');
    expect(closestExamples('anything')).toHaveLength(2);
    expect(closestExamples('anything', 3)).toHaveLength(3);
  });
  it('lists input handlers that give the child no feedback', () => {
    expect(feedbackLint(`game.on('tap', e => { count++; });`)).toHaveLength(1);
    expect(feedbackLint(`game.on('tap', e => { game.sound('pop'); });`)).toHaveLength(0);
    expect(
      feedbackLint(`game.on('drag', e => { game.move(e.target.id, {x:e.x,y:e.y}); });`),
    ).toHaveLength(0);
    expect(feedbackLint(`game.on('flick', function (e) { n++; });`)).toHaveLength(1);
    expect(feedbackLint(`game.on('tap', e => game.say('hi'));`)).toHaveLength(0);
    expect(
      feedbackLint(`game.on('tap', e => { if (x) { n++; } }); game.on('tick', () => {});`),
    ).toHaveLength(1);
    expect(
      feedbackLint(`const s = "game.on('tap'"; game.on('tap', e => { hit(e); });`),
    ).toHaveLength(0);
  });
  it('puts the brief, the exam and two full examples in the script prompt, and the brief in the plan prompt', () => {
    const prompt = gameScriptPrompt({
      description: 'catch flies',
      doc,
      language: 'en',
      ageBand: '6-7',
    });
    expect(GAME_PROMPT_VERSION).toBe('game-v3');
    expect(prompt).toContain(DESIGNER_BRIEF);
    expect(prompt).toContain(SMOKE_EXAM);
    expect(prompt).toContain(GAME_EXAMPLES[0]!.source.slice(0, 40));
    const plan = gameplayPlanPrompt(doc, job);
    expect(plan).toContain(DESIGNER_BRIEF);
    expect(plan).toContain('is never the only effect of its trigger');
    expect(GAME_SCENE_HINT).toContain('0.6');
    expect(GAME_SCENE_HINT).toContain(HERO_RULE);
    expect(creationReviewPrompt(doc, job)).toContain(HERO_RULE);
    expect(creationReviewPrompt(doc, job)).toContain(TARGET_SIZE_RULE);
  });
  it('appends lint lines to the retry feedback', () => {
    expect(retryFeedback('why', 'src', ['line 3: tap handler gives no feedback'])).toContain(
      'line 3: tap handler gives no feedback',
    );
    expect(retryFeedback('why', 'src')).not.toContain('gives no feedback');
  });
});
