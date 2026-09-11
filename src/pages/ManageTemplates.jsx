import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase.js";
import { SESSIONS } from "../lib/constants.js";
import ItemListEditor from "../components/ItemListEditor.jsx";

const emptyTemplate = { name: "", session: "", pricePerPack: "", items: [] };

export default function ManageTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyTemplate);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "menuTemplates"), orderBy("session"), orderBy("name"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setTemplates(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  function startEdit(template) {
    setEditingId(template.id);
    setForm({
      name: template.name,
      session: template.session,
      pricePerPack: template.pricePerPack ?? "",
      items: template.items.map((it) => ({ ...it })),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyTemplate);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.session) {
      alert("Template name and session are required.");
      return;
    }
    if (!form.pricePerPack || Number(form.pricePerPack) <= 0) {
      alert("Price per pack is required — customers see this when choosing a menu.");
      return;
    }
    const cleanItems = form.items
      .filter((it) => it.name.trim())
      .map((it) => ({
        recipeId: it.recipeId || null,
        name: it.name.trim(),
        category: it.category || "",
        quantity: Number(it.quantity) || 0,
        unit: it.unit,
      }));
    if (cleanItems.length === 0) {
      alert("Add at least one item.");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, "menuTemplates", editingId), {
          name: form.name.trim(),
          session: form.session,
          pricePerPack: Number(form.pricePerPack),
          items: cleanItems,
        });
      } else {
        await addDoc(collection(db, "menuTemplates"), {
          name: form.name.trim(),
          session: form.session,
          pricePerPack: Number(form.pricePerPack),
          items: cleanItems,
          createdAt: serverTimestamp(),
        });
      }
      resetForm();
    } catch (err) {
      console.error(err);
      alert("Could not save the template. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this menu template? This won't affect orders already taken with it.")) return;
    try {
      await deleteDoc(doc(db, "menuTemplates", id));
    } catch (err) {
      console.error(err);
      alert("Could not delete the template.");
    }
  }

  return (
    <div>
      <div className="page-head">
        <h1>Menu templates</h1>
        <p>
          The item lists junior executives pick from when screening an order. Keep names and quantities
          in line with the Kitchen ERP so per-pack quantities stay consistent across systems.
        </p>
      </div>

      <form className="card" onSubmit={handleSubmit} style={{ marginBottom: 28 }}>
        <div className="field-row">
          <div className="field">
            <label htmlFor="tplName">Template name</label>
            <input
              id="tplName"
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Breakfast Menu 1"
            />
          </div>
          <div className="field">
            <label htmlFor="tplSession">Session</label>
            <select
              id="tplSession"
              value={form.session}
              onChange={(e) => setForm((f) => ({ ...f, session: e.target.value }))}
            >
              <option value="">Select session</option>
              {SESSIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor="tplPrice">Price per pack (₹)</label>
          <input
            id="tplPrice"
            type="number"
            min="0"
            step="1"
            value={form.pricePerPack}
            onChange={(e) => setForm((f) => ({ ...f, pricePerPack: e.target.value }))}
            placeholder="e.g. 205"
            style={{ maxWidth: 200 }}
          />
          <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 6 }}>
            Shown to customers when they're choosing a menu, and used for the estimated total on their
            submission.
          </div>
        </div>

        <div className="field">
          <label>Items (per pack)</label>
          <ItemListEditor items={form.items} onChange={(items) => setForm((f) => ({ ...f, items }))} />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-primary" type="submit" disabled={saving}>
            {saving ? "Saving..." : editingId ? "Update template" : "Save template"}
          </button>
          {editingId && (
            <button type="button" className="btn-secondary" onClick={resetForm}>
              Cancel edit
            </button>
          )}
        </div>
      </form>

      {loading && <div className="loading-state">Loading templates…</div>}

      {!loading && templates.length === 0 && (
        <div className="empty-state">No menu templates yet — add the first one above.</div>
      )}

      {!loading &&
        templates.map((template) => (
          <div className="card" key={template.id} style={{ marginBottom: 16 }}>
            <div className="order-card-head">
              <div>
                <h3>{template.name}</h3>
                <div className="order-meta">
                  {template.session}
                  {template.pricePerPack != null && ` · ₹${template.pricePerPack} / pack`}
                  {template.pricePerPack == null && (
                    <span style={{ color: "var(--alert)" }}> · price not set</span>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn-secondary" onClick={() => startEdit(template)}>
                  Edit
                </button>
                <button className="btn-secondary" onClick={() => handleDelete(template.id)}>
                  Delete
                </button>
              </div>
            </div>
            <table style={{ width: "100%", marginTop: 14, borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--ink-soft)", fontSize: 12 }}>
                  <th style={{ padding: "4px 0" }}>Item</th>
                  <th style={{ padding: "4px 0" }}>Quantity</th>
                </tr>
              </thead>
              <tbody>
                {template.items.map((item, i) => (
                  <tr key={i} style={{ borderTop: "1px solid var(--line)" }}>
                    <td style={{ padding: "6px 0" }}>{item.name}</td>
                    <td style={{ padding: "6px 0" }}>
                      {item.quantity} {item.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
    </div>
  );
}
