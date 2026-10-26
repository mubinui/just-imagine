import {
  lessonPublicationChecks,
  StudentUsernameSchema,
  type LessonKeysDocSchema,
} from '@just-imagine/protocol';
import { CHAPTERS } from '@just-imagine/stem-content';
import type { z } from 'zod';
import type { Lesson } from './types';

type Chapter = (typeof CHAPTERS)[number];
/** A subject's chapters by textbook; mathematics has two books whose chapter numbers overlap. */
export function chapterGroups(
  subject: Lesson['subject'],
): { book: Chapter['book']; chapters: Chapter[] }[] {
  const groups = new Map<Chapter['book'], Chapter[]>();
  for (const chapter of CHAPTERS)
    if (chapter.subject === subject)
      groups.set(chapter.book, [...(groups.get(chapter.book) ?? []), chapter]);
  return [...groups].map(([book, chapters]) => ({ book, chapters }));
}

const collator = new Intl.Collator(['en', 'bn'], { numeric: true, sensitivity: 'base' });
/** "Student 2" before "Student 10"; case and accents do not reorder names. */
export const naturalCompare = (a: string, b: string) => collator.compare(a, b);

type RosterRow = { id: string; firstName: string; username: string; classId: string };
export function filterStudents<T extends RosterRow>(
  students: readonly T[],
  { query = '', classId = '' }: { query?: string; classId?: string },
): T[] {
  const needle = query.trim().toLocaleLowerCase();
  return students
    .filter(
      (s) =>
        (!classId || s.classId === classId) &&
        (!needle ||
          s.firstName.toLocaleLowerCase().includes(needle) ||
          s.username.toLocaleLowerCase().includes(needle)),
    )
    .sort(
      (a, b) => naturalCompare(a.firstName, b.firstName) || naturalCompare(a.username, b.username),
    );
}

export type ClassNameIssue = 'empty' | 'tooLong' | 'duplicate';
export function classNameIssue(
  name: string,
  classes: readonly { id: string; name: string }[],
  selfId?: string,
): ClassNameIssue | null {
  const value = name.trim();
  if (!value) return 'empty';
  if (value.length > 40) return 'tooLong';
  const key = value.toLocaleLowerCase();
  return classes.some((c) => c.id !== selfId && c.name.trim().toLocaleLowerCase() === key)
    ? 'duplicate'
    : null;
}

export type UsernameIssue = 'required' | 'format' | 'taken';
export function usernameIssue(
  value: string,
  students: readonly { id: string; username: string }[],
  selfId?: string,
): UsernameIssue | null {
  if (!value.trim()) return 'required';
  const parsed = StudentUsernameSchema.safeParse(value);
  if (!parsed.success) return 'format';
  return students.some((s) => s.id !== selfId && s.username === parsed.data) ? 'taken' : null;
}

type Keys = z.infer<typeof LessonKeysDocSchema>;
export type PublishBlocker =
  'new' | 'unsaved' | 'published' | 'archived' | 'checks' | 'approveEn' | 'approveBn';
/** Every reason the Publish action is unavailable, in the order a teacher resolves them. */
export function publishBlockers({
  lesson,
  keys,
  dirty,
  isNew,
}: {
  lesson: Lesson;
  keys: Keys;
  dirty: boolean;
  isNew: boolean;
}): PublishBlocker[] {
  if (isNew) return ['new'];
  if (dirty) return ['unsaved'];
  if (lesson.status === 'published') return ['published'];
  const out: PublishBlocker[] = [];
  if (lesson.status === 'archived') out.push('archived');
  if (!lessonPublicationChecks(lesson, keys).ready) out.push('checks');
  if (!lesson.approved.en) out.push('approveEn');
  if (!lesson.approved.bn) out.push('approveBn');
  return out;
}

export type DraftIssue = {
  /** DOM id suffix of the field to focus: `title`, `step-<index>` or `item-<id>`. */
  field: string;
  code: 'title' | 'simChapter' | 'labChapter' | 'points' | 'options' | 'number';
};
/** Problems the server would reject, found before sending so the first one can be focused. */
export function lessonDraftIssues(lesson: Lesson): DraftIssue[] {
  const issues: DraftIssue[] = [];
  if (!lesson.title[lesson.sourceLanguage].trim()) issues.push({ field: 'title', code: 'title' });
  const chapter = CHAPTERS.find((c) => c.id === lesson.chapterId);
  const sims: readonly string[] = chapter?.sims ?? [];
  lesson.steps.forEach((step, index) => {
    if (step.kind === 'explore' && !sims.includes(step.simId))
      issues.push({ field: `step-${index}`, code: 'simChapter' });
    if (step.kind === 'lab' && !chapter?.lab)
      issues.push({ field: `step-${index}`, code: 'labChapter' });
    const items = step.kind === 'quiz' ? step.items : step.kind === 'check' ? [step.item] : [];
    for (const item of items) {
      const field = `item-${item.id}`;
      if (!Number.isInteger(item.points) || item.points < 1 || item.points > 10)
        issues.push({ field, code: 'points' });
      if (item.kind === 'mcq' && item.options.length < 2) issues.push({ field, code: 'options' });
      if (item.kind === 'simTask' && !sims.includes(item.simId))
        issues.push({ field, code: 'simChapter' });
      if (item.kind === 'labTask' && !chapter?.lab) issues.push({ field, code: 'labChapter' });
    }
  });
  return issues;
}

/** Structured fields keep the teacher's raw text; only valid JSON replaces the stored value. */
export function parseJsonDraft(text: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
}

/**
 * Shared lessons this school already holds a live copy of (shared id → copy id). Older copies
 * made before provenance was recorded are matched by chapter and both titles.
 */
export function copiedLessonIds(
  schoolLessons: readonly Pick<Lesson, 'id' | 'copiedFrom' | 'status' | 'title' | 'chapterId'>[],
  sharedLessons: readonly Pick<Lesson, 'id' | 'title' | 'chapterId'>[],
): Map<string, string> {
  const live = schoolLessons.filter((l) => l.status !== 'archived');
  const found = new Map<string, string>();
  for (const shared of sharedLessons) {
    const copy =
      live.find((l) => l.copiedFrom === shared.id) ??
      live.find(
        (l) =>
          !l.copiedFrom &&
          l.chapterId === shared.chapterId &&
          l.title.en.trim() === shared.title.en.trim() &&
          l.title.bn.trim() === shared.title.bn.trim(),
      );
    if (copy) found.set(shared.id, copy.id);
  }
  return found;
}

type NoticeStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const browserStorage = (): NoticeStorage | null => {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
};
/** A confirmation that must survive `router.replace` remounting the page. */
export function rememberNotice(key: string, text: string, storage = browserStorage()) {
  try {
    storage?.setItem('ji-notice:' + key, text);
  } catch {
    /* the notice is a convenience */
  }
}
export function takeNotice(key: string, storage = browserStorage()): string {
  try {
    const value = storage?.getItem('ji-notice:' + key) ?? '';
    storage?.removeItem('ji-notice:' + key);
    return value;
  } catch {
    return '';
  }
}
