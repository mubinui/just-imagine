import { LIMITS } from './limits';

export const CURRENT_SCHEMA_VERSION = LIMITS.schemaVersion;

export type MigrationResult =
  | { ok: true; doc: unknown }
  | { ok: false; reason: 'NOT_AN_OBJECT' | 'MISSING_VERSION' | 'NEWER_THAN_SUPPORTED' };

// Each entry upgrades a document from version N to N+1. Empty until v2 exists.
const MIGRATIONS: Record<number, (doc: Record<string, unknown>) => Record<string, unknown>> = {};

export function migrateScene(raw: unknown): MigrationResult {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return { ok: false, reason: 'NOT_AN_OBJECT' };
  let doc = { ...(raw as Record<string, unknown>) };
  const version = doc['schemaVersion'];
  if (typeof version !== 'number' || !Number.isSafeInteger(version) || version < 1) {
    return { ok: false, reason: 'MISSING_VERSION' };
  }
  if (version > CURRENT_SCHEMA_VERSION) return { ok: false, reason: 'NEWER_THAN_SUPPORTED' };
  for (let v = version; v < CURRENT_SCHEMA_VERSION; v++) {
    const step = MIGRATIONS[v];
    if (!step) return { ok: false, reason: 'MISSING_VERSION' };
    doc = { ...step(doc), schemaVersion: v + 1 };
  }
  return { ok: true, doc };
}
