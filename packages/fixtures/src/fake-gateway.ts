import { WebSocketServer, type WebSocket as WsSocket } from 'ws';
import { z } from 'zod';
import {
  AUDIO_OUT,
  CHARACTERS,
  GuideIdSchema,
  ClientMessageSchema,
  ServerMessageSchema,
  encodeMessage,
  type CharacterId,
  type ClientMessage,
  type ServerMessage,
} from '@just-imagine/protocol';
import { int16ToBytes, pcm16Tone, splitPcm16Frames } from './audio';
import jellyDragonScenario from '../scenarios/jelly-dragon.json' with { type: 'json' };
import { createFakeLearn } from './fake-learn';
import { isScriptedBuild, scriptedBuildId } from './scripted-build';

/** A scripted build reports queued, placeholders and ready this far apart. */
export const SCRIPTED_BUILD_STEP_MS = 300;

export const ScenarioSchema = z.object({
  onHello: z.array(ServerMessageSchema),
  onInteraction: z.array(ServerMessageSchema),
  onSwitchCharacter: z.array(ServerMessageSchema),
  timeline: z.array(
    z.object({ afterMs: z.number().int().min(0).max(2_147_483_647), message: ServerMessageSchema }),
  ),
  // Learning Worlds preview: the explorer's earlier points and the pause before a challenge.
  learn: z
    .object({
      startingPoints: z.number().int().min(0).default(0),
      quizDelayMs: z.number().int().min(0).max(60_000).default(900),
    })
    .default({ startingPoints: 0, quizDelayMs: 900 }),
});
export type Scenario = z.infer<typeof ScenarioSchema>;

export const SCENARIOS = { jellyDragon: ScenarioSchema.parse(jellyDragonScenario) } as const;

export interface FakeGateway {
  port: number;
  url: string;
  close(): Promise<void>;
  received: ClientMessage[];
}

