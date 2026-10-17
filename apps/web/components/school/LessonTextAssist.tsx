'use client';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { LessonTextAssistResponseSchema } from '@just-imagine/protocol';
import {
  applyTextAssist,
  canApplyTextAssist,
  captureTextAssist,
  textAssistRequest,
  type LessonTextBase,
  type LessonTextField,
  type TextAssistCapture,
  type TEXT_STYLES,
} from '../../lib/school/text-assist';
import { schoolRequest } from '../../lib/school/api';
import { useSchoolLanguage } from '../../lib/i18n/study';
import { ErrorNotice } from './shared';
import styles from './LessonTextAssist.module.css';

type AssistEditor = {
  base: LessonTextBase;
  admin: boolean;
  reason: string;
  onApplied: () => void;
};
const Editor = createContext<AssistEditor | null>(null);
export function LessonTextAssistProvider({
  value,
  children,
}: {
  value: AssistEditor;
  children: ReactNode;
}) {
  return <Editor.Provider value={value}>{children}</Editor.Provider>;
}
const COPY = {
  en: {
    help: 'AI writing help',
    detail: 'Generate a draft or refine this text. Review the proposal before applying it.',
    style: 'Writing style',
    clear: 'Clear and age appropriate',
    short: 'Shorter',
    steps: 'Step by step',
    instruction: 'What should change? (optional)',
    generate: 'Generate text',
    refine: 'Refine text',
    busy: 'Preparing a proposal…',
    proposal: 'Proposed text',
    apply: 'Apply text',
    discard: 'Discard',
    stale: 'This field or its lesson context changed. Discard this proposal and request a new one.',
    review:
      'Check scientific facts, quantities and units. Applying changes the draft only; save when ready.',
    keyReview:
      'AI text does not change the answer key. Review the question, choices and key together before saving.',
    reason: 'Enter an audit reason at the top before requesting AI help.',
    applied: 'Text applied to the draft. Review both languages and save when ready.',
    discarded: 'Proposal discarded. Your text is unchanged.',
    wholeTitle: 'AI lesson tools',
    wholeHelp:
      'Use AI writing help below any text field, even before the first save. Whole-lesson drafting also prepares questions and answer keys for your review.',
    wholeSave: 'Save your current lesson first to draft or translate the whole lesson.',
  },
  bn: {
    help: 'AI দিয়ে লিখতে সাহায্য',
    detail: 'নতুন খসড়া লিখুন বা এই লেখা পরিমার্জন করুন। প্রস্তাবিত লেখা দেখে তারপর প্রয়োগ করুন।',
    style: 'লেখার ধরন',
    clear: 'সহজ ও বয়স উপযোগী',
    short: 'আরও সংক্ষেপে',
    steps: 'ধাপে ধাপে',
    instruction: 'কী বদলাতে চান? (ঐচ্ছিক)',
    generate: 'লেখার খসড়া তৈরি',
    refine: 'লেখা পরিমার্জন',
    busy: 'প্রস্তাবিত লেখা তৈরি হচ্ছে…',
    proposal: 'প্রস্তাবিত লেখা',
    apply: 'লেখা প্রয়োগ করুন',
    discard: 'বাদ দিন',
    stale:
      'এই ঘরের লেখা বা পাঠের প্রাসঙ্গিক তথ্য বদলেছে। প্রস্তাবটি বাদ দিয়ে নতুন করে অনুরোধ করুন।',
    review:
      'বৈজ্ঞানিক তথ্য, পরিমাণ ও একক মিলিয়ে নিন। প্রয়োগ করলে শুধু খসড়া বদলাবে; প্রস্তুত হলে সংরক্ষণ করুন।',
    keyReview:
      'AI-এর লেখা উত্তরসূচি বদলায় না। সংরক্ষণের আগে প্রশ্ন, বিকল্প ও সঠিক উত্তর একসঙ্গে মিলিয়ে নিন।',
    reason: 'AI সাহায্য চাওয়ার আগে উপরে পরিবর্তনের কারণ লিখুন।',
    applied: 'খসড়ায় লেখা প্রয়োগ হয়েছে। দুই ভাষা দেখে প্রস্তুত হলে সংরক্ষণ করুন।',
    discarded: 'প্রস্তাবটি বাদ দেওয়া হয়েছে। আপনার লেখা বদলায়নি।',
    wholeTitle: 'AI দিয়ে পাঠ তৈরি',
    wholeHelp:
      'প্রথমবার সংরক্ষণের আগেও যেকোনো লেখার ঘরের নিচে AI-এর সাহায্য নিতে পারেন। পুরো পাঠের খসড়া তৈরি করলে প্রশ্ন ও উত্তরসূচিও পর্যালোচনার জন্য তৈরি হবে।',
    wholeSave: 'পুরো পাঠের খসড়া বা অনুবাদ তৈরির আগে বর্তমান পাঠটি সংরক্ষণ করুন।',
  },
} as const;
export function lessonTextAssistCopy(language: 'en' | 'bn') {
  return COPY[language];
}
export function LessonTextAssist({
  field,
  value,
  language,
  context = '',
  onChange,
}: {
  field: LessonTextField;
  value: { en: string; bn: string };
  language: 'en' | 'bn';
  context?: string;
  onChange: (value: { en: string; bn: string }) => void;
}) {
  const editor = useContext(Editor);
  const { language: interfaceLanguage } = useSchoolLanguage();
  const copy = COPY[interfaceLanguage];
  const [style, setStyle] = useState<keyof typeof TEXT_STYLES>('clear');
  const [instruction, setInstruction] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [notice, setNotice] = useState('');
  const [proposal, setProposal] = useState<{ capture: TextAssistCapture; text: string }>();
  const generation = useRef(0);
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );
  if (!editor) return null;
  const current = { base: editor.base, field, language, text: value[language], context };
  const stale = proposal && !canApplyTextAssist(proposal.capture, current);
  const missingReason = editor.admin && editor.reason.trim().length < 3;
  async function request() {
    if (!editor || busy || missingReason) return;
    const task = ++generation.current;
    const capture = captureTextAssist(current);
    setBusy(true);
    setError(undefined);
    setNotice('');
    setProposal(undefined);
    try {
      const response = await schoolRequest(
        `${editor.admin ? 'admin' : 'school'}/lesson-text/assist`,
        {
          ...textAssistRequest(capture, style, instruction),
          ...(editor.admin ? { reason: editor.reason } : {}),
        },
      );
      const result = LessonTextAssistResponseSchema.parse(response);
      if (task === generation.current) setProposal({ capture, text: result.text });
    } catch (err) {
      if (task === generation.current) setError(err);
    } finally {
      if (task === generation.current) setBusy(false);
    }
  }
  return (
    <details className={styles.assist}>
      <summary>{copy.help}</summary>
      <div className={styles.body}>
        <p>{copy.detail}</p>
        <label>
          <span>{copy.style}</span>
          <select value={style} onChange={(event) => setStyle(event.target.value as typeof style)}>
            <option value="clear">{copy.clear}</option>
            <option value="short">{copy.short}</option>
            <option value="steps">{copy.steps}</option>
          </select>
        </label>
        <label>
          <span>{copy.instruction}</span>
          <textarea
            value={instruction}
            maxLength={600}
            onChange={(event) => setInstruction(event.target.value)}
          />
        </label>
        {missingReason && <p>{copy.reason}</p>}
        <div className={styles.actions}>
          <button type="button" disabled={busy || missingReason} onClick={() => void request()}>
            {busy ? copy.busy : value[language].trim() ? copy.refine : copy.generate}
          </button>
        </div>
        <ErrorNotice error={error} />
        {proposal && (
          <section className={styles.proposal} aria-label={copy.proposal}>
            <h3>
              {copy.proposal} · {proposal.capture.source.language === 'bn' ? 'বাংলা' : 'English'}
            </h3>
            <p className={styles.proposedText} lang={proposal.capture.source.language}>
              {proposal.text}
            </p>
            <p>{copy.review}</p>
            {(['question', 'option', 'hint'] as LessonTextField[]).includes(field) && (
              <p>{copy.keyReview}</p>
            )}
            {stale && <p role="status">{copy.stale}</p>}
            <div className={styles.actions}>
              <button
                type="button"
                disabled={Boolean(stale)}
                onClick={() => {
                  const next = applyTextAssist(value, proposal.capture, current, proposal.text);
                  if (!next) return;
                  onChange(next);
                  editor.onApplied();
                  setProposal(undefined);
                  setNotice(copy.applied);
                }}
              >
                {copy.apply}
              </button>
              <button
                type="button"
                onClick={() => {
                  setProposal(undefined);
                  setNotice(copy.discarded);
                }}
              >
                {copy.discard}
              </button>
            </div>
          </section>
        )}
        <p role="status">{busy ? copy.busy : notice}</p>
      </div>
    </details>
  );
}
