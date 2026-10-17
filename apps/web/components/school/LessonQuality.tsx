'use client';
import {
  lessonPublicationChecks,
  type LessonDoc,
  type LessonKeysDocSchema,
  type LessonQualityCode,
} from '@just-imagine/protocol';
import type { z } from 'zod';
import { useSchoolLanguage } from '../../lib/i18n/study';
import styles from './LessonQuality.module.css';

const MESSAGES: Record<LessonQualityCode, { en: string; bn: string }> = {
  'empty-text': {
    en: 'Complete this text in both languages.',
    bn: 'দুই ভাষাতেই এই লেখা সম্পূর্ণ করুন।',
  },
  placeholder: {
    en: 'Replace placeholder text with the lesson content.',
    bn: 'নমুনা লেখা সরিয়ে পাঠের বিষয়বস্তু লিখুন।',
  },
  language: {
    en: 'Use the correct language for this passage.',
    bn: 'এই অংশে নির্ধারিত ভাষায় লিখুন।',
  },
  'missing-intro': {
    en: 'Add an explanation before the graded quiz.',
    bn: 'মূল কুইজের আগে বিষয়টি ব্যাখ্যা করুন।',
  },
  'missing-quiz': {
    en: 'Add a quiz to check the learning goal.',
    bn: 'শেখার লক্ষ্য যাচাই করতে একটি কুইজ দিন।',
  },
  'missing-instruction': {
    en: 'Tell the learner what to predict, change and observe.',
    bn: 'কী অনুমান, পরিবর্তন ও পর্যবেক্ষণ করতে হবে, তা লিখুন।',
  },
  'missing-goal': {
    en: 'Write a clear goal for the virtual experiment.',
    bn: 'ভার্চুয়াল পরীক্ষার স্পষ্ট লক্ষ্য লিখুন।',
  },
  'missing-key': {
    en: 'Set the answer key and save the draft.',
    bn: 'সঠিক উত্তর নির্ধারণ করে খসড়াটি সংরক্ষণ করুন।',
  },
  'missing-hint': {
    en: 'Add at least one helpful bilingual hint for this question.',
    bn: 'এই প্রশ্নের জন্য দুই ভাষায় অন্তত একটি সহায়ক ইঙ্গিত দিন।',
  },
  'duplicate-option': {
    en: 'Make the answer choices distinct.',
    bn: 'উত্তরের বিকল্পগুলো আলাদা করুন।',
  },
  'duplicate-question': {
    en: 'Replace this repeated quiz question.',
    bn: 'পুনরাবৃত্ত কুইজ প্রশ্নটি বদলান।',
  },
  'missing-example': {
    en: 'Provide a valid example solution; the server will check it against the model.',
    bn: 'সমাধানের একটি সঠিক নমুনা দিন। সার্ভার মডেলের সাহায্যে সেটি যাচাই করবে।',
  },
  'wide-tolerance': {
    en: 'A relative tolerance must be at most 100%. Review the intended precision.',
    bn: 'আপেক্ষিক সহনসীমা সর্বোচ্চ ১০০% হতে পারে। প্রয়োজনীয় নির্ভুলতা যাচাই করুন।',
  },
  'no-practice': {
    en: 'Consider a low-stakes practice question before the quiz.',
    bn: 'কুইজের আগে নম্বরবিহীন অনুশীলন প্রশ্ন দেওয়ার কথা বিবেচনা করুন।',
  },
  'repeated-hint': {
    en: 'Use hints specific to each question.',
    bn: 'প্রতিটি প্রশ্নের উপযোগী আলাদা ইঙ্গিত দিন।',
  },
  'answer-pattern': {
    en: 'Correct MCQ answers all occupy the same position. Review the option order.',
    bn: 'সব বহুনির্বাচনি প্রশ্নের সঠিক উত্তর একই অবস্থানে আছে। বিকল্পের ক্রম যাচাই করুন।',
  },
  'assessment-variety': {
    en: 'Consider combining recall with an application or model-based question.',
    bn: 'মনে রাখার প্রশ্নের সঙ্গে প্রয়োগ বা মডেলভিত্তিক প্রশ্ন দেওয়ার কথা বিবেচনা করুন।',
  },
};

export function LessonQuality({
  lesson,
  keys,
}: {
  lesson: LessonDoc;
  keys: z.infer<typeof LessonKeysDocSchema>;
}) {
  const { language } = useSchoolLanguage();
  const report = lessonPublicationChecks(lesson, keys);
  const errors = report.issues.filter((issue) => issue.severity === 'error').length;
  return (
    <details className={`sch-section ${styles.panel}`}>
      <summary>
        {language === 'bn' ? 'প্রকাশের আগে যাচাই' : 'Publication checks'} ·{' '}
        {errors
          ? language === 'bn'
            ? `${errors}টি সংশোধন বাকি`
            : `${errors} to resolve`
          : language === 'bn'
            ? 'স্বয়ংক্রিয় যাচাই সম্পূর্ণ'
            : 'Automated checks complete'}
      </summary>
      <p>
        {language === 'bn'
          ? 'সংরক্ষণের সময় সার্ভার মডেলের প্যারামিটার ও নমুনা সমাধান যাচাই করে। অনুমোদনের আগে বৈজ্ঞানিক ব্যাখ্যা, উদাহরণ, একক, অনুবাদ ও সঠিক উত্তর নিজে মিলিয়ে দেখুন। এই যাচাই বৈজ্ঞানিক নির্ভুলতার সনদ নয়।'
          : 'Saving checks model parameters and example solutions on the server. Before approving, review the science, worked examples, units, translation and answer keys. These automated checks do not certify scientific accuracy.'}
      </p>
      {!!report.issues.length && (
        <ul>
          {report.issues.map((issue, index) => (
            <li key={index}>
              <strong>
                {issue.severity === 'error'
                  ? language === 'bn'
                    ? 'সংশোধন করুন'
                    : 'Resolve'
                  : language === 'bn'
                    ? 'বিবেচনা করুন'
                    : 'Consider'}
              </strong>
              {issue.step && (
                <>
                  {' '}
                  · {language === 'bn' ? 'ধাপ' : 'Step'} {issue.step}
                </>
              )}
              {issue.item && (
                <>
                  {' '}
                  · {language === 'bn' ? 'প্রশ্ন' : 'Question'} {issue.item}
                </>
              )}
              {issue.language && <> · {issue.language === 'bn' ? 'বাংলা' : 'English'}</>}
              {': '}
              {MESSAGES[issue.code][language]}
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}
