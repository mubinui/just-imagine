import type { WorldPack } from './schema';

/** The family browser receives authored questions, never grading material. */
export function publicLearningPack(pack: WorldPack) {
  return {
    id: pack.id,
    section: pack.section,
    title: pack.title,
    titleBn: pack.titleBn,
    scene: structuredClone(pack.scene),
    painted: [] as string[],
    hotspots: structuredClone(pack.hotspots),
    sounds: pack.sounds.map((sound) => ({
      entityId: sound.entityId,
      clip: `/learn/sounds/${sound.file.replace(/^assets\/sounds\//, '').replace(/\.ogg$/, '')}`,
    })),
    characters: pack.characters.map(
      ({ id, name, nameBn, look, facts, factsBn, catchphrase, catchphraseBn }) => ({
        id,
        name,
        nameBn,
        look,
        facts: [...facts],
        factsBn: [...factsBn],
        catchphrase,
        catchphraseBn,
      }),
    ),
    activities: structuredClone(pack.activities),
    challenges: pack.challenges.map(({ id, characterId, question, questionBn, points }) => ({
      id,
      characterId,
      question,
      questionBn,
      points,
    })),
  };
}
