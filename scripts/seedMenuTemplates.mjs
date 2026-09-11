// One-time seed script: loads the three Breakfast, four Lunch, and four
// Dinner templates (as shown in your Kitchen ERP order-template-details
// screens) into Firestore's menuTemplates collection.
//
// Run once after you've filled in src/lib/firebase.js with your real config:
//   node scripts/seedMenuTemplates.mjs
//
// Safe to re-run — it just adds new documents each time, so if you run it
// twice you'll get duplicates. Delete the extras from the "Menu templates"
// page in the app if that happens.
//
// PRICING: all 11 templates now carry the official fixed price from your
// Breakfast/Lunch/Dinner quotation PDFs. If those prices change, update the
// pricePerPack value on each template below and re-run — or just edit the
// price directly on the "Menu templates" page, which is quicker for a
// one-off change than touching this file.

import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { firebaseConfig } from "../src/lib/firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const templates = [
  {
    name: "Breakfast Menu 1",
    session: "Breakfast",
    pricePerPack: 240,
    items: [
      { name: "SW-BS - Pineapple Kesari", quantity: 0.05, unit: "KG" },
      { name: "Order- Idly", quantity: 2, unit: "NOS" },
      { name: "Online - Medhu Vada", quantity: 1, unit: "NOS" },
      { name: "Order-Pongal", quantity: 0.125, unit: "KG" },
      { name: "PMD - ONION UTHAPPAM", quantity: 1, unit: "NOS" },
      { name: "Order-Filter Coffee-(Powder)", quantity: 0.07, unit: "LT" },
      { name: "Order-Tiffin Sambar", quantity: 0.15, unit: "KG" },
      { name: "Chutney - Coconut Chutney", quantity: 0.04, unit: "KG" },
      { name: "Order - Milagai chutney", quantity: 0.04, unit: "KG" },
      { name: "Leaf-Tiffin Ilai", quantity: 1, unit: "NOS" },
      { name: "Paper Roll", quantity: 1, unit: "NOS" },
    ],
  },
  {
    name: "Breakfast Menu 2",
    session: "Breakfast",
    pricePerPack: 270,
    items: [
      { name: "Halwa- Carrot Dhumroot Halwa", quantity: 0.05, unit: "KG" },
      { name: "Order- Idly", quantity: 2, unit: "NOS" },
      { name: "Online - Medhu Vada", quantity: 1, unit: "NOS" },
      { name: "Order-Pongal", quantity: 0.125, unit: "KG" },
      { name: "PMD - ONION UTHAPPAM", quantity: 1, unit: "NOS" },
      { name: "Order-Filter Coffee-(Powder)", quantity: 0.07, unit: "LT" },
      { name: "Order-Tiffin Sambar", quantity: 0.15, unit: "KG" },
      { name: "Chutney - Coconut Chutney", quantity: 0.04, unit: "KG" },
      { name: "Order - Milagai chutney", quantity: 0.04, unit: "KG" },
      { name: "Leaf-Tiffin Ilai", quantity: 1, unit: "NOS" },
      { name: "Paper Roll", quantity: 1, unit: "NOS" },
    ],
  },
  {
    name: "Breakfast Menu 3",
    session: "Breakfast",
    pricePerPack: 330,
    items: [
      { name: "Halwa - Badham Halwa", quantity: 0.02, unit: "KG" },
      { name: "SW-PS- Paal Paniyaaram", quantity: 1, unit: "NOS" },
      { name: "Order- Idly", quantity: 2, unit: "NOS" },
      { name: "Online - Medhu Vada", quantity: 1, unit: "NOS" },
      { name: "Order-Pongal", quantity: 0.1, unit: "KG" },
      { name: "PMD - MASAL DOSAI", quantity: 1, unit: "NOS" },
      { name: "Order-Filter Coffee-(Powder)", quantity: 0.07, unit: "LT" },
      { name: "Tiffin-Kalla Veettu Avial", quantity: 0.08, unit: "KG" },
      { name: "Order-Tiffin Sambar", quantity: 0.08, unit: "KG" },
      { name: "Chutney - Coconut Chutney", quantity: 0.04, unit: "KG" },
      { name: "Leaf-Tiffin Ilai", quantity: 1, unit: "NOS" },
      { name: "Paper Roll", quantity: 1, unit: "NOS" },
    ],
  },
  {
    name: "Lunch 1",
    session: "Lunch",
    pricePerPack: 270,
    items: [
      { name: "Rice - Ponni Boiled Rice", quantity: 0.4, unit: "KG" },
      { name: "KK- Thakkali Ketti Kuzhambu", quantity: 0.08, unit: "KG" },
      { name: "Sambar- Katharikkai sambar", quantity: 0.11, unit: "KG" },
      { name: "Rasam - Poondu Rasam", quantity: 0.08, unit: "LT" },
      { name: "Order-Curd", quantity: 0.05, unit: "KG" },
      { name: "Kootu - Chow Chow", quantity: 0.06, unit: "KG" },
      { name: "VP- Kos,Carrot Poriyal", quantity: 0.04, unit: "KG" },
      { name: "KP- Urulai Poriyal", quantity: 0.06, unit: "KG" },
      { name: "Payasam - Moongdhall Payasam", quantity: 0.1, unit: "LT" },
      { name: "Appalam", quantity: 1.1, unit: "NOS" },
      { name: "Pickle", quantity: 0.01, unit: "KG" },
      { name: "Leaf- Sappattu Ilai", quantity: 1.1, unit: "NOS" },
      { name: "Paper Roll", quantity: 1, unit: "NOS" },
    ],
  },
  {
    name: "Lunch 2",
    session: "Lunch",
    pricePerPack: 330,
    items: [
      { name: "Rice - Ponni Boiled Rice", quantity: 0.4, unit: "KG" },
      { name: "Parruppu Nei", quantity: 0.03, unit: "LT" },
      { name: "KK- Thakkali Ketti Kuzhambu", quantity: 0.08, unit: "KG" },
      { name: "Sambar- Katharikkai sambar", quantity: 0.11, unit: "KG" },
      { name: "Rasam - Poondu Rasam", quantity: 0.08, unit: "LT" },
      { name: "Order-Curd", quantity: 0.05, unit: "KG" },
      { name: "Kootu - Chow Chow", quantity: 0.06, unit: "KG" },
      { name: "VPD-Cabbage Sprouts Poriyal", quantity: 0.04, unit: "KG" },
      { name: "KPC-Urulai,Carrot,Pattani Perattal", quantity: 0.06, unit: "KG" },
      { name: "Mandi-Vendaikkai,Mochai", quantity: 0.06, unit: "KG" },
      { name: "Appalam", quantity: 1.1, unit: "NOS" },
      { name: "P - Kavuni Arisi Payasam", quantity: 0.1, unit: "KG" },
      { name: "Pickle", quantity: 0.01, unit: "KG" },
      { name: "Leaf- Sappattu Ilai", quantity: 1.1, unit: "NOS" },
      { name: "Paper Roll", quantity: 1, unit: "NOS" },
    ],
  },
  {
    name: "Lunch 3",
    session: "Lunch",
    pricePerPack: 390,
    items: [
      { name: "Rice - Ponni Boiled Rice", quantity: 0.4, unit: "KG" },
      { name: "Parruppu Nei", quantity: 0.03, unit: "LT" },
      { name: "KK - Milagu Kuzhambu", quantity: 0.07, unit: "KG" },
      { name: "Sambar- Katharikkai sambar", quantity: 0.1, unit: "KG" },
      { name: "Rasam - Poondu Rasam", quantity: 0.08, unit: "LT" },
      { name: "Order-Curd", quantity: 0.05, unit: "KG" },
      { name: "VR - Veg Pulao", quantity: 0.08, unit: "KG" },
      { name: "Kootu - Chow Chow", quantity: 0.06, unit: "KG" },
      { name: "VP - Cabbage,Carrot, Peas Poriyal", quantity: 0.04, unit: "KG" },
      { name: "Mandi - Maa Ginger, Channa Mandi", quantity: 0.06, unit: "KG" },
      { name: "KPF-Urulai Karuvattu Poriyal", quantity: 0.04, unit: "KG" },
      { name: "Raita - Onion Thayir Pachadi", quantity: 0.03, unit: "KG" },
      { name: "P - Paal Payasam", quantity: 0.1, unit: "KG" },
      { name: "Pickle", quantity: 0.01, unit: "KG" },
      { name: "Appalam", quantity: 1.1, unit: "NOS" },
      { name: "Leaf- Sappattu Ilai", quantity: 1.1, unit: "NOS" },
      { name: "Paper Roll", quantity: 1, unit: "NOS" },
    ],
  },
  {
    name: "Lunch 4",
    session: "Lunch",
    pricePerPack: 475,
    items: [
      { name: "VR - Akkaara Adisal", quantity: 0.05, unit: "KG" },
      { name: "VR - Veg Pulao", quantity: 0.08, unit: "KG" },
      { name: "Rice - Ponni Boiled Rice", quantity: 0.35, unit: "KG" },
      { name: "Parruppu Nei", quantity: 0.03, unit: "LT" },
      { name: "KK - Saiva Mein Kuzhambu", quantity: 0.08, unit: "KG" },
      { name: "Sambar- Katharikkai sambar", quantity: 0.08, unit: "KG" },
      { name: "Rasam-Pineapple Rasam", quantity: 0.08, unit: "KG" },
      { name: "Order-Curd", quantity: 0.05, unit: "KG" },
      { name: "Kootu - Chow Chow", quantity: 0.06, unit: "KG" },
      { name: "VP - Carrot ,Panner, green peas Poriyal", quantity: 0.04, unit: "KG" },
      { name: "KPC-Chinna Urlai,Kalan, Butter Beans Pirattal", quantity: 0.06, unit: "KG" },
      { name: "Pacchadi-maalnji,Kondaikadalai,Kudai Milagai", quantity: 0.06, unit: "KG" },
      { name: "Raita - Onion Thayir Pachadi", quantity: 0.03, unit: "KG" },
      { name: "P-Pazha Payasam", quantity: 0.1, unit: "KG" },
      { name: "Appalam", quantity: 1, unit: "NOS" },
      { name: "Pickle", quantity: 0.01, unit: "KG" },
      { name: "Leaf- Sappattu Ilai", quantity: 1, unit: "NOS" },
      { name: "Paper Roll", quantity: 1, unit: "NOS" },
    ],
  },
  {
    name: "Dinner 1",
    session: "Dinner",
    pricePerPack: 250,
    items: [
      { name: "SW-BS - Kesari", quantity: 0.05, unit: "KG" },
      { name: "Order- Idly", quantity: 2, unit: "NOS" },
      { name: "PMD - ONION UTHAPPAM", quantity: 1, unit: "NOS" },
      { name: "Chapathy-Tawa", quantity: 1, unit: "NOS" },
      { name: "DF. Masal Siyum", quantity: 1.2, unit: "NOS" },
      { name: "VR - Curd Rice", quantity: 0.08, unit: "KG" },
      { name: "Order-Tiffin Sambar", quantity: 0.125, unit: "KG" },
      { name: "Chutney - Coconut Chutney", quantity: 0.04, unit: "KG" },
      { name: "Order - Milagai chutney", quantity: 0.04, unit: "KG" },
      { name: "Kurma - Parota Kurma Red", quantity: 0.05, unit: "KG" },
      { name: "Pickle", quantity: 0.01, unit: "KG" },
      { name: "Leaf- Sappattu Ilai", quantity: 1.2, unit: "NOS" },
      { name: "Paper Roll", quantity: 1, unit: "NOS" },
    ],
  },
  {
    // NOTE: the source screenshot for this template scrolled off before
    // showing the subtotal/count, so it's possible one more row (typically
    // "Paper Roll") exists below what was captured. Check this one against
    // the Kitchen ERP and add a row from the "Menu templates" page if needed.
    name: "Dinner 2",
    session: "Dinner",
    pricePerPack: 350,
    items: [
      { name: "Halwa- Carrot Dhumroot Halwa", quantity: 0.05, unit: "KG" },
      { name: "BS - Pasiparuppu Puttu", quantity: 0.03, unit: "KG" },
      { name: "Order- Idly", quantity: 2, unit: "NOS" },
      { name: "PMD - MASAL DOSAI", quantity: 1, unit: "NOS" },
      { name: "BMD- Spl Kothu Parota", quantity: 0.07, unit: "KG" },
      { name: "Cutlet-Sweet Corn cutlet", quantity: 1.25, unit: "NOS" },
      { name: "DF- Mysore Bonda", quantity: 1, unit: "NOS" },
      { name: "VR - Sambar Rice", quantity: 0.1, unit: "KG" },
      { name: "VR - Curd Rice", quantity: 0.08, unit: "KG" },
      { name: "Sauce-Tomato Sauce", quantity: 0.01, unit: "KG" },
      { name: "Order-Tiffin Sambar", quantity: 0.125, unit: "KG" },
      { name: "Chutney - Coconut Chutney", quantity: 0.04, unit: "KG" },
      { name: "Order - Milagai chutney", quantity: 0.04, unit: "KG" },
      { name: "Kurma- Veg Kurma (Rich)", quantity: 0.04, unit: "KG" },
      { name: "Chips - Potato (S)", quantity: 0.01, unit: "KG" },
      { name: "Pickle", quantity: 0.01, unit: "KG" },
      { name: "Leaf- Sappattu Ilai", quantity: 1.2, unit: "NOS" },
    ],
  },
  {
    name: "Dinner 3",
    session: "Dinner",
    pricePerPack: 420,
    items: [
      { name: "SW-BS-Karuppatti Ukkarai", quantity: 0.04, unit: "KG" },
      { name: "SW-PS- Paal Paniyaaram", quantity: 1, unit: "NOS" },
      { name: "Order- Idly", quantity: 1.5, unit: "NOS" },
      { name: "PMD - MASAL DOSAI", quantity: 1.25, unit: "NOS" },
      { name: "BMD- Spl Kothu Parota", quantity: 0.06, unit: "KG" },
      { name: "DF- Mysore Bonda", quantity: 1, unit: "NOS" },
      { name: "Cutlet-Veg Cutlet", quantity: 1.25, unit: "NOS" },
      { name: "Order-Tiffin Sambar", quantity: 0.1, unit: "KG" },
      { name: "Sauce-Tomato Sauce", quantity: 0.007, unit: "KG" },
      { name: "Chutney - Coconut Chutney", quantity: 0.04, unit: "KG" },
      { name: "Order - Milagai chutney", quantity: 0.04, unit: "KG" },
      { name: "Kurma- Veg Kurma (Rich)", quantity: 0.04, unit: "KG" },
      { name: "Raita - Onion Thayir Pachadi", quantity: 0.035, unit: "KG" },
      { name: "VR - Sweet Corn Pulao", quantity: 0.08, unit: "KG" },
      { name: "VR - Sambar Rice", quantity: 0.08, unit: "KG" },
      { name: "VR - Curd Rice", quantity: 0.06, unit: "KG" },
      { name: "Pickle", quantity: 0.01, unit: "KG" },
      { name: "Chips - Potato (S)", quantity: 0.01, unit: "KG" },
      { name: "Leaf- Sappattu Ilai", quantity: 1.2, unit: "NOS" },
      { name: "Paper Roll", quantity: 1, unit: "NOS" },
    ],
  },
  {
    name: "Dinner 4",
    session: "Dinner",
    pricePerPack: 500,
    items: [
      { name: "SW-PS-Karupatti Kaaju Kathli", quantity: 1, unit: "NOS" },
      { name: "SW-PS- Paal Paniyaram", quantity: 1, unit: "NOS" },
      { name: "Order- Idly", quantity: 1.5, unit: "NOS" },
      { name: "Chapathy-Tawa", quantity: 1, unit: "NOS" },
      { name: "Dosa - Mushroom Masal Dosa", quantity: 1.5, unit: "NOS" },
      { name: "DF. Masal Siyum", quantity: 1.25, unit: "NOS" },
      { name: "Starter - Cheesy Corn Nuggets", quantity: 1.25, unit: "NOS" },
      { name: "VR- Peas Pulao", quantity: 0.08, unit: "KG" },
      { name: "VR - Sambar Rice", quantity: 0.08, unit: "KG" },
      { name: "VR - Curd Rice", quantity: 0.08, unit: "KG" },
      { name: "Raita - Onion Thayir Pachadi", quantity: 0.035, unit: "KG" },
      { name: "Order - Tiffin Sambar (No Onion)", quantity: 0.08, unit: "KG" },
      { name: "Chutney - Coconut Chutney", quantity: 0.035, unit: "KG" },
      { name: "Order - Milagai chutney", quantity: 0.035, unit: "KG" },
      { name: "Subji - Panner Butter Masala", quantity: 0.05, unit: "LT" },
      { name: "Chips - Potato (S)", quantity: 0.01, unit: "KG" },
      { name: "Mavadu Inji Pickle", quantity: 0.01, unit: "KG" },
      { name: "Leaf- Sappattu Ilai", quantity: 1.1, unit: "NOS" },
    ],
  },
];

for (const tpl of templates) {
  const ref = await addDoc(collection(db, "menuTemplates"), { ...tpl, createdAt: serverTimestamp() });
  console.log(`Added "${tpl.name}" (${ref.id})`);
}

console.log("Done. Check the 'Menu templates' page in the app.");
process.exit(0);
