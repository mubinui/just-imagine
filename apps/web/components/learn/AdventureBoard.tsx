'use client';
import { copy as uiText } from '../../lib/i18n/ui';
import { useEffect, useReducer, useRef, useState, useSyncExternalStore } from 'react';
import type { StoryChapter } from '@just-imagine/learning-content/play';
import { useLanguage, formatNumber } from '../../lib/i18n';
import { getMixer } from '../../lib/sound';
import { GameProp, GameSet, type GamePropId } from './GameSet';
import { LearnArt } from './LearnArt';
import { LocomotionArt, Rover, TravelPosition } from './LocomotionArt';
import { useTravel } from './useTravel';
import {
  adventureReducer,
  initialAdventure,
  adventureProgress,
  targetCount,
  type AdventureAction,
} from './adventure-model';
import type { PublicPack } from './types';

type Point = { x: number; y: number };
const near = (p: Point, q: Point, r = 40) => Math.hypot(p.x - q.x, p.y - q.y) <= r;
const compactQuery = '(max-width: 700px)';
const watchCompact = (listener: () => void) => {
  const query = window.matchMedia(compactQuery);
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
};
export function assemblySlots(layout: string, count: number): Point[] {
  return Array.from({ length: count }, (_, i) => {
    if (layout === 'bridge') return { x: 180 + i * 60, y: 240 };
    if (layout === 'skeleton')
      return [
        { x: 360, y: 100 },
        { x: 360, y: 190 },
        { x: 270, y: 180 },
        { x: 450, y: 180 },
        { x: 310, y: 290 },
        { x: 410, y: 290 },
      ][i]!;
    if (layout === 'spiral') {
      const a = i * 1.65,
        r = 30 + i * 21;
      return { x: 360 + Math.cos(a) * r, y: 220 + Math.sin(a) * r };
    }
    const a = (i / count) * Math.PI * 2;
    return {
      x: 360 + Math.cos(a) * (layout === 'rings' ? 166 : 115),
      y: 220 + Math.sin(a) * (layout === 'rings' ? 64 : 88),
    };
  });
}
export const routePoints = (count: number): Point[] =>
  Array.from({ length: count }, (_, i) => ({
    x: 150 + i * (420 / (count - 1)),
    y: i % 2 ? 240 : 120,
  }));
