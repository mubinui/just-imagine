'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChildResponseSchema,
  CHARACTERS,
  DEFAULT_CHARACTER,
  CONCEPT_BANK,
  conceptCard,
  type ChildResponse,
  type CharacterId,
  type WorldWithId,
  type ServerMessage,
  type ClientMessage,
} from '@just-imagine/protocol';
import { GRAVITY_PRESETS, WIND_PRESETS, type Variable } from '@just-imagine/scene-schema';
import {
  PREVIEW_WORLDS as FIXTURE_WORLDS,
  type PreviewKey as FixtureWorldKey,
} from '../lib/preview-worlds';
import type { Engine, EngineEvent } from '@just-imagine/engine';
import { getVoice, releaseVoice } from '../lib/voice';
import { createWorldSource } from '../lib/world-source';
import { env } from '../lib/env';
import { currentIdToken } from '../lib/firebase';
import { castFor, effectiveCaptions, clampToVariable } from '../lib/helpers';
import { s } from '../lib/strings/en';
import { CharacterFace } from './CharacterFace';
import { Modal } from './Modal';
type Prediction = Extract<ServerMessage, { type: 'prediction' }>;
type Discovery = Extract<ServerMessage, { type: 'discovery' }>;
export function Studio() {
  const router = useRouter();
  const host = useRef<HTMLDivElement>(null),
    engine = useRef<Engine | undefined>(undefined);
  const variableTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    pendingVariables = useRef<Record<string, number>>({});
  const previousDoc = useRef<WorldWithId | undefined>(undefined);
  const [child, setChild] = useState<ChildResponse>(),
    [fixture, setFixture] = useState<FixtureWorldKey>('jellyDragon'),
    [worldId, setWorldId] = useState<string>(),
    [world, setWorld] = useState<WorldWithId>(),
    [status, setStatus] = useState('connecting'),
    [error, setError] = useState(''),
    [ended, setEnded] = useState(false),
    [character, setCharacter] = useState<CharacterId>(DEFAULT_CHARACTER),
    [caption, setCaption] = useState(''),
    [prediction, setPrediction] = useState<Prediction>(),
    [discovery, setDiscovery] = useState<Discovery>(),
    [quota, setQuota] = useState<number>(),
    [challenge, setChallenge] = useState(''),
    [completedChallenge, setCompletedChallenge] = useState(''),
    [values, setValues] = useState<Record<string, number>>({}),
    [keypad, setKeypad] = useState<{ id: string; variable: Variable; draft: string }>(),
    [dials, setDials] = useState<Record<string, string>>({}),
    [captions, setCaptions] = useState(true);
  const selectedWorld = useRef<string | undefined>(undefined);
  const selectWorldId = (id: string) => {
    if (selectedWorld.current !== id) {
      selectedWorld.current = id;
      clearTimeout(variableTimer.current);
      variableTimer.current = undefined;
      pendingVariables.current = {};
      setWorld(undefined);
      setPrediction(undefined);
      setDiscovery(undefined);
      setChallenge('');
      setCompletedChallenge('');
      setKeypad(undefined);
      setDials({});
      setValues({});
    }
    setWorldId(id);
  };
  const send = (msg: Exclude<ClientMessage, { type: 'hello' }>) => {
    try {
      getVoice().send(msg);
    } catch (e) {
      setError(e instanceof Error ? e.message : s.unavailable);
    }
  };
  useEffect(() => {
    const parsed = ChildResponseSchema.safeParse(
      JSON.parse(localStorage.getItem('ji-child') || 'null'),
    );
    if (!parsed.success || !getVoice().audio.unlocked) {
      router.replace('/play');
      return;
    }
    const c = parsed.data;
    // Restore the selected external session after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChild(c);
    setCaptions(effectiveCaptions(c));
    if (c.ageBand === '11-13') setCharacter('pori');
    if (env.fake) {
      const key = (sessionStorage.getItem('ji-fixture') || 'jellyDragon') as FixtureWorldKey;
      const selected = Object.hasOwn(FIXTURE_WORLDS, key) ? key : 'jellyDragon';
      setFixture(selected);
      selectWorldId(FIXTURE_WORLDS[selected].worldId);
    } else {
      const id = sessionStorage.getItem('ji-world');
      if (id) selectWorldId(id);
    }
    const voice = getVoice();
    voice.onStatus = setStatus;
    const unsubscribe = voice.subscribe((message) => {
      switch (message.type) {
        case 'ready':
          if (message.worldId && !env.fake) selectWorldId(message.worldId);
          setCharacter(message.characterId);
          break;
        case 'worldJob':
          if (!env.fake) selectWorldId(message.worldId);
          break;
        case 'transcript':
          if (message.role === 'character') setCaption(message.text);
          break;
        case 'prediction':
          setPrediction(message);
          break;
        case 'discovery':
          setDiscovery(message);
          break;
        case 'summon':
        case 'characterState':
          if (castFor(c.ageBand).some((c) => c.id === message.characterId))
            setCharacter(message.characterId);
          break;
        case 'spell':
          engine.current?.castSpell(message.spell, message.target);
          break;
        case 'dial':
          engine.current?.setDial(message.dial, message.value);
          setDials((v) => ({ ...v, [message.dial]: message.value }));
          break;
        case 'variable':
          engine.current?.setVariable(message.name, message.value);
          setValues((v) => ({ ...v, [message.name]: message.value }));
          break;
        case 'challenge':
          setChallenge(message.challengeId);
          setCompletedChallenge('');
          break;
        case 'quota':
          setQuota(message.voiceSecondsLeft);
          break;
        case 'error':
          setError(message.message);
          break;
        case 'bye':
          clearTimeout(variableTimer.current);
          variableTimer.current = undefined;
          pendingVariables.current = {};
          setEnded(true);
          break;
      }
    });
    let active = true;
    void (async () => {
      try {
        const token = env.fake ? 'fixture-token' : await currentIdToken();
        if (active)
          await voice.connect({
            type: 'hello',
            idToken: token,
            childId: c.id,
            characterId: c.ageBand === '11-13' ? 'pori' : DEFAULT_CHARACTER,
            ...(env.fake
              ? {
                  worldId:
                    FIXTURE_WORLDS[
                      (sessionStorage.getItem('ji-fixture') as FixtureWorldKey) || 'jellyDragon'
                    ]?.worldId,
                }
              : sessionStorage.getItem('ji-world')
                ? { worldId: sessionStorage.getItem('ji-world')! }
                : {}),
          });
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : s.unavailable);
      }
    })();
    return () => {
      active = false;
      clearTimeout(variableTimer.current);
      variableTimer.current = undefined;
      pendingVariables.current = {};
      unsubscribe();
      voice.onStatus = () => {};
      voice.end();
    };
  }, [router]);
  useEffect(() => {
    clearTimeout(variableTimer.current);
    variableTimer.current = undefined;
    pendingVariables.current = {};
    if (!worldId) return;
    return createWorldSource(fixture).subscribe(
      worldId,
      (doc) => {
        setWorld(doc);
        const old = previousDoc.current;
        setValues((current) =>
          Object.fromEntries(
            Object.entries(doc.doc.variables || {}).map(([id, v]) => [
              id,
              old?.id === doc.id && JSON.stringify(old.doc.variables?.[id]) === JSON.stringify(v)
                ? clampToVariable(current[id] ?? v.value, v)
                : v.value,
            ]),
          ),
        );
        if (old?.id !== doc.id) {
          setDials({});
          clearTimeout(variableTimer.current);
          variableTimer.current = undefined;
          pendingVariables.current = {};
        }
        previousDoc.current = doc;
        if (env.fake) {
          setCaption(s.captionSample);
          const p = doc.doc.learning.prediction;
          if (p) setPrediction({ type: 'prediction', question: p.question, options: p.options });
        }
      },
      (e) => setError(e.message),
    );
  }, [worldId, fixture]);
  const worldRef = useRef(world);
  useEffect(() => {
    worldRef.current = world;
  }, [world]);
  const eventRef = useRef<(event: EngineEvent) => void>(() => {});
  useEffect(() => {
    eventRef.current = (event) => {
      if (event.type === 'rule' && event.ruleId)
        send({
          type: 'simEvent',
          ruleId: event.ruleId,
          ...(event.concept ? { concept: event.concept } : {}),
        });
      if (event.type === 'say' && event.say) setCaption(event.say);
      if (['tap', 'drag', 'flick'].includes(event.type) && event.target)
        send({
          type: 'interaction',
          kind: event.type as 'tap' | 'drag' | 'flick',
          entityId: event.target,
        });
      if (event.type === 'challengeComplete' && event.target) {
        send({ type: 'challengeResult', challengeId: event.target, completed: true });
        setChallenge('');
        setCompletedChallenge(event.target);
      }
      if (env.fake && event.concept) {
        const card = conceptCard(event.concept);
        setDiscovery({
          type: 'discovery',
          concept: event.concept,
          ...card,
          kidExplanation: CONCEPT_BANK[event.concept].kidHint,
        });
      }
    };
  });
  const hasWorld = Boolean(world);
  useEffect(() => {
    if (!host.current || !hasWorld) return;
    let active = true;
    const target = host.current;
    void import('@just-imagine/engine')
      .then(async ({ mountEngine }) => {
        const mounted = await mountEngine(target, worldRef.current!.doc, (event) =>
          eventRef.current(event),
        );
        if (!active) {
          mounted.dispose();
          return;
        }
        engine.current = mounted;
        if (worldRef.current) mounted.update(worldRef.current.doc);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
      engine.current?.dispose();
      engine.current = undefined;
    };
  }, [hasWorld, world?.id, ended]);
  useEffect(() => {
    if (engine.current && world) engine.current.update(world.doc);
  }, [world]);
  function switchWorld(key: FixtureWorldKey) {
    if (selectedWorld.current === FIXTURE_WORLDS[key].worldId) return;
    clearTimeout(variableTimer.current);
    variableTimer.current = undefined;
    pendingVariables.current = {};
    setFixture(key);
    selectWorldId(FIXTURE_WORLDS[key].worldId);
    setWorld(undefined);
    setPrediction(undefined);
    setDiscovery(undefined);
    setChallenge('');
    setCompletedChallenge('');
    setDials({});
    sessionStorage.setItem('ji-fixture', key);
  }
  function changeVariable(id: string, value: number, v: Variable) {
    const next = clampToVariable(value, v);
    engine.current?.setVariable(id, next);
    setValues((values) => ({ ...values, [id]: next }));
    pendingVariables.current[id] = next;
    if (!variableTimer.current)
      variableTimer.current = setTimeout(() => {
        variableTimer.current = undefined;
        const pending = pendingVariables.current;
        pendingVariables.current = {};
        for (const [name, value] of Object.entries(pending))
          send({ type: 'variable', name, value });
      }, 300);
  }
  if (ended)
    return (
      <main className="bye">
        <h1>{s.ended}</h1>
        <p>{s.endedText}</p>
        <Link className="button primary" href="/play" onClick={() => releaseVoice()}>
          {s.return}
        </Link>
      </main>
    );
  return (
    <main className="studio">
      <div className="studio-top">
        <div>
          <h1>{world?.title || s.ready}</h1>
          <p>{s.studioIntro}</p>
        </div>
        <div className="actions">
          <Link className="button secondary" href="/gallery">
            {s.gallery}
          </Link>
          <button
            className="button"
            onClick={() => {
              clearTimeout(variableTimer.current);
              variableTimer.current = undefined;
              pendingVariables.current = {};
              getVoice().end();
              setEnded(true);
            }}
          >
            {s.end}
          </button>
        </div>
      </div>
      {(status === 'reconnecting' || status === 'error') && (
        <p className="connection" role="status">
          {s.disconnected}
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
          <button onClick={() => setError('')} aria-label={s.close}>
            ×
          </button>
        </p>
      )}
      {quota !== undefined && (
        <p className="quota" role="status">
          {s.quota}: {quota}
        </p>
      )}
      <div className="studio-grid">
        <section className="play-world" aria-label={world?.title || s.ready}>
          <div className="engine-host" ref={host} />
          {!world && <div className="world-loading">{s.load}</div>}
          <div className="world-controls">
            <button
              className="round-button"
              onClick={() => {
                engine.current?.reset();
                setValues(
                  Object.fromEntries(
                    Object.entries(world?.doc.variables || {}).map(([id, v]) => [id, v.value]),
                  ),
                );
                setDials({});
                setChallenge('');
                setCompletedChallenge('');
                clearTimeout(variableTimer.current);
                variableTimer.current = undefined;
                pendingVariables.current = {};
              }}
              aria-label={s.reset}
            >
              ↶
            </button>
            <button
              className="caption-button"
              aria-pressed={captions}
              onClick={() => setCaptions(!captions)}
            >
              {s.captions}
            </button>
            <span className="world-status">{world?.status}</span>
          </div>
          {captions && caption && (
            <p className="caption" aria-live="polite">
              {caption}
            </p>
          )}
        </section>
        <aside className="character-panel">
          <CharacterFace key={character} character={character} />
          <h2>{CHARACTERS[character].displayName}</h2>
          <p>{CHARACTERS[character].catchphrase}</p>
          <p className="voice-status">
            {s.speak}: {status}
          </p>
          {!env.characterAssetBaseUrl && <span className="asset-note">{s.noRive}</span>}
        </aside>
      </div>
      {prediction && (
        <section className="prediction" aria-label={s.prediction}>
          <h2>{prediction.question}</h2>
          <div className="actions">
            {prediction.options.map((option, index) => (
              <button
                className="button secondary"
                key={option}
                onClick={() => {
                  send({ type: 'predictionAnswer', answerIndex: index });
                  setPrediction(undefined);
                }}
              >
                {option}
              </button>
            ))}
          </div>
        </section>
      )}
      {discovery && (
        <section className="discovery" aria-live="polite">
          <div>
            <h2>{discovery.title}</h2>
            <p>{discovery.kidExplanation}</p>
            <p>{discovery.realLifeNote}</p>
          </div>
          <button
            className="round-button"
            aria-label={s.close}
            onClick={() => setDiscovery(undefined)}
          >
            ×
          </button>
        </section>
      )}
      {world && (
        <section className="dial-tray">
          {world.doc.learning.dials.map((dial) => (
            <label key={dial}>
              {s.dialLabels[dial]}
              <select
                aria-label={dial}
                value={dials[dial] || ''}
                onChange={(e) => {
                  engine.current?.setDial(dial, e.target.value);
                  setDials((v) => ({ ...v, [dial]: e.target.value }));
                  send({ type: 'interaction', kind: 'dial', dial, value: e.target.value });
                }}
              >
                <option value="" disabled>
                  {s.choose}
                </option>
                {(dial === 'gravity'
                  ? Object.keys(GRAVITY_PRESETS)
                  : dial === 'wind'
                    ? Object.keys(WIND_PRESETS)
                    : Object.keys(world.doc.materials)
                ).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </section>
      )}
      {world?.doc.variables && (
        <section className="lab-panel">
          <h2>{s.lab}</h2>
          {Object.entries(world.doc.variables).map(([id, v]) => (
            <div className="variable" key={id}>
              <label htmlFor={id}>
                {v.label}
                <output>
                  {values[id] ?? v.value} {v.unit}
                </output>
              </label>
              <input
                id={id}
                type="range"
                min={v.min}
                max={v.max}
                step={v.step}
                value={values[id] ?? v.value}
                onChange={(e) => changeVariable(id, Number(e.target.value), v)}
              />
              <button
                className="button secondary"
                onClick={() => setKeypad({ id, variable: v, draft: String(values[id] ?? v.value) })}
              >
                {s.numeric}
              </button>
            </div>
          ))}
        </section>
      )}
      <section aria-live="polite">
        {' '}
        {world?.doc.challenges?.map((c) => (
          <p className={challenge === c.id ? 'challenge active' : 'challenge'} key={c.id}>
            <strong>
              {completedChallenge === c.id
                ? 'Completed! '
                : challenge === c.id
                  ? 'Your challenge: '
                  : 'Try this: '}
              {s.challenge}: {c.goal}
            </strong>{' '}
            {c.hint}
          </p>
        ))}
      </section>
      {world && (
        <section aria-label="World actions" className="entity-actions">
          <p id="entity-keyboard-help">
            Choose a name to tap. Use arrow keys on its button to push.
          </p>{' '}
          <div className="actions">
            {world.doc.entities
              .filter((e) => !e.body.isStatic)
              .map((e) => (
                <button
                  className="button secondary"
                  key={e.id}
                  onKeyDown={(event) => {
                    const direction = (
                      {
                        ArrowLeft: { x: -1, y: 0 },
                        ArrowRight: { x: 1, y: 0 },
                        ArrowUp: { x: 0, y: -1 },
                        ArrowDown: { x: 0, y: 1 },
                      } as Record<string, { x: number; y: number }>
                    )[event.key];
                    if (direction) {
                      event.preventDefault();
                      engine.current?.flick(e.id, direction);
                    }
                  }}
                  aria-describedby="entity-keyboard-help"
                  onClick={() => engine.current?.tap(e.id)}
                >
                  {e.name}
                </button>
              ))}
          </div>
        </section>
      )}
      <section className="cast">
        <h2>{s.guides}</h2>
        <div>
          {child &&
            castFor(child.ageBand).map((c) => (
              <button
                className={character === c.id ? 'selected' : ''}
                key={c.id}
                onClick={() => {
                  setCharacter(c.id);
                  send({ type: 'switchCharacter', characterId: c.id });
                }}
                aria-pressed={character === c.id}
              >
                {c.displayName}
              </button>
            ))}
        </div>
      </section>
      {env.fake && (
        <section className="fixture-picker">
          <h2>{s.worlds}</h2>
          <p>{s.localWorlds}</p>
          <div>
            {Object.entries(FIXTURE_WORLDS).map(([key, doc]) => (
              <button
                className={fixture === key ? 'selected' : ''}
                key={key}
                onClick={() => switchWorld(key as FixtureWorldKey)}
              >
                {doc.title}
              </button>
            ))}
          </div>
        </section>
      )}
      {keypad && (
        <Modal className="keypad-wrap" onClose={() => setKeypad(undefined)}>
          <section
            className="keypad"
            role="dialog"
            aria-modal="true"
            aria-labelledby="keypad-title"
          >
            <h2 id="keypad-title">{keypad.variable.label}</h2>
            <output aria-live="polite">{keypad.draft || '0'}</output>
            <div className="keypad-keys">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '-', '0', '.'].map((k) => (
                <button
                  key={k}
                  onClick={() => setKeypad({ ...keypad, draft: (keypad.draft + k).slice(0, 12) })}
                >
                  {k}
                </button>
              ))}
            </div>
            <div className="actions">
              <button onClick={() => setKeypad({ ...keypad, draft: '' })}>{s.keyClear}</button>
              <button
                onClick={() => {
                  changeVariable(keypad.id, Number(keypad.draft), keypad.variable);
                  setKeypad(undefined);
                }}
              >
                {s.apply}
              </button>
              <button onClick={() => setKeypad(undefined)}>{s.cancel}</button>
            </div>
          </section>
        </Modal>
      )}
    </main>
  );
}
