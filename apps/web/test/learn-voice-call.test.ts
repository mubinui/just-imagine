import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChildResponse, ServerMessage } from '@just-imagine/protocol';

// This node harness executes the real hook, preserves ref/state slots between renders,
// and runs effect setup/cleanup. It controls transport timing, not React's scheduler or audio.
const hooks = vi.hoisted(() => {
  type Slot =
    | { kind: 'state'; value: unknown }
    | { kind: 'ref'; value: { current: unknown } }
    | { kind: 'effect'; dependencies?: readonly unknown[]; cleanup?: () => void };
  let slots: Slot[] = [];
  let cursor = 0;
  let effects: (() => void)[] = [];
  return {
    reset() {
      slots = [];
      cursor = 0;
      effects = [];
    },
    begin() {
      cursor = 0;
    },
    flush() {
      const pending = effects;
      effects = [];
      pending.forEach((run) => run());
    },
    unmount() {
      for (const slot of slots) if (slot.kind === 'effect') slot.cleanup?.();
      slots = [];
      effects = [];
    },
    state(initial?: unknown) {
      const index = cursor++;
      let slot = slots[index];
      if (!slot)
        slots[index] = slot = {
          kind: 'state',
          value: typeof initial === 'function' ? (initial as () => unknown)() : initial,
        };
      if (slot.kind !== 'state') throw new Error('Hook state order changed.');
      const state = slot;
      return [
        state.value,
        (next: unknown) => {
          state.value =
            typeof next === 'function' ? (next as (old: unknown) => unknown)(state.value) : next;
        },
      ];
    },
    ref(initial: unknown) {
      const index = cursor++;
      let slot = slots[index];
      if (!slot) slots[index] = slot = { kind: 'ref', value: { current: initial } };
      if (slot.kind !== 'ref') throw new Error('Hook ref order changed.');
      return slot.value;
    },
    effect(setup: () => void | (() => void), dependencies?: readonly unknown[]) {
      const index = cursor++;
      const old = slots[index];
      if (old && old.kind !== 'effect') throw new Error('Hook effect order changed.');
      if (
        !old ||
        !dependencies ||
        !old.dependencies ||
        dependencies.length !== old.dependencies.length ||
        dependencies.some((value, i) => !Object.is(value, old.dependencies![i]))
      ) {
        const slot: Extract<Slot, { kind: 'effect' }> = { kind: 'effect', dependencies };
        slots[index] = slot;
        effects.push(() => {
          old?.cleanup?.();
          slot.cleanup = setup() || undefined;
        });
      }
    },
  };
});
const transport = vi.hoisted(() => ({ ensure: vi.fn(), stop: vi.fn(), get: vi.fn() }));
vi.mock('react', () => ({ useState: hooks.state, useRef: hooks.ref, useEffect: hooks.effect }));
vi.mock('../lib/voice', () => ({
  ensureChildVoice: transport.ensure,
  stopChildVoice: transport.stop,
  getVoice: transport.get,
}));
vi.mock('../lib/i18n/ui', () => ({
  uiError: (value: unknown) => (value instanceof Error ? value.message : String(value)),
}));
import { useLearnVoice, type LearnVoiceEvents } from '../components/learn/useLearnVoice';

