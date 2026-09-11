import { useState } from "react";
import RecipeSelect from "./RecipeSelect.jsx";
import { UNITS } from "../lib/constants.js";

// items: [{ recipeId, name, category, unit, quantity }]
export default function ItemListEditor({ items, onChange }) {
  const [pending, setPending] = useState(null); // { id, name, category, uom }
  const [pendingQty, setPendingQty] = useState("");
  const [pendingUnit, setPendingUnit] = useState("KG");

  function handleRecipePicked(recipe) {
    setPending(recipe);
    setPendingUnit(recipe.uom && UNITS.includes(recipe.uom) ? recipe.uom : "KG");
    setPendingQty("");
  }

  function addItem() {
    if (!pending) return;
    onChange([
      ...items,
      {
        recipeId: pending.id,
        name: pending.name,
        category: pending.category || "",
        unit: pendingUnit,
        quantity: Number(pendingQty) || 0,
      },
    ]);
    setPending(null);
    setPendingQty("");
  }

  function updateItem(index, field, value) {
    const next = [...items];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  }

  function removeItem(index) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div>
      {items.map((item, i) => (
        <div className="customize-item-row" key={i}>
          <div className="item-name">{item.name}</div>
          <input
            type="number"
            step="0.001"
            value={item.quantity}
            onChange={(e) => updateItem(i, "quantity", Number(e.target.value))}
          />
          <select value={item.unit} onChange={(e) => updateItem(i, "unit", e.target.value)}>
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
          <button type="button" className="btn-secondary" onClick={() => removeItem(i)}>
            Remove
          </button>
        </div>
      ))}

      <div className="customize-add-row">
        <RecipeSelect
          onSelect={handleRecipePicked}
          placeholder={pending ? pending.name : "Search recipes to add…"}
        />
        <input
          type="number"
          step="0.001"
          placeholder="Qty"
          value={pendingQty}
          onChange={(e) => setPendingQty(e.target.value)}
          style={{ width: 80, padding: "9px 10px", border: "1px solid var(--line)", borderRadius: 6 }}
        />
        <select
          value={pendingUnit}
          onChange={(e) => setPendingUnit(e.target.value)}
          style={{ width: 80, padding: "9px 10px", border: "1px solid var(--line)", borderRadius: 6 }}
        >
          {UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
        <button type="button" className="btn-primary" onClick={addItem} disabled={!pending}>
          Add
        </button>
      </div>
    </div>
  );
}
