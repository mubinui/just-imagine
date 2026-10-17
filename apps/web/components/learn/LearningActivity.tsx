'use client';
import { copy as uiText } from '../../lib/i18n/ui';
import { useEffect, useRef, useState } from 'react';
import { useLanguage, formatNumber } from '../../lib/i18n';
import { LearnArt } from './LearnArt';
import type { PublicActivity } from './types';

const GROUPS = [
  { id: 'carrot', en: 'Vegetables', bn: 'সবজি' },
  { id: 'star', en: 'Fruit', bn: 'ফল', fruit: true },
  { id: 'rice', en: 'Grains', bn: 'শস্য' },
  { id: 'bean', en: 'Protein', bn: 'প্রোটিন' },
  { id: 'milk', en: 'Dairy or fortified soy', bn: 'দুধ বা পুষ্টি যোগ করা সয়া' },
];
const MOVES = [
  ['Reach comfortably', 'আরাম করে হাত বাড়াও'],
  ['Wiggle your hands', 'হাত নাড়াও'],
  ['Move to your rhythm', 'নিজের তালে নড়ো'],
  ['Pause for a sip', 'পানি খাওয়ার বিরতি নাও'],
];
const DIGEST = [
  ['Mouth: chew food into smaller pieces.', 'মুখে চিবিয়ে খাবার ছোট হয়।'],
  ['Food pipe: muscles move food down.', 'খাদ্যনালির পেশি খাবার নামায়।'],
  ['Stomach: mix food with digestive juices.', 'পাকস্থলীতে পাচকরসের সঙ্গে খাবার মেশে।'],
  ['Small intestine: most nutrients are absorbed.', 'ক্ষুদ্রান্ত্রে বেশির ভাগ পুষ্টি শোষিত হয়।'],
];

