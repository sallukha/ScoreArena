import { getApiBaseUrl } from './config';

export const AUTH_TOKEN_STORAGE_KEY = 'scorewala-auth-token';

const RETRY_DELAYS_MS = [700, 1500, 3000];

function isTransientFetchError(error: unknown) {
  return error instanceof TypeError || String(error).toLowerCase().includes('failed to fetch');
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  const baseUrl = getApiBaseUrl();
  const fullUrl = `${baseUrl}${input}`;

  let response: Response;
  for (let attempt = 0; ; attempt += 1) {
    try {
      response = await fetch(fullUrl, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(init?.headers || {}),
        },
        ...init,
      });
      break;
    } catch (error) {
      const shouldRetry = isTransientFetchError(error) && attempt < RETRY_DELAYS_MS.length;
      if (!shouldRetry) {
        throw error;
      }
      await wait(RETRY_DELAYS_MS[attempt]);
    }
  }

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
