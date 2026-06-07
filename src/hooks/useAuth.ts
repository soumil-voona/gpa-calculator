import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { auth, db } from "../lib/firebase";
import type { LastCompletedSemester, UserProfile } from "../types";

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({ user: null, profile: null, loading: true });

  useEffect(() => {
    if (!auth || !db) {
      setState({ user: null, profile: null, loading: false });
      return;
    }
    const firebaseAuth = auth;
    const firestore = db;

    return onAuthStateChanged(firebaseAuth, async (user) => {
      if (!user) {
        setState({ user: null, profile: null, loading: false });
        return;
      }

      const profileSnap = await getDoc(doc(firestore, "users", user.uid));
      setState({
        user,
        profile: profileSnap.exists() ? (profileSnap.data() as UserProfile) : null,
        loading: false,
      });
    });
  }, []);

  return useMemo(
    () => ({
      ...state,
      signup: async (email: string, password: string, graduationYear: number, lastCompletedSemester: LastCompletedSemester) => {
        if (!auth || !db) throw new Error("Firebase is not configured.");
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        const profile: UserProfile = {
          uid: credential.user.uid,
          email,
          graduationYear,
          lastCompletedSemester,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await setDoc(doc(db, "users", credential.user.uid), profile);
        setState({ user: credential.user, profile, loading: false });
      },
      login: (email: string, password: string) => {
        if (!auth) throw new Error("Firebase is not configured.");
        return signInWithEmailAndPassword(auth, email, password);
      },
      logout: () => {
        if (!auth) throw new Error("Firebase is not configured.");
        return signOut(auth);
      },
    }),
    [state],
  );
}
