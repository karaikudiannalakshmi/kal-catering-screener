import { SESSIONS } from "../lib/constants.js";
import { cleanRecipeName } from "../lib/displayName.js";
import { useRecipes } from "../lib/useRecipes.js";
import { findRecipeForItem } from "../lib/billing.js";

export default function MenuPicker({ templates, templatesLoading, session, onSessionChange, selectedTemplateId, onSelectTemplate }) {
  const { recipes } = useRecipes();
  const templatesForSession = templates.filter((t) => t.session === session);

  return (
    <div>
      <div className="field">
        <label>Which meal is this for?</label>
        <div className="checkbox-grid">
          {SESSIONS.map((s) => (
            <label key={s} className={`checkbox-chip${session === s ? " checked" : ""}`}>
              <input
                type="radio"
                name="customerSession"
                checked={session === s}
                onChange={() => onSessionChange(s)}
              />
              {s}
            </label>
          ))}
        </div>
      </div>

      {session && (
        <div className="field">
          <label>Choose a menu</label>
          {templatesLoading && <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>Loading menus…</div>}
          {!templatesLoading && templatesForSession.length === 0 && (
            <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>
              No menus available for {session.toLowerCase()} right now.
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {templatesForSession.map((t) => {
              const selected = t.id === selectedTemplateId;
              return (
                <div
                  key={t.id}
                  className="card"
                  style={{
                    padding: "14px 16px",
                    borderColor: selected ? "var(--turmeric)" : "var(--line)",
                    borderWidth: selected ? 2 : 1,
                    cursor: "pointer",
                  }}
                  onClick={() => onSelectTemplate(t.id)}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong style={{ fontSize: 15 }}>{t.name}</strong>
                    <span
                      className={`checkbox-chip${selected ? " checked" : ""}`}
                      style={{ pointerEvents: "none" }}
                    >
                      {selected ? "Selected" : "Select"}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--turmeric-dark)", fontWeight: 500, marginTop: 4 }}>
                    {t.pricePerPack != null ? `₹${t.pricePerPack} per pack` : "Price to be confirmed"}
                  </div>
                  <table style={{ width: "100%", marginTop: 10, borderCollapse: "collapse", fontSize: 13 }}>
                    <tbody>
                      {t.items.map((item, i) => {
                        const recipe = findRecipeForItem(item, recipes);
                        return (
                          <tr key={i} style={{ borderTop: i > 0 ? "1px solid var(--line)" : "none" }}>
                            <td style={{ padding: "4px 0", color: "var(--ink-soft)" }}>
                              {cleanRecipeName(item.name)}
                              {recipe?.nameTamil && (
                                <span style={{ display: "block", fontSize: 12, fontFamily: "var(--font-tamil)" }}>
                                  {recipe.nameTamil}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: "4px 0", textAlign: "right" }}>
                              {item.quantity} {item.unit}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
