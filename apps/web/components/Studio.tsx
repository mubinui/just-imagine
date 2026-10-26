'use client';
import { PublishedWorlds } from './PublishedWorlds';
import { useLanguage } from '../lib/i18n';
import { uiNumber } from '../lib/i18n/ui';
import { copy as uiText, uiError } from '../lib/i18n/ui';
import '../app/studio.css';
import { PlayActions } from './studio/PlayActions';
import { WorldCast } from './studio/WorldCast';
import { CreationActions } from './studio/CreationActions';
import { useEffect, useRef, useState } from 'react';
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
import {
  getVoice,
  releaseVoice,
  ensureChildVoice,
  stopChildVoice,
  unlockChildVoice,
} from '../lib/voice';
import { getMixer, soundForEngineEvents } from '../lib/sound';
import { musicThemeFor } from '../lib/sound/theme';
import { gameTextEdition } from '../lib/content-voice-copy';
import { createWorldSource } from '../lib/world-source';
import { recordDemoDiscovery } from '../lib/demo';
import { env } from '../lib/env';
import { castFor, effectiveCaptions, clampToVariable } from '../lib/helpers';
import { s } from '../lib/strings/en';
import { CompanionArt } from './companion/Companion';
import { CharacterFace } from './CharacterFace';
import { Modal } from './Modal';
import {
  DialTray,
  DiscoveryToast,
  EntityActions,
  Listening,
  PredictionSheet,
  SpellFlourish,
  Storybook,
  SummonOverlay,
  CloseIcon,
  quotaCopy,
  type JobStatus,
} from './studio/parts';
import { LabDrawer } from './studio/LabDrawer';
import { Dock, StageHeader } from './studio/Dock';
import { StudioMenu } from './studio/StudioMenu';
import { clearBuild, rememberBuild } from '../lib/building';
import { onWorldJob } from '../lib/studio-world-job';
import { UiIcon } from './UiIcon';
import { PetFollower } from './pets/PetFollower';
import { PetSlot } from './pets/PetSlot';
import { GenerationShow } from './studio/GenerationShow';
import { GameHud } from './studio/GameHud';
import { StudioBreak } from './studio/StudioBreak';
import {
  mountGameBridge,
  type GameAsk,
  type GameBridge,
  type GameHud as GameHudState,
} from '../lib/game-bridge';

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
  const { language } = useLanguage();
  const router = useRouter();
  const host = useRef<HTMLDivElement>(null),
    engine = useRef<Engine | undefined>(undefined);
  const variableTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    pendingVariables = useRef<Record<string, number>>({});
  const previousDoc = useRef<WorldWithId | undefined>(undefined);
  const discovered = useRef(new Set<string>());
  const hello = useRef<Hello | undefined>(undefined);
  const pendingIntent = useRef<'newGame' | undefined>(undefined);
  const askedWorldId = useRef<string | undefined>(undefined);
  const pendingCharacter = useRef<string | undefined>(undefined);
  const pendingCreative = useRef<
    Extract<ClientMessage, { type: 'text' | 'undoWorld' }> | undefined
  >(undefined);
  const [worldCharacter, setWorldCharacter] = useState<string>();
  const [child, setChild] = useState<ChildResponse>(),
    [fixture, setFixture] = useState<FixtureWorldKey>('jellyDragon'),
    [worldId, setWorldId] = useState<string>(),
    [world, setWorld] = useState<WorldWithId>(),
    [status, setStatus] = useState('connecting'),
    [job, setJob] = useState<JobStatus>(),
    // When the current wish was heard: the generation show's 25 s fallback clock.
    [showStartedAt, setShowStartedAt] = useState<number>(),
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
  // Generated games: the engine generation the bridge is bound to, and the HUD it reports.
  const gameBridge = useRef<GameBridge | undefined>(undefined);
  const liveRef = useRef(false);
  const [engineEpoch, setEngineEpoch] = useState(0),
    [gameRun, setGameRun] = useState(0),
    [gameHud, setGameHud] = useState<GameHudState>(),
    [gameAsk, setGameAsk] = useState<GameAsk>(),
    [gameTangled, setGameTangled] = useState(false);
  const worldRef = useRef(world);
  useEffect(() => {
    worldRef.current = world;
  }, [world]);
  const selectedWorld = useRef<string | undefined>(undefined);
  const clearPending = () => {
    clearTimeout(variableTimer.current);
    variableTimer.current = undefined;
    pendingVariables.current = {};
  };
  const selectWorldId = (id: string | undefined) => {
    if (hello.current) {
      if (id) hello.current.worldId = id;
      else delete hello.current.worldId;
    }
    if (selectedWorld.current !== id) {
      selectedWorld.current = id;
      clearPending();
      setWorld(undefined);
      setWorldCharacter(undefined);
      pendingCharacter.current = undefined;
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
      setError(e instanceof Error ? uiError(e) : s.unavailable);
    }
  };
  const connectVoice = async () => {
    const message = hello.current;
    if (!message) return;
    setError('');
    try {
      setStatus('connecting');
      if (!(await unlockChildVoice())) return;
      const selected = ChildResponseSchema.parse(
        JSON.parse(localStorage.getItem('ji-child') || 'null'),
      );
      const continuing = getVoice().session?.childId === selected.id;
      await ensureChildVoice(
        selected,
        continuing ? undefined : message.worldId,
        continuing ? undefined : message.characterId,
      );
      setStatus(getVoice().status);
    } catch (e) {
      setError(e instanceof Error ? uiError(e) : s.unavailable);
    }
  };
  useEffect(() => {
    const parsed = ChildResponseSchema.safeParse(
      JSON.parse(localStorage.getItem('ji-child') || 'null'),
    );
    if (!parsed.success) {
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
      const requested = sessionStorage.getItem('ji-open-world');
      sessionStorage.removeItem('ji-open-world');
      const id = requested ?? getVoice().session?.worldId ?? sessionStorage.getItem('ji-world');
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
    const unsubscribeMouth = voice.audio.subscribeMouth((value) => {
      setSpeaking(value > 0.06 && voice.speakerId === voice.session?.characterId);
      getMixer().setSpeaking(value > 0.06);
    });
    const timers: ReturnType<typeof setTimeout>[] = [];
    const unsubscribe = voice.subscribe((message) => {
      switch (message.type) {
        case 'worldCharacter':
          setWorldCharacter(message.entityId ?? undefined);
          setCaption('');
          break;
        case 'ready':
          // Establish the new-game context before delivering a wish captured while connecting.
          if (pendingIntent.current === 'newGame' && !env.fake) {
            pendingIntent.current = undefined;
            getVoice().send({ type: 'newGame' });
          }
          if (pendingCharacter.current) {
            getVoice().send({ type: 'talkToCharacter', entityId: pendingCharacter.current });
            pendingCharacter.current = undefined;
          }
          if (pendingCreative.current) {
            const request = pendingCreative.current;
            pendingCreative.current = undefined;
            getVoice().send(request);
          }
          if (!getVoice().selectionPending) {
            if (message.worldId && !env.fake) selectWorldId(message.worldId);
            setCharacter(message.characterId);
            if (hello.current) hello.current.characterId = message.characterId;
          }
          break;
        case 'newGame':
          selectWorldId(undefined);
          sessionStorage.removeItem('ji-world');
          if (hello.current) delete hello.current.worldId;
          previousDoc.current = undefined;
          setJob(undefined);
          setShowStartedAt(undefined);
          askedWorldId.current = undefined;
          setCaption('');
          break;
        case 'worldJob': {
          if (message.status === 'failed') {
            setError(
              c.language === 'bn'
                ? 'তোমার দুনিয়া তৈরি শেষ হয়নি। আবার চেষ্টা করো।'
                : uiText('Your world could not finish. Please try making it again.'),
            );
            if (worldRef.current?.id === message.worldId && worldRef.current.status !== 'ready')
              selectWorldId(undefined);
          }
          const outcome = onWorldJob(message, {
            selectedWorldId: selectedWorld.current,
            askedWorldId: askedWorldId.current,
          });
          askedWorldId.current = outcome.askedWorldId;
          const heardAt = Date.now();
          setShowStartedAt((t) => (message.status === 'queued' ? heardAt : (t ?? heardAt)));
          setJob(message.status);
          // Leaving the Studio mid-build keeps a small badge on the other child screens.
          if (!env.fake) {
            if (outcome.clearBadge) clearBuild();
            else
              rememberBuild({
                worldId: message.worldId,
                characterId: hello.current?.characterId ?? 'bhombol',
                startedAt: heardAt,
              });
          }
          if (!env.fake) {
            // A queued world does not exist yet; Firestore correctly denies reads without an owner.
            // Subscribe only after the builder publishes the first playable document.
            // The world the child asked for is ready: the friend stops and the game takes over.
            if (outcome.stopVoice) stopVoice();
            if (outcome.select) selectWorldId(outcome.select);
            else if (message.status === 'queued' && selectedWorld.current !== message.worldId)
              selectWorldId(undefined);
          }
          break;
        }
        case 'transcript':
          if (message.role === 'character' && !env.fake) setCaption(message.text);
          break;
        case 'prediction':
          // Preview predictions belong to the selected fixture, not the socket's canned timeline.
          if (!env.fake && worldRef.current?.doc.learning.mode !== 'incidental')
            setPrediction(message);
          break;
        case 'discovery':
          // Earn preview cards through the real local engine's concept events.
          if (!env.fake) setDiscovery(message);
          break;
        case 'summon':
          if (getVoice().selectionPending) break;
          if (
            castFor(c.ageBand, c.companion?.characterId).some((f) => f.id === message.characterId)
          ) {
            setSummoning(message.characterId);
            setCharacter(message.characterId);
            timers.push(setTimeout(() => setSummoning(undefined), SUMMON_MS));
          }
          break;
        case 'characterState':
          if (getVoice().selectionPending) break;
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
          setError(uiError(message.message));
          if (!getVoice().selectionPending) {
            const confirmed = getVoice().session;
            if (confirmed) {
              setCharacter(confirmed.characterId);
              if (hello.current) hello.current.characterId = confirmed.characterId;
              if (!env.fake) selectWorldId(confirmed.worldId);
            }
          }
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
      unsubscribeMouth();
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
        if (doc.doc.learning.mode === 'incidental') setPrediction(undefined);
        setShowStartedAt(undefined);
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
          if (p && !doc.doc.game)
            setPrediction({ type: 'prediction', question: p.question, options: p.options });
        }
      },
      (e) => setError(uiError(e)),
    );
  }, [worldId, fixture, language]);
  useEffect(() => {
    if (!discovery) return;
    if (env.fake && child && worldId) recordDemoDiscovery(child.id, worldId, discovery);
    const t = setTimeout(() => setDiscovery(undefined), DISCOVERY_MS);
    return () => clearTimeout(t);
  }, [discovery, child, worldId]);
  function meetCharacter(entityId: string) {
    if (getVoice().status === 'connected') send({ type: 'talkToCharacter', entityId });
    else {
      pendingCharacter.current = entityId;
      void connectVoice();
    }
  }
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
      if (
        event.type === 'tap' &&
        event.target &&
        !worldRef.current?.doc.game &&
        worldRef.current?.doc.entities.some((e) => e.id === event.target && e.character)
      ) {
        meetCharacter(event.target);
        return;
      }
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
  // Sound: unlock on the first touch inside the Studio, a music bed per world, ducking under speech.
  useEffect(() => {
    const mixer = getMixer();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    mixer.setReducedMotion(reduce.matches);
    const onReduce = () => mixer.setReducedMotion(reduce.matches);
    reduce.addEventListener('change', onReduce);
    const unlock = () => {
      void mixer.unlock().then(() => mixer.preload());
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => {
      reduce.removeEventListener('change', onReduce);
      window.removeEventListener('pointerdown', unlock);
      mixer.stopMusic();
    };
  }, []);
  const musicTheme = world?.status === 'ready' ? musicThemeFor(world.doc) : undefined;
  useEffect(() => {
    if (ended) getMixer().stopMusic();
    else if (musicTheme) getMixer().playMusic(musicTheme);
  }, [musicTheme, ended]);
  useEffect(() => {
    if (!host.current || !hasWorld) return;
    let active = true;
    const target = host.current;
    void import('@just-imagine/engine')
      .then(async ({ mountEngine }) => {
        const playSound = soundForEngineEvents(getMixer());
        const mounted = await mountEngine(target, worldRef.current!.doc, (event) => {
          playSound(event);
          eventRef.current(event);
        });
        if (!active) {
          mounted.dispose();
          return;
        }
        engine.current = mounted;
        if (worldRef.current) mounted.update(worldRef.current.doc);
        setEngineEpoch((n) => n + 1);
      })
      .catch((e) => {
        if (active) setError(uiError(e));
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
  // A world with a generated game script runs it in the sandbox once the engine is mounted.
  const gameSource = world?.doc.game?.script.source;
  useEffect(() => {
    const mounted = engine.current;
    if (ended || !mounted || !gameSource) return;
    let active = true,
      hudSequence = 0,
      askSequence = 0,
      saySequence = 0;
    const translate = gameTextEdition(worldRef.current!.id, language);
    const translationFailed = (error: unknown) => {
      if (active) setError(uiError(error));
    };
    const bridge = mountGameBridge(
      mounted,
      gameSource,
      {
        onHud: (hud) => {
          const sequence = ++hudSequence;
          if (!hud.label) {
            setGameHud(hud);
            return;
          }
          // Numeric feedback stays responsive while prose is prepared; never flash the other language.
          setGameHud((previous) => ({ ...hud, label: previous?.label }));
          void translate(hud.label)
            .then((label) => {
              if (active && sequence === hudSequence) setGameHud({ ...hud, label });
            })
            .catch(translationFailed);
        },
        onSay: (text) => {
          const sequence = ++saySequence;
          void translate(text)
            .then((localized) => {
              if (!active || sequence !== saySequence) return;
              setCaption(localized);
              if (liveRef.current) send({ type: 'simEvent', ruleId: 'game_say', say: localized });
            })
            .catch(translationFailed);
        },
        onAsk: (ask) => {
          const sequence = ++askSequence;
          if (!ask) {
            setGameAsk(undefined);
            return;
          }
          void Promise.all([translate(ask.question), ...ask.options.map(translate)])
            .then(([question, ...options]) => {
              if (active && sequence === askSequence)
                setGameAsk({ ...ask, question: question!, options });
            })
            .catch(translationFailed);
        },
        onSound: (cue) => getMixer().playCue(cue),
        onTangled: () => {
          setGameAsk(undefined);
          setGameTangled(true);
        },
      },
      { seed: worldRef.current?.doc.environment.seed ?? 1 },
    );
    gameBridge.current = bridge;
    return () => {
      active = false;
      bridge.stop();
      if (gameBridge.current === bridge) gameBridge.current = undefined;
      setGameHud(undefined);
      setGameAsk(undefined);
      setGameTangled(false);
    };
  }, [engineEpoch, world?.id, gameSource, gameRun, ended, language]);
  function restartGame() {
    gameBridge.current?.stop();
    engine.current?.reset();
    for (const [id, value] of Object.entries(values)) engine.current?.setVariable(id, value);
    for (const [dial, value] of Object.entries(dials)) engine.current?.setDial(dial as Dial, value);
    if (world) setCaption(world.doc.narration.intro);
    setGameRun((n) => n + 1);
  }
  useEffect(() => {
    if (ended) return;
    const scene = host.current?.closest<HTMLElement>('.stage-scene');
    const canvasFrame = host.current?.parentElement;
    if (!scene || !canvasFrame) return;
    const stage = scene.closest<HTMLElement>('.stage');
    const dock = stage?.querySelector<HTMLElement>('.studio-dock');
    const measure = () => {
      scene.style.setProperty('--world-width', `${canvasFrame.clientWidth}px`);
      if (dock?.offsetHeight) stage?.style.setProperty('--strip-h', `${dock.offsetHeight}px`);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(canvasFrame);
    if (dock) observer.observe(dock);
    measure();
    return () => observer.disconnect();
  }, [hasWorld, world?.id, ended]);
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
    if (world?.doc.game) {
      restartGame();
      return;
    }
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
    stopVoice();
    setEnded(true);
  }
  const live = status === 'connected' || status === 'connecting' || status === 'reconnecting';
  useEffect(() => {
    liveRef.current = live;
  }, [live]);
  function startVoice(id?: CharacterId) {
    if (id) {
      setCharacter(id);
      if (hello.current) hello.current.characterId = id;
      if (getVoice().session) getVoice().send({ type: 'switchCharacter', characterId: id });
    }
    void connectVoice();
  }
  function stopVoice() {
    pendingCreative.current = undefined;
    pendingIntent.current = undefined;
    pendingCharacter.current = undefined;
    clearPending();
    stopChildVoice();
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
  function createOrEdit(message: Extract<ClientMessage, { type: 'text' | 'undoWorld' }>) {
    if (status === 'connected') send(message);
    else {
      pendingCreative.current = message;
      startVoice();
    }
  }
  if (ended)
    return (
      <StudioBreak
        title={s.ended}
        character={character}
        voiceActive={live}
        companion={child?.companion?.characterId === character ? child.companion : undefined}
        onReturn={() => setEnded(false)}
        onLeave={releaseVoice}
      />
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
    <main className={discovery ? 'stage studio-stage has-toast' : 'stage studio-stage'}>
      <StageHeader
        title={world?.title ?? s.studioTitle}
        status={status}
        job={job}
        note={quota !== undefined ? quotaCopy(quota) : undefined}
        leading={
          <button type="button" className="stage-exit" onClick={finish}>
            <UiIcon name="finish" />
            <span>{language === 'bn' ? 'স্টুডিও থেকে বের হই' : 'Exit Studio'}</span>
          </button>
        }
        menu={
          <StudioMenu
            captions={captions}
            onRestart={resetWorld}
            onCaptions={() => setCaptions(!captions)}
            worlds={
              env.fake ? (
                <Storybook worlds={FIXTURE_WORLDS} selected={fixture} onSelect={switchWorld} />
              ) : child ? (
                <PublishedWorlds
                  childId={child.id}
                  compact
                  onOpen={(id) => {
                    sessionStorage.setItem('ji-world', id);
                    selectWorldId(id);
                    if (hello.current) hello.current.worldId = id;
                    if (getVoice().session) getVoice().send({ type: 'openWorld', worldId: id });
                  }}
                />
              ) : undefined
            }
          />
        }
      />
      <div className={world?.doc.variables ? 'stage-scene has-lab' : 'stage-scene'}>
        <div className="world-frame">
          <div className="stage-world">
            <div className="engine-host" ref={host} />
            {/* In the sky corner of the world, clear of the world's controls below it. */}
            {discovery && (
              <DiscoveryToast discovery={discovery} onClose={() => setDiscovery(undefined)} />
            )}
            {world && (
              <PetFollower
                engine={engine}
                childId={child?.id}
                heroId={world.doc.learning.heroEntityId}
              />
            )}
            {!world && building ? (
              <GenerationShow
                job={job}
                startedAt={showStartedAt ?? 0}
                character={character}
                name={personal?.name}
                face={face}
                onOfferFallback={
                  env.fake ? () => switchWorld('jellyDragon' as FixtureWorldKey) : undefined
                }
              />
            ) : (
              !world && (
                <Listening
                  name={personal?.name}
                  character={character}
                  face={face}
                  building={building}
                  status={status}
                  live={live}
                  speaking={speaking}
                />
              )
            )}
            {world && !env.fake && (
              <EntityActions
                doc={world.doc}
                onTap={(id) => engine.current?.tap(id)}
                onFlick={(id, direction) => engine.current?.flick(id, direction)}
              />
            )}
            {spell && <SpellFlourish spell={spell} />}
            {world?.doc.game && (
              <GameHud
                hud={gameHud}
                ask={gameAsk}
                tangled={gameTangled}
                onAnswer={(index) => gameBridge.current?.answer(index)}
                onReplay={restartGame}
                onRetry={restartGame}
              />
            )}
          </div>
          {prediction && world && world.doc.learning.mode !== 'incidental' && (
            <PredictionSheet
              prediction={prediction}
              onAnswer={(index) => {
                send({ type: 'predictionAnswer', answerIndex: index });
                setPrediction(undefined);
              }}
            />
          )}
        </div>
        {(world || !env.fake) && (
          <div className="stage-bottom">
            {world && env.fake && !world.doc.game && (
              <PlayActions key={world.id} world={fixture} engine={engine} onPlay={playActivity} />
            )}
            {world && (
              <WorldCast
                doc={world.doc}
                activeId={worldCharacter}
                onMeet={meetCharacter}
                onReturn={() => send({ type: 'hangUp' })}
              />
            )}
            {!env.fake && (
              <CreationActions
                hasWorld={Boolean(world)}
                canUndo={Boolean(world?.revisionId)}
                busy={building}
                onSubmit={(text) => createOrEdit({ type: 'text', text })}
                onUndo={() => createOrEdit({ type: 'undoWorld' })}
              />
            )}
            {world && world.doc.learning.mode !== 'incidental' && (
              <DialTray
                doc={world.doc}
                values={dials}
                onChange={(dial, value) => {
                  engine.current?.setDial(dial, value);
                  setDials((v) => ({ ...v, [dial]: value }));
                  send({ type: 'interaction', kind: 'dial', dial, value });
                }}
              />
            )}
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
      </div>
      {error && (
        <p className="stage-error" role="alert">
          {uiText(error)}
          <button type="button" onClick={() => setError('')} aria-label={s.close}>
            <CloseIcon />
          </button>
        </p>
      )}
      <Dock
        cast={cast}
        active={character}
        speaking={speaking}
        activeFace={world ? face : undefined}
        companion={child?.companion ?? undefined}
        status={status}
        captions={captions}
        talkName={personal?.name ?? CHARACTERS[character].displayName}
        caption={world ? caption : undefined}
        onPick={(id) => {
          if (!live) {
            startVoice(id);
            return;
          }
          setCharacter(id);
          if (hello.current) hello.current.characterId = id;
          send({ type: 'switchCharacter', characterId: id });
        }}
        onTalk={() => startVoice()}
        onStop={stopVoice}
        onRetry={() => void connectVoice()}
        onNewGame={buildGame}
        pet={child && <PetSlot childId={child.id} />}
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
            <h2 id="keypad-title">{uiText(keypad.variable.label)}</h2>
            <output aria-live="polite">
              {uiText(keypad.draft || '0')}
              <small>
                {uiText(' ')}→ {uiNumber(clampToVariable(Number(keypad.draft), keypad.variable))}{' '}
                {uiText(keypad.variable.unit)}
              </small>
            </output>
            <div className="keypad-keys">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '-', '0', '.'].map((k) => (
                <button
                  type="button"
                  key={k}
                  onClick={() => setKeypad({ ...keypad, draft: appendKey(keypad.draft, k) })}
                >
                  {uiText(k)}
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
