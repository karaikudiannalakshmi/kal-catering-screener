import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase.js";
import { ORDER_STATUS, STATUS_LABELS, SESSIONS, ADDITIONAL_SERVICES } from "../lib/constants.js";
import ConflictPanel from "./ConflictPanel.jsx";
import ItemListEditor from "./ItemListEditor.jsx";
import PersonnelMessage from "./PersonnelMessage.jsx";
import BillingPanel from "./BillingPanel.jsx";
import ConfirmationPanel from "./ConfirmationPanel.jsx";

function SectionHeading({ children }) {
  return (
    <h3 style={{ fontSize: 15, marginTop: 24, marginBottom: 10, paddingBottom: 6, borderBottom: "1px solid var(--line)" }}>
      {children}
    </h3>
  );
}

export default function OrderCard({ order, allOrders, templates, contractors, onStatusChange }) {
  const [customizing, setCustomizing] = useState(false);
  const [draftItems, setDraftItems] = useState(null);
  const [savingItems, setSavingItems] = useState(false);
  const [showBilling, setShowBilling] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [editingDetails, setEditingDetails] = useState(false);
  const [detailsDraft, setDetailsDraft] = useState(null);
  const [savingDetails, setSavingDetails] = useState(false);
  const [statusSaved, setStatusSaved] = useState(false);

  const template = templates.find((t) => t.id === order.menuTemplateId);
  const itemsToShow = order.customizedItems || template?.items;

  function startCustomize() {
    const base = order.customizedItems || template?.items || [];
    setDraftItems(base.map((it) => ({ ...it })));
    setCustomizing(true);
  }

  function cancelCustomize() {
    setCustomizing(false);
    setDraftItems(null);
  }

  async function saveCustomize() {
    setSavingItems(true);
    try {
      await updateDoc(doc(db, "orders", order.id), {
        customizedItems: draftItems,
        isCustomized: true,
      });
      setCustomizing(false);
      setDraftItems(null);
    } catch (err) {
      console.error(err);
      alert("Could not save the item changes. Check your connection and try again.");
    } finally {
      setSavingItems(false);
    }
  }

  function startEditDetails() {
    setDetailsDraft({
      customerName: order.customerName || "",
      customerPhone: order.customerPhone || "",
      deliveryAddress: order.deliveryAddress || "",
      orderDate: order.orderDate || "",
      session: order.session || "",
      packCount: order.packCount ?? "",
      serviceTime: order.serviceTime || "",
      siteDistanceKm: order.siteDistanceKm ?? "",
      needsLiveCounter: !!order.needsLiveCounter,
      needsServicePersonnel: !!order.needsServicePersonnel,
      additionalServices: order.additionalServices || [],
      notes: order.notes || "",
    });
    setEditingDetails(true);
  }

  function toggleDraftService(service) {
    setDetailsDraft((d) => {
      const has = d.additionalServices.includes(service);
      return {
        ...d,
        additionalServices: has
          ? d.additionalServices.filter((s) => s !== service)
          : [...d.additionalServices, service],
      };
    });
  }

  async function saveDetails() {
    setSavingDetails(true);
    try {
      await updateDoc(doc(db, "orders", order.id), {
        customerName: detailsDraft.customerName.trim(),
        customerPhone: detailsDraft.customerPhone.trim(),
        deliveryAddress: detailsDraft.deliveryAddress.trim(),
        orderDate: detailsDraft.orderDate,
        session: detailsDraft.session,
        packCount: Number(detailsDraft.packCount) || 0,
        serviceTime: detailsDraft.serviceTime,
        siteDistanceKm: detailsDraft.siteDistanceKm === "" ? null : Number(detailsDraft.siteDistanceKm),
        needsLiveCounter: detailsDraft.needsLiveCounter,
        needsServicePersonnel: detailsDraft.needsServicePersonnel,
        additionalServices: detailsDraft.additionalServices,
        notes: detailsDraft.notes.trim(),
      });
      setEditingDetails(false);
      setDetailsDraft(null);
    } catch (err) {
      console.error(err);
      alert("Could not save these changes. Check your connection and try again.");
    } finally {
      setSavingDetails(false);
    }
  }

  async function handleStatusChange(newStatus) {
    await onStatusChange(order.id, newStatus);
    setStatusSaved(true);
    setTimeout(() => setStatusSaved(false), 1800);
  }

  return (
    <div className="order-card">
      <div className="order-card-head">
        <div>
          <h3>
            {order.customerName}
            {order.isCustomized && <span className="customized-badge">Items edited</span>}
          </h3>
          <div className="order-meta">
            {order.customerPhone} · {order.deliveryAddress}
          </div>
        </div>
        <span className={`status-pill ${order.status}`}>{STATUS_LABELS[order.status]}</span>
      </div>

      <SectionHeading>Order details</SectionHeading>

      {!editingDetails && (
        <>
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

          <button type="button" className="btn-secondary" style={{ marginTop: 12 }} onClick={startEditDetails}>
            Edit order details
          </button>
        </>
      )}

      {editingDetails && detailsDraft && (
        <div className="card" style={{ padding: "16px 18px" }}>
          <div className="field-row">
            <div className="field">
              <label>Customer name</label>
              <input
                type="text"
                value={detailsDraft.customerName}
                onChange={(e) => setDetailsDraft((d) => ({ ...d, customerName: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Phone number</label>
              <input
                type="tel"
                value={detailsDraft.customerPhone}
                onChange={(e) => setDetailsDraft((d) => ({ ...d, customerPhone: e.target.value }))}
              />
            </div>
          </div>
          <div className="field">
            <label>Delivery address</label>
            <textarea
              value={detailsDraft.deliveryAddress}
              onChange={(e) => setDetailsDraft((d) => ({ ...d, deliveryAddress: e.target.value }))}
            />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Date</label>
              <input
                type="date"
                value={detailsDraft.orderDate}
                onChange={(e) => setDetailsDraft((d) => ({ ...d, orderDate: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Session</label>
              <select
                value={detailsDraft.session}
                onChange={(e) => setDetailsDraft((d) => ({ ...d, session: e.target.value }))}
              >
                {SESSIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Number of packs</label>
              <input
                type="number"
                min="1"
                value={detailsDraft.packCount}
                onChange={(e) => setDetailsDraft((d) => ({ ...d, packCount: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Serve time</label>
              <input
                type="time"
                value={detailsDraft.serviceTime}
                onChange={(e) => setDetailsDraft((d) => ({ ...d, serviceTime: e.target.value }))}
              />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Site distance (km)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={detailsDraft.siteDistanceKm}
                onChange={(e) => setDetailsDraft((d) => ({ ...d, siteDistanceKm: e.target.value }))}
              />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Live counter?</label>
              <div className="checkbox-grid">
                {[true, false].map((v) => (
                  <label key={String(v)} className={`checkbox-chip${detailsDraft.needsLiveCounter === v ? " checked" : ""}`}>
                    <input
                      type="radio"
                      checked={detailsDraft.needsLiveCounter === v}
                      onChange={() => setDetailsDraft((d) => ({ ...d, needsLiveCounter: v }))}
                    />
                    {v ? "Yes" : "No"}
                  </label>
                ))}
              </div>
            </div>
            <div className="field">
              <label>Service personnel?</label>
              <div className="checkbox-grid">
                {[true, false].map((v) => (
                  <label key={String(v)} className={`checkbox-chip${detailsDraft.needsServicePersonnel === v ? " checked" : ""}`}>
                    <input
                      type="radio"
                      checked={detailsDraft.needsServicePersonnel === v}
                      onChange={() => setDetailsDraft((d) => ({ ...d, needsServicePersonnel: v }))}
                    />
                    {v ? "Yes" : "No"}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="field">
            <label>Other services</label>
            <div className="checkbox-grid">
              {ADDITIONAL_SERVICES.map((service) => {
                const checked = detailsDraft.additionalServices.includes(service);
                return (
                  <label key={service} className={`checkbox-chip${checked ? " checked" : ""}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggleDraftService(service)} />
                    {service}
                  </label>
                );
              })}
            </div>
          </div>
          <div className="field">
            <label>Notes</label>
            <textarea
              value={detailsDraft.notes}
              onChange={(e) => setDetailsDraft((d) => ({ ...d, notes: e.target.value }))}
            />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="btn-primary" onClick={saveDetails} disabled={savingDetails}>
              {savingDetails ? "Saving..." : "Save details"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setEditingDetails(false);
                setDetailsDraft(null);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <SectionHeading>Reference — other orders for the day</SectionHeading>
      <ConflictPanel order={order} allOrders={allOrders} />

      <SectionHeading>Menu items — add, substitute, or remove</SectionHeading>

      {!customizing && (
        <>
          {itemsToShow && (
            <table style={{ width: "100%", marginBottom: 10, borderCollapse: "collapse", fontSize: 13 }}>
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
          <button type="button" className="btn-secondary" onClick={startCustomize}>
            {order.isCustomized ? "Edit items" : "Add, substitute, or remove items"}
          </button>
        </>
      )}

      {customizing && (
        <div className="customize-panel">
          <ItemListEditor items={draftItems} onChange={setDraftItems} />
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button type="button" className="btn-primary" onClick={saveCustomize} disabled={savingItems}>
              {savingItems ? "Saving..." : "Save item changes"}
            </button>
            <button type="button" className="btn-secondary" onClick={cancelCustomize}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {order.needsServicePersonnel && (
        <>
          <SectionHeading>Service personnel</SectionHeading>
          <PersonnelMessage order={order} contractors={contractors} items={itemsToShow} />
        </>
      )}

      <SectionHeading>Billing &amp; confirmation</SectionHeading>
      <div style={{ display: "flex", gap: 10 }}>
        <button type="button" className="btn-secondary" onClick={() => setShowBilling((v) => !v)}>
          {showBilling ? "Hide billing" : "Billing"}
        </button>
        <button type="button" className="btn-secondary" onClick={() => setShowConfirmation((v) => !v)}>
          {showConfirmation ? "Hide confirmation" : "Confirmation"}
        </button>
      </div>

      {showBilling && (
        <div style={{ marginTop: 10 }}>
          <BillingPanel order={order} template={template} />
        </div>
      )}

      {showConfirmation && (
        <div style={{ marginTop: 10 }}>
          <ConfirmationPanel order={order} template={template} items={itemsToShow} />
        </div>
      )}

      <SectionHeading>Status</SectionHeading>
      <div className="order-actions" style={{ alignItems: "center" }}>
        <select
          className="status-select"
          value={order.status}
          onChange={(e) => handleStatusChange(e.target.value)}
        >
          {Object.values(ORDER_STATUS).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        {statusSaved && <span style={{ color: "var(--leaf)", fontSize: 13 }}>Saved</span>}
      </div>
    </div>
  );
}
