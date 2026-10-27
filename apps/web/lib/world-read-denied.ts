import { shouldGiveUp, type Build } from './building';

export interface WorldReadDenied {
  /** Stop subscribing to the world. */
  deselect: boolean;
  /** Show the friendly line; false while a build in this session is still making the world. */
  toast: boolean;
  /** Forget the remembered build. */
  clearBuild: boolean;
}

/**
 * A queued build's world document does not exist until its first draft, so Firestore denies the
 * read exactly as it does for a dead build. Only a build past its deadline is forgotten.
 */
export function onWorldReadDenied(input: {
  worldId: string | undefined;
  job: string | undefined;
  build: Build | undefined;
  now: number;
}): WorldReadDenied {
  const building = Boolean(input.job && input.job !== 'ready' && input.job !== 'failed');
  return {
    deselect: true,
    toast: !building,
    clearBuild: input.build?.worldId === input.worldId && shouldGiveUp(input.build, input.now),
  };
}
