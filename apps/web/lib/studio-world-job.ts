export type WorldJobStatus = 'queued' | 'building' | 'placeholders' | 'hero' | 'ready' | 'failed';

export interface WorldJobOutcome {
  /** End the child's voice session: the game has taken over. */
  stopVoice: boolean;
  /** World document to subscribe to, if this status publishes one. */
  select: string | undefined;
  /** Drop the "still building" badge. */
  clearBadge: boolean;
  /** The new world this session asked for and is still waiting on. */
  askedWorldId: string | undefined;
}

/**
 * Decide what the Studio does when the gateway reports progress on a world build.
 * Only the first build of a new world stops the voice; a voice edit of the selected
 * world re-runs queued to ready and must leave the friend listening.
 */
export function onWorldJob(
  message: { status: WorldJobStatus; worldId: string },
  state: { selectedWorldId: string | undefined; askedWorldId: string | undefined },
): WorldJobOutcome {
  let askedWorldId = state.askedWorldId;
  if (message.status === 'queued' && message.worldId !== state.selectedWorldId)
    askedWorldId = message.worldId;
  const stopVoice = message.status === 'ready' && askedWorldId === message.worldId;
  if (stopVoice) askedWorldId = undefined;
  return {
    stopVoice,
    select: ['placeholders', 'hero', 'ready'].includes(message.status)
      ? message.worldId
      : undefined,
    clearBadge: message.status === 'ready' || message.status === 'failed',
    askedWorldId,
  };
}
