'use client';
import { copy as uiText } from '../../lib/i18n/ui';
import '../../app/studio.css';
import '../../app/learn.css';
import { useCallback, useEffect, useState, type SetStateAction } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChildResponseSchema, type ChildResponse } from '@just-imagine/protocol';
import { useLanguage } from '../../lib/i18n';
import { CompanionMenu } from '../companion/Companion';
import { StageHeader } from '../studio/Dock';
import { getVoice } from '../../lib/voice';
import { PetShelf } from '../pets/PetShelf';
import { PetSlot } from '../pets/PetSlot';
import { Actor } from '../acting/Actor';
import { UiIcon } from '../UiIcon';
import { LearnArt } from './LearnArt';
import { LearnIcon, PointsBadge } from './parts';
import { buddyFor, doneIn, fetchLearn, readBuddy, writeBuddy, type LearnState } from './progress';
import type { LearnIsland, Section } from './types';
import { useFamilyCatalog } from '../../lib/catalog';

const ISLAND_ART: Record<Section, string> = {
  space: 'saturn',
  animals: 'lion',
  body: 'heart',
  food: 'carrot',
  hygiene: 'tooth',
  exercise: 'coach',
};

/** Reads the explorer the child picked on /play; the Learn screens share it with the Studio. */
export function useChild(): ChildResponse | undefined {
  const router = useRouter();
  const { language } = useLanguage();
  const [child, setChild] = useState<ChildResponse>();
  useEffect(() => {
    let parsed: ChildResponse | undefined;
    try {
      parsed = ChildResponseSchema.parse(JSON.parse(localStorage.getItem('ji-child') || 'null'));
    } catch {
      parsed = undefined;
    }
    if (!parsed) {
      router.replace('/play');
      return;
    }
    // Restore the selected explorer after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChild(parsed);
  }, [router, language]);
  return child;
}

export function useLearnState(child: ChildResponse | undefined) {
  const [request, setRequest] = useState(0);
  const [record, setRecord] = useState<{
    childId: string;
    request: number;
    state: LearnState;
    failed: boolean;
  }>();
  useEffect(() => {
    if (!child) return;
    let active = true;
    fetchLearn(child.id)
      .then((next) => {
        if (active) setRecord({ childId: child.id, request, state: next, failed: false });
      })
      .catch(() => {
        if (!active) return;
        setRecord({
          childId: child.id,
          request,
          state: { points: child.points ?? 0, pets: child.pets ?? [], progress: {} },
          failed: true,
        });
      });
    return () => {
      active = false;
    };
  }, [child, request]);
  const setState = useCallback(
    (update: SetStateAction<LearnState | undefined>) => {
      setRecord((previous) => {
        if (!child) return undefined;
        const current = previous?.childId === child.id ? previous : undefined;
        const next = typeof update === 'function' ? update(current?.state) : update;
        return next
          ? { childId: child.id, request, state: next, failed: current?.failed ?? false }
          : undefined;
      });
    },
    [child, request],
  );
  const retry = useCallback(() => setRequest((value) => value + 1), []);
  // A different explorer must never see the previous explorer's totals while its request loads.
  const current = child && record?.childId === child.id ? record : undefined;
  return {
    state: current?.state,
    setState,
    failed: current?.failed ?? false,
    loading: !current || current.request !== request,
    retry,
  };
}

function ProgressRing({ done, total }: { done: number; total: number }) {
  const r = 46,
    length = 2 * Math.PI * r,
    share = total ? done / total : 0;
  return (
    <svg className="island-ring" viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r={r} fill="none" className="track" strokeWidth="5" />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        className="arc"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={`${(share * length).toFixed(2)} ${length.toFixed(2)}`}
        transform="rotate(-90 50 50)"
      />
    </svg>
  );
}

function IslandBase({ section }: { section: Section }) {
  return (
    <svg className="island-base" viewBox="0 0 240 120" aria-hidden="true">
      <path
        d="M20 40 Q30 112 120 118 Q210 112 220 40Z"
        className="underside"
        data-section={section}
      />
      <path d="M70 70 Q120 100 170 70" fill="none" className="seam" strokeWidth="5" />
      <ellipse cx="120" cy="40" rx="104" ry="30" className="top" data-section={section} />
      <ellipse cx="120" cy="34" rx="88" ry="20" className="top-light" />
    </svg>
  );
}

