import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase.js";
import { buildWhatsAppLink } from "../lib/whatsapp.js";
import { cleanRecipeName } from "../lib/displayName.js";

function buildMessage(order, personnelCount, items) {
  const lines = [
    "Service personnel required — Karaikudi Annalakshmi catering",
    "",
    `Date: ${order.orderDate}`,
    order.serviceTime ? `Time: ${order.serviceTime}` : null,
    `Venue: ${order.deliveryAddress}`,
    `Pax: ${order.packCount}`,
    `Personnel needed for table service: ${personnelCount}`,
  ];

  if (items?.length) {
    lines.push("", "Menu items:");
    for (const item of items) {
      lines.push(`- ${cleanRecipeName(item.name)}`);
    }
  }

  lines.push("", "Please confirm availability.");

  return lines.filter((l) => l !== null).join("\n");
}


export default function PersonnelMessage({ order, contractors, items }) {
  const [personnelCount, setPersonnelCount] = useState(order.personnelCount ?? "");
  const [contractorId, setContractorId] = useState(order.contractorId || "");
  const [copied, setCopied] = useState(false);

  const contractor = contractors.find((c) => c.id === contractorId);

  async function commitPersonnelCount() {
    const value = personnelCount === "" ? null : Number(personnelCount);
    if (value === order.personnelCount) return;
    try {
      await updateDoc(doc(db, "orders", order.id), { personnelCount: value });
    } catch (err) {
      console.error(err);
    }
  }

  async function commitContractor(id) {
    setContractorId(id);
    try {
      await updateDoc(doc(db, "orders", order.id), { contractorId: id || null });
    } catch (err) {
      console.error(err);
    }
  }

  const message = buildMessage(order, personnelCount || "?", items);

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
      alert("Could not copy — select and copy the message text manually.");
    }
  }

  function sendOnWhatsApp() {
    if (!contractor) {
      alert("Pick a contractor first (add one under 'Service contractors' if the list is empty).");
      return;
    }
    window.open(buildWhatsAppLink(contractor.phone, message), "_blank", "noopener");
  }

  return (
    <div className="conflict-box" style={{ background: "var(--leaf-soft)", color: "var(--ink)" }}>
      <div className="conflict-title" style={{ color: "var(--leaf)" }}>
        Service personnel needed — decide headcount and notify the contractor
      </div>

      <div className="field-row" style={{ marginTop: 10, marginBottom: 0 }}>
        <div className="field" style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 12 }}>
            Number of personnel (based on pax, hall capacity, and items served)
          </label>
          <input
            type="number"
            min="0"
            value={personnelCount}
            onChange={(e) => setPersonnelCount(e.target.value)}
            onBlur={commitPersonnelCount}
            style={{ width: 120, padding: "7px 10px", border: "1px solid var(--line)", borderRadius: 6 }}
          />
        </div>
        <div className="field" style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 12 }}>Contractor</label>
          <select
            value={contractorId}
            onChange={(e) => commitContractor(e.target.value)}
            style={{ padding: "7px 10px", border: "1px solid var(--line)", borderRadius: 6 }}
          >
            <option value="">Select contractor</option>
            {contractors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {contractors.length === 0 && (
            <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 4 }}>
              None added yet — add one under "Service contractors".
            </div>
          )}
        </div>
      </div>

      <textarea
        readOnly
        value={message}
        style={{
          width: "100%",
          minHeight: 130,
          fontSize: 13,
          padding: 10,
          border: "1px solid var(--line)",
          borderRadius: 6,
          fontFamily: "var(--font-body)",
          background: "#fff",
          color: "var(--ink)",
        }}
      />

      <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
        <button type="button" className="btn-primary" onClick={sendOnWhatsApp}>
          Send via WhatsApp
        </button>
        <button type="button" className="btn-secondary" onClick={copyMessage}>
          {copied ? "Copied!" : "Copy message"}
        </button>
      </div>
    </div>
  );
}
