'use client';
import { useEffect, useRef, useState } from 'react';
import { LabProposalSchema, type LabProposal } from '@just-imagine/protocol';
import { schoolRequest } from '../../lib/school/api';
import { argLabel, predicateLabel, paramLabel, simLabel } from '../../lib/school/authoring-labels';
import {
  LAB_DESCRIPTION_MAX,
  labBlocker,
  labProposalFits,
  labRequest,
  labStartValues,
  labTaskValues,
} from '../../lib/school/lab-generation';
import type { Lesson } from '../../lib/school/types';
import { useSchoolLanguage } from '../../lib/i18n/study';
import { UiIcon } from '../UiIcon';
import { ErrorNotice } from './shared';
import styles from './LabGenerator.module.css';

type Lang = 'en' | 'bn';
const COPY = {
  en: {
    open: 'Lab from a description',
    title: 'Describe a lab',
    help: 'Say what students should explore or find. AI picks one of this chapter’s tested simulations, sets its starting values and writes a graded task with hints. Nothing is added until you choose Add to lesson.',
    label: 'What should students do?',
    placeholder:
      'A ball is launched from a cliff; students find the angle that lands it on a target.',
    generate: 'Generate lab',
    again: 'Generate again',
    working: 'Choosing and checking a simulation…',
    seconds: (n: number) => `${n} s`,
    close: 'Close',
    noSims: 'This chapter has no simulations yet. Choose another chapter to generate a lab.',
    full: 'A lesson holds up to 20 steps. Remove a step to add a lab.',
    reason: 'Enter an audit reason at the top before requesting AI help.',
    short: 'Describe the lab in at least 8 characters.',
    proposal: 'Proposed lab',
    values: 'Starting values',
    locked: 'Locked',
    open_: 'Students change',
    fixed: 'Fixed',
    taskStart: 'Task starts at',
    changed:
      'The chapter or subject changed after this lab was generated. Generate again for the current chapter.',
    prompts: 'Guiding prompts',
    graded: 'Graded task',
    noTask: 'No graded task — students explore freely.',
    goal: 'Goal',
    example: 'Example solution',
    hints: 'Hints',
    review:
      'Check the science, values and wording before approving. Adding the lab clears both language approvals.',
    add: 'Add to lesson',
    discard: 'Discard',
    added: 'Lab added at the end of the lesson. Review it, then save.',
    discarded: 'Proposal discarded. Your lesson is unchanged.',
  },
  bn: {
    open: 'বর্ণনা থেকে ল্যাব',
    title: 'একটি ল্যাবের বর্ণনা দিন',
    help: 'শিক্ষার্থীরা কী অনুসন্ধান করবে বা খুঁজে বের করবে লিখুন। AI এই অধ্যায়ের পরীক্ষিত সিমুলেশনগুলোর একটি বেছে নিয়ে শুরুর মান ঠিক করবে এবং ইঙ্গিতসহ একটি মূল্যায়িত কাজ লিখবে। “পাঠে যোগ করুন” না চাপা পর্যন্ত কিছুই যোগ হবে না।',
    label: 'শিক্ষার্থীরা কী করবে?',
    placeholder:
      'পাহাড়ের কিনারা থেকে একটি বল ছোড়া হবে; শিক্ষার্থীরা লক্ষ্যে ফেলার কোণ খুঁজে বের করবে।',
    generate: 'ল্যাব তৈরি করুন',
    again: 'আবার তৈরি করুন',
    working: 'সিমুলেশন বেছে নিয়ে যাচাই করা হচ্ছে…',
    seconds: (n: number) => `${new Intl.NumberFormat('bn-BD').format(n)} সেকেন্ড`,
    close: 'বন্ধ করুন',
    noSims: 'এই অধ্যায়ে এখনো কোনো সিমুলেশন নেই। ল্যাব তৈরি করতে অন্য অধ্যায় বেছে নিন।',
    full: 'একটি পাঠে সর্বোচ্চ ২০টি ধাপ থাকে। ল্যাব যোগ করতে একটি ধাপ সরান।',
    reason: 'AI সহায়তা চাওয়ার আগে ওপরে নিরীক্ষার কারণ লিখুন।',
    short: 'ল্যাবের বর্ণনা অন্তত ৮টি অক্ষরে লিখুন।',
    proposal: 'প্রস্তাবিত ল্যাব',
    values: 'শুরুর মান',
    locked: 'স্থির',
    open_: 'শিক্ষার্থী বদলাতে পারবে',
    fixed: 'নির্দিষ্ট',
    taskStart: 'কাজের শুরুর মান',
    changed:
      'এই ল্যাব তৈরির পর অধ্যায় বা বিষয় বদলানো হয়েছে। বর্তমান অধ্যায়ের জন্য আবার তৈরি করুন।',
    prompts: 'নির্দেশনা',
    graded: 'মূল্যায়িত কাজ',
    noTask: 'মূল্যায়িত কাজ নেই — শিক্ষার্থীরা মুক্তভাবে অনুসন্ধান করবে।',
    goal: 'লক্ষ্য',
    example: 'নমুনা সমাধান',
    hints: 'ইঙ্গিত',
    review:
      'অনুমোদনের আগে বিজ্ঞান, মান ও ভাষা মিলিয়ে দেখুন। ল্যাব যোগ করলে দুই ভাষার অনুমোদনই মুছে যাবে।',
    add: 'পাঠে যোগ করুন',
    discard: 'বাদ দিন',
    added: 'পাঠের শেষে ল্যাব যোগ হয়েছে। দেখে নিয়ে সংরক্ষণ করুন।',
    discarded: 'প্রস্তাব বাদ দেওয়া হয়েছে। আপনার পাঠ অপরিবর্তিত।',
  },
} as const;

