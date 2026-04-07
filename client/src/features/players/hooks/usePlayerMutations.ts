import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createPlayer,
  deletePlayer,
  updatePlayer,
} from "../services/playerService";

export function useCreatePlayerMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPlayer,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["players"] });
      void queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });
}

export function useUpdatePlayerMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      playerId,
      payload,
    }: {
      playerId: string;
      payload: Record<string, any>;
    }) => updatePlayer(playerId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["players"] });
      void queryClient.invalidateQueries({ queryKey: ["teams"] });
      void queryClient.invalidateQueries({ queryKey: ["matches"] });
    },
  });
}

export function useDeletePlayerMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (playerId: string) => deletePlayer(playerId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["players"] });
      void queryClient.invalidateQueries({ queryKey: ["teams"] });
      void queryClient.invalidateQueries({ queryKey: ["matches"] });
    },
  });
}
