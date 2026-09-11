import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query, doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase.js";
import { ORDER_STATUS, STATUS_LABELS } from "../lib/constants.js";
import OrderCard from "../components/OrderCard.jsx";

export default function ReviewDashboard() {
  const [orders, setOrders] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

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

  const visibleOrders = useMemo(() => {
    if (statusFilter === "all") return orders;
    return orders.filter((o) => o.status === statusFilter);
  }, [orders, statusFilter]);

  async function handleStatusChange(orderId, newStatus) {
    try {
      await updateDoc(doc(db, "orders", orderId), { status: newStatus });
    } catch (err) {
      console.error(err);
      alert("Could not update status. Check your connection and try again.");
    }
  }

  return (
    <div>
      <div className="page-head">
        <h1>Review screened orders</h1>
        <p>
          Every order a junior executive has taken down, checked against the same date and session, so you
          can decide on volume vs. template changes, customize the item list, and finalize with the
          customer.
        </p>
      </div>

      <div className="field" style={{ maxWidth: 260 }}>
        <label htmlFor="statusFilter">Filter by status</label>
        <select id="statusFilter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All orders</option>
          {Object.values(ORDER_STATUS).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {loading && <div className="loading-state">Loading orders…</div>}

      {!loading && visibleOrders.length === 0 && (
        <div className="empty-state">No orders here yet.</div>
      )}

      {!loading && visibleOrders.length > 0 && (
        <div className="order-list">
          {visibleOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              allOrders={orders}
              templates={templates}
              contractors={contractors}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
