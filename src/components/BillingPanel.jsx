import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase.js";
import { useRecipes } from "../lib/useRecipes.js";
import { computeItemizedEstimate, computeCustomerBill } from "../lib/billing.js";

export default function BillingPanel({ order, template }) {
  const { recipes, loading: recipesLoading } = useRecipes();
  const items = order.customizedItems || template?.items || [];
  const [rateEdits, setRateEdits] = useState({}); // { [recipeId]: rate }
  const [savingRateId, setSavingRateId] = useState(null);
  const [adjustment, setAdjustment] = useState(order.bill?.adjustment ?? 0);
  const [transportCharge, setTransportCharge] = useState(order.bill?.transportCharge ?? 0);
  const [transportNotes, setTransportNotes] = useState(order.bill?.transportNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (recipesLoading) return <div className="loading-state">Loading recipe rates…</div>;

  const estimate = computeItemizedEstimate(items, order.packCount, recipes);
  const pricePerPack = template?.pricePerPack ?? null;
  const bill = computeCustomerBill({
    pricePerPack,
    packCount: order.packCount,
    adjustment: Number(adjustment) || 0,
    transportCharge: Number(transportCharge) || 0,
  });

  async function saveRate(recipeId, rawName) {
    const value = rateEdits[recipeId];
    if (value === undefined || value === "") return;
    setSavingRateId(recipeId);
    try {
      // recipeId is only set when the item matched a real recipe; if it
      // didn't match anything (recipeId is null), there's nowhere to save
      // the rate — flag that instead of silently doing nothing.
      if (!recipeId) {
        alert(`"${rawName}" doesn't match any recipe in the catalog — add it under the Recipes tab first.`);
        return;
      }
      await updateDoc(doc(db, "recipes", recipeId), { rate: Number(value) });
    } catch (err) {
      console.error(err);
      alert("Could not save the rate. Check your connection and try again.");
    } finally {
      setSavingRateId(null);
    }
  }

  async function saveBillingDetails() {
    setSaving(true);
    try {
      await updateDoc(doc(db, "orders", order.id), {
        bill: {
          adjustment: Number(adjustment) || 0,
          transportCharge: Number(transportCharge) || 0,
          transportNotes: transportNotes.trim(),
        },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
      alert("Could not save billing details. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="conflict-box" style={{ background: "#fff8ec", color: "var(--ink)" }}>
      <div className="conflict-title" style={{ color: "var(--turmeric-dark)" }}>
        Billing — internal food-cost estimate (not shown to the customer)
      </div>

      <table style={{ width: "100%", marginTop: 10, borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: "left", color: "var(--ink-soft)", fontSize: 11 }}>
            <th style={{ padding: "4px 0" }}>Item</th>
            <th style={{ padding: "4px 0", textAlign: "right" }}>Qty (all packs)</th>
            <th style={{ padding: "4px 0", textAlign: "right" }}>Rate</th>
            <th style={{ padding: "4px 0", textAlign: "right" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {estimate.lines.map((line, i) => (
            <tr key={i} style={{ borderTop: "1px solid var(--line)" }}>
              <td style={{ padding: "5px 0" }}>
                {line.name}
                {line.nameTamil && (
                  <span style={{ display: "block", fontSize: 11, color: "var(--ink-soft)", fontFamily: "var(--font-tamil)" }}>
                    {line.nameTamil}
                  </span>
                )}
              </td>
              <td style={{ padding: "5px 0", textAlign: "right" }}>
                {line.totalQty} {line.unit}
              </td>
              <td style={{ padding: "5px 0", textAlign: "right" }}>
                {line.rate != null ? (
                  `₹${line.rate}`
                ) : (
                  <div style={{ display: "flex", gap: 4, justifyContent: "flex-end", alignItems: "center" }}>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Set rate"
                      value={rateEdits[line.recipeId] ?? ""}
                      onChange={(e) =>
                        setRateEdits((r) => ({ ...r, [line.recipeId || line.rawName]: e.target.value }))
                      }
                      style={{ width: 70, padding: "3px 6px", border: "1px solid var(--alert)", borderRadius: 4 }}
                    />
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: "3px 8px", fontSize: 11 }}
                      onClick={() => saveRate(line.recipeId, line.rawName)}
                      disabled={savingRateId === line.recipeId}
                    >
                      Save
                    </button>
                  </div>
                )}
              </td>
              <td style={{ padding: "5px 0", textAlign: "right" }}>
                {line.amount != null ? `₹${line.amount.toLocaleString("en-IN")}` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {estimate.missing.length > 0 && (
        <div style={{ marginTop: 8, fontSize: 12, color: "var(--alert)" }}>
          {estimate.missing.length} item{estimate.missing.length > 1 ? "s" : ""} missing a rate — enter it
          above before generating the bill.
        </div>
      )}

      <div style={{ marginTop: 10, fontSize: 13 }}>
        Itemized cost estimate: <strong>₹{estimate.knownTotal.toLocaleString("en-IN")}</strong>
        {estimate.missing.length > 0 && " (incomplete — some rates missing)"}
        {" · "}Template fixed price: <strong>{pricePerPack != null ? `₹${pricePerPack}/pack` : "not set"}</strong>
      </div>

      <div className="field-row" style={{ marginTop: 14, marginBottom: 0 }}>
        <div className="field" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: 12 }}>Rate adjustment (+/-, internal only)</label>
          <input
            type="number"
            step="1"
            value={adjustment}
            onChange={(e) => setAdjustment(e.target.value)}
          />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: 12 }}>Transport charge (₹, per operator's tariff)</label>
          <input
            type="number"
            min="0"
            step="1"
            value={transportCharge}
            onChange={(e) => setTransportCharge(e.target.value)}
          />
        </div>
      </div>

      <div className="field" style={{ marginTop: 10, marginBottom: 0 }}>
        <label style={{ fontSize: 12 }}>Transport notes (optional — operator, vehicle, etc.)</label>
        <input type="text" value={transportNotes} onChange={(e) => setTransportNotes(e.target.value)} />
      </div>

      <div style={{ marginTop: 12, fontSize: 13, background: "#fff", borderRadius: 6, padding: "10px 12px" }}>
        Final price per pack: <strong>₹{bill.finalPricePerPack.toLocaleString("en-IN")}</strong>
        {" · "}Food total: <strong>₹{bill.foodTotal.toLocaleString("en-IN")}</strong>
        {" · "}Grand total (with transport): <strong>₹{bill.grandTotal.toLocaleString("en-IN")}</strong>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <button type="button" className="btn-primary" onClick={saveBillingDetails} disabled={saving}>
          {saving ? "Saving..." : saved ? "Saved!" : "Save billing details"}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => window.open(`#/bill/${order.id}`, "_blank", "noopener")}
        >
          View / print bill
        </button>
      </div>
    </div>
  );
}
