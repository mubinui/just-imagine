'use client';
import { useCallback, useEffect, useState } from 'react';
import { ADMIN_ROUTES, type AdminRouteKey } from '@just-imagine/protocol';
import { env } from '../../lib/env';
import { currentIdToken } from '../../lib/firebase';
import { adminPath } from './format';
import { isNetworkFailure, NETWORK_MESSAGE } from './errors';

export class AdminApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Sends one authenticated request; an unreachable api becomes a readable status-0 error. */
async function send<T>(path: string, method: string, body: unknown): Promise<T> {
  let token: string;
  try {
    token = await currentIdToken();
  } catch {
    throw new AdminApiError(401, 'Your operator session ended. Sign in again.');
  }
  let response: Response;
  try {
    response = await fetch(env.apiUrl + path, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch (e) {
    if (isNetworkFailure(e)) throw new AdminApiError(0, NETWORK_MESSAGE);
    throw e;
  }
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new AdminApiError(
      response.status,
      (typeof error?.error === 'string' ? error.error : error?.error?.message) ||
        `The api answered ${response.status}. Try again.`,
    );
  }
  return response.status === 204 ? ({} as T) : response.json();
}

/** Every admin read and write goes through the api with the operator's ID token. */
export function adminApi<T>(
  route: AdminRouteKey,
  options: {
    params?: Record<string, string>;
    query?: Record<string, string | number | undefined>;
    body?: unknown;
  } = {},
): Promise<T> {
  return send<T>(
    adminPath(route, options.params, options.query),
    ADMIN_ROUTES[route].method,
    options.body,
  );
}

/** Operator routes for schools, the catalog and lessons, which live under `/v1/admin/`. */
export function adminRequest<T>(
  path: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
  body?: unknown,
): Promise<T> {
  return send<T>('/v1/admin/' + path, method, body);
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
