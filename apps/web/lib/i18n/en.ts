import { english } from '../strings/en';

/** English is authored once, in lib/strings/en.ts. This module only gives it its i18n name and types. */
export const en = english;

/** The shape every language table must fill: the same keys as English, each leaf a string. */
type Shape<T> = { readonly [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };
export type StringTable = Shape<typeof en>;

/** Every leaf key as a dotted path, such as 'ask' or 'statusLabels.connected'. */
type Leaf<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaf<T[K], `${P}${K}.`>;
}[keyof T & string];
export type StringKey = Leaf<typeof en>;
