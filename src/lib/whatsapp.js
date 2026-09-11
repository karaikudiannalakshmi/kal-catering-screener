// Normalizes to a wa.me-friendly digit string, assuming Indian 10-digit
// numbers when no country code is present.
export function toWhatsAppDigits(phone) {
  let digits = phone.replace(/[^\d]/g, "");
  if (digits.length === 10) digits = "91" + digits;
  else if (digits.startsWith("0")) digits = "91" + digits.slice(1);
  return digits;
}

export function buildWhatsAppLink(phone, message) {
  return `https://wa.me/${toWhatsAppDigits(phone)}?text=${encodeURIComponent(message)}`;
}
