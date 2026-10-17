import sharp from 'sharp';

export function layerArtPrompt(description: string, background: string) {
  return `${description}. Render ONLY those sparse decorative elements as an overlay, in their final positions on a wide 16:9 canvas. At least 70% of the canvas must be flat pure ${background}, which will become transparent. No sky painting, landscape, trees, terrain, floor, unrelated objects, characters, text, glow covering the canvas or background scenery. Preserve the requested setting and colours. Do not fill empty space. Keep the entire original canvas; this is a separate transparent decoration above an already-painted world.`;
}

/** Keep placement and aspect ratio; a second opaque landscape is never a mid-layer. */
export async function processLayerArt(input: Buffer, chroma: 'magenta' | 'green') {
  const { data, info } = await sharp(input, { limitInputPixels: 4096 * 4096 })
    .resize(2048, 1152, { fit: 'cover' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let clear = 0;
  for (let i = 0; i < data.length; i += 4) {
    const distance =
      chroma === 'green'
        ? Math.hypot(data[i]!, 255 - data[i + 1]!, data[i + 2]!)
        : Math.hypot(255 - data[i]!, data[i + 1]!, 255 - data[i + 2]!);
    if (distance < 95) data[i + 3] = Math.round(data[i + 3]! * Math.max(0, (distance - 40) / 55));
    if (data[i + 3]! < 32) clear++;
  }
  if (clear / (info.width * info.height) < 0.6)
    throw new Error('Decorative layer must leave most of the backdrop transparent');
  if (clear / (info.width * info.height) > 0.9999)
    throw new Error('Decorative layer contains no visible artwork');
  return {
    webp: await sharp(data, { raw: info }).webp({ quality: 90 }).toBuffer(),
    width: info.width,
    height: info.height,
  };
}
