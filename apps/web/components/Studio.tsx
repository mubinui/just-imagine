'use client';
import '../app/studio.css';
import { PlayActions } from './studio/PlayActions';
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
import type { Variable, Dial } from '@just-imagine/scene-schema';
import {
  PREVIEW_WORLDS as FIXTURE_WORLDS,
  type PreviewKey as FixtureWorldKey,
} from '../lib/preview-worlds';
import type { Engine, EngineEvent } from '@just-imagine/engine';
import { getVoice, releaseVoice, ensureChildVoice } from '../lib/voice';
import { createWorldSource } from '../lib/world-source';
import { recordDemoDiscovery } from '../lib/demo';
import { env } from '../lib/env';
import { castFor, effectiveCaptions, clampToVariable } from '../lib/helpers';
import { s } from '../lib/strings/en';
import { CompanionArt, CompanionMenu } from './companion/Companion';
import { CharacterFace } from './CharacterFace';
import { Modal } from './Modal';
import {
  CastStrip,
  DialTray,
  DiscoveryToast,
  EntityActions,
  Listening,
  PredictionSheet,
  SpellFlourish,
  Storybook,
  SummonOverlay,
  TopBar,
  StudioControls,
  CloseIcon,
  quotaCopy,
  type JobStatus,
} from './studio/parts';
import { LabDrawer } from './studio/LabDrawer';

type Prediction = Extract<ServerMessage, { type: 'prediction' }>;
type Discovery = Extract<ServerMessage, { type: 'discovery' }>;
type Spell = Extract<ServerMessage, { type: 'spell' }>['spell'];
type Hello = Extract<ClientMessage, { type: 'hello' }>;

const SUMMON_MS = 1900;
const SPELL_MS = 1600;
const DISCOVERY_MS = 14000;

function appendKey(draft: string, key: string) {
  if (key === '-') return draft === '' ? '-' : draft;
  if (key === '.')
    return draft.includes('.') ? draft : draft === '' || draft === '-' ? `${draft}0.` : `${draft}.`;
  return (draft + key).slice(0, 10);
}

