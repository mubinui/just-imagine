'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AdventureProgressSchema, AdventureSummarySchema } from '@just-imagine/protocol';
import { ADVENTURES } from '@just-imagine/learning-content/play';
import { currentIdToken } from '../../lib/firebase';
import { env } from '../../lib/env';

function cached(key: string): { done: string[]; pending: string[] } {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? '{}');
    return {
      done: Array.isArray(v.done) ? v.done.filter((s: unknown) => typeof s === 'string') : [],
      pending: Array.isArray(v.pending)
        ? v.pending.filter((s: unknown) => typeof s === 'string')
        : [],
    };
  } catch {
    return { done: [], pending: [] };
  }
}
async function request(path: string, signal: AbortSignal, body?: unknown) {
  const response = await fetch(env.apiUrl + path, {
    method: body ? 'POST' : 'GET',
    signal,
    headers: {
      Authorization: `Bearer ${await currentIdToken()}`,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) throw new Error('Could not save the adventure');
  return response.json();
}
export function useAdventureBook(childId: string, packId: string) {
  const key = `ji-adventure-v1:${childId}:${packId}`;
  const [done, setDone] = useState<string[]>([]),
    [loaded, setLoaded] = useState(false),
    [status, setStatus] = useState<'saved' | 'saving' | 'offline'>('saved');
  const state = useRef({
    key,
    done: [] as string[],
    pending: new Set<string>(),
    active: true,
    saving: false,
    needsRead: false,
  });
  const save = useCallback(
    async (chapterId?: string) => {
      const s = state.current;
      if (s.key !== key || !s.active) return;
      const valid = new Set(ADVENTURES[packId]?.chapters.map((c) => c.id));
      if (chapterId && valid.has(chapterId)) {
        if (!s.done.includes(chapterId)) s.done.push(chapterId);
        s.pending.add(chapterId);
        setDone([...s.done]);
      }
      const persist = () => {
        try {
          localStorage.setItem(key, JSON.stringify({ done: s.done, pending: [...s.pending] }));
        } catch {
          /* The server can still save without local storage. */
        }
      };
      persist();
      if (s.saving || (!s.pending.size && !s.needsRead)) return;
      s.saving = true;
      setStatus('saving');
      try {
        if (s.needsRead && !env.fake) {
          const remote = AdventureSummarySchema.parse(
            await request(
              `/v1/children/${encodeURIComponent(childId)}/adventures`,
              AbortSignal.timeout(8000),
            ),
          );
          s.done = [
            ...new Set([
              ...s.done,
              ...(remote.progress
                .find((p) => p.packId === packId)
                ?.chaptersDone.filter((id) => valid.has(id)) ?? []),
            ]),
          ];
          s.needsRead = false;
        }
        for (const id of s.pending) {
          if (!s.active) break;
          if (!env.fake) {
            const result = AdventureProgressSchema.parse(
              await request(
                `/v1/children/${encodeURIComponent(childId)}/adventures/${encodeURIComponent(packId)}`,
                AbortSignal.timeout(8000),
                { chapterId: id },
              ),
            );
            s.done = [
              ...new Set([...s.done, ...result.chaptersDone.filter((id) => valid.has(id))]),
            ];
          }
          s.pending.delete(id);
          persist();
        }
        if (s.active) {
          setDone([...s.done]);
          setStatus('saved');
        }
      } catch {
        if (s.active) setStatus('offline');
      } finally {
        s.saving = false;
      }
    },
    [key, childId, packId],
  );
  useEffect(() => {
    const old = cached(key),
      valid = new Set(ADVENTURES[packId]?.chapters.map((c) => c.id));
    const s = {
      key,
      done: old.done.filter((id) => valid.has(id)),
      pending: new Set(old.pending.filter((id) => valid.has(id))),
      active: true,
      saving: false,
      needsRead: false,
    };
    state.current = s;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    void (async () => {
      try {
        if (!env.fake) {
          const book = AdventureSummarySchema.parse(
            await request(
              `/v1/children/${encodeURIComponent(childId)}/adventures`,
              controller.signal,
            ),
          );
          const server = book.progress.find((p) => p.packId === packId)?.chaptersDone ?? [];
          s.done = [...new Set([...server.filter((id) => valid.has(id)), ...s.pending])];
        }
        if (s.active) {
          setDone([...s.done]);
          setStatus('saved');
          setLoaded(true);
          void save();
        }
      } catch {
        s.needsRead = true;
        if (s.active) {
          setDone([...s.done]);
          setStatus('offline');
          setLoaded(true);
        }
      } finally {
        clearTimeout(timer);
      }
    })();
    const retry = () => void save();
    window.addEventListener('online', retry);
    return () => {
      s.active = false;
      controller.abort();
      clearTimeout(timer);
      window.removeEventListener('online', retry);
    };
  }, [childId, packId, key, save]);
  return { done, loaded, status, save };
}
