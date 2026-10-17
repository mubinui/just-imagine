'use client';
import { useEffect, useRef, useState } from 'react';
import { BrowserAudio } from '@just-imagine/characters';
import { ServerMessageSchema } from '@just-imagine/protocol';
import { currentIdToken } from '../../lib/firebase';
import { env } from '../../lib/env';
import { useSchoolLanguage } from '../../lib/i18n/study';
import { CharacterArt } from '../studio/CharacterArt';
import { ErrorNotice } from '../school/shared';
export function TutorDock({
  lessonId,
  stepIndex,
  subject,
  observation,
  onSuggest,
  onHighlight,
}: {
  lessonId: string;
  stepIndex: number;
  subject: string;
  observation?: { simId: string; observable: Record<string, unknown> };
  onSuggest?: (key: string, value: number) => void;
  onHighlight?: (key: string) => void;
}) {
  const { s } = useSchoolLanguage();
  const socket = useRef<WebSocket | null>(null),
    audio = useRef<BrowserAudio | null>(null),
    connectPromise = useRef<Promise<void> | null>(null),
    mount = useRef<HTMLDivElement>(null),
    lastState = useRef(0);
  const [status, setStatus] = useState<'off' | 'connecting' | 'ready'>('off'),
    [captions, setCaptions] = useState<{ role: string; text: string }[]>([]),
    [draft, setDraft] = useState(''),
    [error, setError] = useState(''),
    [voice, setVoice] = useState(false),
    [speaking, setSpeaking] = useState(false),
    [suggestion, setSuggestion] = useState<{ key: string; value: number }>();
  function end() {
    socket.current?.close();
    socket.current = null;
    connectPromise.current = null;
    void audio.current?.dispose();
    audio.current = null;
    setStatus('off');
    setVoice(false);
    setSpeaking(false);
    setCaptions([]);
  }
  useEffect(
    () => () => {
      socket.current?.close();
      void audio.current?.dispose();
    },
    [],
  );
  useEffect(() => {
    if (socket.current?.readyState === WebSocket.OPEN)
      socket.current.send(
        JSON.stringify({ type: 'tutorEvent', kind: 'stepChanged', data: { stepIndex } }),
      );
    queueMicrotask(() => setSuggestion(undefined));
  }, [stepIndex]);
  useEffect(() => {
    if (!observation || status !== 'ready' || Date.now() - lastState.current < 2000) return;
    const payload = JSON.stringify({ type: 'tutorState', ...observation });
    if (new TextEncoder().encode(payload).length > 2048) return;
    lastState.current = Date.now();
    socket.current?.send(payload);
  }, [observation, status]);
  async function connect() {
    if (status === 'ready' && socket.current?.readyState === WebSocket.OPEN) return;
    if (connectPromise.current) return connectPromise.current;
    setError('');
    setStatus('connecting');
    const sound = new BrowserAudio();
    const unlocked = sound.unlock();
    sound.onMouth = (v) => mount.current?.style.setProperty('--mouth-open', String(v));
    sound.onFrame = (frame) => {
      if (socket.current?.readyState === WebSocket.OPEN) socket.current.send(frame);
    };
    audio.current = sound;
    const pending = (async () => {
      await unlocked;
      const token = await currentIdToken();
      await new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(env.gatewayUrl);
        ws.binaryType = 'arraybuffer';
        socket.current = ws;
        const timeout = setTimeout(() => {
          reject(new Error('Tutor connection timed out.'));
          ws.close();
        }, 20000);
        ws.onopen = () =>
          ws.send(JSON.stringify({ type: 'tutorHello', idToken: token, lessonId, stepIndex }));
        ws.onmessage = (event) => {
          if (event.data instanceof ArrayBuffer) {
            sound.play(event.data);
            return;
          }
          let raw: unknown;
          try {
            raw = JSON.parse(event.data);
          } catch {
            return;
          }
          const parsed = ServerMessageSchema.safeParse(raw);
          if (!parsed.success) return;
          const msg = parsed.data;
          if (msg.type === 'ready') {
            clearTimeout(timeout);
            setStatus('ready');
            resolve();
          } else if (msg.type === 'transcript') {
            setCaptions((previous) => {
              const next = [...previous];
              if (!msg.final && next.at(-1)?.role === msg.role)
                next[next.length - 1] = { role: msg.role, text: msg.text };
              else next.push({ role: msg.role, text: msg.text });
              return next.slice(-30);
            });
          } else if (msg.type === 'tutorAction') {
            if (msg.kind === 'highlightParam') onHighlight?.(msg.paramId);
            else if (msg.value !== undefined) setSuggestion({ key: msg.paramId, value: msg.value });
          } else if (msg.type === 'characterState') setSpeaking(msg.speaking);
          else if (msg.type === 'interrupted') {
            sound.flush();
            setSpeaking(false);
          } else if (msg.type === 'error') {
            setError(msg.message);
            clearTimeout(timeout);
            reject(new Error(msg.message));
          } else if (msg.type === 'bye') {
            sound.stopCapture();
            setStatus('off');
            setVoice(false);
            setSpeaking(false);
          }
        };
        ws.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('Could not connect to your tutor.'));
        };
        ws.onclose = () => {
          clearTimeout(timeout);
          sound.stopCapture();
          setStatus('off');
          setVoice(false);
          setSpeaking(false);
          reject(new Error('Tutor connection ended.'));
          connectPromise.current = null;
        };
      });
    })();
    connectPromise.current = pending;
    try {
      await pending;
    } catch (e) {
      setError(e instanceof Error ? e.message : s('saveError'));
      setStatus('off');
      connectPromise.current = null;
      throw e;
    }
  }
  async function send() {
    if (!draft.trim()) return;
    const question = draft.trim();
    try {
      await connect();
      socket.current?.send(JSON.stringify({ type: 'text', text: question }));
      setDraft('');
    } catch {
      /* rendered above */
    }
  }
  return (
    <section
      className="tutor-dock"
      ref={mount}
      data-voice-character={subject === 'math' ? 'onkomama' : 'pori'}
      data-action={speaking ? 'idle' : 'listen'}
    >
      <CharacterArt id={subject === 'math' ? 'onkomama' : 'pori'} />
      <div>
        <strong>{s('ask')}</strong>
        <p className="tutor-note">{s('tutorNote')}</p>
        <div className="tutor-actions">
          <button onClick={() => void connect().catch(() => {})} disabled={status !== 'off'}>
            {status === 'connecting' ? s('connect') : s('ask')}
          </button>
          <button
            disabled={voice}
            onClick={() =>
              void (async () => {
                try {
                  await connect();
                  await audio.current?.startCapture();
                  setVoice(true);
                } catch (e) {
                  setError(e instanceof Error ? e.message : s('saveError'));
                }
              })()
            }
          >
            {voice ? s('stop') : s('voice')}
          </button>
          {status !== 'off' && <button onClick={end}>{s('stop')}</button>}
        </div>
        <p role="status">
          {status === 'connecting' ? s('connect') : voice ? s('voice') : s('micOff')}
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <input
            aria-label={s('askTyped')}
            placeholder={s('askTyped')}
            maxLength={2000}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button disabled={!draft.trim() || status === 'connecting'}>{s('send')}</button>
        </form>
        <ErrorNotice error={error} />
        <div className="tutor-caption" aria-live="polite">
          {captions.map((c, i) => (
            <p key={i} data-role={c.role}>
              {c.text}
            </p>
          ))}
        </div>
        {suggestion && (
          <button
            onClick={() => {
              onSuggest?.(suggestion.key, suggestion.value);
              setSuggestion(undefined);
            }}
          >
            {s('suggestion')}: {suggestion.key} = {suggestion.value}
          </button>
        )}
      </div>
    </section>
  );
}
