import {
  LessonTextAssistRequestSchema,
  type LessonTextAssistRequest,
} from '@just-imagine/protocol';

export type LessonTextBase = Pick<
  LessonTextAssistRequest,
  'subject' | 'grade' | 'chapterId' | 'title'
>;
export type LessonTextField = LessonTextAssistRequest['field'];
export type TextAssistSource = {
  base: LessonTextBase;
  field: LessonTextField;
  language: 'en' | 'bn';
  text: string;
  context: string;
};
export type TextAssistCapture = {
  source: TextAssistSource;
  fingerprint: string;
};
export const TEXT_STYLES = {
  clear:
    'Use clear, age-appropriate language. Preserve scientific facts, quantities, units and the intended task.',
  short: 'Make it concise without removing essential facts, quantities, units or instructions.',
  steps:
    'Use short, clear steps while preserving the intended task, scientific facts, quantities and units.',
} as const;

/** Keep the complete local context for stale checks even when the outbound context is bounded. */
export function captureTextAssist(source: TextAssistSource): TextAssistCapture {
  return {
    source: { ...source, base: { ...source.base, title: { ...source.base.title } } },
    fingerprint: JSON.stringify(source),
  };
}
export function textAssistRequest(
  capture: TextAssistCapture,
  style: keyof typeof TEXT_STYLES,
  instruction: string,
): LessonTextAssistRequest {
  const { base, field, language, text, context } = capture.source;
  return LessonTextAssistRequestSchema.parse({
    ...base,
    field,
    language,
    text,
    context: context.slice(0, 4000),
    instruction: [TEXT_STYLES[style], instruction.trim()].filter(Boolean).join('\n'),
  });
}
export function canApplyTextAssist(capture: TextAssistCapture, current: TextAssistSource): boolean {
  return capture.fingerprint === JSON.stringify(current);
}
/** Update exactly one language; answer keys, simulation values and the opposite text are untouched. */
export function applyTextAssist(
  value: { en: string; bn: string },
  capture: TextAssistCapture,
  current: TextAssistSource,
  proposal: string,
): { en: string; bn: string } | null {
  if (
    value[current.language] !== current.text ||
    !canApplyTextAssist(capture, current) ||
    !proposal.trim() ||
    proposal.length > 4000
  )
    return null;
  return { ...value, [current.language]: proposal };
}
export function invalidateTextApprovals<T extends { approved: { en: boolean; bn: boolean } }>(
  lesson: T,
): T {
  return { ...lesson, approved: { en: false, bn: false } };
}
