import type { BilingualText, LessonDoc, LessonKeysDocSchema } from './school';
import type { z } from 'zod';

export type LessonQualityCode =
  | 'empty-text'
  | 'placeholder'
  | 'language'
  | 'missing-intro'
  | 'missing-quiz'
  | 'missing-instruction'
  | 'missing-goal'
  | 'missing-key'
  | 'missing-hint'
  | 'duplicate-option'
  | 'duplicate-question'
  | 'missing-example'
  | 'wide-tolerance'
  | 'no-practice'
  | 'repeated-hint'
  | 'answer-pattern'
  | 'assessment-variety';
export type LessonQualityIssue = {
  code: LessonQualityCode;
  severity: 'error' | 'warning';
  field?: 'title' | 'explanation' | 'instruction' | 'goal' | 'question' | 'option' | 'hint';
  step?: number;
  item?: number;
  language?: 'en' | 'bn';
};
type Keys = z.infer<typeof LessonKeysDocSchema>;
const normalized = (text: string) =>
  text.normalize('NFKC').trim().toLocaleLowerCase().replace(/\s+/gu, ' ');
const placeholder =
  /^(?:todo|tbd|placeholder|lorem ipsum(?:.*)?|(?:insert|write) .+ here|এখানে .+ লিখুন)$/iu;

/** Science notation may keep Latin symbols in Bangla; prose must use the requested language. */
export function lessonTextUsesLanguage(text: string, language: 'en' | 'bn'): boolean {
  if (language === 'en') return !/\p{Script=Bengali}/u.test(text);
  if ((text.match(/\p{Letter}/gu) ?? []).some((letter) => /\p{Script=Bengali}/u.test(letter)))
    return true;
  const withoutNotation = text
    .replace(/\p{Script=Greek}/gu, '')
    .replace(/\b(?:[A-Z][a-z]?\d*)+\b/gu, '')
    .replace(/\b(?:[a-z]|kg|mol|mL|mm|cm|km|sin|cos|tan)\b/gu, '');
  return !/\p{Letter}/u.test(withoutNotation);
}

