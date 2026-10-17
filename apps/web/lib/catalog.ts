'use client';
import type { ChildResponse } from '@just-imagine/protocol';
import type { Concept } from '@just-imagine/scene-schema';
import type { PublicPack } from '../components/learn/types';
import { useEffect, useState } from 'react';
import { env } from './env';
import { currentIdToken } from './firebase';
import { currentLanguage } from './i18n';

export interface CatalogWorld {
  id: string;
  title: { en: string; bn: string };
  concepts: Concept[];
  thumbnailUrl: string | null;
}
export interface FamilyCatalog {
  worlds: CatalogWorld[];
  packs: PublicPack[];
}
const empty: FamilyCatalog = { worlds: [], packs: [] };
async function request<T>(path: string, method = 'GET'): Promise<T> {
  const response = await fetch(env.apiUrl + path, {
    method,
    headers: {
      Authorization: `Bearer ${await currentIdToken()}`,
      'X-App-Language': currentLanguage(),
    },
  });
  if (!response.ok) throw new Error('The published collection could not open. Try again.');
  return response.json();
}
export function familyCatalog(childId: string): Promise<FamilyCatalog> {
  return env.fake
    ? Promise.resolve(empty)
    : request(`/v1/children/${encodeURIComponent(childId)}/catalog`);
}
export function openCatalogWorld(childId: string, entryId: string) {
  return request<{ worldId: string }>(
    `/v1/children/${encodeURIComponent(childId)}/catalog/${encodeURIComponent(entryId)}/open`,
    'POST',
  );
}
export function useFamilyCatalog(child: Pick<ChildResponse, 'id'> | undefined) {
  const [snapshot, setSnapshot] = useState<{ childId: string; catalog: FamilyCatalog }>({
      childId: '',
      catalog: empty,
    }),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0);
  const childId = child?.id;
  useEffect(() => {
    if (!childId) return;
    let active = true;
    familyCatalog(childId)
      .then((next) => {
        if (active) {
          setSnapshot({ childId, catalog: next });
          setError('');
        }
      })
      .catch(() => {
        if (active) setError('The published collection could not open. Try again.');
      });
    return () => {
      active = false;
    };
  }, [childId, retry]);
  return {
    ...(snapshot.childId === childId ? snapshot.catalog : empty),
    error,
    retry: () => setRetry((value) => value + 1),
  };
}