type Status = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'closed' | 'error';
const messages = new Set<(message: ServerMessage) => void>();
const statuses = new Set<(status: Status) => void>();
const child = { id: 'c_call', ageBand: '8-10' } as ChildResponse;
const voice = {
  status: 'idle' as Status,
  session: undefined as { childId: string } | undefined,
  audio: { unlocked: true },
  send: vi.fn(),
  unlockAudio: vi.fn(),
  connect: vi.fn(),
  end: vi.fn(),
  subscribe: (listener: (message: ServerMessage) => void) => {
    messages.add(listener);
    return () => messages.delete(listener);
  },
  subscribeStatus: (listener: (status: Status) => void) => {
    statuses.add(listener);
    return () => statuses.delete(listener);
  },
};
function status(next: Status) {
  voice.status = next;
  for (const listener of statuses) listener(next);
}
function message(value: ServerMessage) {
  for (const listener of messages) listener(value);
}
function ready() {
  status('connected');
  message({ type: 'ready' } as ServerMessage);
}
function persona(characterId: string, packId = characterId === 'tooth' ? 'hygiene' : 'space') {
  message({ type: 'persona', packId, characterId, name: characterId });
}
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: Error) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}
async function settle() {
  for (let i = 0; i < 8; i++) await Promise.resolve();
}
function mount(events: LearnVoiceEvents = {}) {
  const useRender = () => {
    hooks.begin();
    const result = useLearnVoice(child, events);
    hooks.flush();
    return result;
  };
  return { render: useRender, unmount: hooks.unmount };
}
function connectedCompanion() {
  voice.session = { childId: child.id };
  voice.status = 'connected';
}
function sent() {
  return voice.send.mock.calls.map(([value]) => value);
}

beforeEach(() => {
  hooks.reset();
  messages.clear();
  statuses.clear();
  vi.clearAllMocks();
  voice.status = 'idle';
  voice.session = undefined;
  voice.audio.unlocked = true;
  voice.unlockAudio.mockResolvedValue(undefined);
  voice.connect.mockImplementation(async () => {
    voice.session = { childId: child.id };
    status('connecting');
  });
  transport.get.mockReturnValue(voice);
  transport.ensure.mockImplementation(async () => {
    await voice.connect();
  });
  transport.stop.mockImplementation(() => {
    voice.end();
    voice.session = undefined;
    status('closed');
  });
});
afterEach(() => {
  hooks.unmount();
  messages.clear();
  statuses.clear();
});

describe('explicit learning call shutdown', () => {
  it('stops microphone/playback through stopChildVoice and never sends the persona-return hangUp command', async () => {
    connectedCompanion();
    const hook = mount();
    hook.render().summon('space', 'sun');
    await settle();
    persona('sun');
    expect(hook.render().persona?.characterId).toBe('sun');
    voice.send.mockClear();
    hook.render().hangUp();
    const ended = hook.render();
    expect(transport.stop).toHaveBeenCalledOnce();
    expect(voice.end).toHaveBeenCalledOnce();
    expect(voice.session).toBeUndefined();
    expect(ended.calling).toBe(false);
    expect(ended.live).toBe(false);
    expect(ended.persona).toBeUndefined();
    expect(sent()).toEqual([]);
  });

  it('cannot ensure/connect/summon after End interrupts a deferred audio unlock', async () => {
    const unlock = deferred<void>();
    voice.audio.unlocked = false;
    voice.unlockAudio.mockReturnValue(unlock.promise);
    const hook = mount();
    hook.render().summon('space', 'sun');
    hook.render().hangUp();
    unlock.resolve();
    await settle();
    expect(transport.ensure).not.toHaveBeenCalled();
    expect(voice.connect).not.toHaveBeenCalled();
    expect(sent()).toEqual([]);
    expect(hook.render().calling).toBe(false);
  });

  it('does not summon from a late ready or persona acknowledgement after End', async () => {
    const hook = mount();
    hook.render().summon('space', 'sun');
    await settle();
    expect(transport.ensure).toHaveBeenCalledOnce();
    hook.render().hangUp();
    ready();
    persona('sun');
    await settle();
    expect(sent()).toEqual([]);
    expect(hook.render().persona).toBeUndefined();
    expect(hook.render().calling).toBe(false);
  });
});

