import type { SceneDoc } from '@just-imagine/scene-schema';

// What the browser may know about a Learning World. Built on the server by ./content.ts from the
// authored packs; answer keys, accepted answers and hints never appear here (spec 6b).

export const SECTIONS = ['space', 'animals', 'body', 'food', 'hygiene', 'exercise'] as const;
export type Section = (typeof SECTIONS)[number];

export interface PublicCharacter {
  id: string;
  name: string;
  nameBn: string;
  look: string;
  facts: string[];
  factsBn: string[];
  catchphrase: string;
  catchphraseBn: string;
}
export interface PublicChallenge {
  id: string;
  characterId: string;
  question: string;
  questionBn: string;
  points: number;
}
export interface PublicHotspot {
  entityId: string;
  characterId: string;
  comesCloser: 'swoop' | 'grow' | 'ring';
}
export interface PublicActivity {
  characterId: string;
  kind:
    | 'orbit'
    | 'listen'
    | 'wash'
    | 'brush'
    | 'pulse'
    | 'breathe'
    | 'signal'
    | 'digest'
    | 'assemble'
    | 'plate'
    | 'move';
  title: string;
  titleBn: string;
  explanation: string;
  explanationBn: string;
}
export interface PublicPack {
  id: string;
  section: Section;
  title: string;
  titleBn: string;
  /** The scene as the engine should draw it: painted entities are drawn by the stage instead. */
  scene: SceneDoc;
  /** Entities the stage paints as authored art over their physics bodies, in paint order. */
  painted: string[];
  hotspots: PublicHotspot[];
  /** Real animal recordings, served from public/learn/sounds without an extension. */
  sounds: { entityId: string; clip: string }[];
  characters: PublicCharacter[];
  challenges: PublicChallenge[];
  activities: PublicActivity[];
}
export interface LearnIsland {
  section: Section;
  open: boolean;
  /** Every challenge id in the section, for the progress ring. */
  challengeIds: string[];
}
