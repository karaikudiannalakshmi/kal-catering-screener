import { useState } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase.js";
import { buildWhatsAppLink } from "../lib/whatsapp.js";
import { computeCustomerBill, formatCustomerItemLine } from "../lib/billing.js";
import { ORDER_STATUS } from "../lib/constants.js";

function buildConfirmationMessage(order, bill, billUrl, items) {
  const lines = [
    "Your order is confirmed — Karaikudi Annalakshmi catering",
    "",
    `Date: ${order.orderDate}`,
    `Session: ${order.session}`,
    order.serviceTime ? `Serve time: ${order.serviceTime}` : null,
    `Venue: ${order.deliveryAddress}`,
    `Menu: ${order.menuTemplateName}`,
    `Pax: ${order.packCount}`,
  ];

  if (items?.length) {
    lines.push("", "Items:");
    for (const item of items) {
      lines.push(`- ${formatCustomerItemLine(item, order.session, order.packCount)}`);
    }
  }

  lines.push(
    "",
    `Price per pack: ₹${bill.finalPricePerPack.toLocaleString("en-IN")}`,
    order.bill?.transportCharge > 0 ? `Transport: ₹${order.bill.transportCharge.toLocaleString("en-IN")}` : null,
    `Total: ₹${bill.grandTotal.toLocaleString("en-IN")} (inclusive of 5% GST)`,
    "",
    `View your full bill and Terms & Conditions here: ${billUrl}`,
    "",
    "As per our Terms & Conditions, a 50% non-refundable advance is required to confirm this booking, " +
      "with the balance due at least 7 days before the event date.",
    "",
    "Thank you for choosing us!"
  );
  return lines.filter((l) => l !== null).join("\n");
}

export default function ConfirmationPanel({ order, template, items }) {
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);

  const bill = computeCustomerBill({
    pricePerPack: template?.pricePerPack,
    packCount: order.packCount,
    adjustment: order.bill?.adjustment || 0,
    transportCharge: order.bill?.transportCharge || 0,
  });

  const billUrl = `${window.location.origin}${window.location.pathname}#/bill/${order.id}`;
  const message = buildConfirmationMessage(order, bill, billUrl, items);

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

  async function sendAndMarkConfirmed() {
    setSending(true);
    try {
      await updateDoc(doc(db, "orders", order.id), {
        status: ORDER_STATUS.CONFIRMED,
        confirmedAt: serverTimestamp(),
      });
      window.open(buildWhatsAppLink(order.customerPhone, message), "_blank", "noopener");
    } catch (err) {
      console.error(err);
      alert("Could not update the order status. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  const alreadyConfirmed =
    order.status === ORDER_STATUS.CONFIRMED || order.status === ORDER_STATUS.EXECUTED;

  return (
    <div className="conflict-box" style={{ background: "var(--leaf-soft)", color: "var(--ink)" }}>
      <div className="conflict-title" style={{ color: "var(--leaf)" }}>
        {alreadyConfirmed ? "Confirmation" : "Send confirmation to customer"}
      </div>
      {template?.pricePerPack == null && (
        <div style={{ fontSize: 12, color: "var(--alert)", marginBottom: 8 }}>
          This template has no price set yet — the message below will show ₹0. Set a price under Menu
          templates first, or use Billing to adjust it for this order.
        </div>
      )}
      <textarea
        readOnly
        value={message}
        style={{
          width: "100%",
          minHeight: 210,
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
        <button type="button" className="btn-primary" onClick={sendAndMarkConfirmed} disabled={sending}>
          {sending ? "Sending..." : alreadyConfirmed ? "Re-send via WhatsApp" : "Send via WhatsApp & mark Confirmed"}
        </button>
        <button type="button" className="btn-secondary" onClick={copyMessage}>
          {copied ? "Copied!" : "Copy message"}
        </button>
      </div>
      {order.confirmedAt && (
        <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 8 }}>
          Marked confirmed — status is tracked below; use the status dropdown if you need to change it
          manually (e.g. confirmed by phone call instead).
        </div>
      )}
    </div>
  );
}
