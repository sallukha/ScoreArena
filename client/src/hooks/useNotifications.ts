import { useEffect, useState } from "react";
import {
  db,
  query,
  collection,
  where,
  orderBy,
  onSnapshot,
  limit,
  handleFirestoreError,
  OperationType,
} from "../firebase";

export function useNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const qNotif = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      orderBy("timestamp", "desc"),
      limit(20),
    );

    const unsubNotif = onSnapshot(
      qNotif,
      (snap) => {
        setNotifications(
          snap.docs.map((notifDoc) => ({
            id: notifDoc.id,
            ...notifDoc.data(),
          })),
        );
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, "notifications");
        setLoading(false);
      },
    );

    return () => {
      unsubNotif();
    };
  }, [userId]);

  return { notifications, loading };
}
