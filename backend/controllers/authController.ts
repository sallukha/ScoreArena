import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';
import { UserModel } from '../models/User';
import { createAccessToken } from '../utils/jwt';

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

  const payload = await response.json().catch(() => ({}));
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
    }),
  };
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
      displayName: displayName || safeEmail || 'Score Wala User',
      email: safeEmail,
      photoURL: photoURL || '',
      googleId: safeGoogleId,
      authProvider: 'google',
      role: 'user',
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );

  return res.json({
    ...buildAuthResponse(user),
    isNewUser: !user?.createdAt || !user?.updatedAt,
  });
}

export async function firebaseLogin(req: Request, res: Response) {
  const idToken = String(req.body?.idToken || '').trim();
  if (!idToken) {
    return res.status(400).json({ error: 'Firebase ID token is required' });
  }

  let firebaseUser: any;
  try {
    firebaseUser = await lookupFirebaseUser(idToken);
  } catch (error) {
    return res.status(401).json({
      error: error instanceof Error ? error.message : 'Failed to verify Firebase token',
    });
  }

  const phoneNumber = normalizePhoneNumber(req.body?.phoneNumber || firebaseUser.phoneNumber || '');
  if (!phoneNumber) {
    return res.status(400).json({ error: 'Firebase phone number is missing' });
  }

  const uid = `phone_${phoneNumber.replace(/[^0-9]/g, '')}`;

  const user = await (UserModel as any).findByIdAndUpdate(
    uid,
    {
      _id: uid,
      uid,
      displayName:
        String(req.body?.displayName || firebaseUser.displayName || '').trim() || `User_${phoneNumber.slice(-4)}`,
      email: String(req.body?.email || firebaseUser.email || '').trim().toLowerCase(),
      phoneNumber,
      photoURL: String(req.body?.photoURL || firebaseUser.photoUrl || '').trim(),
      authProvider: 'phone',
      role: 'user',
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );

  return res.json(buildAuthResponse(user));
}
