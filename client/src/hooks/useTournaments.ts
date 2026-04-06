import { useEffect, useState } from "react";
import {
  db,
  query,
  collection,
  orderBy,
  onSnapshot,
  limit,
  handleFirestoreError,
  OperationType,
} from "../firebase";
import { Tournament } from "../types";

export function useTournaments(tournamentLimit?: number) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    const constraints = [orderBy("createdAt", "desc")];
    if (typeof tournamentLimit === "number") {
      constraints.push(limit(tournamentLimit) as any);
    }

    const q = query(collection(db, "tournaments"), ...(constraints as any));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setTournaments(
          snap.docs.map(
            (tournamentDoc) =>
              ({ id: tournamentDoc.id, ...tournamentDoc.data() }) as Tournament,
          ),
        );
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, "tournaments");
        setLoading(false);
      },
    );

    return () => {
      unsub();
    };
  }, [tournamentLimit]);

  return { tournaments, loading };
}
