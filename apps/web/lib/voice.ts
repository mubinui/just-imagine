'use client';
import type { ChildResponse } from '@just-imagine/protocol';
import { VoiceClient } from '@just-imagine/characters';
import { env } from './env';
import { currentIdToken } from './firebase';
let voice: VoiceClient | undefined;
export function getVoice() {
  return (voice ??= new VoiceClient({
    url: env.gatewayUrl,
    capture: !env.fake,
    getToken: env.fake ? async () => 'fixture-token' : currentIdToken,
  }));
}
export function releaseVoice() {
  voice?.dispose();
  voice = undefined;
}

let opening: { client: VoiceClient; childId: string; promise: Promise<void> } | undefined;
export async function ensureChildVoice(child: ChildResponse, worldId?: string) {
  const client = getVoice();
  if (opening?.client === client && opening.childId === child.id) return opening.promise;
  if (client.session?.childId === child.id) return;
  if (client.session) client.end();
  const promise = (async () => {
    const idToken = env.fake ? 'fixture-token' : await currentIdToken();
    if (voice !== client) return;
    await client.connect({
      type: 'hello',
      idToken,
      childId: child.id,
      characterId: child.companion?.characterId ?? (child.ageBand === '11-13' ? 'pori' : 'bhombol'),
      ...(worldId ? { worldId } : {}),
    });
  })();
  opening = { client, childId: child.id, promise };
  try {
    await promise;
  } finally {
    if (opening?.promise === promise) opening = undefined;
  }
}
