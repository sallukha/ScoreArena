import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createTournament,
  deleteTournament,
  updateTournament,
} from "../services/tournamentService";

export function useCreateTournamentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTournament,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tournaments"] });
      void queryClient.invalidateQueries({ queryKey: ["matches"] });
    },
  });
}

export function useUpdateTournamentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tournamentId,
      payload,
    }: {
      tournamentId: string;
      payload: Record<string, any>;
    }) => updateTournament(tournamentId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tournaments"] });
      void queryClient.invalidateQueries({ queryKey: ["matches"] });
      void queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });
}

export function useDeleteTournamentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tournamentId: string) => deleteTournament(tournamentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tournaments"] });
      void queryClient.invalidateQueries({ queryKey: ["matches"] });
      void queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });
}
