import {
  db,
  query,
  collection,
  orderBy,
  onSnapshot,
  limit,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
} from "../../../firebase";
import { Tournament } from "../../../types";

export function subscribeTournaments(
  onData: (tournaments: Tournament[]) => void,
  onError?: (error: unknown) => void,
  tournamentLimit?: number,
) {
  const constraints = [orderBy("createdAt", "desc")];
  if (typeof tournamentLimit === "number") {
    constraints.push(limit(tournamentLimit) as any);
  }

  const q = query(collection(db, "tournaments"), ...(constraints as any));

  return onSnapshot(
    q,
    (snapshot) => {
      onData(
        snapshot.docs.map(
          (tournamentDoc) =>
            ({ id: tournamentDoc.id, ...tournamentDoc.data() }) as Tournament,
        ),
      );
    },
    onError,
  );
}

export async function createTournament(payload: {
  name: string;
  city: string;
  startDate: string;
  endDate: string;
  organizer: string;
  status: "upcoming" | "live" | "completed";
  format: string;
  overs: number;
  description: string;
  teams: string[];
  teamCount: number;
  playerCount: number;
  createdBy: string;
  createdAt?: any;
}) {
  const docRef = await addDoc(collection(db, "tournaments"), {
    ...payload,
    createdAt: payload.createdAt ?? serverTimestamp(),
  });
  return docRef.id;
}

export async function updateTournament(
  tournamentId: string,
  payload: Record<string, any>,
) {
  await updateDoc(doc(db, "tournaments", tournamentId), payload);
}

export async function deleteTournament(tournamentId: string) {
  await deleteDoc(doc(db, "tournaments", tournamentId));
}
