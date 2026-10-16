// Paints the Learning Worlds backdrops as authored SVG and rasterizes them to WebP.
// Run from the repo root: node apps/web/scripts/make-learn-backdrops.mjs
// Output: apps/web/public/learn/backdrops/<packId>.{svg,webp}. The scenes are 16 by 9 world units
// at 120 px per unit, so entity positions from the packs map straight onto these canvases.
// Composition follows docs/art/world-design-principles.md: one magnet on a far third, three depths.
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', 'public', 'learn', 'backdrops');
// sharp is already a dependency of the api service; borrow it rather than add one to the web app.
const sharp = createRequire(join(here, '..', '..', '..', 'services', 'api', 'package.json'))(
  'sharp',
);
mkdirSync(out, { recursive: true });

const W = 1920;
const H = 1080;
const U = 120;

// Deterministic scatter so the art is reproducible.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}
const svg = (defs, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${defs}</defs>${body}</svg>`;

function space() {
  const r = rng(2026);
  const sun = { x: 2.5 * U, y: 4.5 * U };
  const planets = [
    [5.9, 4],
    [7, 5.5],
    [8.2, 3.4],
    [9.3, 5.9],
    [10.8, 2.4],
    [13.1, 5],
    [14.9, 1.9],
    [15, 7.6],
  ];
  const orbits = planets
    .map(([x, y]) => Math.hypot(x * U - sun.x, y * U - sun.y))
    .map(
      (radius) =>
        `<circle cx="${sun.x}" cy="${sun.y}" r="${radius.toFixed(1)}" fill="none" stroke="#fff9ee" stroke-opacity="0.16" stroke-width="2.5" stroke-dasharray="2 14" stroke-linecap="round"/>`,
    )
    .join('');
  let stars = '';
  for (let i = 0; i < 260; i++) {
    const x = r() * W,
      y = r() * H,
      size = 0.6 + r() * r() * 2.2;
    stars += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${size.toFixed(2)}" fill="#fff9ee" opacity="${(0.25 + r() * 0.6).toFixed(2)}"/>`;
  }
  let sparkles = '';
  for (let i = 0; i < 9; i++) {
    const x = 700 + r() * 1150,
      y = 60 + r() * 960,
      s = 7 + r() * 8;
    sparkles += `<path d="M${x} ${y - s}Q${x} ${y} ${x + s} ${y}Q${x} ${y} ${x} ${y + s}Q${x} ${y} ${x - s} ${y}Q${x} ${y} ${x} ${y - s}Z" fill="#f7d76e" opacity="0.75"/>`;
  }
  return svg(
    `<linearGradient id="sky" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="#122542"/><stop offset="1" stop-color="#1b1638"/></linearGradient>
     <radialGradient id="neb" cx="0.78" cy="0.42" r="0.55"><stop offset="0" stop-color="#7a5ab0" stop-opacity="0.55"/><stop offset="0.6" stop-color="#4a3a86" stop-opacity="0.2"/><stop offset="1" stop-color="#1b1638" stop-opacity="0"/></radialGradient>
     <radialGradient id="neb2" cx="0.9" cy="0.12" r="0.3"><stop offset="0" stop-color="#d27aa6" stop-opacity="0.28"/><stop offset="1" stop-color="#d27aa6" stop-opacity="0"/></radialGradient>
     <radialGradient id="glow" cx="${sun.x / W}" cy="${sun.y / H}" r="0.6"><stop offset="0" stop-color="#ffd27a" stop-opacity="0.55"/><stop offset="0.35" stop-color="#f7a94e" stop-opacity="0.18"/><stop offset="1" stop-color="#f7a94e" stop-opacity="0"/></radialGradient>
     <filter id="soft"><feGaussianBlur stdDeviation="40"/></filter>`,
    `<rect width="${W}" height="${H}" fill="url(#sky)"/>
     <rect width="${W}" height="${H}" fill="url(#neb)"/>
     <rect width="${W}" height="${H}" fill="url(#neb2)"/>
     <ellipse cx="1150" cy="520" rx="1100" ry="120" transform="rotate(-18 1150 520)" fill="#fff9ee" opacity="0.06" filter="url(#soft)"/>
     ${stars}${sparkles}
     <rect width="${W}" height="${H}" fill="url(#glow)"/>
     ${orbits}`,
  );
}

