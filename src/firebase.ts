import { io, type Socket } from 'socket.io-client';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getAuth as getFirebaseAuth,
  RecaptchaVerifier as FirebaseRecaptchaVerifier,
  signInWithPhoneNumber as firebaseSignInWithPhoneNumber,
  signOut as firebaseSignOut,
} from 'firebase/auth';

type Constraint =
  | { type: 'where'; field: string; op: string; value: any }
  | { type: 'orderBy'; field: string; direction: 'asc' | 'desc' }
  | { type: 'limit'; count: number };

type RefBase = {
  path: string;
};

type CollectionRef = RefBase & {
  type: 'collection';
};

type DocumentRef = RefBase & {
  type: 'document';
};

type QueryRef = RefBase & {
  type: 'query';
  constraints: Constraint[];
};

type SnapshotDoc = {
  id: string;
  [key: string]: any;
};

type AuthUser = {
  uid: string;
  displayName: string;
  email?: string;
  phoneNumber?: string;
  photoURL?: string;
  role?: 'user' | 'admin';
  isAnonymous?: boolean;
  emailVerified?: boolean;
  tenantId?: string | null;
  providerData?: Array<{
    providerId: string;
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
  }>;
};

declare global {
  interface Window {
    google?: any;
  }
}

const firebaseConfig = {
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || 'AIzaSyD6V0Zyu_-V0jKryRLUa_w9NsynsUHZtCg',
  authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || 'hack-485909.firebaseapp.com',
  projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || 'hack-485909',
  storageBucket:
    (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET || 'hack-485909.firebasestorage.app',
  messagingSenderId:
    (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || '826427159690',
  appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID || '1:826427159690:web:8f3782323edc1783bb6973',
};

const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
const firebaseAuth = getFirebaseAuth(firebaseApp);

function resolveApiBase() {
  const envBase = (import.meta as any).env?.VITE_API_BASE_URL;
  if (envBase) {
    return String(envBase).replace(/\/$/, '');
  }

  const protocol = window.location.protocol;
  const hostname = window.location.hostname;

  if (protocol === 'http:' || protocol === 'https:') {
    return `${window.location.origin}/api`;
  }

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://127.0.0.1:3000/api';
  }

  return 'http://127.0.0.1:3000/api';
}

function resolveSocketBase() {
  const envBase = (import.meta as any).env?.VITE_API_BASE_URL;
  if (envBase) {
    return String(envBase).replace(/\/api\/?$/, '');
  }

  if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
    return window.location.origin;
  }

  return 'http://127.0.0.1:3000';
}

const API_BASE = resolveApiBase();
const SOCKET_BASE = resolveSocketBase();
const AUTH_STORAGE_KEY = 'scorewala-auth-user';
const AUTH_TOKEN_STORAGE_KEY = 'scorewala-auth-token';
const BASE_POLL_INTERVAL = Number((import.meta as any).env?.VITE_POLL_INTERVAL_MS || 4000);
const HIDDEN_TAB_POLL_INTERVAL = Number((import.meta as any).env?.VITE_HIDDEN_POLL_INTERVAL_MS || 12000);
const MAX_BACKOFF_INTERVAL = Number((import.meta as any).env?.VITE_MAX_POLL_INTERVAL_MS || 20000);

function joinPath(parts: string[]) {
  return parts.filter(Boolean).join('/');
}

async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  const response = await fetch(`${API_BASE}${input}`, {
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
    ...init,
  });

  if (!response.ok) {
    const text = await response.text();
    if (response.status === 401) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
      authStore.currentUser = null;
      emitAuthChange();
    }
    throw new Error(`HTTP ${response.status}: ${text || 'Request failed'}`);
  }

  return response.json();
}

function sanitizeDocument(doc: SnapshotDoc | null) {
  if (!doc) return null;
  const { id, ...data } = doc;
  return { id, ...data };
}

function createDocSnapshot(doc: SnapshotDoc | null) {
  const data = sanitizeDocument(doc);
  return {
    id: data?.id || '',
    exists: () => !!data,
    data: (): any => {
      if (!data) return undefined;
      const { id, ...rest } = data;
      return rest;
    },
  };
}

function createQuerySnapshot(docs: SnapshotDoc[]) {
  return {
    docs: docs.map((item) => createDocSnapshot(item) as any),
    empty: docs.length === 0,
  };
}

