import {
  db,
  query,
  collection,
  where,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
} from "../../../firebase";

export function subscribeTeamsByPlayer(
  playerId: string,
  onData: (teams: Array<{ id: string; [key: string]: any }>) => void,
  onError?: (error: unknown) => void,
) {
  const q = query(
    collection(db, "teams"),
    where("players", "array-contains", playerId),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      onData(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    },
    onError,
  );
}

export async function createTeam(payload: {
  name: string;
  players: string[];
  captainId?: string | null;
  createdBy: string;
  scope?: "general" | "tournament";
  tournamentId?: string;
}) {
  const docRef = await addDoc(collection(db, "teams"), {
    ...payload,
    captainId: payload.captainId || null,
    players: Array.from(new Set((payload.players || []).filter(Boolean))),
  });
  return docRef.id;
}

export async function updateTeam(teamId: string, payload: Record<string, any>) {
  await updateDoc(doc(db, "teams", teamId), payload);
}

export async function deleteTeam(teamId: string) {
  await deleteDoc(doc(db, "teams", teamId));
}
