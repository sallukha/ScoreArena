import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { handleFirestoreError, OperationType } from "../firebase";
import { Tournament } from "../types";
import { subscribeTournaments } from "../features/tournaments/services/tournamentService";

export function useTournaments(tournamentLimit?: number, createdBy?: string) {
  const queryClient = useQueryClient();
  const queryKey = ["tournaments", "list", tournamentLimit ?? "all", createdBy || "all-users"];

  const tournamentsQuery = useQuery<Tournament[]>({
    queryKey,
    queryFn: async () => [],
  });

  useEffect(() => {
    const unsub = subscribeTournaments(
      (nextTournaments: Tournament[]) => {
        queryClient.setQueryData(queryKey, nextTournaments);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, "tournaments");
      },
      tournamentLimit,
      createdBy,
    );

    return () => {
      unsub();
    };
  }, [createdBy, queryClient, tournamentLimit]);

  return {
    tournaments: tournamentsQuery.data || [],
    loading: tournamentsQuery.isLoading,
    isError: tournamentsQuery.isError,
  };
}
