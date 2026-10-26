import { describe, it, expect, afterEach } from 'vitest';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { encodeMessage, parseServerMessage, type ServerMessage } from '@just-imagine/protocol';
import { startFakeGateway, SCENARIOS, type FakeGateway } from '../src/fake-gateway';
import { isScriptedBuild } from '../src/scripted-build';

let gateway: FakeGateway | undefined;
afterEach(async () => {
  await gateway?.close();
  gateway = undefined;
});

interface Inbox {
  queued: ServerMessage[];
  waiting: Array<(message: ServerMessage) => void>;
}
const inboxes = new WeakMap<WebSocket, Inbox>();

function connect(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.binaryType = 'arraybuffer';
    const inbox: Inbox = { queued: [], waiting: [] };
    inboxes.set(ws, inbox);
    ws.addEventListener('message', (event: MessageEvent) => {
      if (typeof event.data !== 'string') return;
      const message = parseServerMessage(event.data);
      const reader = inbox.waiting.shift();
      if (reader) reader(message);
      else inbox.queued.push(message);
    });
    ws.onopen = () => resolve(ws);
    ws.onerror = () => reject(new Error('connect failed'));
  });
}

async function nextJson(ws: WebSocket, type?: ServerMessage['type']): Promise<ServerMessage> {
  const inbox = inboxes.get(ws)!;
  while (true) {
    const message =
      inbox.queued.shift() ??
      (await new Promise<ServerMessage>((resolve) => inbox.waiting.push(resolve)));
    if (!type || message.type === type) return message;
  }
}

