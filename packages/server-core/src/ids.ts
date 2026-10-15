import { monotonicFactory } from 'ulid';

const ulid = monotonicFactory();
export type IdPrefix = 'w' | 's' | 'j' | 'c';

export function newId(prefix: IdPrefix): string {
  return `${prefix}_${ulid().toLowerCase()}`;
}
