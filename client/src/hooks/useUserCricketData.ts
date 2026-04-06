import { useEffect, useState } from "react";
import {
  db,
  doc,
  getDoc,
  query,
  collection,
  where,
  onSnapshot,
  handleFirestoreError,
  OperationType,
} from "../firebase";
import { UserProfile } from "../types";

export function useUserCricketData(user: UserProfile | null) {
  const [matches, setMatches] = useState<any[]>([]);
  const [recentMatches, setRecentMatches] = useState<any[]>([]);
  const [userTeamIds, setUserTeamIds] = useState<string[]>([]);
  const [teams, setTeams] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!user) {
      setMatches([]);
      setRecentMatches([]);
      setUserTeamIds([]);
      setTeams({});
      return;
    }

    let isMounted = true;
    let unsubscribeTeams: (() => void) | undefined;
    let unsubscribeTeamMatches: (() => void) | undefined;

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

    const qLive = query(
      collection(db, "matches"),
      where("status", "==", "live"),
      where("createdBy", "==", user.uid),
    );
    const qRecent = query(
      collection(db, "matches"),
      where("status", "==", "completed"),
      where("createdBy", "==", user.uid),
    );

    const unsubLive = onSnapshot(
      qLive,
      (snap) => {
        const matchData = snap.docs.map((matchDoc) => ({
          id: matchDoc.id,
          ...matchDoc.data(),
        }));
        setMatches(matchData);
        matchData.forEach((m) => {
          fetchTeamNames(m);
        });
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, "matches");
      },
    );

    const unsubRecent = onSnapshot(
      qRecent,
      (snap) => {
        const matchData = snap.docs.map((matchDoc) => ({
          id: matchDoc.id,
          ...matchDoc.data(),
        }));
        setRecentMatches(matchData);
        matchData.forEach((m) => {
          fetchTeamNames(m);
        });
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, "matches");
      },
    );

    const qPlayer = query(
      collection(db, "players"),
      user.phoneNumber
        ? where("phoneNumber", "==", user.phoneNumber)
        : where("email", "==", user.email),
    );

    const unsubPlayer = onSnapshot(
      qPlayer,
      (snap) => {
        if (unsubscribeTeams) {
          unsubscribeTeams();
          unsubscribeTeams = undefined;
        }
        if (unsubscribeTeamMatches) {
          unsubscribeTeamMatches();
          unsubscribeTeamMatches = undefined;
        }

        if (!snap.empty) {
          const playerId = snap.docs[0].id;
          const qTeams = query(
            collection(db, "teams"),
            where("players", "array-contains", playerId),
          );

          unsubscribeTeams = onSnapshot(
            qTeams,
            (teamSnap) => {
              const teamIds = teamSnap.docs.map((teamDoc) => teamDoc.id);
              setUserTeamIds(teamIds);

              if (unsubscribeTeamMatches) {
                unsubscribeTeamMatches();
                unsubscribeTeamMatches = undefined;
              }

              if (teamIds.length > 0) {
                const qTeamMatches = query(
                  collection(db, "matches"),
                  where("status", "in", ["live", "completed"]),
                );
                unsubscribeTeamMatches = onSnapshot(
                  qTeamMatches,
                  (matchSnap) => {
                    const allMatches = matchSnap.docs.map(
                      (d) => ({ id: d.id, ...d.data() }) as any,
                    );
                    const participantMatches = allMatches.filter(
                      (m) =>
                        teamIds.includes(m.teamA) || teamIds.includes(m.teamB),
                    );

                    const liveParticipant = participantMatches.filter(
                      (m) => m.status === "live",
                    );
                    const recentParticipant = participantMatches.filter(
                      (m) => m.status === "completed",
                    );

                    setMatches((prev) => {
                      const existingIds = new Set(prev.map((m) => m.id));
                      const newMatches = liveParticipant.filter(
                        (m) => !existingIds.has(m.id),
                      );
                      return [...prev, ...newMatches];
                    });

                    setRecentMatches((prev) => {
                      const existingIds = new Set(prev.map((m) => m.id));
                      const newMatches = recentParticipant.filter(
                        (m) => !existingIds.has(m.id),
                      );
                      return [...prev, ...newMatches];
                    });

                    participantMatches.forEach((m) => {
                      fetchTeamNames(m);
                    });
                  },
                  (error) => {
                    handleFirestoreError(error, OperationType.GET, "matches");
                  },
                );
              }
            },
            (error) => {
              handleFirestoreError(error, OperationType.GET, "teams");
            },
          );
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, "players");
      },
    );

    return () => {
      isMounted = false;
      unsubLive();
      unsubRecent();
      unsubPlayer();
      if (unsubscribeTeams) {
        unsubscribeTeams();
      }
      if (unsubscribeTeamMatches) {
        unsubscribeTeamMatches();
      }
    };
  }, [user]);

  return { matches, recentMatches, userTeamIds, teams };
}
