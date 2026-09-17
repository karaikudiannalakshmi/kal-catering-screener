import { cleanRecipeName } from "./displayName.js";

// Tries recipeId first (set when an item was picked via the recipe search),
// falls back to matching on the cleaned display name for older/free-text
// items that don't have one.
export function findRecipeForItem(item, recipes) {
  if (item.recipeId) {
    const byId = recipes.find((r) => r.id === item.recipeId);
    if (byId) return byId;
  }
  const cleaned = cleanRecipeName(item.name).toLowerCase();
  return recipes.find((r) => r.name.trim().toLowerCase() === cleaned) || null;
}

// Computes the itemized food-cost estimate from recipe rates — this is an
// internal reference figure, not what the customer is billed. Returns each
// line's match/rate status so missing rates can be flagged for entry.
export function computeItemizedEstimate(items, packCount, recipes) {
  const lines = (items || []).map((item) => {
    const recipe = findRecipeForItem(item, recipes);
    const totalQty = (item.quantity || 0) * (packCount || 0);
    const rate = recipe?.rate ?? null;
    const amount = rate != null ? rate * totalQty : null;
    return {
      name: cleanRecipeName(item.name),
      nameTamil: recipe?.nameTamil || "",
      rawName: item.name,
      unit: item.unit,
      qtyPerPack: item.quantity,
      totalQty,
      recipeId: recipe?.id || null,
      rate,
      amount,
    };
  });
  const knownTotal = lines.reduce((sum, l) => sum + (l.amount || 0), 0);
  const missing = lines.filter((l) => l.rate == null);
  return { lines, knownTotal, missing };
}

// The customer-facing total: the template's fixed price per pack (as
// quoted), plus any internal adjustment (never shown itself), plus
// transport. This is deliberately NOT the itemized recipe-cost estimate —
// that's for staff reference when deciding whether an adjustment is needed.
export function computeCustomerBill({ pricePerPack, packCount, adjustment, transportCharge }) {
  const baseTotal = (pricePerPack || 0) * (packCount || 0);
  const foodTotal = baseTotal + (adjustment || 0);
  const finalPricePerPack = packCount ? foodTotal / packCount : 0;
  const grandTotal = foodTotal + (transportCharge || 0);
  return { baseTotal, foodTotal, finalPricePerPack, grandTotal };
}

// Trims a number to at most 2 decimals without leaving trailing zeros —
// 12.50 -> "12.5", 12 -> "12".
function formatQty(n) {
  return Math.round(n * 100) / 100;
}

// Breakfast and Dinner show the total quantity needed across all packs on
// the customer confirmation/bill (e.g. "Idly — 300 NOS") — that's what
// actually gets prepared/served, and both the kitchen and customer find it
// useful to see spelled out. Lunch deliberately shows names only, no
// quantities. This is a fixed rule from how these two are meant to read,
// not a per-order choice, so it lives here once rather than being repeated
// wherever a customer-facing item list is rendered.
export function formatCustomerItemLine(item, session, packCount) {
  const name = cleanRecipeName(item.name);
  if (session === "Lunch") return name;
  const total = formatQty((item.quantity || 0) * (packCount || 0));
  return `${name} — ${total} ${item.unit}`;
}

// Same rule as above, but returns just the quantity part (or null for
// Lunch) — used where the name needs other things interleaved with it
// (like a Tamil name) rather than a single plain-text line.
export function customerItemQty(item, session, packCount) {
  if (session === "Lunch") return null;
  return `${formatQty((item.quantity || 0) * (packCount || 0))} ${item.unit}`;
}
