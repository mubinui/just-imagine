import { z } from 'zod';
import { GeneratedSceneSchema } from './gen';
import { PatchOpsSchema } from './patch';

const STRIP = new Set([
  'additionalProperties',
  '$schema',
  '$id',
  'default',
  'pattern',
  'minLength',
  'maxLength',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'propertyNames',
  'patternProperties',
]);

export function toGeminiJsonSchema(schema: Record<string, unknown>): Record<string, unknown> {
  const clean = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(clean);
    if (node && typeof node === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        if (STRIP.has(k)) continue;
        if (k === 'const') {
          out.enum = [v];
          continue;
        }
        // These maps contain user-chosen names, not schema keywords.
        if (
          ['properties', '$defs', 'definitions', 'patternProperties'].includes(k) &&
          v &&
          typeof v === 'object' &&
          !Array.isArray(v)
        ) {
          out[k] = Object.fromEntries(
            Object.entries(v).map(([name, child]) => [name, clean(child)]),
          );
        } else {
          out[k] = clean(v);
        }
      }
      return out;
    }
    return node;
  };
  return clean(schema) as Record<string, unknown>;
}

export function generatedSceneJsonSchema(): Record<string, unknown> {
  return z.toJSONSchema(GeneratedSceneSchema, {
    target: 'draft-7',
    unrepresentable: 'any',
  }) as Record<string, unknown>;
}

export function patchOpsJsonSchema(): Record<string, unknown> {
  return z.toJSONSchema(PatchOpsSchema, { target: 'draft-7', unrepresentable: 'any' }) as Record<
    string,
    unknown
  >;
}
