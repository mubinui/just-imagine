import type { SceneDoc } from '@just-imagine/scene-schema';
import type { BuildWorldJob } from '@just-imagine/protocol';
import { gateScript, withScript, type ImagineGameDeps } from '../imagine-game';
import type { GameplayPlan } from '../game-playtest';
import { COLLECT_STRINGS, collectSource, collectTargets } from './collect';
import { TAP_TOY_STRINGS, tapToySource } from './tap-toy';

export type TemplateKind = 'collect' | 'tap-toy';
type Mode = 'game' | 'freeplay';
type Language = 'en' | 'bn';

const CATCHING = /catch|collect|gather|pick|find|reach/i;

/** Every fixed child-facing template string, with the default target name, in both languages. */
export const ALL_TEMPLATE_STRINGS: readonly string[] = (['en', 'bn'] as const).flatMap((lang) => {
  const c = COLLECT_STRINGS[lang];
  const t = TAP_TOY_STRINGS[lang];
  return [c.label(c.things), c.greeting(c.things), c.win, t.greeting, t.label, t.win];
});

/** Collect when a game or a catching wish has something besides the hero to catch; else the tap toy. */
export function chooseTemplate(doc: SceneDoc, mode: Mode, intent?: string): TemplateKind {
  const wantsCatching = mode === 'game' || CATCHING.test(intent ?? '');
  return wantsCatching && collectTargets(doc).length > 0 ? 'collect' : 'tap-toy';
}

export function templateSource(
  kind: TemplateKind,
  doc: SceneDoc,
  language: Language,
  mode: Mode,
): string {
  return kind === 'collect' ? collectSource(doc, language) : tapToySource(doc, language, mode);
}

/**
 * The last resort when no generated programme passed: the chosen template,
 * then the tap toy as a game, then the tap toy in free play, each through the
 * same gate as any script. Throws only when all of them fail.
 */
export async function templateGame(
  doc: SceneDoc,
  job: BuildWorldJob,
  plan: GameplayPlan | undefined,
  deps: Pick<ImagineGameDeps, 'moderate' | 'seconds'>,
): Promise<{ doc: SceneDoc; kind: TemplateKind }> {
  const mode: Mode = job.experience ?? 'freeplay';
  const language: Language = job.language ?? 'en';
  const intent = [plan?.intent, job.childRequest, job.description].filter(Boolean).join('\n');
  const tries: [TemplateKind, Mode][] = [[chooseTemplate(doc, mode, intent), mode]];
  if (mode === 'game') tries.push(['tap-toy', 'game']);
  tries.push(['tap-toy', 'freeplay']);
  const failures: string[] = [];
  const seen = new Set<string>();
  for (const [kind, as] of tries) {
    if (seen.has(`${kind}/${as}`)) continue;
    seen.add(`${kind}/${as}`);
    const source = templateSource(kind, doc, language, as);
    const failure = await gateScript(doc, source, {
      language,
      requireGoal: as === 'game',
      ...(deps.moderate ? { moderate: deps.moderate } : {}),
      ...(deps.seconds !== undefined ? { seconds: deps.seconds } : {}),
    });
    if (failure === null) return { doc: withScript(doc, source, as), kind };
    failures.push(`${kind} (${as}): ${failure}`);
  }
  throw new Error(`no template passed the gate: ${failures.join('; ')}`);
}
