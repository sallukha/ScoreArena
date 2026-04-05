import { getApiBaseUrl } from './config';

export const AUTH_TOKEN_STORAGE_KEY = 'scorewala-auth-token';

export async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  const response = await fetch(`${getApiBaseUrl()}${input}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
    ...init,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text || 'Request failed'}`);
  }

  return response.json();
}
