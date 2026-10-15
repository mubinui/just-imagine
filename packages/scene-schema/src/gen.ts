import { z } from 'zod';
import { LIMITS } from './limits';
import {
  AssetRefSchema,
  EntitySchema,
  IdSchema,
  MaterialSchema,
  SceneDocObjectSchema,
  type AssetRef,
  type Material,
  type SceneDoc,
} from './schema';

export const PLACEHOLDER_ASSET: AssetRef = {
  url: '',
  width: 1024,
  height: 1024,
  status: 'placeholder',
};
export const PLACEHOLDER_BACKDROP: AssetRef = {
  url: '',
  width: 1920,
  height: 1080,
  status: 'placeholder',
};

export const GeneratedMaterialSchema = MaterialSchema.extend({ name: IdSchema });
export type GeneratedMaterial = z.infer<typeof GeneratedMaterialSchema>;

export const GeneratedEntitySchema = EntitySchema.omit({ asset: true }).strict();

export const GeneratedThemeSchema = z.object({
  paletteHint: z.string().max(60),
  timeOfDay: z.enum(['day', 'sunset', 'night']),
  backdropDescription: z.string().min(1).max(200),
  midLayerDescription: z.string().min(1).max(200).optional(),
});

export const GeneratedSceneSchema = SceneDocObjectSchema.omit({
  schemaVersion: true,
  worldId: true,
  theme: true,
  materials: true,
  entities: true,
}).extend({
  theme: GeneratedThemeSchema,
  materials: z
    .array(GeneratedMaterialSchema)
    .min(1)
    .max(LIMITS.maxMaterials)
    .refine(
      (ms) => new Set(ms.map((m) => m.name)).size === ms.length,
      'material names must be unique',
    ),
  entities: z.array(GeneratedEntitySchema).min(1).max(LIMITS.maxEntities),
});
export type GeneratedScene = z.infer<typeof GeneratedSceneSchema>;

export function fromGenerated(gen: GeneratedScene, worldId: string): SceneDoc {
  const materials: Record<string, Material> = {};
  for (const { name, ...m } of gen.materials) materials[name] = m;
  const { theme, materials: _m, entities, ...rest } = gen;
  const doc: SceneDoc = {
    schemaVersion: 1,
    worldId,
    ...rest,
    tier: rest.tier ?? 'playground',
    theme: {
      paletteHint: theme.paletteHint,
      timeOfDay: theme.timeOfDay,
      backdropDescription: theme.backdropDescription,
      backdrop: { ...PLACEHOLDER_BACKDROP },
      ...(theme.midLayerDescription
        ? { midLayerDescription: theme.midLayerDescription, midLayer: { ...PLACEHOLDER_BACKDROP } }
        : {}),
    },
    materials,
    entities: entities.map((e) => ({ ...e })),
  };
  return doc;
}

// Re-exported so callers can validate asset refs the builder writes later.
export { AssetRefSchema };