function farm() {
  const r = rng(7);
  let tufts = '';
  for (let i = 0; i < 70; i++) {
    const x = r() * W,
      y = 700 + r() * 240;
    tufts += `<path d="M${x} ${y}q4 -14 8 0q3 -10 7 0" fill="none" stroke="#4f9a55" stroke-width="3" stroke-linecap="round" opacity="${(0.4 + r() * 0.5).toFixed(2)}"/>`;
  }
  const fence = Array.from({ length: 22 }, (_, i) => {
    const x = 40 + i * 92;
    return `<rect x="${x}" y="760" width="14" height="96" rx="5" fill="#c99a6b"/>`;
  }).join('');
  return svg(
    `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fcfee"/><stop offset="0.62" stop-color="#d8eff0"/><stop offset="1" stop-color="#eef6e4"/></linearGradient>
     <radialGradient id="sun" cx="0.86" cy="0.24" r="0.45"><stop offset="0" stop-color="#fff2c4" stop-opacity="0.95"/><stop offset="0.25" stop-color="#ffe7a0" stop-opacity="0.4"/><stop offset="1" stop-color="#ffe7a0" stop-opacity="0"/></radialGradient>`,
    `<rect width="${W}" height="${H}" fill="url(#sky)"/>
     <rect width="${W}" height="${H}" fill="url(#sun)"/>
     <g fill="#fff" opacity="0.8"><ellipse cx="300" cy="140" rx="90" ry="26"/><ellipse cx="350" cy="122" rx="60" ry="30"/><ellipse cx="1260" cy="90" rx="70" ry="20"/><ellipse cx="1300" cy="76" rx="44" ry="22"/></g>
     <path d="M0 600 Q240 520 520 590 T1060 570 T1560 560 T1920 590 V1080 H0Z" fill="#bfe0b0"/>
     <path d="M0 660 Q300 590 640 650 T1300 640 T1920 660 V1080 H0Z" fill="#9dd08f"/>
     <path d="M0 720 Q420 670 900 715 T1920 705 V1080 H0Z" fill="#7cbf73"/>
     <path d="M1500 760 Q1640 700 1700 640" fill="none" stroke="#e8d3a2" stroke-width="40" stroke-linecap="round" opacity="0.9"/>
     <g>${fence}<rect x="30" y="782" width="1880" height="12" rx="6" fill="#d7ab7c"/><rect x="30" y="818" width="1880" height="12" rx="6" fill="#d7ab7c"/></g>
     ${tufts}
     <path d="M0 952 Q480 936 960 950 T1920 948 V1080 H0Z" fill="#62a85f"/>
     <rect y="968" width="${W}" height="112" fill="#8d6a46"/>
     <path d="M0 968 h1920" stroke="#5a9a52" stroke-width="10"/>
     <g fill="#6f5236" opacity="0.6"><ellipse cx="260" cy="1020" rx="40" ry="8"/><ellipse cx="900" cy="1040" rx="60" ry="9"/><ellipse cx="1500" cy="1012" rx="46" ry="7"/></g>`,
  );
}

