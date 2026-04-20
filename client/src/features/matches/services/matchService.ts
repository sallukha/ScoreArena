import {
  db,
  doc,
  getDoc,
  query,
  collection,
  where,
  limit,
  onSnapshot,
  addDoc,
  serverTimestamp,
  updateDoc,
  deleteDoc,
} from "../../../firebase";
import { apiFetch } from "../../../api/http";

type SnapshotData = { id: string; [key: string]: any };

function mapSnapshotDocs(snapshot: any): SnapshotData[] {
  return snapshot.docs.map((item: any) => ({ id: item.id, ...item.data() }));
}

export async function fetchTeamById(teamId: string) {
  const teamDoc = await getDoc(doc(db, "teams", teamId));
  if (!teamDoc.exists()) return null;
  return teamDoc.data();
}

export async function fetchTeamPair(teamA?: string, teamB?: string) {
  if (!teamA || !teamB) return { teamAData: null, teamBData: null };

  const [teamAData, teamBData] = await Promise.all([
    fetchTeamById(teamA),
    fetchTeamById(teamB),
  ]);

  return { teamAData, teamBData };
}

export function subscribeGlobalLiveMatches(
  onData: (matches: SnapshotData[]) => void,
  onError?: (error: unknown) => void,
  limitCount = 10,
) {
  const q = query(
    collection(db, "matches"),
    where("status", "==", "live"),
    limit(limitCount),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      onData(mapSnapshotDocs(snapshot));
    },
    onError,
  );
}

export function subscribeUserCreatedLiveMatches(
  userId: string,
  onData: (matches: SnapshotData[]) => void,
  onError?: (error: unknown) => void,
) {
  const q = query(
    collection(db, "matches"),
    where("status", "==", "live"),
    where("createdBy", "==", userId),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      onData(mapSnapshotDocs(snapshot));
    },
    onError,
  );
}

export function subscribeUserCreatedCompletedMatches(
  userId: string,
  onData: (matches: SnapshotData[]) => void,
  onError?: (error: unknown) => void,
) {
  const q = query(
    collection(db, "matches"),
    where("status", "==", "completed"),
    where("createdBy", "==", userId),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      onData(mapSnapshotDocs(snapshot));
    },
    onError,
  );
}

export function subscribeMatchesByStatuses(
  statuses: string[],
  onData: (matches: SnapshotData[]) => void,
  onError?: (error: unknown) => void,
) {
  const q = query(collection(db, "matches"), where("status", "in", statuses));

  return onSnapshot(
    q,
    (snapshot) => {
      onData(mapSnapshotDocs(snapshot));
    },
    onError,
  );
}

export async function createMatch(payload: {
  teamA: string;
  teamB: string;
  tournamentId?: string;
  status: "live" | "completed" | "upcoming";
  overs: number;
  scoreA: Record<string, any>;
  scoreB: Record<string, any>;
  currentInnings: number;
  playerStats: Record<string, any>;
  createdBy: string;
  createdAt?: any;
}) {
  const docRef = await addDoc(collection(db, "matches"), {
    ...payload,
    createdAt: payload.createdAt ?? serverTimestamp(),
  });
  return docRef.id;
}

export async function updateMatch(
  matchId: string,
  payload: Record<string, any>,
) {
  await updateDoc(doc(db, "matches", matchId), payload);
}

export async function deleteMatch(matchId: string) {
  await apiFetch(`/manage/match/${encodeURIComponent(matchId)}`, {
    method: "DELETE",
  });
}

export async function createMatchBall(
  matchId: string,
  payload: Record<string, any>,
) {
  const docRef = await addDoc(
    collection(db, "matches", matchId, "balls"),
    payload,
  );
  return docRef.id;
}

export async function deleteMatchBall(matchId: string, ballId: string) {
  await deleteDoc(doc(db, "matches", matchId, "balls", ballId));
}
