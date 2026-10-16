'use client';
/* eslint-disable @next/next/no-img-element -- Private, bounded data URLs are generated per child and cannot use the public image optimizer. */
import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  CHILD_DESTINATIONS,
  ChildResponseSchema,
  CHARACTERS,
  type Companion,
  type ChildDestination,
  type ChildResponse,
} from '@just-imagine/protocol';
import { CharacterArt } from '../studio/CharacterArt';
import { getVoice, releaseVoice, ensureChildVoice } from '../../lib/voice';
import { env } from '../../lib/env';
import '../../app/companion.css';

const CompanionContext = createContext<{
  child?: ChildResponse;
  speaking: boolean;
  caption: string;
  status: string;
  error: string;
  start: () => Promise<void>;
}>({ speaking: false, caption: '', status: 'idle', error: '', start: async () => {} });
export function CompanionArt({
  companion,
  speaking = false,
}: {
  companion: Companion;
  speaking?: boolean;
}) {
  const art = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const node = art.current;
    if (!speaking) {
      node?.style.setProperty('--mouth-open', '0');
      return;
    }
    const unsubscribe = getVoice().audio.subscribeMouth((value) =>
      node?.style.setProperty('--mouth-open', String(value)),
    );
    return () => {
      unsubscribe();
      node?.style.setProperty('--mouth-open', '0');
    };
  }, [speaking]);
  return (
    <span
      ref={art}
      data-voice-character={companion.kind === 'preset' ? companion.characterId : undefined}
      className={`companion-art${speaking ? ' is-speaking' : ''}`}
      aria-hidden="true"
    >
      {companion.kind === 'chibi' ? (
        <img src={companion.image} alt="" width={160} height={160} />
      ) : (
        <CharacterArt id={companion.characterId} />
      )}
    </span>
  );
}
export function CompanionProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(),
    router = useRouter();
  const [child, setChild] = useState<ChildResponse>(),
    [speaking, setSpeaking] = useState(false),
    [caption, setCaption] = useState(''),
    [status, setStatus] = useState('idle'),
    [error, setError] = useState('');
  // The shared child layout owns disposal. Route changes inside it keep the same microphone and Live session.
  useEffect(() => () => releaseVoice(), []);
  useEffect(() => {
    let selected: ChildResponse | undefined;
    try {
      selected = ChildResponseSchema.parse(JSON.parse(localStorage.getItem('ji-child') || 'null'));
    } catch {
      /* No explorer selected yet. */
    }
    queueMicrotask(() => {
      setChild(selected);
      setCaption('');
    });
    const voice = getVoice();
    const screen = Object.entries(CHILD_DESTINATIONS).find(
      ([, path]) => path === pathname || (path === '/learn' && pathname.startsWith('/learn/')),
    )?.[0] as ChildDestination | undefined;
    const sendScreen = () => {
      if (screen && voice.session && voice.status === 'connected')
        voice.send({ type: 'screen', destination: screen });
    };
    queueMicrotask(() => setStatus(voice.status));
    sendScreen();
    const offStatus = voice.subscribeStatus(setStatus);
    const offMouth = voice.audio.subscribeMouth((value) =>
      setSpeaking(
        value > 0.06 && voice.speakerId === (selected?.companion?.characterId ?? 'bhombol'),
      ),
    );
    const off = voice.subscribe((message) => {
      if (message.type === 'ready') sendScreen();
      if (message.type === 'navigate') router.push(CHILD_DESTINATIONS[message.destination]);
      if (message.type === 'characterState') setSpeaking(message.speaking);
      if (message.type === 'interrupted' || message.type === 'bye') setSpeaking(false);
      if (message.type === 'bye') setCaption('See you next time.');
      if (message.type === 'transcript' && message.role === 'character' && !env.fake)
        setCaption(message.text);
      if (message.type === 'error') setError(message.message);
    });
    return () => {
      off();
      offStatus();
    };
  }, [pathname, router]);
  async function start() {
    if (!child) return;
    setError('');
    try {
      await getVoice().unlockAudio();
      await ensureChildVoice(child, sessionStorage.getItem('ji-world') ?? undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Your friend could not connect. Try again.');
    }
  }
  return (
    <CompanionContext.Provider value={{ child, speaking, caption, status, error, start }}>
      {children}
      {pathname !== '/studio' && pathname !== '/stories' && !pathname.startsWith('/learn') && (
        <div className="companion-shelf">
          <CompanionMenu inline />
        </div>
      )}
    </CompanionContext.Provider>
  );
}
export function CompanionMenu({ inline = false }: { inline?: boolean }) {
  const { child, speaking, caption, status, error, start } = useContext(CompanionContext);
  const router = useRouter(),
    pathname = usePathname();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null),
    firstDestination = useRef<HTMLButtonElement>(null);
  const closeMenu = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (open && event.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    if (open) firstDestination.current?.focus();
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open]);
  const companion = child?.companion ?? {
    kind: 'preset' as const,
    characterId: 'bhombol' as const,
    name: CHARACTERS.bhombol.displayName,
  };
  if (!child) return null;
  const go = (destination: ChildDestination) => {
    setOpen(false);
    if (destination === 'studio') {
      void getVoice()
        .unlockAudio()
        .then(() => router.push(CHILD_DESTINATIONS[destination]));
    } else router.push(CHILD_DESTINATIONS[destination]);
  };
  return (
    <div className={inline ? 'companion-dock is-inline' : 'companion-dock'}>
      {open && (
        <section className="companion-menu" aria-label={`${companion.name}'s navigation`}>
          <div className="companion-greeting">
            <CompanionArt companion={companion} speaking={speaking} />
            <div>
              <h2>Where shall we go?</h2>
              <p>{companion.name}, your AI play friend</p>
            </div>
          </div>
          <p className="companion-invitation">
            {env.fake
              ? 'Choose where we go together.'
              : 'You can say “Show my saved worlds” or “Let’s make a game.”'}
          </p>
          {caption && (
            <p className="companion-caption" aria-live="polite">
              {caption}
            </p>
          )}
          <nav aria-label="Explore with your friend">
            <button
              ref={firstDestination}
              type="button"
              aria-current={pathname === '/studio' ? 'page' : undefined}
              onClick={() => go('studio')}
            >
              Our adventure <DestinationArrow />
            </button>
            <button
              type="button"
              aria-current={pathname === '/gallery' ? 'page' : undefined}
              onClick={() => go('gallery')}
            >
              Saved worlds <DestinationArrow />
            </button>
            <button
              type="button"
              aria-current={pathname === '/play' ? 'page' : undefined}
              onClick={() => go('play')}
            >
              Choose explorer <DestinationArrow />
            </button>
            <button
              type="button"
              aria-current={pathname.startsWith('/learn') ? 'page' : undefined}
              onClick={() => go('learn')}
            >
              Learning worlds <DestinationArrow />
            </button>
            <button
              type="button"
              aria-current={pathname === '/stories' ? 'page' : undefined}
              onClick={() => go('stories')}
            >
              Katha’s story room <DestinationArrow />
            </button>
          </nav>
          <div className="companion-voice">
            <span role="status">
              {env.fake
                ? 'Preview friend · tap to explore'
                : status === 'connected'
                  ? 'Listening · you can speak'
                  : status === 'connecting' || status === 'reconnecting'
                    ? 'Connecting…'
                    : 'Microphone off'}
            </span>
            {!env.fake &&
              (status === 'connected' ? (
                <button type="button" onClick={() => getVoice().end()}>
                  Stop talking
                </button>
              ) : (
                <button type="button" onClick={() => void start()}>
                  Talk together
                </button>
              ))}
          </div>
          {error && <p role="alert">{error}</p>}
          <button type="button" className="companion-close" onClick={closeMenu}>
            Close
          </button>
        </section>
      )}
      <button
        type="button"
        ref={trigger}
        className={inline ? 'dock-tile companion-toggle' : 'companion-toggle'}
        aria-expanded={open}
        aria-label={`Chat with ${companion.name}`}
        onClick={() => setOpen(!open)}
      >
        <CompanionArt companion={companion} speaking={speaking} />
        <svg className="companion-chat-mark" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-8l-5 3v-3H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
          <path d="M8 10h.01M12 10h.01M16 10h.01" />
        </svg>
      </button>
    </div>
  );
}

function DestinationArrow() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 12h15m-6-6 6 6-6 6" />
    </svg>
  );
}
