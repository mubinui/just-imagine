import { z } from 'zod';
import { SimIdSchema, type SimId } from '@just-imagine/stem-sims';

/**
 * NCTB secondary (classes 9-10), 2026 books. Chapter order checked against the
 * official English contents pages and the Bangla Physics contents on 2026-10-17.
 * Primary links and edition notes: docs/handoff/school-content-verification.md.
 */
export const TAXONOMY_SOURCE_NOTE =
  'NCTB 2026 class 9–10 books; official chapter order verified 2026-10-17.';

export const SubjectIdSchema = z.enum(['physics', 'chemistry', 'math']);
export type SubjectId = z.infer<typeof SubjectIdSchema>;
export const GradeSchema = z.union([z.literal(9), z.literal(10)]);
export type Grade = z.infer<typeof GradeSchema>;
export const BookSchema = z.enum(['physics', 'chemistry', 'general-math', 'higher-math']);

export const ChapterSchema = z.strictObject({
  id: z.string().regex(/^[a-z]+(-[a-z]+)*-\d+$/),
  subject: SubjectIdSchema,
  book: BookSchema,
  number: z.number().int().min(1).max(20),
  title: z.strictObject({ en: z.string().min(1), bn: z.string().min(1) }),
  sims: z.array(SimIdSchema),
  lab: z.boolean(),
});
export type Chapter = z.infer<typeof ChapterSchema>;

type Row = readonly [en: string, bn: string, sims?: readonly SimId[], lab?: boolean];

function book(
  subject: SubjectId,
  bookId: z.infer<typeof BookSchema>,
  prefix: string,
  rows: readonly Row[],
): Chapter[] {
  return rows.map(([en, bn, sims = [], lab = false], index) => ({
    id: `${prefix}-${index + 1}`,
    subject,
    book: bookId,
    number: index + 1,
    title: { en, bn },
    sims: [...sims],
    lab,
  }));
}

const PHYSICS: Row[] = [
  ['Physical quantities and their measurement', 'ভৌত রাশি এবং পরিমাপ'],
  ['Motion', 'গতি', ['motion-graphs', 'projectile', 'vector-addition']],
  ['Force', 'বল', ['newton-cart', 'vector-addition', 'incline', 'collision', 'orbit']],
  ['Work, power and energy', 'কাজ, ক্ষমতা ও শক্তি', ['pendulum', 'spring']],
  ['State of matter and pressure', 'পদার্থের অবস্থা ও চাপ', ['gas-law']],
  ['Effect of heat on substances', 'বস্তুর উপর তাপের প্রভাব'],
  ['Waves and sound', 'তরঙ্গ ও শব্দ', ['pendulum', 'spring']],
  ['Reflection of light', 'আলোর প্রতিফলন'],
  ['Refraction of light', 'আলোর প্রতিসরণ'],
  ['Static electricity', 'স্থির বিদ্যুৎ'],
  ['Current electricity', 'চল বিদ্যুৎ', ['ohms-circuit']],
  ['Magnetic effects of current', 'বিদ্যুতের চৌম্বক ক্রিয়া'],
  ['Radioactivity and electronics', 'তেজস্ক্রিয়তা ও ইলেকট্রনিক্স'],
];

const CHEMISTRY: Row[] = [
  ['Concepts of chemistry', 'রসায়নের ধারণা'],
  ['States of matter', 'পদার্থের অবস্থা', ['gas-law']],
  ['Structure of matter', 'পদার্থের গঠন', ['flame-test']],
  ['Periodic table', 'পর্যায় সারণি'],
  ['Chemical bonds', 'রাসায়নিক বন্ধন'],
  ['Concept of mole and chemical counting', 'মোলের ধারণা ও রাসায়নিক গণনা', ['titration']],
  ['Chemical reactions', 'রাসায়নিক বিক্রিয়া', ['reaction-rate'], true],
  ['Chemistry and energy', 'রসায়ন ও শক্তি'],
  ['Acid-base balance', 'এসিড-ক্ষারক সমতা', ['ph-indicator', 'titration'], true],
  ['Mineral resources: metals and non-metals', 'খনিজ সম্পদ: ধাতু-অধাতু', ['flame-test']],
  ['Mineral resources: fossils', 'খনিজ সম্পদ: জীবাশ্ম'],
  ['Chemistry in our lives', 'আমাদের জীবনে রসায়ন'],
];

