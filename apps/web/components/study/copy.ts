'use client';
import { useCallback } from 'react';
import { useSchoolLanguage } from '../../lib/i18n/study';
import { formatNumber } from '../stem/sim-format';

/** Copy owned by the student study and lab screens; both languages always ship together. */
export const STUDY_COPY = {
  welcome: ['Welcome back, {name}', 'আবার স্বাগতম, {name}'],
  welcomeAnon: ['Your lessons', 'তোমার পাঠ'],
  weekPoints: ['This week', 'এই সপ্তাহে'],
  classRank: ['Class rank', 'শ্রেণিতে অবস্থান'],
  allTimePoints: ['All time', 'সব মিলিয়ে'],
  pointsUnit: ['points', 'পয়েন্ট'],
  notRanked: ['Not ranked yet', 'এখনো র‍্যাঙ্ক হয়নি'],
  notRankedHint: ['Earn a quiz point to join the board', 'বোর্ডে আসতে কুইজে পয়েন্ট পাও'],
  allSubjects: ['All subjects', 'সব বিষয়'],
  lessonCount: ['{n} lessons', '{n}টি পাঠ'],
  start: ['Start lesson', 'পাঠ শুরু করো'],
  continue: ['Continue', 'চালিয়ে যাও'],
  review: ['Review', 'আবার দেখো'],
  upNext: ['Up next', 'এরপর'],
  stateNew: ['{steps} steps · {max} points to earn', '{steps}টি ধাপ · {max} পয়েন্ট পাওয়া যাবে'],
  stateProgress: [
    '{correct} of {total} quiz answers correct · {earned}/{max} points',
    '{total}টির মধ্যে {correct}টি কুইজ-উত্তর সঠিক · {earned}/{max} পয়েন্ট',
  ],
  stateDone: ['Completed · {earned}/{max} points', 'সম্পন্ন · {earned}/{max} পয়েন্ট'],
  openLab: ['Open the chemistry lab', 'রসায়ন ল্যাব খোলো'],
  openLabNote: [
    'Mix any reagent on the bench and observe.',
    'বেঞ্চের যেকোনো বিকারক মিশিয়ে পর্যবেক্ষণ করো।',
  ],
  backToLessons: ['Back to lessons', 'পাঠে ফিরে যাও'],
  lessonsLink: ['Lessons', 'পাঠ'],
  notes: ['Notes & worksheet', 'নোট ও অনুশীলনপত্র'],
  lessonUnavailable: ['This lesson is not available.', 'এই পাঠটি পাওয়া যাচ্ছে না।'],
  stepOf: ['Step {n} of {total}', '{total}টির মধ্যে ধাপ {n}'],
  questionOf: ['Question {n} of {total}', '{total}টির মধ্যে প্রশ্ন {n}'],
  itemPoints: ['{n} points', '{n} পয়েন্ট'],
  itemPoint: ['1 point', '১ পয়েন্ট'],
  quizIntro: [
    'Answer all {n} questions, then submit. {max} points available.',
    '{n}টি প্রশ্নের সবগুলোর উত্তর দিয়ে জমা দাও। মোট {max} পয়েন্ট।',
  ],
  practiceIntro: [
    'Practice · no points. Check your idea as often as you like.',
    'অনুশীলন · পয়েন্ট নেই। যতবার খুশি যাচাই করো।',
  ],
  answerThis: ['Answer this question', 'এই প্রশ্নের উত্তর দাও'],
  answerAll: [
    'Answer {n} more questions before submitting. They are marked.',
    'জমা দেওয়ার আগে আরও {n}টি প্রশ্নের উত্তর দাও। সেগুলো চিহ্নিত করা আছে।',
  ],
  answerOne: [
    'Answer the marked question before submitting.',
    'জমা দেওয়ার আগে চিহ্নিত প্রশ্নের উত্তর দাও।',
  ],
  checking: ['Checking…', 'যাচাই হচ্ছে…'],
  correct: ['Correct', 'সঠিক'],
  notYet: ['Not quite yet', 'এখনো ঠিক হয়নি'],
  savedCorrect: ['Your saved answer is correct', 'তোমার সংরক্ষিত উত্তর সঠিক'],
  savedWrong: ['Your saved answer is not correct yet', 'তোমার সংরক্ষিত উত্তর এখনো সঠিক নয়'],
  /** The lesson's first hint, shown after a correct answer as the reasoning to remember. */
  keyIdea: ['Key idea', 'মূল ভাবনা'],
  wrongNext: [
    'Change your answer, open a hint or revisit the simulation, then submit again.',
    'উত্তর বদলাও, সংকেত দেখো বা সিমুলেশনে ফিরে যাও, তারপর আবার জমা দাও।',
  ],
  hintLabel: ['Hint {n}', 'সংকেত {n}'],
  showHint: ['Show hint {n} of 2', '২টির মধ্যে সংকেত {n} দেখাও'],
  totalPoints: ['Total {earned}/{max} points', 'মোট {earned}/{max} পয়েন্ট'],
  pointsNow: ['+{n} now', 'এখন +{n}'],
  quizComplete: ['Quiz complete', 'কুইজ সম্পন্ন'],
  allCorrect: ['Every answer is correct.', 'সব উত্তর সঠিক।'],
  someWrong: ['{n} answers need another look.', '{n}টি উত্তর আবার দেখো।'],
  oneWrong: ['1 answer needs another look.', '১টি উত্তর আবার দেখো।'],
  resubmit: ['Submit again', 'আবার জমা দাও'],
  tutorTitle: ['Your tutor', 'তোমার শিক্ষক-সহায়ক'],
  askName: ['Ask {name}', '{name}-কে জিজ্ঞেস করো'],
  minimise: ['Minimise tutor', 'সহায়ক ছোট করো'],
  stopVoice: ['Stop voice', 'ভয়েস বন্ধ করো'],
  statusOff: ['Type a question or start voice', 'প্রশ্ন লেখো বা ভয়েস চালু করো'],
  statusReady: ['Connected · microphone off', 'সংযুক্ত · মাইক্রোফোন বন্ধ'],
  statusListening: ['Listening…', 'শুনছে…'],
  statusSpeaking: ['Speaking…', 'বলছে…'],
  statusThinking: ['Thinking…', 'ভাবছে…'],
  you: ['You', 'তুমি'],
  tryValue: ['Try {label} = {value}', '{label} = {value} করে দেখো'],
  mixing: ['Mixing…', 'মেশানো হচ্ছে…'],
  idealModel: [
    'Ideal virtual model. pH is calculated only for HCl, NaOH and KOH at 25°C between 0.001 and {max} M. Other mixtures have unknown pH; observations are qualitative.',
    'আদর্শ ভার্চুয়াল মডেল। ২৫°C তাপমাত্রায় শুধু HCl, NaOH ও KOH-এর ০.০০১ থেকে {max} M দ্রবণের pH গণনা করা হয়। অন্য মিশ্রণের pH অজানা; পর্যবেক্ষণ গুণগত।',
  ],
  shelf: ['Reagent shelf', 'বিকারকের তাক'],
  shelfNote: [
    'Tap or drag reagents into the beaker. One indicator at a time.',
    'বিকারক ট্যাপ করো বা টেনে বিকারে আনো। একবারে একটি নির্দেশক।',
  ],
  inBeaker: ['In the beaker', 'বিকারে আছে'],
  beakerEmpty: [
    'The beaker is empty. Choose reagents from the shelf.',
    'বিকার খালি। তাক থেকে বিকারক বেছে নাও।',
  ],
  add: ['Add', 'যোগ করো'],
  added: ['Added', 'যোগ হয়েছে'],
  remove: ['Remove {name}', '{name} সরাও'],
  volume: ['Volume', 'আয়তন'],
  concentration: ['Concentration', 'ঘনমাত্রা'],
  totalVolume: ['Total volume', 'মোট আয়তন'],
  limiting: ['Limiting reagent', 'সীমিত বিকারক'],
  exactAmounts: ['None — the amounts react exactly', 'নেই — পরিমাণগুলো পুরোপুরি বিক্রিয়া করে'],
  leftOver: ['Left over', 'অবশিষ্ট'],
  phResult: ['pH after mixing', 'মেশানোর পর pH'],
  phUnknown: ['pH is not calculated for this mixture.', 'এই মিশ্রণের pH গণনা করা হয়নি।'],
  phOutOfRange: [
    'pH is not calculated: {formula} at {c} M is outside the model’s 0.001–{max} M range.',
    'pH গণনা করা হয়নি: {c} M {formula} মডেলের ০.০০১–{max} M সীমার বাইরে।',
  ],
  indicatorUnknown: [' Indicator colour is not predicted.', ' নির্দেশকের রংও অনুমান করা হয়নি।'],
  temperature: ['Temperature', 'তাপমাত্রা'],
  warmer: ['gets warmer', 'গরম হয়'],
  cooler: ['gets cooler', 'ঠান্ডা হয়'],
  noChange: ['no change', 'পরিবর্তন নেই'],
  gas: ['Gas', 'গ্যাস'],
  precipitate: ['Precipitate', 'অধঃক্ষেপ'],
  model: ['Calculated model', 'গণনাভিত্তিক মডেল'],
  colourless: ['The indicator is colourless.', 'নির্দেশকটি বর্ণহীন।'],
  colourShown: ['The indicator colour is shown in the beaker.', 'নির্দেশকের রং বিকারে দেখানো আছে।'],
  simPaused: [
    'The diagram and readings are paused until the values are valid.',
    'মানগুলো ঠিক না হওয়া পর্যন্ত চিত্র ও ফল দেখানো বন্ধ আছে।',
  ],
} as const satisfies Record<string, readonly [string, string]>;
export type StudyCopyKey = keyof typeof STUDY_COPY;

export function studyCopy(
  key: StudyCopyKey,
  language: 'en' | 'bn',
  values: Record<string, string | number> = {},
): string {
  return STUDY_COPY[key][language === 'bn' ? 1 : 0].replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = values[name];
    return typeof value === 'number' ? formatNumber(value, language) : (value ?? '');
  });
}
export function useStudyCopy() {
  const { language } = useSchoolLanguage();
  const t = useCallback(
    (key: StudyCopyKey, values?: Record<string, string | number>) =>
      studyCopy(key, language, values),
    [language],
  );
  const n = useCallback(
    (value: unknown, digits?: number) => formatNumber(value, language, digits),
    [language],
  );
  return { t, n, language };
}
