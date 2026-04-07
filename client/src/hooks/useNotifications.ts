import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { handleFirestoreError, OperationType } from "../firebase";
import { subscribeNotifications } from "../features/auth/services/notificationService";

export function useNotifications(userId?: string) {
  const queryClient = useQueryClient();
  const queryKey = ["notifications", "byUser", userId || "anonymous"];

  const notificationsQuery = useQuery<any[]>({
    queryKey,
    queryFn: async () => [],
    enabled: Boolean(userId),
  });

  useEffect(() => {
    if (!userId) {
      queryClient.setQueryData(queryKey, []);
      return;
    }

    const unsubNotif = subscribeNotifications(
      userId,
      (nextNotifications) => {
        queryClient.setQueryData(queryKey, nextNotifications);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, "notifications");
      },
    );

    return () => {
      unsubNotif();
    };
  }, [queryClient, userId]);

  return {
    notifications: notificationsQuery.data || [],
    loading: notificationsQuery.isLoading,
    isError: notificationsQuery.isError,
  };
}
