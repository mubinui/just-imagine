/**
 * Vertex AI locations. The Live voice model is regional; the other Gemini models (scene,
 * patches, moderation, summaries, images) are served from the `global` endpoint. Either can be
 * moved with LIVE_MODEL_LOCATION or MODEL_LOCATION when a project's models live elsewhere.
 */
export function vertexLiveLocation(env: NodeJS.ProcessEnv = process.env): string {
  return env['LIVE_MODEL_LOCATION']?.trim() || 'us-central1';
}

export function vertexModelLocation(env: NodeJS.ProcessEnv = process.env): string {
  return env['MODEL_LOCATION']?.trim() || 'global';
}