function stripUndefined(input: any): any {
  if (Array.isArray(input)) return input.map(stripUndefined);
  if (input instanceof Date) return input.toISOString();
  if (!input || typeof input !== 'object') return input;

  return Object.fromEntries(
    Object.entries(input)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, stripUndefined(value)])
  );
}

export const db = { kind: 'rest-db' };

type AuthStore = {
  currentUser: AuthUser | null;
  listeners: Set<(user: AuthUser | null) => void>;
};

const authStore: AuthStore = {
  currentUser: null,
  listeners: new Set(),
};

let realtimeSocket: Socket | null = null;
let socketBootstrapped = false;
let socketSubscriptions = new Map<
  string,
  {
    ref: DocumentRef | QueryRef | CollectionRef;
    callback: (snapshot: any) => void;
    onError?: (error: unknown) => void;
    lastPayload: string;
  }
>();

function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

function getComparablePayload(ref: DocumentRef | QueryRef | CollectionRef, snapshot: any) {
  return ref.type === 'document'
    ? JSON.stringify(snapshot.data?.() || null)
    : JSON.stringify(snapshot.docs.map((item: any) => ({ id: item.id, ...item.data() })));
}

function ensureRealtimeSocket() {
  if (realtimeSocket || typeof window === 'undefined') {
    return realtimeSocket;
  }

  const token = getAuthToken();
  if (!token) {
    return null;
  }

  realtimeSocket = io(SOCKET_BASE, {
    autoConnect: false,
    transports: ['websocket', 'polling'],
    auth: {
      token,
    },
  });

  realtimeSocket.on('snapshot:data', (payload: any) => {
    const subscription = socketSubscriptions.get(String(payload?.id || ''));
    if (!subscription) return;

    const snapshot =
      payload.kind === 'document'
        ? createDocSnapshot(payload.doc || null)
        : createQuerySnapshot(Array.isArray(payload.docs) ? payload.docs : []);

    const comparable = getComparablePayload(subscription.ref, snapshot);
    if (comparable === subscription.lastPayload) {
      return;
    }

    subscription.lastPayload = comparable;
    subscription.callback(snapshot);
  });

  realtimeSocket.on('snapshot:error', (payload: any) => {
    const subscription = socketSubscriptions.get(String(payload?.id || ''));
    if (subscription?.onError) {
      subscription.onError(new Error(payload?.message || 'Realtime subscription failed'));
    }
  });

  realtimeSocket.on('connect', () => {
    for (const [id, subscription] of socketSubscriptions.entries()) {
      const queryRef: QueryRef =
        subscription.ref.type === 'query'
          ? subscription.ref
          : {
              type: 'query',
              path: subscription.ref.path,
              constraints: [],
            };

      realtimeSocket?.emit('snapshot:subscribe', {
        id,
        mode: subscription.ref.type === 'document' ? 'document' : 'query',
        path: subscription.ref.path,
        constraints: subscription.ref.type === 'document' ? [] : queryRef.constraints,
      });
    }
  });

  realtimeSocket.on('connect_error', (error) => {
    for (const subscription of socketSubscriptions.values()) {
      subscription.onError?.(error);
    }
  });

  socketBootstrapped = true;
  realtimeSocket.connect();
  return realtimeSocket;
}

function refreshSocketAuth() {
  if (!realtimeSocket) return;
  realtimeSocket.auth = {
    token: getAuthToken(),
  };

  if (getAuthToken()) {
    if (!realtimeSocket.connected) {
      realtimeSocket.connect();
    }
  } else {
    realtimeSocket.disconnect();
  }
}

function emitAuthChange() {
  for (const listener of authStore.listeners) {
    listener(authStore.currentUser);
  }
}

function normalizeUser(user: any): AuthUser {
  return {
    uid: user.uid,
    displayName: user.displayName || 'Score Wala User',
    email: user.email || '',
    phoneNumber: user.phoneNumber || '',
    photoURL: user.photoURL || '',
    role: user.role || 'user',
    isAnonymous: false,
    emailVerified: true,
    tenantId: null,
    providerData: [
      {
        providerId: user.phoneNumber ? 'phone' : 'google',
        displayName: user.displayName || null,
        email: user.email || null,
        photoURL: user.photoURL || null,
      },
    ],
  };
}

function setCurrentUser(user: any, token?: string) {
  authStore.currentUser = user ? normalizeUser(user) : null;
  if (authStore.currentUser) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authStore.currentUser));
    if (token) {
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    }
  } else {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  }
  if (socketBootstrapped || token) {
    ensureRealtimeSocket();
    refreshSocketAuth();
  }
  emitAuthChange();
}

