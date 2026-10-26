export type WorldJobStatus = 'queued' | 'building' | 'placeholders' | 'hero' | 'ready' | 'failed';

export interface WorldJobOutcome {
  /** End the child's voice session: the game has taken over. */
  stopVoice: boolean;
  /** World document to subscribe to, if this status publishes one. */
  select: string | undefined;
  /** Drop the "still building" badge. */
  clearBadge: boolean;
}

/** Decide what the Studio does when the gateway reports progress on a world build. */
export function onWorldJob(
  message: { status: string; worldId: string },
  state: { askedThisSession: boolean },
): WorldJobOutcome {
  const finished = message.status === 'ready' || message.status === 'failed';
  return {
    stopVoice: message.status === 'ready' && state.askedThisSession,
    select: ['placeholders', 'hero', 'ready'].includes(message.status)
      ? message.worldId
      : undefined,
    clearBadge: finished,
  };
}