describe('learning call request ordering', () => {
  it('continues only the latest Sun→Tooth request when audio unlock promises settle out of order', async () => {
    const sun = deferred<void>(),
      tooth = deferred<void>();
    voice.audio.unlocked = false;
    voice.unlockAudio.mockReturnValueOnce(sun.promise).mockReturnValueOnce(tooth.promise);
    const hook = mount();
    hook.render().summon('space', 'sun');
    hook.render().summon('hygiene', 'tooth');
    tooth.resolve();
    await settle();
    sun.resolve();
    await settle();
    expect(transport.ensure).toHaveBeenCalledExactlyOnceWith(child);
    expect(voice.connect).toHaveBeenCalledOnce();
    ready();
    expect(sent()).toEqual([{ type: 'summonPersona', packId: 'hygiene', characterId: 'tooth' }]);
    persona('tooth');
    expect(hook.render().persona?.characterId).toBe('tooth');
  });

  it('ignores an older persona acknowledgement while a new character is pending', async () => {
    connectedCompanion();
    const hook = mount();
    hook.render().summon('space', 'sun');
    await settle();
    persona('sun');
    hook.render().summon('hygiene', 'tooth');
    await settle();
    persona('sun');
    expect(hook.render().persona).toBeUndefined();
    persona('tooth');
    expect(hook.render().persona).toEqual({
      packId: 'hygiene',
      characterId: 'tooth',
      name: 'tooth',
    });
    expect(sent()).toEqual([
      { type: 'summonPersona', packId: 'space', characterId: 'sun' },
      { type: 'summonPersona', packId: 'hygiene', characterId: 'tooth' },
    ]);
  });

  it('does not replace the current request’s state with an obsolete unlock rejection', async () => {
    const sun = deferred<void>(),
      tooth = deferred<void>();
    voice.audio.unlocked = false;
    voice.unlockAudio.mockReturnValueOnce(sun.promise).mockReturnValueOnce(tooth.promise);
    const hook = mount();
    hook.render().summon('space', 'sun');
    hook.render().summon('hygiene', 'tooth');
    sun.reject(new Error('obsolete failure'));
    await settle();
    expect(hook.render().error).toBe('');
    expect(hook.render().calling).toBe(true);
    tooth.resolve();
    await settle();
    ready();
    persona('tooth');
    expect(hook.render().persona?.characterId).toBe('tooth');
  });

  it('retains the selected learning persona while the transport reconnects and restores it', async () => {
    connectedCompanion();
    const hook = mount();
    hook.render().summon('space', 'sun');
    await settle();
    persona('sun');
    voice.send.mockClear();
    status('reconnecting');
    expect(hook.render().status).toBe('reconnecting');
    expect(hook.render().persona?.characterId).toBe('sun');
    ready();
    persona('sun');
    const restored = hook.render();
    expect(restored.persona).toEqual({ packId: 'space', characterId: 'sun', name: 'sun' });
    expect(restored.calling).toBe(true);
    expect(restored.status).toBe('connected');
    expect(transport.stop).not.toHaveBeenCalled();
    expect(sent()).toEqual([]); // VoiceClient owns restoration; the hook must not return to a companion.
  });
});

describe('learning call ownership on unmount', () => {
  it('stops an owned call and cancels its deferred unlock when leaving', async () => {
    const unlock = deferred<void>();
    voice.audio.unlocked = false;
    voice.unlockAudio.mockReturnValue(unlock.promise);
    const hook = mount();
    hook.render().summon('space', 'sun');
    hook.unmount();
    unlock.resolve();
    await settle();
    expect(transport.stop).toHaveBeenCalledOnce();
    expect(transport.ensure).not.toHaveBeenCalled();
    expect(sent()).toEqual([]);
    expect(messages.size).toBe(0);
    expect(statuses.size).toBe(0);
  });

  it('stops an established owned call exactly once on unmount', async () => {
    connectedCompanion();
    const hook = mount();
    hook.render().summon('space', 'sun');
    await settle();
    persona('sun');
    hook.unmount();
    expect(transport.stop).toHaveBeenCalledOnce();
    expect(voice.end).toHaveBeenCalledOnce();
    expect(voice.session).toBeUndefined();
  });

  it('removes listeners without stopping an unrelated companion when no learning call was requested', () => {
    connectedCompanion();
    const hook = mount();
    hook.render();
    hook.unmount();
    expect(transport.stop).not.toHaveBeenCalled();
    expect(voice.end).not.toHaveBeenCalled();
    expect(voice.session?.childId).toBe(child.id);
    expect(messages.size).toBe(0);
    expect(statuses.size).toBe(0);
  });
});
