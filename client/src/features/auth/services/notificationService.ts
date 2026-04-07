import {
  db,
  query,
  collection,
  where,
  orderBy,
  onSnapshot,
  limit,
} from "../../../firebase";

export function subscribeNotifications(
  userId: string,
  onData: (notifications: Array<{ id: string; [key: string]: any }>) => void,
  onError?: (error: unknown) => void,
  maxItems = 20,
) {
  const q = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    orderBy("timestamp", "desc"),
    limit(maxItems),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      onData(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    },
    onError,
  );
}
