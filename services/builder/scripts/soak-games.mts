// Live soak of game generation: ten wishes through the real imagineGame with the real models.
// Usage (from services/builder): set -a && . ../../.env.local && set +a && tsx scripts/soak-games.mts
import { VertexModels } from '../src/vertex.ts';
import { GameScriptModel } from '../src/game-model.ts';
import { GameGenerationError, imagineGame } from '../src/imagine-game.ts';
import { SceneValidationError } from '../src/pipeline.ts';
import { createBudget } from '../src/budget.ts';

const WISHES: [string, string][] = [
  [
    'puppy apples',
    'a game where a puppy catches falling apples in a basket before the timer runs out',
  ],
  [
    'kitten ball race',
    'a race where a kitten rolls a ball to the finish line before the other animals',
  ],
  ['cat cannon blocks', 'a cat fires a cannon to knock down a tower of blocks'],
  ['giraffe blocks', 'stack blocks taller than a giraffe'],
  ['moon landing', 'land a rocket softly on the moon'],
  ['snail race', 'a snail race where I tap to make my snail go faster'],
  ['rainbow dragon', 'a dragon that paints rainbows in the sky when I tap it'],
  ['fish and shark', 'a little fish that hides from a hungry shark behind the rocks'],
  ['robot shapes', 'a robot that sorts shapes into the right boxes'],
  ['talking owl', 'I just want to chat with a talking owl in the forest'],
];

const apiKey = process.env['GEMINI_API_KEY'];
if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
const redact = (text: string) => (apiKey ? text.replaceAll(apiKey, '[redacted]') : text);
// Every printed byte goes through these two, so nothing can bypass the redaction.
const warn = (text: string) => process.stderr.write(redact(text));
const project = 'demo-just-imagine-local';
const models = new VertexModels({
  project,
  apiKey,
  sceneModel: process.env['SCENE_MODEL'] ?? 'gemini-4-argon',
  fastModel: 'gemini-3.8-flash',
  heroModel: '',
  propModel: '',
});
const game = new GameScriptModel({
  project,
  apiKey,
  model: process.env['GAME_MODEL'] ?? 'gemini-4-argon',
});

// The real logEvent writes JSON lines to stdout; capture them per wish and echo a short form.
type Ev = Record<string, unknown>;
let events: Ev[] = [];
const realWrite = process.stdout.write.bind(process.stdout);
process.stdout.write = ((chunk: string | Uint8Array) => {
  const text = typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString();
  for (const line of text.split('\n')) {
    if (!line.startsWith('{')) continue;
    try {
      const e = JSON.parse(line) as Ev;
      events.push(e);
      const { event, reason, outcome, severity } = e;
      warn(
        `  [${String(severity)}] ${String(event)} ${String(reason ?? '')} ${String(outcome ?? '')}\n`,
      );
    } catch {
      /* not an event line */
    }
  }
  return true;
}) as typeof process.stdout.write;
const print = (s: string) => realWrite(redact(s) + '\n');

const secs = (ms: number) => (ms / 1000).toFixed(1);
const rows: { result: string; game: number }[] = [];
print('wish | result | rounds | attempts | game_s | scene_s | fallback | outcome');

for (const [i, [short, description]] of WISHES.entries()) {
  events = [];
  const job = {
    kind: 'build' as const,
    jobId: `j_soak_${i}`,
    worldId: `w_soak_${i}`,
    uid: 'u_soak',
    childId: 'c_soak',
    sessionId: `s_soak_${i}`,
    plan: 'family' as const,
    description,
    experience: 'game' as const,
    concepts: ['force'],
    ageBand: '8-10' as const,
    tier: 'playground' as const,
    styleVersion: 'v1',
    promptVersion: 'v1',
    conversationSummary: '',
  };
  const start = Date.now();
  let sceneMs: number | undefined;
  let result = 'error';
  let rounds = '-';
  let attempts = '-';
  let reason = '';
  let outcome = '';
  try {
    const built = await imagineGame(job as never, {
      generateScene: models.generate,
      reviewScene: models.reviewScene,
      generateScript: (prompt, sessionId, signal) => game.generate(prompt, sessionId, signal),
      planGame: game.plan,
      budget: createBudget(),
      onScene: () => {
        sceneMs ??= Date.now() - start;
      },
    });
    result = built.fallback ? 'template' : 'won';
    rounds = String(built.rounds);
    attempts = String(built.attempts);
    reason = built.fallbackReason ?? '';
  } catch (error) {
    if (error === null || typeof error !== 'object') {
      result = 'error';
      reason = redact(String(error)).slice(0, 160);
    } else {
      const e = error as { name?: string; message?: string; diagnostic?: { code?: string } };
      const message = redact(String(e.message));
      if (error instanceof SceneValidationError || error instanceof GameGenerationError) {
        // imagineGame threw; the worker would turn this into a sample world.
        result = 'threw';
        reason =
          e.diagnostic?.code ??
          (error instanceof SceneValidationError ? 'SCENE_INVALID' : 'unknown');
        warn(`  [threw cause] ${e.name}: ${message.slice(0, 300)}\n`);
      } else {
        result = 'error';
        reason = `${e.name}: ${message.slice(0, 160)}`;
      }
    }
  }
  const fb = events.find((e) => e['event'] === 'game_fallback');
  if (fb && !outcome) outcome = String(fb['outcome'] ?? '');
  const gameMs = Date.now() - start;
  rows.push({ result, game: gameMs / 1000 });
  print(
    [
      short,
      result,
      rounds,
      attempts,
      secs(gameMs),
      sceneMs === undefined ? '-' : secs(sceneMs),
      reason || '-',
      outcome || '-',
    ].join(' | '),
  );
}

const counts: Record<string, number> = {};
for (const r of rows) counts[r.result] = (counts[r.result] ?? 0) + 1;
const sorted = rows.map((r) => r.game).sort((a, b) => a - b);
const mid = Math.floor(sorted.length / 2);
const median = sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
print(
  `SUMMARY won=${counts['won'] ?? 0} template=${counts['template'] ?? 0} threw=${counts['threw'] ?? 0} error=${counts['error'] ?? 0} median_game_s=${median.toFixed(1)}`,
);
