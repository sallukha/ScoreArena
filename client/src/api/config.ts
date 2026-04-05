const LOCAL_API_FALLBACK = 'http://127.0.0.1:3000/api';

function trimTrailingSlash(value: string) {
  return value.replace(/\/$/, '');
}

export function getApiBaseUrl() {
  const envBase = import.meta.env.VITE_API_BASE_URL;
  if (envBase) {
    return trimTrailingSlash(String(envBase));
  }

  const protocol = window.location.protocol;
  const hostname = window.location.hostname;

  if (protocol === 'http:' || protocol === 'https:') {
    return `${window.location.origin}/api`;
  }

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return LOCAL_API_FALLBACK;
  }

  return LOCAL_API_FALLBACK;
}

export function getSocketBaseUrl() {
  const apiBase = getApiBaseUrl();
  return apiBase.replace(/\/api\/?$/, '');
}
