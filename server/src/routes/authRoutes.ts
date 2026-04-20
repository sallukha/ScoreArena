import { Router } from 'express';
import {
  emailLogin,
  emailSignup,
  firebaseLogin,
  getUser,
  googleLogin,
  linkEmail,
  requestLinkPhoneOtp,
  requestPhoneOtp,
  verifyLinkPhoneOtp,
  verifyPhoneOtp,
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

export const authRoutes = Router();

authRoutes.get('/users/:uid', requireAuth, getUser);
authRoutes.post('/google', googleLogin);
authRoutes.post('/firebase', firebaseLogin);
authRoutes.post('/email/signup', emailSignup);
authRoutes.post('/email/login', emailLogin);
authRoutes.post('/phone/request-otp', requestPhoneOtp);
authRoutes.post('/phone/verify-otp', verifyPhoneOtp);
authRoutes.post('/link/email', requireAuth, linkEmail);
authRoutes.post('/link/phone/request-otp', requireAuth, requestLinkPhoneOtp);
authRoutes.post('/link/phone/verify-otp', requireAuth, verifyLinkPhoneOtp);
