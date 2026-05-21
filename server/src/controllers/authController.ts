import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';
import { getFirebaseAdminAuth } from '../config/firebaseAdmin.js';
import { logger } from '../config/logger.js';
import  PlayerModel from '../models/Player.js';
import { UserModel } from '../models/User.js';
import { createAccessToken } from '../utils/jwt.js';
import {
  createOtp,
  createPlayerTokenPayload,
  findPlayerByIdentifiers,
  hashPassword,
  normalizeEmail,
  normalizePhone,
  resolveOrCreatePlayer,
  sanitizePlayer,
  verifyOtp,
  verifyPassword,
} from '../utils/playerAuth.js';

function normalizePhoneNumber(input: string) {
  const trimmed = String(input || '').trim();
  const digits = trimmed.replace(/\D/g, '');

  if (trimmed.startsWith('+') && digits.length >= 10) {
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  if (digits.length > 10) {
    return `+${digits}`;
  }

  return trimmed;
}

function getFirebaseApiKey() {
  return (
    process.env.FIREBASE_API_KEY ||
    process.env.VITE_FIREBASE_API_KEY ||
    'AIzaSyA2sBh5eTwaAHkKhxbDynOEEcJPxi6Iz0w'
  );
}
async function lookupFirebaseUser(idToken: string) {
  const adminAuth = getFirebaseAdminAuth();
  if (adminAuth) {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    return {
      localId: decodedToken.uid,
      displayName: decodedToken.name || '',
      email: decodedToken.email || '',
      phoneNumber: decodedToken.phone_number || '',
      photoUrl: decodedToken.picture || '',
    };
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(getFirebaseApiKey())}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken }),
    }
  );

  const payload: any = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error?.message || 'Failed to verify Firebase token');
  }

  const user = Array.isArray(payload?.users) ? payload.users[0] : null;
  if (!user?.localId) {
    throw new Error('Firebase user was not found');
  }

  return user;
}

function sanitizeUser(doc: any) {
  if (!doc) return null;
  const value = doc.toObject ? doc.toObject() : doc;
  return {
    uid: value.uid || value._id,
    displayName: value.displayName,
    email: value.email || '',
    phoneNumber: value.phoneNumber || '',
    photoURL: value.photoURL || '',
    role: value.role || 'user',
  };
}

function buildAuthResponse(doc: any) {
  const user = sanitizeUser(doc);
  return {
    user,
    token: createAccessToken({
      uid: user.uid,
      role: user.role || 'user',
      email: user.email || '',
      phoneNumber: user.phoneNumber || '',
    }),
  };
}

