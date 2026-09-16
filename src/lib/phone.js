// Normalizes to E.164 format for Firebase phone auth, assuming Indian
// numbers. Handles a bare 10-digit number, an 11-digit number with a
// leading 0 (common when someone copies a landline-style local number), and
// a 12-digit number that already has the 91 country code.
export function toE164(phone) {
  let digits = phone.replace(/[^\d]/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    // already has the country code
  } else if (digits.length === 11 && digits.startsWith("0")) {
    digits = "91" + digits.slice(1);
  } else if (digits.length === 10) {
    digits = "91" + digits;
  }
  // Any other length is left as-is — isValidIndianMobile below is what
  // should have caught it before this ever runs, so a caller that skips
  // that check gets a clearly-wrong number rather than a silent guess.
  return "+" + digits;
}

// Checks that the number is a plausible 10-digit Indian mobile number
// (optionally with a leading 0 or the 91 country code already on it), so a
// mistyped digit gets caught with a clear message instead of silently
// producing the wrong country code and a confusing Firebase error.
export function isValidIndianMobile(phone) {
  const digits = phone.replace(/[^\d]/g, "");
  let core = digits;
  if (digits.length === 12 && digits.startsWith("91")) core = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) core = digits.slice(1);
  return core.length === 10 && /^[6-9]/.test(core);
}
