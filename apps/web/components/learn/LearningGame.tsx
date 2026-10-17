'use client';
import { copy as uiText } from '../../lib/i18n/ui';
import { useEffect, useReducer, useRef, useState } from 'react';
import { useLanguage, formatNumber } from '../../lib/i18n';
import { getVoice } from '../../lib/voice';
import { getMixer } from '../../lib/sound';
import { GameSet } from './GameSet';
import { LearnArt } from './LearnArt';
import { ToothActor } from './ToothActor';
import { CoachPose } from './CinematicArt';
import {
  DANCE_SEQUENCE,
  FOOD_TEAM,
  OXYGEN_ROUTE,
  PLAQUE,
  initialPlay,
  playReducer,
} from './play-model';
import { FOOD_REQUESTS, MISSIONS, PLAY_COPY } from './play-copy';
import type { PublicPack } from './types';

type Point = { x: number; y: number };
type Drag = { id: string; x: number; y: number };
const HOMES = [
  { id: 'farm', en: 'Farm', bn: 'খামার', x: 135, colour: '#b8d497' },
  { id: 'jungle', en: 'Forest', bn: 'বন', x: 360, colour: '#77a48b' },
  { id: 'ocean', en: 'Ocean', bn: 'সমুদ্র', x: 585, colour: '#82c5d4' },
];
const ORGANS = [
  { id: 'lungs', en: 'Lungs', bn: 'ফুসফুস', x: 360, y: 160 },
  { id: 'heart', en: 'Heart', bn: 'হৃৎপিণ্ড', x: 510, y: 260 },
  { id: 'body', en: 'Body cells', bn: 'শরীরের কোষ', x: 360, y: 380 },
];
const FOOD_LABELS: Record<string, [string, string]> = {
  carrot: ['Carrot', 'গাজর'],
  milk: ['Milk / fortified soy', 'দুধ / পুষ্টিযুক্ত সয়া'],
  bean: ['Beans', 'শিম ও ডাল'],
  rice: ['Rice', 'ভাত'],
  fruit: ['Fruit', 'ফল'],
};
const xy = (p: Point, target: Point, r: number) => Math.hypot(p.x - target.x, p.y - target.y) < r;
function Coach({ pose, complete = false }: { pose: number; complete?: boolean }) {
  return (
    <g transform="translate(-100 -30) scale(2)">
      <CoachPose pose={pose} complete={complete} />
    </g>
  );
}
function Fruit() {
  return (
    <svg viewBox="0 0 100 100">
      <path d="M50 25C10 5 7 78 37 88Q50 81 63 88C93 78 90 5 50 25" fill="#d97970" />
      <path d="M50 26Q45 7 66 8Q66 25 50 26" fill="#679d73" />
    </svg>
  );
}

