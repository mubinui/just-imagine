import type { CharacterId } from '@just-imagine/protocol';

// The incumbent cast shares a 100-unit optical frame, eye line and warm palette.
// Separate smile/open-mouth shapes keep speech readable at small sizes;
// CharacterFace supplies voice amplitude and emotion without layout changes.

const INK = '#243e36';
const CREAM = '#fff9ee';
const PEACH = '#f9ceb0';
const SUN = '#f7d76e';
const FOREST = '#245e4e';

function Eyes({ y = 52, dx = 11, r = 6 }: { y?: number; dx?: number; r?: number }) {
  return (
    <g>
      <g className="eye eye-l">
        <ellipse cx={50 - dx} cy={y} rx={r} ry={r * 1.08} fill={INK} />
        <circle cx={50 - dx + r * 0.35} cy={y - r * 0.4} r={r * 0.28} fill="#fff" />
      </g>
      <g className="eye eye-r">
        <ellipse cx={50 + dx} cy={y} rx={r} ry={r * 1.08} fill={INK} />
        <circle cx={50 + dx + r * 0.35} cy={y - r * 0.4} r={r * 0.28} fill="#fff" />
      </g>
    </g>
  );
}

function Cheeks({ y = 62, dx = 19 }: { y?: number; dx?: number }) {
  return (
    <g className="cheek" fill={PEACH}>
      <circle cx={50 - dx} cy={y} r="4.5" />
      <circle cx={50 + dx} cy={y} r="4.5" />
    </g>
  );
}

function Mouth({ y = 68, w = 14, color = INK }: { y?: number; w?: number; color?: string }) {
  return (
    <g>
      <path
        className="mouth"
        d={`M${50 - w / 2} ${y} Q50 ${y + 8} ${50 + w / 2} ${y}`}
        fill="none"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <g className="mouth-open">
        <path
          d={`M${50 - w / 2} ${y} Q50 ${y + 3} ${50 + w / 2} ${y} Q${50 + w / 2} ${y + 11} 50 ${y + 11} Q${50 - w / 2} ${y + 11} ${50 - w / 2} ${y}`}
          fill={color}
        />
        <path
          d={`M${50 - w / 4} ${y + 8} Q50 ${y + 5} ${50 + w / 4} ${y + 8} Q50 ${y + 12} ${50 - w / 4} ${y + 8}`}
          fill="#e58a9f"
        />
      </g>
    </g>
  );
}

function Star({ x, y, r, fill = SUN }: { x: number; y: number; r: number; fill?: string }) {
  const p = [0, 1, 2, 3, 4].flatMap((i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    const b = a + Math.PI / 5;
    return [
      `${(x + r * Math.cos(a)).toFixed(2)} ${(y + r * Math.sin(a)).toFixed(2)}`,
      `${(x + r * 0.45 * Math.cos(b)).toFixed(2)} ${(y + r * 0.45 * Math.sin(b)).toFixed(2)}`,
    ];
  });
  return <polygon points={p.join(' ')} fill={fill} />;
}

function Mishti() {
  return (
    <>
      <path d="M22 45 Q23 26 29 13 Q42 20 47 34 Z" fill={CREAM} />
      <path d="M78 45 Q77 26 71 13 Q58 20 53 34 Z" fill={CREAM} />
      <path d="M29 38 L32 22 L43 33 Z" fill={PEACH} />
      <path d="M71 38 L68 22 L57 33 Z" fill={PEACH} />
      <path
        d="M23 43 Q27 29 50 30 Q73 29 77 43 L82 57 L79 59 Q84 74 66 84 Q50 93 34 84 Q16 74 21 59 L18 57 Z"
        fill={CREAM}
      />
      <path d="M36 34 Q41 26 47 32 Q50 24 55 32" fill={CREAM} />
      <ellipse cx="50" cy="68" rx="17" ry="12" fill="#fff" />
      <path
        d="M44 86 q6 -4 12 0"
        stroke={PEACH}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <Eyes y={54} dx={12} r={5.8} />
      <Cheeks y={65} dx={20} />
      <path d="M47 64 L53 64 L50 68 Z" fill="#e58a9f" />
      <Mouth y={71} w={12} />
      <g stroke={INK} strokeWidth="1.6" strokeLinecap="round" opacity="0.8">
        <path d="M18 62 L31 64" />
        <path d="M18 70 L31 68" />
        <path d="M82 62 L69 64" />
        <path d="M82 70 L69 68" />
      </g>
      <g fill="#e58a9f">
        <path d="M77 24 Q64 10 64 24 Q64 32 77 27 Z" />
        <path d="M79 24 Q89 15 90 25 Q90 33 79 27 Z" />
        <circle cx="78" cy="25" r="3" fill="#c86a81" />
      </g>
    </>
  );
}

