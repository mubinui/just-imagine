'use client';
import { useCallback, useEffect, useState } from 'react';
import { currentIdToken } from '../firebase';
import { env } from '../env';

let operatorSchoolContext: string | null = null;
export function setOperatorSchoolContext(id: string | null) {
  operatorSchoolContext = id;
}
export function schoolHref(href: string): string {
  return operatorSchoolContext && href.startsWith('/school')
    ? href +
        (href.includes('?') ? '&' : '?') +
        'schoolId=' +
        encodeURIComponent(operatorSchoolContext)
    : href;
}
export class SchoolApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export async function schoolRequest<T>(
  path: string,
  body?: unknown,
  method = body === undefined ? 'GET' : 'POST',
  anonymous = false,
): Promise<T> {
  if (
    operatorSchoolContext &&
    path.startsWith('school/') &&
    !path.includes('schoolId=') &&
    path !== 'school/invites/accept'
  )
    path +=
      (path.includes('?') ? '&' : '?') + 'schoolId=' + encodeURIComponent(operatorSchoolContext);
  const response = await fetch(env.apiUrl + '/v1/' + path, {
    method,
    headers: {
      ...(anonymous ? {} : { Authorization: `Bearer ${await currentIdToken()}` }),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const value = response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok)
    throw new SchoolApiError(
      response.status,
      value.error?.code ?? 'REQUEST_FAILED',
      typeof value.error === 'string'
        ? value.error
        : (value.error?.message ?? `Request failed (${response.status}).`),
    );
  return value as T;
}
export function useSchoolResource<T>(path: string | null) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    if (!path) return;
    let active = true;
    void Promise.resolve().then(async () => {
      if (!active) return;
      setLoading(true);
      setError('');
      try {
        const next = await schoolRequest<T>(path);
        if (active) setData(next);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Could not load.');
      } finally {
        if (active) setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [path, version]);
  return { data, error, loading, reload };
}
