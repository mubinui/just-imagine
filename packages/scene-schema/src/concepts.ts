export const CONCEPTS = [
  // Playground concepts
  'gravity',
  'mass',
  'buoyancy',
  'friction',
  'bounce',
  'momentum',
  'airResistance',
  'balance',
  'springiness',
  'density',
  'force',
  'speed',
  // Lab concepts
  'acceleration',
  'energy',
  'projectile',
  'probability',
  'fraction',
  'graph',
  'measurement',
] as const;
export type Concept = (typeof CONCEPTS)[number];

export const DIALS = ['gravity', 'wind', 'heroMaterial'] as const;
export type Dial = (typeof DIALS)[number];

export const GRAVITY_PRESETS = { earth: 9.81, moon: 1.62, jupiter: 24.8, none: 0 } as const;
export type GravityPreset = keyof typeof GRAVITY_PRESETS;

export const WIND_PRESETS = { none: 0, breeze: 2, storm: 8 } as const;
export type WindPreset = keyof typeof WIND_PRESETS;