export function AdventureBoard({
  chapter,
  pack,
  looks,
  onComplete,
  onProgress,
}: {
  chapter: StoryChapter;
  pack: PublicPack;
  looks?: Record<string, { image?: string }>;
  onComplete: () => void;
  onProgress: () => void;
}) {
  const game = chapter.game;
  const compact = useSyncExternalStore(
    watchCompact,
    () => window.matchMedia(compactQuery).matches,
    () => false,
  );
  const { language } = useLanguage(),
    bn = language === 'bn',
    lang = bn ? 1 : 0;
  const [s, dispatch] = useReducer(
    (state: ReturnType<typeof initialAdventure>, action: AdventureAction) =>
      adventureReducer(game, state, action),
    game,
    initialAdventure,
  );
  const trailPoint = (cell: number) => ({
    x: 164 + (cell % (game.kind === 'trail' ? game.columns : 6)) * 66,
    y: 65 + Math.floor(cell / (game.kind === 'trail' ? game.columns : 6)) * 76,
  });
  const isSwimmer = pack.id === 'animals_ocean';
  const memoryHorse = game.kind === 'memory' && chapter.characterId === 'horse';
  const travel = useTravel(
    memoryHorse
      ? { x: 195, y: 150 }
      : game.kind === 'trail'
        ? trailPoint(game.start)
        : routePoints(game.kind === 'route' ? game.nodes.length : 2)[0]!,
    game.kind === 'trail' && game.theme === 'rover' ? 'roll' : isSwimmer ? 'swim' : 'run',
    isSwimmer ? 105 : 64,
    isSwimmer ? 150 : 185,
  );
  const planned = useRef(initialAdventure(game));
  const enqueueTravel = travel.enqueue;
  function walk(cell: number) {
    const action: AdventureAction = { type: 'walk', cell };
    const next = adventureReducer(game, planned.current, action);
    if (next.position === planned.current.position) {
      dispatch({ type: 'blocked' });
      return;
    }
    if (travel.enqueue(trailPoint(cell), () => dispatch(action))) planned.current = next;
  }
  function deliver(node: number) {
    if (game.kind !== 'route') return;
    const action: AdventureAction = { type: 'route', node };
    const next = adventureReducer(game, planned.current, action);
    if (next.step === planned.current.step) {
      dispatch({ type: 'blocked' });
      return;
    }
    if (travel.enqueue(routePoints(game.nodes.length)[node]!, () => dispatch(action)))
      planned.current = next;
  }
  const [drag, setDrag] = useState<{ id: number; x: number; y: number }>();
  const [selected, setSelected] = useState<number>();
  const [holding, setHolding] = useState(false),
    [zone, setZone] = useState(0);
  const [demo, setDemo] = useState<number>(),
    [demoDone, setDemoDone] = useState(false),
    [demoPlaying, setDemoPlaying] = useState(false);
  const active = useRef(true),
    timers = useRef<ReturnType<typeof setTimeout>[]>([]),
    svg = useRef<SVGSVGElement>(null);
  const notify = useRef({ onComplete, onProgress }),
    reported = useRef(false),
    previous = useRef(0);
  useEffect(() => {
    notify.current = { onComplete, onProgress };
  });
  useEffect(() => {
    active.current = true;
    const pendingTimers = timers.current;
    return () => {
      active.current = false;
      for (const t of pendingTimers) clearTimeout(t);
    };
  }, []);
  const progress = adventureProgress(game, s),
    total = targetCount(game);
  const horseX = 195 + s.step * 55;
  useEffect(() => {
    if (memoryHorse) enqueueTravel({ x: horseX, y: 150 }, () => {}, true);
  }, [memoryHorse, horseX, enqueueTravel]);
  useEffect(() => {
    if (
      s.complete &&
      !reported.current &&
      (!memoryHorse || Math.abs(travel.frame.x - horseX) < 0.5)
    ) {
      reported.current = true;
      getMixer().playCue('level_up', { gain: 0.45 });
      notify.current.onComplete();
    } else if (progress > previous.current && game.kind !== 'hold') {
      getMixer().playCue('star', { gain: 0.25 });
      if (previous.current === 0 || (previous.current < total / 2 && progress >= total / 2))
        notify.current.onProgress();
    }
    previous.current = progress;
  }, [s.complete, progress, total, game.kind, memoryHorse, horseX, travel.arrival, travel.frame]);
  useEffect(() => {
    if (game.kind !== 'hold' || s.complete) return;
    let last = performance.now();
    const timer = setInterval(() => {
      const now = performance.now(),
        dt = now - last;
      last = now;
      if (!document.hidden) dispatch({ type: 'tick', milliseconds: dt, holding, zone });
    }, 100);
    const release = () => setHolding(false);
    window.addEventListener('blur', release);
    return () => {
      clearInterval(timer);
      window.removeEventListener('blur', release);
    };
  }, [game.kind, holding, zone, s.complete]);
  const position = (e: React.PointerEvent<SVGSVGElement>): Point => {
    const matrix = e.currentTarget.getScreenCTM();
    if (!matrix) return { x: 0, y: 0 };
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix.inverse());
    return { x: p.x, y: p.y };
  };
  const character = pack.characters.find((c) => c.id === chapter.characterId)!;
  function art(id: string, x: number, y: number, size = 110, cheer = false) {
    if (compact && x < 130) return null;
    const image = looks?.[`${pack.id}:${id}`]?.image;
    return (
      <svg
        x={x - size / 2}
        y={y - size / 2}
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className={cheer ? 'story-actor is-celebrating' : 'story-actor'}
      >
        {image ? <image href={image} width="100" height="100" /> : <LearnArt id={id} />}
      </svg>
    );
  }
  function pieceNumber(index: number, p: Point) {
    return (
      <g className="assembly-number">
        <circle cx={p.x} cy={p.y} r="13" fill="#fff9ee" stroke="#245e4e" strokeWidth="1.5" />
        <text x={p.x} y={p.y + 6} textAnchor="middle">
          {formatNumber(index + 1, language)}
        </text>
      </g>
    );
  }
  function pieceArt(layout: string, index: number, p: Point, numbered = true) {
    if (layout === 'huddle')
      return (
        <g>
          {art('penguin', p.x, p.y, 70)}
          {numbered && pieceNumber(index, { x: p.x, y: p.y + 22 })}
        </g>
      );
    const prop: GamePropId =
      layout === 'skeleton'
        ? 'bone'
        : layout === 'rings'
          ? 'ring'
          : layout === 'spiral'
            ? 'star'
            : layout === 'bridge'
              ? 'plank'
              : layout === 'coat'
                ? 'wool'
                : 'nest';
    return (
      <g className="assembled-prop">
        <GameProp id={prop} x={p.x} y={p.y} size={layout === 'bridge' ? 82 : 72} />
        {numbered && pieceNumber(index, p)}
      </g>
    );
  }

  function start(e: React.PointerEvent<SVGGElement>, id: number, at: Point) {
    e.preventDefault();
    svg.current?.setPointerCapture(e.pointerId);
    setDrag({ id, ...at });
  }
  function activate(e: React.KeyboardEvent, action: () => void) {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      action();
    }
  }
  function adjust(p: Point) {
    if (game.kind !== 'adjust') return;
    const value =
      game.mode === 'blanket' || game.mode === 'distance'
        ? (p.x - 130) / 460
        : Math.atan2((p.y - 210) / 145, (p.x - 360) / 180);
    dispatch({ type: 'adjust', value });
  }
  function move(e: React.PointerEvent<SVGSVGElement>) {
    if (!drag) return;
    const p = position(e);
    setDrag({ ...drag, ...p });
    if (game.kind === 'adjust') adjust(p);
  }
  function end(e: React.PointerEvent<SVGSVGElement>) {
    const p = position(e);
    if (drag) {
      if (game.kind === 'assemble') {
        const slot = assemblySlots(game.layout, game.pieces).findIndex((at) => near(p, at));
        if (slot >= 0) dispatch({ type: 'place', piece: drag.id, slot });
      }
      if (game.kind === 'route') {
        const node = routePoints(game.nodes.length).findIndex((at) => near(p, at, 62));
        if (node >= 0) deliver(node);
      }
      if (game.kind === 'cover') {
        if (near(p, { x: 260 + s.step * 90, y: 190 }, 75))
          dispatch({ type: 'cover', target: 'cover' });
        else if (near(p, { x: 600, y: 285 }, 65)) dispatch({ type: 'cover', target: 'bin' });
      }
    }
    setDrag(undefined);
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
  }
  const wait = (ms: number) =>
    new Promise<void>((resolve) => {
      timers.current.push(setTimeout(resolve, ms));
    });
  async function demonstrate() {
    if (game.kind !== 'memory' || demoPlaying) return;
    setDemoPlaying(true);
    setDemoDone(false);
    dispatch({ type: 'reset' });
    reported.current = false;
    try {
      await getMixer().unlock();
      if (chapter.characterId === 'whale') {
        const duration = await getMixer().playClip('/learn/sounds/whale');
        await wait(duration * 1000 + 200);
      }
      for (const pad of game.sequence) {
        if (!active.current) return;
        setDemo(pad);
        if (game.mode === 'calls') {
          const duration = await getMixer().playClip(`/learn/sounds/${game.choices[pad]!.id}`);
          await wait(Math.max(700, duration * 1000));
        } else {
          getMixer().playCue('star', { gain: 0.3 });
          await wait(650);
        }
        setDemo(undefined);
        await wait(220);
      }
      if (active.current) setDemoDone(true);
    } finally {
      if (active.current) {
        setDemo(undefined);
        setDemoPlaying(false);
      }
    }
  }
  const learned = bn ? character.factsBn[chapter.fact] : character.facts[chapter.fact];
  const feedback =
    s.feedback === 'try'
      ? bn
        ? 'এটা এখনো মেলেনি। আলোকিত পথ বা চিহ্ন দেখে আবার চেষ্টা করো।'
        : uiText('That did not match yet. Follow the lit path or matching marks and try again.')
      : s.feedback === 'start'
        ? chapter.goal[lang]
        : learned;
  const quarter =
    game.kind === 'hold' ? Math.min(3, Math.floor(s.milliseconds / (game.milliseconds / 4))) : 0;
  const linear = game.kind === 'adjust' && (game.mode === 'blanket' || game.mode === 'distance');
  const linearGoal =
    game.kind === 'adjust' ? game.goals[Math.min(s.step, game.goals.length - 1)]! : 0;
  return (
    <div
      className={`adventure-board is-${game.kind}`}
      data-game={game.kind}
      data-habitat={pack.id}
      data-feedback={s.feedback}
      data-progress={progress}
      data-total={total}
      data-complete={s.complete}
      data-position={s.position}
      data-step={s.step}
    >
      <svg
        className="adventure-canvas"
        viewBox={
          !compact
            ? '0 0 720 410'
            : game.kind === 'trail'
              ? '120 0 420 410'
              : game.kind === 'assemble'
                ? '120 0 480 410'
                : game.kind === 'cover'
                  ? '200 0 480 410'
                  : game.kind === 'hold'
                    ? game.mode === 'wash'
                      ? '205 0 400 410'
                      : '240 0 360 410'
                    : game.kind === 'memory'
                      ? '100 0 530 410'
                      : game.kind === 'adjust' && !linear
                        ? '110 0 500 410'
                        : '80 0 560 410'
        }
        ref={svg}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={() => {
          setDrag(undefined);
          setHolding(false);
        }}
        aria-label={chapter.title[lang]}
      >
        <GameSet
          section={pack.section}
          packId={pack.id}
          kind={game.kind}
          progress={game.kind === 'hold' ? s.milliseconds / 4000 : progress}
        />
        {game.kind === 'assemble' && (
          <>
            {game.layout === 'rings' && (
              <>
                <ellipse
                  cx="360"
                  cy="220"
                  rx="168"
                  ry="65"
                  fill="none"
                  stroke="#fff9ee66"
                  strokeWidth="26"
                />
                {art(character.id, 360, 207, 115, s.complete)}
              </>
            )}
            {game.layout === 'bridge' && (
              <>
                <path
                  d="M140 265V200M580 265V200M140 245H580"
                  stroke="#8a5e41"
                  strokeWidth="10"
                  fill="none"
                />
                {art(character.id, 100, 200, 115, s.complete)}
              </>
            )}
            {game.layout === 'skeleton' && (
              <path
                d="M360 135V235M270 180H450M360 235L310 310M360 235L410 310"
                fill="none"
                stroke="#fff9ee80"
                strokeWidth="16"
                strokeLinecap="round"
              />
            )}
            {game.layout === 'spiral' && (
              <path
                d="M360 220C420 150 440 270 340 285S220 140 360 100S540 340 310 355"
                stroke="#f7d76e88"
                strokeWidth="5"
                fill="none"
              />
            )}
            {!['rings', 'bridge'].includes(game.layout) &&
              art(character.id, 90, 180, 120, s.complete)}
            {assemblySlots(game.layout, game.pieces).map((p, i) => (
              <g
                key={i}
                role="button"
                tabIndex={0}
                className={`assembly-slot ${s.placed.includes(i) ? 'is-filled' : ''}`}
                aria-label={`${bn ? 'জায়গা' : uiText('Space')} ${formatNumber(i + 1, language)}`}
                onClick={() => {
                  if (selected !== undefined) dispatch({ type: 'place', piece: selected, slot: i });
                }}
                onKeyDown={(e) =>
                  activate(e, () => {
                    if (selected !== undefined)
                      dispatch({ type: 'place', piece: selected, slot: i });
                  })
                }
              >
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="30"
                  fill={s.placed.includes(i) ? '#b8dcbc22' : '#173f3966'}
                  stroke="#f4e6bc"
                  strokeWidth="2"
                  strokeDasharray={s.placed.includes(i) ? undefined : '4 5'}
                />
                {s.placed.includes(i) ? (
                  <g className="game-piece-arrival">{pieceArt(game.layout, i, p)}</g>
                ) : (
                  <g>
                    <g opacity=".38">{pieceArt(game.layout, i, p, false)}</g>
                    {pieceNumber(i, p)}
                  </g>
                )}
              </g>
            ))}
            {Array.from(
              { length: game.pieces },
              (_, i) =>
                !s.placed.includes(i) && (
                  <g
                    key={i}
                    role="button"
                    tabIndex={0}
                    aria-label={`${bn ? 'অংশ' : uiText('Piece')} ${formatNumber(i + 1, language)}`}
                    aria-pressed={selected === i}
                    className={`adventure-piece ${selected === i ? 'is-selected' : ''}`}
                    onPointerDown={(e) => start(e, i, { x: 170 + i * 70, y: 365 })}
                    onClick={() => setSelected(i)}
                    onKeyDown={(e) => activate(e, () => setSelected(i))}
                  >
                    <rect
                      x={(drag?.id === i ? drag.x : 170 + i * 70) - 36}
                      y={(drag?.id === i ? drag.y : 365) - 36}
                      width="72"
                      height="72"
                      fill="transparent"
                      pointerEvents="all"
                    />
                    {pieceArt(game.layout, i, {
                      x: drag?.id === i ? drag.x : 170 + i * 70,
                      y: drag?.id === i ? drag.y : 365,
                    })}
                  </g>
                ),
            )}
          </>
        )}
        {game.kind === 'route' && (
          <>
            <path
              d={routePoints(game.nodes.length)
                .map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`)
                .join(' ')}
              className="delivery-route"
              stroke={pack.section === 'body' ? '#b85869' : isSwimmer ? '#69bdd1' : '#b58b56'}
              strokeWidth="28"
              fill="none"
              strokeLinecap="round"
            />
            {routePoints(game.nodes.length).map((p, i) => (
              <g
                key={i}
                role="button"
                tabIndex={0}
                aria-label={`${bn ? 'পৌঁছে দাও' : uiText('Deliver to')} ${game.nodes[i]!.label[lang]}`}
                onClick={() => {
                  if (selected !== undefined) deliver(i);
                }}
                onKeyDown={(e) =>
                  activate(e, () => {
                    if (selected !== undefined) deliver(i);
                  })
                }
                className={`route-stop ${i === s.step + 1 ? 'is-next' : ''}`}
              >
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="52"
                  fill={i <= s.step ? '#234e43b3' : '#173f3999'}
                  stroke={i === s.step + 1 ? '#be843e' : '#9cb798'}
                  strokeWidth={i === s.step + 1 ? 5 : 2}
                />
                <ellipse cx={p.x} cy={p.y + 35} rx="47" ry="12" fill="#132b2844" />
                {game.nodes[i]!.art ? (
                  art(game.nodes[i]!.art!, p.x, p.y, 96)
                ) : (
                  <GameProp id="sign" x={p.x} y={p.y} size={100} />
                )}
                <text x={p.x} y={p.y + 80} textAnchor="middle">
                  {uiText(game.nodes[i]!.label[lang])}
                </text>
              </g>
            ))}
            <TravelPosition
              motion={travel.frame}
              subscribe={travel.subscribe}
              at={drag}
              role="button"
              tabIndex={0}
              aria-label={
                isSwimmer
                  ? bn
                    ? 'ডলফিন বেছে নাও'
                    : uiText('Choose Dolphin')
                  : bn
                    ? 'পার্সেল তুলে নাও'
                    : uiText('Pick up parcel')
              }
              className={`adventure-piece ${selected === 0 ? 'is-selected' : ''}`}
              onPointerDown={(e) => start(e, 0, travel.getFrame())}
              onClick={() => setSelected(0)}
              onKeyDown={(e) => activate(e, () => setSelected(0))}
            >
              {isSwimmer ? (
                <circle cx={0} cy={0} r="50" fill="transparent" pointerEvents="all" />
              ) : (
                <circle
                  cx={0}
                  cy={0}
                  r="25"
                  fill={
                    game.parcel === 'water'
                      ? '#70bfd6'
                      : game.parcel === 'food'
                        ? '#e5a554'
                        : '#f7d76e'
                  }
                  stroke="#245e4e"
                  strokeWidth="3"
                />
              )}
              {!isSwimmer && (
                <GameProp
                  id={
                    game.parcel === 'water' ? 'water' : game.parcel === 'food' ? 'parcel' : 'oxygen'
                  }
                  x={0}
                  y={0}
                  size={65}
                />
              )}
            </TravelPosition>
            {isSwimmer && (
              <LocomotionArt
                id={character.id}
                motion={travel.frame}
                subscribe={travel.subscribe}
                size={120}
                image={looks?.[`${pack.id}:${character.id}`]?.image}
              />
            )}
            {!isSwimmer && art(character.id, 360, 355, 100, s.complete)}
          </>
        )}
        {game.kind === 'trail' && (
          <>
            {Array.from({ length: game.columns * game.rows }, (_, cell) => {
              const x = 164 + (cell % game.columns) * 66,
                y = 65 + Math.floor(cell / game.columns) * 76,
                blocked = game.blocked.includes(cell),
                pickup = game.collect.includes(cell) && !s.collected.includes(cell);
              return (
                <g
                  key={cell}
                  role="button"
                  tabIndex={blocked ? -1 : 0}
                  aria-disabled={blocked}
                  aria-label={`${bn ? 'ঘর' : uiText('Cell')} ${cell + 1}${blocked ? (bn ? ' পাথর' : ' blocked') : ''}${pickup ? (bn ? ' সংগ্রহ' : ' collect') : ''}`}
                  className={`trail-cell ${blocked ? 'is-blocked' : ''}`}
                  onClick={() => walk(cell)}
                  onKeyDown={(e) => {
                    const delta: Record<string, number> = {
                      ArrowLeft: -1,
                      ArrowRight: 1,
                      ArrowUp: -game.columns,
                      ArrowDown: game.columns,
                    };
                    if (e.key in delta) {
                      e.preventDefault();
                      walk(planned.current.position + delta[e.key]!);
                    } else activate(e, () => walk(cell));
                  }}
                >
                  <rect
                    x={x - 30}
                    y={y - 32}
                    width="60"
                    height="64"
                    rx="12"
                    fill="transparent"
                    pointerEvents="all"
                  />
                  {!blocked && (
                    <ellipse
                      cx={x}
                      cy={y + 20}
                      rx="27"
                      ry="11"
                      fill={cell === s.position ? '#f1d37c66' : '#152f3d33'}
                    />
                  )}
                  <GameProp
                    id={
                      blocked
                        ? isSwimmer
                          ? 'coral'
                          : game.theme === 'rover'
                            ? 'mars-rock'
                            : 'stone'
                        : 'stone'
                    }
                    x={x}
                    y={y + 10}
                    size={blocked ? 70 : 57}
                    opacity={blocked ? 1 : isSwimmer ? 0.36 : 0.72}
                  />
                  {pickup && (
                    <g className="trail-collectible">
                      <GameProp
                        id={isSwimmer ? 'water' : game.theme === 'rover' ? 'star' : 'acorn'}
                        x={x}
                        y={y - 5}
                        size={42}
                      />
                    </g>
                  )}
                  {cell === game.exit && (
                    <path
                      d={`M${x - 10} ${y + 20}V${y - 20}L${x + 18} ${y - 10}L${x - 10} ${y}`}
                      stroke="#245e4e"
                      strokeWidth="4"
                      fill="#f7d76e"
                    />
                  )}
                </g>
              );
            })}
            {game.theme === 'rover' ? (
              <Rover motion={travel.frame} subscribe={travel.subscribe} />
            ) : (
              <LocomotionArt
                id={character.id}
                motion={travel.frame}
                subscribe={travel.subscribe}
                size={isSwimmer ? 85 : 82}
                image={looks?.[`${pack.id}:${character.id}`]?.image}
              />
            )}
          </>
        )}
        {game.kind === 'adjust' && (
          <>
            {linear ? (
              <>
                <path d="M130 250H590" stroke="#fff9ee" strokeWidth="16" strokeLinecap="round" />
                <path d={`M${130 + linearGoal * 460} 225V275`} stroke="#c88643" strokeWidth="7" />
                {game.mode === 'blanket' && (
                  <>
                    <circle cx="360" cy="155" r="62" fill="#e5b870" />
                    <circle
                      cx="360"
                      cy="155"
                      r={70 + s.value * 28}
                      fill="none"
                      stroke="#edcf9c"
                      strokeWidth={2 + s.value * 19}
                    />
                    {[0, 1, 2].map((i) => (
                      <path
                        key={i}
                        d={`M${325 + i * 35} 90V${45 + s.value * 30}`}
                        stroke="#c47450"
                        strokeWidth={5 - s.value * 3}
                      />
                    ))}
                  </>
                )}
                {game.mode === 'distance' && (
                  <>
                    <circle
                      cx={130 + s.value * 460}
                      cy="155"
                      r={18 + (1 - s.value) * 35}
                      fill="#f7d76e"
                      opacity={0.3 + (1 - s.value) * 0.7}
                    />
                    {art('star', 80, 155, 90)}
                    <text x="130" y="315">
                      {bn ? 'কাছে' : uiText('Near')}
                    </text>
                    <text x="590" y="315" textAnchor="end">
                      {bn ? 'দূরে' : uiText('Far')}
                    </text>
                  </>
                )}
                <g
                  role="button"
                  tabIndex={0}
                  aria-label={bn ? 'মডেল সরাও' : uiText('Move the model')}
                  onPointerDown={(e) => start(e, 0, { x: 130 + s.value * 460, y: 250 })}
                >
                  <circle
                    cx={130 + s.value * 460}
                    cy="250"
                    r="25"
                    fill="#245e4e"
                    stroke="#f7d76e"
                    strokeWidth="5"
                  />
                </g>
              </>
            ) : (
              <>
                {game.mode === 'orbit' && (
                  <>
                    {art('sun', 360, 210, 100)}
                    <ellipse
                      cx="360"
                      cy="210"
                      rx="180"
                      ry="145"
                      fill="none"
                      stroke="#fff9ee"
                      strokeWidth="3"
                      strokeDasharray="5 10"
                    />
                  </>
                )}
                {game.mode === 'beam' && (
                  <>
                    {art('sun', 230, 210, 125)}
                    <path
                      d={`M230 210L${360 + Math.cos(s.value) * 230} ${210 + Math.sin(s.value) * 150}`}
                      stroke="#f7d76e"
                      strokeWidth="18"
                      opacity=".8"
                    />
                    {game.goals.map((a, i) => (
                      <circle
                        key={i}
                        cx={360 + Math.cos(a) * 180}
                        cy={210 + Math.sin(a) * 145}
                        r="28"
                        fill={i < s.step ? '#f7d76e' : '#fff9ee'}
                        stroke="#245e4e"
                        strokeWidth="3"
                      />
                    ))}
                  </>
                )}
                {game.mode !== 'orbit' && game.mode !== 'beam' && (
                  <g transform={`rotate(${(s.value * 180) / Math.PI} 360 210)`}>
                    {art(character.id, 360, 210, 180, s.complete)}
                    {game.mode === 'tilt' && (
                      <path
                        d="M360 85V335"
                        stroke="#fff9ee"
                        strokeWidth="4"
                        strokeDasharray="8 6"
                      />
                    )}
                  </g>
                )}
                {game.mode === 'storm' && (
                  <path
                    d={`M360 210q${Math.cos(s.value) * 100} -100 0 -65t0 140`}
                    stroke="#f7d76e"
                    strokeWidth="8"
                    fill="none"
                  />
                )}
                <circle
                  cx={360 + Math.cos(linearGoal) * 180}
                  cy={210 + Math.sin(linearGoal) * 145}
                  r="30"
                  fill="none"
                  stroke="#f7d76e"
                  strokeWidth="5"
                  strokeDasharray="6 7"
                />
                <g
                  role="button"
                  tabIndex={0}
                  aria-label={bn ? 'ঘোরানোর হাতল' : uiText('Rotation handle')}
                  className="adventure-piece"
                  onPointerDown={(e) =>
                    start(e, 0, {
                      x: 360 + Math.cos(s.value) * 180,
                      y: 210 + Math.sin(s.value) * 145,
                    })
                  }
                >
                  <circle
                    cx={360 + Math.cos(s.value) * 180}
                    cy={210 + Math.sin(s.value) * 145}
                    r="30"
                    fill="#fff9ee"
                    stroke="#245e4e"
                    strokeWidth="3"
                  />
                  {game.mode === 'orbit' &&
                    art(
                      character.id,
                      360 + Math.cos(s.value) * 180,
                      210 + Math.sin(s.value) * 145,
                      64,
                    )}
                </g>
              </>
            )}
          </>
        )}
        {game.kind === 'memory' &&
          (memoryHorse ? (
            <>
              <path d="M150 209H570" stroke="#fff9ee99" strokeWidth="7" strokeLinecap="round" />
              <LocomotionArt
                id="horse"
                motion={travel.frame}
                subscribe={travel.subscribe}
                size={145}
                image={looks?.[`${pack.id}:horse`]?.image}
              />
            </>
          ) : (
            <>{art(character.id, 360, 115, 175, s.complete)}</>
          ))}
        {game.kind === 'hold' && (
          <>
            {art(character.id, 120, 180, 155, s.complete)}
            {game.mode === 'wash' ? (
              <>
                {Array.from({ length: 4 }, (_, i) => (
                  <g
                    key={i}
                    role="button"
                    tabIndex={0}
                    aria-label={`${bn ? 'ঘষো' : uiText('Scrub')} ${[bn ? 'তালু' : 'palms', bn ? 'পিঠ' : 'backs', bn ? 'আঙুল' : 'fingers', bn ? 'নখ' : 'nails'][i]}`}
                    onPointerDown={(e) => {
                      e.currentTarget.setPointerCapture(e.pointerId);
                      setZone(i);
                      setHolding(true);
                    }}
                    onPointerUp={() => setHolding(false)}
                    onPointerCancel={() => setHolding(false)}
                    onBlur={() => setHolding(false)}
                    onKeyDown={(e) =>
                      activate(e, () => {
                        setZone(i);
                        setHolding(true);
                      })
                    }
                    onKeyUp={() => setHolding(false)}
                    className={`wash-zone ${i === quarter ? 'is-next' : ''}`}
                  >
                    <rect
                      x={225 + (i % 2) * 180}
                      y={60 + Math.floor(i / 2) * 140}
                      width="160"
                      height="132"
                      rx="16"
                      fill="transparent"
                      pointerEvents="all"
                    />
                    <g
                      transform={`translate(${260 + (i % 2) * 180} ${55 + Math.floor(i / 2) * 140}) scale(.82)`}
                    >
                      <path
                        d="M24 112V77L9 51Q4 39 14 36L31 60V26Q31 14 42 17L48 55V12Q50 1 60 9L65 53V20Q72 9 80 22L83 61Q97 40 106 50L96 99Q92 120 64 122Z"
                        fill={i < quarter || s.complete ? '#d6e8c5' : '#e6ac83'}
                        stroke={i === quarter ? '#b87831' : '#795e45'}
                        strokeWidth={i === quarter ? 5 : 2}
                      />
                      {i === 0 && <ellipse cx="61" cy="87" rx="25" ry="21" fill="#fff9ee88" />}
                      {i === 1 && (
                        <>
                          <path d="M47 65V95M62 62V96M77 66V94" stroke="#b77858" strokeWidth="3" />
                          <ellipse cx="62" cy="86" rx="25" ry="23" fill="#fff9ee66" />
                        </>
                      )}
                      {i === 2 && (
                        <path
                          d="M40 25L47 60M58 16L64 60M76 28L82 63"
                          stroke="#fff9eeaa"
                          strokeWidth="8"
                          strokeLinecap="round"
                        />
                      )}
                      {i === 3 && (
                        <>
                          <rect x="33" y="19" width="10" height="14" rx="5" fill="#fff9ee" />
                          <rect x="52" y="8" width="10" height="15" rx="5" fill="#fff9ee" />
                          <rect x="70" y="20" width="10" height="14" rx="5" fill="#fff9ee" />
                        </>
                      )}
                      {(i < quarter || (i === quarter && holding)) &&
                        [0, 1, 2, 3, 4].map((n) => (
                          <circle
                            key={n}
                            cx={30 + n * 16}
                            cy={60 + (n % 2) * 25}
                            r={7 + (n % 3)}
                            fill="#e7f6ef"
                            opacity=".9"
                          />
                        ))}
                    </g>
                    <text
                      x={305 + (i % 2) * 180}
                      y={178 + Math.floor(i / 2) * 140}
                      textAnchor="middle"
                    >
                      {uiText(
                        (bn
                          ? ['তালু', 'পিঠ', 'আঙুল', 'নখ']
                          : [uiText('Palms'), uiText('Backs'), uiText('Fingers'), uiText('Nails')])[
                          i
                        ],
                      )}
                    </text>
                  </g>
                ))}
                <text x="405" y="365" textAnchor="middle">
                  {formatNumber(Math.ceil((game.milliseconds - s.milliseconds) / 1000), language)}
                  {uiText(' ')}
                  {bn ? 'সেকেন্ড বাকি' : 'seconds left'}
                </text>
              </>
            ) : (
              <>
                <circle
                  cx="420"
                  cy="200"
                  r={
                    game.mode === 'breathe'
                      ? 48 +
                        (quarter % 2
                          ? 1 - (s.milliseconds % 2000) / 2000
                          : (s.milliseconds % 2000) / 2000) *
                          60
                      : 88
                  }
                  fill={game.mode === 'breathe' ? '#b8dce2' : '#f7e2a0'}
                  stroke="#fff9ee"
                  strokeWidth="5"
                />
                <GameProp
                  id={game.mode === 'rest' ? 'moon' : 'oxygen'}
                  x={420}
                  y={155}
                  size={game.mode === 'rest' ? 95 : 64 + Math.sin(s.milliseconds / 1300) * 12}
                />
                {game.mode === 'rest' &&
                  [0, 1, 2, 3, 4, 5].map((i) => (
                    <circle
                      key={i}
                      cx={270 + i * 52}
                      cy="330"
                      r="10"
                      fill={s.milliseconds / game.milliseconds > i / 6 ? '#f7d76e' : '#fff9ee88'}
                    />
                  ))}
                <text x="420" y="207" textAnchor="middle">
                  {game.mode === 'breathe'
                    ? quarter % 2 === 0
                      ? bn
                        ? 'চেপে ভরো'
                        : uiText('Hold to fill')
                      : bn
                        ? 'ছেড়ে খালি করো'
                        : uiText('Release to empty')
                    : bn
                      ? 'ধীরে, শান্তভাবে'
                      : uiText('Slow and quiet')}
                </text>
              </>
            )}
          </>
        )}
        {game.kind === 'cover' && (
          <>
            {art('tissue', 110, 170, 160, s.complete)}
            <circle
              cx={260 + s.step * 90}
              cy="190"
              r="65"
              fill="#fff9eea6"
              stroke="#c88643"
              strokeWidth="3"
              strokeDasharray="6 8"
            />
            {s.coverPhase === 'cover' &&
              [0, 1, 2, 3, 4].map((i) => (
                <circle
                  key={i}
                  cx={245 + s.step * 90 + i * 13}
                  cy={175 + (i % 2) * 22}
                  r="6"
                  fill="#72b5bd"
                />
              ))}
            <g
              role="button"
              tabIndex={0}
              aria-label={bn ? 'ব্যবহৃত টিস্যু বিনে ফেলো' : uiText('Put used tissue in bin')}
              onClick={() => {
                if (selected !== undefined) dispatch({ type: 'cover', target: 'bin' });
              }}
              onKeyDown={(e) =>
                activate(e, () => {
                  if (selected !== undefined) dispatch({ type: 'cover', target: 'bin' });
                })
              }
            >
              <rect
                x="550"
                y="235"
                width="100"
                height="100"
                rx="12"
                fill="#245e4e"
                stroke="#fff9ee"
                strokeWidth="3"
              />
              <text x="600" y="295" textAnchor="middle" className="inverse-label">
                {bn ? 'বিন' : uiText('Bin')}
              </text>
            </g>
            <g
              role="button"
              tabIndex={0}
              aria-label={bn ? 'টিস্যু তুলে নাও' : uiText('Pick up tissue')}
              onPointerDown={(e) => start(e, 0, { x: 350, y: 340 })}
              onClick={() => setSelected(0)}
              onKeyDown={(e) => activate(e, () => setSelected(0))}
              className="adventure-piece"
            >
              <rect
                x={(drag?.x ?? 350) - 42}
                y={(drag?.y ?? 340) - 32}
                width="84"
                height="64"
                rx="9"
                fill="#fff9ee"
                stroke="#aac0b2"
                strokeWidth="3"
              />
              <path
                d={`M${(drag?.x ?? 350) - 25} ${(drag?.y ?? 340) - 12}l35 26`}
                stroke="#c8d6ca"
                strokeWidth="2"
              />
            </g>
          </>
        )}
      </svg>
      <div className="adventure-inputs">
        {game.kind === 'trail' && (
          <span className="trail-instruction">
            {bn
              ? 'পাশের ঘরে চলো · সংগ্রহ করো · পতাকায় যাও'
              : uiText('Neighbouring squares · Collect the pieces · Reach the flag')}
          </span>
        )}
        {game.kind === 'memory' && (
          <div className="story-memory-pads">
            {game.choices.map((choice, i) => (
              <button
                type="button"
                key={choice.id}
                disabled={!demoDone || demoPlaying || s.complete}
                aria-disabled={!demoDone || demoPlaying}
                aria-label={`${bn ? 'তাল' : uiText('Pattern pad')} ${i + 1}: ${choice.label[lang]}`}
                className={`memory-pad ${demo === i ? 'is-lit' : ''}`}
                data-correct={s.step > 0 && game.sequence[s.step - 1] === i}
                onClick={() => {
                  dispatch({ type: 'memory', pad: i });
                  getMixer().playCue('star', { gain: 0.2 });
                }}
              >
                {choice.art ? (
                  <LearnArt id={choice.art} />
                ) : (
                  <svg viewBox="0 0 60 60" aria-hidden="true">
                    <circle
                      cx="30"
                      cy="30"
                      r={13 + i * 3}
                      fill={['#6b9f87', '#d39d63', '#8e8ac1', '#74b7c7'][i]}
                    />
                  </svg>
                )}
                <span>{uiText(choice.label[lang])}</span>
              </button>
            ))}
          </div>
        )}

        {game.kind === 'adjust' && (
          <label>
            {bn ? 'ঘুরিয়ে বা সরিয়ে চিহ্ন মেলাও' : uiText('Turn or slide to match the marker')}
            <input
              type="range"
              min={linear ? 0 : -180}
              max={linear ? 100 : 180}
              step="1"
              value={linear ? Math.round(s.value * 100) : Math.round((s.value * 180) / Math.PI)}
              onChange={(e) =>
                dispatch({
                  type: 'adjust',
                  value: Number(e.target.value) / (linear ? 100 : 180 / Math.PI),
                })
              }
              aria-label={bn ? 'মডেলের নিয়ন্ত্রণ' : uiText('Model control')}
            />
            <span>
              {game.mode === 'tilt'
                ? `${formatNumber(Math.round((s.value * 180) / Math.PI), language)}°`
                : `${formatNumber(s.step, language)} / ${formatNumber(game.goals.length, language)}`}
            </span>
          </label>
        )}
        {game.kind === 'memory' && (
          <button
            type="button"
            disabled={demoPlaying || s.complete}
            onClick={() => void demonstrate()}
          >
            {demoPlaying
              ? bn
                ? 'দেখো আর শোনো…'
                : uiText('Watch and listen…')
              : demoDone
                ? bn
                  ? 'তাল আবার দেখাও'
                  : uiText('Show the pattern again')
                : bn
                  ? 'তাল দেখাও'
                  : uiText('Show the pattern')}
          </button>
        )}
        {game.kind === 'hold' && game.mode !== 'wash' && (
          <button
            type="button"
            className="story-hold"
            disabled={s.complete}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              setHolding(true);
            }}
            onPointerUp={() => setHolding(false)}
            onPointerCancel={() => setHolding(false)}
            onBlur={() => setHolding(false)}
            onKeyDown={(e) => activate(e, () => setHolding(true))}
            onKeyUp={() => setHolding(false)}
          >
            {game.mode === 'breathe'
              ? bn
                ? 'চেপে ভরো · ছেড়ে খালি করো'
                : uiText('Hold to fill · Release to empty')
              : bn
                ? 'চাঁদ ধরে রাখো'
                : uiText('Hold the moon')}
          </button>
        )}
        {game.kind === 'cover' && (
          <>
            <button
              type="button"
              onClick={() => dispatch({ type: 'cover', target: 'cover' })}
              disabled={s.coverPhase !== 'cover' || s.complete}
            >
              {bn ? 'টিস্যু দিয়ে ঢাকো' : uiText('Cover with tissue')}
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: 'cover', target: 'bin' })}
              disabled={s.coverPhase !== 'bin' || s.complete}
            >
              {bn ? 'বিনে ফেলো' : uiText('Put in bin')}
            </button>
          </>
        )}
        {game.kind === 'trail' && (
          <div className="trail-directions">
            {[
              [-1, 0, uiText('Left'), 'বাঁ'],
              [0, -1, uiText('Up'), 'ওপরে'],
              [0, 1, uiText('Down'), 'নিচে'],
              [1, 0, uiText('Right'), 'ডান'],
            ].map(([dx, dy, en, bengali]) => (
              <button
                type="button"
                key={String(en)}
                onClick={() =>
                  walk(planned.current.position + Number(dx) + Number(dy) * game.columns)
                }
              >
                {bn ? bengali : en}
              </button>
            ))}
          </div>
        )}
        {(game.kind === 'assemble' || game.kind === 'route') && (
          <span>
            {isSwimmer && game.kind === 'route'
              ? bn
                ? 'ডলফিন বেছে পরের গন্তব্য চাপো, অথবা টেনে পথ দেখাও।'
                : uiText('Choose Dolphin, then tap the next stop, or drag to guide the route.')
              : bn
                ? 'টানো, অথবা অংশ বেছে জায়গা চাপো।'
                : uiText('Drag, or select a piece and tap its destination.')}
          </span>
        )}
      </div>
      <details className="game-discovery">
        <summary>{bn ? 'এখানে কী ঘটছে?' : uiText('What’s happening here?')}</summary>
        <p>{uiText(learned)}</p>
        <button type="button" onClick={onProgress}>
          {bn ? 'বন্ধুকে বোঝাতে বলো' : uiText('Ask my friend to explain')}
        </button>
      </details>
      <footer className="adventure-feedback">
        <div
          className="game-voice-portrait"
          data-action={s.complete ? 'cheer' : s.feedback === 'try' ? 'listen' : 'idle'}
        >
          <LearnArt id={character.id} />
        </div>
        <p aria-live="polite">{uiText(feedback)}</p>
        <progress
          max={total}
          value={progress}
          aria-label={bn ? 'অধ্যায়ের অগ্রগতি' : uiText('Chapter progress')}
        />
        <span>{formatNumber(Math.round((progress / total) * 100), language)}%</span>
      </footer>
    </div>
  );
}
