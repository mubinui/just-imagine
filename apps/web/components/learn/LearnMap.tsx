'use client';
import { copy as uiText } from '../../lib/i18n/ui';
import '../../app/studio.css';
import '../../app/learn.css';
import { useEffect, useState } from 'react';
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
import { LearnArt } from './LearnArt';
import { LearnIcon, PointsBadge } from './parts';
import {
  DEMO_LEARN,
  buddyFor,
  doneIn,
  fetchLearn,
  readBuddy,
  writeBuddy,
  type LearnState,
} from './progress';
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
  const [state, setState] = useState<LearnState>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!child) return;
    let active = true;
    fetchLearn(child.id)
      .then((next) => {
        if (active) setState(next);
      })
      .catch(() => {
        if (!active) return;
        setFailed(true);
        setState({ points: child.points ?? 0, pets: child.pets ?? [], progress: {} });
      });
    return () => {
      active = false;
    };
  }, [child]);
  return { state, setState, failed };
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
  const { state, setState } = useLearnState(child);
  const [shelf, setShelf] = useState(false);
  const learn = state ?? DEMO_LEARN;
  const buddy = child ? buddyFor(learn, readBuddy(child.id)) : undefined;
  return (
    <main className="stage learn-stage learn-map">
      <StageHeader title={t('learnWorlds.mapTitle')} status={getVoice().status} />
      <section className="islands" aria-label={t('learnWorlds.mapHint')}>
        {islands.map((island, index) => {
          const challenges = [
            ...island.challengeIds,
            ...catalog.packs
              .filter((pack) => pack.section === island.section)
              .flatMap((pack) => pack.challenges.map((challenge) => challenge.id)),
          ];
          const total = challenges.length;
          const done = state ? doneIn(state, challenges) : 0;
          const name = t(`learnWorlds.sections.${island.section}`);
          const body = (
            <>
              <span className="island-figure">
                {island.open && <ProgressRing done={done} total={total} />}
                <span className="island-art">
                  <LearnArt id={ISLAND_ART[island.section]} />
                </span>
                <IslandBase section={island.section} />
              </span>
              <span className="island-name">{uiText(name)}</span>
              <span className="island-note">
                {island.open
                  ? t('learnWorlds.progress', { done, total })
                  : t('learnWorlds.comingSoon')}
              </span>
            </>
          );
          const style = { '--i': index } as React.CSSProperties;
          return island.open ? (
            <Link
              key={island.section}
              href={`/learn/${island.section}`}
              className="island is-open"
              style={style}
              aria-label={`${name}, ${t('learnWorlds.progress', { done, total })}`}
            >
              {body}
            </Link>
          ) : (
            <div key={island.section} className="island is-soon" style={style}>
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
        <span aria-hidden="true">→</span>
      </Link>
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
