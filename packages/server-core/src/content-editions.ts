import { createHash } from 'node:crypto';
import {
  contentTexts,
  textUsesLanguage,
  validateContentTexts,
  applyContentTexts,
  paths,
  yyyymmdd,
  type ContentKind,
  type ContentText,
  type Language,
} from '@just-imagine/protocol';
import { db } from './firebase';
import { transaction } from './transaction';

export interface EditionSource {
  kind: ContentKind;
  path: string;
  uid: string;
  childId: string;
}
export type TranslateContent = (entries: ContentText[], language: Language) => Promise<string[]>;
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const version = 'bn-BD-v1';

/** Model work only receives owned prose. Cached editions never replace canonical game/story data. */
export class ContentEditions {
  private flights = new Map<string, Promise<string[]>>();
  constructor(private translate?: TranslateContent) {}
  private async owned(tx: FirebaseFirestore.Transaction, source: EditionSource) {
    const [user, child, root, familyLock, childLock, itemLock] = await Promise.all([
      tx.get(db().doc(paths.user(source.uid))),
      tx.get(db().doc(paths.child(source.uid, source.childId))),
      tx.get(db().doc(source.path)),
      tx.get(db().doc(`deletionLocks/${source.uid}`)),
      tx.get(db().doc(`users/${source.uid}/deletionLocks/${source.childId}`)),
      source.kind === 'world' || source.kind === 'story'
        ? tx.get(db().doc(`${source.kind}DeletionLocks/${source.path.split('/').at(-1)}`))
        : Promise.resolve(undefined),
    ]);
    const data = root.data();
    if (
      !user.data()?.['consentAt'] ||
      !child.exists ||
      !root.exists ||
      familyLock.exists ||
      childLock.exists ||
      itemLock?.exists ||
      ((source.kind === 'story' || source.kind === 'world') &&
        (data?.['ownerUid'] !== source.uid || data?.['childId'] !== source.childId)) ||
      (source.kind === 'session' &&
        (data?.['uid'] !== source.uid || data?.['childId'] !== source.childId))
    )
      throw new Error('Content is no longer available to this family.');
    return data;
  }
  async cached<T>(source: EditionSource, language: Language, value: T): Promise<T | null> {
    const entries = contentTexts(source.kind, value),
      hash = digest([version, entries]);
    return transaction(async (tx) => {
      const canonical = await this.owned(tx, source);
      if (digest([version, contentTexts(source.kind, canonical)]) !== hash)
        throw new Error('The content changed during translation. Please reload it.');
      const cache = await tx.get(db().doc(`${source.path}/languageEditions/${language}`));
      const data = cache.data();
      if (data?.['hash'] !== hash || !Array.isArray(data['texts'])) return null;
      return applyContentTexts(value, entries, data['texts'] as string[]);
    });
  }
  async apply<T>(source: EditionSource, language: Language, value: T): Promise<T> {
    const entries = contentTexts(source.kind, value);
    if (!entries.length) return value;
    const cached = await this.cached(source, language, value);
    if (cached) return cached;
    if (entries.every((entry) => textUsesLanguage(entry.text, language))) return value;
    if (!this.translate)
      throw new Error('This language edition is being prepared. Please reopen it shortly.');
    const hash = digest([version, entries]),
      key = `${source.path}/${language}/${hash}`;
    let flight = this.flights.get(key);
    if (!flight) {
      flight = this.make(source, language, entries, hash);
      this.flights.set(key, flight);
    }
    try {
      return applyContentTexts(value, entries, await flight);
    } finally {
      if (this.flights.get(key) === flight) this.flights.delete(key);
    }
  }
  private async budget(tx: FirebaseFirestore.Transaction, uid: string) {
    const ref = db().doc(`users/${uid}/translationUsage/${yyyymmdd(new Date())}`),
      snap = await tx.get(ref);
    const calls = Number(snap.data()?.['calls'] ?? 0);
    if (calls >= 160)
      throw new Error('The daily translation allowance is used. Try again tomorrow.');
    return () => tx.set(ref, { calls: calls + 1 });
  }
  private async make(
    source: EditionSource,
    language: Language,
    entries: ContentText[],
    hash: string,
  ) {
    await transaction(async (tx) => {
      await this.owned(tx, source);
      const spend = await this.budget(tx, source.uid);
      spend();
    });
    const missing = entries
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry }) => !textUsesLanguage(entry.text, language));
    const translated = await this.translate!(
      missing.map(({ entry }) => entry),
      language,
    );
    if (translated.length !== missing.length) throw new Error('Incomplete content translation');
    const texts = entries.map((entry) => entry.text);
    missing.forEach(({ index }, i) => {
      texts[index] = translated[i]!;
    });
    validateContentTexts(entries, texts);
    if (!texts.every((text) => textUsesLanguage(text, language)))
      throw new Error('The translation used another language.');
    await transaction(async (tx) => {
      const canonical = await this.owned(tx, source);
      if (digest([version, contentTexts(source.kind, canonical)]) !== hash)
        throw new Error('The content changed during translation. Please reload it.');
      tx.set(db().doc(`${source.path}/languageEditions/${language}`), {
        hash,
        texts,
        createdAt: Date.now(),
      });
    });
    return texts;
  }
  async runtime(source: EditionSource, language: Language, raw: string[]): Promise<string[]> {
    if (source.kind !== 'world' || !this.translate) throw new Error('Translation is unavailable.');
    const keys = raw.map((text) => digest([version, text]));
    const ref = db().doc(`${source.path}/languageEditions/runtime_${language}`);
    const old = await transaction(async (tx) => {
      await this.owned(tx, source);
      return ((await tx.get(ref)).data()?.['texts'] as Record<string, string> | undefined) ?? {};
    });
    const missing = [...new Set(raw.filter((_, i) => !old[keys[i]!]))];
    if (!missing.length) return keys.map((k) => old[k]!);
    const flightKey = `${source.path}/${language}/runtime/${digest(missing)}`;
    let flight = this.flights.get(flightKey);
    if (!flight) {
      flight = (async () => {
        await transaction(async (tx) => {
          await this.owned(tx, source);
          const spend = await this.budget(tx, source.uid);
          spend();
        });
        const translated = await this.translate!(
          missing.map((text, i) => ({ path: [i], text, max: 1000 })),
          language,
        );
        validateContentTexts(
          missing.map((text, i) => ({ path: [i], text, max: 1000 })),
          translated,
        );
        if (!translated.every((text) => textUsesLanguage(text, language)))
          throw new Error('The translation used another language.');
        await transaction(async (tx) => {
          await this.owned(tx, source);
          const latest =
            ((await tx.get(ref)).data()?.['texts'] as Record<string, string> | undefined) ?? {};
          const merged = {
            ...latest,
            ...Object.fromEntries(
              missing.map((text, i) => [digest([version, text]), translated[i]!]),
            ),
          };
          tx.set(ref, {
            texts: Object.fromEntries(Object.entries(merged).slice(-256)),
            createdAt: Date.now(),
          });
        });
        return translated;
      })();
      this.flights.set(flightKey, flight);
    }
    try {
      const translated = await flight;
      const values = new Map(missing.map((text, i) => [text, translated[i]!]));
      return raw.map((text, i) => old[keys[i]!] ?? values.get(text)!);
    } finally {
      if (this.flights.get(flightKey) === flight) this.flights.delete(flightKey);
    }
  }
}
