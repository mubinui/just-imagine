import type { BilingualText, LessonDoc, LessonStep, QuizItem } from '@just-imagine/protocol';
import { chapterById, reagentById } from '@just-imagine/stem-content';
import styles from './LessonMaterials.module.css';

export type MaterialLanguage = 'en' | 'bn';
export type MaterialKind = 'notes' | 'worksheet';
const COPY = {
  en: {
    notes: 'Lesson notes',
    worksheet: 'Worksheet',
    grade: 'Grade',
    revision: 'Saved revision',
    review:
      'Review required — this lesson is not published. Check its science, translation and questions before classroom use.',
    archived: 'Archived lesson — review required before classroom use.',
    missing: 'Not written in this language.',
    explanation: 'Explanation',
    investigation: 'Investigation',
    practice: 'Practice · no points',
    quiz: 'Quiz',
    answer: 'Answer / reasoning',
    observations: 'Prediction, observations and explanation',
    settings: 'Starting settings',
    parameter: 'Quantity',
    value: 'Value',
    fixed: 'Fixed',
    editable: 'You may change',
    reagents: 'Available virtual reagents',
    virtual:
      'Use the virtual bench. This worksheet is not a procedure for a real chemical experiment.',
    name: 'Name',
    date: 'Date',
    empty: 'No explanatory notes have been written for this lesson.',
    units: 'Include units and show your reasoning.',
    model: 'Model task',
    lab: 'Virtual experiment',
    series: 'Series',
    parallel: 'Parallel',
    yes: 'Yes',
    no: 'No',
  },
  bn: {
    notes: 'পাঠের নোট',
    worksheet: 'অনুশীলনপত্র',
    grade: 'শ্রেণি',
    revision: 'সংরক্ষিত সংস্করণ',
    review:
      'পর্যালোচনা প্রয়োজন — পাঠটি প্রকাশিত নয়। শ্রেণিকক্ষে ব্যবহারের আগে বিজ্ঞান, অনুবাদ ও প্রশ্নগুলো যাচাই করুন।',
    archived: 'আর্কাইভ করা পাঠ — শ্রেণিকক্ষে ব্যবহারের আগে পর্যালোচনা প্রয়োজন।',
    missing: 'এই ভাষায় লেখা নেই।',
    explanation: 'ব্যাখ্যা',
    investigation: 'অনুসন্ধান',
    practice: 'অনুশীলন · নম্বরবিহীন',
    quiz: 'কুইজ',
    answer: 'উত্তর / যুক্তি',
    observations: 'অনুমান, পর্যবেক্ষণ ও ব্যাখ্যা',
    settings: 'শুরুর মান',
    parameter: 'রাশি',
    value: 'মান',
    fixed: 'অপরিবর্তনীয়',
    editable: 'যা বদলাতে পারো',
    reagents: 'ভার্চুয়াল বিকারকসমূহ',
    virtual:
      'ভার্চুয়াল বেঞ্চ ব্যবহার করো। এই অনুশীলনপত্র বাস্তব রাসায়নিক পরীক্ষা করার নির্দেশিকা নয়।',
    name: 'নাম',
    date: 'তারিখ',
    empty: 'এই পাঠের ব্যাখ্যামূলক নোট এখনো লেখা হয়নি।',
    units: 'এককসহ উত্তর ও যুক্তি লেখো।',
    model: 'মডেলভিত্তিক কাজ',
    lab: 'ভার্চুয়াল পরীক্ষা',
    series: 'শ্রেণি সংযোগ',
    parallel: 'সমান্তরাল সংযোগ',
    yes: 'হ্যাঁ',
    no: 'না',
  },
} as const;

