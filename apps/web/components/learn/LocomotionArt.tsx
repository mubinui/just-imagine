import type { MotionState } from '@just-imagine/engine/motion';
import { motionFrame, wheelAngle } from '@just-imagine/engine/motion';
import { LearnArt } from './LearnArt';

const CYCLES: Record<string, { habitat: string; row: number; kind: 'run' | 'swim' | 'fly' }> = {};
for (const [habitat, ids] of Object.entries({
  farm: ['cow', 'sheep', 'chicken', 'horse'],
  jungle: ['lion', 'elephant', 'monkey', 'parrot'],
  ocean: ['dolphin', 'whale', 'seal', 'penguin'],
}))
  ids.forEach((id, row) => {
    CYCLES[id] = {
      habitat,
      row,
      kind: habitat === 'ocean' ? 'swim' : id === 'parrot' ? 'fly' : 'run',
    };
  });

/** Real pose changes; mirroring and pitch follow travel, not a decorative loop. */
export function LocomotionArt({
  id,
  motion,
  size = 80,
  image,
}: {
  id: string;
  motion: MotionState;
  size?: number;
  image?: string;
}) {
  const cycle = CYCLES[id],
    frame = motion.moving ? motionFrame(motion, 6) : cycle?.kind === 'run' ? 1 : 0;
  return (
    <g
      transform={`translate(${motion.x} ${motion.y})`}
      data-locomotion={cycle?.kind ?? 'none'}
      data-moving={motion.moving}
      data-frame={frame}
      data-facing={motion.facing}
      data-distance={motion.distance.toFixed(2)}
      pointerEvents="none"
    >
      {cycle?.kind === 'run' && (
        <ellipse cx="0" cy={size * 0.43} rx={size * 0.32} ry={size * 0.07} fill="#243e3633" />
      )}
      {cycle?.kind === 'swim' &&
        motion.moving &&
        [0, 1, 2].map((i) => (
          <circle
            key={i}
            cx={-motion.facing * (size * 0.4 + i * 9)}
            cy={(i % 2) * 7}
            r={2 + i}
            fill="none"
            stroke="#fff9eeb0"
            strokeWidth="1.5"
          />
        ))}
      <g
        transform={`rotate(${cycle?.kind === 'swim' || cycle?.kind === 'fly' ? (motion.tilt * 180) / Math.PI : 0}) scale(${motion.facing} 1)`}
      >
        <svg
          x={-size / 2}
          y={-size / 2}
          width={size}
          height={size}
          viewBox="0 0 100 100"
          overflow="hidden"
        >
          {image ? (
            <image href={image} width="100" height="100" />
          ) : cycle ? (
            <image
              href={`/learn/cinematic/animals-${cycle.habitat}-locomotion-v2.webp`}
              x={-frame * 100}
              y={-cycle.row * 100}
              width="600"
              height="400"
              preserveAspectRatio="none"
            />
          ) : (
            <LearnArt id={id} />
          )}
        </svg>
      </g>
    </g>
  );
}

/** Mechanical geometry: spokes rotate by the distance the rover actually travelled. */
export function Rover({ motion }: { motion: MotionState }) {
  const angle = (wheelAngle(motion, 12) * 180) / Math.PI;
  return (
    <g
      transform={`translate(${motion.x} ${motion.y})`}
      data-locomotion="roll"
      data-moving={motion.moving}
      data-distance={motion.distance.toFixed(2)}
      data-wheel-angle={angle.toFixed(2)}
      pointerEvents="none"
    >
      <ellipse cx="0" cy="25" rx="36" ry="6" fill="#543e3430" />
      <path d="M-31 1L-20 -17H17L31 2V15H-31Z" fill="#e2a36a" stroke="#725137" strokeWidth="2" />
      <path d="M-15 -12H12L20 0H-22Z" fill="#c7e5de" stroke="#725137" strokeWidth="2" />
      <path d="M4 -17V-31L20 -36" fill="none" stroke="#725137" strokeWidth="3" />
      <circle cx="20" cy="-36" r="5" fill="#fff9ee" />
      {[-22, 22].map((x) => (
        <g key={x} transform={`translate(${x} 15) rotate(${angle})`}>
          <circle r="12" fill="#243e36" />
          <circle r="8" fill="#f4dcc0" />
          <path d="M0 -7V7M-6 -3.5L6 3.5M-6 3.5L6 -3.5" stroke="#725137" strokeWidth="2" />
        </g>
      ))}
    </g>
  );
}
