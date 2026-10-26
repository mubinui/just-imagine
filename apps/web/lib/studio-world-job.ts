import type { WorldWithId } from '@just-imagine/protocol';

export type WorldJobStatus = 'queued' | 'building' | 'placeholders' | 'hero' | 'ready' | 'failed';

export interface WorldJobOutcome {
  /** End the child's voice session: the game has taken over. */
  stopVoice: boolean;
  /**
   * The asked-for world is ready but its document has not loaded: stop the voice once it loads,
   * unless it turns out to be a fallback.
   */
  stopVoiceOnLoad: string | undefined;
  /** World document to subscribe to, if this status publishes one. */
  select: string | undefined;
  /** Drop the "still building" badge. */
  clearBadge: boolean;
  /** The new world this session asked for and is still waiting on. */
  askedWorldId: string | undefined;
}

/**
 * True when a template or sample game stood in for the generated one. The builder records it on
 * the world's creation from the first publish, so any loaded document of the world can tell.
 */
export function isFallbackWorld(world: Pick<WorldWithId, 'creation'>): boolean {
  // Read structurally: `creation.fallback` is defined by the protocol's game-reliability change.
  return Boolean((world.creation as { fallback?: unknown } | undefined)?.fallback);
}

/**
 * Decide what the Studio does when the gateway reports progress on a world build.
 * Only the first build of a new world stops the voice; a voice edit of the selected
 * world re-runs queued to ready and must leave the friend listening. A fallback world
 * also leaves the friend on, so it can say the game is a simpler version of the wish.
 * `fallback` is what the world's loaded document says, or undefined when it has not loaded.
 */
export function onWorldJob(
  message: { status: WorldJobStatus; worldId: string },
  state: {
    selectedWorldId: string | undefined;
    askedWorldId: string | undefined;
    fallback: boolean | undefined;
  },
): WorldJobOutcome {
  let askedWorldId = state.askedWorldId;
  if (message.status === 'queued' && message.worldId !== state.selectedWorldId)
    askedWorldId = message.worldId;
  const askedIsReady = message.status === 'ready' && askedWorldId === message.worldId;
  if (askedIsReady) askedWorldId = undefined;
  return {
    stopVoice: askedIsReady && state.fallback === false,
    stopVoiceOnLoad: askedIsReady && state.fallback === undefined ? message.worldId : undefined,
    select: ['placeholders', 'hero', 'ready'].includes(message.status)
      ? message.worldId
      : undefined,
    clearBadge: message.status === 'ready' || message.status === 'failed',
    askedWorldId,
  };
}