/** Six authored games with distinct causal rules, rendered from a separate play model. */
export function LearningGame({
  pack,
  onMeet,
  onObservation,
  onChallenge,
  live,
  looks,
  story,
}: {
  pack: PublicPack;
  onMeet: (id: string) => void;
  onObservation: (event: string) => void;
  onChallenge: () => void;
  live: boolean;
  looks?: Record<string, { image?: string }>;
  story?: { onComplete: () => void };
}) {
  const { language, t } = useLanguage(),
    bn = language === 'bn',
    lang = bn ? 1 : 0;
  const [s, dispatch] = useReducer(playReducer, pack.section, initialPlay);
  const [drag, setDrag] = useState<Drag>();
  const [keyboard, setKeyboard] = useState<string>();
  const [sound, setSound] = useState('');
  const [burst, setBurst] = useState<Point & { key: number }>();
  const svg = useRef<SVGSVGElement>(null),
    root = useRef<HTMLDivElement>(null),
    observation = useRef(onObservation);
  const previousFeedback = useRef('start');
  const completedStory = useRef(false);
  useEffect(() => {
    if (s.complete && !completedStory.current && story) {
      completedStory.current = true;
      story.onComplete();
    }
  }, [s.complete, story]);
  const phaseCos = Math.cos(s.angle);
  const phasePath = `M0 -44 A44 44 0 0 1 0 44 A${Math.max(0.001, Math.abs(phaseCos) * 44)} 44 0 0 ${phaseCos >= 0 ? 1 : 0} 0 -44Z`;
  const section = pack.section,
    mission = MISSIONS[section],
    feedback = PLAY_COPY[s.feedback] ?? PLAY_COPY.start!;
  useEffect(() => {
    observation.current = onObservation;
  }, [onObservation]);
  useEffect(() => {
    if (s.feedback === 'start' || s.feedback === previousFeedback.current) return;
    previousFeedback.current = s.feedback;
    getMixer().playCue(
      s.feedback.includes('try') ? 'fail_soft' : s.complete ? 'level_up' : 'star',
      { gain: 0.4 },
    );
    if (!s.feedback.includes('try')) observation.current(s.feedback);
  }, [s.feedback, s.complete]);
  useEffect(() => {
    if (!live || !root.current) return;
    const audio = getVoice().audio,
      node = root.current;
    const mouth = (value: number) => node.style.setProperty('--mouth-open', String(value));
    const unsubscribeMouth = audio.subscribeMouth(mouth);
    return () => {
      unsubscribeMouth();
      node.style.setProperty('--mouth-open', '0');
    };
  }, [live]);
  function point(e: React.PointerEvent<SVGSVGElement>): Point {
    const matrix = e.currentTarget.getScreenCTM();
    if (!matrix) return { x: 0, y: 0 };
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix.inverse());
    return { x: p.x, y: p.y };
  }
  function drop(id: string, p: Point) {
    if (section === 'body') {
      const target = ORGANS.find((o) => xy(p, o, 75));
      if (target) dispatch({ type: 'oxygen', target: target.id });
    }
    if (section === 'animals') {
      const home = HOMES.find((h) => xy(p, { x: h.x, y: 320 }, 105));
      if (home) dispatch({ type: 'animal', animal: id, home: home.id });
    }
    if (section === 'food' && xy(p, { x: 360, y: 315 }, 155)) dispatch({ type: 'food', food: id });
  }
  function dragStart(e: React.PointerEvent<SVGGElement>, id: string, p: Point) {
    e.preventDefault();
    e.stopPropagation();
    svg.current?.setPointerCapture(e.pointerId);
    setDrag({ id, ...p });
  }
  function move(e: React.PointerEvent<SVGSVGElement>) {
    if (!drag) return;
    const p = point(e);
    setDrag({ ...drag, ...p });
    if (drag.id === 'brush') {
      dispatch({ type: 'brush', ...p });
      setBurst({ ...p, key: Date.now() });
    }
    if (drag.id === 'moon') dispatch({ type: 'moon', angle: Math.atan2(p.y - 260, p.x - 365) });
  }
  function end(e: React.PointerEvent<SVGSVGElement>) {
    if (drag) {
      drop(drag.id, point(e));
      setDrag(undefined);
    }
    if (svg.current?.hasPointerCapture(e.pointerId)) svg.current.releasePointerCapture(e.pointerId);
  }
  function choose(id: string) {
    setKeyboard(id);
  }
  function art(id: string, x: number, y: number, size: number) {
    const look = looks?.[`${pack.id}:${id}`]?.image;
    if (look)
      return <image href={look} x={x - size / 2} y={y - size / 2} width={size} height={size} />;

    return (
      <svg x={x - size / 2} y={y - size / 2} width={size} height={size} viewBox="0 0 100 100">
        <LearnArt id={id} />
      </svg>
    );
  }
  function toy(id: string, name: string, x: number, y: number, size = 90) {
    const at = drag?.id === id ? drag : { x, y };
    return (
      <g
        className={`game-toy ${keyboard === id ? 'is-picked' : ''}`}
        role="button"
        tabIndex={0}
        aria-label={name}
        aria-pressed={keyboard === id}
        onPointerDown={(e) => dragStart(e, id, { x, y })}
        onClick={() => choose(id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            choose(id);
          }
        }}
      >
        <rect
          x={at.x - size / 2}
          y={at.y - size / 2}
          width={size}
          height={size}
          fill="transparent"
          pointerEvents="all"
        />
        {id === 'fruit' ? (
          <svg
            x={at.x - size / 2}
            y={at.y - size / 2}
            width={size}
            height={size}
            viewBox="0 0 100 100"
          >
            <Fruit />
          </svg>
        ) : (
          art(id, at.x, at.y, size)
        )}
      </g>
    );
  }
  const oxygenAt = ORGANS[[0, 1, 2, 1, 0][s.oxygen]!]!;
  const oxygen = drag?.id === 'oxygen' ? drag : { x: oxygenAt.x, y: oxygenAt.y };
  const progress =
    section === 'hygiene'
      ? [s.cleaned.length, 24]
      : section === 'body'
        ? [s.oxygen, 4]
        : section === 'space'
          ? [s.phaseGoal, 3]
          : section === 'animals'
            ? [s.rescued.length, 3]
            : section === 'food'
              ? [s.foods.length, 5]
              : [s.dance, 8];
  async function hear(animal: string) {
    setSound(animal);
    const mixer = getMixer();
    await mixer.unlock();
    const duration = await mixer.playClip(`/learn/sounds/${animal}`);
    setTimeout(() => setSound((v) => (v === animal ? '' : v)), duration * 1000);
  }
  return (
    <div
      className={`playable-learning is-${section} ${story ? 'is-story-game' : ''} ${s.complete ? 'is-complete' : ''}`}
      ref={root}
      style={{ backgroundImage: `url(${pack.scene.theme.backdrop?.url})` }}
    >
      <header className="learning-mission">
        <div>
          <h2>{uiText(mission[lang])}</h2>
          <p>{uiText(mission[lang + 2])}</p>
        </div>
        <button
          type="button"
          className="game-restart"
          onClick={() => {
            dispatch({ type: 'reset' });
            setKeyboard(undefined);
          }}
          aria-label={bn ? 'আবার খেলো' : uiText('Restart game')}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 9a8 8 0 1 1 0 7M4 3v6h6" />
          </svg>
        </button>
      </header>
      <svg
        ref={svg}
        className="learning-game-canvas"
        viewBox={section === 'body' ? '0 0 720 500' : '0 0 720 450'}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={() => setDrag(undefined)}
        aria-label={mission[lang]}
      >
        <defs>
          <linearGradient id="enamel" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#fffef0" />
            <stop offset=".55" stopColor="#f7e8c9" />
            <stop offset="1" stopColor="#d6c39f" />
          </linearGradient>
          <radialGradient id="plaque">
            <stop stopColor="#ad8a35" />
            <stop offset="1" stopColor="#d8bf69" />
          </radialGradient>
          <linearGradient id="blood">
            <stop stopColor="#d76b67" />
            <stop offset="1" stopColor="#9f4b56" />
          </linearGradient>
        </defs>
        {section !== 'hygiene' && (
          <GameSet
            section={section}
            packId={pack.id}
            kind={section}
            progress={s.complete ? 6 : 0}
          />
        )}
        {section === 'hygiene' && (
          <>
            <ellipse cx="150" cy="403" rx="90" ry="14" fill="#244c3e" opacity=".2" />
            <svg x="4" y="115" width="250" height="280" viewBox="0 0 100 100">
              <ToothActor pose={s.complete ? 'cheer' : drag?.id === 'brush' ? 'brush' : 'wave'} />
            </svg>
            <path d="M250 340Q430 385 620 340L615 380Q430 422 255 380Z" fill="#d99688" />
            {Array.from({ length: 6 }, (_, i) => (
              <g key={i}>
                <path
                  d={`M${275 + i * 50} 250Q${280 + i * 50} 213 ${300 + i * 50} 225Q${320 + i * 50} 213 ${325 + i * 50} 250L${322 + i * 50} 337Q${300 + i * 50} 356 ${278 + i * 50} 337Z`}
                  fill="url(#enamel)"
                />
                <path
                  d={`M${286 + i * 50} 245V310`}
                  stroke="#fff"
                  strokeWidth="5"
                  opacity=".6"
                  strokeLinecap="round"
                />
              </g>
            ))}
            {PLAQUE.map(
              (p, i) =>
                !s.cleaned.includes(i) && (
                  <g key={i} className="plaque-patch" data-patch={i}>
                    <ellipse
                      cx={p.x}
                      cy={p.y}
                      rx={12 + (i % 3)}
                      ry={10 + (i % 2)}
                      fill="url(#plaque)"
                    />
                    <circle cx={p.x - 3} cy={p.y - 2} r="2" fill="#a98d42" />
                  </g>
                ),
            )}
            <g
              className="game-toy brush-tool"
              role="button"
              tabIndex={0}
              aria-label={bn ? 'ব্রাশ তুলে নাও' : uiText('Pick up toothbrush')}
              aria-pressed={keyboard === 'brush'}
              onPointerDown={(e) => dragStart(e, 'brush', { x: drag?.x ?? 570, y: drag?.y ?? 395 })}
              onClick={() => choose('brush')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  choose('brush');
                }
              }}
              transform={`translate(${drag?.id === 'brush' ? drag.x : 570} ${drag?.id === 'brush' ? drag.y : 395}) rotate(-22)`}
            >
              <rect x="-14" y="-10" width="148" height="20" rx="10" fill="#65b9aa" />
              <rect x="-26" y="-18" width="54" height="33" rx="9" fill="#a7d8c1" />
              {Array.from({ length: 8 }, (_, i) => (
                <path
                  key={i}
                  d={`M${-20 + i * 6} -15V-32`}
                  stroke="#fff9ee"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              ))}
            </g>
            {keyboard === 'brush' &&
              PLAQUE.filter((_, i) => !s.cleaned.includes(i)).map((p) => (
                <rect
                  key={p.x + ':' + p.y}
                  className="keyboard-scrub"
                  x={p.x - 17}
                  y={p.y - 17}
                  width="34"
                  height="34"
                  rx="10"
                  role="button"
                  tabIndex={0}
                  aria-label={bn ? 'এখানে ব্রাশ করো' : uiText('Brush this patch')}
                  onClick={() => dispatch({ type: 'brush', ...p })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      dispatch({ type: 'brush', ...p });
                    }
                  }}
                />
              ))}
            {burst && (
              <g
                key={burst.key}
                className="clean-burst"
                transform={`translate(${burst.x} ${burst.y})`}
              >
                {[-1, 1].map((i) => (
                  <circle key={i} cx={i * 12} cy={-14} r="7" fill="#e4f8ed" opacity=".85" />
                ))}
              </g>
            )}
          </>
        )}
        {section === 'body' && (
          <>
            <path
              d="M360 70C270 70 260 130 280 210L260 370Q360 425 460 370L440 210C460 130 450 70 360 70Z"
              fill="#efd6bd"
              opacity=".6"
            />
            <path
              d="M360 160Q520 160 510 260Q510 380 360 380Q220 380 220 260Q220 150 360 160"
              fill="none"
              stroke="url(#blood)"
              strokeWidth="10"
              strokeDasharray="4 8"
            />
            {ORGANS.map((o) => (
              <g
                key={o.id}
                className={`body-target ${OXYGEN_ROUTE[s.oxygen] === o.id ? 'is-next' : ''}`}
                role="button"
                tabIndex={0}
                aria-label={(bn ? o.bn : o.en) + (bn ? ' — পৌঁছে দাও' : ' — deliver here')}
                onClick={() => {
                  if (keyboard === 'oxygen') dispatch({ type: 'oxygen', target: o.id });
                }}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && keyboard === 'oxygen') {
                    e.preventDefault();
                    dispatch({ type: 'oxygen', target: o.id });
                  }
                }}
              >
                <circle cx={o.x} cy={o.y} r="66" fill="#fff9ee" />
                {o.id === 'body' ? (
                  <g fill="#cf927d">
                    {[-1, 0, 1].map((i) => (
                      <circle key={i} cx={o.x + i * 26} cy={o.y} r="19" />
                    ))}
                  </g>
                ) : (
                  art(o.id, o.x, o.y - 4, 90)
                )}
                <text x={o.x} y={o.y + 82} textAnchor="middle">
                  {bn ? o.bn : o.en}
                </text>
              </g>
            ))}
            <g
              className="oxygen-parcel game-toy"
              role="button"
              tabIndex={0}
              aria-label={bn ? 'অক্সিজেন প্যাকেট তুলে নাও' : uiText('Pick up oxygen parcel')}
              onPointerDown={(e) => dragStart(e, 'oxygen', oxygen)}
              onClick={() => choose('oxygen')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  choose('oxygen');
                }
              }}
              transform={`translate(${oxygen.x - 36} ${oxygen.y - 45})`}
            >
              <rect width="72" height="54" rx="14" fill={s.oxygen >= 2 ? '#8c3d42' : '#e26c5e'} />
              <path d="M36 0V54M0 22H72" stroke="#fff4d8" strokeWidth="6" />
              <text x="36" y="42" textAnchor="middle" fill="#fff9ee">
                {s.oxygen >= 2 && s.oxygen < 4 ? uiText('CO₂') : 'O₂'}
              </text>
            </g>
          </>
        )}
        {section === 'space' && (
          <>
            <ellipse
              cx="365"
              cy="260"
              rx="210"
              ry="155"
              fill="none"
              stroke="#dfd5ee"
              opacity=".65"
              strokeWidth="2"
              strokeDasharray="3 9"
            />
            {art('sun', 55, 260, 98)}
            {art('earth', 365, 260, 110)}
            <path
              d="M110 230H285M110 260H280M110 290H285"
              stroke="#f7d76e"
              opacity=".5"
              strokeWidth="4"
            />
            <g
              className="game-toy"
              role="button"
              tabIndex={0}
              aria-label={bn ? 'চাঁদ ঘোরাও' : uiText('Move the Moon')}
              onPointerDown={(e) =>
                dragStart(e, 'moon', {
                  x: 365 + Math.cos(s.angle) * 210,
                  y: 260 + Math.sin(s.angle) * 155,
                })
              }
              onKeyDown={(e) => {
                if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {
                  e.preventDefault();
                  dispatch({
                    type: 'moon',
                    angle: s.angle + ((e.key === 'ArrowLeft' ? -1 : 1) * Math.PI) / 12,
                  });
                }
              }}
            >
              <circle
                cx={365 + Math.cos(s.angle) * 210}
                cy={260 + Math.sin(s.angle) * 155}
                r="40"
                fill="#48576a"
              />
              <path
                d={`M${365 + Math.cos(s.angle) * 210} ${220 + Math.sin(s.angle) * 155}a40 40 0 0 0 0 80Z`}
                fill="#fff1d4"
              />
            </g>
            <g transform="translate(630 92)">
              <circle r="45" fill="#35485a" />
              <path d={phasePath} fill="#f5e8cb" />
              <text y="68" textAnchor="middle">
                {bn ? 'পৃথিবী থেকে' : uiText('From Earth')}
              </text>
            </g>
            {pack.characters
              .filter((c) => !['sun', 'earth', 'moon'].includes(c.id))
              .slice(0, 6)
              .map((c, i) => (
                <g
                  key={c.id}
                  className="game-toy"
                  role="button"
                  tabIndex={0}
                  aria-label={bn ? c.nameBn : c.name}
                  onClick={() => onMeet(c.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onMeet(c.id);
                  }}
                >
                  {art(c.id, 145 + i * 88, 65, 68)}
                </g>
              ))}
          </>
        )}
        {section === 'animals' && (
          <>
            {HOMES.map((h) => (
              <g
                key={h.id}
                role="button"
                tabIndex={0}
                className="habitat-target"
                aria-label={(bn ? h.bn : h.en) + (bn ? ' — এখানে রাখো' : ' — drop here')}
                onClick={() => {
                  if (keyboard) dispatch({ type: 'animal', animal: keyboard, home: h.id });
                }}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && keyboard) {
                    e.preventDefault();
                    dispatch({ type: 'animal', animal: keyboard, home: h.id });
                  }
                }}
              >
                <path
                  d={`M${h.x - 100} 265Q${h.x} 225 ${h.x + 100} 265L${h.x + 92} 382Q${h.x} 420 ${h.x - 92} 382Z`}
                  fill={h.colour}
                />
                {h.id === 'farm' ? (
                  <path
                    d={`M${h.x - 40} 275L${h.x} 245L${h.x + 40} 275V329H${h.x - 40}Z`}
                    fill="#d49c76"
                  />
                ) : h.id === 'jungle' ? (
                  <g>
                    <path d={`M${h.x} 330V265`} stroke="#795c42" strokeWidth="12" />
                    <circle cx={h.x} cy="265" r="42" fill="#437c58" />
                  </g>
                ) : (
                  <path
                    d={`M${h.x - 65} 290q20 -20 40 0t40 0t40 0M${h.x - 65} 315q20 -20 40 0t40 0t40 0`}
                    stroke="#e1f4ed"
                    strokeWidth="8"
                    fill="none"
                  />
                )}
                <text x={h.x} y="365" textAnchor="middle">
                  {bn ? h.bn : h.en}
                </text>
              </g>
            ))}
            {['cow', 'parrot', 'dolphin'].map((id, i) =>
              s.rescued.includes(id) ? (
                <g key={id}>{art(id, HOMES[i]!.x, 292, 84)}</g>
              ) : (
                <g key={id}>
                  {toy(
                    id,
                    (bn
                      ? { cow: 'গরু', parrot: 'তোতা', dolphin: 'ডলফিন' }
                      : {
                          cow: uiText('Cow'),
                          parrot: uiText('Parrot'),
                          dolphin: uiText('Dolphin'),
                        })[id]!,
                    140 + i * 220,
                    150,
                    112,
                  )}
                </g>
              ),
            )}
          </>
        )}
        {section === 'food' && (
          <>
            <ellipse cx="360" cy="325" rx="175" ry="92" fill="#fff9ee" />
            <ellipse
              cx="360"
              cy="325"
              rx="146"
              ry="70"
              fill="none"
              stroke="#d7c9ab"
              strokeWidth="4"
            />
            {s.foods.map((id, i) => (
              <g key={id}>
                {id === 'fruit' ? (
                  <svg x={245 + i * 42} y={285 + (i % 2) * 25} width="60" height="60">
                    <Fruit />
                  </svg>
                ) : (
                  art(id, 260 + i * 48, 310 + (i % 2) * 30, 66)
                )}
              </g>
            ))}
            {FOOD_TEAM.map(
              (id, i) =>
                !s.foods.includes(id) && (
                  <g key={id}>{toy(id, FOOD_LABELS[id]![lang], 100 + i * 130, 155, 92)}</g>
                ),
            )}
            <ellipse
              className="picnic-drop"
              cx="360"
              cy="325"
              rx="175"
              ry="92"
              fill="transparent"
              role="button"
              tabIndex={0}
              aria-label={bn ? 'পিকনিকের থালায় রাখো' : uiText('Serve on the picnic plate')}
              onClick={() => {
                if (keyboard) dispatch({ type: 'food', food: keyboard });
              }}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && keyboard) {
                  e.preventDefault();
                  dispatch({ type: 'food', food: keyboard });
                }
              }}
            />
          </>
        )}
        {section === 'exercise' && (
          <>
            <path d="M100 420Q360 360 620 420" stroke="#f3e6c9" strokeWidth="8" fill="none" />
            <g transform="translate(360 175) scale(1.25)">
              <Coach pose={DANCE_SEQUENCE[s.dance] ?? 3} complete={s.complete} />
            </g>
          </>
        )}
      </svg>
      <div className="learning-game-controls">
        {section === 'animals' && (
          <div className="animal-call-controls">
            {['cow', 'parrot', 'dolphin'].map((id) => (
              <button
                type="button"
                key={id}
                aria-pressed={sound === id}
                onClick={() => void hear(id)}
              >
                {bn
                  ? { cow: 'গরুর ডাক', parrot: 'তোতার ডাক', dolphin: 'ডলফিনের ডাক' }[id]
                  : uiText('Hear {v0}', { v0: String(id) })}
              </button>
            ))}
          </div>
        )}
        {section === 'space' && (
          <div className="moon-controls">
            <button
              type="button"
              onClick={() => dispatch({ type: 'moon', angle: s.angle - Math.PI / 12 })}
            >
              {bn ? 'চাঁদ বাঁয়ে' : uiText('Moon left')}
            </button>
            <span>
              {bn
                ? ['পূর্ণিমা খোঁজো', 'অমাবস্যা খোঁজো', 'অর্ধচন্দ্র খোঁজো', 'সব কলা পাওয়া গেছে'][
                    s.phaseGoal
                  ]
                : [
                    uiText('Find full moon'),
                    uiText('Find new moon'),
                    uiText('Find half moon'),
                    uiText('All phases found'),
                  ][s.phaseGoal]}
            </span>
            <button
              type="button"
              onClick={() => dispatch({ type: 'moon', angle: s.angle + Math.PI / 12 })}
            >
              {bn ? 'চাঁদ ডানে' : uiText('Moon right')}
            </button>
          </div>
        )}
        {section === 'food' && !s.complete && (
          <p className="nutrient-request">{uiText(FOOD_REQUESTS[s.foods.length]![lang])}</p>
        )}
        {section === 'exercise' && (
          <div className="dance-pads">
            {[0, 1, 2, 3].map((i) => (
              <button
                type="button"
                key={i}
                onClick={() => dispatch({ type: 'dance', pad: i })}
                aria-label={
                  bn
                    ? ['বাঁ হাত ওপরে', 'ডান হাত ওপরে', 'দুই হাত ওপরে', 'হাত নিচে'][i]
                    : [
                        uiText('Left hand up'),
                        uiText('Right hand up'),
                        uiText('Both hands up'),
                        uiText('Hands down'),
                      ][i]
                }
              >
                <svg viewBox="-100 -70 200 270">
                  <Coach pose={i} />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>
      <footer className="learning-consequence">
        <p aria-live="polite">{uiText(feedback[lang])}</p>
        <div className="game-progress">
          <span>
            {formatNumber(progress[0]!, language)} / {formatNumber(progress[1]!, language)}
          </span>
          <progress
            value={progress[0]}
            max={progress[1]}
            aria-label={bn ? 'খেলার অগ্রগতি' : uiText('Game progress')}
          />
        </div>
        {s.complete && (
          <button type="button" onClick={onChallenge}>
            {t('learnWorlds.challenge')}
          </button>
        )}
      </footer>
      <nav
        className="learning-cast"
        aria-label={bn ? 'বন্ধুকে প্রশ্ন করো' : uiText('Ask a character')}
      >
        {pack.characters.map((c) => (
          <button type="button" key={c.id} onClick={() => onMeet(c.id)}>
            {looks?.[`${pack.id}:${c.id}`]?.image ? (
              // Server-moderated session drawing; keep it visible when the call is pinned during play.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="learn-art learning-look"
                src={looks[`${pack.id}:${c.id}`]!.image}
                alt=""
              />
            ) : (
              <LearnArt id={c.id} />
            )}
            <span>{bn ? c.nameBn : c.name}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
