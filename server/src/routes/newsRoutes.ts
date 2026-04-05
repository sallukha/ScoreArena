import { Router } from 'express';
import { getCricketNews } from '../controllers/newsController.js';

export const newsRoutes = Router();

newsRoutes.get('/cricket', getCricketNews);
