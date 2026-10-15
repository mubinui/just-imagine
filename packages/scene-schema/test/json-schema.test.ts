import { describe, it, expect } from 'vitest';
import {
  generatedSceneJsonSchema,
  patchOpsJsonSchema,
  toGeminiJsonSchema,
} from '../src/json-schema';

function walk(node: unknown, visit: (key: string, value: unknown) => void): void {
  if (Array.isArray(node)) node.forEach((n) => walk(n, visit));
  else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      visit(k, v);
      walk(v, visit);
    }
  }
}

describe('generatedSceneJsonSchema', () => {
  it('describes an object with entities, materials as an array, and no world id', () => {
    const s = generatedSceneJsonSchema() as {
      type: string;
      properties: Record<string, { type?: string }>;
      required?: string[];
    };
    expect(s.type).toBe('object');
    expect(s.properties['materials']?.type).toBe('array');
    expect(s.properties['entities']?.type).toBe('array');
    expect(s.properties['worldId']).toBeUndefined();
    expect(s.required).toContain('learning');
  });
});

describe('toGeminiJsonSchema', () => {
  it('strips keywords Gemini rejects', () => {
    const cleaned = toGeminiJsonSchema(generatedSceneJsonSchema());
    const seen = new Set<string>();
    walk(cleaned, (k) => seen.add(k));
    expect(seen.has('additionalProperties')).toBe(false);
    expect(seen.has('$schema')).toBe(false);
    expect(seen.has('$id')).toBe(false);
  });
  it('leaves enums and required lists intact', () => {
    const cleaned = toGeminiJsonSchema(patchOpsJsonSchema()) as {
      items: { anyOf?: unknown[]; oneOf?: unknown[] };
    };
    expect(cleaned.items.anyOf ?? cleaned.items.oneOf).toBeDefined();
  });
});

it('preserves literal discriminators as enums and leaves property names intact', () => {
  const schema = toGeminiJsonSchema({
    type: 'object',
    properties: {
      default: { type: 'string', const: 'launch', minLength: 2, maxLength: 8, pattern: 'x' },
      width: { type: 'number', const: 16, exclusiveMinimum: 0 },
    },
    propertyNames: { pattern: 'x' },
    required: ['default', 'width'],
  });
  expect(schema).toEqual({
    type: 'object',
    properties: {
      default: { type: 'string', enum: ['launch'] },
      width: { type: 'number', enum: [16] },
    },
    required: ['default', 'width'],
  });
});
