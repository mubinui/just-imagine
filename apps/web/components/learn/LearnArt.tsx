import { ToothActor } from './ToothActor';
import { CinematicActor, hasCinematicArt } from './CinematicArt';
// Authored art for the Learning Worlds cast, in the same vocabulary as components/studio/CharacterArt:
// round shapes from the Dream Launch palette, ink eyes with a white glint that blink, peach
// cheeks, and a mouth whose open shape follows --mouth-open. Each piece has its own viewBox in
// the aspect of its physics body, so it sits on that body in the world.

const INK = '#243e36';
const CREAM = '#fff9ee';
const PEACH = '#f9ceb0';
const SUN = '#f7d76e';
const FOREST = '#245e4e';

type Art = { viewBox: string; draw: () => React.JSX.Element };

function Eyes({ cx = 50, y, dx, r }: { cx?: number; y: number; dx: number; r: number }) {
  return (
    <g>
      {[-1, 1].map((side) => (
        <g key={side} className={side < 0 ? 'eye eye-l' : 'eye eye-r'}>
          <ellipse cx={cx + side * dx} cy={y} rx={r} ry={r * 1.08} fill={INK} />
          <circle cx={cx + side * dx + r * 0.35} cy={y - r * 0.4} r={r * 0.3} fill="#fff" />
        </g>
      ))}
    </g>
  );
}
function Cheeks({ cx = 50, y, dx, r = 4.5 }: { cx?: number; y: number; dx: number; r?: number }) {
  return (
    <g className="cheek" fill={PEACH}>
      <circle cx={cx - dx} cy={y} r={r} />
      <circle cx={cx + dx} cy={y} r={r} />
    </g>
  );
}
function Mouth({ cx = 50, y, w }: { cx?: number; y: number; w: number }) {
  return (
    <g>
      <path
        className="mouth"
        d={`M${cx - w / 2} ${y} Q${cx} ${y + w * 0.55} ${cx + w / 2} ${y}`}
        fill="none"
        stroke={INK}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <g className="mouth-open">
        <path
          d={`M${cx - w / 2} ${y} Q${cx} ${y + 3} ${cx + w / 2} ${y} Q${cx + w / 2} ${y + w * 0.8} ${cx} ${y + w * 0.8} Q${cx - w / 2} ${y + w * 0.8} ${cx - w / 2} ${y}`}
          fill={INK}
        />
        <ellipse cx={cx} cy={y + w * 0.58} rx={w * 0.22} ry={w * 0.12} fill="#e58a9f" />
      </g>
    </g>
  );
}
function Face({
  cx = 50,
  y,
  dx = 11,
  r = 5.5,
  w = 12,
}: {
  cx?: number;
  y: number;
  dx?: number;
  r?: number;
  w?: number;
}) {
  return (
    <>
      <Eyes cx={cx} y={y} dx={dx} r={r} />
      <Cheeks cx={cx} y={y + r * 2} dx={dx + 7} />
      <Mouth cx={cx} y={y + r * 2.4} w={w} />
    </>
  );
}
function Sparkle({ x, y, s, fill = SUN }: { x: number; y: number; s: number; fill?: string }) {
  return (
    <path
      d={`M${x} ${y - s}Q${x} ${y} ${x + s} ${y}Q${x} ${y} ${x} ${y + s}Q${x} ${y} ${x - s} ${y}Q${x} ${y} ${x} ${y - s}Z`}
      fill={fill}
    />
  );
}

const planet = (
  body: string,
  shade: string,
  extra?: React.ReactNode,
  front?: React.ReactNode,
): Art => ({
  viewBox: '0 0 100 100',
  draw: () => (
    <>
      {extra}
      <circle cx="50" cy="50" r="40" fill={body} />
      <path d="M22 76 A40 40 0 0 0 88 62 A44 44 0 0 1 22 76Z" fill={shade} opacity="0.55" />
      <ellipse cx="34" cy="28" rx="10" ry="6" fill="#fff" opacity="0.35" />
      {front}
      <Face y={46} dx={13} r={5.5} w={13} />
    </>
  ),
});