const GENERAL_MATH: Row[] = [
  ['Real numbers', 'বাস্তব সংখ্যা'],
  ['Sets and functions', 'সেট ও ফাংশন', ['function-grapher']],
  ['Algebraic expressions', 'বীজগাণিতিক রাশি'],
  ['Exponents and logarithms', 'সূচক ও লগারিদম', ['function-grapher']],
  ['Equations in one variable', 'এক চলকবিশিষ্ট সমীকরণ'],
  ['Lines, angles and triangles', 'রেখা, কোণ ও ত্রিভুজ'],
  ['Practical geometry', 'ব্যবহারিক জ্যামিতি'],
  ['Circles', 'বৃত্ত'],
  ['Trigonometric ratios', 'ত্রিকোণমিতিক অনুপাত', ['unit-circle', 'trig-waves']],
  ['Distance and height', 'দূরত্ব ও উচ্চতা'],
  ['Algebraic ratio and proportion', 'বীজগাণিতিক অনুপাত ও সমানুপাত'],
  [
    'Simple simultaneous equations in two variables',
    'দুই চলকবিশিষ্ট সরল সহসমীকরণ',
    ['linear-graph'],
  ],
  ['Finite series', 'সসীম ধারা'],
  ['Ratio, similarity and symmetry', 'অনুপাত, সদৃশতা ও প্রতিসমতা'],
  ['Area-related theorems and constructions', 'ক্ষেত্রফল সম্পর্কিত উপপাদ্য ও সম্পাদ্য'],
  ['Mensuration', 'পরিমিতি', ['riemann-area']],
  ['Statistics', 'পরিসংখ্যান'],
];

const HIGHER_MATH: Row[] = [
  ['Sets and functions', 'সেট ও ফাংশন', ['function-grapher']],
  ['Algebraic expressions', 'বীজগাণিতিক রাশি'],
  ['Geometry', 'জ্যামিতি'],
  ['Geometric constructions', 'জ্যামিতিক অঙ্কন'],
  ['Equations', 'সমীকরণ'],
  ['Inequalities', 'অসমতা'],
  ['Infinite series', 'অসীম ধারা'],
  ['Trigonometry', 'ত্রিকোণমিতি', ['unit-circle', 'trig-waves']],
  ['Exponential and logarithmic functions', 'সূচকীয় ও লগারিদমীয় ফাংশন', ['function-grapher']],
  ['Binomial expansion', 'দ্বিপদী বিস্তৃতি'],
  [
    'Coordinate geometry',
    'স্থানাঙ্ক জ্যামিতি',
    ['linear-graph', 'function-grapher', 'derivative', 'riemann-area'],
  ],
  ['Plane vectors', 'সমতলীয় ভেক্টর', ['vector-addition']],
  ['Solid geometry', 'ঘন জ্যামিতি'],
  ['Probability', 'সম্ভাবনা', ['probability']],
];

export const CHAPTERS: readonly Chapter[] = [
  ...book('physics', 'physics', 'physics', PHYSICS),
  ...book('chemistry', 'chemistry', 'chemistry', CHEMISTRY),
  ...book('math', 'general-math', 'math-gm', GENERAL_MATH),
  ...book('math', 'higher-math', 'math-hm', HIGHER_MATH),
];

const BY_ID = new Map(CHAPTERS.map((c) => [c.id, c]));
export const chapterById = (id: string): Chapter | undefined => BY_ID.get(id);
export const chaptersFor = (subject: SubjectId): Chapter[] =>
  CHAPTERS.filter((c) => c.subject === subject);
