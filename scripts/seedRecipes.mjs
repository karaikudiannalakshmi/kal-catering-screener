// One-time (or re-run-when-updated) import of your recipe master list into
// Firestore's `recipes` collection. This is what powers the searchable
// recipe dropdown in menu templates and in the senior executive's order
// customization.
//
// Run after filling in src/lib/firebase-config.js:
//   node scripts/seedRecipes.mjs
//
// Safe to re-run: it uses each recipe's own id from the CSV as the Firestore
// document ID, so re-running after you update data/recipes.csv overwrites
// existing entries instead of duplicating them.
//
// To refresh the list later: export the recipe list again from Kitchen ERP,
// replace data/recipes.csv, and re-run this script.

import { readFileSync } from "fs";
import Papa from "papaparse";
import { initializeApp } from "firebase/app";
import { getFirestore, writeBatch, doc } from "firebase/firestore";
import { firebaseConfig } from "../src/lib/firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const csvText = readFileSync(new URL("../data/recipes.csv", import.meta.url), "utf-8");
const { data: rows } = Papa.parse(csvText, { header: true, skipEmptyLines: true });

// Only import active, sellable recipes — not sub-recipe components (used
// inside other recipes) and not disabled ones.
const active = rows.filter((r) => r.isDisable !== "true" && r.isSubRecipe !== "true" && r.name?.trim());

console.log(`${rows.length} rows in CSV, importing ${active.length} active main recipes...`);

const BATCH_SIZE = 400;
let imported = 0;

for (let i = 0; i < active.length; i += BATCH_SIZE) {
  const chunk = active.slice(i, i + BATCH_SIZE);
  const batch = writeBatch(db);
  for (const r of chunk) {
    const ref = doc(db, "recipes", r.id);
    batch.set(ref, {
      name: r.name.trim(),
      category: r["category.label"] || "",
      uom: r["cost.prodUOM.label"] || "",
    });
  }
  await batch.commit();
  imported += chunk.length;
  console.log(`  ${imported} / ${active.length}`);
}

console.log("Done. Recipes are now searchable in the app.");
process.exit(0);