const formatValue = (value: unknown, language: Lang) =>
  typeof value === 'number'
    ? new Intl.NumberFormat(language === 'bn' ? 'bn-BD' : 'en', { maximumFractionDigits: 3 })
        .format(value)
        .replace(/,/g, '')
    : String(value);

/** A generated lab laid out for review: simulation, starting values, prompts and the graded task. */
export function LabProposalView({
  proposal,
  language,
  onAccept,
  onDiscard,
  blocked = '',
}: {
  proposal: LabProposal;
  language: Lang;
  onAccept: () => void;
  onDiscard: () => void;
  /** Why Add to lesson is unavailable; the proposal stays readable. */
  blocked?: string;
}) {
  const copy = COPY[language];
  const { step, task, summary } = proposal;
  const roles = { locked: copy.locked, open: copy.open_, task: copy.open_, fixed: copy.fixed };
  const args =
    task && typeof task.key.args === 'object' && task.key.args !== null
      ? Object.entries(task.key.args as Record<string, unknown>)
      : [];
  return (
    <section className={styles.proposal} aria-labelledby="lab-proposal-title">
      <header className={styles.proposalHead}>
        <h3 id="lab-proposal-title" lang={language}>
          {summary[language]}
        </h3>
        <p>
          {copy.proposal} · {simLabel(step.simId, language)}
        </p>
      </header>
      <div className={styles.columns}>
        <section aria-label={copy.values}>
          <h4>{copy.values}</h4>
          <dl className={styles.values}>
            {labStartValues(step, language).map((row) => (
              <div key={row.label} data-role={row.role}>
                <dt>{row.label}</dt>
                <dd>
                  <span className={styles.value}>{row.value}</span>
                  <span className={styles.role}>{roles[row.role]}</span>
                </dd>
              </div>
            ))}
          </dl>
        </section>
        <section aria-label={copy.prompts}>
          <h4>{copy.prompts}</h4>
          <ol className={styles.prompts}>
            {step.prompts.map((prompt, index) => (
              <li key={index} lang={language}>
                {prompt[language]}
              </li>
            ))}
          </ol>
        </section>
      </div>
      <section className={styles.task} aria-label={copy.graded}>
        <h4>{copy.graded}</h4>
        {task ? (
          <>
            <p className={styles.taskPrompt} lang={language}>
              {task.item.prompt[language]}
            </p>
            <h5 className={styles.subhead}>{copy.taskStart}</h5>
            <dl className={styles.values}>
              {labTaskValues(task, language).map((row) => (
                <div key={row.label} data-role={row.role}>
                  <dt>{row.label}</dt>
                  <dd>
                    <span className={styles.value}>{row.value}</span>
                    <span className={styles.role}>{roles[row.role]}</span>
                  </dd>
                </div>
              ))}
            </dl>
            <dl className={styles.facts}>
              <div>
                <dt>{copy.goal}</dt>
                <dd>
                  {predicateLabel(task.key.predicate, language)}
                  {args.length > 0 && (
                    <ul>
                      {args.map(([name, value]) => (
                        <li key={name}>
                          {argLabel(task.key.predicate, name, language)}:{' '}
                          {formatValue(value, language)}
                        </li>
                      ))}
                    </ul>
                  )}
                </dd>
              </div>
              {task.key.exampleAnswer && (
                <div>
                  <dt>{copy.example}</dt>
                  <dd>
                    {Object.entries(task.key.exampleAnswer)
                      .map(
                        ([name, value]) =>
                          `${paramLabel(step.simId, name, language)} = ${formatValue(value, language)}`,
                      )
                      .join(' · ')}
                  </dd>
                </div>
              )}
              <div>
                <dt>{copy.hints}</dt>
                <dd>
                  <ol>
                    {task.hints.map((hint, index) => (
                      <li key={index} lang={language}>
                        {hint[language]}
                      </li>
                    ))}
                  </ol>
                </dd>
              </div>
            </dl>
          </>
        ) : (
          <p>{copy.noTask}</p>
        )}
      </section>
      <p className={styles.review}>{copy.review}</p>
      {blocked && <p className={styles.blocker}>{blocked}</p>}
      <div className={styles.actions}>
        <button
          type="button"
          className="sch-primary"
          disabled={Boolean(blocked)}
          onClick={onAccept}
        >
          {copy.add}
        </button>
        <button type="button" onClick={onDiscard}>
          {copy.discard}
        </button>
      </div>
    </section>
  );
}