const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);
if (storedUser) {
  try {
    authStore.currentUser = normalizeUser(JSON.parse(storedUser));
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
}

export const auth = {
  get currentUser() {
    return authStore.currentUser;
  },
};

export const googleProvider = {};

export const serverTimestamp = () => ({ __type: 'serverTimestamp' as const });
export const increment = (amount: number) => ({ __type: 'increment' as const, amount });

function loadGoogleScript() {
  return new Promise<void>((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }

    const existing = document.querySelector('script[data-google-identity="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load Google script')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google script'));
    document.head.appendChild(script);
  });
}

async function signInWithGoogleOAuth() {
  const clientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('Google login is not configured. Set VITE_GOOGLE_CLIENT_ID in .env.');
  }

  await loadGoogleScript();

  const accessToken = await new Promise<string>((resolve, reject) => {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'openid email profile',
      callback: (response: any) => {
        if (response?.access_token) {
          resolve(response.access_token);
          return;
        }
        reject(new Error(response?.error || 'Google login failed'));
      },
      error_callback: (error: any) => reject(new Error(error?.message || 'Google login failed')),
    });

    tokenClient.requestAccessToken({ prompt: 'select_account' });
  });

  const googleProfile = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error('Failed to fetch Google profile');
    }
    return response.json();
  });

  const result = await apiFetch<{ user: AuthUser; token: string }>('/auth/google', {
    method: 'POST',
    body: JSON.stringify({
      googleId: googleProfile.sub,
      displayName: googleProfile.name,
      email: googleProfile.email,
      photoURL: googleProfile.picture,
    }),
  });

  setCurrentUser(result.user, result.token);
  return { user: authStore.currentUser };
}

async function exchangeFirebaseSession(firebaseUser: any) {
  const idToken = await firebaseUser.getIdToken();
  const result = await apiFetch<{ user: AuthUser; token: string }>('/auth/firebase', {
    method: 'POST',
    body: JSON.stringify({
      idToken,
      displayName: firebaseUser.displayName || '',
      email: firebaseUser.email || '',
      phoneNumber: firebaseUser.phoneNumber || '',
      photoURL: firebaseUser.photoURL || '',
    }),
  });

  setCurrentUser(result.user, result.token);
  return { user: authStore.currentUser };
}

export const signIn = async () => {
  return signInWithGoogleOAuth();
};

export const logOut = async () => {
  await firebaseSignOut(firebaseAuth).catch(() => undefined);
  setCurrentUser(null);
};

export const onAuthStateChanged = (_auth: typeof auth, callback: (user: AuthUser | null) => void) => {
  authStore.listeners.add(callback);
  callback(authStore.currentUser);
  return () => authStore.listeners.delete(callback);
};

export class RecaptchaVerifier {
  constructor(_authInstance: typeof auth, container: string, options?: any) {
    return new FirebaseRecaptchaVerifier(firebaseAuth, container, options);
  }
}

export const PhoneAuthProvider = {};

export const signInWithPhoneNumber = async (
  _authInstance: typeof auth,
  phoneNumber: string,
  verifier: any
) => {
  const confirmationResult = await firebaseSignInWithPhoneNumber(firebaseAuth, phoneNumber, verifier);

  return {
    confirm: async (otp: string) => {
      const result = await confirmationResult.confirm(otp);
      return exchangeFirebaseSession(result.user);
    },
  };
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('API Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function collection(base: any, ...segments: string[]): CollectionRef {
  const basePath = base?.path ? [base.path] : [];
  return { type: 'collection', path: joinPath([...basePath, ...segments]) };
}

export function doc(base: any, ...segments: string[]): DocumentRef {
  const basePath = base?.path ? [base.path] : [];
  return { type: 'document', path: joinPath([...basePath, ...segments]) };
}

export function query(ref: CollectionRef, ...constraints: Constraint[]): QueryRef {
  return {
    type: 'query',
    path: ref.path,
    constraints,
  };
}

export function where(field: string, op: string, value: any): Constraint {
  return { type: 'where', field, op, value };
}

export function orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): Constraint {
  return { type: 'orderBy', field, direction };
}

export function limit(count: number): Constraint {
  return { type: 'limit', count };
}

export async function getDoc(ref: DocumentRef) {
  try {
    const result = await apiFetch<{ doc: SnapshotDoc }>(`/data/document?path=${encodeURIComponent(ref.path)}`);
    return createDocSnapshot(result.doc);
  } catch (error: any) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('404')) {
      return createDocSnapshot(null);
    }
    throw error;
  }
}

