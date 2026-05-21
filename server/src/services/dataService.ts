import { getPathMeta } from '../utils/pathResolver.js';
import { applyPatchedUpdate, normalizePayload } from '../utils/updateOperators.js';
import { finalizeMatchStats, rebuildAllPlayerStats } from '../utils/matchStats.js';
import PlayerModel from '../models/Player.js';

export type QueryConstraint =
  | { type: 'where'; field: string; op: string; value: any }
  | { type: 'orderBy'; field: string; direction: 'asc' | 'desc' }
  | { type: 'limit'; count: number };

export function serializeDoc(doc: any) {
  if (!doc) return null;
  const value = doc.toObject ? doc.toObject() : doc;
  const id = String(value._id ?? value.id);
  const withoutId = { ...value };
  delete withoutId._id;
  return { id, ...withoutId };
}

function isObjectId(value: any) {
  return /^[a-f\d]{24}$/i.test(String(value || ''));
}

function sanitizePlayerPayload(payload: Record<string, any>) {
  if ('email' in payload && !payload.email) payload.email = undefined;
  if ('phone' in payload && !payload.phone) payload.phone = undefined;
  if ('phoneNumber' in payload && !payload.phoneNumber) payload.phoneNumber = undefined;
  return payload;
}

function sanitizeTeamPayload(payload: Record<string, any>) {
  payload.name = String(payload.name || '').trim();
  payload.players = Array.from(
    new Set((Array.isArray(payload.players) ? payload.players : []).map(String).filter(isObjectId))
  );
  payload.captainId = payload.captainId && isObjectId(payload.captainId) ? payload.captainId : null;
  payload.createdBy = String(payload.createdBy || '').trim();
  payload.logo = payload.logo || '';
  return payload;
}

function sanitizePayloadForModel(modelKey: string, payload: Record<string, any>) {
  if (modelKey === 'players') return sanitizePlayerPayload(payload);
  if (modelKey === 'teams') return sanitizeTeamPayload(payload);
  return payload;
}

async function syncTeamPlayerLinks(teamId: string, players: any[] = []) {
  if (!isObjectId(teamId)) return;

  const playerIds = Array.from(new Set((players || []).map(String).filter(isObjectId)));
  await PlayerModel.updateMany({ teams: teamId }, { $pull: { teams: teamId } });

  if (playerIds.length > 0) {
    await PlayerModel.updateMany(
      { _id: { $in: playerIds } },
      { $addToSet: { teams: teamId } }
    );
  }
}

export function buildQuery(path: string, constraints: QueryConstraint[] = []) {
  const meta = getPathMeta(path);
  const filter: Record<string, any> = { ...meta.baseFilter };
  let sort: Record<string, 1 | -1> = {};
  let limitValue = 0;

  for (const constraint of constraints) {
    if (!constraint) continue;

    if (constraint.type === 'where') {
      const field = constraint.field === '__name__' ? '_id' : constraint.field;
      if (constraint.op === '==') filter[field] = constraint.value;
      if (constraint.op === 'in') filter[field] = { $in: constraint.value };
      if (constraint.op === 'array-contains') filter[field] = constraint.value;
    }

    if (constraint.type === 'orderBy') {
      sort = { ...sort, [constraint.field]: constraint.direction === 'desc' ? -1 : 1 };
    }

    if (constraint.type === 'limit') {
      limitValue = Number(constraint.count || 0);
    }
  }

  return { meta, filter, sort, limitValue };
}

export async function queryDocumentsByPath(path: string, constraints: QueryConstraint[] = []) {
  const { meta, filter, sort, limitValue } = buildQuery(String(path || ''), constraints);
  const model = meta.model as any;

  let finder = model.find(filter);
  if (Object.keys(sort).length > 0) finder = finder.sort(sort);
  if (limitValue > 0) finder = finder.limit(limitValue);

  const docs = await finder.lean();
  return docs.map(serializeDoc);
}

