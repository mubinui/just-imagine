import { describe, expect, it } from 'vitest';
import { personaInstruction } from '../src/characters';
import { minimalChallenge, minimalPack } from './helpers';

const packWithQuiz = () =>
  minimalPack({
    challenges: [
      minimalChallenge({
        answerKey: 'Jupiter',
        accepted: [
          'jupiter',
          'the planet jupiter',
          'jupitar',
          'বৃহস্পতি',
          'বৃহস্পতি গ্রহ',
          'brihospoti',
        ],
        question: 'Which planet is the biggest?',
        questionBn: 'কোন গ্রহটি সবচেয়ে বড়?',
      }),
    ],
  });

describe('personaInstruction', () => {
  it('renders every English fact, the name and the catchphrase in English', () => {
    const pack = packWithQuiz();
    const text = personaInstruction(pack, 'rocky', 'en');
    const rocky = pack.characters[0]!;
    expect(text).toContain('Rocky');
    expect(text).toContain(rocky.catchphrase);
    expect(text).toContain(rocky.personality);
    expect(text).toContain(rocky.funnyAngle);
    for (const fact of rocky.facts) expect(text).toContain(fact);
    for (const factBn of rocky.factsBn) expect(text).not.toContain(factBn);
  });

  it('renders every Bangla fact and the Bangla name in Bangla', () => {
    const pack = packWithQuiz();
    const text = personaInstruction(pack, 'rocky', 'bn');
    const rocky = pack.characters[0]!;
    expect(text).toContain(rocky.nameBn);
    expect(text).toContain(rocky.catchphraseBn);
    for (const factBn of rocky.factsBn) expect(text).toContain(factBn);
    for (const fact of rocky.facts) expect(text).not.toContain(fact);
  });

  it('never includes the answer key or accepted variants of any challenge', () => {
    const pack = packWithQuiz();
    for (const language of ['en', 'bn'] as const) {
      const text = personaInstruction(pack, 'rocky', language).toLowerCase();
      for (const challenge of pack.challenges) {
        expect(text).not.toContain(challenge.answerKey.toLowerCase());
        for (const variant of challenge.accepted) expect(text).not.toContain(variant.toLowerCase());
      }
    }
  });

  it('lists the character challenges by id and question in the requested language', () => {
    const pack = packWithQuiz();
    expect(personaInstruction(pack, 'rocky', 'en')).toContain(
      'ch_float: Which planet is the biggest?',
    );
    expect(personaInstruction(pack, 'rocky', 'bn')).toContain('ch_float: কোন গ্রহটি সবচেয়ে বড়?');
  });

  it('carries the in-character, funny-but-accurate, short-answer, ask-back guide', () => {
    const text = personaInstruction(packWithQuiz(), 'rocky', 'en');
    expect(text).toMatch(/stay in character/i);
    expect(text).toMatch(/funny/i);
    expect(text).toMatch(/accurate/i);
    expect(text).toMatch(/under 25 words/i);
    expect(text).toMatch(/ask the child a question/i);
    expect(text).toMatch(/only in English/i);
    const bn = personaInstruction(packWithQuiz(), 'rocky', 'bn');
    expect(bn).toContain('২৫');
    expect(bn).toMatch(/বাংলা/);
  });

  it('is plain text without markdown headers', () => {
    for (const language of ['en', 'bn'] as const) {
      const lines = personaInstruction(packWithQuiz(), 'rocky', language).split('\n');
      expect(lines.some((line) => line.startsWith('#'))).toBe(false);
      expect(lines.some((line) => line.includes('**'))).toBe(false);
    }
  });

  it('throws for a character that is not in the pack', () => {
    expect(() => personaInstruction(packWithQuiz(), 'nobody', 'en')).toThrow(/nobody/);
  });
});
