// Firebase's password sign-in provider is keyed by email, not phone number.
// To let a customer set a password against their phone-verified account, we
// map their E.164 phone number to a synthetic, never-shown email address and
// link/sign-in with that under the hood. The account's real phoneNumber
// field (set by the original OTP verification) is untouched either way —
// this only ever adds a second sign-in method to the same account.
export function phoneToSyntheticEmail(e164Digits) {
  const digits = e164Digits.replace(/[^\d]/g, "");
  return `p${digits}@customer.kalcatering.app`;
}
