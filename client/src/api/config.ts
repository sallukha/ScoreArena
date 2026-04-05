const LOCAL_API_FALLBACK = 'http://127.0.0.1:3000/api';
const EMULATOR_API = 'http://10.0.2.2:3000/api'; // Android emulator special IP

function trimTrailingSlash(value: string) {
  return value.replace(/\/$/, '');
}

function isMobileApp() {
  // Check if running in Capacitor
  return (window as any).Capacitor?.isNativePlatform?.() || 
         (window as any).cordova !== undefined ||
         /capacitor:\/\//i.test(window.location.href);
}

export function getApiBaseUrl() {
  const envBase = import.meta.env.VITE_API_BASE_URL;
  if (envBase) {
    console.log('Using env-configured backend:', envBase);
    return trimTrailingSlash(String(envBase));
  }

  // Check if running in mobile app
  if (isMobileApp()) {
    // Try to detect if running in Android emulator
    // In emulator, use special IP 10.0.2.2; on device, try to detect IP
    console.log('Mobile app detected, using emulator backend:', EMULATOR_API);
    return EMULATOR_API;
  }

  const hostname = window.location.hostname;
  const protocol = window.location.protocol;

  // For localhost/127.0.0.1 development, always use the backend server on port 3000
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    console.log('Web localhost detected, using local backend:', LOCAL_API_FALLBACK);
    return LOCAL_API_FALLBACK;
  }

  // For production/deployed apps, use same origin
  if (protocol === 'http:' || protocol === 'https:') {
    const apiUrl = `${window.location.origin}/api`;
    console.log('Web production detected, using same-origin backend:', apiUrl);
    return apiUrl;
  }

  // Fallback for any other case
  console.log('Using fallback backend:', LOCAL_API_FALLBACK);
  return LOCAL_API_FALLBACK;
}

export function getSocketBaseUrl() {
  const apiBase = getApiBaseUrl();
  return apiBase.replace(/\/api\/?$/, '');
}
