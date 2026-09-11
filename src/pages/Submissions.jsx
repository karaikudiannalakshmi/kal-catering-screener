import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot, orderBy, query, limit } from "firebase/firestore";
import { db } from "../lib/firebase.js";
import { buildWhatsAppLink } from "../lib/whatsapp.js";

export default function Submissions() {
  const [submissions, setSubmissions] = useState([]);
  const [callEvents, setCallEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sharePhone, setSharePhone] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const navigate = useNavigate();

  const requestUrl = `${window.location.origin}${window.location.pathname}#/request`;

  useEffect(() => {
    const q = query(collection(db, "customerSubmissions"), orderBy("submittedAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setSubmissions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
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
    const q = query(collection(db, "callEvents"), orderBy("receivedAt", "desc"), limit(15));
    const unsub = onSnapshot(q, (snap) => {
      setCallEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(requestUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      alert(requestUrl);
    }
  }

  function sendLinkOnWhatsApp() {
    if (!sharePhone.trim()) {
      alert("Enter the customer's phone number first.");
      return;
    }
    const message = `Hi! Please share your event details here so we get everything noted correctly: ${requestUrl}`;
    window.open(buildWhatsAppLink(sharePhone.trim(), message), "_blank", "noopener");
  }

  const newSubmissions = submissions.filter((s) => s.status === "new");
  const usedSubmissions = submissions.filter((s) => s.status !== "new");

  return (
    <div>
      <div className="page-head">
        <h1>Customer submissions</h1>
        <p>
          Customers fill in their own name, event address, and menu choice — no typos from relaying it
          over the phone. Share the link below, and once a submission comes in, start an order from it
          with those fields already filled.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--ink-soft)", marginBottom: 8 }}>
          Customer intake link
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <code
            style={{
              background: "#fff",
              border: "1px solid var(--line)",
              borderRadius: 6,
              padding: "8px 12px",
              fontSize: 13,
              flex: "1 1 260px",
              overflowX: "auto",
              whiteSpace: "nowrap",
            }}
          >
            {requestUrl}
          </code>
          <button type="button" className="btn-secondary" onClick={copyLink}>
            {linkCopied ? "Copied!" : "Copy link"}
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          <input
            type="tel"
            value={sharePhone}
            onChange={(e) => setSharePhone(e.target.value)}
            placeholder="Customer's phone number"
            style={{ flex: "1 1 220px", padding: "9px 10px", border: "1px solid var(--line)", borderRadius: 6 }}
          />
          <button type="button" className="btn-primary" onClick={sendLinkOnWhatsApp}>
            Send link via WhatsApp
          </button>
        </div>
      </div>

      {loading && <div className="loading-state">Loading submissions…</div>}

      {!loading && newSubmissions.length === 0 && (
        <div className="empty-state">No new submissions waiting yet.</div>
      )}

      {!loading && newSubmissions.length > 0 && (
        <div className="order-list" style={{ marginBottom: 28 }}>
          {newSubmissions.map((s) => (
            <div className="order-card" key={s.id}>
              <div className="order-card-head">
                <div>
                  <h3>{s.customerName}</h3>
                  <div className="order-meta">
                    {s.customerPhone || "No phone given"}
                    {s.phoneVerified && <span className="customized-badge">Verified</span>}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => navigate(`/screener?submissionId=${s.id}`)}
                >
                  Start order
                </button>
              </div>
              <div className="order-detail-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <div>
                  <div className="dt">Event address</div>
                  <div>{s.deliveryAddress}</div>
                </div>
                <div>
                  <div className="dt">Date / packs</div>
                  <div>
                    {s.orderDate || "—"} · {s.packCount ?? "—"} packs
                  </div>
                </div>
                <div>
                  <div className="dt">Menu chosen</div>
                  <div>
                    {s.menuTemplateName} {s.menuTemplateSession ? `(${s.menuTemplateSession})` : ""}
                  </div>
                </div>
                <div>
                  <div className="dt">Estimated total</div>
                  <div>
                    {s.pricePerPack != null && s.packCount
                      ? `₹${(s.pricePerPack * s.packCount).toLocaleString("en-IN")}`
                      : "—"}
                  </div>
                </div>
                <div>
                  <div className="dt">Live counter</div>
                  <div>{s.needsLiveCounter ? "Yes" : "No"}</div>
                </div>
                <div>
                  <div className="dt">Service staff</div>
                  <div>{s.needsServicePersonnel ? "Yes" : "No"}</div>
                </div>
              </div>
              {s.wantsChanges && s.changeRequest && (
                <div className="order-notes">Requested change: "{s.changeRequest}"</div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && usedSubmissions.length > 0 && (
        <>
          <h3 style={{ fontSize: 15, color: "var(--ink-soft)", marginBottom: 10 }}>
            Already converted to orders
          </h3>
          <div className="order-list">
            {usedSubmissions.map((s) => (
              <div className="order-card" key={s.id} style={{ opacity: 0.65 }}>
                <div className="order-card-head">
                  <div>
                    <h3>{s.customerName}</h3>
                    <div className="order-meta">{s.menuTemplateName}</div>
                  </div>
                  <span className="status-pill">Used</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {callEvents.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <h3 style={{ fontSize: 15, color: "var(--ink-soft)", marginBottom: 10 }}>
            Recent calls (auto-sent via Exotel)
          </h3>
          <div className="order-list">
            {callEvents.map((c) => (
              <div className="order-card" key={c.id} style={{ padding: "12px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 14 }}>{c.callerPhone}</span>
                  <span className={`status-pill ${c.smsSent ? "confirmed" : ""}`}>
                    {c.smsSent ? "Link sent" : `Failed${c.smsError ? `: ${c.smsError}` : ""}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
