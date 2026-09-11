import { useMemo, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase.js";
import { useRecipes } from "../lib/useRecipes.js";

export default function ManageRecipes() {
  const { recipes, loading } = useRecipes();
  const [search, setSearch] = useState("");
  const [edits, setEdits] = useState({}); // { [recipeId]: { rate, nameTamil } }
  const [savingId, setSavingId] = useState(null);

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return recipes.filter((r) => r.name.toLowerCase().includes(q)).slice(0, 60);
  }, [search, recipes]);

  const missingRateCount = useMemo(() => recipes.filter((r) => r.rate == null).length, [recipes]);

  function updateEdit(id, field, value) {
    setEdits((e) => ({ ...e, [id]: { ...e[id], [field]: value } }));
  }

  async function saveRecipe(recipe) {
    const edit = edits[recipe.id] || {};
    const rate = edit.rate !== undefined ? edit.rate : recipe.rate;
    const nameTamil = edit.nameTamil !== undefined ? edit.nameTamil : recipe.nameTamil;
    setSavingId(recipe.id);
    try {
      await updateDoc(doc(db, "recipes", recipe.id), {
        rate: rate === "" || rate == null ? null : Number(rate),
        nameTamil: nameTamil ? nameTamil.trim() : "",
      });
      setEdits((e) => {
        const next = { ...e };
        delete next[recipe.id];
        return next;
      });
    } catch (err) {
      console.error(err);
      alert("Could not save. Check your connection and try again.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div>
      <div className="page-head">
        <h1>Recipes</h1>
        <p>
          The billing rate per recipe (used when generating a bill) and, once you have a recipe list
          that includes them, the Tamil name — search below to find and edit one.
        </p>
      </div>

      {!loading && (
        <div className="card" style={{ marginBottom: 20 }}>
          {missingRateCount > 0 ? (
            <span>
              <strong>{missingRateCount}</strong> of {recipes.length} recipes don't have a rate set yet.
              They'll be flagged for entry when they show up on a bill.
            </span>
          ) : (
            <span>All {recipes.length} recipes have a rate set.</span>
          )}
        </div>
      )}

      <div className="field">
        <label htmlFor="recipeSearch">Search recipes</label>
        <input
          id="recipeSearch"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Start typing a recipe name…"
        />
      </div>

      {loading && <div className="loading-state">Loading recipes…</div>}

      {!loading && search.trim() && matches.length === 0 && (
        <div className="empty-state">No recipes match "{search}".</div>
      )}

      {!loading && matches.length > 0 && (
        <div className="order-list">
          {matches.map((r) => {
            const edit = edits[r.id] || {};
            const rateValue = edit.rate !== undefined ? edit.rate : r.rate ?? "";
            const tamilValue = edit.nameTamil !== undefined ? edit.nameTamil : r.nameTamil || "";
            const dirty = edit.rate !== undefined || edit.nameTamil !== undefined;
            return (
              <div className="order-card" key={r.id}>
                <div className="order-card-head">
                  <div>
                    <h3>{r.name}</h3>
                    <div className="order-meta">
                      {r.category} {r.uom ? `· ${r.uom}` : ""}
                    </div>
                  </div>
                  {r.rate == null && <span className="status-pill">No rate set</span>}
                </div>
                <div className="field-row" style={{ marginTop: 12, marginBottom: 0 }}>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: 12 }}>Rate (₹ per {r.uom || "unit"})</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={rateValue}
                      onChange={(e) => updateEdit(r.id, "rate", e.target.value)}
                      placeholder="Not set"
                    />
                  </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: 12 }}>Tamil name</label>
                    <input
                      type="text"
                      value={tamilValue}
                      onChange={(e) => updateEdit(r.id, "nameTamil", e.target.value)}
                      placeholder="Not set yet"
                      style={{ fontFamily: "var(--font-tamil)" }}
                    />
                  </div>
                </div>
                {dirty && (
                  <button
                    className="btn-primary"
                    style={{ marginTop: 12 }}
                    onClick={() => saveRecipe(r)}
                    disabled={savingId === r.id}
                  >
                    {savingId === r.id ? "Saving..." : "Save"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
