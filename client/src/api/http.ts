import { getApiBaseUrl } from './config';

export const AUTH_TOKEN_STORAGE_KEY = 'scorewala-auth-token';

export async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  const baseUrl = getApiBaseUrl();
  const fullUrl = `${baseUrl}${input}`;

  const response = await fetch(fullUrl, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
    ...init,
  });

  const text = await response.text();
  
  if (!response.ok) {
    console.error(`API Error: ${response.status} ${fullUrl}`, { responseText: text });
    throw new Error(`HTTP ${response.status}: ${text || 'Request failed'}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    console.warn('Failed to parse response as JSON:', text);
    return text as any;
  }
}
