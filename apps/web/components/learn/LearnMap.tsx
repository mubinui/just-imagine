'use client';
import { copy as uiText } from '../../lib/i18n/ui';
import '../../app/studio.css';
import '../../app/learn.css';
import { useCallback, useEffect, useState, type SetStateAction } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChildResponseSchema, type ChildResponse } from '@just-imagine/protocol';
import { useLanguage } from '../../lib/i18n';
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
import styles from './LearnMap.module.css';

const ISLAND_ART: Record<Section, string> = {
  space: 'saturn',
  animals: 'lion',
  body: 'heart',
  food: 'carrot',
  hygiene: 'tooth',
  exercise: 'coach',
};

const WORLD_PAINTING: Record<Section, string> = {
  space: 'space-world-v1',
  animals: 'animals-world-v1',
  body: 'body-world-v1',
  food: 'food-world-v1',
  hygiene: 'tooth-town-v1',
  exercise: 'exercise-world-v1',
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

export function LearnMap({ islands }: { islands: LearnIsland[] }) {
  const { language, t } = useLanguage();
  const child = useChild();
  const catalog = useFamilyCatalog(child);
  const { state, setState, failed, loading, retry } = useLearnState(child);
  const [shelf, setShelf] = useState(false);
  const learn = state ?? { points: child?.points ?? 0, pets: child?.pets ?? [], progress: {} };
  const buddy = child ? buddyFor(learn, readBuddy(child.id)) : undefined;
  const worlds = islands.map((island) => {
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
    const note = island.open
      ? done > 0
        ? t('learnWorlds.progress', { done, total })
        : t('learnWorlds.challengeCount', { total })
      : t('learnWorlds.comingSoon');
    return { island, total, done, name: t(`learnWorlds.sections.${island.section}`), note };
  });
  // The first world the child has started but not finished carries the "Keep going" flag.
  const resume = worlds.find(({ island, done, total }) => island.open && done > 0 && done < total)
    ?.island.section;
  return (
    <main className={`stage learn-stage learn-map ${styles.map}`}>
      <StageHeader title={t('learnWorlds.tile')} status={getVoice().status} />
      <div
        className={`learn-map-content ${styles.content}`}
        tabIndex={0}
        role="region"
        aria-labelledby="learn-map-title"
      >
        <header className={`learn-map-intro ${styles.intro}`}>
          <div className={styles.invitation}>
            <h2 id="learn-map-title">{t('learnWorlds.mapTitle')}</h2>
            <p>{t('learnWorlds.mapIntro')}</p>
          </div>
          <div className={styles.explorer}>
            <PointsBadge
              points={learn.points}
              label={t('learnWorlds.pointsLabel')}
              language={language}
            />
            {child && <PetSlot childId={child.id} state={state} />}
            <button type="button" className={styles.pets} onClick={() => setShelf(true)}>
              <LearnIcon name="paw" />
              <span>{t('learnWorlds.myPets')}</span>
            </button>
          </div>
        </header>
        {(loading || failed) && (
          <div className={`learn-map-notice ${styles.notice}`} role="status">
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
        <div className={styles.chart}>
          <svg
            className={styles.route}
            viewBox="0 0 100 50"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d="M15 13.5 C 24 8, 33 7.5, 42 10 S 61 11, 70 13.5 S 92 28, 88 37 S 74 40, 65 37.5 S 51 35, 42 37.5" />
          </svg>
          <svg className={styles.compass} viewBox="0 0 64 64" aria-hidden="true">
            <circle cx="32" cy="32" r="26" />
            <path d="M32 8l5 24-5 24-5-24z" />
            <path d="M8 32h48" />
          </svg>
          <section className={`islands ${styles.worlds}`} aria-label={t('learnWorlds.mapHint')}>
            {worlds.map(({ island, total, done, name, note }) => {
              const body = (
                <>
                  {island.section === resume && (
                    <span className={styles.flag} aria-hidden="true">
                      {uiText('Keep going')}
                    </span>
                  )}
                  <span
                    className={styles.landscape}
                    style={{
                      backgroundImage: `url(/learn/cinematic/${WORLD_PAINTING[island.section]}.webp)`,
                    }}
                    aria-hidden="true"
                  >
                    <span className={styles.character}>
                      <LearnArt id={ISLAND_ART[island.section]} />
                    </span>
                  </span>
                  <span className={styles.worldCopy}>
                    <span className={styles.worldHeading}>
                      <span className={`island-name ${styles.name}`}>{name}</span>
                      {island.open && <UiIcon name="back" className={styles.arrow} />}
                    </span>
                    <span className={`island-note ${styles.note}`}>{note}</span>
                    {island.open && done > 0 && (
                      <span className={styles.progress} aria-hidden="true">
                        <span style={{ width: `${Math.min(1, done / total) * 100}%` }} />
                      </span>
                    )}
                  </span>
                </>
              );
              return island.open ? (
                <Link
                  key={island.section}
                  href={`/learn/${island.section}`}
                  className={`island is-open ${styles.world}`}
                  data-section={island.section}
                  aria-label={`${name}, ${note}`}
                >
                  {body}
                </Link>
              ) : (
                <div
                  key={island.section}
                  className={`island is-soon ${styles.world}`}
                  data-section={island.section}
                >
                  {body}
                </div>
              );
            })}
          </section>
          <Link href="/stories" className={`learn-story-room-link ${styles.story}`}>
            <span className={styles.storyRibbon} aria-hidden="true">
              {language === 'bn' ? 'গল্পের সময়' : uiText('Story time')}
            </span>
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <Actor id="katha" />
            </svg>
            <span className={styles.storyCopy}>
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
      </div>
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