/** Touch changes the demonstration itself. Completion reports authored context, never points. */
export function LearningActivity({
  activity,
  characterId,
  onComplete,
  onSound,
}: {
  activity: PublicActivity;
  characterId: string;
  onComplete: () => void;
  onSound?: () => void;
}) {
  const { language, t } = useLanguage();
  const bn = language === 'bn';
  const [step, setStep] = useState(0);
  const [angle, setAngle] = useState(0);
  const [parts, setParts] = useState<number[]>([]);
  const [scrubMs, setScrubMs] = useState(0);
  const [holding, setHolding] = useState(false);
  const [done, setDone] = useState(false);
  const [running, setRunning] = useState(false);
  const completed = useRef(false);
  const notify = useRef(onComplete);
  useEffect(() => {
    notify.current = onComplete;
  }, [onComplete]);
  function finish() {
    if (completed.current) return;
    completed.current = true;
    setDone(true);
    notify.current();
  }
  // The handwashing clock counts real active scrubbing time, including keyboard holds.
  useEffect(() => {
    if (!holding || activity.kind !== 'wash') return;
    let prior = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      const elapsed = now - prior;
      setScrubMs((v) => Math.min(20000, v + elapsed));
      prior = now;
    }, 100);
    return () => clearInterval(timer);
  }, [holding, activity.kind]);
  useEffect(() => {
    if (scrubMs >= 20000 && !completed.current) {
      completed.current = true;
      // Completion is a direct consequence of elapsed play, not derived rendering state.
      setDone(true);
      notify.current();
    }
  }, [scrubMs]);
  useEffect(() => {
    if (!running) return;
    const start = performance.now();
    const timer = setInterval(() => {
      setAngle((performance.now() - start) / 1000);
      if (performance.now() - start >= 6000 && !completed.current) {
        completed.current = true;
        setDone(true);
        notify.current();
      }
    }, 80);
    return () => clearInterval(timer);
  }, [running]);
  function selectPart(index: number, target: number) {
    const next = [...new Set([...parts, index])];
    setParts(next);
    if (next.length >= target) finish();
  }
  function trace(event: React.PointerEvent<SVGSVGElement>) {
    if (event.buttons !== 1) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const a = Math.atan2(
      event.clientY - rect.top - rect.height / 2,
      event.clientX - rect.left - rect.width / 2,
    );
    setAngle(a);
    setStep((v) => v + 1);
    if (step >= 12) finish();
  }
  const k = activity.kind;
  const title = bn ? activity.titleBn : activity.title;
  const explanation = bn ? activity.explanationBn : activity.explanation;
  return (
    <div className={`learning-play is-${k}`}>
      <h3>{uiText(title)}</h3>
      {k === 'orbit' && (
        <>
          <svg
            className="activity-diagram orbit-diagram"
            viewBox="0 0 320 170"
            aria-label={t('learnWorlds.orbitDiagram')}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              trace(e);
            }}
            onPointerMove={trace}
          >
            <ellipse
              cx="160"
              cy="85"
              rx="118"
              ry="60"
              fill="none"
              stroke="#c1b5de"
              strokeWidth="2"
              strokeDasharray="3 7"
            />
            <circle cx="160" cy="85" r="24" fill="#f7d76e" />
            <circle
              cx={160 + Math.cos(angle) * 118}
              cy={85 + Math.sin(angle) * 60}
              r="15"
              fill="#8bcbd4"
            />
            <path d="M157 77L169 85L157 93Z" fill="#9a661d" />
          </svg>
          <button
            type="button"
            className="activity-button"
            onClick={() => {
              setAngle((v) => v + Math.PI / 4);
              setStep((v) => v + 1);
              if (step >= 3) finish();
            }}
          >
            {t('learnWorlds.moveOrbit')}
          </button>
          <p className="play-instruction">{t('learnWorlds.orbitHint')}</p>
        </>
      )}
      {k === 'wash' && (
        <>
          <div className={`wash-demo ${holding ? 'is-scrubbing' : ''}`}>
            <svg viewBox="0 0 240 120" aria-hidden="true">
              <path
                d="M48 105V65L38 38Q35 25 45 25L62 56V17Q62 6 72 10L79 47V10Q79 0 90 5L96 47V18Q100 8 107 18L112 61Q124 37 132 47L124 93Q120 114 94 115Z"
                fill="#e6ac83"
              />
              <path
                d="M186 105V65L196 38Q199 25 189 25L172 56V17Q172 6 162 10L155 47V10Q155 0 144 5L138 47V18Q134 8 127 18L122 61Q110 37 102 47L110 93Q114 114 140 115Z"
                fill="#d28f66"
              />
              <g fill="#d8f5ea" opacity={0.35 + scrubMs / 30000}>
                {[60, 90, 120, 150, 180].map((x, i) => (
                  <circle key={x} cx={x} cy={70 + (i % 2) * 20} r={10 + (i % 3) * 3} />
                ))}
              </g>
            </svg>
            <strong>
              {formatNumber(Math.ceil((20000 - scrubMs) / 1000), language)}
              {uiText(' ')}
              {t('learnWorlds.seconds')}
            </strong>
          </div>
          <button
            type="button"
            className="activity-button"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              setHolding(true);
            }}
            onPointerUp={() => setHolding(false)}
            onPointerCancel={() => setHolding(false)}
            onBlur={() => setHolding(false)}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                setHolding(true);
              }
            }}
            onKeyUp={() => setHolding(false)}
            disabled={done}
          >
            {done ? t('learnWorlds.rinseDry') : t('learnWorlds.holdScrub')}
          </button>
          <p className="play-instruction">{t('learnWorlds.washHint')}</p>
        </>
      )}
      {k === 'brush' && (
        <>
          <div className="brush-demo" aria-label={t('learnWorlds.brushHint')}>
            {[0, 1, 2, 3].map((i) => (
              <button
                type="button"
                key={i}
                aria-pressed={parts.includes(i)}
                aria-label={t(
                  `learnWorlds.toothSides.${(['outside', 'inside', 'chewing', 'back'] as const)[i]!}`,
                )}
                onClick={() => selectPart(i, 4)}
                className={parts.includes(i) ? 'is-clean' : ''}
              >
                <LearnArt id="tooth" />
                <span>
                  {t(
                    `learnWorlds.toothSides.${(['outside', 'inside', 'chewing', 'back'] as const)[i]!}`,
                  )}
                </span>
              </button>
            ))}
          </div>
          <p className="play-instruction">{t('learnWorlds.brushHint')}</p>
        </>
      )}
      {k === 'plate' && (
        <>
          <div className="food-plate" aria-label={t('learnWorlds.plateHint')}>
            <svg viewBox="0 0 220 140" aria-hidden="true">
              <ellipse cx="110" cy="70" rx="98" ry="60" fill="#fffdf7" />
              <ellipse
                cx="110"
                cy="70"
                rx="82"
                ry="47"
                fill="none"
                stroke="#d6decb"
                strokeWidth="3"
              />
              {parts.map((i) => (
                <circle
                  key={i}
                  cx={70 + (i % 3) * 40}
                  cy={50 + Math.floor(i / 3) * 38}
                  r="16"
                  fill={['#e89a59', '#bf7d96', '#e5cf9a', '#9ac9a8', '#96c9d6'][i]}
                />
              ))}
            </svg>
          </div>
          <div className="food-choices">
            {GROUPS.map((g, i) => (
              <button
                type="button"
                key={g.id}
                onClick={() => selectPart(i, 5)}
                aria-pressed={parts.includes(i)}
              >
                {g.fruit ? (
                  <svg viewBox="0 0 100 100" aria-hidden="true">
                    <path d="M50 25C10 5 7 78 37 88Q50 81 63 88C93 78 90 5 50 25" fill="#d97970" />
                    <path d="M50 26Q45 7 66 8Q66 25 50 26" fill="#679d73" />
                  </svg>
                ) : (
                  <LearnArt id={g.id} />
                )}
                <span>{bn ? g.bn : g.en}</span>
              </button>
            ))}
          </div>
          <p className="play-instruction">{t('learnWorlds.plateHint')}</p>
        </>
      )}
      {k === 'listen' && (
        <>
          <div className="sound-waves" aria-hidden="true">
            {[20, 40, 62, 46, 80, 36, 54, 22, 66, 38, 20].map((h, i) => (
              <span key={i} style={{ height: h }} />
            ))}
          </div>
          <button
            type="button"
            className="activity-button"
            onClick={() => {
              onSound?.();
              finish();
            }}
          >
            {t('learnWorlds.hearCall')}
          </button>
          <p className="play-instruction">{t('learnWorlds.realSound')}</p>
        </>
      )}
      {(k === 'breathe' || k === 'pulse') && (
        <>
          <div className={`body-demo ${running ? 'is-running' : ''}`}>
            <div className={k === 'breathe' ? 'breathing-organ' : 'beating-organ'}>
              <LearnArt id={k === 'pulse' ? 'heart' : characterId} />
            </div>
            {k === 'pulse' && (
              <svg viewBox="0 0 300 140" aria-hidden="true">
                <path
                  d="M60 70C60 0 240 0 240 70S60 140 60 70"
                  fill="none"
                  stroke="#a6cabc"
                  strokeWidth="4"
                />
                {running && (
                  <circle
                    cx={150 + Math.cos(angle * 2) * 90}
                    cy={70 + Math.sin(angle * 2) * 52}
                    r="8"
                    fill="#da746b"
                  />
                )}
              </svg>
            )}
          </div>
          <button
            type="button"
            className="activity-button"
            onClick={() => {
              setRunning((v) => !v);
            }}
          >
            {running ? t('learnWorlds.pause') : t('learnWorlds.watchMove')}
          </button>
          <p className="play-instruction">
            {t(k === 'breathe' ? 'learnWorlds.breatheHint' : 'learnWorlds.pulseHint')}
          </p>
        </>
      )}
      {(k === 'digest' || k === 'signal' || k === 'assemble' || k === 'move') && (
        <>
          <svg
            className="activity-diagram journey-diagram"
            viewBox="0 0 320 135"
            aria-hidden="true"
          >
            <path
              d={
                k === 'assemble'
                  ? `M60 100L155 100L${155 + Math.cos((step % 4) * 0.5 - 1.8) * 90} ${100 + Math.sin((step % 4) * 0.5 - 1.8) * 90}`
                  : 'M35 70Q75 10 115 70T195 70T285 70'
              }
              fill="none"
              stroke={k === 'assemble' ? '#f5e6c4' : '#a4d4bf'}
              strokeWidth={k === 'assemble' ? 15 : 5}
              strokeLinecap="round"
            />
            {[0, 1, 2, 3].map((i) => (
              <g key={i}>
                <circle
                  cx={40 + i * 78}
                  cy="70"
                  r={i === step % 4 ? 18 : 11}
                  fill={i <= step ? '#f7d76e' : '#d6decb'}
                />
                {i === step % 4 && <circle cx={40 + i * 78} cy="70" r="5" fill="#245e4e" />}
              </g>
            ))}
          </svg>
          <p className="activity-observation">
            {k === 'digest'
              ? DIGEST[step % 4]![bn ? 1 : 0]
              : k === 'move'
                ? MOVES[step % 4]![bn ? 1 : 0]
                : t(
                    k === 'assemble'
                      ? 'learnWorlds.jointHint'
                      : characterId === 'tissue'
                        ? 'learnWorlds.sneezeHint'
                        : 'learnWorlds.signalHint',
                  )}
          </p>
          <button
            type="button"
            className="activity-button"
            onClick={() => {
              setStep((v) => v + 1);
              if (step >= 3) finish();
            }}
          >
            {t(k === 'move' ? 'learnWorlds.didMove' : 'learnWorlds.nextStep')}
          </button>
        </>
      )}
      {done && (
        <p className="activity-insight" role="status">
          {uiText(explanation)}
        </p>
      )}
    </div>
  );
}