export async function getDocFromServer(ref: DocumentRef) {
  return getDoc(ref);
}

export async function getDocs(ref: QueryRef | CollectionRef) {
  const queryRef: QueryRef =
    ref.type === 'query'
      ? ref
      : {
          type: 'query',
          path: ref.path,
          constraints: [],
        };

  const result = await apiFetch<{ docs: SnapshotDoc[] }>('/data/query', {
    method: 'POST',
    body: JSON.stringify({
      path: queryRef.path,
      constraints: queryRef.constraints,
    }),
  });

  return createQuerySnapshot(result.docs);
}

export async function setDoc(ref: DocumentRef, data: Record<string, any>) {
  const result = await apiFetch<{ doc: SnapshotDoc }>('/data/document', {
    method: 'PUT',
    body: JSON.stringify({
      path: ref.path,
      data: stripUndefined(data),
    }),
  });

  return createDocSnapshot(result.doc);
}

export async function addDoc(ref: CollectionRef, data: Record<string, any>) {
  const result = await apiFetch<{ doc: SnapshotDoc }>('/data/collection', {
    method: 'POST',
    body: JSON.stringify({
      path: ref.path,
      data: stripUndefined(data),
    }),
  });

  return {
    id: result.doc.id,
  };
}

export async function updateDoc(ref: DocumentRef, data: Record<string, any>) {
  const result = await apiFetch<{ doc: SnapshotDoc }>('/data/document', {
    method: 'PATCH',
    body: JSON.stringify({
      path: ref.path,
      data: stripUndefined(data),
    }),
  });

  return createDocSnapshot(result.doc);
}

export async function deleteDoc(ref: DocumentRef) {
  return apiFetch('/data/document', {
    method: 'DELETE',
    body: JSON.stringify({ path: ref.path }),
  });
}

export function onSnapshot(
  ref: DocumentRef | QueryRef | CollectionRef,
  callback: (snapshot: any) => void,
  onError?: (error: unknown) => void
) {
  let stopped = false;
  let lastPayload = '';
  let timer: number | null = null;
  let failureCount = 0;
  const subscriptionId = `sub_${Math.random().toString(36).slice(2)}_${Date.now()}`;

  const socket = ensureRealtimeSocket();

  const getQueryRef = () =>
    ref.type === 'query'
      ? ref
      : {
          type: 'query' as const,
          path: ref.path,
          constraints: [],
        };

  const getNextDelay = () => {
    const baseDelay = document.hidden ? HIDDEN_TAB_POLL_INTERVAL : BASE_POLL_INTERVAL;
    const backoffDelay = Math.min(baseDelay * 2 ** failureCount, MAX_BACKOFF_INTERVAL);
    const jitter = Math.floor(Math.random() * 500);
    return backoffDelay + jitter;
  };

  const scheduleNextPoll = () => {
    if (stopped) return;
    if (timer) {
      window.clearTimeout(timer);
    }
    timer = window.setTimeout(() => {
      void poll();
    }, getNextDelay());
  };

  const poll = async () => {
    try {
      const snapshot =
        ref.type === 'document'
          ? await getDoc(ref)
          : await getDocs(ref.type === 'collection' ? query(ref) : ref);

      const comparable = getComparablePayload(ref, snapshot);

      if (comparable !== lastPayload) {
        lastPayload = comparable;
        const activeSubscription = socketSubscriptions.get(subscriptionId);
        if (activeSubscription) {
          activeSubscription.lastPayload = comparable;
        }
        callback(snapshot);
      }
      failureCount = 0;
    } catch (error) {
      failureCount += 1;
      if (onError) onError(error);
    } finally {
      scheduleNextPoll();
    }
  };

  void poll();

  if (socket) {
    socketSubscriptions.set(subscriptionId, {
      ref,
      callback,
      onError,
      lastPayload,
    });

    if (socket.connected) {
      socket.emit('snapshot:subscribe', {
        id: subscriptionId,
        mode: ref.type === 'document' ? 'document' : 'query',
        path: ref.path,
        constraints: ref.type === 'document' ? [] : getQueryRef().constraints,
      });
    }
  }

  return () => {
    stopped = true;
    if (timer) {
      window.clearTimeout(timer);
    }
    socketSubscriptions.delete(subscriptionId);
    realtimeSocket?.emit('snapshot:unsubscribe', subscriptionId);
  };
}
