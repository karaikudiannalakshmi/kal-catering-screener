// Given the current order and the full list of orders, work out whether any
// other order shares the same date + session, and whether they use the same
// menu template (likely just extra volume) or a different one (needs a
// senior-executive decision on how to reconcile the kitchen run).
export default function ConflictPanel({ order, allOrders }) {
  const others = allOrders.filter(
    (o) => o.id !== order.id && o.orderDate === order.orderDate && o.session === order.session
  );

  if (others.length === 0) return null;

  // Prefer matching by template ID (set once menu templates are picked from the
  // dropdown); fall back to a name comparison for any older free-text orders.
  const sameAsOrder = (o) =>
    order.menuTemplateId && o.menuTemplateId
      ? o.menuTemplateId === order.menuTemplateId
      : o.menuTemplateName.trim().toLowerCase() === order.menuTemplateName.trim().toLowerCase();

  const sameTemplate = others.filter(sameAsOrder);
  const diffTemplate = others.filter((o) => !sameAsOrder(o));

  if (diffTemplate.length === 0) {
    const totalPacks = [order, ...sameTemplate].reduce((sum, o) => sum + Number(o.packCount || 0), 0);
    return (
      <div className="conflict-box same-template">
        <div className="conflict-title">
          Same menu already booked this session — likely just a volume increase
        </div>
        <div>
          {sameTemplate.length} other order{sameTemplate.length > 1 ? "s" : ""} for "{order.menuTemplateName}" on
          this date/session. Combined packs across all of them: <strong>{totalPacks}</strong>.
        </div>
      </div>
    );
  }

  return (
    <div className="conflict-box diff-template">
      <div className="conflict-title">
        Different menu template booked for the same date and session
      </div>
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
          Also {sameTemplate.length} order{sameTemplate.length > 1 ? "s" : ""} already on the same template.
        </div>
      )}
    </div>
  );
}
