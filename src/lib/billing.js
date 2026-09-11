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
