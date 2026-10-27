'use client';
import { copy as uiText } from '../lib/i18n/ui';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { paths } from '@just-imagine/protocol';
import { useLanguage } from '../lib/i18n';
import { firebase } from '../lib/firebase';
import { env } from '../lib/env';
import { badgeState, clearBuild, currentBuild, onBuildChange, type Build } from '../lib/building';
import { isPermissionDenied } from '../lib/permission-denied';
import { CharacterArt } from './studio/CharacterArt';
import { UiIcon } from './UiIcon';

type WorldStatus = 'building' | 'ready' | 'failed' | undefined;

/**
 * A small corner badge on the child screens while a world the child asked for is still being
 * made. It follows the world document (which appears with the first playable draft) and opens
 * the finished world in the Studio when tapped.
 */
export function BuildingBadge() {
  const { language } = useLanguage();
  const router = useRouter();
  const [build, setBuild] = useState<Build>();
  const [status, setStatus] = useState<WorldStatus>();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    // Restore the remembered build after hydration and follow later changes in this tab.
    const sync = () => {
      setBuild(currentBuild());
      setStatus(undefined);
    };
    sync();
    return onBuildChange(sync);
  }, []);
  useEffect(() => {
    if (!build || env.fake) return;
    let stop: (() => void) | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let active = true;
    const listen = () => {
      stop = onSnapshot(
        doc(firebase().db, paths.world(build.worldId)),
        (snap) => {
          const value = snap.get('status') as WorldStatus;
          if (active) setStatus(value);
        },
        (error) => {
          stop?.();
          // The rules refuse a world that was never created (a killed build): forget it.
          if (isPermissionDenied(error)) {
            if (active) clearBuild();
            return;
          }
          // Otherwise listen again shortly.
          if (active) retry = setTimeout(listen, 5000);
        },
      );
    };
    listen();
    const clock = setInterval(() => setNow(Date.now()), 15000);
    return () => {
      active = false;
      stop?.();
      clearTimeout(retry);
      clearInterval(clock);
    };
  }, [build]);
  const state = badgeState(build, now, status);
  if (state === 'hidden' || !build) return null;
  const bn = language === 'bn';
  const copy = {
    making: bn ? 'তোমার খেলা তৈরি হচ্ছে…' : uiText('Making your game…'),
    slow: bn ? 'একটু বেশি সময় লাগছে' : uiText('Taking a little longer'),
    ready: bn ? 'তোমার খেলা তৈরি!' : uiText('Your game is ready!'),
    failed: bn ? 'খেলাটা শেষ হয়নি' : uiText('Your game could not finish'),
    open: bn ? 'স্টুডিওতে খোলো' : uiText('Open in Studio'),
    dismiss: bn ? 'বন্ধ করো' : uiText('Dismiss'),
  };
  const open = () => {
    if (state === 'ready') sessionStorage.setItem('ji-world', build.worldId);
    clearBuild();
    router.push('/studio');
  };
  return (
    <aside className="building-badge" data-state={state} aria-live="polite">
      <button type="button" className="building-badge-main" onClick={open}>
        <span className="building-badge-face" aria-hidden="true">
          <span className="building-badge-ring" />
          <CharacterArt id={build.characterId} action={state === 'ready' ? 'cheer' : 'build'} />
        </span>
        <span className="building-badge-copy">
          <strong>{copy[state]}</strong>
          <span>{copy.open}</span>
        </span>
      </button>
      {(state === 'ready' || state === 'failed' || state === 'slow') && (
        <button
          type="button"
          className="building-badge-close"
          aria-label={copy.dismiss}
          onClick={clearBuild}
        >
          <UiIcon name="close" />
        </button>
      )}
    </aside>
  );
}
