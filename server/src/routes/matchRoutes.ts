import { Router } from 'express';
import { createMatch, finalizeMatch } from '../controllers/matchController.js';
import { requireAuth } from '../middleware/auth.js';

export const matchRoutes = Router();

matchRoutes.use(requireAuth);
matchRoutes.post('/', createMatch);
matchRoutes.post('/:matchId/finalize', finalizeMatch);
