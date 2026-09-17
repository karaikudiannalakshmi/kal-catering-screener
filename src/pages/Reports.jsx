import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase.js";
import { ORDER_STATUS, STATUS_LABELS } from "../lib/constants.js";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgoIso(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default function Reports() {
  const navigate = useNavigate();
  const [from, setFrom] = useState(daysAgoIso(30));
  const [to, setTo] = useState(todayIso());
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");

  async function runReport() {
    setLoading(true);
    setError(null);
    try {
      const q = query(
        collection(db, "orders"),
        where("orderDate", ">=", from),
        where("orderDate", "<=", to),
        orderBy("orderDate")
      );
      const snap = await getDocs(q);
      setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    runReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const byDate = useMemo(() => {
    const map = new Map();
    for (const o of orders) {
      if (!map.has(o.orderDate)) {
        map.set(o.orderDate, { date: o.orderDate, total: 0, ...Object.fromEntries(Object.values(ORDER_STATUS).map((s) => [s, 0])) });
      }
      const row = map.get(o.orderDate);
      row.total += 1;
      row[o.status] = (row[o.status] || 0) + 1;
    }
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [orders]);

  const totals = useMemo(() => {
    const t = { total: 0, ...Object.fromEntries(Object.values(ORDER_STATUS).map((s) => [s, 0])) };
    for (const row of byDate) {
      t.total += row.total;
      for (const s of Object.values(ORDER_STATUS)) t[s] += row[s] || 0;
    }
    return t;
  }, [byDate]);

  const filteredOrders = useMemo(
    () => (statusFilter === "all" ? orders : orders.filter((o) => o.status === statusFilter)),
    [orders, statusFilter]
  );

  return (
    <div>
      <div className="page-head">
        <h1>Reports</h1>
        <p>Order status by date — how many are in each stage, for a range you pick.</p>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="field-row" style={{ marginBottom: 14 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        <button className="btn-primary" onClick={runReport} disabled={loading}>
          {loading ? "Loading..." : "Run report"}
        </button>
        {error && <div className="notice-error">{error}</div>}
      </div>

      {!loading && byDate.length === 0 && !error && (
        <div className="empty-state">No orders in this date range.</div>
      )}

      {!loading && byDate.length > 0 && (
        <>
          <div className="card" style={{ marginBottom: 24, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--ink-soft)", fontSize: 12 }}>
                  <th style={{ padding: "6px 8px" }}>Date</th>
                  {Object.values(ORDER_STATUS).map((s) => (
                    <th key={s} style={{ padding: "6px 8px", textAlign: "right" }}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </th>
                  ))}
                  <th style={{ padding: "6px 8px", textAlign: "right" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {byDate.map((row) => (
                  <tr key={row.date} style={{ borderTop: "1px solid var(--line)" }}>
                    <td style={{ padding: "6px 8px" }}>{row.date}</td>
                    {Object.values(ORDER_STATUS).map((s) => (
                      <td key={s} style={{ padding: "6px 8px", textAlign: "right" }}>
                        {row[s] || 0}
                      </td>
                    ))}
                    <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600 }}>{row.total}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: "2px solid var(--ink)", fontWeight: 700 }}>
                  <td style={{ padding: "6px 8px" }}>Total</td>
                  {Object.values(ORDER_STATUS).map((s) => (
                    <td key={s} style={{ padding: "6px 8px", textAlign: "right" }}>
                      {totals[s] || 0}
                    </td>
                  ))}
                  <td style={{ padding: "6px 8px", textAlign: "right" }}>{totals.total}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="field" style={{ maxWidth: 260 }}>
            <label>Filter order list by status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All statuses</option>
              {Object.values(ORDER_STATUS).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          <div className="order-list">
            {filteredOrders.map((o) => (
              <div
                className="order-card"
                key={o.id}
                style={{ padding: "12px 20px", cursor: "pointer" }}
                onClick={() => navigate(`/review/${o.id}`)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong>{o.customerName}</strong>
                    <span style={{ color: "var(--ink-soft)", fontSize: 13, marginLeft: 8 }}>
                      {o.orderDate} · {o.session} · {o.menuTemplateName} · {o.packCount} packs
                    </span>
                  </div>
                  <span className={`status-pill ${o.status}`}>{STATUS_LABELS[o.status]}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
