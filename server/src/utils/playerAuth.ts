import crypto from 'crypto';
import { PlayerModel } from '../models/Player.js';

const OTP_TTL_MS = Math.max(Number(process.env.OTP_TTL_SECONDS || 600), 60) * 1000;
const otpStore = new Map<string, { code: string; expiresAt: number; metadata?: Record<string, any> }>();

export function normalizeEmail(input: unknown) {
  const value = String(input || '').trim().toLowerCase();
  return value || null;
}

export function normalizePhone(input: unknown) {
  const raw = String(input || '').trim();
  if (!raw) return null;

  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;
  if (raw.startsWith('+') && /^\+\d{10,15}$/.test(raw)) return raw;
  return raw;
}

export function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function sanitizePlayer(doc: any) {
  if (!doc) return null;
  const value = doc.toObject ? doc.toObject() : doc;

  return {
    id: String(value._id),
    name: value.name || '',
    phone: value.phone || null,
    email: value.email || null,
    matchesPlayed: Number(value.matchesPlayed || 0),
    totalRuns: Number(value.totalRuns || 0),
    totalWickets: Number(value.totalWickets || 0),
    teams: Array.isArray(value.teams) ? value.teams.map((teamId: any) => String(teamId)) : [],
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

export function createPlayerTokenPayload(player: any) {
  return {
    uid: String(player._id || player.id),
    role: 'user',
  };
}

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString('hex');
  const digest = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${digest}`;
}

export function verifyPassword(password: string, hash: string) {
  const [salt, storedDigest] = String(hash || '').split(':');
  if (!salt || !storedDigest) return false;

  const digestBuffer = crypto.scryptSync(password, salt, 64);
  const storedBuffer = Buffer.from(storedDigest, 'hex');

  if (digestBuffer.length !== storedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(digestBuffer, storedBuffer);
}

export function createOtp(phone: string, metadata?: Record<string, any>) {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  otpStore.set(phone, {
    code,
    expiresAt: Date.now() + OTP_TTL_MS,
    metadata,
  });
  return code;
}

export function verifyOtp(phone: string, otp: string) {
  const record = otpStore.get(phone);
  if (!record) {
    return { ok: false, reason: 'OTP not found or expired' };
  }

  if (record.expiresAt < Date.now()) {
    otpStore.delete(phone);
    return { ok: false, reason: 'OTP expired' };
  }

  if (record.code !== String(otp || '').trim()) {
    return { ok: false, reason: 'Invalid OTP' };
  }

  otpStore.delete(phone);
  return { ok: true, metadata: record.metadata };
}

export async function findPlayerByIdentifiers(input: { phone?: string | null; email?: string | null }) {
  const normalizedPhone = normalizePhone(input.phone);
  const normalizedEmail = normalizeEmail(input.email);
  const filters = [];

  if (normalizedPhone) filters.push({ phone: normalizedPhone });
  if (normalizedEmail) filters.push({ email: normalizedEmail });
  if (filters.length === 0) return null;

  const players = await PlayerModel.find({ $or: filters } as any).limit(2);
  if (players.length === 0) return null;

  const byPhone = normalizedPhone ? players.find((player) => player.phone === normalizedPhone) : null;
  const byEmail = normalizedEmail ? players.find((player) => player.email === normalizedEmail) : null;

  if (byPhone && byEmail && String(byPhone._id) !== String(byEmail._id)) {
    const error = new Error('Phone number and email already belong to different accounts');
    (error as any).statusCode = 409;
    throw error;
  }

  return byPhone || byEmail || players[0];
}

export async function resolveOrCreatePlayer(input: {
  phone?: string | null;
  email?: string | null;
  name?: string | null;
  passwordHash?: string | null;
}) {
  const phone = normalizePhone(input.phone);
  const email = normalizeEmail(input.email);
  const name = String(input.name || '').trim();
  const passwordHash = input.passwordHash || null;

  if (!phone && !email) {
    const error = new Error('Phone or email is required');
    (error as any).statusCode = 400;
    throw error;
  }

  const existing = await findPlayerByIdentifiers({ phone, email });
  if (existing) {
    const update: Record<string, any> = {};

    if (phone && !existing.phone) update.phone = phone;
    if (email && !existing.email) update.email = email;
    if (name && !existing.name) update.name = name;
    if (passwordHash && email) update.password = passwordHash;

    if (Object.keys(update).length > 0) {
      await existing.updateOne(update);
      Object.assign(existing, update);
    }

    return { player: existing, existed: true };
  }

  const player = await PlayerModel.create({
    name,
    phone,
    email,
    password: passwordHash,
  });

  return { player, existed: false };
}
