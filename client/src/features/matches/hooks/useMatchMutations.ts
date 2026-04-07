import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createMatch,
  createMatchBall,
  deleteMatch,
  deleteMatchBall,
  updateMatch,
} from "../services/matchService";

export function useCreateMatchMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createMatch,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["matches"] });
      void queryClient.invalidateQueries({ queryKey: ["teams"] });
      void queryClient.invalidateQueries({ queryKey: ["tournaments"] });
    },
  });
}

export function useUpdateMatchMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      matchId,
      payload,
    }: {
      matchId: string;
      payload: Record<string, any>;
    }) => updateMatch(matchId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["matches"] });
      void queryClient.invalidateQueries({ queryKey: ["teams"] });
      void queryClient.invalidateQueries({ queryKey: ["players"] });
      void queryClient.invalidateQueries({ queryKey: ["tournaments"] });
    },
  });
}

export function useDeleteMatchMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (matchId: string) => deleteMatch(matchId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["matches"] });
      void queryClient.invalidateQueries({ queryKey: ["teams"] });
      void queryClient.invalidateQueries({ queryKey: ["players"] });
      void queryClient.invalidateQueries({ queryKey: ["tournaments"] });
    },
  });
}

export function useCreateMatchBallMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      matchId,
      payload,
    }: {
      matchId: string;
      payload: Record<string, any>;
    }) => createMatchBall(matchId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["matches"] });
    },
  });
}

export function useDeleteMatchBallMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ matchId, ballId }: { matchId: string; ballId: string }) =>
      deleteMatchBall(matchId, ballId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["matches"] });
    },
  });
}
