import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase.js";
import { ORDER_STATUS, STATUS_LABELS } from "../lib/constants.js";
import ConflictPanel from "./ConflictPanel.jsx";
import ItemListEditor from "./ItemListEditor.jsx";
import PersonnelMessage from "./PersonnelMessage.jsx";
import BillingPanel from "./BillingPanel.jsx";

export default function OrderCard({ order, allOrders, templates, contractors, onStatusChange }) {
  const [customizing, setCustomizing] = useState(false);
  const [draftItems, setDraftItems] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showBilling, setShowBilling] = useState(false);

  const template = templates.find((t) => t.id === order.menuTemplateId);

  function startCustomize() {
    // Seed the draft from whatever's already been customized, or from the
    // template's items the first time this order is customized.
    const base = order.customizedItems || template?.items || [];
    setDraftItems(base.map((it) => ({ ...it })));
    setCustomizing(true);
  }

  function cancelCustomize() {
    setCustomizing(false);
    setDraftItems(null);
  }

  async function saveCustomize() {
    setSaving(true);
    try {
      await updateDoc(doc(db, "orders", order.id), {
        customizedItems: draftItems,
        isCustomized: true,
      });
      setCustomizing(false);
      setDraftItems(null);
    } catch (err) {
      console.error(err);
      alert("Could not save the customized order. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  const itemsToShow = order.customizedItems || template?.items;

  return (
    <div className="order-card">
      <div className="order-card-head">
        <div>
          <h3>
            {order.customerName}
            {order.isCustomized && <span className="customized-badge">Customized</span>}
          </h3>
          <div className="order-meta">
            {order.customerPhone} · {order.deliveryAddress}
          </div>
        </div>
        <span className={`status-pill ${order.status}`}>{STATUS_LABELS[order.status]}</span>
      </div>

      <div className="order-detail-grid">
        <div>
          <div className="dt">Date</div>
          <div>{order.orderDate}</div>
        </div>
        <div>
          <div className="dt">Session</div>
          <div>{order.session}</div>
        </div>
        <div>
          <div className="dt">Packs</div>
          <div>{order.packCount}</div>
        </div>
        <div>
          <div className="dt">Menu template</div>
          <div>{order.menuTemplateName}</div>
        </div>
        <div>
          <div className="dt">Serve time</div>
          <div>{order.serviceTime || "—"}</div>
        </div>
        <div>
          <div className="dt">Site distance</div>
          <div>{order.siteDistanceKm != null ? `${order.siteDistanceKm} km` : "—"}</div>
        </div>
        <div>
          <div className="dt">Live counter</div>
          <div>{order.needsLiveCounter ? "Yes" : "No"}</div>
        </div>
        <div>
          <div className="dt">Service personnel</div>
          <div>{order.needsServicePersonnel ? "Yes" : "No"}</div>
        </div>
      </div>

      {order.additionalServices?.length > 0 && (
        <div className="order-detail-grid" style={{ marginTop: 6 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <div className="dt">Other services</div>
            <div>{order.additionalServices.join(", ")}</div>
          </div>
        </div>
      )}

      {order.notes && <div className="order-notes">"{order.notes}"</div>}

      <ConflictPanel order={order} allOrders={allOrders} />

      {order.needsServicePersonnel && (
        <div style={{ marginTop: 14 }}>
          <PersonnelMessage order={order} contractors={contractors} />
        </div>
      )}

      <div className="customize-toggle">
        {!customizing && (
          <button type="button" className="btn-secondary" onClick={startCustomize}>
            {order.isCustomized ? "Edit customized order" : "Customize order"}
          </button>
        )}
      </div>

      {!customizing && itemsToShow && (
        <table style={{ width: "100%", marginTop: 10, borderCollapse: "collapse", fontSize: 13 }}>
          <tbody>
            {itemsToShow.map((item, i) => (
              <tr key={i} style={{ borderTop: i > 0 ? "1px solid var(--line)" : "none" }}>
                <td style={{ padding: "4px 0", color: "var(--ink-soft)" }}>{item.name}</td>
                <td style={{ padding: "4px 0", textAlign: "right" }}>
                  {item.quantity} {item.unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {customizing && (
        <div className="customize-panel">
          <ItemListEditor items={draftItems} onChange={setDraftItems} />
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button type="button" className="btn-primary" onClick={saveCustomize} disabled={saving}>
              {saving ? "Saving..." : "Save customized order"}
            </button>
            <button type="button" className="btn-secondary" onClick={cancelCustomize}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="customize-toggle">
        <button type="button" className="btn-secondary" onClick={() => setShowBilling((v) => !v)}>
          {showBilling ? "Hide billing" : "Billing"}
        </button>
      </div>

      {showBilling && (
        <div style={{ marginTop: 10 }}>
          <BillingPanel order={order} template={template} />
        </div>
      )}

      <div className="order-actions">
        <select
          className="status-select"
          value={order.status}
          onChange={(e) => onStatusChange(order.id, e.target.value)}
        >
          {Object.values(ORDER_STATUS).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
