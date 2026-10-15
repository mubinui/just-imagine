'use client';
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
