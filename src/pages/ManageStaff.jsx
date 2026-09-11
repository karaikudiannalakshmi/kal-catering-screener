import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query, doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase.js";

export default function ManageStaff() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "staff"), orderBy("email"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setStaff(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  async function setApproved(uid, approved) {
    try {
      await updateDoc(doc(db, "staff", uid), { approved });
    } catch (err) {
      console.error(err);
      alert("Could not update. Check your connection and try again.");
    }
  }

  return (
    <div>
      <div className="page-head">
        <h1>Staff</h1>
        <p>
          Everyone who's signed in shows up here once. New accounts wait for approval before they can use
          the app — add the Firebase Auth account in the Firebase console first, then approve them here
          after they sign in once.
        </p>
      </div>

      {loading && <div className="loading-state">Loading staff…</div>}

      {!loading && staff.length === 0 && <div className="empty-state">No staff have signed in yet.</div>}

      {!loading && staff.length > 0 && (
        <div className="order-list">
          {staff.map((s) => (
            <div className="order-card" key={s.id}>
              <div className="order-card-head">
                <div>
                  <h3>{s.email}</h3>
                  <div className="order-meta">{s.approved ? "Approved" : "Waiting for approval"}</div>
                </div>
                {s.approved ? (
                  <button className="btn-secondary" onClick={() => setApproved(s.id, false)}>
                    Revoke access
                  </button>
                ) : (
                  <button className="btn-primary" onClick={() => setApproved(s.id, true)}>
                    Approve
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