export function Studio() {
  const router = useRouter();
  const host = useRef<HTMLDivElement>(null),
    engine = useRef<Engine | undefined>(undefined);
  const variableTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    pendingVariables = useRef<Record<string, number>>({});
  const previousDoc = useRef<WorldWithId | undefined>(undefined);
  const discovered = useRef(new Set<string>());
  const hello = useRef<Hello | undefined>(undefined);
  const pendingIntent = useRef<'newGame' | undefined>(undefined);
  const [child, setChild] = useState<ChildResponse>(),
    [fixture, setFixture] = useState<FixtureWorldKey>('jellyDragon'),
    [worldId, setWorldId] = useState<string>(),
    [world, setWorld] = useState<WorldWithId>(),
    [status, setStatus] = useState('connecting'),
    [job, setJob] = useState<JobStatus>(),
    [error, setError] = useState(''),
    [ended, setEnded] = useState(false),
    [character, setCharacter] = useState<CharacterId>(DEFAULT_CHARACTER),
    [speaking, setSpeaking] = useState(false),
    [summoning, setSummoning] = useState<CharacterId>(),
    [spell, setSpell] = useState<Spell>(),
    [caption, setCaption] = useState(''),
    [prediction, setPrediction] = useState<Prediction>(),
    [discovery, setDiscovery] = useState<Discovery>(),
    [quota, setQuota] = useState<number>(),
    [challenge, setChallenge] = useState(''),
    [completedChallenge, setCompletedChallenge] = useState(''),
    [values, setValues] = useState<Record<string, number>>({}),
    [keypad, setKeypad] = useState<{ id: string; variable: Variable; draft: string }>(),
    [dials, setDials] = useState<Record<string, string>>({}),
    [labOpen, setLabOpen] = useState(true),
    [captions, setCaptions] = useState(true);
  const selectedWorld = useRef<string | undefined>(undefined);
  const clearPending = () => {
    clearTimeout(variableTimer.current);
    variableTimer.current = undefined;
    pendingVariables.current = {};
  };
  const selectWorldId = (id: string | undefined) => {
    if (selectedWorld.current !== id) {
      selectedWorld.current = id;
      clearPending();
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
  const connectVoice = async () => {
    const message = hello.current;
    if (!message) return;
    setError('');
    try {
      const selected = ChildResponseSchema.parse(
        JSON.parse(localStorage.getItem('ji-child') || 'null'),
      );
      await ensureChildVoice(selected, message.worldId);
      setStatus(getVoice().status);
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
    const starter: CharacterId =
      getVoice().session?.characterId ??
      c.companion?.characterId ??
      (c.ageBand === '11-13' ? 'pori' : DEFAULT_CHARACTER);
    setCharacter(starter);
    let startWorld: string | undefined;
    if (env.fake) {
      const key = (sessionStorage.getItem('ji-fixture') || 'jellyDragon') as FixtureWorldKey;
      const selected = Object.hasOwn(FIXTURE_WORLDS, key) ? key : 'jellyDragon';
      setFixture(selected);
      startWorld = FIXTURE_WORLDS[selected].worldId;
      selectWorldId(startWorld);
    } else {
      const id = getVoice().session?.worldId ?? sessionStorage.getItem('ji-world');
      if (id) {
        startWorld = id;
        selectWorldId(id);
      }
    }
    hello.current = {
      type: 'hello',
      idToken: '',
      childId: c.id,
      characterId: starter,
      ...(startWorld ? { worldId: startWorld } : {}),
    };
    const voice = getVoice();
    setStatus(voice.status);
    const unsubscribeStatus = voice.subscribeStatus(setStatus);
    const timers: ReturnType<typeof setTimeout>[] = [];
    const unsubscribe = voice.subscribe((message) => {
      switch (message.type) {
        case 'ready':
          if (message.worldId && !env.fake) selectWorldId(message.worldId);
          setCharacter(message.characterId);
          if (pendingIntent.current === 'newGame' && !env.fake) {
            pendingIntent.current = undefined;
            getVoice().send({ type: 'newGame' });
          }
          break;
        case 'newGame':
          selectWorldId(undefined);
          sessionStorage.removeItem('ji-world');
          if (hello.current) delete hello.current.worldId;
          previousDoc.current = undefined;
          setJob(undefined);
          setCaption('');
          break;
        case 'worldJob':
          setJob(message.status);
          if (!env.fake) {
            // A queued world does not exist yet; Firestore correctly denies reads without an owner.
            // Subscribe only after the builder publishes the first playable document.
            if (['placeholders', 'hero', 'ready'].includes(message.status))
              selectWorldId(message.worldId);
            else if (message.status === 'queued' && selectedWorld.current !== message.worldId)
              selectWorldId(undefined);
          }
          break;
        case 'transcript':
          if (message.role === 'character' && !env.fake) setCaption(message.text);
          break;
        case 'prediction':
          // Preview predictions belong to the selected fixture, not the socket's canned timeline.
          if (!env.fake) setPrediction(message);
          break;
        case 'discovery':
          // Earn preview cards through the real local engine's concept events.
          if (!env.fake) setDiscovery(message);
          break;
        case 'summon':
          if (
            castFor(c.ageBand, c.companion?.characterId).some((f) => f.id === message.characterId)
          ) {
            setSummoning(message.characterId);
            setCharacter(message.characterId);
            timers.push(setTimeout(() => setSummoning(undefined), SUMMON_MS));
          }
          break;
        case 'characterState':
          if (
            castFor(c.ageBand, c.companion?.characterId).some((f) => f.id === message.characterId)
          ) {
            setCharacter(message.characterId);
            setSpeaking(message.speaking);
          }
          break;
        case 'interrupted':
          setSpeaking(false);
          break;
        case 'spell':
          engine.current?.castSpell(message.spell, message.target);
          setSpell(message.spell);
          timers.push(setTimeout(() => setSpell(undefined), SPELL_MS));
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
          setLabOpen(true);
          break;
        case 'quota':
          setQuota(message.voiceSecondsLeft);
          break;
        case 'error':
          setError(message.message);
          break;
        case 'bye':
          clearPending();
          setSpeaking(false);
          setEnded(true);
          break;
      }
    });
    return () => {
      clearPending();
      timers.forEach(clearTimeout);
      unsubscribe();
      unsubscribeStatus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);
  useEffect(() => {
    clearPending();
    if (!worldId) return;
    return createWorldSource(fixture).subscribe(
      worldId,
      (doc) => {
        setWorld(doc);
        if (doc.status === 'ready') setJob('ready');
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
          clearPending();
        }
        previousDoc.current = doc;
        if (env.fake && old?.id !== doc.id) {
          setCaption(doc.doc.narration.intro);
          const p = doc.doc.learning.prediction;
          if (p) setPrediction({ type: 'prediction', question: p.question, options: p.options });
        }
      },
      (e) => setError(e.message),
    );
  }, [worldId, fixture]);
  useEffect(() => {
    if (!discovery) return;
    if (env.fake && child && worldId) recordDemoDiscovery(child.id, worldId, discovery);
    const t = setTimeout(() => setDiscovery(undefined), DISCOVERY_MS);
    return () => clearTimeout(t);
  }, [discovery, child, worldId]);
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
        const key = `${selectedWorld.current ?? ''}:${event.concept}`;
        if (!discovered.current.has(key)) {
          discovered.current.add(key);
          const card = conceptCard(event.concept);
          setDiscovery({
            type: 'discovery',
            concept: event.concept,
            ...card,
            kidExplanation: CONCEPT_BANK[event.concept].kidHint,
          });
        }
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
  useEffect(() => {
    const scene = host.current?.closest<HTMLElement>('.stage-scene');
    const canvasFrame = host.current?.parentElement;
    if (!scene || !canvasFrame) return;
    const measure = () => scene.style.setProperty('--world-width', `${canvasFrame.clientWidth}px`);
    const observer = new ResizeObserver(measure);
    observer.observe(canvasFrame);
    measure();
    return () => observer.disconnect();
  }, [hasWorld, world?.id]);
  function switchWorld(key: FixtureWorldKey) {
    if (selectedWorld.current === FIXTURE_WORLDS[key].worldId) return;
    clearPending();
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
  function resetWorld() {
    engine.current?.reset();
    setValues(
      Object.fromEntries(
        Object.entries(world?.doc.variables || {}).map(([id, v]) => [id, v.value]),
      ),
    );
    setDials({});
    setChallenge('');
    setCompletedChallenge('');
    clearPending();
  }
  function playActivity(action: 'primary' | 'again' | 'join') {
    const game = engine.current;
    if (!game || !world) return;
    const repeat = () => {
      game.reset();
      for (const [id, value] of Object.entries(values)) game.setVariable(id, value);
      for (const [dial, value] of Object.entries(dials)) game.setDial(dial as Dial, value);
      setChallenge('');
      setCompletedChallenge('');
      setCaption(world.doc.narration.intro);
    };
    if (action === 'again') {
      repeat();
      return;
    }
    if (fixture === 'moonBounce' || fixture === 'pondFloat') repeat();
    else if (fixture === 'projectileLab') {
      repeat();
      game.tap('cannon');
    } else if (fixture === 'galtonBoard') game.tap('release');
    else if (fixture === 'fractionsLab') {
      const target =
        action === 'join'
          ? 'join'
          : game.frame().entities.find((e) => e.id === 'whole' || e.templateId === 'whole')?.id;
      if (target) game.tap(target);
    } else game.tap(world.doc.learning.heroEntityId);
  }
  function finish() {
    clearPending();
    getVoice().end();
    setEnded(true);
  }
  const live = status === 'connected' || status === 'connecting' || status === 'reconnecting';
  function startVoice(id?: CharacterId) {
    if (id) {
      setCharacter(id);
      if (hello.current) hello.current.characterId = id;
    }
    void connectVoice();
  }
  function stopVoice() {
    pendingIntent.current = undefined;
    clearPending();
    getVoice().end();
    setSpeaking(false);
  }
  function buildGame() {
    if (env.fake) {
      const key = (Object.keys(FIXTURE_WORLDS) as FixtureWorldKey[]).find((k) =>
        /projectile|cannon|game/i.test(k),
      );
      if (key) switchWorld(key);
      return;
    }
    if (live) send({ type: 'newGame' });
    else {
      pendingIntent.current = 'newGame';
      startVoice();
    }
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
  const cast = child
    ? castFor(child.ageBand, child.companion?.characterId).map((c) =>
        child.companion?.characterId === c.id ? { ...c, displayName: child.companion.name } : c,
      )
    : [];
  const personal = child?.companion?.characterId === character ? child.companion : undefined;
  const face = personal ? (
    <CompanionArt companion={personal} speaking={speaking} />
  ) : (
    <CharacterFace key={character} character={character} />
  );
  const building = Boolean(job && job !== 'ready' && job !== 'failed');
  return (
    <main className={discovery ? 'stage has-toast' : 'stage'}>
      <TopBar
        status={status}
        job={job}
        captions={captions}
        onCaptions={() => setCaptions(!captions)}
        onReset={resetWorld}
        onRetry={() => void connectVoice()}
        note={quota !== undefined ? quotaCopy(quota) : undefined}
        storybook={
          env.fake ? (
            <Storybook worlds={FIXTURE_WORLDS} selected={fixture} onSelect={switchWorld} />
          ) : undefined
        }
      />
      <div className={world?.doc.variables ? 'stage-scene has-lab' : 'stage-scene'}>
        <div className="world-frame">
          <div className="stage-world">
            <div className="engine-host" ref={host} />
            {!world && (
              <Listening
                name={personal?.name}
                character={character}
                face={face}
                building={building}
                status={status}
                live={live}
                onAsk={() => startVoice()}
              />
            )}
            {world && !env.fake && (
              <EntityActions
                doc={world.doc}
                onTap={(id) => engine.current?.tap(id)}
                onFlick={(id, direction) => engine.current?.flick(id, direction)}
              />
            )}
            {spell && <SpellFlourish spell={spell} />}
          </div>
          {prediction && world && (
            <PredictionSheet
              prediction={prediction}
              onAnswer={(index) => {
                send({ type: 'predictionAnswer', answerIndex: index });
                setPrediction(undefined);
              }}
            />
          )}
        </div>
        {world && (
          <div className="stage-bottom">
            {env.fake && (
              <PlayActions key={world.id} world={fixture} engine={engine} onPlay={playActivity} />
            )}
            <DialTray
              doc={world.doc}
              values={dials}
              onChange={(dial, value) => {
                engine.current?.setDial(dial, value);
                setDials((v) => ({ ...v, [dial]: value }));
                send({ type: 'interaction', kind: 'dial', dial, value });
              }}
            />
          </div>
        )}
        {world?.doc.variables && (
          <LabDrawer
            variables={world.doc.variables}
            values={values}
            challenges={world.doc.challenges ?? []}
            activeChallenge={challenge}
            completedChallenge={completedChallenge}
            open={labOpen}
            onToggle={() => setLabOpen(!labOpen)}
            onChange={changeVariable}
            onKeypad={(id, v) =>
              setKeypad({ id, variable: v, draft: String(values[id] ?? v.value) })
            }
          />
        )}
        <div className="caption-band">
          {captions && caption && world && (
            <p className="caption" aria-live="polite">
              {caption}
            </p>
          )}
        </div>
      </div>
      {error && (
        <p className="stage-error" role="alert">
          {error}
          <button type="button" onClick={() => setError('')} aria-label={s.close}>
            <CloseIcon />
          </button>
        </p>
      )}
      {discovery && (
        <DiscoveryToast discovery={discovery} onClose={() => setDiscovery(undefined)} />
      )}
      <CastStrip
        companion={child?.companion ?? undefined}
        cast={cast}
        active={character}
        speaking={speaking}
        activeFace={world ? face : undefined}
        onPick={(id) => {
          if (!live) {
            startVoice(id);
            return;
          }
          setCharacter(id);
          send({ type: 'switchCharacter', characterId: id });
        }}
        right={
          <StudioControls
            live={live}
            name={personal?.name ?? CHARACTERS[character].displayName}
            onAsk={() => startVoice()}
            onStop={stopVoice}
            onBuild={buildGame}
            onFinish={finish}
          />
        }
        left={<CompanionMenu inline />}
      />
      {summoning && <SummonOverlay character={summoning} />}
      {keypad && (
        <Modal className="keypad-wrap" onClose={() => setKeypad(undefined)}>
          <section
            className="keypad"
            role="dialog"
            aria-modal="true"
            aria-labelledby="keypad-title"
          >
            <h2 id="keypad-title">{keypad.variable.label}</h2>
            <output aria-live="polite">
              {keypad.draft || '0'}
              <small>
                {' '}
                → {clampToVariable(Number(keypad.draft), keypad.variable)} {keypad.variable.unit}
              </small>
            </output>
            <div className="keypad-keys">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '-', '0', '.'].map((k) => (
                <button
                  type="button"
                  key={k}
                  onClick={() => setKeypad({ ...keypad, draft: appendKey(keypad.draft, k) })}
                >
                  {k}
                </button>
              ))}
            </div>
            <div className="actions">
              <button type="button" onClick={() => setKeypad({ ...keypad, draft: '' })}>
                {s.keyClear}
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => {
                  changeVariable(keypad.id, Number(keypad.draft), keypad.variable);
                  setKeypad(undefined);
                }}
              >
                {s.apply}
              </button>
              <button type="button" onClick={() => setKeypad(undefined)}>
                {s.cancel}
              </button>
            </div>
          </section>
        </Modal>
      )}
    </main>
  );
}