describe('fake gateway', () => {
  it('answers hello with ready and the scenario greeting, and records what it received', async () => {
    gateway = await startFakeGateway({ port: 0, scenario: SCENARIOS.jellyDragon });
    const ws = await connect(gateway.url);
    const first = nextJson(ws);
    ws.send(
      encodeMessage({
        type: 'hello',
        idToken: 't',
        childId: 'c1',
        characterId: 'bhombol',
        worldId: 'w_fixture_jelly_dragon',
      }),
    );
    expect(await first).toEqual({
      type: 'ready',
      sessionId: 's_fake',
      characterId: 'bhombol',
      worldId: 'w_fixture_jelly_dragon',
    });
    expect(await nextJson(ws)).toMatchObject({ type: 'characterState', emotion: 'happy' });
    expect(gateway.received[0]).toMatchObject({ type: 'hello', childId: 'c1' });
    ws.close();
  });

  it('streams a one-second 24 kHz tone as 50 binary frames when tone is on', async () => {
    gateway = await startFakeGateway({ port: 0, scenario: SCENARIOS.jellyDragon, tone: true });
    const ws = await connect(gateway.url);
    const frames: ArrayBuffer[] = [];
    const done = new Promise<void>((resolve) => {
      ws.addEventListener('message', (ev: MessageEvent) => {
        if (ev.data instanceof ArrayBuffer) {
          frames.push(ev.data);
          if (frames.length === 50) resolve();
        }
      });
    });
    ws.send(encodeMessage({ type: 'hello', idToken: 't', childId: 'c1', characterId: 'mishti' }));
    await done;
    expect(frames.every((f) => f.byteLength === 960)).toBe(true);
    ws.close();
  });

  it('replies bye and closes on end', async () => {
    gateway = await startFakeGateway({ port: 0, scenario: SCENARIOS.jellyDragon });
    const ws = await connect(gateway.url);
    ws.send(encodeMessage({ type: 'hello', idToken: 't', childId: 'c1', characterId: 'chandni' }));
    await nextJson(ws);
    const closed = new Promise<void>((resolve) => ws.addEventListener('close', () => resolve()));
    const bye = nextJson(ws, 'bye');
    ws.send(encodeMessage({ type: 'end' }));
    expect(await bye).toEqual({ type: 'bye', reason: 'ended' });
    await closed;
  });

  it('returns a protocol error for malformed JSON and stays connected', async () => {
    gateway = await startFakeGateway({ port: 0, scenario: SCENARIOS.jellyDragon });
    const ws = await connect(gateway.url);
    ws.send('{not json');
    expect(await nextJson(ws)).toMatchObject({ type: 'error', code: 'INTERNAL' });
    ws.send(JSON.stringify({ type: 'audio' }));
    expect(await nextJson(ws)).toMatchObject({ type: 'error', code: 'INTERNAL' });
    ws.send(encodeMessage({ type: 'hello', idToken: 't', childId: 'c1', characterId: 'bhombol' }));
    expect(await nextJson(ws)).toMatchObject({ type: 'ready' });
    expect(gateway.received).toHaveLength(1);
    ws.close();
  });

  it('requires hello before interactions and accepts only one hello per connection', async () => {
    const scenario = { ...SCENARIOS.jellyDragon, onHello: [], timeline: [] };
    gateway = await startFakeGateway({ port: 0, scenario });
    const ws = await connect(gateway.url);
    ws.send(encodeMessage({ type: 'interaction', kind: 'tap', entityId: 'dragon' }));
    expect(await nextJson(ws)).toMatchObject({ type: 'error', code: 'INTERNAL' });
    const hello = {
      type: 'hello' as const,
      idToken: 't',
      childId: 'c1',
      characterId: 'bhombol' as const,
    };
    ws.send(encodeMessage(hello));
    expect(await nextJson(ws)).toMatchObject({ type: 'ready' });
    ws.send(encodeMessage(hello));
    expect(await nextJson(ws)).toMatchObject({ type: 'error', code: 'INTERNAL' });
    ws.close();
  });

  it('uses the requested character for speaking states and the greeting', async () => {
    gateway = await startFakeGateway({ port: 0, scenario: SCENARIOS.jellyDragon });
    const ws = await connect(gateway.url);
    ws.send(encodeMessage({ type: 'hello', idToken: 't', childId: 'c1', characterId: 'mishti' }));
    expect(await nextJson(ws)).toMatchObject({ type: 'ready', characterId: 'mishti' });
    expect(await nextJson(ws)).toMatchObject({ type: 'characterState', characterId: 'mishti' });
    expect(await nextJson(ws)).toMatchObject({
      type: 'transcript',
      text: expect.stringContaining('Mishti'),
    });
    ws.close();
  });

  it('handles interactions, guide handoffs, timeline messages, and drops child audio', async () => {
    const scenario = {
      onHello: [],
      onInteraction: [
        { type: 'transcript' as const, role: 'character' as const, text: 'Boing!', final: true },
      ],
      onSwitchCharacter: [],
      timeline: [{ afterMs: 40, message: { type: 'quota' as const, voiceSecondsLeft: 120 } }],
    };
    gateway = await startFakeGateway({ port: 0, scenario });
    const ws = await connect(gateway.url);
    ws.send(encodeMessage({ type: 'hello', idToken: 't', childId: 'c1', characterId: 'bhombol' }));
    expect(await nextJson(ws)).toMatchObject({ type: 'ready' });
    ws.send(new Uint8Array(640));
    ws.send(encodeMessage({ type: 'interaction', kind: 'flick', entityId: 'dragon' }));
    expect(await nextJson(ws, 'transcript')).toMatchObject({ text: 'Boing!' });
    ws.send(encodeMessage({ type: 'switchCharacter', characterId: 'pori' }));
    expect(await nextJson(ws, 'summon')).toEqual({ type: 'summon', characterId: 'pori' });
    expect(await nextJson(ws)).toMatchObject({ type: 'ready', characterId: 'pori' });
    expect(await nextJson(ws, 'quota')).toMatchObject({ voiceSecondsLeft: 120 });
    expect(gateway.received.map((message) => message.type)).toEqual([
      'hello',
      'interaction',
      'switchCharacter',
    ]);
    ws.close();
  });

  it('builds Catch the Flies under a new world id when the wish asks for a game', async () => {
    gateway = await startFakeGateway({ port: 0, scenario: SCENARIOS.jellyDragon });
    const ws = await connect(gateway.url);
    ws.send(encodeMessage({ type: 'hello', idToken: 't', childId: 'c1', characterId: 'bhombol' }));
    await nextJson(ws, 'ready');
    const wished = Date.now();
    ws.send(encodeMessage({ type: 'text', text: 'a game where a frog catches flies' }));
    const jobs: { message: ServerMessage; at: number }[] = [];
    for (let i = 0; i < 3; i++)
      jobs.push({ message: await nextJson(ws, 'worldJob'), at: Date.now() });
    const worldId = (jobs[0]!.message as Extract<ServerMessage, { type: 'worldJob' }>).worldId;
    expect(isScriptedBuild(worldId)).toBe(true);
    expect(jobs.map((job) => job.message)).toEqual(
      (['queued', 'placeholders', 'ready'] as const).map((status) => ({
        type: 'worldJob',
        jobId: `j_${worldId}`,
        worldId,
        status,
      })),
    );
    expect(jobs[0]!.at - wished).toBeLessThan(200);
    expect(jobs[1]!.at - jobs[0]!.at).toBeGreaterThanOrEqual(250);
    expect(jobs[2]!.at - jobs[1]!.at).toBeGreaterThanOrEqual(250);
    // The next wish for a game is a new world.
    ws.send(encodeMessage({ type: 'text', text: 'another GAME please' }));
    const next = await nextJson(ws, 'worldJob');
    expect(next).toMatchObject({ status: 'queued' });
    expect((next as { worldId: string }).worldId).not.toBe(worldId);
    ws.close();
  });

  it('edits a scripted world in place and builds nothing for other words', async () => {
    gateway = await startFakeGateway({ port: 0, scenario: SCENARIOS.jellyDragon });
    const built = await connect(gateway.url);
    built.send(
      encodeMessage({ type: 'hello', idToken: 't', childId: 'c1', characterId: 'bhombol' }),
    );
    await nextJson(built, 'ready');
    built.send(encodeMessage({ type: 'text', text: 'a game with flies' }));
    const worldId = (await nextJson(built, 'worldJob')) as { worldId: string };
    built.close();

    const editing = await connect(gateway.url);
    editing.send(
      encodeMessage({
        type: 'hello',
        idToken: 't',
        childId: 'c1',
        characterId: 'bhombol',
        worldId: worldId.worldId,
      }),
    );
    await nextJson(editing, 'ready');
    editing.send(encodeMessage({ type: 'text', text: 'make the flies faster' }));
    const statuses = [];
    for (let i = 0; i < 3; i++) statuses.push(await nextJson(editing, 'worldJob'));
    expect(statuses).toMatchObject(
      ['queued', 'placeholders', 'ready'].map((status) => ({ worldId: worldId.worldId, status })),
    );
    editing.close();

    const plain = await connect(gateway.url);
    plain.send(
      encodeMessage({
        type: 'hello',
        idToken: 't',
        childId: 'c1',
        characterId: 'bhombol',
        worldId: 'w_fixture_jelly_dragon',
      }),
    );
    await nextJson(plain, 'ready');
    plain.send(encodeMessage({ type: 'text', text: 'make the dragon purple' }));
    await new Promise((resolve) => setTimeout(resolve, 700));
    expect(inboxes.get(plain)!.queued.filter((message) => message.type === 'worldJob')).toEqual([]);
    plain.close();
  });

  it('rejects startup when the requested port is already in use', async () => {
    gateway = await startFakeGateway({ port: 0, scenario: SCENARIOS.jellyDragon });
    await expect(
      startFakeGateway({ port: gateway.port, scenario: SCENARIOS.jellyDragon }),
    ).rejects.toMatchObject({ code: 'EADDRINUSE' });
  });

  it('starts the actual CLI, accepts hello, and shuts down cleanly on SIGTERM', async () => {
    const child = spawn(
      process.execPath,
      [
        '--import',
        createRequire(import.meta.url).resolve('tsx'),
        fileURLToPath(new URL('../bin/fake-gateway.ts', import.meta.url)),
      ],
      { env: { ...process.env, PORT: '0', TONE: '0' }, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    const exited = once(child, 'exit');
    let stderr = '';
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    try {
      const stdout = await new Promise<string>((resolve, reject) => {
        child.stdout.once('data', (chunk: Buffer) => resolve(chunk.toString()));
        child.once('error', reject);
        child.once('exit', () => reject(new Error(`CLI exited before listening: ${stderr}`)));
      });
      const url = stdout.match(/ws:\/\/127\.0\.0\.1:\d+/)?.[0];
      expect(url).toBeDefined();
      const ws = await connect(url!);
      ws.send(
        encodeMessage({
          type: 'hello',
          idToken: 'fake-token',
          childId: 'c1',
          characterId: 'bhombol',
        }),
      );
      expect(await nextJson(ws)).toMatchObject({ type: 'ready' });
      child.kill('SIGTERM');
      const [code] = await exited;
      expect(code, stderr).toBe(0);
      ws.close();
    } finally {
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    }
  });
});