const NEW_ART: Record<string, Art> = {
  lungs: {
    viewBox: '0 0 100 100',
    draw: () => (
      <>
        <path
          d="M47 18V44M53 18V44M50 38L30 56M50 38L70 56"
          stroke="#b45d6e"
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
        />
        <path d="M41 31C22 25 10 55 12 78Q14 93 42 84Z" fill="#efa2a6" />
        <path d="M59 31C78 25 90 55 88 78Q86 93 58 84Z" fill="#e78e9a" />
        <path
          d="M32 49L24 65M31 59L36 73M68 49L76 65M69 59L64 73"
          stroke="#c96b82"
          strokeWidth="2.5"
          fill="none"
        />
        <Face cx={29} y={59} dx={6} r={3} w={7} />
        <Face cx={71} y={59} dx={6} r={3} w={7} />
      </>
    ),
  },
  brain: {
    viewBox: '0 0 100 100',
    draw: () => (
      <>
        <path
          d="M44 83C29 92 17 83 17 71C3 64 8 45 17 41C11 24 29 12 40 18C47 7 63 11 67 20C83 14 96 30 87 43C99 55 92 75 81 76C76 91 60 91 53 83Z"
          fill="#bda1db"
        />
        <path
          d="M50 21V77M29 28Q17 42 34 46T28 69M70 30Q83 39 69 48T73 70M42 29Q30 35 43 53M58 31Q70 37 59 54"
          stroke="#8f73b5"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        <path d="M38 87L50 94L62 87L50 82Z" fill={FOREST} />
        <Face y={57} dx={12} r={5} w={12} />
      </>
    ),
  },
  stomach: {
    viewBox: '0 0 100 100',
    draw: () => (
      <>
        <path
          d="M53 7V31C73 15 95 29 88 53C85 73 65 86 43 83C24 79 19 66 8 79L5 68C18 50 32 64 42 59C51 55 40 39 40 27V7Z"
          fill="#f0b09b"
        />
        <path
          d="M61 29Q83 29 79 48"
          stroke="#ffdcca"
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
        />
        <Face cx={62} y={43} dx={10} r={4.5} w={11} />
      </>
    ),
  },
  bone: {
    viewBox: '0 0 100 100',
    draw: () => (
      <>
        <path
          d="M23 9C8 8 5 25 19 32L37 39V64L19 70C5 76 10 94 24 91L35 86Q50 98 64 86L76 91C91 94 96 76 81 70L64 64V39L81 32C96 25 91 8 77 9L65 15Q50 3 35 15Z"
          fill="#fff6db"
        />
        <path d="M38 38V65M62 38V65" stroke="#e3d6ae" strokeWidth="3" />
        <Face y={43} dx={8} r={4} w={10} />
        <path d="M27 73Q50 83 73 73" stroke={FOREST} strokeWidth="8" fill="none" />
      </>
    ),
  },
  milk: {
    viewBox: '0 0 100 100',
    draw: () => (
      <>
        <path d="M24 27L37 8H64L77 27V91H24Z" fill="#fffdf7" />
        <path d="M37 8V27H77L64 8Z" fill="#8ac9ba" />
        <path d="M24 27H77V38H24ZM24 77H77V91H24Z" fill={FOREST} />
        <path d="M45 48Q63 67 51 71Q39 69 45 48" fill="#91ccd5" />
        <Face y={46} dx={12} r={4.7} w={11} />
      </>
    ),
  },
  bean: {
    viewBox: '0 0 100 100',
    draw: () => (
      <>
        <path
          d="M67 8C89 15 94 54 79 78C68 96 39 101 23 84C4 63 15 38 34 40C49 42 34 24 45 13Q54 3 67 8Z"
          fill="#b36578"
        />
        <path
          d="M66 18Q85 42 69 66"
          fill="none"
          stroke="#dc9ca8"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <Face y={57} dx={11} r={5} w={12} />
        <path d="M31 91V98H43M63 91V98H75" stroke={FOREST} strokeWidth="6" strokeLinecap="round" />
      </>
    ),
  },
  rice: {
    viewBox: '0 0 100 100',
    draw: () => (
      <>
        <g fill="#fff8df">
          {[25, 39, 53, 67].map((x, i) => (
            <ellipse key={x} cx={x} cy={40 - (i % 2) * 5} rx="14" ry="9" />
          ))}
        </g>
        <path d="M11 44H89Q86 88 50 89Q14 88 11 44Z" fill="#b9d8c4" />
        <path d="M11 44H89" stroke={FOREST} strokeWidth="7" strokeLinecap="round" />
        <path
          d="M32 25Q24 19 32 9M52 24Q44 18 52 7M70 26Q62 20 70 10"
          stroke="#fff9ee"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        <Face y={59} dx={12} r={5} w={12} />
      </>
    ),
  },
  water: {
    viewBox: '0 0 100 100',
    draw: () => (
      <>
        <path d="M50 4C44 22 16 43 16 65A34 30 0 0 0 84 65C84 43 56 22 50 4Z" fill="#75cbdc" />
        <path
          d="M33 43Q23 55 26 66"
          stroke="#d8f7f2"
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
        />
        <Face y={57} dx={11} r={5} w={12} />
      </>
    ),
  },
  soap: {
    viewBox: '0 0 100 100',
    draw: () => (
      <>
        <rect x="12" y="33" width="76" height="53" rx="19" fill="#96d8c7" />
        <rect
          x="20"
          y="39"
          width="60"
          height="38"
          rx="14"
          fill="none"
          stroke="#bfe9da"
          strokeWidth="2"
        />
        <g fill="#ddf7ee" stroke="#96d8c7" strokeWidth="2">
          <circle cx="36" cy="25" r="12" />
          <circle cx="55" cy="17" r="11" />
          <circle cx="73" cy="28" r="9" />
        </g>
        <Face y={51} dx={13} r={5} w={13} />
      </>
    ),
  },
  tissue: {
    viewBox: '0 0 100 100',
    draw: () => (
      <>
        <path d="M32 46L27 16Q44 24 52 9Q61 26 76 21L66 47Z" fill="#fffdf7" />
        <path d="M9 48L25 38H77L91 48V89H9Z" fill="#f2b69a" />
        <path d="M9 48H91" stroke="#d78973" strokeWidth="3" />
        <Face y={59} dx={14} r={5.5} w={13} />
      </>
    ),
  },
  muscle: {
    viewBox: '0 0 100 100',
    draw: () => (
      <>
        <path
          d="M16 78Q12 59 31 35L25 18Q29 7 40 11L50 20L43 41Q66 33 80 50Q99 74 74 87Q47 98 16 78Z"
          fill="#ed9b91"
        />
        <path d="M44 55Q62 43 72 58" fill="none" stroke="#ca716d" strokeWidth="4" />
        <path d="M27 32L46 38" stroke={FOREST} strokeWidth="8" />
        <Face cx={57} y={61} dx={11} r={5} w={12} />
      </>
    ),
  },
  rest: {
    viewBox: '0 0 100 100',
    draw: () => (
      <>
        <path
          d="M19 46C5 23 32 11 45 27C58 6 88 25 78 41C105 50 92 79 75 74C65 95 40 85 37 79C16 91 0 62 19 46Z"
          fill="#e6d9ec"
        />
        <path d="M40 26Q55 0 78 17L70 35Z" fill={FOREST} />
        <circle cx="80" cy="17" r="7" fill={SUN} />
        <Face y={51} dx={12} r={5} w={12} />
      </>
    ),
  },
  moon: {
    viewBox: '0 0 100 100',
    draw: () => (
      <>
        <circle cx="50" cy="50" r="40" fill="#e6e3d5" />
        <g fill="#c5c5ba">
          <circle cx="27" cy="31" r="8" />
          <circle cx="72" cy="64" r="10" />
          <circle cx="36" cy="77" r="5" />
          <circle cx="68" cy="28" r="4" />
        </g>
        <Face y={46} dx={13} r={5.5} w={13} />
      </>
    ),
  },
  star: {
    viewBox: '0 0 100 100',
    draw: () => (
      <>
        <path
          d="M50 4Q55 4 65 30L93 36Q99 39 78 61L80 91Q78 97 50 80L20 92Q14 91 21 61L4 40Q1 34 34 30Z"
          fill={SUN}
        />
        <Face y={44} dx={12} r={5} w={12} />
      </>
    ),
  },
  galaxy: {
    viewBox: '0 0 100 100',
    draw: () => (
      <>
        <g transform="rotate(-18 50 50)" fill="none" strokeLinecap="round">
          <ellipse cx="50" cy="50" rx="46" ry="27" stroke="#9c89c5" strokeWidth="4" />
          <path
            d="M5 48C8 11 85 11 86 47C86 74 32 82 22 58C12 36 66 27 71 48C78 68 40 69 39 51"
            stroke="#c1addd"
            strokeWidth="8"
          />
        </g>
        <ellipse cx="50" cy="50" rx="22" ry="18" fill="#eed4bc" />
        <Face y={45} dx={8} r={3.5} w={8} />
      </>
    ),
  },
};

