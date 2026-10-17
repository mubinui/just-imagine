import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { LessonDoc } from '@just-imagine/protocol';
import { LessonMaterials } from '../components/school/LessonMaterials';

const text = (en: string, bn: string) => ({ en, bn });
const lesson: LessonDoc = {
  scope: 'global',
  schoolId: null,
  classIds: [],
  subject: 'physics',
  grade: 9,
  chapterId: 'physics-2',
  title: text('Motion notes', 'গতির নোট'),
  status: 'published',
  sourceLanguage: 'en',
  approved: { en: true, bn: true },
  authorUid: 'teacher',
  revision: 3,
  updatedAt: 1,
  steps: [
    {
      kind: 'intro',
      body: text(
        'Model assumptions: constant acceleration.\n\nWorked example: a different case.',
        'মডেলের অনুমান: সমত্বরণ।\n\nউদাহরণ: আলাদা একটি পরিস্থিতি।',
      ),
    },
    {
      kind: 'explore',
      simId: 'motion-graphs',
      params: { u: 4, a: 2, duration: 4 },
      lockedParams: ['u'],
      prompts: [
        text('Predict the final velocity.', 'শেষ বেগ অনুমান করো।'),
        text('Record the observed displacement.', 'পর্যবেক্ষিত সরণ লেখো।'),
      ],
    },
    {
      kind: 'check',
      item: {
        id: 'p',
        kind: 'mcq',
        prompt: text('A practice prompt', 'একটি অনুশীলন প্রশ্ন'),
        options: [text('First choice', 'প্রথম বিকল্প'), text('Second choice', 'দ্বিতীয় বিকল্প')],
        points: 2,
      },
    },
    {
      kind: 'quiz',
      items: [
        {
          id: 'q',
          kind: 'numeric',
          prompt: text('Find displacement.', 'সরণ নির্ণয় করো।'),
          unit: 'm',
          points: 2,
        },
        {
          id: 's',
          kind: 'simTask',
          prompt: text('Change acceleration to meet the goal.', 'লক্ষ্য পূরণ করতে ত্বরণ বদলাও।'),
          simId: 'motion-graphs',
          startParams: { u: 4, a: 0, duration: 4 },
          editableParams: ['a'],
          points: 3,
        },
        {
          id: 'l',
          kind: 'labTask',
          prompt: text('Compare these virtual reagents.', 'এই ভার্চুয়াল বিকারকগুলো তুলনা করো।'),
          reagentIds: ['hcl', 'naoh'],
          points: 3,
        },
      ],
    },
  ],
};

