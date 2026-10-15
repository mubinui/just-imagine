// Regenerates the brand icon set (favicon, app icons, PWA icons, social preview)
// from the Dream Launch mark using the theme tokens in apps/web/app/globals.css.
// Run from the repo root: node scripts/make-icons.cjs
const path = require('path');
const sharp = require(
  require.resolve('sharp', { paths: [path.join(__dirname, '..', 'services', 'builder')] }),
);
const fs = require('fs');

const web = path.join(__dirname, '..', 'apps', 'web');
const T = { tile: '#245e4e', cloud: '#fff9ee', star: '#f7d76e', dots: '#f9ceb0' };

const body = `
<g fill="${T.dots}"><circle cx="33.2" cy="44.5" r="1.8"/><circle cx="36.4" cy="40" r="1.8"/><circle cx="39.6" cy="36.5" r="1.8"/><circle cx="42.8" cy="34" r="1.8"/><circle cx="46" cy="32.5" r="1.8"/><circle cx="49.2" cy="32" r="1.8"/><circle cx="52.4" cy="32.5" r="1.8"/><circle cx="55.6" cy="34" r="1.8"/><circle cx="58.8" cy="36.5" r="1.8"/></g>
<path d="M73 15.5 L76.41 24.31 L85.84 24.83 L78.52 30.79 L80.93 39.92 L73 34.8 L65.07 39.92 L67.48 30.79 L60.16 24.83 L69.59 24.31 Z" fill="${T.star}" stroke="${T.star}" stroke-width="3" stroke-linejoin="round"/>
<g fill="${T.cloud}"><circle cx="36" cy="60" r="13"/><circle cx="51" cy="53" r="16"/><circle cx="67" cy="61" r="12"/><rect x="23" y="61" width="56" height="13" rx="6.5"/><circle cx="26" cy="82" r="4.5"/><circle cx="17" cy="90" r="2.8"/></g>
<path d="M88 46 l1.9 4.1 4.1 1.9 -4.1 1.9 -1.9 4.1 -1.9-4.1 -4.1-1.9 4.1-1.9z" fill="${T.dots}"/>`;

// Small sizes drop the dots so the silhouette stays crisp.
const bodySmall = body.replace(/<g fill="#f9ceb0">.*?<\/g>\n/s, '');

const tile = (size, rx, small = false) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}"><rect x="0" y="0" width="100" height="100" rx="${rx}" fill="${T.tile}"/>${small ? bodySmall : body}</svg>`;
const maskable = (size) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108" width="${size}" height="${size}"><rect x="0" y="0" width="108" height="108" fill="${T.tile}"/><g transform="translate(21 21) scale(0.66)">${body}</g></svg>`;

const png = (svg, size) =>
  sharp(Buffer.from(svg), { density: 384 }).resize(size, size).png().toBuffer();

function ico(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  let offset = 6 + 16 * entries.length;
  const dirs = [],
    datas = [];
  for (const { size, buf } of entries) {
    const d = Buffer.alloc(16);
    d.writeUInt8(size >= 256 ? 0 : size, 0);
    d.writeUInt8(size >= 256 ? 0 : size, 1);
    d.writeUInt8(0, 2);
    d.writeUInt8(0, 3);
    d.writeUInt16LE(1, 4);
    d.writeUInt16LE(32, 6);
    d.writeUInt32LE(buf.length, 8);
    d.writeUInt32LE(offset, 12);
    offset += buf.length;
    dirs.push(d);
    datas.push(buf);
  }
  return Buffer.concat([header, ...dirs, ...datas]);
}

(async () => {
  fs.mkdirSync(path.join(web, 'public/icons'), { recursive: true });
  // SVG favicon (modern browsers) and a plain mark for reuse
  fs.writeFileSync(path.join(web, 'app/icon.svg'), tile(100, 22) + '\n');
  // favicon.ico: 16 and 32 without dots, 48 with dots
  const icoEntries = [];
  for (const [size, small] of [
    [16, true],
    [32, true],
    [48, false],
  ])
    icoEntries.push({ size, buf: await png(tile(size, 22, small), size) });
  fs.writeFileSync(path.join(web, 'app/favicon.ico'), ico(icoEntries));
  // Apple touch icon: full-bleed square, iOS applies its own mask
  fs.writeFileSync(path.join(web, 'app/apple-icon.png'), await png(tile(180, 0), 180));
  // PWA icons
  fs.writeFileSync(path.join(web, 'public/icons/icon-192.png'), await png(tile(192, 22), 192));
  fs.writeFileSync(path.join(web, 'public/icons/icon-512.png'), await png(tile(512, 22), 512));
  fs.writeFileSync(
    path.join(web, 'public/icons/icon-512-maskable.png'),
    await png(maskable(512), 512),
  );
  // Social preview: mark on cream with wordmark set later by the OG route; keep a plain 1200x630 mark card
  const og = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630"><rect width="1200" height="630" fill="${T.cloud}"/><g transform="translate(420 115) scale(4)"><rect x="0" y="0" width="100" height="100" rx="22" fill="${T.tile}"/>${body}</g></svg>`;
  fs.writeFileSync(
    path.join(web, 'public/icons/og-mark.png'),
    await sharp(Buffer.from(og), { density: 192 }).resize(1200, 630).png().toBuffer(),
  );
  for (const f of [
    'app/icon.svg',
    'app/favicon.ico',
    'app/apple-icon.png',
    'public/icons/icon-192.png',
    'public/icons/icon-512.png',
    'public/icons/icon-512-maskable.png',
    'public/icons/og-mark.png',
  ]) {
    const st = fs.statSync(path.join(web, f));
    const meta = f.endsWith('.png') ? await sharp(path.join(web, f)).metadata() : null;
    console.log(
      f.padEnd(36),
      String(st.size).padStart(7),
      'bytes',
      meta ? `${meta.width}x${meta.height}` : '',
    );
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
