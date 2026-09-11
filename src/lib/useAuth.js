import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { doc, getDoc, setDoc, getDocs, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase.js";

export function useAuth() {
  const [user, setUser] = useState(undefined); // undefined = not yet resolved, null = signed out
  const [staff, setStaff] = useState(null); // { approved, email } once loaded
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setStaff(null);
        setLoading(false);
        return;
      }
      // Phone-authenticated accounts are customers (from the /request form),
      // never staff — don't look up or create a staff record for them.
      if (firebaseUser.phoneNumber) {
        setStaff(null);
        setLoading(false);
        return;
      }
      try {
        const staffRef = doc(db, "staff", firebaseUser.uid);
        const snap = await getDoc(staffRef);
        if (snap.exists()) {
          setStaff(snap.data());
        } else {
          // First time this account has logged in. If there's no staff
          // record at all yet, this is the very first account ever — approve
          // them automatically so there's someone who can approve everyone
          // else.
          const existing = await getDocs(collection(db, "staff"));
          const approved = existing.empty;
          const record = { email: firebaseUser.email, approved, createdAt: serverTimestamp() };
          await setDoc(staffRef, record);
          setStaff(record);
        }
      } catch (err) {
        console.error(err);
        setStaff(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  async function signOut() {
    await firebaseSignOut(auth);
  }

  return { user, staff, loading, signOut };
}
