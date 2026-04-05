import { Router } from 'express';
import {
  createDocument,
  deleteDocument,
  getDocument,
  queryDocuments,
  setDocument,
  updateDocument,
} from '../controllers/dataController.js';
import { requireAuth } from '../middleware/auth.js';

export const dataRoutes = Router();

dataRoutes.use(requireAuth);
dataRoutes.get('/document', getDocument);
dataRoutes.post('/query', queryDocuments);
dataRoutes.post('/collection', createDocument);
dataRoutes.put('/document', setDocument);
dataRoutes.patch('/document', updateDocument);
dataRoutes.delete('/document', deleteDocument);
