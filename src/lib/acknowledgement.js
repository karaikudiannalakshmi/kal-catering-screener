// Builds the acknowledgement message sent to the customer right after a
// junior executive screens their order — full details included so there's
// no confusion later about what was actually discussed and noted down.
export function buildAcknowledgementMessage(order, templateItems) {
  const lines = [
    `Dear ${order.customerName},`,
    "",
    "Thank you for your catering enquiry with Karaikudi Annalakshmi. Your order details have " +
      "been noted for evaluation, and our senior executive will call you shortly to confirm and " +
      "finalize everything.",
    "",
    "Details noted:",
    `Date: ${order.orderDate}`,
    `Session: ${order.session}`,
    `Number of packs: ${order.packCount}`,
    `Menu: ${order.menuTemplateName}`,
  ];

  if (templateItems?.length) {
    lines.push("Items:");
    for (const item of templateItems) {
      lines.push(`- ${item.name} (${item.quantity} ${item.unit})`);
    }
  }

  lines.push(`Delivery address: ${order.deliveryAddress}`);

  if (order.serviceTime) lines.push(`Serve time: ${order.serviceTime}`);
  lines.push(`Live counter: ${order.needsLiveCounter ? "Yes" : "No"}`);
  lines.push(`Service personnel: ${order.needsServicePersonnel ? "Yes" : "No"}`);
  if (order.additionalServices?.length) {
    lines.push(`Other services: ${order.additionalServices.join(", ")}`);
  }
  if (order.notes) lines.push(`Your notes: ${order.notes}`);

  lines.push(
    "",
    "This is a preliminary booking note — pricing and final confirmation will be shared by our " +
      "executive on the call. Please let us know if anything above needs correcting.",
    "",
    "— Karaikudi Annalakshmi"
  );

  return lines.join("\n");
}