export function LearnMap({ islands }: { islands: LearnIsland[] }) {
  const { language, t } = useLanguage();
  const child = useChild();
  const catalog = useFamilyCatalog(child);
  const { state, setState, failed, loading, retry } = useLearnState(child);
  const [shelf, setShelf] = useState(false);
  const learn = state ?? { points: child?.points ?? 0, pets: child?.pets ?? [], progress: {} };
  const buddy = child ? buddyFor(learn, readBuddy(child.id)) : undefined;
  return (
    <main className="stage learn-stage learn-map">
      <StageHeader title={t('learnWorlds.tile')} status={getVoice().status} />
      <div
        className="learn-map-content"
        tabIndex={0}
        role="region"
        aria-labelledby="learn-map-title"
      >
        <div className="learn-map-intro">
          <h2 id="learn-map-title">{t('learnWorlds.mapTitle')}</h2>
          <p>{t('learnWorlds.mapIntro')}</p>
        </div>
        {(loading || failed) && (
          <div className="learn-map-notice" role="status">
            <span>
              {t(loading ? 'learnWorlds.progressLoading' : 'learnWorlds.progressUnavailable')}
            </span>
            {failed && (
              <button type="button" onClick={retry} disabled={loading}>
                {t('retry')}
              </button>
            )}
          </div>
        )}
        <section className="islands" aria-label={t('learnWorlds.mapHint')}>
          {islands.map((island) => {
            const challenges = [
              ...new Set([
                ...island.challengeIds,
                ...catalog.packs
                  .filter((pack) => pack.section === island.section)
                  .flatMap((pack) => pack.challenges.map((challenge) => challenge.id)),
              ]),
            ];
            const total = challenges.length;
            const done = state && !failed ? doneIn(state, challenges) : 0;
            const name = t(`learnWorlds.sections.${island.section}`);
            const note = island.open
              ? done > 0
                ? t('learnWorlds.progress', { done, total })
                : t('learnWorlds.challengeCount', { total })
              : t('learnWorlds.comingSoon');
            const body = (
              <>
                <span className="island-figure">
                  {island.open && done > 0 && <ProgressRing done={done} total={total} />}
                  <span className="island-art">
                    <LearnArt id={ISLAND_ART[island.section]} />
                  </span>
                  <IslandBase section={island.section} />
                </span>
                <span className="island-copy">
                  <span className="island-name">{name}</span>
                  <span className="island-note">{note}</span>
                </span>
              </>
            );
            return island.open ? (
              <Link
                key={island.section}
                href={`/learn/${island.section}`}
                className="island is-open"
                aria-label={`${name}, ${note}`}
              >
                {body}
              </Link>
            ) : (
              <div key={island.section} className="island is-soon">
                {body}
              </div>
            );
          })}
        </section>
        <Link href="/stories" className="learn-story-room-link">
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <Actor id="katha" />
          </svg>
          <span>
            <strong>{language === 'bn' ? 'কথার গল্পঘর' : uiText('Katha’s story room')}</strong>
            <span>
              {language === 'bn'
                ? 'তোমার ভাবনা থেকে নতুন গল্প'
                : uiText('A new story from your imagination')}
            </span>
          </span>
          <UiIcon name="back" className="learn-story-arrow" />
        </Link>
      </div>
      <nav className="dock learn-dock" aria-label={t('learnWorlds.mapTitle')}>
        <div className="dock-friends">
          {child && <PetSlot childId={child.id} state={state} />}
          <PointsBadge
            points={learn.points}
            label={t('learnWorlds.pointsLabel')}
            language={language}
          />
        </div>
        <div className="dock-talk" />
        <div className="dock-tiles">
          <CompanionMenu inline />
          <button type="button" className="dock-tile" onClick={() => setShelf(true)}>
            <LearnIcon name="paw" />
            <span>{t('learnWorlds.myPets')}</span>
          </button>
          <Link href="/studio" className="dock-tile is-quiet">
            <LearnIcon name="studio" filled />
            <span>{t('learnWorlds.studio')}</span>
          </Link>
        </div>
      </nav>
      {shelf && child && (
        <PetShelf
          pets={learn.pets}
          buddy={buddy}
          onChoose={(petId) => {
            writeBuddy(child.id, petId);
            setState((s) => (s ? { ...s } : s));
          }}
          onClose={() => setShelf(false)}
        />
      )}
    </main>
  );
}
