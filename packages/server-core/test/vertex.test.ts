import { describe, expect, it } from 'vitest';
import { vertexLiveLocation, vertexModelLocation } from '../src/vertex';

describe('Vertex AI locations', () => {
  it('keeps the Live voice model regional and serves the other models from global', () => {
    expect(vertexLiveLocation({})).toBe('us-central1');
    expect(vertexModelLocation({})).toBe('global');
  });

  it('lets a deployment move either location', () => {
    expect(vertexLiveLocation({ LIVE_MODEL_LOCATION: 'europe-west4' })).toBe('europe-west4');
    expect(vertexModelLocation({ MODEL_LOCATION: 'us-central1' })).toBe('us-central1');
  });

  it('ignores blank overrides', () => {
    expect(vertexLiveLocation({ LIVE_MODEL_LOCATION: ' ' })).toBe('us-central1');
    expect(vertexModelLocation({ MODEL_LOCATION: '' })).toBe('global');
  });
});