// Labels describe the public parameter schemas; no model solutions or private predicates are used.
const PARAMETERS: Record<string, { en: string; bn: string; unit?: string }> = {
  u: { en: 'Initial velocity', bn: 'আদি বেগ', unit: 'm/s' },
  a: { en: 'Acceleration', bn: 'ত্বরণ', unit: 'm/s²' },
  duration: { en: 'Run duration', bn: 'সময়কাল', unit: 's' },
  mass: { en: 'Mass', bn: 'ভর', unit: 'kg' },
  force: { en: 'Applied force', bn: 'প্রযুক্ত বল', unit: 'N' },
  muS: { en: 'Static friction coefficient', bn: 'স্থিতি ঘর্ষণ গুণাঙ্ক' },
  muK: { en: 'Kinetic friction coefficient', bn: 'গতি ঘর্ষণ গুণাঙ্ক' },
  emf: { en: 'Source voltage', bn: 'উৎসের বিভব', unit: 'V' },
  topology: { en: 'Connection', bn: 'সংযোগ' },
  resistors: { en: 'Resistances', bn: 'রোধের মান', unit: 'Ω' },
  m: { en: 'Slope', bn: 'ঢাল' },
  c: { en: 'Vertical intercept', bn: 'উল্লম্ব অক্ষের ছেদক' },
  angleDeg: { en: 'Angle', bn: 'কোণ', unit: '°' },
};

