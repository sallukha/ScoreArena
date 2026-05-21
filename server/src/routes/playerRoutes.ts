import { Router } from 'express';
import { getPlayerHistory, rebuildPlayerStats, resolvePlayer, searchPlayers } from '../controllers/playerController.js';
import { requireAuth } from '../middleware/auth.js';

export const playerRoutes = Router();

playerRoutes.use(requireAuth);
playerRoutes.post('/resolve', resolvePlayer);
playerRoutes.get('/search', searchPlayers);
playerRoutes.get('/history', getPlayerHistory);
playerRoutes.post('/rebuild-stats', rebuildPlayerStats);
