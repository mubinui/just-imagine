import type { z, ZodType } from 'zod';
import { db } from './firebase';

export class DocShapeError extends Error {
  constructor(
    public readonly path: string,
    public readonly issues: unknown,
  ) {
    super(`document at ${path} does not match its schema`);
    this.name = 'DocShapeError';
  }
}

export async function readDoc<S extends ZodType>(
  path: string,
  schema: S,
): Promise<z.infer<S> | null> {
  const snap = await db().doc(path).get();
  if (!snap.exists) return null;
  const parsed = schema.safeParse(snap.data());
  if (!parsed.success) throw new DocShapeError(path, parsed.error.issues);
  return parsed.data as z.infer<S>;
}

export async function writeDoc<S extends ZodType>(
  path: string,
  schema: S,
  data: unknown,
): Promise<void> {
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new DocShapeError(path, parsed.error.issues);
  await db()
    .doc(path)
    .set(parsed.data as Record<string, unknown>);
}

export async function updateDoc<S extends ZodType>(
  path: string,
  schema: S,
  partial: Record<string, unknown>,
): Promise<void> {
  await db().runTransaction(async (tx) => {
    const ref = db().doc(path);
    const snap = await tx.get(ref);
    if (!snap.exists) throw new DocShapeError(path, 'missing');
    const merged = { ...snap.data(), ...partial };
    const parsed = schema.safeParse(merged);
    if (!parsed.success) throw new DocShapeError(path, parsed.error.issues);
    tx.set(ref, parsed.data as Record<string, unknown>);
  });
}