function Bhombol() {
  return (
    <>
      <path d="M32 34 Q15 28 11 48 Q6 74 22 78 Q31 79 32 60 Z" fill="#bd823b" />
      <path d="M68 34 Q85 28 89 48 Q94 74 78 78 Q69 79 68 60 Z" fill="#bd823b" />
      <path
        d="M17 48 Q13 65 21 69 M83 48 Q87 65 79 69"
        fill="none"
        stroke="#a86d31"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M21 51 Q21 27 42 26 Q43 20 50 23 Q57 20 60 27 Q79 29 79 51 L78 66 Q75 85 50 87 Q25 85 22 66 Z"
        fill="#e9b35a"
      />
      <path
        d="M43 29 Q47 25 50 29 Q54 26 58 30"
        fill="none"
        stroke="#f7d588"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <ellipse cx="50" cy="69" rx="17" ry="13" fill={CREAM} />
      <Eyes y={51} dx={12} r={5.8} />
      <path
        d="M33 40 q5 -4 10 0"
        stroke="#8c5a1e"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M57 40 q5 -4 10 0"
        stroke="#8c5a1e"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <ellipse cx="50" cy="62" rx="6.5" ry="4.6" fill={INK} />
      <Cheeks y={62} dx={22} />
      <Mouth y={72} w={14} />
      <path
        d="M48 63 Q50 65 52 63"
        fill="none"
        stroke="#fff9ee"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path d="M29 83 Q50 90 71 83 L69 91 Q50 97 31 91 Z" fill={FOREST} />
      <circle cx="50" cy="90" r="5" fill={SUN} />
    </>
  );
}

function Chandni() {
  return (
    <>
      <path d="M24 45 Q23 27 28 14 Q43 20 48 34 Z" fill="#b9c1ca" />
      <path d="M76 45 Q77 27 72 14 Q57 20 52 34 Z" fill="#b9c1ca" />
      <path d="M31 40 L31 23 L43 34 Z" fill={PEACH} />
      <path d="M69 40 L69 23 L57 34 Z" fill={PEACH} />
      <path
        d="M23 44 Q29 29 50 30 Q71 29 77 44 L81 58 L78 60 Q82 77 64 85 Q50 91 36 85 Q18 77 22 60 L19 58 Z"
        fill="#c9cfd6"
      />
      <path d="M33 65 Q38 60 50 66 Q62 60 67 65 Q67 83 50 85 Q33 83 33 65" fill={CREAM} />
      <g stroke="#9aa4ae" strokeWidth="3" strokeLinecap="round">
        <path d="M44 32 L46 38" />
        <path d="M50 30 L50 37" />
        <path d="M56 32 L54 38" />
      </g>
      <Eyes y={54} dx={12} r={5.6} />
      <path d="M47 64 L53 64 L50 67.5 Z" fill="#8a7f86" />
      <Mouth y={70} w={10} />
      <Cheeks y={65} dx={21} />
      <path
        d="M38 86 q12 8 24 0"
        stroke="#9aa4ae"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M53 86 A6 6 0 1 0 53 97 A5 5 0 0 1 53 86 Z" fill={SUN} />
      <g stroke="#77878c" strokeWidth="1.5" strokeLinecap="round">
        <path d="M19 63 L29 65 M19 70 L29 68 M81 63 L71 65 M81 70 L71 68" />
      </g>
    </>
  );
}

function Pori() {
  return (
    <>
      <ellipse
        cx="24"
        cy="54"
        rx="16"
        ry="24"
        fill="#8fd4ca"
        opacity="0.85"
        transform="rotate(-18 24 54)"
      />
      <ellipse
        cx="76"
        cy="54"
        rx="16"
        ry="24"
        fill="#8fd4ca"
        opacity="0.85"
        transform="rotate(18 76 54)"
      />
      <g fill="none" stroke="#5fb8ad" strokeWidth="1.6" strokeLinecap="round">
        <path d="M29 69 Q13 43 20 37 M71 69 Q87 43 80 37 M24 58 L16 52 M76 58 L84 52" />
      </g>
      <path d="M31 70 Q50 66 69 70 L75 94 Q50 100 25 94 Z" fill="#5fb8ad" />
      <path
        d="M38 74 L50 81 L62 74"
        fill="none"
        stroke={CREAM}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M23 48 Q22 23 50 24 Q78 23 77 48 L76 70 Q50 83 24 70 Z" fill="#4a2a1a" />
      <ellipse cx="50" cy="54" rx="26" ry="27" fill="#f4c9a8" />
      <path d="M24 48 Q22 24 50 25 Q77 23 76 47 Q62 43 53 33 Q45 46 24 48 Z" fill="#4a2a1a" />
      <circle cx="50" cy="22" r="9" fill="#4a2a1a" />
      <Star x={50} y={21} r={5.5} />
      <Eyes y={54} dx={10.5} r={5.2} />
      <Cheeks y={64} dx={18} />
      <Mouth y={68} w={12} />
      <path d="M76 85 L89 64" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <Star x={90} y={60} r={6} />
    </>
  );
}