function jungle() {
  const r = rng(11);
  let vines = '';
  for (let i = 0; i < 9; i++) {
    const x = 760 + i * 140 + r() * 40,
      len = 160 + r() * 260;
    let leaves = '';
    for (let y = 30; y < len; y += 46)
      leaves += `<ellipse cx="${x + (y % 92 ? 12 : -12)}" cy="${y}" rx="14" ry="7" fill="#3f8a55" transform="rotate(${y % 92 ? 30 : -30} ${x} ${y})"/>`;
    vines += `<path d="M${x} 0 q${12 - r() * 24} ${len / 2} 0 ${len}" fill="none" stroke="#2f6b46" stroke-width="5"/>${leaves}`;
  }
  let grass = '';
  for (let i = 0; i < 60; i++) {
    const x = r() * 620,
      y = 820 + r() * 120;
    grass += `<path d="M${x} ${y}l6 -34l6 34" fill="#d9b45a" opacity="${(0.5 + r() * 0.5).toFixed(2)}"/>`;
  }
  return svg(
    `<linearGradient id="sky" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f8dc9d"/><stop offset="0.35" stop-color="#cfe6c0"/><stop offset="1" stop-color="#a8d6b8"/></linearGradient>
     <linearGradient id="shaft" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffbe0" stop-opacity="0.45"/><stop offset="1" stop-color="#fffbe0" stop-opacity="0"/></linearGradient>`,
    `<rect width="${W}" height="${H}" fill="url(#sky)"/>
     <circle cx="230" cy="250" r="110" fill="#ffe9a6" opacity="0.8"/>
     <path d="M0 1080 V700 Q200 640 420 600 Q560 500 700 470 Q760 440 860 470 Q980 380 1120 450 Q1260 360 1420 430 Q1600 360 1920 420 V1080Z" fill="#7fb894" opacity="0.8"/>
     <path d="M0 1080 V760 Q300 700 560 690 Q700 600 820 600 Q900 560 1010 600 Q1150 500 1300 580 Q1470 490 1650 560 Q1800 520 1920 560 V1080Z" fill="#5c9d72"/>
     <polygon points="980,0 1080,0 1260,1080 1060,1080" fill="url(#shaft)"/>
     <polygon points="1420,0 1490,0 1640,1080 1500,1080" fill="url(#shaft)" opacity="0.7"/>
     <path d="M0 790 Q260 760 520 800 Q680 840 860 960 L860 1080 H0Z" fill="#e2c271"/>
     ${grass}
     <path d="M1700 1080 Q1700 760 1820 700 Q1860 820 1920 820 V1080Z" fill="#3d7d55"/>
     ${vines}
     <path d="M0 950 Q520 930 980 948 T1920 944 V1080 H0Z" fill="#4f8f4f"/>
     <rect y="968" width="${W}" height="112" fill="#7a5a3a"/>
     <path d="M0 968 h1920" stroke="#4a8a4a" stroke-width="10"/>`,
  );
}

function ocean() {
  const r = rng(5);
  let bubbles = '';
  for (let i = 0; i < 40; i++) {
    const x = r() * W,
      y = r() * 920,
      s = 3 + r() * 9;
    bubbles += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${s.toFixed(1)}" fill="none" stroke="#e8fbff" stroke-width="2" opacity="${(0.25 + r() * 0.4).toFixed(2)}"/>`;
  }
  let ripples = '';
  for (let i = 0; i < 18; i++) {
    const x = r() * W,
      y = 985 + r() * 80;
    ripples += `<path d="M${x} ${y}q30 -8 60 0" fill="none" stroke="#d8bd84" stroke-width="4" stroke-linecap="round"/>`;
  }
  // Light rays converge on the whale, the scene's magnet on the left third.
  const rays = [-160, 40, 260, 520, 760]
    .map(
      (x, i) =>
        `<polygon points="${x + 120},0 ${x + 220},0 ${480 + i * 40},${740} ${400 + i * 30},${740}" fill="url(#ray)"/>`,
    )
    .join('');
  return svg(
    `<linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#86dcdc"/><stop offset="0.45" stop-color="#2c8db0"/><stop offset="1" stop-color="#16507a"/></linearGradient>
     <linearGradient id="ray" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.3"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>`,
    `<rect width="${W}" height="${H}" fill="url(#sea)"/>
     <path d="M0 26 Q120 6 240 26 T480 26 T720 26 T960 26 T1200 26 T1440 26 T1680 26 T1920 26 V0 H0Z" fill="#c9f2ef" opacity="0.8"/>
     ${rays}
     <path d="M0 1080 V820 Q160 760 300 800 Q420 720 560 790 L620 1080Z" fill="#1d6a86" opacity="0.6"/>
     <path d="M1300 1080 V840 Q1420 760 1560 820 Q1700 740 1920 800 V1080Z" fill="#1d6a86" opacity="0.6"/>
     ${bubbles}
     <path d="M0 958 Q480 930 960 952 T1920 946 V1080 H0Z" fill="#e9d3a0"/>
     ${ripples}
     <g fill="#f29b8a"><path d="M1060 960 q-6 -40 6 -60 q6 26 14 0 q8 30 -4 60Z"/><path d="M300 962 q-4 -30 8 -44 q4 20 12 2 q6 24 -6 42Z" fill="#f7c36b"/></g>`,
  );
}

