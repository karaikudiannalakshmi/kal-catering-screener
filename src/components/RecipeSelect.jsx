import { useMemo, useState, useRef, useEffect } from "react";
import { useRecipes } from "../lib/useRecipes.js";

// A type-to-filter recipe picker. Calls onSelect({ id, name, category, uom })
// when a recipe is chosen, or with a custom { id: null, name, category: "",
// uom: "" } when the person types something not in the catalog and hits
// "use as typed" — keeps this from being a hard block if a recipe is
// missing or brand new.
export default function RecipeSelect({ onSelect, placeholder = "Search recipes…" }) {
  const { recipes, loading } = useRecipes();
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const matches = useMemo(() => {
    const q = text.trim().toLowerCase();
    if (!q) return [];
    return recipes.filter((r) => r.name.toLowerCase().includes(q)).slice(0, 40);
  }, [text, recipes]);

  function choose(recipe) {
    onSelect(recipe);
    setText("");
    setOpen(false);
  }

  function useTyped() {
    if (!text.trim()) return;
    onSelect({ id: null, name: text.trim(), category: "", uom: "" });
    setText("");
    setOpen(false);
  }

  return (
    <div className="recipe-select" ref={boxRef}>
      <input
        type="text"
        value={text}
        placeholder={loading ? "Loading recipes…" : placeholder}
        disabled={loading}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && text.trim() && (
        <div className="recipe-select-dropdown">
          {matches.length === 0 && (
            <div className="recipe-select-empty">
              No recipe matches "{text}".
              <button type="button" className="btn-secondary" onClick={useTyped}>
                Use as typed
              </button>
            </div>
          )}
          {matches.map((r) => (
            <button type="button" key={r.id} className="recipe-select-option" onClick={() => choose(r)}>
              <span>{r.name}</span>
              <span className="recipe-select-meta">
                {r.category} {r.uom ? `· ${r.uom}` : ""}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
