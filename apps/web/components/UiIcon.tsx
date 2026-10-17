import type { SVGProps } from 'react';

/** One rounded 24px control family. Character and scientific artwork stay separate. */
export const UI_PATHS = {
  home: 'M3 11 12 4l9 7M5 10v10h14V10M9 20v-6h6v6',
  gallery:
    'M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM4 16l5-5 4 4 3-3 5 5M16 8h.01',
  chevron: 'm6 9 6 6 6-6',
  mic: 'M9 6a3 3 0 0 1 6 0v5a3 3 0 0 1-6 0V6ZM5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7',
  micOff:
    'm3 3 18 18M9 9v2a3 3 0 0 0 5.1 2.1M9.6 4.2A3 3 0 0 1 15 6v3M5.5 11A6.5 6.5 0 0 0 16 16M18.5 11a6.4 6.4 0 0 1-.7 3M12 17.5V21M8.5 21h7',
  game: 'M7.5 6.5h9c1.9 0 3.2 1.3 3.6 3.2l1.2 6c.4 2.1-2 3.5-3.5 1.9L15.4 15H8.6l-2.4 2.6c-1.5 1.6-3.9.2-3.5-1.9l1.2-6c.4-1.9 1.7-3.2 3.6-3.2ZM8 9.5V13M6.25 11.25h3.5M16.4 10.5a.4.4 0 1 0-.8 0 .4.4 0 0 0 .8 0ZM18.4 12.75a.4.4 0 1 0-.8 0 .4.4 0 0 0 .8 0Z',
  book: 'M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1ZM12 6v14M6 9h3M6 12h3M15 9h3M15 12h3',
  paw: 'M9 15c-1.8 1.6-3 3.1-2 4.5s3 .2 5 .2 4 1.2 5-.2-.2-2.9-2-4.5a4 4 0 0 0-6 0ZM7.5 8a1.5 2 0 1 0 3 0 1.5 2 0 0 0-3 0ZM13.5 8a1.5 2 0 1 0 3 0 1.5 2 0 0 0-3 0ZM3 12a1.5 2 0 1 0 3 0 1.5 2 0 0 0-3 0ZM18 12a1.5 2 0 1 0 3 0 1.5 2 0 0 0-3 0Z',
  close: 'm6 6 12 12M18 6 6 18',
  back: 'm10 6-6 6 6 6M4 12h16',
  restart: 'M4 11a8 8 0 1 1 2 6M4 4v7h7',
  captions:
    'M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2ZM10 10a2.5 2.5 0 1 0 0 4M17 10a2.5 2.5 0 1 0 0 4',
  finish: 'M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M4 12h11m-4-4 4 4-4 4',
  stop: 'M7 6h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z',
  chat: 'M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6 3V6a2 2 0 0 1 2-2ZM7 9h10M7 13h6',
} as const;
export type UiIconName = keyof typeof UI_PATHS;
export function UiIcon({ name, ...props }: { name: UiIconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d={UI_PATHS[name]} />
    </svg>
  );
}
