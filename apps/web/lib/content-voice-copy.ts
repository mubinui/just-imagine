import { api } from './api';
import { env } from './env';
import { formatNumber, type Language } from './i18n';
import { copy as uiText, hasUiCopy } from './i18n/ui';

/** Translate runtime prose without rewriting or executing a different game programme. */
export function gameTextEdition(worldId: string, language: Language) {
  const cache = new Map<string, Promise<string>>();
  return async (text: string): Promise<string> => {
    if (!text || env.fake || hasUiCopy(text)) return uiText(text);
    if (language === 'en' && !/[\u0980-\u09ff]/.test(text)) return text;
    if (language === 'bn' && /[\u0980-\u09ff]/.test(text) && !/[a-z]/i.test(text)) return text;
    const numbers: string[] = [];
    const template = text.replace(/[0-9০-৯]+(?:[.,][0-9০-৯]+)*/g, (value) => {
      numbers.push(value.replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 0x09e6)));
      return `{n${numbers.length - 1}}`;
    });
    let pending = cache.get(template);
    if (!pending) {
      pending = api<{ texts: string[] }>(
        'worldTextEdition',
        { worldId },
        { language, texts: [template] },
      ).then((result) => result.texts[0]!);
      cache.set(template, pending);
      pending.catch(() => {
        if (cache.get(template) === pending) cache.delete(template);
      });
    }
    return (await pending).replace(/\{n(\d+)\}/g, (_, i: string) => {
      const value = numbers[Number(i)] ?? '';
      return language === 'bn'
        ? value.replace(/\d/g, (d) => formatNumber(Number(d), language))
        : value;
    });
  };
}
