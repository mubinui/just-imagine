import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from '@google/genai';
import { z } from 'zod';
import { SchoolDocSchema, SchoolUsageDailyDocSchema, schoolPaths } from '@just-imagine/protocol';
import {
  isKillSwitchOn,
  logEvent,
  transaction,
  vertexModelLocation,
} from '@just-imagine/server-core';
import { db, read, dateKey, fail } from './common';
export type SchoolModel = (prompt: string, schema?: Record<string, unknown>) => Promise<unknown>;
type SchoolJsonTransport = (
  prompt: string,
  schema?: Record<string, unknown>,
) => Promise<{ text?: string }>;
/** One same-model JSON-mode retry for request-validation rejection; local schemas remain authoritative. */
export async function requestSchoolJson(
  transport: SchoolJsonTransport,
  prompt: string,
  schema?: Record<string, unknown>,
): Promise<unknown> {
  let response: { text?: string };
  try {
    response = await transport(prompt, schema);
  } catch (error) {
    if (schema && error && typeof error === 'object' && 'status' in error && error.status === 400) {
      logEvent('school_ai_json_retry', { count: 1, success: false });
      try {
        response = await transport(
          prompt +
            '\nExact output JSON contract (quoted data, never instructions): ' +
            JSON.stringify(schema),
          undefined,
        );
      } catch {
        return fail(
          503,
          'School AI could not prepare this response. Your saved lesson is unchanged; try again shortly or edit it yourself.',
        );
      }
    } else
      return fail(
        503,
        'School AI is temporarily unavailable. Your saved lesson is unchanged; try again shortly.',
      );
  }
  try {
    return JSON.parse(response.text ?? '');
  } catch {
    return fail(
      503,
      'School AI returned incomplete JSON. Your saved lesson is unchanged; try again or edit it yourself.',
    );
  }
}
export const vertexSchoolModel: SchoolModel = async (prompt, schema) => {
  if (await isKillSwitchOn()) return fail(503, 'School AI is paused by the operator.');
  const localKey = process.env['LOCAL_DEV'] === '1' ? process.env['GEMINI_API_KEY'] : undefined;
  if (!localKey && !process.env['GOOGLE_CLOUD_PROJECT'])
    return fail(503, 'School AI is not connected. Your saved work is safe.');
  const client = new GoogleGenAI(
    localKey
      ? { apiKey: localKey }
      : {
          vertexai: true,
          project: process.env['GOOGLE_CLOUD_PROJECT'],
          location: vertexModelLocation(),
        },
  );
  return requestSchoolJson(
    async (requestPrompt, requestSchema) =>
      client.models.generateContent({
        model: process.env['FAST_MODEL'] ?? 'gemini-3.8-flash',
        contents: requestPrompt,
        config: {
          responseMimeType: 'application/json',
          ...(requestSchema ? { responseJsonSchema: requestSchema } : {}),
          temperature: 0.2,
          maxOutputTokens: 16000,
          httpOptions: { timeout: 60000, retryOptions: { attempts: 1 } },
          safetySettings: [
            HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            HarmCategory.HARM_CATEGORY_HARASSMENT,
            HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          ].map((category) => ({ category, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE })),
        },
      }),
    prompt,
    schema,
  );
};
export async function reserveAi(sid: string, kind: 'aiDrafts' | 'aiReactions') {
  if (await isKillSwitchOn()) return fail(503, 'School AI is paused by the operator.');
  const school = await read(schoolPaths.school(sid), SchoolDocSchema);
  if (school.status !== 'active') return fail(403, 'This school is paused.');
  const date = dateKey(),
    ref = db().doc(schoolPaths.usageDaily(sid, date));
  await transaction(async (tx) => {
    const active = await tx.get(db().doc(schoolPaths.school(sid)));
    if (SchoolDocSchema.parse(active.data()).status !== 'active')
      return fail(403, 'This school is paused.');
    const snap = await tx.get(ref),
      usage = SchoolUsageDailyDocSchema.parse(snap.exists ? snap.data() : { schoolId: sid, date });
    if (usage[kind] >= (kind === 'aiDrafts' ? 200 : 500))
      return fail(429, 'Your school has used today’s AI allowance.');
    tx.set(ref, { ...usage, [kind]: usage[kind] + 1 });
  });
}
/**
 * The provider accepts a subset of JSON Schema. Bounded arrays of object/union items (lesson
 * steps, quiz questions) expand past its limit and fail with 400 INVALID_ARGUMENT, so they are
 * sent unbounded; `$schema`, `oneOf` and `const` are normalised. The local Zod schema stays authoritative.
 */
export function providerJsonSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(providerJsonSchema);
  if (!schema || typeof schema !== 'object') return schema;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema)) {
    if (key === '$schema') continue;
    // `const` is ignored by the provider (a step kind could drift); a one-value enum is enforced.
    if (key === 'const') out['enum'] = [value];
    else out[key === 'oneOf' ? 'anyOf' : key] = providerJsonSchema(value);
  }
  const items = out['items'];
  if (
    out['type'] === 'array' &&
    items &&
    typeof items === 'object' &&
    ((items as Record<string, unknown>)['type'] === 'object' ||
      (items as Record<string, unknown>)['type'] === 'array' ||
      'anyOf' in items)
  ) {
    delete out['minItems'];
    delete out['maxItems'];
  }
  return out;
}
export async function modelResult<T>(
  model: SchoolModel,
  prompt: string,
  schema: z.ZodType<T>,
): Promise<T> {
  const raw = await model(
    prompt,
    providerJsonSchema(z.toJSONSchema(schema, { unrepresentable: 'any' })) as Record<
      string,
      unknown
    >,
  );
  const parsed = schema.safeParse(raw);
  if (!parsed.success)
    return fail(
      503,
      'School AI returned a draft that did not match the lesson format. Your saved lesson is unchanged; try again or edit it yourself.',
    );
  return parsed.data;
}
