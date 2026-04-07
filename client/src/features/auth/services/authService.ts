import {
  auth,
  signIn,
  logOut,
  onAuthStateChanged,
  db,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
} from "../../../firebase";
import { UserProfile } from "../../../types";

export function subscribeAuthState(onData: (firebaseUser: any) => void) {
  return onAuthStateChanged(auth, onData);
}

export async function fetchUserProfile(uid: string) {
  const userDoc = await getDoc(doc(db, "users", uid));
  if (!userDoc.exists()) {
    return null;
  }
  return userDoc.data() as UserProfile;
}

export async function upsertUserProfile(uid: string, payload: UserProfile) {
  await setDoc(doc(db, "users", uid), payload);
}

export function subscribeUserProfile(
  uid: string,
  onData: (profile: UserProfile | null) => void,
  onError?: (error: unknown) => void,
) {
  return onSnapshot(
    doc(db, "users", uid),
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(null);
        return;
      }
      onData(snapshot.data() as UserProfile);
    },
    onError,
  );
}

export async function loginWithGoogle() {
  await signIn();
}

export async function logoutCurrentUser() {
  await logOut();
}
