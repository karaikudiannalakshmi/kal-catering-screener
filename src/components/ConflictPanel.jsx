// Given the current order and the full list of orders, work out whether any
// other order shares the same date + session, and whether they use the same
// menu template (likely just extra volume) or a different one (needs a
// senior-executive decision on how to reconcile the kitchen run). Also
// surfaces every other order on the same date regardless of session, as
// general reference for the day's overall load.
export default function ConflictPanel({ order, allOrders }) {
  const sameDate = allOrders.filter((o) => o.id !== order.id && o.orderDate === order.orderDate);
  const sameSession = sameDate.filter((o) => o.session === order.session);

  if (sameDate.length === 0) return null;

  // Prefer matching by template ID (set once menu templates are picked from the
  // dropdown); fall back to a name comparison for any older free-text orders.
  const sameAsOrder = (o) =>
    order.menuTemplateId && o.menuTemplateId
      ? o.menuTemplateId === order.menuTemplateId
      : o.menuTemplateName.trim().toLowerCase() === order.menuTemplateName.trim().toLowerCase();

  const sameTemplate = sameSession.filter(sameAsOrder);
  const diffTemplate = sameSession.filter((o) => !sameAsOrder(o));

  return (
    <div>
      {sameSession.length > 0 && diffTemplate.length === 0 && (
        <div className="conflict-box same-template">
          <div className="conflict-title">
            Same menu already booked this session — likely just a volume increase
          </div>
          <div>
            {sameTemplate.length} other order{sameTemplate.length > 1 ? "s" : ""} for "
            {order.menuTemplateName}" on this date/session. Combined packs across all of them:{" "}
            <strong>
              {[order, ...sameTemplate].reduce((sum, o) => sum + Number(o.packCount || 0), 0)}
            </strong>
            .
          </div>
        </div>
      )}

      {diffTemplate.length > 0 && (
        <div className="conflict-box diff-template">
          <div className="conflict-title">Different menu template booked for the same date and session</div>
          <div>
            {diffTemplate.length} other order{diffTemplate.length > 1 ? "s" : ""} on this date/session use a
            different template. Decide whether to run both templates in parallel or call the customer about
            aligning to one:
          </div>
          <ul>
            {diffTemplate.map((o) => (
              <li key={o.id}>
                {o.customerName} — "{o.menuTemplateName}" — {o.packCount} packs
              </li>
            ))}
          </ul>
          {sameTemplate.length > 0 && (
            <div style={{ marginTop: 8 }}>
              Also {sameTemplate.length} order{sameTemplate.length > 1 ? "s" : ""} already on the same
              template.
            </div>
          )}
        </div>
      )}

      <div className="conflict-box" style={{ background: "#fff8ec", color: "var(--ink)" }}>
        <div className="conflict-title" style={{ color: "var(--turmeric-dark)" }}>
          All orders on {order.orderDate} ({sameDate.length + 1} total, this one included)
        </div>
        <table style={{ width: "100%", marginTop: 6, borderCollapse: "collapse", fontSize: 13 }}>
          <tbody>
            {[order, ...sameDate]
              .slice()
              .sort((a, b) => (a.session || "").localeCompare(b.session || ""))
              .map((o) => (
                <tr
                  key={o.id}
                  style={{
                    borderTop: "1px solid var(--line)",
                    fontWeight: o.id === order.id ? 600 : 400,
                  }}
                >
                  <td style={{ padding: "5px 4px" }}>{o.session}</td>
                  <td style={{ padding: "5px 4px" }}>{o.customerName}</td>
                  <td style={{ padding: "5px 4px" }}>{o.menuTemplateName}</td>
                  <td style={{ padding: "5px 4px", textAlign: "right" }}>{o.packCount} packs</td>
                  <td style={{ padding: "5px 4px", textAlign: "right", color: "var(--ink-soft)" }}>
                    {o.id === order.id ? "(this order)" : o.status}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
