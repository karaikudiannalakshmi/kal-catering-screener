// Normalizes to E.164 format for Firebase phone auth, assuming Indian
// 10-digit numbers when no country code is present.
export function toE164(phone) {
  let digits = phone.replace(/[^\d]/g, "");
  if (digits.length === 10) digits = "91" + digits;
  else if (digits.startsWith("0")) digits = "91" + digits.slice(1);
  return "+" + digits;
}