function passage(value: BilingualText, language: MaterialLanguage) {
  return value[language].trim() || COPY[language].missing;
}
function Paragraphs({ value, language }: { value: BilingualText; language: MaterialLanguage }) {
  return (
    <div className={styles.prose}>
      {passage(value, language)
        .split(/\n\s*\n/)
        .map((p, i) => (
          <p key={i}>{p}</p>
        ))}
    </div>
  );
}
function Settings({
  params,
  language,
  editable,
  locked,
}: {
  params: Record<string, unknown>;
  language: MaterialLanguage;
  editable?: string[];
  locked?: string[];
}) {
  const copy = COPY[language];
  const rows = Object.entries(params).filter(
    ([, value]) =>
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      (Array.isArray(value) && value.every((v) => typeof v === 'number')),
  );
  if (!rows.length) return null;
  return (
    <table className={styles.settings}>
      <caption>{copy.settings}</caption>
      <thead>
        <tr>
          <th scope="col">{copy.parameter}</th>
          <th scope="col">{copy.value}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([key, value]) => {
          const meta = PARAMETERS[key];
          const display =
            value === 'series'
              ? copy.series
              : value === 'parallel'
                ? copy.parallel
                : typeof value === 'boolean'
                  ? value
                    ? copy.yes
                    : copy.no
                  : Array.isArray(value)
                    ? value.join(', ')
                    : String(value);
          const fixed = editable ? !editable.includes(key) : locked?.includes(key);
          return (
            <tr key={key}>
              <th scope="row">
                {meta?.[language] ?? key}
                {fixed && <span className={styles.fixed}> · {copy.fixed}</span>}
              </th>
              <td>
                {display}
                {meta?.unit ? ` ${meta.unit}` : ''}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
function Reagents({ ids, language }: { ids: string[]; language: MaterialLanguage }) {
  return (
    <div className={styles.reagents}>
      <h4>{COPY[language].reagents}</h4>
      <ul>
        {ids.map((id) => {
          const reagent = reagentById(id);
          return (
            <li key={id}>
              {reagent?.name[language] ?? id}
              {reagent?.formula ? ` (${reagent.formula})` : ''}
            </li>
          );
        })}
      </ul>
      <p>{COPY[language].virtual}</p>
    </div>
  );
}
function AnswerSpace({
  language,
  investigation = false,
}: {
  language: MaterialLanguage;
  investigation?: boolean;
}) {
  return (
    <div
      className={styles.answerSpace}
      aria-label={investigation ? COPY[language].observations : COPY[language].answer}
    >
      <p>{investigation ? COPY[language].observations : COPY[language].answer}</p>
      <div />
      <div />
      <div />
    </div>
  );
}
function Investigation({
  step,
  language,
  worksheet,
}: {
  step: Extract<LessonStep, { kind: 'explore' | 'lab' }>;
  language: MaterialLanguage;
  worksheet: boolean;
}) {
  return (
    <section className={styles.section}>
      <h3>{COPY[language].investigation}</h3>
      {step.kind === 'explore' ? (
        <>
          <Settings params={step.params} locked={step.lockedParams} language={language} />
          <ol className={styles.prompts}>
            {step.prompts.map((prompt, i) => (
              <li key={i}>
                <Paragraphs value={prompt} language={language} />
              </li>
            ))}
          </ol>
        </>
      ) : (
        <>
          {step.goal && <Paragraphs value={step.goal} language={language} />}
          <Reagents ids={step.reagentIds} language={language} />
        </>
      )}
      {worksheet && <AnswerSpace language={language} investigation />}
    </section>
  );
}
function Question({
  item,
  number,
  language,
}: {
  item: QuizItem;
  number: number;
  language: MaterialLanguage;
}) {
  const copy = COPY[language];
  return (
    <section className={styles.question} data-item-kind={item.kind}>
      <h4>
        <span>{number}. </span>
        {passage(item.prompt, language)}
      </h4>
      {item.kind === 'mcq' && (
        <ol type="A" className={styles.options}>
          {item.options.map((option, i) => (
            <li key={i}>{passage(option, language)}</li>
          ))}
        </ol>
      )}
      {item.kind === 'numeric' && item.unit && (
        <p className={styles.unit}>
          {language === 'bn' ? 'উত্তরের একক' : 'Answer unit'}: {item.unit}
        </p>
      )}
      {item.kind === 'simTask' && (
        <>
          <p>
            {copy.model} · {copy.editable}:{' '}
            {item.editableParams.map((key) => PARAMETERS[key]?.[language] ?? key).join(', ')}
          </p>
          <Settings params={item.startParams} editable={item.editableParams} language={language} />
        </>
      )}
      {item.kind === 'labTask' && <Reagents ids={item.reagentIds} language={language} />}
      <AnswerSpace language={language} />
    </section>
  );
}

/** Deliberately accepts only public lesson content, never keys, hints or attempts. */
export function LessonMaterials({
  lesson,
  language,
  kind,
  audience = 'teacher',
}: {
  lesson: LessonDoc;
  language: MaterialLanguage;
  kind: MaterialKind;
  /** Students see the document only, without authoring details such as the saved revision. */
  audience?: 'teacher' | 'admin' | 'student';
}) {
  const copy = COPY[language];
  const chapter = chapterById(lesson.chapterId);
  const review =
    lesson.status === 'archived'
      ? copy.archived
      : lesson.status !== 'published'
        ? copy.review
        : null;
  let questionNumber = 0;
  return (
    <article className={styles.document} lang={language} data-material-kind={kind}>
      <header className={styles.documentHeader}>
        <h1>{passage(lesson.title, language)}</h1>
        <h2>{copy[kind]}</h2>
        <p>
          {copy.grade} {lesson.grade} · {chapter?.title[language] ?? lesson.chapterId}
          {audience !== 'student' && (
            <>
              {' '}
              · {copy.revision} {lesson.revision}
            </>
          )}
        </p>
        {review && (
          <p className={styles.review} role="note">
            {review}
          </p>
        )}
        {kind === 'worksheet' && (
          <>
            <div className={styles.identity}>
              <span>{copy.name}: ____________________</span>
              <span>{copy.date}: ______________</span>
            </div>
            <p>{copy.units}</p>
          </>
        )}
      </header>
      {kind === 'notes' &&
        !lesson.steps.some(
          (step) => step.kind === 'intro' || step.kind === 'explore' || step.kind === 'lab',
        ) && <p>{copy.empty}</p>}
      {lesson.steps.map((step, index) => {
        if (step.kind === 'intro')
          return kind === 'notes' ? (
            <section key={index} className={styles.section}>
              <h3>{copy.explanation}</h3>
              <Paragraphs value={step.body} language={language} />
            </section>
          ) : null;
        if (step.kind === 'explore' || step.kind === 'lab')
          return (
            <Investigation
              key={index}
              step={step}
              language={language}
              worksheet={kind === 'worksheet'}
            />
          );
        if (kind === 'notes') return null;
        const items = step.kind === 'check' ? [step.item] : step.items;
        return (
          <section key={index} className={styles.assessment}>
            <div className={styles.assessmentStart}>
              <h3>{step.kind === 'check' ? copy.practice : copy.quiz}</h3>
              {items[0] && (
                <Question item={items[0]} number={++questionNumber} language={language} />
              )}
            </div>
            {items.slice(1).map((item) => (
              <Question key={item.id} item={item} number={++questionNumber} language={language} />
            ))}
          </section>
        );
      })}
    </article>
  );
}
