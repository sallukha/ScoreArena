import { Router } from 'express';
import { deleteMatch, deletePlayer } from '../controllers/manageController.js';
import { requireAuth } from '../middleware/auth.js';

export const manageRoutes = Router();

manageRoutes.use(requireAuth);
manageRoutes.delete('/match/:id', deleteMatch);
manageRoutes.delete('/player/:id', deletePlayer);
