import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "./firebase.js";

// Simple module-level cache so every component that needs the recipe list
// (which rarely changes) shares one fetch instead of re-querying ~1,100
// documents every time a form mounts.
let cachedPromise = null;

function fetchRecipes() {
  if (!cachedPromise) {
    cachedPromise = getDocs(query(collection(db, "recipes"), orderBy("name"))).then((snap) =>
      snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    );
  }
  return cachedPromise;
}

export function useRecipes() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchRecipes()
      .then((list) => {
        if (!cancelled) {
          setRecipes(list);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { recipes, loading };
}