async function ensureLoginPlayer(user: any) {
  const email = normalizeEmail(user?.email);
  const phone = normalizePhone(user?.phoneNumber);

  if (!email && !phone) {
    return null;
  }

  try {
    const { player } = await resolveOrCreatePlayer({
      name: user?.displayName || email || phone || 'ScoreArena Player',
      email,
      phone,
      createdBy: user?.uid || '',
      scope: 'general',
    });
    return player;
  } catch (error) {
    logger.warn('Could not auto-link player profile during login', {
      uid: user?.uid,
      email,
      phone,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function getUser(req: Request, res: Response) {
  if (!req.authUser) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (req.authUser.uid !== req.params.uid && req.authUser.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const user = await (UserModel as any).findById(req.params.uid).lean();
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  return res.json(sanitizeUser(user));
}
export async function googleLogin(req: Request, res: Response) {
  const { displayName, email, photoURL, googleId } = req.body || {};
  const safeEmail = String(email || '').trim().toLowerCase();
  const safeGoogleId = String(googleId || '').trim();
  const uid = safeGoogleId
    ? `google_${safeGoogleId}`
    : safeEmail
    ? `google_${safeEmail.replace(/[^a-z0-9]/g, '_')}`
    : `google_${randomUUID()}`;

  const user = await (UserModel as any).findByIdAndUpdate(
    uid,
    {
      _id: uid,
      uid,
      displayName: displayName || safeEmail || 'ScoreArena User',
      email: safeEmail,
      photoURL: photoURL || '',
      googleId: safeGoogleId,
      authProvider: 'google',
      role: 'user',
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );

  await ensureLoginPlayer(sanitizeUser(user));
  return res.json({
    ...buildAuthResponse(user),
    isNewUser: !user?.createdAt || !user?.updatedAt,
  });
}

export async function firebaseLogin(req: Request, res: Response) {
  const idToken = String(req.body?.idToken || '').trim();
  if (!idToken) {
    logger.warn('Firebase login attempt without token');
    return res.status(400).json({ error: 'Firebase ID token is required' });
  }

  let firebaseUser: any;
  try {
    firebaseUser = await lookupFirebaseUser(idToken);
    logger.info('Firebase token verified successfully', { uid: firebaseUser?.localId });
  } catch (error) {
    logger.warn('Firebase token verification failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(401).json({
      error: error instanceof Error ? error.message : 'Failed to verify Firebase token',
    });
  }

  const phoneNumber = normalizePhoneNumber(req.body?.phoneNumber || firebaseUser.phoneNumber || '');
  const safeEmail = String(req.body?.email || firebaseUser.email || '').trim().toLowerCase();
  const safeGoogleId = String(req.body?.googleId || '').trim();
  const providerId = String(req.body?.providerId || '').trim().toLowerCase();

  const authProvider: 'phone' | 'google' =
    phoneNumber || providerId.includes('phone') ? 'phone' : 'google';

  const uid = phoneNumber
    ? `phone_${phoneNumber.replace(/[^0-9]/g, '')}`
    : safeGoogleId
    ? `google_${safeGoogleId.replace(/[^a-zA-Z0-9_-]/g, '_')}`
    : safeEmail
    ? `google_${safeEmail.replace(/[^a-z0-9]/g, '_')}`
    : `firebase_${String(firebaseUser.localId || randomUUID())}`;

  try {
    const user = await (UserModel as any).findByIdAndUpdate(
      uid,
      {
        _id: uid,
        uid,
        displayName:
          String(req.body?.displayName || firebaseUser.displayName || '').trim() ||
          (phoneNumber ? `User_${phoneNumber.slice(-4)}` : safeEmail || 'ScoreArena User'),
        email: safeEmail,
        phoneNumber: phoneNumber || '',
        photoURL: String(req.body?.photoURL || firebaseUser.photoUrl || '').trim(),
        googleId: authProvider === 'google' ? safeGoogleId : '',
        authProvider,
        role: 'user',
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    logger.info('User logged in via Firebase', { uid, authProvider });
    await ensureLoginPlayer(sanitizeUser(user));
    return res.json(buildAuthResponse(user));
  } catch (error) {
    logger.error('Database error during firebase login', {
      error: error instanceof Error ? error.message : String(error),
      uid,
      authProvider,
    });
    return res.status(500).json({
      error: 'Failed to create or update user. Please try again.',
    });
  }
}

function buildPlayerAuthResponse(player: any) {
  return {
    player: sanitizePlayer(player),
    token: createAccessToken(createPlayerTokenPayload(player)),
  };
}

export async function emailSignup(req: Request, res: Response) {
  const name = String(req.body?.name || '').trim();
  const email = normalizeEmail(req.body?.email);
  const phone = normalizePhone(req.body?.phone);
  const password = String(req.body?.password || '');

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  try {
    const { player, existed } = await resolveOrCreatePlayer({
      name,
      email,
      phone,
      passwordHash: hashPassword(password),
    });

    return res.status(existed ? 200 : 201).json({
      existed,
      ...buildPlayerAuthResponse(player),
    });
  } catch (error) {
    const statusCode = (error as any)?.statusCode || 500;
    return res.status(statusCode).json({
      error: error instanceof Error ? error.message : 'Failed to sign up',
    });
  }
}

export async function emailLogin(req: Request, res: Response) {
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || '');

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const player = await PlayerModel.findOne({ email });
  if (!player || !player.password) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const valid = verifyPassword(password, player.password);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  return res.json(buildPlayerAuthResponse(player));
}

export async function requestPhoneOtp(req: Request, res: Response) {
  const phone = normalizePhone(req.body?.phone);
  const email = normalizeEmail(req.body?.email);
  const name = String(req.body?.name || '').trim();

  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  const otp = createOtp(phone, { email, name });
  return res.json({
    success: true,
    phone,
    ...(process.env.NODE_ENV !== 'production' ? { otp } : {}),
  });
}

export async function verifyPhoneOtp(req: Request, res: Response) {
  const phone = normalizePhone(req.body?.phone);
  const otp = String(req.body?.otp || '').trim();
  const email = normalizeEmail(req.body?.email);
  const name = String(req.body?.name || '').trim();

  if (!phone || !otp) {
    return res.status(400).json({ error: 'Phone number and OTP are required' });
  }

  const verification = verifyOtp(phone, otp);
  if (!verification.ok) {
    return res.status(400).json({ error: verification.reason });
  }

  try {
    const { player, existed } = await resolveOrCreatePlayer({
      phone,
      email: email || verification.metadata?.email,
      name: name || verification.metadata?.name,
    });

    return res.status(existed ? 200 : 201).json({
      existed,
      ...buildPlayerAuthResponse(player),
    });
  } catch (error) {
    const statusCode = (error as any)?.statusCode || 500;
    return res.status(statusCode).json({
      error: error instanceof Error ? error.message : 'Failed to verify phone OTP',
    });
  }
}

export async function linkEmail(req: Request, res: Response) {
  const playerId = req.authUser?.uid;
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || '');

  if (!playerId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!email || password.length < 6) {
    return res.status(400).json({ error: 'Email and a password of at least 6 characters are required' });
  }

  const currentPlayer = await PlayerModel.findById(playerId);
  if (!currentPlayer) {
    return res.status(404).json({ error: 'Player not found' });
  }

  const existing = await findPlayerByIdentifiers({ email });
  if (existing && String(existing._id) !== String(currentPlayer._id)) {
    return res.status(409).json({ error: 'Email already linked to another account' });
  }

  currentPlayer.email = email;
  currentPlayer.password = hashPassword(password);
  await currentPlayer.save();

  return res.json(buildPlayerAuthResponse(currentPlayer));
}

export async function requestLinkPhoneOtp(req: Request, res: Response) {
  const playerId = req.authUser?.uid;
  const phone = normalizePhone(req.body?.phone);

  if (!playerId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  const otp = createOtp(phone, { playerId, action: 'link-phone' });
  return res.json({
    success: true,
    phone,
    ...(process.env.NODE_ENV !== 'production' ? { otp } : {}),
  });
}

export async function verifyLinkPhoneOtp(req: Request, res: Response) {
  const playerId = req.authUser?.uid;
  const phone = normalizePhone(req.body?.phone);
  const otp = String(req.body?.otp || '').trim();

  if (!playerId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!phone || !otp) {
    return res.status(400).json({ error: 'Phone number and OTP are required' });
  }

  const verification = verifyOtp(phone, otp);
  if (!verification.ok) {
    return res.status(400).json({ error: verification.reason });
  }

  const currentPlayer = await PlayerModel.findById(playerId);
  if (!currentPlayer) {
    return res.status(404).json({ error: 'Player not found' });
  }

  const existing = await findPlayerByIdentifiers({ phone });
  if (existing && String(existing._id) !== String(currentPlayer._id)) {
    return res.status(409).json({ error: 'Phone already linked to another account' });
  }

  currentPlayer.phone = phone;
  await currentPlayer.save();

  return res.json(buildPlayerAuthResponse(currentPlayer));
}
