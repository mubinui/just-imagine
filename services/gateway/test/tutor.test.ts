import { expect, it, vi } from 'vitest';
import { once } from 'node:events';
import { WebSocketServer, WebSocket } from 'ws';
import { TutorSession } from '../src/tutor/session';
import { tutorInstruction } from '../src/tutor/context';
import { tutorDate, lessonVisible } from '../src/tutor/store';
import type { TutorRecord, TutorStore, TutorProvider } from '../src/tutor/contracts';
import type { LiveCallbacks } from '../src/contracts';

const record: TutorRecord = {
  id: 's_tutor',
  token: 'student-token',
  uid: 'student',
  schoolId: 'school',
  studentId: 'student',
  classId: 'class',
  lessonId: 'lesson',
  language: 'bn',
  stepIndex: 0,
  characterId: 'pori',
  startedAt: Date.now(),
  remaining: 60,
  lesson: {
    scope: 'class',
    schoolId: 'school',
    classIds: ['class'],
    subject: 'physics',
    grade: 9,
    chapterId: 'physics-3',
    title: { en: 'Force', bn: 'বল' },
    steps: [
      {
        kind: 'explore',
        simId: 'newton-cart',
        params: { mass: 1, force: 5, muS: 0.2, muK: 0.1 },
        lockedParams: ['mass'],
        prompts: [],
      },
    ],
    status: 'published',
    approved: { en: true, bn: true },
    sourceLanguage: 'bn',
    authorUid: 'teacher',
    revision: 1,
    updatedAt: 1,
  },
};
async function harness(remaining = 60, stateIntervalMs?: number) {
  let callbacks: LiveCallbacks | undefined;
  const store: TutorStore = {
    authorize: vi.fn(async () => ({
      ...record,
      startedAt: Date.now(),
      lesson: structuredClone(record.lesson),
    })),
    meter: vi.fn(async () => remaining),
    hint: vi.fn(async () => 'Teacher hint'),
    result: vi.fn(async () => ({ correct: false })),
  };
  const live = {
    audio: vi.fn(),
    text: vi.fn(),
    context: vi.fn(),
    toolResult: vi.fn(),
    close: vi.fn(),
  };
  const provider: TutorProvider = {
    open: vi.fn(async (_r, cb) => {
      callbacks = cb;
      return live;
    }),
    moderate: vi.fn(async () => 'safe' as const),
  };
  const server = new WebSocketServer({ port: 0, host: '127.0.0.1' });
  let session: TutorSession | undefined;
  server.on('connection', (socket) => {
    session = new TutorSession(socket, { store, provider, meterIntervalMs: 20, stateIntervalMs });
    socket.on('message', (data, binary) => session!.input(data, binary));
    socket.on('close', () => {
      void session!.close();
    });
    void session.start({
      type: 'tutorHello',
      idToken: 'student-token',
      lessonId: 'lesson',
      stepIndex: 0,
    });
  });
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('port');
  const socket = new WebSocket(`ws://127.0.0.1:${address.port}`);
  const messages: unknown[] = [],
    binaries: Buffer[] = [];
  socket.on('message', (data, binary) => {
    if (!binary) messages.push(JSON.parse(data.toString()));
    else binaries.push(Buffer.from(data as Buffer));
  });
  await once(socket, 'open');
  await vi.waitFor(() =>
    expect(
      messages.some((message) => ['ready', 'bye'].includes((message as { type: string }).type)),
    ).toBe(true),
  );
  return {
    store,
    provider,
    live,
    socket,
    messages,
    binaries,
    callbacks: () => callbacks!,
    async close() {
      await session?.close();
      socket.terminate();
      for (const client of server.clients) client.terminate();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}
it('offers safe editable suggestions without applying them and refuses locked controls', async () => {
  const h = await harness();
  try {
    h.callbacks().tool('locked', 'suggest_param', { paramId: 'mass', value: 4 });
    h.callbacks().tool('range', 'suggest_param', { paramId: 'force', value: 600 });
    h.callbacks().tool('safe', 'suggest_param', { paramId: 'force', value: 10 });
    await vi.waitFor(() => expect(h.live.toolResult).toHaveBeenCalledTimes(3));
    expect(h.messages.filter((m) => (m as { type: string }).type === 'tutorAction')).toEqual([
      { type: 'tutorAction', kind: 'suggestParam', paramId: 'force', value: 10 },
    ]);
    expect(h.live.toolResult).toHaveBeenCalledWith('safe', 'suggest_param', {
      offered: true,
      applied: false,
    });
  } finally {
    await h.close();
  }
});
it('throttles context, refuses other sims and drops model input after hangup', async () => {
  const h = await harness();
  try {
    for (const simId of ['newton-cart', 'newton-cart', 'linear-graph'])
      h.socket.send(JSON.stringify({ type: 'tutorState', simId, observable: { x: 1 } }));
    await vi.waitFor(() => expect(h.live.context).toHaveBeenCalledOnce());
    h.socket.send(JSON.stringify({ type: 'hangUp' }));
    await vi.waitFor(() => expect(h.live.close).toHaveBeenCalledOnce());
    h.callbacks().transcript('character', 'Must not leak after close', true);
    expect(h.messages).not.toContainEqual(
      expect.objectContaining({ text: 'Must not leak after close' }),
    );
  } finally {
    await h.close();
  }
});
it('always delivers the newest screen state, even when it changes inside the throttle window', async () => {
  const h = await harness(60, 100);
  try {
    for (const force of [5, 9, 12])
      h.socket.send(
        JSON.stringify({ type: 'tutorState', simId: 'newton-cart', observable: { force } }),
      );
    await vi.waitFor(() => expect(h.live.context).toHaveBeenCalledTimes(2));
    expect(h.live.context.mock.calls[0]![0]).toContain('"force":5');
    expect(h.live.context.mock.calls[1]![0]).toContain('"force":12');
  } finally {
    await h.close();
  }
});
it('tells the tutor what is on screen right before a typed question', async () => {
  const h = await harness(60, 60000);
  try {
    h.socket.send(
      JSON.stringify({ type: 'tutorState', simId: 'newton-cart', observable: { force: 5 } }),
    );
    await vi.waitFor(() => expect(h.live.context).toHaveBeenCalledOnce());
    h.socket.send(
      JSON.stringify({ type: 'tutorState', simId: 'newton-cart', observable: { force: 12 } }),
    );
    h.socket.send(JSON.stringify({ type: 'text', text: 'Why did it speed up?' }));
    await vi.waitFor(() => expect(h.live.text).toHaveBeenCalledOnce());
    expect(h.live.context).toHaveBeenCalledTimes(2);
    expect(h.live.context.mock.calls[1]![0]).toContain('"force":12');
    expect(h.live.context.mock.invocationCallOrder[1]!).toBeLessThan(
      h.live.text.mock.invocationCallOrder[0]!,
    );
  } finally {
    await h.close();
  }
});
it('stops and closes the provider when school quota reaches zero', async () => {
  const h = await harness(0);
  try {
    await vi.waitFor(() => expect(h.messages).toContainEqual({ type: 'bye', reason: 'quota' }));
    expect(h.live.close).toHaveBeenCalledOnce();
  } finally {
    await h.close();
  }
});
it('checks quota independently while text moderation is stalled', async () => {
  const h = await harness();
  let finish!: (verdict: 'safe') => void;
  vi.mocked(h.provider.moderate).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  try {
    h.socket.send(JSON.stringify({ type: 'text', text: 'Explain force.' }));
    await vi.waitFor(() => expect(h.provider.moderate).toHaveBeenCalled());
    vi.mocked(h.store.meter).mockResolvedValue(0);
    await vi.waitFor(() => expect(h.messages).toContainEqual({ type: 'bye', reason: 'quota' }));
    expect(h.live.text).not.toHaveBeenCalled();
    expect(h.live.close).toHaveBeenCalledOnce();
  } finally {
    finish?.('safe');
    await h.close();
  }
});
it('buffers audio while a security check is pending and never overlaps meter calls', async () => {
  const h = await harness();
  let finish!: (remaining: number) => void,
    checking = 0,
    maxChecking = 0;
  vi.mocked(h.store.meter).mockImplementation(() => {
    checking++;
    maxChecking = Math.max(maxChecking, checking);
    return new Promise<number>((resolve) => {
      finish = (remaining) => {
        checking--;
        resolve(remaining);
      };
    });
  });
  try {
    await vi.waitFor(() => expect(checking).toBe(1));
    h.socket.send(Buffer.alloc(640));
    h.callbacks().audio(Buffer.alloc(960));
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(h.live.audio).not.toHaveBeenCalled();
    expect(h.binaries).toHaveLength(0);
    expect(maxChecking).toBe(1);
    vi.mocked(h.store.meter).mockResolvedValue(60);
    finish(60);
    await vi.waitFor(() => expect(h.live.audio).toHaveBeenCalledOnce());
    await vi.waitFor(() => expect(h.binaries).toHaveLength(1));
  } finally {
    finish?.(60);
    await h.close();
  }
});
it('uses Dhaka midnight, live class visibility and a public lesson-only prompt', () => {
  expect(tutorDate(Date.parse('2026-10-17T17:59:59Z'))).toBe('20261017');
  expect(tutorDate(Date.parse('2026-10-17T18:00:00Z'))).toBe('20261018');
  expect(lessonVisible(record.lesson, { schoolId: 'school', classId: 'other' })).toBe(false);
  const prompt = tutorInstruction(record);
  expect(prompt).toContain('natural Bangla');
  expect(prompt).toContain('student must tap Try it');
  expect(prompt).toContain("The student's screen right now");
  expect(prompt).toContain('no LaTeX');
  expect(prompt).not.toContain('pinHash');
  expect(prompt).not.toContain('firstCorrectAt');
});
