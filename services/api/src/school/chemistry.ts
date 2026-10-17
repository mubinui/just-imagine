import { z } from 'zod';
import {
  ReactionSchema,
  SolutionAmountsSchema,
  mix,
  isBalanced,
  parseEquation,
} from '@just-imagine/stem-sims';
import { REAGENTS, REACTIONS } from '@just-imagine/stem-content';
import { DocumentIdSchema, BilingualTextSchema } from '@just-imagine/protocol';
import type { StudentActor } from '@just-imagine/server-core';
import { studentLesson } from './lessons';
import { db, fail, hash } from './common';
import { reserveAi, vertexSchoolModel, modelResult, type SchoolModel } from './ai';
export const ReactBodySchema = z.strictObject({
  lessonId: DocumentIdSchema.optional(),
  stepIndex: z.number().int().nonnegative().optional(),
  reagentIds: z.array(z.string()).min(1).max(12),
  heat: z.boolean(),
  amounts: SolutionAmountsSchema.optional(),
});
export function validatePredictedReaction(
  reaction: z.infer<typeof ReactionSchema>,
  chosen: readonly string[],
  heat: boolean,
) {
  if (
    !isBalanced(reaction.equation) ||
    reaction.reagents.some((id) => !chosen.includes(id)) ||
    (reaction.requires.heat !== heat && reaction.requires.heat)
  )
    return false;
  const { reactants, products } = parseEquation(reaction.equation);
  if ([...reactants, ...products].some((t) => t.coefficient > 20)) return false;
  const formulas = chosen
    .map((id) => REAGENTS.find((r) => r.id === id))
    .filter((r) => r && r.kind !== 'indicator' && r.kind !== 'catalyst')
    .map((r) => r!.formula);
  if (
    reactants.some((t) => !formulas.includes(t.formula)) ||
    formulas.some((f) => !reactants.some((t) => t.formula === f))
  )
    return false;
  if (
    products
      .map((p) => p.formula)
      .sort()
      .join('|') !==
    reaction.products
      .map((p) => p.formula)
      .sort()
      .join('|')
  )
    return false;
  const gases = reaction.products.filter((p) => p.state === 'g');
  if (gases.length > 1 || (gases[0]?.formula ?? undefined) !== reaction.observations.gas)
    return false;
  if (
    reaction.observations.precipitate &&
    !reaction.products.some(
      (p) => p.state === 's' && p.formula === reaction.observations.precipitate!.formula,
    )
  )
    return false;
  return true;
}
export async function react(
  actor: StudentActor,
  input: unknown,
  model: SchoolModel = vertexSchoolModel,
) {
  const body = ReactBodySchema.parse(input);
  if ((body.lessonId === undefined) !== (body.stepIndex === undefined))
    return fail(400, 'Choose a lesson and lab step together.');
  if (body.lessonId !== undefined) {
    const lesson = await studentLesson(actor, body.lessonId),
      step = lesson.steps[body.stepIndex!];
    if (!step || step.kind !== 'lab' || body.reagentIds.some((id) => !step.reagentIds.includes(id)))
      return fail(400, 'Choose only reagents offered on this lesson’s bench.');
  }
  if (body.reagentIds.some((id) => !REAGENTS.some((r) => r.id === id)))
    return fail(400, 'Choose only known virtual bench reagents.');
  const result = mix(body, REAGENTS, REACTIONS);
  if (result.reaction) return { status: 'reaction' as const, source: 'table' as const, result };
  const cacheRef = db().doc('aiReactions/' + hash(result.key)),
    cached = await cacheRef.get();
  if (cached.exists) {
    const reaction = ReactionSchema.parse(cached.get('reaction'));
    if (validatePredictedReaction(reaction, body.reagentIds, body.heat))
      return {
        status: 'reaction' as const,
        source: 'ai' as const,
        result: mix(body, REAGENTS, [reaction]),
      };
  }
  await reserveAi(actor.schoolId, 'aiReactions');
  const schema = z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('reaction'), reaction: ReactionSchema }),
    z.object({ kind: z.literal('unsupported'), explanation: BilingualTextSchema }),
  ]);
  const predicted = await modelResult(
    model,
    'Predict only the qualitative result of a closed virtual school chemistry bench. Do not provide quantities, instructions, temperatures, hazardous procedures or real experimental guidance. Respond unsupported if there is no observable reaction, an unsafe result or uncertainty. Otherwise return a balanced equation with coefficients at most20, exactly the chosen non-indicator/non-catalyst reactants, accurate products, gas/precipitate flags and bilingual explanation. This is an idealized simulation; quantities are computed by deterministic code. Chosen data: ' +
      JSON.stringify({
        reagents: REAGENTS.filter((r) => body.reagentIds.includes(r.id)),
        heat: body.heat,
      }),
    schema,
  );
  if (
    predicted.kind !== 'reaction' ||
    !validatePredictedReaction(predicted.reaction, body.reagentIds, body.heat)
  )
    return {
      status: 'unsupported' as const,
      message: 'No reaction we can show reliably yet. Try a curated lesson combination.',
    };
  await cacheRef.set({ reaction: predicted.reaction, source: 'ai', createdAt: Date.now() });
  return {
    status: 'reaction' as const,
    source: 'ai' as const,
    result: mix(body, REAGENTS, [predicted.reaction]),
  };
}
