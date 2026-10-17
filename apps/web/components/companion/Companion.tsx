'use client';
import { useLanguage } from '../../lib/i18n';
import { copy as uiText, uiError } from '../../lib/i18n/ui';
/* eslint-disable @next/next/no-img-element -- Private, bounded data URLs are generated per child and cannot use the public image optimizer. */
import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CHILD_DESTINATIONS,
  ChildResponseSchema,
  CHARACTERS,
  type Companion,
  type ChildDestination,
  type ChildResponse,
} from '@just-imagine/protocol';
import { CharacterArt } from '../studio/CharacterArt';
import {
  getVoice,
  releaseVoice,
  ensureChildVoice,
  stopChildVoice,
  unlockChildVoice,
} from '../../lib/voice';
import { env } from '../../lib/env';
import { watchActor } from '../acting/clock';
import { avatarPresence } from './presence';
import { UiIcon, type UiIconName } from '../UiIcon';
import { BuildingBadge } from '../BuildingBadge';
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
  const avatar = useRef<HTMLImageElement>(null);
  const chibiImage = companion.kind === 'chibi' ? companion.image : undefined;
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
  useEffect(() => {
    const node = art.current,
      bitmap = avatar.current;
    if (!node || !bitmap || !chibiImage) return;
    let energy = 0,
      previous = 0;
    const stop = watchActor(bitmap, (elapsed, reduced) => {
      const input = Number(getComputedStyle(node).getPropertyValue('--mouth-open')) || 0;
      const pose = avatarPresence(energy, input, elapsed, elapsed - previous, reduced);
      previous = elapsed;
      energy = pose.energy;
      bitmap.style.transform = reduced
        ? 'none'
        : `translateY(-${pose.lift.toFixed(4)}%) scale(${pose.scaleX.toFixed(5)}, ${pose.scaleY.toFixed(5)})`;
    });
    return () => {
      stop();
      bitmap.style.removeProperty('transform');
    };
  }, [chibiImage]);
  return (
    <span
      ref={art}
      data-voice-character={companion.kind === 'preset' ? companion.characterId : undefined}
      data-companion-kind={companion.kind}
      className={`companion-art${speaking ? ' is-speaking' : ''}`}
      aria-hidden="true"
    >
      {companion.kind === 'chibi' ? (
        <img ref={avatar} src={companion.image} alt="" width={160} height={160} />
      ) : (
        <CharacterArt id={companion.characterId} />
      )}
    </span>
  );
}
export function CompanionProvider({ children }: { children: React.ReactNode }) {
  const { language } = useLanguage();
  const lastLanguage = useRef(language);
  useEffect(() => {
    if (lastLanguage.current !== language) {
      stopChildVoice();
    }
    lastLanguage.current = language;
  }, [language]);
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
    const offStatus = voice.subscribeStatus((next) => {
      setStatus(next);
      if (next === 'closed' || next === 'error') {
        setSpeaking(false);
        setCaption('');
      }
    });
    const offMouth = voice.audio.subscribeMouth((value) =>
      setSpeaking(
        value > 0.06 && voice.speakerId === (selected?.companion?.characterId ?? 'bhombol'),
      ),
    );
    const off = voice.subscribe((message) => {
      if (message.type === 'ready') sendScreen();
      if (message.type === 'navigate') router.push(CHILD_DESTINATIONS[message.destination]);
      if (message.type === 'characterState')
        setSpeaking(
          message.speaking && voice.speakerId === (selected?.companion?.characterId ?? 'bhombol'),
        );
      if (message.type === 'interrupted' || message.type === 'bye') setSpeaking(false);
      if (message.type === 'bye') setCaption(uiText('See you next time.'));
      if (message.type === 'transcript' && message.role === 'character' && !env.fake)
        setCaption(
          voice.speakerId === (selected?.companion?.characterId ?? 'bhombol') ? message.text : '',
        );
      if (message.type === 'error') setError(uiError(message.message));
    });
    return () => {
      off();
      offStatus();
      offMouth();
    };
  }, [pathname, router, language]);
  async function start() {
    if (!child) return;
    setError('');
    try {
      setStatus('connecting');
      if (!(await unlockChildVoice())) return;
      await ensureChildVoice(
        child,
        getVoice().session?.childId === child.id
          ? undefined
          : (sessionStorage.getItem('ji-world') ?? undefined),
      );
    } catch (e) {
      setError(
        e instanceof Error ? uiError(e) : uiText('Your friend could not connect. Try again.'),
      );
    }
  }
  const separateNavigation = Boolean(child && pathname !== '/studio');
  return (
    <CompanionContext.Provider value={{ child, speaking, caption, status, error, start }}>
      <div className={`child-shell${separateNavigation ? ' has-child-navigation' : ''}`}>
        {children}
        {separateNavigation && <BuildingBadge />}
        {separateNavigation && (
          <div className="child-appbar">
            <ChildNavigation />
            <CompanionMenu key={pathname} inline />
          </div>
        )}
      </div>
    </CompanionContext.Provider>
  );
}
export function ChildNavigation() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const destinations = [
    { id: 'studio', icon: 'game' },
    { id: 'learn', icon: 'book' },
    { id: 'stories', icon: 'chat' },
    { id: 'gallery', icon: 'gallery' },
  ] as const satisfies readonly { id: ChildDestination; icon: UiIconName }[];
  return (
    <nav className="child-navigation" aria-label={t('childNavigation.label')}>
      {destinations.map(({ id, icon }) => {
        const href = CHILD_DESTINATIONS[id];
        const active = pathname === href || pathname.startsWith(href + '/');
        return (
          <Link key={id} href={href} aria-current={active ? 'page' : undefined}>
            <UiIcon name={icon} />
            <span>{t(`childNavigation.${id === 'gallery' ? 'worlds' : id}`)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
export function CompanionMenu({ inline = false }: { inline?: boolean }) {
  const { t } = useLanguage();
  const { child, speaking, caption, status, error, start } = useContext(CompanionContext);
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null),
    firstAction = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
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
    if (open) firstAction.current?.focus();
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !panel.current?.contains(event.target) &&
        !trigger.current?.contains(event.target)
      )
        setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  const companion = child?.companion ?? {
    kind: 'preset' as const,
    characterId: 'bhombol' as const,
    name: CHARACTERS.bhombol.displayName,
  };
  if (!child) return null;
  const live = status === 'connected' || status === 'connecting' || status === 'reconnecting';
  return (
    <div className={inline ? 'companion-dock is-inline' : 'companion-dock'}>
      {open && (
        <section
          ref={panel}
          id="live-assistant-panel"
          className="companion-menu"
          aria-label={t('childNavigation.assistant')}
        >
          <div className="companion-greeting">
            <CompanionArt companion={companion} speaking={speaking} />
            <div>
              <h2>{t('childNavigation.assistantTitle', { name: companion.name })}</h2>
              <p>
                {uiText(companion.name)}
                {uiText(', your AI play friend')}
              </p>
            </div>
          </div>
          <p className="companion-invitation">
            {env.fake ? uiText('Choose where we go together.') : t('childNavigation.assistantHelp')}
          </p>
          {caption && (
            <p className="companion-caption" aria-live="polite">
              {uiText(caption)}
            </p>
          )}
          <div className="companion-voice">
            <span role="status">
              {env.fake
                ? uiText('Preview friend · tap to explore')
                : status === 'connected'
                  ? t('childNavigation.voiceActive')
                  : status === 'connecting' || status === 'reconnecting'
                    ? uiText('Connecting…')
                    : uiText('Microphone off')}
            </span>
            {!env.fake &&
              (status === 'connected' || status === 'connecting' || status === 'reconnecting' ? (
                <button ref={firstAction} type="button" onClick={stopChildVoice}>
                  {uiText('Stop talking')}
                </button>
              ) : (
                <button ref={firstAction} type="button" onClick={() => void start()}>
                  {uiText('Talk together')}
                </button>
              ))}
          </div>
          {error && <p role="alert">{uiText(error)}</p>}
          <Link className="companion-explorer" href="/play" onClick={() => setOpen(false)}>
            {t('childNavigation.chooseExplorer')}
            <DestinationArrow />
          </Link>
          <button
            ref={env.fake ? firstAction : undefined}
            type="button"
            className="companion-close"
            onClick={closeMenu}
          >
            {uiText('Close')}
          </button>
        </section>
      )}
      <button
        type="button"
        ref={trigger}
        className="companion-toggle"
        aria-expanded={open}
        aria-controls="live-assistant-panel"
        aria-label={`${t('childNavigation.assistant')}: ${uiText(companion.name)}`}
        data-live={live && !env.fake ? 'true' : undefined}
        onClick={() => setOpen(!open)}
      >
        <span className="companion-toggle-portrait">
          <CompanionArt companion={companion} speaking={speaking} />
        </span>
      </button>
    </div>
  );
}

function DestinationArrow() {
  return <UiIcon name="arrowRight" width="20" height="20" />;
}
