import { collection, db, getDocs, limit, query, where } from '../firebase';
import { Player } from '../types';

type PlayerIdentity = {
  uid?: string;
  email?: string;
  phoneNumber?: string;
};

const PLAYER_QUERY_LIMIT = 25;
const PLAYER_SUGGESTION_SCAN_LIMIT = 120;

export function normalizeEmail(value?: string | null) {
  return (value || '').trim().toLowerCase();
}

export function normalizePhone(value?: string | null) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length > 10) return digits.slice(-10);
  return digits;
}

export function buildPhoneCandidates(value: string) {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, '');
  const normalizedPhone = normalizePhone(value);
  const candidates = new Set<string>();

  if (trimmed) candidates.add(trimmed);
  if (digits) candidates.add(digits);
  if (normalizedPhone) candidates.add(normalizedPhone);
  if (digits.length === 10) {
    candidates.add(`+91${digits}`);
    candidates.add(`91${digits}`);
    candidates.add(`+${digits}`);
  }
  if (digits.length > 10) {
    candidates.add(digits.slice(-10));
    candidates.add(`+${digits}`);
  }

  return Array.from(candidates).slice(0, 10);
}

function uniquePlayers(players: Player[]) {
  const seen = new Set<string>();
  return players.filter((player) => {
    if (seen.has(player.id)) return false;
    seen.add(player.id);
    return true;
  });
}

function sortPlayersByProfileStrength(players: Player[]) {
  const toTime = (value: unknown) => {
    const time = new Date(value as any).getTime();
    return Number.isFinite(time) ? time : 0;
  };

  return players
    .slice()
    .sort((a, b) => {
      const bMatches = Number(b.stats?.matches || 0);
      const aMatches = Number(a.stats?.matches || 0);
      if (bMatches !== aMatches) return bMatches - aMatches;
      return toTime((b as any).createdAt) - toTime((a as any).createdAt);
    });
}

function scorePlayerIdentityMatch(player: Player, identity: PlayerIdentity) {
  let score = 0;
  const identityEmail = normalizeEmail(identity.email);
  const identityPhone = normalizePhone(identity.phoneNumber);
  const playerEmail = normalizeEmail(player.email);
  const playerPhone = normalizePhone(player.phoneNumber);

  if (identity.uid && player.createdBy === identity.uid) score += 100;
  if (identityEmail && playerEmail && identityEmail === playerEmail) score += 40;
  if (identityPhone && playerPhone && identityPhone === playerPhone) score += 40;
  if (identityEmail && identityPhone && identityEmail === playerEmail && identityPhone === playerPhone) score += 20;
  score += Number(player.stats?.matches || 0) * 0.01;

  return score;
}

export async function findPlayersByPhone(phoneNumber: string) {
  const candidates = buildPhoneCandidates(phoneNumber);
  if (candidates.length === 0) return [];

  const snapshot = await getDocs(
    query(collection(db, 'players'), where('phoneNumber', 'in', candidates), limit(PLAYER_QUERY_LIMIT))
  );

  return sortPlayersByProfileStrength(
    uniquePlayers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Player)))
  );
}

export async function findPlayersByEmail(email: string) {
  const normalized = normalizeEmail(email);
  if (!normalized) return [];

  const candidates = Array.from(new Set([email.trim(), normalized])).filter(Boolean);
  const snapshot = await getDocs(
    query(collection(db, 'players'), where('email', 'in', candidates), limit(PLAYER_QUERY_LIMIT))
  );

  return sortPlayersByProfileStrength(
    uniquePlayers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Player)))
  );
}

export async function findPlayersByContact(contact: string) {
  const value = contact.trim();
  if (!value) return [];
  if (value.includes('@')) {
    return findPlayersByEmail(value);
  }
  return findPlayersByPhone(value);
}

export async function searchPlayersByContact(contact: string, maxResults = 8) {
  const value = contact.trim();
  if (!value) return [];

  const isEmailSearch = value.includes('@');
  const normalizedEmail = normalizeEmail(value);
  const normalizedPhone = normalizePhone(value);

  if (isEmailSearch && normalizedEmail.length < 3) return [];
  if (!isEmailSearch && normalizedPhone.length < 3) return [];

  const snap = await getDocs(query(collection(db, 'players'), limit(PLAYER_SUGGESTION_SCAN_LIMIT)));
  const players = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Player));

  const filtered = players.filter((player) => {
    if (isEmailSearch) {
      const playerEmail = normalizeEmail(player.email);
      return Boolean(playerEmail) && playerEmail.includes(normalizedEmail);
    }

    const playerPhone = normalizePhone(player.phoneNumber);
    return Boolean(playerPhone) && playerPhone.includes(normalizedPhone);
  });

  return sortPlayersByProfileStrength(uniquePlayers(filtered)).slice(0, maxResults);
}

export async function findPlayersByIdentity(identity: PlayerIdentity) {
  const lookups: Array<Promise<Player[]>> = [];

  if (identity.uid) {
    lookups.push(
      getDocs(
        query(collection(db, 'players'), where('createdBy', '==', identity.uid), limit(PLAYER_QUERY_LIMIT))
      ).then((snap) => snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Player))
      )
    );
  }

  if (identity.email) {
    lookups.push(findPlayersByEmail(identity.email));
  }

  if (identity.phoneNumber) {
    lookups.push(findPlayersByPhone(identity.phoneNumber));
  }

  if (lookups.length === 0) return [];
  const results = await Promise.all(lookups);
  return sortPlayersByProfileStrength(uniquePlayers(results.flat()));
}

export async function findPrimaryPlayerByIdentity(identity: PlayerIdentity) {
  const players = await findPlayersByIdentity(identity);
  if (players.length === 0) return null;

  return players
    .slice()
    .sort((a, b) => scorePlayerIdentityMatch(b, identity) - scorePlayerIdentityMatch(a, identity))[0];
}