const ART: Record<string, Art> = {
  ...NEW_ART,
  sun: {
    viewBox: '0 0 100 100',
    draw: () => (
      <>
        <g fill="#ffb347">
          {Array.from({ length: 12 }, (_, i) => (
            <path
              key={i}
              d="M50 2 Q56 12 50 20 Q44 12 50 2Z"
              transform={`rotate(${i * 30} 50 50)`}
              opacity={i % 2 ? 0.75 : 1}
            />
          ))}
        </g>
        <circle cx="50" cy="50" r="33" fill={SUN} />
        <circle cx="50" cy="50" r="33" fill="none" stroke="#ffb347" strokeWidth="3" />
        <ellipse cx="38" cy="32" rx="8" ry="5" fill="#fff" opacity="0.45" />
        <Face y={47} dx={11} r={5} w={14} />
      </>
    ),
  },
  mercury: planet(
    '#b7b2aa',
    '#8f887e',
    <path
      d="M6 54 h18 M2 62 h16 M8 70 h12"
      stroke="#d6decb"
      strokeWidth="3"
      strokeLinecap="round"
    />,
    <>
      <circle cx="66" cy="30" r="5" fill="#9d978d" />
      <circle cx="30" cy="66" r="4" fill="#9d978d" />
      <path d="M14 44 Q50 36 86 44" fill="none" stroke="#e8645a" strokeWidth="4" opacity="0.8" />
    </>,
  ),
  venus: planet(
    '#f2d59a',
    '#d9ad61',
    undefined,
    <>
      <path
        d="M14 38 Q36 28 56 38 T90 36"
        fill="none"
        stroke="#fff6dc"
        strokeWidth="5"
        opacity="0.8"
        strokeLinecap="round"
      />
      <path
        d="M16 62 Q40 52 62 62 T88 60"
        fill="none"
        stroke="#fff6dc"
        strokeWidth="4"
        opacity="0.6"
        strokeLinecap="round"
      />
      <path
        d="M34 36 l-3 -5 M40 34 l-1 -6 M60 34 l1 -6 M66 36 l3 -5"
        stroke={INK}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </>,
  ),
  earth: planet(
    '#5aa9d6',
    '#3f86b6',
    undefined,
    <>
      <path d="M22 36 Q30 24 44 28 Q46 40 34 44 Q26 48 22 36Z" fill="#6fbf73" />
      <path d="M60 58 Q72 50 82 58 Q80 72 68 74 Q58 70 60 58Z" fill="#6fbf73" />
      <path d="M26 66 Q34 60 40 68 Q34 76 26 66Z" fill="#6fbf73" />
      <path
        d="M58 22 Q70 18 78 26"
        fill="none"
        stroke="#fff"
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.8"
      />
    </>,
  ),
  mars: planet(
    '#d9774f',
    '#ad5434',
    undefined,
    <>
      <circle cx="70" cy="34" r="5" fill="#b85d3c" />
      <circle cx="28" cy="64" r="6" fill="#b85d3c" />
      <path d="M30 18 Q50 10 70 18 L66 24 Q50 18 34 24Z" fill={FOREST} />
    </>,
  ),
  jupiter: planet(
    '#e9b98a',
    '#c98d5b',
    undefined,
    <>
      <path d="M11 38 H89 M10 56 H90 M16 70 H84" stroke="#c98d5b" strokeWidth="5" opacity="0.7" />
      <ellipse cx="68" cy="66" rx="9" ry="5" fill="#c4553f" />
      <path d="M38 14 l4 6 4 -6 4 6 4 -6 4 6 4 -6 v8 H38Z" fill={SUN} />
    </>,
  ),
  saturn: {
    viewBox: '0 0 100 100',
    draw: () => (
      <>
        <ellipse
          cx="50"
          cy="56"
          rx="48"
          ry="13"
          fill="none"
          stroke="#d9c38a"
          strokeWidth="7"
          opacity="0.9"
        />
        <circle cx="50" cy="50" r="30" fill="#f1dca0" />
        <path d="M24 64 A30 30 0 0 0 78 58 A34 34 0 0 1 24 64Z" fill="#d9b768" opacity="0.6" />
        <path d="M22 42 H78" stroke="#e3c47c" strokeWidth="4" opacity="0.7" />
        <ellipse cx="38" cy="32" rx="7" ry="4" fill="#fff" opacity="0.4" />
        <path
          d="M6 56 Q50 80 94 56"
          fill="none"
          stroke="#efe0b0"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <Sparkle x={86} y={40} s={5} fill="#fff" />
        <Sparkle x={14} y={46} s={4} fill="#fff" />
        <path
          d="M40 30 l-3 -5 M45 28 l-1 -6 M55 28 l1 -6 M60 30 l3 -5"
          stroke={INK}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <Face y={46} dx={10} r={4.8} w={11} />
      </>
    ),
  },
  uranus: planet(
    '#9fe0de',
    '#6cbcbc',
    <ellipse
      cx="50"
      cy="50"
      rx="10"
      ry="48"
      fill="none"
      stroke="#cbeeea"
      strokeWidth="4"
      transform="rotate(-12 50 50)"
    />,
    <path d="M30 18 Q50 26 70 18" fill="none" stroke="#fff" strokeWidth="3" opacity="0.6" />,
  ),
  neptune: planet(
    '#4f74d8',
    '#3655ab',
    undefined,
    <>
      <path
        d="M16 40 Q40 32 64 42 T90 40"
        fill="none"
        stroke="#86a6f0"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <ellipse cx="66" cy="66" rx="8" ry="4" fill="#2f4a96" />
      <path
        d="M78 18 q6 4 4 12"
        fill="none"
        stroke="#cfe0ff"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </>,
  ),
  cow: {
    viewBox: '0 0 147 100',
    draw: () => (
      <>
        <rect x="30" y="78" width="10" height="20" rx="4" fill={CREAM} />
        <rect x="96" y="78" width="10" height="20" rx="4" fill={CREAM} />
        <ellipse cx="78" cy="62" rx="52" ry="26" fill={CREAM} />
        <path
          d="M60 44 Q72 36 80 48 Q70 60 60 44Z M96 66 q12 -10 18 4 q-8 10 -18 -4Z"
          fill="#3a3a3a"
        />
        <ellipse cx="78" cy="84" rx="9" ry="6" fill={PEACH} />
        <path
          d="M128 52 q14 6 10 22"
          fill="none"
          stroke={CREAM}
          strokeWidth="4"
          strokeLinecap="round"
        />
        <g>
          <path
            d="M12 26 Q4 16 10 10 Q16 18 22 22Z M50 26 Q58 16 52 10 Q46 18 40 22Z"
            fill="#e7d3a9"
          />
          <ellipse cx="31" cy="44" rx="25" ry="26" fill={CREAM} />
          <ellipse cx="31" cy="60" rx="19" ry="12" fill={PEACH} />
          <circle cx="25" cy="60" r="2" fill={INK} />
          <circle cx="37" cy="60" r="2" fill={INK} />
          <path d="M18 30 Q24 22 32 30" fill="#3a3a3a" />
          <Eyes cx={31} y={40} dx={9} r={4.5} />
          <path
            className="mouth"
            d="M26 66 Q31 69 36 66"
            fill="none"
            stroke={INK}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
      </>
    ),
  },
  sheep: {
    viewBox: '0 0 127 100',
    draw: () => (
      <>
        <rect x="40" y="76" width="8" height="22" rx="4" fill={INK} />
        <rect x="84" y="76" width="8" height="22" rx="4" fill={INK} />
        <g fill="#fffdf7">
          {[30, 50, 70, 90, 100].map((x, i) => (
            <circle key={x} cx={x + 6} cy={i % 2 ? 46 : 54} r="20" />
          ))}
          {[40, 62, 84].map((x) => (
            <circle key={x} cx={x + 6} cy="72" r="16" />
          ))}
        </g>
        <ellipse cx="28" cy="52" rx="20" ry="22" fill="#4a4a4a" />
        <path d="M10 44 q-10 2 -8 10 q8 2 12 -4Z M46 44 q10 2 8 10 q-8 2 -12 -4Z" fill="#4a4a4a" />
        <circle cx="28" cy="32" r="10" fill="#fffdf7" />
        <Eyes cx={28} y={50} dx={8} r={4} />
        <Cheeks cx={28} y={60} dx={11} r={3.5} />
        <Mouth cx={28} y={63} w={9} />
      </>
    ),
  },
  chicken: {
    viewBox: '0 0 100 100',
    draw: () => (
      <>
        <path d="M40 86 v10 M60 86 v10" stroke="#e59a3a" strokeWidth="4" strokeLinecap="round" />
        <ellipse cx="52" cy="62" rx="34" ry="28" fill={CREAM} />
        <path d="M80 50 q16 -10 12 14 q-8 -2 -12 -4Z" fill="#fffdf7" />
        <path
          d="M30 60 Q40 74 56 64"
          fill="none"
          stroke="#e7d9bd"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx="40" cy="36" r="22" fill={CREAM} />
        <path d="M30 16 q4 -10 10 -2 q4 -10 10 0 q6 -6 6 6Z" fill="#e8645a" />
        <path d="M20 38 l-12 4 12 4Z" fill="#f2a73b" />
        <path d="M24 48 q-2 8 4 8 q2 -6 -4 -8Z" fill="#e8645a" />
        <Eyes cx={40} y={34} dx={8} r={4} />
        <Cheeks cx={40} y={44} dx={11} r={3.5} />
      </>
    ),
  },
  horse: {
    viewBox: '0 0 110 100',
    draw: () => (
      <>
        <rect x="34" y="70" width="8" height="28" rx="4" fill="#9c6a3f" />
        <rect x="80" y="70" width="8" height="28" rx="4" fill="#9c6a3f" />
        <ellipse cx="64" cy="62" rx="36" ry="18" fill="#b98351" />
        <path d="M98 54 q12 8 6 30 q-6 -10 -10 -22Z" fill="#6d4a2d" />
        <path d="M30 64 Q22 40 28 20 L50 30 Q44 50 46 62Z" fill="#b98351" />
        <ellipse cx="26" cy="26" rx="16" ry="22" fill="#b98351" transform="rotate(-20 26 26)" />
        <ellipse cx="18" cy="40" rx="11" ry="9" fill="#d7a77a" />
        <path d="M24 6 l4 -6 4 8Z M36 10 l4 -6 2 9Z" fill="#9c6a3f" />
        <path d="M34 8 Q50 20 48 44 Q42 30 32 22Z" fill="#6d4a2d" />
        <Eyes cx={26} y={22} dx={7} r={3.6} />
        <path
          className="mouth"
          d="M14 44 Q18 47 22 44"
          fill="none"
          stroke={INK}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </>
    ),
  },
  lion: {
    viewBox: '0 0 143 100',
    draw: () => (
      <>
        <rect x="58" y="76" width="10" height="22" rx="5" fill="#e0a54f" />
        <rect x="108" y="76" width="10" height="22" rx="5" fill="#e0a54f" />
        <ellipse cx="88" cy="66" rx="44" ry="20" fill="#e9b35a" />
        <path
          d="M130 60 q12 -2 10 -16"
          fill="none"
          stroke="#e9b35a"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <circle cx="140" cy="42" r="5" fill="#a8622c" />
        <g fill="#c4762f">
          {Array.from({ length: 14 }, (_, i) => (
            <circle
              key={i}
              cx={44 + Math.cos((i / 14) * Math.PI * 2) * 30}
              cy={46 + Math.sin((i / 14) * Math.PI * 2) * 30}
              r="12"
            />
          ))}
        </g>
        <circle cx="44" cy="46" r="27" fill="#e9b35a" />
        <ellipse cx="44" cy="60" rx="14" ry="10" fill={CREAM} />
        <path d="M40 54 h8 l-4 5Z" fill={INK} />
        <Eyes cx={44} y={40} dx={10} r={4.8} />
        <Cheeks cx={44} y={52} dx={17} r={4} />
        <Mouth cx={44} y={62} w={10} />
      </>
    ),
  },
  elephant: {
    viewBox: '0 0 115 100',
    draw: () => (
      <>
        <rect x="42" y="72" width="14" height="26" rx="6" fill="#9aa8b0" />
        <rect x="80" y="72" width="14" height="26" rx="6" fill="#9aa8b0" />
        <ellipse cx="70" cy="56" rx="40" ry="28" fill="#aab8c0" />
        <path
          d="M108 50 q8 6 2 16"
          fill="none"
          stroke="#9aa8b0"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <ellipse cx="22" cy="38" rx="20" ry="24" fill="#c3cfd5" />
        <ellipse cx="22" cy="38" rx="13" ry="16" fill={PEACH} opacity="0.7" />
        <circle cx="40" cy="40" r="22" fill="#aab8c0" />
        <path d="M30 52 Q24 74 32 90 Q38 92 40 86 Q34 72 42 56Z" fill="#aab8c0" />
        <path
          d="M44 58 q6 8 2 14"
          fill="none"
          stroke={CREAM}
          strokeWidth="4"
          strokeLinecap="round"
        />
        <Eyes cx={42} y={36} dx={8} r={4} />
        <Cheeks cx={42} y={46} dx={13} r={3.6} />
      </>
    ),
  },
  monkey: {
    viewBox: '0 0 100 100',
    draw: () => (
      <>
        <path
          d="M74 70 q22 4 18 -20 q-2 -8 -8 -4"
          fill="none"
          stroke="#8a5a34"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <ellipse cx="50" cy="72" rx="22" ry="20" fill="#9c6a3f" />
        <ellipse cx="50" cy="76" rx="13" ry="12" fill="#e6c49a" />
        <circle cx="20" cy="38" r="11" fill="#9c6a3f" />
        <circle cx="80" cy="38" r="11" fill="#9c6a3f" />
        <circle cx="20" cy="38" r="6" fill="#e6c49a" />
        <circle cx="80" cy="38" r="6" fill="#e6c49a" />
        <circle cx="50" cy="38" r="26" fill="#9c6a3f" />
        <path
          d="M30 40 Q30 26 42 28 Q50 34 58 28 Q70 26 70 40 Q72 58 50 60 Q28 58 30 40Z"
          fill="#e6c49a"
        />
        <Eyes cx={50} y={38} dx={9} r={4.4} />
        <Mouth cx={50} y={50} w={11} />
      </>
    ),
  },
  parrot: {
    viewBox: '0 0 75 100',
    draw: () => (
      <>
        <path d="M30 80 L22 100 L34 96 L38 100 L42 82Z" fill="#3a7fd6" />
        <ellipse cx="38" cy="60" rx="20" ry="26" fill="#3cae5c" />
        <path d="M54 50 Q68 66 54 84 Q48 70 48 56Z" fill="#2f8c4a" />
        <ellipse cx="38" cy="66" rx="10" ry="14" fill={SUN} opacity="0.9" />
        <circle cx="36" cy="28" r="20" fill="#e8504a" />
        <path
          d="M30 8 q4 -8 12 -2"
          fill="none"
          stroke="#e8504a"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path d="M16 30 Q8 34 12 44 Q18 38 22 38Z" fill="#f2c94c" />
        <Eyes cx={38} y={26} dx={7} r={3.6} />
        <Cheeks cx={38} y={34} dx={11} r={3} />
      </>
    ),
  },
  dolphin: {
    viewBox: '0 0 200 100',
    draw: () => (
      <>
        <path d="M178 40 l18 -16 -4 24 4 22 -18 -14Z" fill="#5f8fb8" />
        <path d="M24 56 Q40 24 104 28 Q160 30 182 48 Q150 74 96 74 Q44 76 24 56Z" fill="#7aa9d1" />
        <path d="M40 60 Q90 74 150 60 Q120 72 80 72 Q52 70 40 60Z" fill="#dcecf6" />
        <path d="M100 30 l18 -22 6 26Z" fill="#5f8fb8" />
        <path d="M110 64 l12 18 4 -18Z" fill="#5f8fb8" />
        <path d="M24 56 l-14 2 14 4Z" fill="#7aa9d1" />
        <Eyes cx={50} y={46} dx={8} r={4.2} />
        <Cheeks cx={50} y={56} dx={12} r={3.4} />
        <Mouth cx={34} y={60} w={10} />
      </>
    ),
  },
  whale: {
    viewBox: '0 0 200 100',
    draw: () => (
      <>
        <path d="M168 44 q20 -24 30 -18 q-8 14 -20 26 q14 8 20 22 q-14 4 -30 -16Z" fill="#3f6fae" />
        <path d="M12 58 Q14 18 80 18 Q150 18 172 52 Q150 86 84 86 Q14 88 12 58Z" fill="#4f84c6" />
        <path d="M18 66 Q60 92 130 80 Q90 92 50 86 Q24 80 18 66Z" fill="#c6dbf0" />
        <path d="M30 70 h70 M36 76 h56" stroke="#9fbfe2" strokeWidth="3" strokeLinecap="round" />
        <path
          d="M70 18 q-4 -12 -12 -14 M70 18 q2 -12 10 -16"
          fill="none"
          stroke="#c6eef7"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <Eyes cx={44} y={48} dx={10} r={5} />
        <Cheeks cx={44} y={60} dx={16} r={4.5} />
        <Mouth cx={40} y={64} w={14} />
      </>
    ),
  },
  seal: {
    viewBox: '0 0 178 100',
    draw: () => (
      <>
        <path d="M150 70 l24 -10 -8 18 8 14 -24 -8Z" fill="#7d8790" />
        <path d="M20 66 Q24 34 70 38 Q130 40 156 70 Q120 92 70 90 Q24 90 20 66Z" fill="#949fa8" />
        <ellipse cx="50" cy="44" rx="30" ry="26" fill="#949fa8" />
        <path d="M74 80 q14 4 18 16 q-16 0 -22 -10Z" fill="#7d8790" />
        <ellipse cx="44" cy="54" rx="12" ry="8" fill="#c6ccd1" />
        <g stroke={INK} strokeWidth="1.4" strokeLinecap="round" opacity="0.7">
          <path d="M34 54 l-12 -2 M34 57 l-12 2 M54 54 l12 -2 M54 57 l12 2" />
        </g>
        <ellipse cx="44" cy="50" rx="4" ry="3" fill={INK} />
        <Eyes cx={44} y={38} dx={11} r={5} />
      </>
    ),
  },
  penguin: {
    viewBox: '0 0 70 100',
    draw: () => (
      <>
        <path d="M22 94 h10 l-4 -6Z M38 94 h10 l-4 -6Z" fill="#f2a73b" />
        <ellipse cx="35" cy="58" rx="26" ry="34" fill="#2e3a44" />
        <ellipse cx="35" cy="64" rx="17" ry="26" fill={CREAM} />
        <path
          d="M10 50 Q0 66 8 76 Q14 66 14 54Z M60 50 Q70 66 62 76 Q56 66 56 54Z"
          fill="#2e3a44"
        />
        <circle cx="35" cy="28" r="20" fill="#2e3a44" />
        <path d="M22 30 Q22 18 35 22 Q48 18 48 30 Q46 42 35 42 Q24 42 22 30Z" fill={CREAM} />
        <path d="M31 36 l4 5 4 -5Z" fill="#f2a73b" />
        <Eyes cx={35} y={30} dx={7} r={3.4} />
        <Cheeks cx={35} y={37} dx={10} r={3} />
      </>
    ),
  },
  // Scenery: no faces, but the stage lets them sway, drift or twinkle.
  haystack: {
    viewBox: '0 0 120 100',
    draw: () => (
      <>
        <path d="M6 98 Q8 30 60 10 Q112 30 114 98Z" fill="#e8c35e" />
        <path
          d="M20 90 q10 -30 6 -60 M44 96 q4 -40 8 -78 M76 96 q-2 -40 -8 -78 M98 92 q-8 -30 -8 -56"
          fill="none"
          stroke="#c99a35"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path d="M6 98 h108" stroke="#b58a2f" strokeWidth="4" />
      </>
    ),
  },
  barn: {
    viewBox: '0 0 300 330',
    draw: () => (
      <>
        <path d="M20 130 L150 20 L280 130 V328 H20Z" fill="#c4553f" />
        <path
          d="M6 136 L150 12 L294 136"
          fill="none"
          stroke={CREAM}
          strokeWidth="14"
          strokeLinejoin="round"
        />
        <path
          d="M20 130 L150 20 L280 130"
          fill="none"
          stroke="#8f3e2c"
          strokeWidth="5"
          opacity="0.4"
        />
        <circle cx="150" cy="100" r="22" fill={CREAM} />
        <circle cx="150" cy="100" r="15" fill="#8f3e2c" />
        <rect x="90" y="190" width="120" height="138" rx="6" fill={CREAM} />
        <path d="M98 198 L202 320 M202 198 L98 320" stroke="#c4553f" strokeWidth="10" />
        <rect
          x="98"
          y="198"
          width="104"
          height="122"
          fill="none"
          stroke="#c4553f"
          strokeWidth="8"
        />
        <rect x="40" y="170" width="34" height="34" rx="4" fill={CREAM} />
        <rect x="226" y="170" width="34" height="34" rx="4" fill={CREAM} />
      </>
    ),
  },
  cloud_farm: {
    viewBox: '0 0 240 100',
    draw: () => (
      <>
        <path
          d="M30 86 Q4 86 8 64 Q12 44 40 48 Q48 16 88 20 Q112 2 142 18 Q176 10 188 40 Q228 38 230 64 Q232 88 204 86Z"
          fill="#fff"
        />
        <path
          d="M30 86 Q60 92 204 86"
          fill="none"
          stroke="#dbe9f2"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <Eyes cx={118} y={54} dx={12} r={4.2} />
        <Cheeks cx={118} y={64} dx={20} r={4} />
        <Mouth cx={118} y={66} w={10} />
      </>
    ),
  },
  tree: {
    viewBox: '0 0 160 450',
    draw: () => (
      <>
        <path d="M66 450 Q70 300 60 180 L100 180 Q92 300 100 450Z" fill="#8a5a34" />
        <path
          d="M74 320 q-6 -30 0 -60 M88 400 q6 -30 0 -60"
          fill="none"
          stroke="#6d4528"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <g fill="#3f8a55">
          <ellipse cx="80" cy="120" rx="78" ry="70" />
          <ellipse cx="40" cy="170" rx="40" ry="34" />
          <ellipse cx="122" cy="168" rx="38" ry="32" />
        </g>
        <g fill="#5aa86a">
          <ellipse cx="62" cy="92" rx="34" ry="26" />
          <ellipse cx="110" cy="118" rx="26" ry="20" />
        </g>
        <g fill="#8a5a34">
          <ellipse cx="54" cy="196" rx="9" ry="11" />
          <ellipse cx="72" cy="202" rx="9" ry="11" />
        </g>
      </>
    ),
  },
  bush: {
    viewBox: '0 0 200 120',
    draw: () => (
      <>
        <g fill="#3f8a55">
          <ellipse cx="50" cy="80" rx="48" ry="40" />
          <ellipse cx="110" cy="62" rx="56" ry="56" />
          <ellipse cx="160" cy="84" rx="40" ry="36" />
        </g>
        <g fill="#5aa86a">
          <ellipse cx="96" cy="44" rx="26" ry="18" />
          <ellipse cx="44" cy="66" rx="18" ry="12" />
        </g>
        <g fill="#e8645a">
          <circle cx="70" cy="70" r="5" />
          <circle cx="140" cy="60" r="5" />
          <circle cx="160" cy="90" r="5" />
        </g>
      </>
    ),
  },
  seaweed: {
    viewBox: '0 0 60 200',
    draw: () => (
      <>
        <path
          d="M30 200 Q10 160 30 120 Q50 80 30 40 Q22 20 30 0"
          fill="none"
          stroke="#3f9a6a"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M30 120 q-20 -10 -24 -30 M30 60 q20 -8 24 -28"
          fill="none"
          stroke="#5ab884"
          strokeWidth="8"
          strokeLinecap="round"
        />
      </>
    ),
  },
  rock: {
    viewBox: '0 0 200 120',
    draw: () => (
      <>
        <path d="M8 118 Q2 60 50 40 Q90 6 140 30 Q196 50 192 118Z" fill="#7d8b8f" />
        <path
          d="M40 60 Q80 40 120 50"
          fill="none"
          stroke="#a7b3b5"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M150 70 q10 10 4 30"
          fill="none"
          stroke="#66757a"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </>
    ),
  },
  star_left: {
    viewBox: '0 0 100 100',
    draw: () => <Sparkle x={50} y={50} s={46} />,
  },
  star_right: {
    viewBox: '0 0 100 100',
    draw: () => <Sparkle x={50} y={50} s={46} fill="#fff6d0" />,
  },
  // Body, food, hygiene and exercise cast.
  heart: {
    viewBox: '0 0 100 100',
    draw: () => (
      <>
        <path
          d="M50 90 Q8 62 10 34 Q12 12 32 12 Q44 12 50 24 Q56 12 68 12 Q88 12 90 34 Q92 62 50 90Z"
          fill="#e8645a"
        />
        <ellipse cx="30" cy="28" rx="8" ry="5" fill="#fff" opacity="0.4" />
        <Face y={42} dx={12} r={5} w={12} />
      </>
    ),
  },
  carrot: {
    viewBox: '0 0 100 100',
    draw: () => (
      <>
        <path d="M44 22 Q36 4 46 2 Q50 12 50 20 Q56 4 64 8 Q58 18 54 24Z" fill="#3cae5c" />
        <path d="M30 26 Q50 16 70 26 Q66 70 50 98 Q34 70 30 26Z" fill="#f08a3a" />
        <path
          d="M36 62 h8 M58 50 h7 M40 78 h6"
          stroke="#c96a24"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <Face y={40} dx={9} r={4.4} w={10} />
      </>
    ),
  },
  tooth: { viewBox: '0 0 100 100', draw: () => <ToothActor /> },
  coach: {
    viewBox: '0 0 100 100',
    draw: () => (
      <>
        <path d="M24 100 Q26 72 50 70 Q74 72 76 100Z" fill={FOREST} />
        <path d="M44 72 L50 84 L56 72" fill="none" stroke={CREAM} strokeWidth="3" />
        <circle cx="50" cy="44" r="26" fill="#e3a578" />
        <path d="M24 38 Q26 16 50 16 Q74 16 76 38 Q64 28 50 30 Q36 28 24 38Z" fill="#4a3426" />
        <rect x="22" y="30" width="56" height="7" rx="3.5" fill="#e8645a" />
        <circle cx="72" cy="80" r="5" fill={SUN} />
        <path d="M72 80 L60 72" stroke={INK} strokeWidth="2" />
        <Face y={46} dx={10} r={4.6} w={12} />
      </>
    ),
  },
};

export function hasLearnArt(id: string): boolean {
  return hasCinematicArt(id) || Object.hasOwn(ART, id);
}

/** The art for a pack character, a piece of scenery or a teaser; nothing when none is authored. */
export function LearnArt({ id, title, thumb }: { id: string; title?: string; thumb?: boolean }) {
  const cinematic = hasCinematicArt(id);
  const art = Object.hasOwn(ART, id) ? ART[id] : undefined;
  if (!art && !cinematic) return null;
  const Draw = art?.draw;
  return (
    <svg
      className="char-art learn-art"
      viewBox={cinematic ? '0 0 100 100' : art!.viewBox}
      preserveAspectRatio="xMidYMax meet"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {cinematic ? <CinematicActor id={id} thumb={thumb} /> : Draw ? <Draw /> : null}
    </svg>
  );
}
