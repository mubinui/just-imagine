import { describe, it, expect } from 'vitest';
import { CONCEPTS } from '@just-imagine/scene-schema';
import { ChildDocSchema, LanguageSchema, languageOf } from '../src/firestore';
import { CreateChildBodySchema, UpdateChildBodySchema } from '../src/rest';
import { BuildWorldJobSchema } from '../src/jobs';
import { CONCEPT_BANK, conceptCard } from '../src/concept-bank';

const BENGALI = /[ঀ-৿]/;

const child = {
  firstName: 'Ayaan',
  avatar: 'fox',
  ageBand: '6-7',
  tier: 'playground',
  labsUnlocked: false,
  captions: false,
  sessionTargetMinutes: 8,
  loopsCompleted: 0,
  createdAt: 1,
};

const job = {
  jobId: 'j_1',
  worldId: 'w_1',
  uid: 'u_1',
  childId: 'c_1',
  sessionId: 's_1',
  plan: 'free',
  kind: 'build',
  description: 'a jelly dragon on a cloud',
  concepts: ['bounce'],
  ageBand: '6-7',
  tier: 'playground',
  styleVersion: 'v1',
  promptVersion: 'v1',
  conversationSummary: '',
};

describe('LanguageSchema', () => {
  it('accepts exactly en and bn', () => {
    expect(LanguageSchema.options).toEqual(['en', 'bn']);
    expect(LanguageSchema.safeParse('fr').success).toBe(false);
  });
});

describe('ChildDocSchema.language', () => {
  it('keeps accepting profiles written before the field existed and reads them as English', () => {
    expect(ChildDocSchema.safeParse(child).success).toBe(true);
    expect(languageOf(ChildDocSchema.parse(child))).toBe('en');
  });
  it('stores bn and rejects any other language', () => {
    expect(ChildDocSchema.parse({ ...child, language: 'bn' }).language).toBe('bn');
    expect(languageOf(ChildDocSchema.parse({ ...child, language: 'bn' }))).toBe('bn');
    expect(ChildDocSchema.safeParse({ ...child, language: 'fr' }).success).toBe(false);
  });
});

describe('child request bodies', () => {
  const body = { firstName: 'Mira', avatar: 'owl', ageBand: '8-10' };
  it('lets a parent choose the language when creating a child', () => {
    expect(CreateChildBodySchema.safeParse(body).success).toBe(true);
    expect(CreateChildBodySchema.safeParse({ ...body, language: 'bn' }).success).toBe(true);
    expect(CreateChildBodySchema.safeParse({ ...body, language: 'fr' }).success).toBe(false);
  });
  it('lets a parent switch the language on its own', () => {
    expect(UpdateChildBodySchema.parse({ language: 'bn' })).toEqual({ language: 'bn' });
    expect(UpdateChildBodySchema.safeParse({ language: 'fr' }).success).toBe(false);
  });
});

describe('BuildWorldJobSchema.language', () => {
  it('reads jobs queued without a language as English', () => {
    expect(BuildWorldJobSchema.safeParse(job).success).toBe(true);
    expect(languageOf(BuildWorldJobSchema.parse(job))).toBe('en');
  });
  it('carries the child language to the builder', () => {
    expect(BuildWorldJobSchema.parse({ ...job, language: 'bn' }).language).toBe('bn');
    expect(BuildWorldJobSchema.safeParse({ ...job, language: 'fr' }).success).toBe(false);
  });
});

describe('bilingual concept bank', () => {
  it('has short Bangla copy for every concept', () => {
    for (const c of CONCEPTS) {
      const card = CONCEPT_BANK[c];
      expect(card.titleBn, `${c}.titleBn`).toMatch(BENGALI);
      expect(card.realLifeNoteBn, `${c}.realLifeNoteBn`).toMatch(BENGALI);
      expect(card.kidHintBn, `${c}.kidHintBn`).toMatch(BENGALI);
      expect(card.titleBn.length, `${c}.titleBn`).toBeLessThanOrEqual(45);
      expect(card.realLifeNoteBn.length, `${c}.realLifeNoteBn`).toBeLessThanOrEqual(240);
      expect(card.kidHintBn.length, `${c}.kidHintBn`).toBeLessThanOrEqual(180);
    }
  });
  it('returns the card in the requested language', () => {
    expect(conceptCard('bounce', 'bn')).toEqual({
      title: CONCEPT_BANK.bounce.titleBn,
      realLifeNote: CONCEPT_BANK.bounce.realLifeNoteBn,
    });
    expect(conceptCard('bounce', 'en')).toEqual(conceptCard('bounce'));
    expect(conceptCard('bounce', 'en')).toEqual({
      title: CONCEPT_BANK.bounce.title,
      realLifeNote: CONCEPT_BANK.bounce.realLifeNote,
    });
  });
});
