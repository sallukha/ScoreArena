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
} from "../../../firebase";

type UserIdentity = {
  phoneNumber?: string;
  email?: string;
};

export function subscribePrimaryPlayerByIdentity(
  identity: UserIdentity,
  onData: (player: { id: string; [key: string]: any } | null) => void,
  onError?: (error: unknown) => void,
) {
  const q = query(
    collection(db, "players"),
    identity.phoneNumber
      ? where("phoneNumber", "==", identity.phoneNumber)
      : where("email", "==", identity.email),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        onData(null);
        return;
      }

      const first = snapshot.docs[0];
      onData({ id: first.id, ...first.data() });
    },
    onError,
  );
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
