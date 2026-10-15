import { describe, it, expect } from 'vitest';
import {
  AUDIO_IN,
  AUDIO_OUT,
  ClientMessageSchema,
  ServerMessageSchema,
  encodeMessage,
  parseClientMessage,
  parseServerMessage,
  type ClientMessage,
  type ServerMessage,
} from '../src/ws';

const clientMessages: ClientMessage[] = [
  { type: 'hello', idToken: 't', childId: 'c1', characterId: 'bhombol' },
  {
    type: 'hello',
    idToken: 't',
    childId: 'c1',
    characterId: 'mishti',
    worldId: 'w1',
    sessionId: 's1',
  },
  { type: 'text', text: 'make a jelly dragon' },
  { type: 'interaction', kind: 'flick', entityId: 'dragon', entityName: 'jelly dragon' },
  { type: 'interaction', kind: 'dial', dial: 'gravity', value: 'moon' },
  { type: 'simEvent', ruleId: 'r1', concept: 'bounce', say: 'Boing!' },
  { type: 'predictionAnswer', answerIndex: 1 },
  { type: 'switchCharacter', characterId: 'chandni' },
  { type: 'variable', name: 'launch_speed', value: 12.5 },
  { type: 'challengeResult', challengeId: 'ch_cup', completed: true },
  { type: 'end' },
];

const serverMessages: ServerMessage[] = [
  { type: 'ready', sessionId: 's1', characterId: 'bhombol' },
  { type: 'interrupted' },
  { type: 'transcript', role: 'child', text: 'a dragon', final: true },
  { type: 'characterState', characterId: 'bhombol', emotion: 'thinking', speaking: false },
  { type: 'worldJob', jobId: 'j1', worldId: 'w1', status: 'placeholders' },
  { type: 'prediction', question: 'Bounce or splat?', options: ['bounce', 'splat'] },
  {
    type: 'discovery',
    concept: 'bounce',
    title: 'Boing!',
    kidExplanation: 'Squishy things spring back.',
    realLifeNote: 'Rubber balls bounce because they squish and spring back.',
  },
  { type: 'dial', dial: 'gravity', value: 'moon' },
  { type: 'summon', characterId: 'pori' },
  { type: 'spell', spell: 'reverseGravity' },
  { type: 'spell', spell: 'grow', target: 'hero' },
  { type: 'variable', name: 'launch_speed', value: 12.5 },
  { type: 'challenge', challengeId: 'ch_cup' },
  { type: 'quota', voiceSecondsLeft: 120 },
  { type: 'error', code: 'SESSION_ACTIVE_ELSEWHERE', message: 'already playing on another device' },
  { type: 'bye', reason: 'target_reached' },
];

describe('WebSocket protocol', () => {
  it('round-trips every client message', () => {
    for (const m of clientMessages) expect(parseClientMessage(encodeMessage(m))).toEqual(m);
  });
  it('round-trips every server message', () => {
    for (const m of serverMessages) expect(parseServerMessage(encodeMessage(m))).toEqual(m);
  });
  it('rejects unknown message types and malformed JSON', () => {
    expect(ClientMessageSchema.safeParse({ type: 'nope' }).success).toBe(false);
    expect(ServerMessageSchema.safeParse({ type: 'audio' }).success).toBe(false);
    expect(() => parseClientMessage('{not json')).toThrow();
  });
  it('fixes the audio frame sizes from the spec', () => {
    expect(AUDIO_IN).toEqual({
      sampleRate: 16000,
      channels: 1,
      frameMs: 20,
      samplesPerFrame: 320,
      mimeType: 'audio/pcm;rate=16000',
    });
    expect(AUDIO_OUT).toEqual({
      sampleRate: 24000,
      channels: 1,
      frameMs: 20,
      samplesPerFrame: 480,
      mimeType: 'audio/pcm;rate=24000',
    });
  });
});
