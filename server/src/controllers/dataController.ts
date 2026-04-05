import type { Request, Response } from 'express';
import {
  createDocumentByPath,
  deleteDocumentByPath,
  getDocumentByPath,
  queryDocumentsByPath,
  setDocumentByPath,
  updateDocumentByPath,
} from '../services/dataService.js';
import type { SocketHub } from '../realtime/socketHub.js';

let socketHub: SocketHub | null = null;

export function registerSocketHub(hub: SocketHub) {
  socketHub = hub;
}

export async function queryDocuments(req: Request, res: Response) {
  const { path, constraints = [] } = req.body || {};
  const docs = await queryDocumentsByPath(String(path || ''), constraints);
  return res.json({ docs });
}

export async function getDocument(req: Request, res: Response) {
  const path = String(req.query.path || '');
  const doc = await getDocumentByPath(path);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  return res.json({ doc });
}

export async function createDocument(req: Request, res: Response) {
  const { path, data } = req.body || {};
  const doc = await createDocumentByPath(String(path || ''), data);
  await socketHub?.publishDocumentChange(`${String(path || '')}/${doc.id}`);
  return res.status(201).json({ doc });
}

export async function setDocument(req: Request, res: Response) {
  const { path, data } = req.body || {};
  const doc = await setDocumentByPath(String(path || ''), data);
  await socketHub?.publishDocumentChange(String(path || ''));
  return res.json({ doc });
}

export async function updateDocument(req: Request, res: Response) {
  const { path, data } = req.body || {};
  try {
    const doc = await updateDocumentByPath(String(path || ''), data);
    await socketHub?.publishDocumentChange(String(path || ''));
    return res.json({ doc });
  } catch (error) {
    if (error instanceof Error && error.message === 'Document not found') {
      return res.status(404).json({ error: error.message });
    }
    throw error;
  }
}

export async function deleteDocument(req: Request, res: Response) {
  const path = String(req.body?.path || '');
  await deleteDocumentByPath(path);
  await socketHub?.publishDocumentChange(path);
  return res.json({ success: true });
}