function OnkoMama() {
  return (
    <>
      <path d="M18 96 Q22 77 39 77 L61 77 Q78 77 82 96 Z" fill={FOREST} />
      <ellipse cx="24" cy="56" rx="5" ry="7" fill="#b07a4c" />
      <ellipse cx="76" cy="56" rx="5" ry="7" fill="#b07a4c" />
      <path d="M35 75 L50 82 L65 75 L63 88 L50 84 L37 88 Z" fill={CREAM} />
      <ellipse cx="50" cy="54" rx="27" ry="28" fill="#b07a4c" />
      <path
        d="M24 48 Q19 26 39 26 Q43 20 54 24 Q80 22 76 48 L70 39 Q52 43 36 34 L29 48 Z"
        fill="#2e2320"
      />
      <g fill="none" stroke={INK} strokeWidth="2.6">
        <circle cx="40" cy="53" r="8.5" />
        <circle cx="60" cy="53" r="8.5" />
        <path d="M48.5 53 h3" />
        <path d="M31.5 52 L25 50" />
        <path d="M68.5 52 L75 50" />
      </g>
      <Eyes y={54} dx={10} r={3.8} />
      <path
        d="M40 66 Q44 61 50 64 Q56 61 60 66"
        stroke="#2e2320"
        strokeWidth="4.5"
        fill="none"
        strokeLinecap="round"
      />
      <Mouth y={71} w={12} />
      <Cheeks y={62} dx={19} />
      <path d="M33 89 L45 89 L45 96 L33 96 Z" fill={CREAM} />
      <path d="M39 85 V92" stroke={SUN} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="53" cy="91" r="1.7" fill={SUN} />
    </>
  );
}

function JaduKaka() {
  return (
    <>
      <path d="M17 96 Q20 79 37 78 L63 78 Q80 79 83 96 Z" fill={FOREST} />
      <path d="M38 79 L50 85 L62 79 L61 91 L50 86 L39 91 Z" fill={SUN} />
      <ellipse cx="24" cy="59" rx="5" ry="7" fill="#e8b58c" />
      <ellipse cx="76" cy="59" rx="5" ry="7" fill="#e8b58c" />
      <Star x={28} y={86} r={3.2} />
      <Star x={72} y={84} r={3.2} />
      <Star x={50} y={92} r={2.6} />
      <ellipse cx="50" cy="57" rx="27" ry="28" fill="#e8b58c" />
      <rect
        x="31"
        y="8"
        width="38"
        height="28"
        rx="4"
        fill={FOREST}
        stroke="#5b7c63"
        strokeWidth="1.5"
      />
      <rect x="31" y="27" width="38" height="7" fill={SUN} />
      <rect
        x="22"
        y="33"
        width="56"
        height="7"
        rx="3.5"
        fill={FOREST}
        stroke="#5b7c63"
        strokeWidth="1.5"
      />
      <path
        d="M34 45 Q39 41 44 44 M56 44 Q61 41 66 45"
        fill="none"
        stroke={INK}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Eyes y={54} dx={11} r={5} />
      <path
        d="M34 65 Q39 72 50 65 Q61 72 66 65 Q62 77 50 69 Q38 77 34 65 Z"
        stroke={INK}
        strokeWidth="1.5"
        fill={INK}
        strokeLinecap="round"
      />
      <Mouth y={74} w={10} />
      <Cheeks y={64} dx={19} />
      <path d="M86 50 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z" fill={SUN} />
      <path d="M12 60 l1.5 4 4 1.5 -4 1.5 -1.5 4 -1.5 -4 -4 -1.5 4 -1.5 Z" fill={PEACH} />
    </>
  );
}

const ART: Record<CharacterId, () => React.JSX.Element> = {
  mishti: Mishti,
  bhombol: Bhombol,
  chandni: Chandni,
  pori: Pori,
  onkomama: OnkoMama,
  jadukaka: JaduKaka,
};

export function CharacterArt({ id, title }: { id: CharacterId; title?: string }) {
  const Art = ART[id];
  return (
    <svg
      className="char-art"
      viewBox="0 0 100 100"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <Art />
    </svg>
  );
}
