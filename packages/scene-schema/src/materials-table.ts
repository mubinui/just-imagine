export interface MaterialRange {
  density: [number, number];
  friction: [number, number];
  restitution: [number, number];
  softness: [number, number];
  buoyant: boolean;
}

// Density is relative to water (1.0) in the 2D world; see spec 5.4.
export const MATERIAL_TABLE: Record<string, MaterialRange> = {
  stone: {
    density: [2.2, 3.0],
    friction: [0.6, 0.9],
    restitution: [0.0, 0.2],
    softness: [0, 0.05],
    buoyant: false,
  },
  rock: {
    density: [2.2, 3.0],
    friction: [0.6, 0.9],
    restitution: [0.0, 0.2],
    softness: [0, 0.05],
    buoyant: false,
  },
  metal: {
    density: [5.0, 8.0],
    friction: [0.3, 0.6],
    restitution: [0.1, 0.4],
    softness: [0, 0.02],
    buoyant: false,
  },
  wood: {
    density: [0.4, 0.9],
    friction: [0.4, 0.7],
    restitution: [0.2, 0.4],
    softness: [0, 0.1],
    buoyant: true,
  },
  rubber: {
    density: [0.9, 1.3],
    friction: [0.7, 1.0],
    restitution: [0.6, 0.9],
    softness: [0.1, 0.4],
    buoyant: false,
  },
  jelly: {
    density: [0.9, 1.2],
    friction: [0.2, 0.5],
    restitution: [0.4, 0.7],
    softness: [0.6, 1.0],
    buoyant: true,
  },
  ice: {
    density: [0.85, 0.95],
    friction: [0.02, 0.1],
    restitution: [0.1, 0.3],
    softness: [0, 0.05],
    buoyant: true,
  },
  feather: {
    density: [0.05, 0.1],
    friction: [0.5, 0.9],
    restitution: [0.0, 0.2],
    softness: [0.3, 0.7],
    buoyant: true,
  },
  cloud: {
    density: [0.05, 0.08],
    friction: [0.8, 1.0],
    restitution: [0.0, 0.2],
    softness: [0.3, 0.6],
    buoyant: true,
  },
  grass: {
    density: [0.8, 1.2],
    friction: [0.7, 1.0],
    restitution: [0.0, 0.2],
    softness: [0, 0.1],
    buoyant: false,
  },
  sand: {
    density: [1.4, 1.8],
    friction: [0.6, 0.9],
    restitution: [0.0, 0.1],
    softness: [0.2, 0.5],
    buoyant: false,
  },
  water: {
    density: [0.95, 1.05],
    friction: [0.0, 0.1],
    restitution: [0.0, 0.1],
    softness: [0.9, 1.0],
    buoyant: false,
  },
  balloon: {
    density: [0.05, 0.1],
    friction: [0.3, 0.6],
    restitution: [0.7, 0.95],
    softness: [0.5, 0.9],
    buoyant: true,
  },
  glass: {
    density: [2.2, 2.6],
    friction: [0.1, 0.4],
    restitution: [0.1, 0.3],
    softness: [0, 0.02],
    buoyant: false,
  },
  paper: {
    density: [0.1, 0.3],
    friction: [0.3, 0.6],
    restitution: [0.0, 0.2],
    softness: [0.1, 0.4],
    buoyant: true,
  },
  fur: {
    density: [0.2, 0.5],
    friction: [0.6, 0.9],
    restitution: [0.1, 0.3],
    softness: [0.3, 0.7],
    buoyant: true,
  },
};

export function lookupMaterialRange(name: string): MaterialRange | undefined {
  const words = name
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean);
  for (let i = words.length - 1; i >= 0; i--) {
    const range = MATERIAL_TABLE[words[i]!];
    if (range) return range;
  }
  return undefined;
}