/** Automated readiness, not scientific certification. Model witnesses are checked by the API. */
export function lessonPublicationChecks(lesson: LessonDoc, keys: Keys) {
  const issues: LessonQualityIssue[] = [];
  const add = (
    code: LessonQualityCode,
    at: Omit<LessonQualityIssue, 'code' | 'severity'> = {},
    severity: 'error' | 'warning' = 'error',
  ) => issues.push({ code, severity, ...at });
  const inspect = (
    value: BilingualText,
    at: Omit<LessonQualityIssue, 'code' | 'severity' | 'language'>,
  ) => {
    for (const language of ['en', 'bn'] as const) {
      const text = value[language].trim();
      if (!text) add('empty-text', { ...at, language });
      else if (placeholder.test(text.replace(/[.!।]+$/u, '')))
        add('placeholder', { ...at, language });
      else if (!lessonTextUsesLanguage(text, language)) add('language', { ...at, language });
    }
  };
  inspect(lesson.title, { field: 'title' });
  const firstQuiz = lesson.steps.findIndex((step) => step.kind === 'quiz');
  if (!lesson.steps.some((step, i) => step.kind === 'intro' && (firstQuiz < 0 || i < firstQuiz)))
    add('missing-intro');
  if (firstQuiz < 0) add('missing-quiz');
  if (!lesson.steps.some((step) => step.kind === 'check')) add('no-practice', {}, 'warning');
  const quizPrompts = { en: new Set<string>(), bn: new Set<string>() };
  const hintTexts: string[] = [],
    mcqAnswers: number[] = [],
    kinds = new Set<string>();
  let quizCount = 0;
  lesson.steps.forEach((step, index) => {
    const at = { step: index + 1 };
    if (step.kind === 'intro') inspect(step.body, { ...at, field: 'explanation' });
    if (step.kind === 'explore') {
      if (!step.prompts.length) add('missing-instruction', at);
      step.prompts.forEach((prompt) => inspect(prompt, { ...at, field: 'instruction' }));
    }
    if (step.kind === 'lab') {
      if (!step.goal) add('missing-goal', at);
      else inspect(step.goal, { ...at, field: 'goal' });
    }
    const items = step.kind === 'check' ? [step.item] : step.kind === 'quiz' ? step.items : [];
    items.forEach((item, itemIndex) => {
      const location = { ...at, item: itemIndex + 1 };
      inspect(item.prompt, { ...location, field: 'question' });
      if (step.kind === 'quiz') {
        quizCount++;
        kinds.add(item.kind);
        for (const language of ['en', 'bn'] as const) {
          const prompt = normalized(item.prompt[language]);
          if (prompt && quizPrompts[language].has(prompt))
            add('duplicate-question', { ...location, language });
          quizPrompts[language].add(prompt);
        }
      }
      if (item.kind === 'mcq') {
        item.options.forEach((option) => inspect(option, { ...location, field: 'option' }));
        for (const language of ['en', 'bn'] as const) {
          const choices = item.options
            .map((option) => normalized(option[language]))
            .filter(Boolean);
          if (new Set(choices).size !== choices.length)
            add('duplicate-option', { ...location, language });
        }
      }
      const entry = keys.items[item.id];
      if (!entry) {
        add('missing-key', location);
        return;
      }
      if (!entry.hints.length) add('missing-hint', { ...location, field: 'hint' });
      entry.hints.forEach((hint) => inspect(hint, { ...location, field: 'hint' }));
      if (entry.hints[0]) hintTexts.push(normalized(entry.hints[0].en));
      if (entry.key.kind === 'simTask' || entry.key.kind === 'labTask') {
        if (entry.key.exampleAnswer === undefined) add('missing-example', location);
      }
      if (
        entry.key.kind === 'numeric' &&
        entry.key.tolerance.mode === 'rel' &&
        entry.key.tolerance.amount > 1
      )
        add('wide-tolerance', location);
      if (step.kind === 'quiz' && entry.key.kind === 'mcq') mcqAnswers.push(entry.key.answer);
    });
  });
  if (hintTexts.length >= 3 && new Set(hintTexts).size === 1) add('repeated-hint', {}, 'warning');
  if (mcqAnswers.length >= 3 && new Set(mcqAnswers).size === 1)
    add('answer-pattern', {}, 'warning');
  if (quizCount >= 3 && kinds.size === 1) add('assessment-variety', {}, 'warning');
  const uniqueIssues = [...new Map(issues.map((issue) => [JSON.stringify(issue), issue])).values()];
  return { ready: !uniqueIssues.some((issue) => issue.severity === 'error'), issues: uniqueIssues };
}

/** Numeric facts are protected across AI prose edits/translation, including Bengali digits. */
export function lessonNumericFacts(text: string): string[] {
  const value = text
    .normalize('NFKC')
    .replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 0x09e6))
    .replace(/[−–]/g, '-');
  return [...value.matchAll(/[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/g)]
    .map((match) => String(Number(match[0])))
    .sort();
}
export function preservesLessonNumbers(source: string, proposed: string): boolean {
  return (
    JSON.stringify(lessonNumericFacts(source)) === JSON.stringify(lessonNumericFacts(proposed))
  );
}

function quantities(text: string): string[] {
  const normalized = text
    .normalize('NFKC')
    .replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 0x09e6))
    .replace(/[−–]/g, '-')
    .replace(/কিলোগ্রাম|কেজি|kilograms?/giu, 'kg')
    .replace(/মিলিলিটার|millilitres?|milliliters?/giu, 'mL')
    .replace(/নিউটন|newtons?/giu, 'N')
    .replace(/সেকেন্ড|seconds?/giu, 's')
    .replace(/মিটার|metres?|meters?/giu, 'm')
    .replace(/ভোল্ট|volts?/giu, 'V')
    .replace(/অ্যাম্পিয়ার|amperes?/giu, 'A')
    .replace(/ওহম|ohms?/giu, 'Ω')
    .replace(/মোল|moles?/giu, 'mol');
  return [
    ...normalized.matchAll(
      /([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)\s*(m\/s2|m\/s|km\/h|kg|mg|km|cm|mm|mL|mol|kPa|Pa|°C|Ω|N|J|W|V|A|L|g|m|s|°|%)(?=$|[^\p{Letter}])/gu,
    ),
  ]
    .map((match) => `${Number(match[1])}:${match[2]}`)
    .sort();
}
export function preservesLessonFacts(source: string, proposed: string): boolean {
  return (
    preservesLessonNumbers(source, proposed) &&
    JSON.stringify(quantities(source)) === JSON.stringify(quantities(proposed))
  );
}
