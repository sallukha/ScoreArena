import { Router } from 'express';
import { addPlayerToTeam, createTeam } from '../controllers/teamController.js';
import { requireAuth } from '../middleware/auth.js';

export const teamRoutes = Router();

teamRoutes.use(requireAuth);
teamRoutes.post('/', createTeam);
teamRoutes.post('/:teamId/players', addPlayerToTeam);
