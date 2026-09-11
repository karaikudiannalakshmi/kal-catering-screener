import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase.js";

export default function ManageContractors() {
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "contractors"), orderBy("name"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setContractors(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      alert("Name and phone number are required.");
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, "contractors"), {
        name: name.trim(),
        phone: phone.trim(),
        createdAt: serverTimestamp(),
      });
      setName("");
      setPhone("");
    } catch (err) {
      console.error(err);
      alert("Could not save the contractor. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Remove this contractor?")) return;
    try {
      await deleteDoc(doc(db, "contractors", id));
    } catch (err) {
      console.error(err);
      alert("Could not remove the contractor.");
    }
  }

  return (
    <div>
      <div className="page-head">
        <h1>Service contractors</h1>
        <p>
          The people you send service-personnel requests to. Add their WhatsApp number here so the
          "Message contractor" button on an order can reach them directly.
        </p>
      </div>

      <form className="card" onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
        <div className="field-row">
          <div className="field">
            <label htmlFor="contractorName">Contractor / agency name</label>
            <input
              id="contractorName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Murugan Service Staff"
            />
          </div>
          <div className="field">
            <label htmlFor="contractorPhone">WhatsApp number</label>
            <input
              id="contractorPhone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 98765 43210"
            />
          </div>
        </div>
        <button className="btn-primary" type="submit" disabled={saving}>
          {saving ? "Saving..." : "Add contractor"}
        </button>
      </form>

      {loading && <div className="loading-state">Loading contractors…</div>}

      {!loading && contractors.length === 0 && (
        <div className="empty-state">No contractors added yet.</div>
      )}

      {!loading && contractors.length > 0 && (
        <div className="order-list">
          {contractors.map((c) => (
            <div className="order-card" key={c.id}>
              <div className="order-card-head">
                <div>
                  <h3>{c.name}</h3>
                  <div className="order-meta">{c.phone}</div>
                </div>
                <button className="btn-secondary" onClick={() => handleDelete(c.id)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
