// Server only. Imported by the app/(child)/learn pages, which are server components, so the
// authored packs (with their answer keys) never enter the browser bundle; test/learn-content
// fails if a client component imports this module or the content package.
import { PACKS, type WorldPack } from '@just-imagine/learning-content';
import { SECTIONS, type LearnIsland, type PublicPack, type Section } from './types';

// Scenery the stage paints with authored art (and lets drift, sway or twinkle) instead of the
// engine's honest placeholders. Ground is painted into the backdrop itself.
const SCENERY = new Set([
  'ground',
  'haystack',
  'barn',
  'cloud_farm',
  'tree',
  'bush',
  'seaweed',
  'rock',
  'star_left',
  'star_right',
]);

const PACK_ORDER = [
  'space',
  'animals_farm',
  'animals_jungle',
  'animals_ocean',
  'space_galaxy',
  'body',
  'food',
  'hygiene',
  'exercise',
];

export function publicPack(pack: WorldPack): PublicPack {
  const characterEntities = new Set(pack.hotspots.map((h) => h.entityId));
  const isPainted = (id: string) => characterEntities.has(id) || SCENERY.has(id);
  const scene = structuredClone(pack.scene);
  scene.theme.backdrop = {
    url:
      pack.id === 'hygiene'
        ? '/learn/cinematic/tooth-town-v1.webp'
        : pack.section === 'animals'
          ? `/learn/cinematic/${pack.id.replaceAll('_', '-')}-world-v1.webp`
          : `/learn/cinematic/${pack.section}-world-v1.webp`,
    width: 1672,
    height: 941,
    status: 'ready',
  };
  delete scene.theme.midLayer;
  for (const entity of scene.entities)
    if (isPainted(entity.id) && !entity.tags.includes('painted_ground'))
      entity.tags = [...entity.tags, 'painted_ground'];
  return {
    id: pack.id,
    section: pack.section,
    title: pack.title,
    titleBn: pack.titleBn,
    scene,
    painted: scene.entities.map((e) => e.id).filter((id) => isPainted(id) && id !== 'ground'),
    hotspots: pack.hotspots.map(({ entityId, characterId, comesCloser }) => ({
      entityId,
      characterId,
      comesCloser,
    })),
    sounds: pack.sounds.map((s) => ({
      entityId: s.entityId,
      clip: `/learn/sounds/${s.file.replace(/^assets\/sounds\//, '').replace(/\.ogg$/, '')}`,
    })),
    characters: pack.characters.map((c) => ({
      id: c.id,
      name: c.name,
      nameBn: c.nameBn,
      look: c.look,
      facts: c.facts,
      factsBn: c.factsBn,
      catchphrase: c.catchphrase,
      catchphraseBn: c.catchphraseBn,
    })),
    activities: structuredClone(pack.activities),
    challenges: pack.challenges.map((c) => ({
      id: c.id,
      characterId: c.characterId,
      question: c.question,
      questionBn: c.questionBn,
      points: c.points,
    })),
  };
}

function isSection(value: string): value is Section {
  return (SECTIONS as readonly string[]).includes(value);
}

/** The packs of one section, in the order the child meets them; empty when none are built yet. */
export function sectionPacks(section: string): PublicPack[] {
  if (!isSection(section)) return [];
  return PACK_ORDER.flatMap((id) => {
    const pack = PACKS[id];
    return pack && pack.section === section ? [publicPack(pack)] : [];
  });
}

export function learnIslands(): LearnIsland[] {
  return SECTIONS.map((section) => {
    const packs = Object.values(PACKS).filter((p) => p.section === section);
    return {
      section,
      open: packs.length > 0,
      challengeIds: packs.flatMap((p) => p.challenges.map((c) => c.id)),
    };
  });
}