// New destinations inherit the existing authored stage language and depth.
function learningRoom(kind) {
  const colours = {
    body: ['#417b8b', '#b4d6ce', '#d8c7ad'],
    hygiene: ['#75afba', '#d9eee5', '#d5c4a4'],
    food: ['#71a18a', '#e0e8bd', '#b8c68c'],
    exercise: ['#88b2ba', '#dce6c0', '#a1bf8c'],
  }[kind];
  const [far, near, floor] = colours;
  let props = '';
  if (kind === 'body')
    props =
      '<path d="M840 210Q960 120 1080 210L1080 350L1160 570L1080 610L1040 480L1040 950H965L960 680L955 950H880V480L840 610L760 570L840 350Z" fill="#e3eee8" opacity=".18"/><circle cx="960" cy="180" r="80" fill="#e3eee8" opacity=".18"/>';
  if (kind === 'hygiene')
    props =
      '<path d="M100 800H1820V950H100Z" fill="#e0e5da"/><rect x="170" y="260" width="390" height="340" rx="100" fill="#b4d9da"/><rect x="188" y="278" width="354" height="304" rx="86" fill="#dcefeb"/><path d="M1300 800V680Q1300 620 1390 620H1450V655H1390Q1340 655 1340 690V800" fill="none" stroke="#95b7b4" stroke-width="32"/><ellipse cx="1380" cy="823" rx="210" ry="34" fill="#97b4b0"/>';
  if (kind === 'food')
    props =
      '<path d="M0 690Q250 390 500 690T1000 690T1500 690T2000 690V1080H0Z" fill="#57856b" opacity=".45"/><path d="M0 890Q960 740 1920 890V1080H0Z" fill="#96ae72"/><path d="M0 1020Q960 800 1920 1020" stroke="#5e8b62" stroke-width="30" fill="none"/>';
  if (kind === 'exercise')
    props =
      '<path d="M0 710Q300 450 660 680T1300 650T1920 600V1080H0Z" fill="#82a777"/><ellipse cx="1000" cy="1020" rx="1000" ry="300" fill="#c6c89b"/><ellipse cx="1000" cy="1020" rx="760" ry="195" fill="none" stroke="#f7ecd1" stroke-width="8"/><path d="M200 400V780M440 400V780M200 415H440" stroke="#446e5d" stroke-width="24" fill="none" stroke-linecap="round"/>';
  return svg(
    `<linearGradient id="room" x2="0" y2="1"><stop stop-color="${far}"/><stop offset="1" stop-color="${near}"/></linearGradient>`,
    `<rect width="1920" height="1080" fill="url(#room)"/><path d="M0 900Q960 850 1920 900V1080H0Z" fill="${floor}"/>${props}<path d="M0 0H90V1080H0ZM1830 0H1920V1080H1830Z" fill="#245e4e" opacity=".12"/>`,
  );
}
const scenes = {
  body: () => learningRoom('body'),
  food: () => learningRoom('food'),
  hygiene: () => learningRoom('hygiene'),
  exercise: () => learningRoom('exercise'),
  space_galaxy: space,
  space,
  animals_farm: farm,
  animals_jungle: jungle,
  animals_ocean: ocean,
};
for (const [id, paint] of Object.entries(scenes)) {
  const text = paint();
  writeFileSync(join(out, `${id}.svg`), text);
  await sharp(Buffer.from(text))
    .webp({ quality: 82 })
    .toFile(join(out, `${id}.webp`));
  console.log(`painted ${id}`);
}