export async function startFakeGateway(opts: {
  port: number;
  scenario: z.input<typeof ScenarioSchema>;
  tone?: boolean;
}): Promise<FakeGateway> {
  const scenario = ScenarioSchema.parse(opts.scenario);
  const port = z.number().int().min(0).max(65535).parse(opts.port);
  const wss = new WebSocketServer({ host: '127.0.0.1', port, maxPayload: 64 * 1024 });
  const received: ClientMessage[] = [];
  const cleanups = new Set<() => void>();
  const learn = createFakeLearn(scenario.learn);
  let builds = 0;

  wss.on('connection', (ws: WsSocket) => {
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const toneTimers = new Set<ReturnType<typeof setTimeout>>();
    let characterId: CharacterId | undefined;
    let worldId: string | undefined;
    let ended = false;
    let persona: ReturnType<ReturnType<typeof createFakeLearn>> | undefined;
    // Once a Learning World character holds the call, or the child's own wish is being built,
    // the canned world timeline stays quiet.
    let quietTimeline = false;
    const send = (message: ServerMessage): void => {
      if (ws.readyState === ws.OPEN) ws.send(encodeMessage(message));
    };
    const sendScenario = (message: ServerMessage): void => {
      if (message.type === 'characterState' && characterId) {
        send({ ...message, characterId });
      } else if (message.type === 'transcript' && message.role === 'character' && characterId) {
        send({
          ...message,
          text: message.text.replaceAll('{characterName}', CHARACTERS[characterId].displayName),
        });
      } else {
        send(message);
      }
    };
    const sendAll = (messages: ServerMessage[]): void => messages.forEach(sendScenario);
    const schedule = (callback: () => void, afterMs: number, tone = false): void => {
      const handle = setTimeout(() => {
        timers.delete(handle);
        toneTimers.delete(handle);
        if (!ended) callback();
      }, afterMs);
      timers.add(handle);
      if (tone) toneTimers.add(handle);
    };
    const cleanup = (): void => {
      timers.forEach(clearTimeout);
      timers.clear();
      toneTimers.clear();
      cleanups.delete(cleanup);
    };
    cleanups.add(cleanup);
    // The browser's fake world source serves Catch the Flies under any scripted build id.
    const build = (id: string): void => {
      quietTimeline = true;
      worldId = id;
      (['queued', 'placeholders', 'ready'] as const).forEach((status, step) =>
        schedule(
          () => send({ type: 'worldJob', jobId: `j_${id}`, worldId: id, status }),
          step * SCRIPTED_BUILD_STEP_MS,
        ),
      );
    };
    const malformed = (message = 'malformed client message'): void =>
      send({ type: 'error', code: 'INTERNAL', message });

    ws.on('message', (data, isBinary) => {
      // Synthetic server only: binary input is accepted and discarded immediately.
      if (isBinary || ended) return;
      let message: ClientMessage;
      try {
        message = ClientMessageSchema.parse(JSON.parse(data.toString()));
      } catch {
        malformed();
        return;
      }
      received.push(message);
      if (message.type === 'end') {
        send({ type: 'bye', reason: 'ended' });
        ended = true;
        cleanup();
        ws.close();
        return;
      }
      if (message.type === 'hello') {
        if (characterId) {
          malformed('hello was already received');
          return;
        }
        characterId = message.characterId;
        worldId = message.worldId;
        persona = learn(message.childId, send, (callback, afterMs) => schedule(callback, afterMs));
        send({ type: 'ready', sessionId: 's_fake', characterId, ...(worldId ? { worldId } : {}) });
        sendAll(scenario.onHello);
        if (opts.tone) {
          const bytes = int16ToBytes(
            pcm16Tone({ sampleRate: AUDIO_OUT.sampleRate, seconds: 1, frequency: 440 }),
          );
          splitPcm16Frames(bytes, AUDIO_OUT.samplesPerFrame).forEach((frame, index) => {
            schedule(
              () => {
                if (ws.readyState === ws.OPEN) ws.send(frame, { binary: true });
              },
              index * AUDIO_OUT.frameMs,
              true,
            );
          });
        }
        scenario.timeline.forEach((step) =>
          schedule(() => {
            if (!quietTimeline) sendScenario(step.message);
          }, step.afterMs),
        );
        return;
      }
      if (!characterId) {
        malformed('hello is required first');
        return;
      }
      if (message.type === 'interaction') sendAll(scenario.onInteraction);
      if (message.type === 'summonPersona') quietTimeline = true;
      if (message.type === 'summonPersona')
        persona?.summon(message.packId, message.characterId, characterId, 's_fake');
      if (message.type === 'hangUp') persona?.hangUp(characterId, 's_fake');
      if (message.type === 'text' && !persona?.answer(message.text)) {
        // A wish for a game is a new world; other words about a built world edit it in place.
        // A wish for a simpler game is built as a template fallback.
        if (/game/i.test(message.text))
          build(scriptedBuildId(++builds, /simpler/i.test(message.text) ? 'template' : undefined));
        else if (worldId && isScriptedBuild(worldId)) build(worldId);
      }
      if (message.type === 'switchCharacter') {
        toneTimers.forEach((handle) => {
          clearTimeout(handle);
          timers.delete(handle);
        });
        toneTimers.clear();
        characterId = message.characterId;
        const guide = GuideIdSchema.safeParse(characterId);
        if (guide.success) send({ type: 'summon', characterId: guide.data });
        send({ type: 'ready', sessionId: 's_fake', characterId, ...(worldId ? { worldId } : {}) });
        sendAll(scenario.onSwitchCharacter);
      }
    });
    ws.on('close', cleanup);
    ws.on('error', () => {
      cleanup();
      ws.terminate();
    });
  });

  return new Promise((resolve, reject) => {
    wss.once('error', reject);
    wss.once('listening', () => {
      const address = wss.address();
      if (!address || typeof address === 'string') {
        reject(new Error('missing TCP address'));
        return;
      }
      let closing: Promise<void> | undefined;
      resolve({
        port: address.port,
        url: `ws://127.0.0.1:${address.port}`,
        received,
        close: () => {
          closing ??= new Promise<void>((res, rej) => {
            for (const cleanup of cleanups) cleanup();
            for (const client of wss.clients) client.terminate();
            wss.close((error) => (error ? rej(error) : res()));
          });
          return closing;
        },
      });
    });
  });
}
