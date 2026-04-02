import { Router } from 'express';
import { getUser, googleLogin, sendPhoneOtp, verifyPhoneOtp } from '../controllers/authController';
import { requireAuth } from '../middleware/auth';

export const authRoutes = Router();

authRoutes.get('/users/:uid', requireAuth, getUser);
authRoutes.post('/google', googleLogin);
authRoutes.post('/phone/send-otp', sendPhoneOtp);
authRoutes.post('/phone/verify-otp', verifyPhoneOtp);
