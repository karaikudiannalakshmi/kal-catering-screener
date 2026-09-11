import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase.js";
import { computeCustomerBill, findRecipeForItem } from "../lib/billing.js";
import { cleanRecipeName } from "../lib/displayName.js";
import { useRecipes } from "../lib/useRecipes.js";
import TermsAndConditions from "../components/TermsAndConditions.jsx";

export default function BillPage() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { recipes } = useRecipes();

  useEffect(() => {
    (async () => {
      try {
        const orderSnap = await getDoc(doc(db, "orders", orderId));
        if (!orderSnap.exists()) {
          setError("Order not found.");
          setLoading(false);
          return;
        }
        const orderData = { id: orderSnap.id, ...orderSnap.data() };
        setOrder(orderData);
        if (orderData.menuTemplateId) {
          const tplSnap = await getDoc(doc(db, "menuTemplates", orderData.menuTemplateId));
          if (tplSnap.exists()) setTemplate({ id: tplSnap.id, ...tplSnap.data() });
        }
      } catch (err) {
        console.error(err);
        setError("Could not load this order.");
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId]);

  if (loading) return <div className="loading-state">Loading bill…</div>;
  if (error) return <div className="empty-state">{error}</div>;

  const bill = computeCustomerBill({
    pricePerPack: template?.pricePerPack,
    packCount: order.packCount,
    adjustment: order.bill?.adjustment || 0,
    transportCharge: order.bill?.transportCharge || 0,
  });

  const items = order.customizedItems || template?.items || [];

  return (
    <div className="bill-wrapper">
      <style>{`
        body { background: #fff; }
        .bill-wrapper { max-width: 720px; margin: 0 auto; padding: 32px 24px; font-family: var(--font-body); color: var(--ink); }
        .bill-noprint { margin-bottom: 20px; }
        .bill-page { padding: 24px 0; }
        .bill-header { text-align: center; border-bottom: 2px solid var(--turmeric); padding-bottom: 16px; margin-bottom: 24px; }
        .bill-header h1 { font-family: var(--font-display); color: var(--turmeric-dark); font-size: 26px; }
        .bill-header .addr { color: var(--ink-soft); font-size: 13px; margin-top: 6px; }
        .bill-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin-bottom: 20px; font-size: 14px; }
        .bill-meta .lbl { color: var(--ink-soft); font-size: 12px; }
        .bill-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        .bill-table th { text-align: left; border-bottom: 2px solid var(--line); padding: 8px 4px; font-size: 12px; color: var(--ink-soft); }
        .bill-table td { padding: 10px 4px; border-bottom: 1px solid var(--line); font-size: 14px; }
        .bill-table td.num, .bill-table th.num { text-align: right; }
        .bill-total-row td { font-weight: 700; border-top: 2px solid var(--ink); border-bottom: none; }
        .bill-items-row td { padding-top: 0; }
        .bill-items-list { list-style: none; margin: 0; padding: 0; font-size: 12px; color: var(--ink-soft); }
        .bill-items-list li { padding: 2px 0; }
        .bill-items-list .tamil { font-family: var(--font-tamil); }
        .bill-gst-note { font-size: 12px; color: var(--ink-soft); margin-top: 4px; }
        .bill-terms { page-break-before: always; }
        .bill-terms-inner { max-width: 640px; }
        .bill-terms-title { font-family: var(--font-display); font-size: 20px; margin-bottom: 16px; }
        .bill-terms-list li { margin-bottom: 14px; font-size: 14px; line-height: 1.5; }
        .bill-terms-footer-note { margin-top: 20px; font-style: italic; }
        @media print {
          .bill-noprint { display: none; }
          .bill-wrapper { padding: 0; }
        }
      `}</style>

      <div className="bill-noprint" style={{ display: "flex", gap: 10 }}>
        <button className="btn-primary" onClick={() => window.print()}>
          Print / Save as PDF
        </button>
      </div>

      <div className="bill-page">
        <div className="bill-header">
          <h1>Karaikudi Annalakshmi</h1>
          <div className="addr">Koviloor Madalayam, 52, Kuppiah Street, West Mambalam. Ch - 33</div>
          <div className="addr">Cell: 9442623056</div>
        </div>

        <div className="bill-meta">
          <div>
            <div className="lbl">Bill to</div>
            <div>{order.customerName}</div>
          </div>
          <div>
            <div className="lbl">Phone</div>
            <div>{order.customerPhone}</div>
          </div>
          <div>
            <div className="lbl">Event address</div>
            <div>{order.deliveryAddress}</div>
          </div>
          <div>
            <div className="lbl">Date / Session</div>
            <div>
              {order.orderDate} · {order.session}
            </div>
          </div>
        </div>

        <table className="bill-table">
          <thead>
            <tr>
              <th>Description</th>
              <th className="num">Pax</th>
              <th className="num">Price / pack</th>
              <th className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{order.menuTemplateName}</td>
              <td className="num">{order.packCount}</td>
              <td className="num">₹{bill.finalPricePerPack.toLocaleString("en-IN")}</td>
              <td className="num">₹{bill.foodTotal.toLocaleString("en-IN")}</td>
            </tr>
            {items.length > 0 && (
              <tr className="bill-items-row">
                <td colSpan={4}>
                  <ul className="bill-items-list">
                    {items.map((item, i) => {
                      const recipe = findRecipeForItem(item, recipes);
                      return (
                        <li key={i}>
                          {cleanRecipeName(item.name)}
                          {recipe?.nameTamil && <span className="tamil"> · {recipe.nameTamil}</span>}
                        </li>
                      );
                    })}
                  </ul>
                </td>
              </tr>
            )}
            {order.bill?.transportCharge > 0 && (
              <tr>
                <td>
                  Transport
                  {order.bill?.transportNotes ? ` (${order.bill.transportNotes})` : ""}
                </td>
                <td className="num">—</td>
                <td className="num">—</td>
                <td className="num">₹{order.bill.transportCharge.toLocaleString("en-IN")}</td>
              </tr>
            )}
            <tr className="bill-total-row">
              <td colSpan={3}>Total</td>
              <td className="num">₹{bill.grandTotal.toLocaleString("en-IN")}</td>
            </tr>
          </tbody>
        </table>
        <div className="bill-gst-note">Price is inclusive of 5% GST.</div>
      </div>

      <TermsAndConditions />
    </div>
  );
}
