import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { handleFirestoreError, OperationType } from "../firebase";
import {
  fetchTeamPair,
  subscribeGlobalLiveMatches,
} from "../features/matches/services/matchService";

export function useLiveMatches() {
  const queryClient = useQueryClient();

  const globalMatchesQuery = useQuery<any[]>({
    queryKey: ["matches", "global", "live"],
    queryFn: async () => [],
  });

  const teamsQuery = useQuery<Record<string, any>>({
    queryKey: ["teams", "byId", "live-context"],
    queryFn: async () => ({}),
  });

  useEffect(() => {
    let isMounted = true;

    async function fetchTeamNames(m: any) {
      if (!m?.teamA || !m?.teamB) return;

      const { teamAData, teamBData } = await fetchTeamPair(m.teamA, m.teamB);

      if (!isMounted) return;

      queryClient.setQueryData(
        ["teams", "byId", "live-context"],
        (prevData: any) => {
          const prev = (prevData || {}) as Record<string, any>;
          const next = { ...prev };
          if (teamAData && !next[m.teamA]) next[m.teamA] = teamAData;
          if (teamBData && !next[m.teamB]) next[m.teamB] = teamBData;
          return next;
        },
      );
    }

    const unsubGlobal = subscribeGlobalLiveMatches(
      (snap) => {
        const matchData = snap;
        queryClient.setQueryData(["matches", "global", "live"], matchData);
        matchData.forEach((m) => {
          void fetchTeamNames(m);
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
  }, [queryClient]);

  return {
    globalMatches: globalMatchesQuery.data || [],
    teams: teamsQuery.data || {},
    loading: globalMatchesQuery.isLoading || teamsQuery.isLoading,
    isError: globalMatchesQuery.isError || teamsQuery.isError,
  };
}
