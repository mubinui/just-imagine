import { useId } from 'react';
import type { Section } from './types';

const PROPS = [
  'stone',
  'mars-rock',
  'coral',
  'plank',
  'nest',
  'bone',
  'star',
  'acorn',
  'water',
  'oxygen',
  'parcel',
  'sign',
  'ring',
  'wool',
  'food',
  'blanket',
  'telescope',
  'moon',
  'foam',
  'tissue',
  'bin',
  'signal',
  'battery',
  'rocket',
] as const;
export type GamePropId = (typeof PROPS)[number];
/** Original generated cutouts, kept inside their own atlas cell. Hit areas belong to the game. */
export function GameProp({
  id,
  x,
  y,
  size = 64,
  opacity = 1,
}: {
  id: GamePropId;
  x: number;
  y: number;
  size?: number;
  opacity?: number;
}) {
  const index = PROPS.indexOf(id);
  return (
    <foreignObject
      x={x - size / 2}
      y={y - size / 2}
      width={size}
      height={size}
      aria-hidden="true"
      pointerEvents="none"
      opacity={opacity}
      className={`game-prop prop-${id}`}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundImage: 'url(/learn/cinematic/learning-props-v1.webp)',
          backgroundSize: '600% 400%',
          backgroundPosition: `${(index % 6) * 20}% ${(Math.floor(index / 6) * 100) / 3}%`,
          pointerEvents: 'none',
        }}
      />
    </foreignObject>
  );
}
/** A quiet play surface, authored for each habitat, behind real interactive objects. */
export function GameSet({
  section,
  packId,
  kind,
  progress = 0,
}: {
  section: Section;
  packId: string;
  kind: string;
  progress?: number;
}) {
  const id = useId().replaceAll(':', '');
  const ocean = packId === 'animals_ocean',
    space = section === 'space';
  return (
    <g className="game-set" aria-hidden="true" pointerEvents="none">
      <defs>
        <radialGradient id={`${id}-ground`}>
          <stop
            stopColor={
              space ? '#152b54' : ocean ? '#0e6272' : section === 'body' ? '#9d6d72' : '#c2c69c'
            }
            stopOpacity=".72"
          />
          <stop
            offset="1"
            stopColor={space ? '#0a173a' : ocean ? '#063c54' : '#345342'}
            stopOpacity=".35"
          />
        </radialGradient>
        <linearGradient id={`${id}-wood`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#b28755" />
          <stop offset="1" stopColor="#705135" />
        </linearGradient>
      </defs>
      <ellipse cx="360" cy="243" rx="285" ry="166" fill={`url(#${id}-ground)`} />
      {kind === 'assemble' && (
        <>
          <path d="M120 320Q360 294 600 320L592 345Q360 324 128 345Z" fill={`url(#${id}-wood)`} />
          <path
            d="M137 344v41M583 344v41"
            stroke="#62472f"
            strokeWidth="13"
            strokeLinecap="round"
          />
          <path d="M150 326Q360 309 570 327" stroke="#e1b77a" strokeOpacity=".5" strokeWidth="2" />
        </>
      )}
      {space ? (
        <>
          <GameProp id="mars-rock" x={95} y={335} size={105} />
          <GameProp id="telescope" x={620} y={320} size={94} />
          <GameProp id="rocket" x={610} y={90} size={70} />
        </>
      ) : ocean ? (
        <>
          <GameProp id="coral" x={90} y={315} size={130} />
          <GameProp id="coral" x={640} y={345} size={110} />
        </>
      ) : section === 'body' ? (
        <>
          <GameProp id="oxygen" x={75} y={290} size={85} />
          <GameProp id="signal" x={645} y={280} size={80} />
        </>
      ) : section === 'hygiene' ? (
        <>
          <GameProp id="foam" x={100} y={325} size={112} />
          <GameProp id="water" x={638} y={290} size={85} />
        </>
      ) : section === 'food' ? (
        <>
          <GameProp id="food" x={80} y={300} size={105} />
          <GameProp id="water" x={640} y={315} size={80} />
        </>
      ) : section === 'exercise' ? (
        <>
          <GameProp id="battery" x={90} y={310} size={85} />
          <GameProp id="moon" x={640} y={300} size={85} />
        </>
      ) : (
        <>
          <GameProp id="nest" x={90} y={335} size={115} />
          <GameProp id="stone" x={640} y={330} size={95} />
        </>
      )}
      {progress > 0 && (
        <g className="game-step-arrival" key={progress}>
          {Array.from({ length: Math.min(6, Math.ceil(progress)) }, (_, i) => (
            <GameProp
              key={i}
              id={space ? 'star' : ocean ? 'water' : 'acorn'}
              x={292 + i * 28}
              y={26}
              size={26}
            />
          ))}
        </g>
      )}
    </g>
  );
}