describe('saved lesson materials', () => {
  it('keeps authored explanation and assumptions in notes and unanswered questions in the worksheet', () => {
    const notes = renderToStaticMarkup(
      <LessonMaterials lesson={lesson} language="en" kind="notes" />,
    );
    const worksheet = renderToStaticMarkup(
      <LessonMaterials lesson={lesson} language="en" kind="worksheet" />,
    );
    expect(notes).toContain('Model assumptions: constant acceleration.');
    expect(notes).toContain('Worked example: a different case.');
    expect(notes).not.toContain('A practice prompt');
    expect(worksheet).not.toContain('Worked example:');
    expect(worksheet).toContain('A practice prompt');
    expect(worksheet).toContain('Practice · no points');
    expect(worksheet).toContain('First choice');
    expect(worksheet).toContain('Second choice');
    expect(worksheet).toContain('Answer / reasoning');
    expect(worksheet).toContain('Prediction, observations and explanation');
  });
  it('prints givens, restrictions, numeric units and reagent identities without calculating answers', () => {
    const html = renderToStaticMarkup(
      <LessonMaterials lesson={lesson} language="en" kind="worksheet" />,
    );
    expect(html).toContain('4 m/s');
    expect(html).toContain('2 m/s²');
    expect(html).toContain('4 s');
    expect(html).toContain('Initial velocity');
    expect(html).toContain('Fixed');
    expect(html).toContain('You may change');
    expect(html).toContain('Answer unit');
    expect(html).toContain(': m');
    expect(html).toContain('Dilute hydrochloric acid (HCl)');
    expect(html).toContain('Sodium hydroxide solution (NaOH)');
    expect(html).not.toContain('32 m');
  });
  it('never renders extra private keys, hints, example solutions or attempts supplied alongside public content', () => {
    const withPrivateExtras = {
      ...lesson,
      keys: { q: { value: 987654321, hints: ['PRIVATE_HINT'], exampleAnswer: 'PRIVATE_WITNESS' } },
      attempt: { answer: 'PRIVATE_ATTEMPT' },
    };
    for (const kind of ['notes', 'worksheet'] as const) {
      const html = renderToStaticMarkup(
        <LessonMaterials lesson={withPrivateExtras} language="en" kind={kind} />,
      );
      expect(html).not.toMatch(/987654321|PRIVATE_HINT|PRIVATE_WITNESS|PRIVATE_ATTEMPT/);
      expect(html).not.toMatch(/correct-answer|data-answer|answer-key/i);
    }
  });
  it('uses Bangla passage text, metadata and labels while retaining scientific symbols and units', () => {
    const html = renderToStaticMarkup(
      <LessonMaterials lesson={lesson} language="bn" kind="worksheet" />,
    );
    expect(html).toContain('lang="bn"');
    expect(html).toContain('অনুশীলনপত্র');
    expect(html).toContain('গতির নোট');
    expect(html).toContain('শেষ বেগ অনুমান করো।');
    expect(html).toContain('প্রথম বিকল্প');
    expect(html).toContain('উত্তরের একক');
    expect(html).toContain('সংরক্ষিত সংস্করণ');
    expect(html).toContain('m/s²');
    expect(html).not.toContain('Find displacement.');
  });
  it('marks draft and archived saved versions for review in both document types and languages', () => {
    for (const kind of ['notes', 'worksheet'] as const)
      for (const language of ['en', 'bn'] as const) {
        const draft = renderToStaticMarkup(
          <LessonMaterials
            lesson={{ ...lesson, status: 'draft' }}
            language={language}
            kind={kind}
          />,
        );
        const archived = renderToStaticMarkup(
          <LessonMaterials
            lesson={{ ...lesson, status: 'archived' }}
            language={language}
            kind={kind}
          />,
        );
        expect(draft).toContain(language === 'en' ? 'Review required' : 'পর্যালোচনা প্রয়োজন');
        expect(archived).toContain(language === 'en' ? 'Archived lesson' : 'আর্কাইভ করা পাঠ');
        expect(draft).toContain('role="note"');
      }
  });
  it('includes the saved lab goal and available reagents without adding an outcome', () => {
    const lab: LessonDoc = {
      ...lesson,
      steps: [
        {
          kind: 'lab',
          reagentIds: ['hcl', 'naoh'],
          goal: text(
            'Predict, mix and compare the indicator colour.',
            'অনুমান করে মেশাও এবং নির্দেশকের রং তুলনা করো।',
          ),
        },
      ],
    };
    const html = renderToStaticMarkup(<LessonMaterials lesson={lab} language="en" kind="notes" />);
    expect(html).toContain('Predict, mix and compare the indicator colour.');
    expect(html).toContain('Available virtual reagents');
    expect(html).toContain('not a procedure for a real chemical experiment');
    expect(html).not.toContain('pH = 7');
  });
  it('shows missing translations explicitly without quietly substituting English into a Bangla sheet', () => {
    const html = renderToStaticMarkup(
      <LessonMaterials
        lesson={{ ...lesson, title: text('English only', '') }}
        language="bn"
        kind="notes"
      />,
    );
    expect(html).toContain('এই ভাষায় লেখা নেই।');
    expect(html).not.toContain('English only');
  });
  it('escapes teacher text instead of executing markup in notes or questions', () => {
    const html = renderToStaticMarkup(
      <LessonMaterials
        lesson={{
          ...lesson,
          steps: [{ kind: 'intro', body: text('<script>alert(1)</script>', 'লেখা') }],
        }}
        language="en"
        kind="notes"
      />,
    );
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
  });
});
