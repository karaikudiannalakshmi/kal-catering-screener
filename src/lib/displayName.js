// The Kitchen ERP's order-template screens prefix many item names with an
// internal category/module tag — "Order- Idly", "VR - Curd Rice", "KK-
// Thakkali Ketti Kuzhambu" — that means nothing to a customer and shouldn't
// appear on a bill. This strips those, but ONLY the tags below: an explicit
// list built from what's actually in our seeded data, not a generic "strip
// anything before a hyphen" regex. That matters because for a few items the
// text before the hyphen IS the dish name (e.g. "Chapathy-Tawa" is tawa-made
// chapathi, not a "Chapathy" category tag) — a blind strip would wreck those.
//
// Longest-first so a compound tag like "SW-BS -" is matched before the
// shorter "BS -" would otherwise grab part of it.
const KNOWN_PREFIXES = [
  "SW-BS -", "SW-BS-", "SW-PS -", "SW-PS-",
  "Order -", "Order-",
  "Online -", "Online-",
  "PMD -", "PMD-",
  "BMD -", "BMD-",
  "VPD -", "VPD-",
  "KPC -", "KPC-",
  "KPF -", "KPF-",
  "Mandi -", "Mandi-",
  "Kurma -", "Kurma-",
  "Rasam -", "Rasam-",
  "Sambar -", "Sambar-",
  "Payasam -", "Payasam-",
  "Pacchadi -", "Pacchadi-",
  "Starter -", "Starter-",
  "Chutney -", "Chutney-",
  "Cutlet -", "Cutlet-",
  "Subji -", "Subji-",
  "Kootu -", "Kootu-",
  "Raita -", "Raita-",
  "Sauce -", "Sauce-",
  "Dosa -", "Dosa-",
  "Rice -", "Rice-",
  "Chips -", "Chips-",
  "Halwa -", "Halwa-",
  "Leaf -", "Leaf-",
  "Tiffin -", "Tiffin-",
  "BS -", "BS-",
  "KK -", "KK-",
  "KP -", "KP-",
  "VP -", "VP-",
  "VR -", "VR-",
  "DF -", "DF-", "DF.",
  "P -", "P-",
];

export function cleanRecipeName(rawName) {
  const trimmed = (rawName || "").trim();
  for (const prefix of KNOWN_PREFIXES) {
    if (trimmed.toLowerCase().startsWith(prefix.toLowerCase())) {
      const rest = trimmed.slice(prefix.length).trim();
      if (rest) return rest;
    }
  }
  return trimmed;
}
