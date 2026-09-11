// Adds the Tamil name to each recipe document already imported by
// seedRecipes.mjs. Run this AFTER seedRecipes.mjs (or any time after — it
// uses set(..., { merge: true }), so it's safe either way).
//
//   node scripts/importTamilNames.mjs
//
// How the join works: data/recipes.csv (the original Kitchen ERP export)
// and data/recipes_tamil.csv (English Name, Tamil Name) were confirmed to
// be in exactly the same row order with matching English names — so rows
// are paired by position, not by re-matching text. That avoids any
// ambiguity from the handful of duplicate English names in the list. The
// same active/non-subrecipe filter as seedRecipes.mjs is applied, so this
// only touches the ~1,113 recipes that actually got imported as documents.
//
// These are never machine-translated — every Tamil name here is exactly
// what's in the CSV you provided.

import { readFileSync } from "fs";
import Papa from "papaparse";
import { initializeApp } from "firebase/app";
import { getFirestore, writeBatch, doc } from "firebase/firestore";
import { firebaseConfig } from "../src/lib/firebase-config.js";
import { signInAsStaff } from "./lib/staffAuth.mjs";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
await signInAsStaff(app);

function parseCsv(filename) {
  const text = readFileSync(new URL(`../data/${filename}`, import.meta.url), "utf-8");
  return Papa.parse(text, { header: true, skipEmptyLines: true }).data;
}

const original = parseCsv("recipes.csv");
const tamil = parseCsv("recipes_tamil.csv");

if (original.length !== tamil.length) {
  console.error(
    `Row count mismatch: recipes.csv has ${original.length} rows, recipes_tamil.csv has ${tamil.length}. ` +
      `These need to be the same export lined up row-for-row — stopping rather than guessing.`
  );
  process.exit(1);
}

const pairs = [];
for (let i = 0; i < original.length; i++) {
  const orig = original[i];
  const tam = tamil[i];
  if (orig.isDisable === "true" || orig.isSubRecipe === "true" || !orig.name?.trim()) continue;
  const englishFromTamilCsv = tam["English Name"]?.trim();
  if (englishFromTamilCsv !== orig.name.trim()) {
    console.warn(`Row ${i}: name mismatch ("${orig.name}" vs "${englishFromTamilCsv}") — skipping this one.`);
    continue;
  }
  const tamilName = tam["Tamil Name"]?.trim();
  if (!tamilName) continue;
  pairs.push({ id: orig.id, tamilName });
}

console.log(`Updating ${pairs.length} recipes with their Tamil name...`);

const BATCH_SIZE = 400;
let done = 0;
for (let i = 0; i < pairs.length; i += BATCH_SIZE) {
  const chunk = pairs.slice(i, i + BATCH_SIZE);
  const batch = writeBatch(db);
  for (const { id, tamilName } of chunk) {
    batch.set(doc(db, "recipes", id), { nameTamil: tamilName }, { merge: true });
  }
  await batch.commit();
  done += chunk.length;
  console.log(`  ${done} / ${pairs.length}`);
}

console.log("Done. Tamil names are now on the recipe documents.");
process.exit(0);
