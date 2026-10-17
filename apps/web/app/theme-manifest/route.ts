import { THEME_PALETTES, ThemeIdSchema } from '@just-imagine/protocol';
export function GET(request: Request) {
  const parsed = ThemeIdSchema.safeParse(new URL(request.url).searchParams.get('theme'));
  const theme = parsed.success ? parsed.data : 'forest';
  const palette = THEME_PALETTES[theme];
  const bangla = new URL(request.url).searchParams.get('lang') === 'bn';
  return Response.json(
    {
      id: '/',
      lang: bangla ? 'bn-BD' : 'en',
      name: bangla ? 'জাস্ট ইমাজিন' : 'Just Imagine',
      short_name: bangla ? 'জাস্ট ইমাজিন' : 'Just Imagine',
      description: bangla
        ? 'পরিবারের সঙ্গে কল্পনা, খেলা আর নতুন কিছু শেখার জায়গা।'
        : 'A playful family space for imagination and discovery.',
      start_url: '/',
      display: 'standalone',
      background_color: palette.ground,
      theme_color: palette.accent,
      icons: [
        { src: `/icons/themes/${theme}/icon-192.png`, sizes: '192x192', type: 'image/png' },
        { src: `/icons/themes/${theme}/icon-512.png`, sizes: '512x512', type: 'image/png' },
        {
          src: `/icons/themes/${theme}/maskable.png`,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
    },
    {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=3600',
      },
    },
  );
}