/** "Describe a lab": an inline panel that asks the API for a proposal and adds it on request. */
export function LabGenerator({
  lesson,
  chapterSims,
  admin,
  reason,
  editLanguage,
  onAccept,
}: {
  lesson: Lesson;
  chapterSims: number;
  admin: boolean;
  reason: string;
  editLanguage: Lang;
  onAccept: (proposal: LabProposal) => void;
}) {
  const { language } = useSchoolLanguage();
  const copy = COPY[language];
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [busySince, setBusySince] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [error, setError] = useState<unknown>();
  const [proposal, setProposal] = useState<LabProposal>();
  const [requested, setRequested] = useState<Pick<Lesson, 'subject' | 'chapterId'>>();
  const [notice, setNotice] = useState('');
  const generation = useRef(0);
  const descriptionField = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (busySince === null) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [busySince]);
  // A response that lands after the panel is closed or unmounted is ignored.
  useEffect(() => () => void generation.current++, []);
  const blocker = labBlocker({
    chapterSims,
    steps: lesson.steps.length,
    admin,
    reason,
    description,
  });
  const busy = busySince !== null;
  async function generate() {
    if (busy || blocker) return;
    const task = ++generation.current;
    setBusySince(Date.now());
    setNow(Date.now());
    setError(undefined);
    setNotice('');
    setProposal(undefined);
    setRequested({ subject: lesson.subject, chapterId: lesson.chapterId });
    try {
      const response = await schoolRequest(`${admin ? 'admin' : 'school'}/lab/generate`, {
        ...labRequest(lesson, description, editLanguage),
        ...(admin ? { reason, lessonId: lesson.id } : {}),
      });
      if (task === generation.current) setProposal(LabProposalSchema.parse(response));
    } catch (err) {
      if (task === generation.current) setError(err);
    } finally {
      if (task === generation.current) setBusySince(null);
    }
  }
  if (!open)
    return (
      <button type="button" className={styles.opener} onClick={() => setOpen(true)}>
        <UiIcon name="flask" />
        {copy.open}
      </button>
    );
  const visibleBlocker = blocker === 'short' && !description ? '' : blocker;
  const fit = proposal && requested ? labProposalFits(lesson, requested, proposal) : '';
  return (
    <section className={styles.panel} aria-labelledby="lab-generator-title">
      <div className={styles.head}>
        <h3 id="lab-generator-title">
          <UiIcon name="flask" />
          {copy.title}
        </h3>
        <button
          type="button"
          onClick={() => {
            generation.current++;
            setBusySince(null);
            setProposal(undefined);
            setError(undefined);
            setNotice('');
            setOpen(false);
          }}
        >
          {copy.close}
        </button>
      </div>
      <p className={styles.help}>{copy.help}</p>
      <label className={styles.field}>
        <span>{copy.label}</span>
        <textarea
          ref={descriptionField}
          value={description}
          maxLength={LAB_DESCRIPTION_MAX}
          placeholder={copy.placeholder}
          aria-describedby="lab-description-count"
          onChange={(event) => setDescription(event.target.value)}
        />
        <small id="lab-description-count" className={styles.count}>
          {description.length}/{LAB_DESCRIPTION_MAX}
        </small>
      </label>
      {visibleBlocker && <p className={styles.blocker}>{copy[visibleBlocker]}</p>}
      <div className={styles.actions}>
        <button
          type="button"
          className="sch-primary"
          disabled={busy || Boolean(blocker)}
          onClick={() => void generate()}
        >
          {proposal ? copy.again : copy.generate}
        </button>
      </div>
      <p role="status" className={styles.status}>
        {busy
          ? `${copy.working} ${copy.seconds(Math.max(0, Math.round((now - busySince) / 1000)))}`
          : notice}
      </p>
      <ErrorNotice error={error} />
      {proposal && (
        <LabProposalView
          proposal={proposal}
          language={language}
          blocked={fit === 'changed' ? copy.changed : fit === 'full' ? copy.full : ''}
          onAccept={() => {
            if (fit) return;
            onAccept(proposal);
            setProposal(undefined);
            setDescription('');
            setNotice(copy.added);
            descriptionField.current?.focus();
          }}
          onDiscard={() => {
            setProposal(undefined);
            setNotice(copy.discarded);
            descriptionField.current?.focus();
          }}
        />
      )}
    </section>
  );
}
