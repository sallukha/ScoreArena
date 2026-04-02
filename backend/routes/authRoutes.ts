import { Router } from 'express';
import { firebaseLogin, getUser, googleLogin } from '../controllers/authController';
import { requireAuth } from '../middleware/auth';

export const authRoutes = Router();

authRoutes.get('/users/:uid', requireAuth, getUser);
authRoutes.post('/google', googleLogin);
authRoutes.post('/firebase', firebaseLogin);
