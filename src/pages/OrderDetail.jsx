import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, onSnapshot, orderBy, query, doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase.js";
import OrderCard from "../components/OrderCard.jsx";

export default function OrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("orderDate", "asc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "menuTemplates"));
    const unsub = onSnapshot(q, (snap) => {
      setTemplates(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "contractors"));
    const unsub = onSnapshot(q, (snap) => {
      setContractors(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  async function handleStatusChange(id, newStatus) {
    try {
      await updateDoc(doc(db, "orders", id), { status: newStatus });
    } catch (err) {
      console.error(err);
      alert("Could not update status. Check your connection and try again.");
    }
  }

  const order = orders.find((o) => o.id === orderId);

  return (
    <div>
      <button type="button" className="btn-secondary" onClick={() => navigate("/review")} style={{ marginBottom: 16 }}>
        ← Back to orders
      </button>

      {loading && <div className="loading-state">Loading order…</div>}

      {!loading && !order && <div className="empty-state">This order couldn't be found.</div>}

      {!loading && order && (
        <OrderCard
          order={order}
          allOrders={orders}
          templates={templates}
          contractors={contractors}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
