import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase.js";
import { SESSIONS, ADDITIONAL_SERVICES, ORDER_STATUS } from "../lib/constants.js";
import { buildAcknowledgementMessage } from "../lib/acknowledgement.js";
import { buildWhatsAppLink } from "../lib/whatsapp.js";

const emptyForm = {
  customerName: "",
  customerPhone: "",
  deliveryAddress: "",
  orderDate: "",
  session: "",
  packCount: "",
  menuTemplateId: "",
  menuTemplateName: "",
  needsLiveCounter: "",
  needsServicePersonnel: "",
  serviceTime: "",
  siteDistanceKm: "",
  additionalServices: [],
  notes: "",
};

export default function ScreenerForm() {
  const [searchParams] = useSearchParams();
  const submissionId = searchParams.get("submissionId");
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null); // { type: 'success' | 'error', message }
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [savedOrder, setSavedOrder] = useState(null); // the order just saved, for the acknowledgement panel
  const [ackCopied, setAckCopied] = useState(false);
  const [prefilledFrom, setPrefilledFrom] = useState(null); // submission doc, if this form was opened from one

  useEffect(() => {
    const q = query(collection(db, "menuTemplates"), orderBy("session"), orderBy("name"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setTemplates(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setTemplatesLoading(false);
      },
      (err) => {
        console.error(err);
        setTemplatesLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const templatesForSession = useMemo(
    () => templates.filter((t) => !form.session || t.session === form.session),
    [templates, form.session]
  );

  useEffect(() => {
    if (!submissionId || templatesLoading) return;
    getDoc(doc(db, "customerSubmissions", submissionId))
      .then((snap) => {
        if (!snap.exists()) return;
        const sub = { id: snap.id, ...snap.data() };
        setPrefilledFrom(sub);
        const tpl = templates.find((t) => t.id === sub.menuTemplateId);
        setForm((f) => ({
          ...f,
          customerName: sub.customerName || "",
          customerPhone: sub.customerPhone || "",
          deliveryAddress: sub.deliveryAddress || "",
          orderDate: sub.orderDate || "",
          packCount: sub.packCount != null ? String(sub.packCount) : "",
          session: sub.session || tpl?.session || sub.menuTemplateSession || "",
          menuTemplateId: sub.menuTemplateId || "",
          menuTemplateName: sub.menuTemplateName || "",
          needsLiveCounter: sub.needsLiveCounter ? "yes" : sub.needsLiveCounter === false ? "no" : "",
          needsServicePersonnel:
            sub.needsServicePersonnel ? "yes" : sub.needsServicePersonnel === false ? "no" : "",
          notes: sub.wantsChanges && sub.changeRequest ? `Customer requested change: ${sub.changeRequest}` : "",
        }));
      })
      .catch((err) => console.error(err));
    // Only run once templates are ready and we have a submission to load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId, templatesLoading]);

  const selectedTemplate = templates.find((t) => t.id === form.menuTemplateId);

  function update(field, value) {
    setForm((f) => {
      const next = { ...f, [field]: value };
      // Dropping the session invalidates a template chosen for a different session
      if (field === "session") {
        const tpl = templates.find((t) => t.id === f.menuTemplateId);
        if (tpl && tpl.session !== value) {
          next.menuTemplateId = "";
          next.menuTemplateName = "";
        }
      }
      return next;
    });
  }

  function handleTemplateSelect(id) {
    const tpl = templates.find((t) => t.id === id);
    setForm((f) => ({ ...f, menuTemplateId: id, menuTemplateName: tpl ? tpl.name : "" }));
  }

  function toggleService(service) {
    setForm((f) => {
      const has = f.additionalServices.includes(service);
      return {
        ...f,
        additionalServices: has
          ? f.additionalServices.filter((s) => s !== service)
          : [...f.additionalServices, service],
      };
    });
  }

  function validate() {
    if (!form.customerName.trim()) return "Customer name is required.";
    if (!form.customerPhone.trim()) return "Phone number is required.";
    if (!form.deliveryAddress.trim()) return "Delivery address is required.";
    if (!form.orderDate) return "Order date is required.";
    if (!form.session) return "Session is required.";
    if (!form.packCount || Number(form.packCount) <= 0) return "Number of packs must be greater than 0.";
    if (!form.menuTemplateId) return "Menu template is required.";
    if (!form.needsLiveCounter) return "Please answer whether live counters are needed.";
    if (!form.needsServicePersonnel) return "Please answer whether service personnel are needed.";
    if (!form.serviceTime) return "The time the customer wants food served is required.";
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const error = validate();
    if (error) {
      setResult({ type: "error", message: error });
      return;
    }
    setSaving(true);
    setResult(null);
    try {
      const orderData = {
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim(),
        deliveryAddress: form.deliveryAddress.trim(),
        orderDate: form.orderDate,
        session: form.session,
        packCount: Number(form.packCount),
        menuTemplateId: form.menuTemplateId,
        menuTemplateName: form.menuTemplateName,
        needsLiveCounter: form.needsLiveCounter === "yes",
        needsServicePersonnel: form.needsServicePersonnel === "yes",
        serviceTime: form.serviceTime,
        siteDistanceKm: form.siteDistanceKm ? Number(form.siteDistanceKm) : null,
        additionalServices: form.additionalServices,
        notes: form.notes.trim(),
        status: ORDER_STATUS.SCREENED,
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, "orders"), orderData);
      setSavedOrder({ ...orderData, templateItems: selectedTemplate?.items || [] });
      setAckCopied(false);
      setForm(emptyForm);
      if (prefilledFrom) {
        try {
          await updateDoc(doc(db, "customerSubmissions", prefilledFrom.id), { status: "used" });
        } catch (err) {
          console.error(err);
        }
        setPrefilledFrom(null);
      }
      setResult({ type: "success", message: "Order screened and saved. The senior executive will review it against today's other bookings." });
    } catch (err) {
      console.error(err);
      setResult({ type: "error", message: "Could not save the order. Check your connection and try again." });
    } finally {
      setSaving(false);
    }
  }

  const ackMessage = savedOrder ? buildAcknowledgementMessage(savedOrder, savedOrder.templateItems) : "";

  async function copyAck() {
    try {
      await navigator.clipboard.writeText(ackMessage);
      setAckCopied(true);
      setTimeout(() => setAckCopied(false), 2000);
    } catch (err) {
      console.error(err);
      alert("Could not copy — select and copy the message text manually.");
    }
  }

  function sendAckOnWhatsApp() {
    window.open(buildWhatsAppLink(savedOrder.customerPhone, ackMessage), "_blank", "noopener");
  }

  return (
    <div>
      <div className="page-head">
        <h1>Take a new order</h1>
        <p>
          Capture the essentials so the senior executive can pick it up, check it against the day's other
          orders, and finalize pricing and menu details with the customer.
        </p>
      </div>

      {prefilledFrom && (
        <div className="notice-success" style={{ marginBottom: 16 }}>
          Name, phone, address, date, packs, session, menu, live-counter and service-staff answers were
          filled in directly by the customer — any requested menu change is copied into the notes below.
          Double-check everything and add the serve time.
        </div>
      )}

      <form className="card" onSubmit={handleSubmit}>
        <div className="field-row">
          <div className="field">
            <label htmlFor="customerName">Customer name</label>
            <input
              id="customerName"
              type="text"
              value={form.customerName}
              onChange={(e) => update("customerName", e.target.value)}
              placeholder="e.g. Mrs. Kalyani Raman"
            />
          </div>
          <div className="field">
            <label htmlFor="customerPhone">Phone number</label>
            <input
              id="customerPhone"
              type="tel"
              value={form.customerPhone}
              onChange={(e) => update("customerPhone", e.target.value)}
              placeholder="e.g. 98765 43210"
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="deliveryAddress">Delivery address</label>
          <textarea
            id="deliveryAddress"
            value={form.deliveryAddress}
            onChange={(e) => update("deliveryAddress", e.target.value)}
            placeholder="Full delivery address, including landmark if useful"
          />
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="orderDate">Date required</label>
            <input
              id="orderDate"
              type="date"
              value={form.orderDate}
              onChange={(e) => update("orderDate", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="session">Session</label>
            <select id="session" value={form.session} onChange={(e) => update("session", e.target.value)}>
              <option value="">Select session</option>
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
            <label htmlFor="packCount">Number of packs</label>
            <input
              id="packCount"
              type="number"
              min="1"
              value={form.packCount}
              onChange={(e) => update("packCount", e.target.value)}
              placeholder="e.g. 250"
            />
          </div>
          <div className="field">
            <label htmlFor="menuTemplateId">Menu template chosen</label>
            <select
              id="menuTemplateId"
              value={form.menuTemplateId}
              onChange={(e) => handleTemplateSelect(e.target.value)}
              disabled={templatesLoading}
            >
              <option value="">
                {templatesLoading
                  ? "Loading templates…"
                  : form.session
                  ? `Select a ${form.session.toLowerCase()} template`
                  : "Select session first, or pick from all templates"}
              </option>
              {templatesForSession.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {!templatesLoading && templatesForSession.length === 0 && (
              <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 6 }}>
                No templates saved for this session yet — add one under "Menu templates".
              </div>
            )}
          </div>
        </div>

        {selectedTemplate && (
          <div className="field">
            <label>Items in "{selectedTemplate.name}" (per pack)</label>
            <div className="card" style={{ padding: "12px 16px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <tbody>
                  {selectedTemplate.items.map((item, i) => (
                    <tr key={i} style={{ borderTop: i > 0 ? "1px solid var(--line)" : "none" }}>
                      <td style={{ padding: "4px 0", color: "var(--ink-soft)" }}>{item.name}</td>
                      <td style={{ padding: "4px 0", textAlign: "right" }}>
                        {item.quantity} {item.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="field">
          <label>Other services requested</label>
          <div className="checkbox-grid">
            {ADDITIONAL_SERVICES.map((service) => {
              const checked = form.additionalServices.includes(service);
              return (
                <label key={service} className={`checkbox-chip${checked ? " checked" : ""}`}>
                  <input type="checkbox" checked={checked} onChange={() => toggleService(service)} />
                  {service}
                </label>
              );
            })}
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label>Do we need to provide live counters?</label>
            <div className="checkbox-grid">
              {["yes", "no"].map((v) => (
                <label key={v} className={`checkbox-chip${form.needsLiveCounter === v ? " checked" : ""}`}>
                  <input
                    type="radio"
                    name="needsLiveCounter"
                    checked={form.needsLiveCounter === v}
                    onChange={() => update("needsLiveCounter", v)}
                  />
                  {v === "yes" ? "Yes" : "No"}
                </label>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Does the customer need persons to serve food?</label>
            <div className="checkbox-grid">
              {["yes", "no"].map((v) => (
                <label
                  key={v}
                  className={`checkbox-chip${form.needsServicePersonnel === v ? " checked" : ""}`}
                >
                  <input
                    type="radio"
                    name="needsServicePersonnel"
                    checked={form.needsServicePersonnel === v}
                    onChange={() => update("needsServicePersonnel", v)}
                  />
                  {v === "yes" ? "Yes" : "No"}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="serviceTime">What time do they want the food served?</label>
            <input
              id="serviceTime"
              type="time"
              value={form.serviceTime}
              onChange={(e) => update("serviceTime", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="siteDistanceKm">Distance to delivery site (km)</label>
            <input
              id="siteDistanceKm"
              type="number"
              min="0"
              step="0.1"
              value={form.siteDistanceKm}
              onChange={(e) => update("siteDistanceKm", e.target.value)}
              placeholder="Check Google Maps and enter the distance"
            />
            <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 6 }}>
              Look this up on Google Maps outside the app and enter it here — used for
              planning dispatch time, no map integration needed.
            </div>
          </div>
        </div>

        <div className="field">
          <label htmlFor="notes">Notes on customer's specific requirements</label>
          <textarea
            id="notes"
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            placeholder="Anything the senior executive should know before calling back — dietary notes, event type, tone of the customer, etc."
          />
        </div>

        <button className="btn-primary" type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save screened order"}
        </button>

        {result && (
          <div className={result.type === "success" ? "notice-success" : "notice-error"}>
            {result.message}
          </div>
        )}
      </form>

      {savedOrder && (
        <div className="card" style={{ marginTop: 20, background: "var(--leaf-soft)" }}>
          <div className="order-card-head">
            <h3 style={{ color: "var(--leaf)" }}>Send acknowledgement to {savedOrder.customerName}</h3>
            <button type="button" className="btn-secondary" onClick={() => setSavedOrder(null)}>
              Dismiss
            </button>
          </div>
          <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 4 }}>
            Confirms the order's been taken for evaluation and lists everything noted down, so there's no
            confusion later about what was discussed.
          </p>
          <textarea
            readOnly
            value={ackMessage}
            style={{
              width: "100%",
              minHeight: 220,
              fontSize: 13,
              padding: 10,
              marginTop: 10,
              border: "1px solid var(--line)",
              borderRadius: 6,
              fontFamily: "var(--font-body)",
              background: "#fff",
              color: "var(--ink)",
            }}
          />
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <button type="button" className="btn-primary" onClick={sendAckOnWhatsApp}>
              Send via WhatsApp
            </button>
            <button type="button" className="btn-secondary" onClick={copyAck}>
              {ackCopied ? "Copied!" : "Copy message"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
