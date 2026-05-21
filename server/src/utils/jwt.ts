import crypto from 'crypto';
import { env } from '../config/env.js';

type JwtPayload = {
  sub: string;
  role: string;
  email?: string;
  phoneNumber?: string;
  type: 'access';
  iat: number;
  exp: number;
};

const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 7;

function getJwtSecret() {
  const secret = env.jwtSecret;
  if (!secret) {
    throw new Error('JWT_SECRET is required');
  }
  return secret;
}

function base64UrlEncode(input: Buffer | string) {
  const source = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return source
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(input: string) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, 'base64').toString('utf8');
}

function sign(content: string, secret: string) {
  return base64UrlEncode(crypto.createHmac('sha256', secret).update(content).digest());
}

export function createAccessToken(payload: { uid: string; role: string; email?: string; phoneNumber?: string }) {
  const now = Math.floor(Date.now() / 1000);
  const tokenPayload: JwtPayload = {
    sub: payload.uid,
    role: payload.role || 'user',
    email: payload.email || '',
    phoneNumber: payload.phoneNumber || '',
    type: 'access',
    iat: now,
    exp: now + Number(env.jwtExpiresInSeconds || DEFAULT_TTL_SECONDS),
  };

  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(tokenPayload));
  const signature = sign(`${encodedHeader}.${encodedPayload}`, getJwtSecret());

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyAccessToken(token: string): JwtPayload {
  const [encodedHeader, encodedPayload, receivedSignature] = String(token || '').split('.');
  if (!encodedHeader || !encodedPayload || !receivedSignature) {
    throw new Error('Invalid token format');
  }

  const expectedSignature = sign(`${encodedHeader}.${encodedPayload}`, getJwtSecret());
  const receivedBuffer = Buffer.from(receivedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    throw new Error('Invalid token signature');
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload)) as JwtPayload;
  const now = Math.floor(Date.now() / 1000);

  if (payload.type !== 'access') {
    throw new Error('Invalid token type');
  }

  if (!payload.sub) {
    throw new Error('Invalid token subject');
  }

  if (!payload.exp || payload.exp <= now) {
    throw new Error('Token expired');
  }

  return payload;
}
