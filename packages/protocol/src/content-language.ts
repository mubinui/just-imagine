/** Only display prose is translated. IDs, scripts, physics, art, answers and progress are immutable. */
export type ContentKind = 'world' | 'story' | 'session' | 'discovery';
export interface ContentText {
  path: (string | number)[];
  text: string;
  max: number;
}
export function contentTexts(kind: ContentKind, value: unknown): ContentText[] {
  const entries: ContentText[] = [];
  const get = (path: (string | number)[]): unknown =>
    path.reduce<unknown>(
      (node, key) =>
        node !== null && typeof node === 'object'
          ? (node as Record<string, unknown>)[key]
          : undefined,
      value,
    );
  const add = (path: (string | number)[], max = 1000) => {
    const text = get(path);
    if (typeof text === 'string' && text.trim()) entries.push({ path, text, max });
  };
  const each = (path: (string | number)[], visit: (p: (string | number)[]) => void) => {
    const node = get(path);
    if (Array.isArray(node)) node.forEach((_, i) => visit([...path, i]));
  };
  if (kind === 'session') add(['summary'], 4000);
  if (kind === 'discovery')
    for (const key of ['title', 'kidExplanation', 'realLifeNote']) add([key]);
  if (kind === 'story') {
    add(['topic'], 600);
    add(['preferences', 'learningGoals']);
    add(['preferences', 'avoidTopics'], 500);
    for (const [key, max] of [
      ['title', 100],
      ['synopsis', 400],
      ['ending', 1000],
    ] as const)
      add(['manuscript', key], max);
    each(['manuscript', 'learningGoals'], (p) => add(p, 200));
    each(['manuscript', 'scenes'], (p) => {
      add([...p, 'title'], 100);
      add([...p, 'question'], 240);
      add([...p, 'lesson'], 400);
      add([...p, 'discovery', 'label'], 70);
      add([...p, 'discovery', 'explanation']);
      each([...p, 'beats'], (b) => {
        add([...b, 'text']);
        add([...b, 'focus'], 90);
      });
      each([...p, 'choices'], (c) => {
        add([...c, 'label'], 100);
        add([...c, 'response']);
      });
    });
  }
  if (kind === 'world') {
    add(['title'], 60);
    add(['doc', 'title'], 60);
    add(['doc', 'narration', 'intro'], 240);
    each(['doc', 'entities'], (p) => {
      add([...p, 'name'], 40);
      for (const [key, max] of [
        ['name', 40],
        ['personality', 240],
        ['greeting', 160],
        ['topic', 160],
      ] as const)
        add([...p, 'character', key], max);
    });
    add(['doc', 'learning', 'prediction', 'question'], 160);
    each(['doc', 'learning', 'prediction', 'options'], (p) => add(p, 40));
    each(['doc', 'rules'], (p) => each([...p, 'then'], (a) => add([...a, 'text'], 200)));
    const variables = get(['doc', 'variables']);
    if (variables && typeof variables === 'object')
      for (const key of Object.keys(variables)) {
        add(['doc', 'variables', key, 'label'], 30);
        add(['doc', 'variables', key, 'unit'], 8);
      }
    each(['doc', 'visuals'], (p) => {
      add([...p, 'title'], 40);
      add([...p, 'text'], 40);
    });
    each(['doc', 'challenges'], (p) => {
      add([...p, 'goal'], 120);
      add([...p, 'hint'], 160);
    });
  }
  return entries;
}
export function validateContentTexts(entries: ContentText[], texts: string[]): void {
  if (entries.length !== texts.length) throw new Error('Incomplete content translation');
  entries.forEach((entry, i) => {
    const text = texts[i];
    if (typeof text !== 'string' || !text.trim() || text.length > entry.max)
      throw new Error('Invalid content translation');
  });
}
export function applyContentTexts<T>(value: T, entries: ContentText[], texts: string[]): T {
  validateContentTexts(entries, texts);
  const result = structuredClone(value);
  entries.forEach((entry, i) => {
    const translated = texts[i]!;
    if (!translated.trim() || translated.length > entry.max)
      throw new Error('Invalid content translation');
    const parent = entry.path
      .slice(0, -1)
      .reduce<unknown>((node, key) => (node as Record<string, unknown>)[key], result);
    (parent as Record<string, unknown>)[entry.path.at(-1)!] = translated;
  });
  return result;
}

/** Neutral numbers/symbols are language-independent; proper prose must use the selected script. */
export function textUsesLanguage(text: string, language: 'en' | 'bn'): boolean {
  const prose = text.replace(/\{n\d+\}/g, '');
  const letters = prose.match(/\p{Letter}/gu) ?? [];
  const script = language === 'en' ? /\p{Script=Latin}/u : /\p{Script=Bengali}/u;
  return letters.every((letter) => script.test(letter));
}
