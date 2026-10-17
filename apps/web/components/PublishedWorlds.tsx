'use client';
/* eslint-disable @next/next/no-img-element -- Published owned artwork uses its explicit source URL. */
import '../app/catalog.css';
import { useState } from 'react';
import { conceptCard } from '@just-imagine/protocol';
import { useFamilyCatalog, openCatalogWorld } from '../lib/catalog';
import { useLanguage } from '../lib/i18n';
import { getVoice } from '../lib/voice';
import { UiIcon } from './UiIcon';

export function PublishedWorlds({
  childId,
  onOpen,
  compact = false,
}: {
  childId: string;
  onOpen: (worldId: string) => void;
  compact?: boolean;
}) {
  const { language } = useLanguage(),
    bn = language === 'bn';
  const catalog = useFamilyCatalog({ id: childId });
  const [opening, setOpening] = useState(''),
    [failed, setFailed] = useState(false);
  async function open(entryId: string) {
    setOpening(entryId);
    setFailed(false);
    void getVoice()
      .unlockAudio()
      .catch(() => {});
    try {
      const { worldId } = await openCatalogWorld(childId, entryId);
      onOpen(worldId);
    } catch {
      setFailed(true);
    } finally {
      setOpening('');
    }
  }
  if (compact)
    return catalog.worlds.length ? (
      <label className="catalog-picker">
        <UiIcon name="gallery" />
        <span className="sr-only">{bn ? 'প্রকাশিত জগৎ' : 'Published worlds'}</span>
        <select
          value=""
          disabled={Boolean(opening)}
          onChange={(event) => void open(event.target.value)}
        >
          <option value="">
            {opening ? (bn ? 'খুলছে…' : 'Opening…') : bn ? 'প্রকাশিত জগৎ' : 'Published worlds'}
          </option>
          {catalog.worlds.map((world) => (
            <option value={world.id} key={world.id}>
              {world.title[language]}
            </option>
          ))}
        </select>
        {failed && <span role="alert">{bn ? 'আবার চেষ্টা করো' : 'Try again'}</span>}
      </label>
    ) : null;
  return (
    <section id="published" className="published-worlds" aria-labelledby="published-title">
      <h2 id="published-title">{bn ? 'নতুন জগৎ ঘুরে দেখো' : 'Explore published worlds'}</h2>
      {(catalog.error || failed) && (
        <p role="alert">
          {bn
            ? 'প্রকাশিত সংগ্রহ খোলা যায়নি। আবার চেষ্টা করো।'
            : 'The published collection could not open. Try again.'}{' '}
          <button type="button" onClick={catalog.retry}>
            {bn ? 'আবার চেষ্টা' : 'Retry'}
          </button>
        </p>
      )}
      <div className="world-grid">
        {catalog.worlds.map((world, index) => (
          <button
            className={`world-tile world-${index % 4}`}
            key={world.id}
            disabled={Boolean(opening)}
            onClick={() => void open(world.id)}
          >
            {world.thumbnailUrl ? (
              <img className="catalog-thumbnail" src={world.thumbnailUrl} alt="" />
            ) : (
              <UiIcon name="gallery" className="catalog-world-icon" />
            )}
            <span className="world-tile-copy">
              <strong>{world.title[language]}</strong>
              <span>
                {world.concepts.map((concept) => conceptCard(concept, language).title).join(' · ')}
              </span>
              <span>
                {opening === world.id ? (bn ? 'খুলছে…' : 'Opening…') : bn ? 'খেলো' : 'Play'}
              </span>
            </span>
          </button>
        ))}
      </div>
      {!catalog.worlds.length && !catalog.error && (
        <p>
          {bn
            ? 'নতুন জগৎ প্রকাশিত হলে এখানে পাবে।'
            : 'New worlds will appear here when they are published.'}
        </p>
      )}
    </section>
  );
}
