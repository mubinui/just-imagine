'use client';
import { currentLanguage } from './i18n';
import { ROUTES, type RouteKey } from '@just-imagine/protocol';
import { env } from './env';
import { currentIdToken } from './firebase';
import { fillPath } from './helpers';
import { demoRequest } from './demo';
export async function api<T>(
  route: RouteKey,
  params: Record<string, string> = {},
  body?: unknown,
): Promise<T> {
  if (env.fake) return demoRequest(route, params, body) as T;
  const contract = ROUTES[route];
  const response = await fetch(env.apiUrl + fillPath(contract.path, params), {
    method: contract.method,
    headers: {
      Authorization: `Bearer ${await currentIdToken()}`,
      'Content-Type': 'application/json',
      'X-App-Language': currentLanguage(),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error?.message || `Request failed (${response.status})`);
  }
  return response.status === 204 ? ({} as T) : response.json();
}
