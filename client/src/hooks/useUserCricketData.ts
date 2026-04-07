import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { handleFirestoreError, OperationType } from "../firebase";
import { UserProfile } from "../types";
import {
  fetchTeamPair,
  subscribeMatchesByStatuses,
  subscribeUserCreatedCompletedMatches,
  subscribeUserCreatedLiveMatches,
} from "../features/matches/services/matchService";
import { subscribePrimaryPlayerByIdentity } from "../features/players/services/playerService";
import { subscribeTeamsByPlayer } from "../features/teams/services/teamService";

export function useUserCricketData(user: UserProfile | null) {
  const queryClient = useQueryClient();

  const userKey = user?.uid || "anonymous";
  const matchesKey = ["matches", "user", userKey, "live"];
  const recentMatchesKey = ["matches", "user", userKey, "completed"];
  const userTeamIdsKey = ["teams", "user", userKey, "ids"];
  const teamsByIdKey = ["teams", "user", userKey, "byId"];

  const matchesQuery = useQuery<any[]>({
    queryKey: matchesKey,
    queryFn: async () => [],
    enabled: Boolean(user),
  });

  const recentMatchesQuery = useQuery<any[]>({
    queryKey: recentMatchesKey,
    queryFn: async () => [],
    enabled: Boolean(user),
  });

  const userTeamIdsQuery = useQuery<string[]>({
    queryKey: userTeamIdsKey,
    queryFn: async () => [],
    enabled: Boolean(user),
  });

  const teamsQuery = useQuery<Record<string, any>>({
    queryKey: teamsByIdKey,
    queryFn: async () => ({}),
    enabled: Boolean(user),
  });

  useEffect(() => {
    if (!user) {
      queryClient.setQueryData(matchesKey, []);
      queryClient.setQueryData(recentMatchesKey, []);
      queryClient.setQueryData(userTeamIdsKey, []);
      queryClient.setQueryData(teamsByIdKey, {});
      return;
    }

    let isMounted = true;
    let unsubscribeTeams: (() => void) | undefined;
    let unsubscribeTeamMatches: (() => void) | undefined;

    async function fetchTeamNames(m: any) {
      if (!m?.teamA || !m?.teamB) return;

      const { teamAData, teamBData } = await fetchTeamPair(m.teamA, m.teamB);

      if (!isMounted) return;

      queryClient.setQueryData(teamsByIdKey, (prevData: any) => {
        const prev = (prevData || {}) as Record<string, any>;
        const next = { ...prev };
        if (teamAData && !next[m.teamA]) next[m.teamA] = teamAData;
        if (teamBData && !next[m.teamB]) next[m.teamB] = teamBData;
        return next;
      });
    }

    const unsubLive = subscribeUserCreatedLiveMatches(
      user.uid,
      (matchData) => {
        queryClient.setQueryData(matchesKey, matchData);
        matchData.forEach((m) => {
          void fetchTeamNames(m);
        });
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, "matches");
      },
    );

    const unsubRecent = subscribeUserCreatedCompletedMatches(
      user.uid,
      (matchData) => {
        queryClient.setQueryData(recentMatchesKey, matchData);
        matchData.forEach((m) => {
          void fetchTeamNames(m);
        });
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, "matches");
      },
    );

    const unsubPlayer = subscribePrimaryPlayerByIdentity(
      { phoneNumber: user.phoneNumber, email: user.email },
      (player) => {
        if (unsubscribeTeams) {
          unsubscribeTeams();
          unsubscribeTeams = undefined;
        }
        if (unsubscribeTeamMatches) {
          unsubscribeTeamMatches();
          unsubscribeTeamMatches = undefined;
        }

        if (player) {
          const playerId = player.id;

          unsubscribeTeams = subscribeTeamsByPlayer(
            playerId,
            (teamsData) => {
              const teamIds = teamsData.map((teamDoc) => teamDoc.id);
              queryClient.setQueryData(userTeamIdsKey, teamIds);

              if (unsubscribeTeamMatches) {
                unsubscribeTeamMatches();
                unsubscribeTeamMatches = undefined;
              }

              if (teamIds.length > 0) {
                unsubscribeTeamMatches = subscribeMatchesByStatuses(
                  ["live", "completed"],
                  (allMatches) => {
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

                    queryClient.setQueryData(matchesKey, (prevData: any) => {
                      const prev = (prevData || []) as any[];
                      const existingIds = new Set(prev.map((m) => m.id));
                      const newMatches = liveParticipant.filter(
                        (m) => !existingIds.has(m.id),
                      );
                      return [...prev, ...newMatches];
                    });

                    queryClient.setQueryData(
                      recentMatchesKey,
                      (prevData: any) => {
                        const prev = (prevData || []) as any[];
                        const existingIds = new Set(prev.map((m) => m.id));
                        const newMatches = recentParticipant.filter(
                          (m) => !existingIds.has(m.id),
                        );
                        return [...prev, ...newMatches];
                      },
                    );

                    participantMatches.forEach((m) => {
                      void fetchTeamNames(m);
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
  }, [queryClient, user]);

  return {
    matches: matchesQuery.data || [],
    recentMatches: recentMatchesQuery.data || [],
    userTeamIds: userTeamIdsQuery.data || [],
    teams: teamsQuery.data || {},
    loading:
      matchesQuery.isLoading ||
      recentMatchesQuery.isLoading ||
      userTeamIdsQuery.isLoading ||
      teamsQuery.isLoading,
    isError:
      matchesQuery.isError ||
      recentMatchesQuery.isError ||
      userTeamIdsQuery.isError ||
      teamsQuery.isError,
  };
}
