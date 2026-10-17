'use client';
import type { CharacterId, ChildResponse } from '@just-imagine/protocol';
import { VoiceClient } from '@just-imagine/characters';
import { env } from './env';
import { currentIdToken } from './firebase';
let voice: VoiceClient | undefined;
let voiceGeneration = 0;
export function getVoice() {
  return (voice ??= new VoiceClient({
    url: env.gatewayUrl,
    capture: !env.fake,
    getToken: env.fake ? async () => 'fixture-token' : currentIdToken,
  }));
}
export function releaseVoice() {
  voiceGeneration++;
  opening = undefined;
  voice?.dispose();
  voice = undefined;
}
export function stopChildVoice() {
  voiceGeneration++;
  opening = undefined;
  voice?.end();
}

/** End also cancels a tap still waiting for the browser to unlock its audio context. */
export async function unlockChildVoice() {
  const client = getVoice(),
    version = voiceGeneration;
  try {
    await client.unlockAudio();
  } catch (error) {
    if (voice !== client || version !== voiceGeneration) return false;
    throw error;
  }
  return voice === client && version === voiceGeneration;
}

let opening:
  | {
      client: VoiceClient;
      childId: string;
      characterId?: CharacterId;
      worldId?: string;
      promise: Promise<void>;
    }
  | undefined;
export async function ensureChildVoice(
  child: ChildResponse,
  worldId?: string,
  characterId?: CharacterId,
) {
  const client = getVoice();
  const select = () => {
    if (worldId) client.send({ type: 'openWorld', worldId });
    if (characterId) client.send({ type: 'switchCharacter', characterId });
  };
  if (opening?.client === client && opening.childId === child.id) {
    if (characterId) opening.characterId = characterId;
    if (worldId) opening.worldId = worldId;
    if (client.session?.childId === child.id) select();
    return opening.promise;
  }
  if (client.session?.childId === child.id) {
    select();
    return;
  }
  if (client.session || opening?.client === client) client.end();
  const request = {
    client,
    childId: child.id,
    characterId,
    worldId,
    promise: Promise.resolve(),
  };
  opening = request;
  const promise = (async () => {
    const idToken = env.fake ? 'fixture-token' : await currentIdToken();
    if (voice !== client || opening !== request) return;
    await client.connect({
      type: 'hello',
      idToken,
      childId: child.id,
      characterId:
        request.characterId ??
        child.companion?.characterId ??
        (child.ageBand === '11-13' ? 'pori' : 'bhombol'),
      ...(request.worldId ? { worldId: request.worldId } : {}),
    });
  })();
  request.promise = promise;
  try {
    await promise;
  } finally {
    if (opening?.promise === promise) opening = undefined;
  }
}
