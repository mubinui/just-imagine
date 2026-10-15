import type { WorldDoc } from './firestore';

export type WorldWithId = WorldDoc & { id: string };

// Implemented by the Firestore listener in apps/web and by FakeWorldSource in packages/fixtures.
export interface WorldSource {
  subscribe(
    worldId: string,
    onUpdate: (world: WorldWithId) => void,
    onError?: (error: Error) => void,
  ): () => void;
}
