import { z } from 'zod';
import jsonPatch, { type Operation } from 'fast-json-patch';
import type { SceneDoc } from './schema';
import { validateScene, type ValidationResult } from './validator';

const pointer = z
  .string()
  .regex(/^\/(?:[^~]|~[01])*$/, 'JSON pointer must start with / and use valid ~0 or ~1 escapes');

export const PatchOpSchema = z.discriminatedUnion('op', [
  z.object({ op: z.literal('add'), path: pointer, value: z.unknown() }),
  z.object({ op: z.literal('replace'), path: pointer, value: z.unknown() }),
  z.object({ op: z.literal('remove'), path: pointer }),
  z.object({ op: z.literal('move'), from: pointer, path: pointer }),
  z.object({ op: z.literal('copy'), from: pointer, path: pointer }),
]);
export type PatchOp = z.infer<typeof PatchOpSchema>;
export const PatchOpsSchema = z.array(PatchOpSchema).min(1).max(40);

export function applyScenePatch(doc: SceneDoc, ops: PatchOp[]): ValidationResult {
  const parsed = PatchOpsSchema.safeParse(ops);
  if (!parsed.success) {
    return {
      ok: false,
      doc: null,
      issues: parsed.error.issues.map((issue) => ({
        code: 'PATCH_INVALID',
        severity: 'error',
        path: issue.path.map(String).join('.'),
        message: issue.message,
      })),
    };
  }
  const clone = structuredClone(doc);
  try {
    jsonPatch.applyPatch(clone, parsed.data as Operation[], true, true);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      doc: null,
      issues: [{ code: 'PATCH_INVALID', severity: 'error', path: '', message }],
    };
  }
  return validateScene(clone);
}
