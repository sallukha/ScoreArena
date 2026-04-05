import { Router } from 'express';
import { getCricketNews } from '../controllers/newsController';

export const newsRoutes = Router();

newsRoutes.get('/cricket', getCricketNews);
