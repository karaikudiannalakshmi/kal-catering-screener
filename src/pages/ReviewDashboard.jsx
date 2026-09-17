import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../lib/firebase.js";
import { ORDER_STATUS, STATUS_LABELS } from "../lib/constants.js";

export default function ReviewDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const navigate = useNavigate();

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

  const visibleOrders = useMemo(() => {
    let list = orders;
    if (statusFilter !== "all") list = list.filter((o) => o.status === statusFilter);
    if (dateFilter) list = list.filter((o) => o.orderDate === dateFilter);
    return list;
  }, [orders, statusFilter, dateFilter]);

  return (
    <div>
      <div className="page-head">
        <h1>Orders</h1>
        <p>Every order taken, one line each — click any row to open its full details, items, billing, and status.</p>
      </div>

      <div className="field-row" style={{ maxWidth: 560, marginBottom: 18 }}>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="statusFilter">Status</label>
          <select id="statusFilter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            {Object.values(ORDER_STATUS).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="dateFilter">Date</label>
          <input
            id="dateFilter"
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>
        {dateFilter && (
          <button
            type="button"
            className="btn-secondary"
            style={{ alignSelf: "flex-end", marginBottom: 18 }}
            onClick={() => setDateFilter("")}
          >
            Clear date
          </button>
        )}
      </div>

      {loading && <div className="loading-state">Loading orders…</div>}

      {!loading && visibleOrders.length === 0 && <div className="empty-state">No orders here yet.</div>}

      {!loading && visibleOrders.length > 0 && (
        <div className="card" style={{ padding: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--ink-soft)", fontSize: 12 }}>
                <th style={{ padding: "10px 14px" }}>Date</th>
                <th style={{ padding: "10px 14px" }}>Customer</th>
                <th style={{ padding: "10px 14px" }}>Session</th>
                <th style={{ padding: "10px 14px" }}>Menu</th>
                <th style={{ padding: "10px 14px", textAlign: "right" }}>Packs</th>
                <th style={{ padding: "10px 14px" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleOrders.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => navigate(`/review/${o.id}`)}
                  style={{ borderTop: "1px solid var(--line)", cursor: "pointer" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--leaf-soft)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                >
                  <td style={{ padding: "10px 14px" }}>{o.orderDate}</td>
                  <td style={{ padding: "10px 14px" }}>
                    {o.customerName}
                    {o.isCustomized && <span className="customized-badge">Edited</span>}
                  </td>
                  <td style={{ padding: "10px 14px" }}>{o.session}</td>
                  <td style={{ padding: "10px 14px" }}>{o.menuTemplateName}</td>
                  <td style={{ padding: "10px 14px", textAlign: "right" }}>{o.packCount}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <span className={`status-pill ${o.status}`}>{STATUS_LABELS[o.status]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
