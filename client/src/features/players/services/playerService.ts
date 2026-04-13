import {
  db,
  query,
  collection,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
  limit,
} from "../../../firebase";
import { buildPhoneCandidates, normalizeEmail, normalizePhone } from "../../../utils/playerLookup";

type UserIdentity = {
  uid?: string;
  phoneNumber?: string;
  email?: string;
};

export function subscribePrimaryPlayerByIdentity(
  identity: UserIdentity,
  onData: (player: { id: string; [key: string]: any } | null) => void,
  onError?: (error: unknown) => void,
) {
  const identityEmail = normalizeEmail(identity.email);
  const identityPhone = normalizePhone(identity.phoneNumber);
  const unsubscribers: Array<() => void> = [];
  const bucket = {
    byUid: [] as Array<{ id: string; [key: string]: any }>,
    byPhone: [] as Array<{ id: string; [key: string]: any }>,
    byEmail: [] as Array<{ id: string; [key: string]: any }>,
  };

  const scorePlayer = (player: { id: string; [key: string]: any }) => {
    let score = 0;
    const playerEmail = normalizeEmail(player.email);
    const playerPhone = normalizePhone(player.phoneNumber);
    if (identity.uid && player.createdBy === identity.uid) score += 100;
    if (identityEmail && playerEmail && identityEmail === playerEmail) score += 40;
    if (identityPhone && playerPhone && identityPhone === playerPhone) score += 40;
    if (identityEmail && identityPhone && identityEmail === playerEmail && identityPhone === playerPhone) score += 20;
    score += Number(player.stats?.matches || 0) * 0.01;
    return score;
  };

  const emitPrimary = () => {
    const merged = [...bucket.byUid, ...bucket.byPhone, ...bucket.byEmail];
    const deduped = merged.filter(
      (player, idx, arr) => arr.findIndex((item) => item.id === player.id) === idx,
    );

    if (deduped.length === 0) {
      onData(null);
      return;
    }

    const primary = deduped.slice().sort((a, b) => scorePlayer(b) - scorePlayer(a))[0];
    onData(primary);
  };

  if (identity.uid) {
    unsubscribers.push(
      onSnapshot(
        query(collection(db, "players"), where("createdBy", "==", identity.uid), limit(10)),
        (snapshot) => {
          bucket.byUid = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
          emitPrimary();
        },
        onError,
      ),
    );
  }

  if (identity.phoneNumber) {
    const phoneCandidates = buildPhoneCandidates(identity.phoneNumber);
    if (phoneCandidates.length > 0) {
      unsubscribers.push(
        onSnapshot(
          query(collection(db, "players"), where("phoneNumber", "in", phoneCandidates), limit(10)),
          (snapshot) => {
            bucket.byPhone = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
            emitPrimary();
          },
          onError,
        ),
      );
    }
  }

  if (identityEmail) {
    const emailCandidates = Array.from(new Set([identity.email?.trim() || "", identityEmail])).filter(Boolean);
    unsubscribers.push(
      onSnapshot(
        query(collection(db, "players"), where("email", "in", emailCandidates), limit(10)),
        (snapshot) => {
          bucket.byEmail = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
          emitPrimary();
        },
        onError,
      ),
    );
  }

  if (unsubscribers.length === 0) {
    onData(null);
    return () => undefined;
  }

  return () => {
    unsubscribers.forEach((unsubscribe) => unsubscribe());
  };
}

export async function createPlayer(payload: {
  name: string;
  email?: string | null;
  phoneNumber?: string | null;
  role: string;
  battingStyle?: string;
  bowlingStyle?: string;
  createdBy: string;
  scope?: "general" | "tournament";
  tournamentId?: string;
  stats?: Record<string, any>;
  createdAt?: any;
}) {
  const docRef = await addDoc(collection(db, "players"), {
    ...payload,
    createdAt: payload.createdAt ?? serverTimestamp(),
  });
  return docRef.id;
}

export async function updatePlayer(
  playerId: string,
  payload: Record<string, any>,
) {
  await updateDoc(doc(db, "players", playerId), payload);
}

export async function deletePlayer(playerId: string) {
  await deleteDoc(doc(db, "players", playerId));
}
