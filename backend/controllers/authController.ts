import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';
import twilio from 'twilio';
import { UserModel } from '../models/User';
import { createAccessToken } from '../utils/jwt';

const OTP_TTL_MS = 5 * 60 * 1000;
const otpSessions = new Map<string, { phoneNumber: string; otp: string; expiresAt: number }>();

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

async function sendOtpSms(phoneNumber: string, otp: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromPhoneNumber) {
    return false;
  }

  const client = twilio(accountSid, authToken);
  await client.messages.create({
    to: phoneNumber,
    from: fromPhoneNumber,
    body: `Your Score Wala OTP is ${otp}. It will expire in 5 minutes.`,
  });

  return true;
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

export async function sendPhoneOtp(req: Request, res: Response) {
  const phoneNumber = normalizePhoneNumber(req.body?.phoneNumber);
  if (!phoneNumber) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  if (phoneNumber.replace(/\D/g, '').length < 10) {
    return res.status(400).json({ error: 'Please enter a valid phone number' });
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const sessionId = randomUUID();
  otpSessions.set(sessionId, {
    phoneNumber,
    otp,
    expiresAt: Date.now() + OTP_TTL_MS,
  });

  const smsSent = await sendOtpSms(phoneNumber, otp).catch((error) => {
    console.error('OTP SMS sending failed:', error);
    return false;
  });

  return res.json({
    sessionId,
    success: true,
    smsSent,
    expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
    devOtp: process.env.NODE_ENV === 'production' ? undefined : otp,
  });
}

export async function verifyPhoneOtp(req: Request, res: Response) {
  const { sessionId, otp } = req.body || {};
  const session = otpSessions.get(String(sessionId || ''));

  if (!session) {
    return res.status(400).json({ error: 'OTP session expired' });
  }

  if (Date.now() > session.expiresAt) {
    otpSessions.delete(String(sessionId));
    return res.status(400).json({ error: 'OTP expired' });
  }

  if (String(otp || '') !== session.otp) {
    return res.status(400).json({ error: 'Invalid OTP' });
  }

  const phoneNumber = normalizePhoneNumber(session.phoneNumber);
  const uid = `phone_${phoneNumber.replace(/[^0-9]/g, '')}`;

  const user = await (UserModel as any).findByIdAndUpdate(
    uid,
    {
      _id: uid,
      uid,
      displayName: `User_${phoneNumber.slice(-4)}`,
      email: '',
      phoneNumber,
      photoURL: '',
      authProvider: 'phone',
      role: 'user',
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );

  otpSessions.delete(String(sessionId));
  return res.json(buildAuthResponse(user));
}
