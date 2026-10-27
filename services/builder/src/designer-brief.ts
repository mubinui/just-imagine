import { SCRIPTED_INPUTS } from '@just-imagine/game-runtime';
import { GAME_EXAMPLES, type GameExample } from './game-examples';

/** The eight rules every game prompt shares (spec 6.2). */
export const DESIGNER_BRIEF = [
  "Children's game designer brief:",
  '1. Toy first, game second: the first ten seconds are fun with no instructions.',
  '2. One verb; two at most.',
  '3. Every input gets a visible and audible answer within a second.',
  '4. First success within fifteen seconds for a clumsy finger; the first goal is nearly impossible to miss; difficulty grows slowly.',
  '5. Gentle losing: no game over; a miss is a friendly nudge and an instant retry; a win celebrates and keeps the world alive unless a finite challenge was requested.',
  "6. The goal in child words on the HUD with a small count (3, 5, 10), mirroring the child's own nouns.",
  '7. Big targets: interactive bodies at least 0.6 m on their smaller side, the hero at least 0.9 m.',
  "8. The child's idea stays theirs: their cast, their words.",
].join('\n');

const { tapStart, tapInterval, dialAt, flickAt, flickVelocity } = SCRIPTED_INPUTS;

/** The pre-publication tests, stated to the script model. Built from the runtime's own constants. */
export const SMOKE_EXAM = `Before publication a test child plays your programme for 10 seconds: from second ${tapStart} it taps every tappable body in turn, one every ${tapInterval} s, at its centre; at second ${dialAt} it changes the first dial; at second ${flickAt} it flicks the hero with velocity {x:${flickVelocity.x}, y:${flickVelocity.y}}; it answers every question with the first option. A goal game must have called game.score or game.win by the end. Then your programme replays the acceptance plan's exact inputs, and replays each journey again with the inputs before each trigger removed; every triggered effect must NOT happen in that replay.`;

export const TARGET_SIZE_RULE =
  'Big targets: interactive bodies at least 0.6 m on their smaller side; the hero at least 0.9 m.';

export const HERO_RULE =
  'The hero (learning.heroEntityId) is the character the child named as doing the action. It is never a static body, the ground or an extra the child did not name, and it is at least 0.9 m on its smaller side. When the child names no character, the friend holding the mic is the hero.';

const STOP_WORDS = new Set([
  'with',
  'that',
  'before',
  'after',
  'from',
  'this',
  'there',
  'their',
  'when',
  'where',
  'game',
  'make',
  'want',
]);

const words = (text: string) =>
  new Set(
    text
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter((w) => w.length >= 4 && !STOP_WORDS.has(w)),
  );

/** The finished example games whose wishes share the most words with the child's wish. */
export function closestExamples(wish: string, count = 2): GameExample[] {
  const wanted = words(wish);
  return GAME_EXAMPLES.map((example, index) => {
    let score = 0;
    for (const w of words(`${example.wish} ${example.name}`)) if (wanted.has(w)) score++;
    return { example, score, index };
  })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, count)
    .map((entry) => entry.example);
}

const FEEDBACK_CALL = /\bgame\s*\.\s*(sound|say|celebrate|impulse|move|spawn|remove|score)\s*\(/;
const NOT_A_USER_CALL = new Set([
  'if',
  'for',
  'while',
  'switch',
  'catch',
  'function',
  'return',
  'typeof',
]);

/** Blanks string contents and comments, keeping offsets and newlines, so scans never see them. */
function mask(source: string): string {
  let out = '';
  let i = 0;
  while (i < source.length) {
    const c = source[i]!;
    const next = source[i + 1];
    if (c === '/' && next === '/') {
      while (i < source.length && source[i] !== '\n') {
        out += ' ';
        i++;
      }
    } else if (c === '/' && next === '*') {
      const end = source.indexOf('*/', i + 2);
      const stop = end === -1 ? source.length : end + 2;
      for (; i < stop; i++) out += source[i] === '\n' ? '\n' : ' ';
    } else if (c === '"' || c === "'" || c === '`') {
      out += c;
      i++;
      while (i < source.length && source[i] !== c) {
        if (source[i] === '\\') {
          out += ' ';
          i++;
        }
        out += source[i] === '\n' ? '\n' : ' ';
        i++;
      }
      out += c;
      i++;
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

/** One line per tap/drag/flick handler that calls no feedback method and no function of the script. */
export function feedbackLint(source: string): string[] {
  const masked = mask(source);
  const lines: string[] = [];
  const start = /\bgame\s*\.\s*on\s*\(\s*(['"`])(tap|drag|flick)\1/g;
  for (let m = start.exec(source); m; m = start.exec(source)) {
    if (masked[m.index] !== 'g') continue; // inside a string or comment
    const open = masked.indexOf('(', m.index);
    let depth = 0;
    let end = masked.length;
    for (let i = open; i < masked.length; i++) {
      if (masked[i] === '(') depth++;
      else if (masked[i] === ')' && --depth === 0) {
        end = i;
        break;
      }
    }
    const call = masked.slice(open, end);
    const handlerStart = masked.slice(open, end).search(/=>|function\b/);
    if (handlerStart === -1) continue; // a named handler: its body is checked where it is defined
    const handler = call.slice(handlerStart);
    const callsFeedback = FEEDBACK_CALL.test(handler);
    const callsUser = [...handler.matchAll(/(?<![.\w$])([A-Za-z_$][\w$]*)\s*\(/g)].some(
      (c) => !NOT_A_USER_CALL.has(c[1]!) && c[1] !== 'game',
    );
    if (callsFeedback || callsUser) continue;
    const line = source.slice(0, m.index).split('\n').length;
    lines.push(
      `line ${line}: the ${m[2]} handler never calls game.sound, say, celebrate, impulse, move, spawn, remove or score, so the child sees and hears nothing.`,
    );
  }
  return lines;
}
