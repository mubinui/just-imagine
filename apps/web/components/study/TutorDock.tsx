'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { BrowserAudio } from '@just-imagine/characters';
import { ServerMessageSchema } from '@just-imagine/protocol';
import type { SimId } from '@just-imagine/stem-sims';
import { currentIdToken } from '../../lib/firebase';
import { env } from '../../lib/env';
import { useSchoolLanguage } from '../../lib/i18n/study';
import { CharacterArt } from '../studio/CharacterArt';
import { ErrorNotice } from '../school/shared';
import { UiIcon } from '../UiIcon';
import { PARAMS } from '../stem/SimView';
import { useStudyCopy } from './copy';
import { mergeCaption, type Caption } from './study-logic';

type Observation = { simId: string; observable: Record<string, unknown> };
export function TutorDock({
  lessonId,
  stepIndex,
  subject,
  observation,
  latestObservation,
  onSuggest,
  onHighlight,
}: {
  lessonId: string;
  stepIndex: number;
  subject: string;
  /** Paced updates while the student explores. */
  observation?: Observation;
  /** The screen this instant, sent with every question. */
  latestObservation?: () => Observation | undefined;
  onSuggest?: (key: string, value: number) => void;
  onHighlight?: (key: string) => void;
}) {
  const { s, language } = useSchoolLanguage();
  const { t, n } = useStudyCopy();
  const panelId = useId();
  const socket = useRef<WebSocket | null>(null),
    audio = useRef<BrowserAudio | null>(null),
    connectPromise = useRef<Promise<void> | null>(null),
    mount = useRef<HTMLElement>(null),
    captionBox = useRef<HTMLDivElement>(null),
    input = useRef<HTMLInputElement>(null),
    pinned = useRef(true);
  const [status, setStatus] = useState<'off' | 'connecting' | 'ready'>('off'),
    [captions, setCaptions] = useState<Caption[]>([]),
    [draft, setDraft] = useState(''),
    [error, setError] = useState(''),
    [voice, setVoice] = useState(false),
    [speaking, setSpeaking] = useState(false),
    [waiting, setWaiting] = useState(false),
    [open, setOpen] = useState(false),
    [suggestion, setSuggestion] = useState<{ key: string; value: number }>();
  const character = subject === 'math' ? 'onkomama' : 'pori';
  const name =
    character === 'onkomama'
      ? language === 'bn'
        ? 'অঙ্কমামা'
        : 'Onko Mama'
      : language === 'bn'
        ? 'পরী'
        : 'Pori';
  function end() {
    if (socket.current?.readyState === WebSocket.OPEN)
      socket.current.send(JSON.stringify({ type: 'end' }));
    socket.current?.close();
    socket.current = null;
    connectPromise.current = null;
    void audio.current?.dispose();
    audio.current = null;
    setStatus('off');
    setVoice(false);
    setSpeaking(false);
    setWaiting(false);
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
  // The gateway paces these for the model and always keeps the newest screen.
  function sendScreen(screen = observation) {
    if (!screen || socket.current?.readyState !== WebSocket.OPEN) return;
    const payload = JSON.stringify({
      type: 'tutorState',
      simId: screen.simId,
      observable: screen.observable,
    });
    if (new TextEncoder().encode(payload).length <= 2048) socket.current.send(payload);
  }
  useEffect(() => {
    if (status === 'ready') sendScreen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [observation, status]);
  useEffect(() => {
    const box = captionBox.current;
    if (box) box.scrollTop = box.scrollHeight;
    pinned.current = true;
  }, [captions]);
  // A hint, an error or the panel opening shrinks the log; keep the newest line in view.
  useEffect(() => {
    const box = captionBox.current;
    if (!box || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      if (pinned.current) box.scrollTop = box.scrollHeight;
    });
    observer.observe(box);
    for (const line of box.children) observer.observe(line);
    return () => observer.disconnect();
  }, [captions]);
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
            if (msg.role !== 'child') setWaiting(false);
            setCaptions((previous) =>
              mergeCaption(previous, { role: msg.role, text: msg.text, final: msg.final }),
            );
          } else if (msg.type === 'tutorAction') {
            if (msg.kind === 'highlightParam') onHighlight?.(msg.paramId);
            else if (msg.value !== undefined) setSuggestion({ key: msg.paramId, value: msg.value });
          } else if (msg.type === 'characterState') {
            setSpeaking(msg.speaking);
            if (msg.speaking) setWaiting(false);
          } else if (msg.type === 'interrupted') {
            sound.flush();
            setSpeaking(false);
          } else if (msg.type === 'error') {
            setError(msg.message);
            setWaiting(false);
            clearTimeout(timeout);
            reject(new Error(msg.message));
          } else if (msg.type === 'bye') {
            sound.stopCapture();
            setStatus('off');
            setVoice(false);
            setSpeaking(false);
            setWaiting(false);
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
          setWaiting(false);
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
      // A question always carries the screen as it is now, not the last paced update.
      sendScreen(latestObservation?.() ?? observation);
      socket.current?.send(JSON.stringify({ type: 'text', text: question }));
      setCaptions((previous) =>
        mergeCaption(previous, { role: 'child', text: question, final: true, local: true }),
      );
      setWaiting(true);
      setDraft('');
    } catch {
      /* rendered above */
    }
  }
  async function toggleVoice() {
    if (voice) {
      audio.current?.stopCapture();
      setVoice(false);
      return;
    }
    try {
      await connect();
      await audio.current?.startCapture();
      setVoice(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : s('saveError'));
    }
  }
  const state =
    status === 'connecting'
      ? 'connecting'
      : speaking
        ? 'speaking'
        : waiting
          ? 'thinking'
          : voice
            ? 'listening'
            : status === 'ready'
              ? 'ready'
              : 'off';
  const statusText =
    state === 'connecting'
      ? s('connect')
      : state === 'speaking'
        ? t('statusSpeaking')
        : state === 'thinking'
          ? t('statusThinking')
          : state === 'listening'
            ? t('statusListening')
            : state === 'ready'
              ? t('statusReady')
              : t('statusOff');
  const suggestionLabel =
    suggestion && observation
      ? (PARAMS[observation.simId as SimId]?.find((p) => p.id === suggestion.key)?.label[
          language === 'bn' ? 1 : 0
        ] ?? suggestion.key)
      : suggestion?.key;
  return (
    <aside
      className="tutor"
      ref={mount}
      data-open={open}
      data-state={state}
      data-voice-character={character}
      data-action={speaking ? 'idle' : 'listen'}
      aria-label={t('tutorTitle')}
    >
      <button
        type="button"
        className="tutor-launch"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`${t('askName', { name })}. ${statusText}`}
        hidden={open}
        onClick={() => {
          setOpen(true);
          requestAnimationFrame(() => input.current?.focus());
        }}
      >
        <span className="tutor-launch-art">
          <CharacterArt id={character} />
        </span>
      </button>
      <section id={panelId} className="tutor-panel" hidden={!open}>
        <header className="tutor-head">
          <span className="tutor-portrait">
            <CharacterArt id={character} />
          </span>
          <div>
            <h2>{t('askName', { name })}</h2>
            <p role="status" className="tutor-status">
              <span className="tutor-dot" aria-hidden="true" />
              {statusText}
            </p>
          </div>
          <button
            type="button"
            className="tutor-icon"
            aria-label={t('minimise')}
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen(false)}
          >
            <UiIcon name="arrowDown" width={22} height={22} />
          </button>
        </header>
        <div
          className="tutor-caption"
          ref={captionBox}
          aria-live="polite"
          onScroll={(e) => {
            const box = e.currentTarget;
            pinned.current = box.scrollHeight - box.scrollTop - box.clientHeight < 24;
          }}
        >
          {captions.length ? (
            captions.map((c, i) => (
              <p key={i} data-role={c.role} data-final={c.final}>
                <span className="sr-only">{c.role === 'child' ? t('you') : name}: </span>
                {c.text}
              </p>
            ))
          ) : (
            <p className="tutor-empty">{s('tutorNote')}</p>
          )}
        </div>
        {suggestion && (
          <button
            type="button"
            className="tutor-suggestion"
            onClick={() => {
              onSuggest?.(suggestion.key, suggestion.value);
              setSuggestion(undefined);
            }}
          >
            <UiIcon name="studio" width={20} height={20} />
            {t('tryValue', { label: suggestionLabel ?? '', value: n(suggestion.value) })}
          </button>
        )}
        <ErrorNotice error={error} />
        <form
          className="tutor-form"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <input
            ref={input}
            aria-label={s('askTyped')}
            placeholder={s('askTyped')}
            maxLength={2000}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button
            className="sch-primary tutor-send"
            disabled={!draft.trim() || status === 'connecting'}
            aria-label={s('send')}
          >
            <UiIcon name="arrowRight" width={22} height={22} />
          </button>
        </form>
        <div className="tutor-actions">
          <button
            type="button"
            className="tutor-voice"
            aria-pressed={voice}
            disabled={status === 'connecting'}
            onClick={() => void toggleVoice()}
          >
            <UiIcon name={voice ? 'micOff' : 'mic'} width={20} height={20} />
            {voice ? t('stopVoice') : s('voice')}
          </button>
          {status !== 'off' && (
            <button type="button" className="tutor-end" onClick={end}>
              <UiIcon name="hangUp" width={20} height={20} />
              {s('stop')}
            </button>
          )}
        </div>
      </section>
    </aside>
  );
}
