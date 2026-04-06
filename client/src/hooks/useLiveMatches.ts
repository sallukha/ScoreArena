import { useEffect, useState } from "react";
import {
  db,
  doc,
  getDoc,
  query,
  collection,
  where,
  onSnapshot,
  limit,
  handleFirestoreError,
  OperationType,
} from "../firebase";

export function useLiveMatches() {
  const [globalMatches, setGlobalMatches] = useState<any[]>([]);
  const [teams, setTeams] = useState<Record<string, any>>({});

  useEffect(() => {
    let isMounted = true;

    async function fetchTeamNames(m: any) {
      if (!m?.teamA || !m?.teamB) return;

      const [teamADoc, teamBDoc] = await Promise.all([
        getDoc(doc(db, "teams", m.teamA)),
        getDoc(doc(db, "teams", m.teamB)),
      ]);

      if (!isMounted) return;

      setTeams((prev) => {
        const next = { ...prev };
        if (teamADoc.exists() && !next[m.teamA])
          next[m.teamA] = teamADoc.data();
        if (teamBDoc.exists() && !next[m.teamB])
          next[m.teamB] = teamBDoc.data();
        return next;
      });
    }

    const qGlobal = query(
      collection(db, "matches"),
      where("status", "==", "live"),
      limit(10),
    );
    const unsubGlobal = onSnapshot(
      qGlobal,
      (snap) => {
        const matchData = snap.docs.map((matchDoc) => ({
          id: matchDoc.id,
          ...matchDoc.data(),
        }));
        setGlobalMatches(matchData);
        matchData.forEach((m) => {
          fetchTeamNames(m);
        });
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, "matches");
      },
    );

    return () => {
      isMounted = false;
      unsubGlobal();
    };
  }, []);

  return { globalMatches, teams };
}
