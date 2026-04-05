import { Router } from 'express';
import {
  createDocument,
  deleteDocument,
  getDocument,
  queryDocuments,
  setDocument,
  updateDocument,
} from '../controllers/dataController';
import { requireAuth } from '../middleware/auth';

export const dataRoutes = Router();

dataRoutes.use(requireAuth);
dataRoutes.get('/document', getDocument);
dataRoutes.post('/query', queryDocuments);
dataRoutes.post('/collection', createDocument);
dataRoutes.put('/document', setDocument);
dataRoutes.patch('/document', updateDocument);
dataRoutes.delete('/document', deleteDocument);
