'use client';
import { useCallback, useEffect, useState } from 'react';
import { ADMIN_ROUTES, type AdminRouteKey } from '@just-imagine/protocol';
import { env } from '../../lib/env';
import { currentIdToken } from '../../lib/firebase';
import { adminPath } from './format';

export class AdminApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Every admin read and write goes through the api with the operator's ID token. */
export async function adminApi<T>(
  route: AdminRouteKey,
  options: {
    params?: Record<string, string>;
    query?: Record<string, string | number | undefined>;
    body?: unknown;
  } = {},
): Promise<T> {
  let token: string;
  try {
    token = await currentIdToken();
  } catch {
    throw new AdminApiError(401, 'Your operator session ended. Sign in again.');
  }
  const response = await fetch(env.apiUrl + adminPath(route, options.params, options.query), {
    method: ADMIN_ROUTES[route].method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new AdminApiError(
      response.status,
      error?.error?.message || `The api answered ${response.status}. Try again.`,
    );
  }
  return response.json();
}

/** Loads one admin resource and exposes reload; errors become readable messages. */
export function useAdminResource<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await load());
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }, [load]);
  useEffect(() => {
    queueMicrotask(() => void reload());
  }, [reload]);
  return { data, error, loading, reload };
}