export async function getDocumentByPath(path: string) {
  const meta = getPathMeta(path);
  const model = meta.model as any;

  if (!meta.isDocument || !meta.docId) {
    throw new Error('Document path expected');
  }

  const filter =
    meta.modelKey === 'balls'
      ? { _id: meta.docId, matchId: meta.matchId }
      : { _id: meta.docId };

  const doc = await model.findOne(filter).lean();
  return serializeDoc(doc);
}

export async function createDocumentByPath(path: string, data: any) {
  const meta = getPathMeta(String(path || ''));
  const model = meta.model as any;

  if (!meta.isCollection) {
    throw new Error('Collection path expected');
  }

  const payload = sanitizePayloadForModel(meta.modelKey, normalizePayload(data || {}));
  if (meta.modelKey === 'balls') {
    payload.matchId = meta.matchId;
  }

  const doc = await model.create(payload);
  if (meta.modelKey === 'matches' && doc.status === 'completed') {
    await finalizeMatchStats(doc);
  }
  if (meta.modelKey === 'teams') {
    await syncTeamPlayerLinks(String(doc._id), doc.players || []);
  }
  return serializeDoc(doc);
}

export async function setDocumentByPath(path: string, data: any) {
  const meta = getPathMeta(String(path || ''));
  const model = meta.model as any;

  if (!meta.isDocument || !meta.docId) {
    throw new Error('Document path expected');
  }

  const payload = sanitizePayloadForModel(meta.modelKey, normalizePayload(data || {}));
  const basePayload =
    meta.modelKey === 'balls'
      ? { ...payload, _id: meta.docId, matchId: meta.matchId }
      : meta.modelKey === 'users'
        ? { ...payload, _id: meta.docId, uid: payload.uid || meta.docId }
        : { ...payload, _id: meta.docId };

  const doc = await model.findOneAndUpdate(
    meta.modelKey === 'balls'
      ? { _id: meta.docId, matchId: meta.matchId }
      : { _id: meta.docId },
    basePayload,
    { upsert: true, returnDocument: 'after', overwrite: true, setDefaultsOnInsert: true }
  );

  return serializeDoc(doc);
}

export async function updateDocumentByPath(path: string, data: any) {
  const meta = getPathMeta(String(path || ''));
  const model = meta.model as any;

  if (!meta.isDocument || !meta.docId) {
    throw new Error('Document path expected');
  }

  const existing = await model.findOne(
    meta.modelKey === 'balls'
      ? { _id: meta.docId, matchId: meta.matchId }
      : { _id: meta.docId }
  );

  if (!existing) {
    throw new Error('Document not found');
  }

  const updated = sanitizePayloadForModel(meta.modelKey, applyPatchedUpdate(existing.toObject(), data || {}));
  await model.replaceOne(
    meta.modelKey === 'balls'
      ? { _id: meta.docId, matchId: meta.matchId }
      : { _id: meta.docId },
    updated,
    { upsert: false }
  );

  const fresh = await model.findOne(
    meta.modelKey === 'balls'
      ? { _id: meta.docId, matchId: meta.matchId }
      : { _id: meta.docId }
  );

  if (meta.modelKey === 'matches' && fresh) {
    const wasFinalized = Boolean((existing as any).statsFinalized);
    const isNowCompleted = fresh.status === 'completed';
    const isNowUnfinalized = fresh.statsFinalized === false || fresh.status !== 'completed';

    if (wasFinalized && isNowUnfinalized) {
      await rebuildAllPlayerStats();
    } else if (isNowCompleted) {
      await finalizeMatchStats(fresh);
    }
  }

  if (meta.modelKey === 'teams' && fresh) {
    await syncTeamPlayerLinks(String(fresh._id), fresh.players || []);
  }

  return serializeDoc(fresh);
}

export async function deleteDocumentByPath(path: string) {
  const meta = getPathMeta(path);
  const model = meta.model as any;

  if (!meta.isDocument || !meta.docId) {
    throw new Error('Document path expected');
  }

  await model.deleteOne(
    meta.modelKey === 'balls'
      ? { _id: meta.docId, matchId: meta.matchId }
      : { _id: meta.docId }
  );
}
