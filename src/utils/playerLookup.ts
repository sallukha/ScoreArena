import { collection, db, getDocs, limit, query, where } from '../firebase';
import { Player } from '../types';

export function buildPhoneCandidates(value: string) {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, '');
  const candidates = new Set<string>();

  if (trimmed) candidates.add(trimmed);
  if (digits) candidates.add(digits);
  if (digits.length === 10) {
    candidates.add(`+91${digits}`);
    candidates.add(`91${digits}`);
  }
  if (digits.length > 10) {
    candidates.add(digits.slice(-10));
    candidates.add(`+${digits}`);
  }

  return Array.from(candidates).slice(0, 10);
}

export async function findPlayersByPhone(phoneNumber: string) {
  const candidates = buildPhoneCandidates(phoneNumber);
  if (candidates.length === 0) return [];

  const snapshot = await getDocs(
    query(collection(db, 'players'), where('phoneNumber', 'in', candidates), limit(10))
  );

  const seen = new Set<string>();
  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() } as Player))
    .filter((player) => {
      if (seen.has(player.id)) return false;
      seen.add(player.id);
      return true;
    });
}
