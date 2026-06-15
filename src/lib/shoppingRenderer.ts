/**
 * ZESTUP — Shopping Renderer v3
 * Pipeline strictement séquentiel en 8 couches.
 * Aucune couche ne peut retourner un résultat final avant les couches suivantes.
 *
 * Ordre d'exécution obligatoire :
 *  1. invalid / fuzzy blocker
 *  2. pantry routing
 *  3. package dominant override
 *  4. weight dominant override
 *  5. shopping identity merge  (niveau liste, pas item)
 *  6. unit normalization
 *  7. human rounding
 *  8. visual cleanup final
 */

import type { Aisle, CourseItem, CourseAisle } from "@/data/recipes";

// ─── Types internes ───────────────────────────────────────────────────────────

export type RawIngredient = {
  name: string;
  /** Quantité numérique (0 si inconnue / floue) */
  qty: number;
  /** Unité telle que dans la recette : "g", "tranches", "c. à soupe", "" … */
  unit: string;
  aisle: Aisle;
  /** Nombre de recettes sources (pour la note "utilisé dans X repas") */
  recipeCount?: number;
};

type PipelineItem = RawIngredient & {
  _pantry: boolean;
  _blocked: boolean;
  _displayQty: number;
  _displayUnit: string;
  _fallbackLabel?: string;
  _note?: string;
};

// ─── Constantes de classification ────────────────────────────────────────────

/** Unités floues / invalides → bloquer et appliquer fallback */
const FUZZY_UNITS = new Set([
  "à goût", "a gout", "selon goût", "selon gout",
  "qsp", "qs", "au goût", "au gout",
  "facultatif", "selon besoin", "selon les goûts",
  "quantité non précisée", "quantite non precisee",
  "à volonté", "a volonte",
]);

const FUZZY_QTY_ZERO_OK = new Set(["botte", "bouquet", "sachet"]);

/** Ingrédients → garde-manger (condiments, huiles, épices, sauces) */
const PANTRY_ITEMS = new Set([
  "huile d'olive", "huile d olive", "huile de sesame", "huile de sésame",
  "huile neutre", "huile de tournesol", "huile de colza",
  "sauce soja", "vinaigre de riz", "vinaigre balsamique", "vinaigre",
  "tahini", "moutarde", "ketchup", "mayonnaise", "mayo",
  "worcestershire", "tabasco", "sriracha", "harissa",
  "sel", "poivre", "cumin", "paprika", "curry", "curcuma",
  "cannelle", "muscade", "origan", "thym", "laurier", "sauge",
  "piment", "piment d espelette", "quatre épices", "ras el hanout", "za'atar",
  "sucre", "cassonade", "farine", "fécule", "maïzena",
  "nuoc mam", "nuoc-mâm", "sauce huitre", "sauce huître",
  "sauce worcestershire", "sauce teriyaki", "sauce hoisin",
  "miel", // pantry only if small qty; voir layer 3
]);

/**
 * Produits systématiquement achetés en paquet / conditionnement commercial.
 * Clé = fragment normalisé du nom → { q, unit, display }
 */
const PACKAGE_OVERRIDES: Record<string, { q: number; unit: string; display: string }> = {
  "cheddar":          { q: 1, unit: "paquet",   display: "1 paquet"   },
  "emmental":         { q: 1, unit: "paquet",   display: "1 paquet"   },
  "gruyère":          { q: 1, unit: "paquet",   display: "1 paquet"   },
  "gruyere":          { q: 1, unit: "paquet",   display: "1 paquet"   },
  "raclette":         { q: 1, unit: "paquet",   display: "1 paquet"   },
  "bacon":            { q: 1, unit: "paquet",   display: "1 paquet"   },
  "lardons":          { q: 1, unit: "paquet",   display: "1 paquet"   },
  "jambon":           { q: 1, unit: "paquet",   display: "1 paquet"   },
  "saumon fumé":      { q: 1, unit: "paquet",   display: "1 paquet"   },
  "saumon fume":      { q: 1, unit: "paquet",   display: "1 paquet"   },
  "crème fraîche":    { q: 1, unit: "pot",      display: "1 pot"      },
  "creme fraiche":    { q: 1, unit: "pot",      display: "1 pot"      },
  "crème épaisse":    { q: 1, unit: "pot",      display: "1 pot"      },
  "creme epaisse":    { q: 1, unit: "pot",      display: "1 pot"      },
  "fromage blanc":    { q: 1, unit: "pot",      display: "1 pot"      },
  "skyr":             { q: 1, unit: "pot",      display: "1 pot"      },
  "yaourt grec":      { q: 1, unit: "pot",      display: "1 pot"      },
  "pain pita":        { q: 1, unit: "paquet",   display: "1 paquet"   },
  "pain de mie":      { q: 1, unit: "paquet",   display: "1 paquet"   },
  "tortilla":         { q: 1, unit: "paquet",   display: "1 paquet"   },
  "wrap":             { q: 1, unit: "paquet",   display: "1 paquet"   },
  "pain de campagne": { q: 1, unit: "pain",     display: "1 pain"     },
  "baguette":         { q: 1, unit: "baguette", display: "1 baguette" },
  "pois chiches":     { q: 1, unit: "boîte",   display: "1 boîte"   },
  "haricots blancs":  { q: 1, unit: "boîte",   display: "1 boîte"   },
  "haricots rouges":  { q: 1, unit: "boîte",   display: "1 boîte"   },
  "lentilles en boite": { q: 1, unit: "boîte", display: "1 boîte"   },
  "tomates concassées": { q: 1, unit: "boîte", display: "1 boîte"   },
  "mayonnaise":       { q: 1, unit: "pot",      display: "1 pot"      },
  "moutarde":         { q: 1, unit: "pot",      display: "1 pot"      },
};

/** Unités recette à supprimer silencieusement (pièces nominales) */
const PIECE_UNITS = new Set([
  "pièce", "pièces", "piece", "pieces",
  "unité", "unités", "unite", "unites",
  "portion", "portions",
]);

/** Protéines : render mode WEIGHT_DOMINANT */
const WEIGHT_DOMINANT_FRAGMENTS = [
  "bœuf", "boeuf", "poulet", "dinde", "veau", "porc",
  "agneau", "cabillaud", "saumon", "thon", "bar", "dorade",
  "crevettes", "crevette", "moules", "filet", "blanc de poulet",
  "steak", "côte", "escalope", "aiguillette", "pavé",
];

/** Fragments d'ingrédients à fusionner → clé canonique */
const IDENTITY_MAP: Record<string, string> = {
  "filet de poulet":   "Poulet",
  "filets de poulet":  "Poulet",
  "blanc de poulet":   "Poulet",
  "blancs de poulet":  "Poulet",
  "aiguillette de poulet": "Poulet",
  "escalope de poulet":"Poulet",
  "cuisse de poulet":  "Poulet",
  "cuisses de poulet": "Poulet",
  "bœuf haché":        "Bœuf haché",
  "boeuf hache":       "Bœuf haché",
  "steak haché":       "Bœuf haché",
  "steaks hachés":     "Bœuf haché",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Normalise un nom en minuscules sans diacritiques pour matching */
function norm(s: string): string {
  return s.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/['‘’]/g, " ")
    .trim();
}

function normContains(haystack: string, needle: string): boolean {
  return norm(haystack).includes(norm(needle));
}

/** Parse "300 g", "4 tranches", "1.5 bouquet", "2 c. à soupe" → { qty, unit } */
function parseQty(raw: string): { qty: number; unit: string } {
  if (!raw) return { qty: 0, unit: "" };

  const s = raw.trim();

  // Fractions typographiques
  const fracMatch = s.match(/^(\d+)\/(\d+)\s*(.*)/);
  if (fracMatch) {
    return { qty: parseInt(fracMatch[1]) / parseInt(fracMatch[2]), unit: fracMatch[3].trim() };
  }

  // Nombre + unité
  const numMatch = s.match(/^([0-9]+(?:[.,][0-9]+)?)\s*(.*)/);
  if (numMatch) {
    return { qty: parseFloat(numMatch[1].replace(",", ".")), unit: numMatch[2].trim() };
  }

  // Unité seule (ex: "à goût")
  return { qty: 0, unit: s };
}

/** Formate un nombre proprement (pas de .0 inutile) */
function fmtNum(n: number): string {
  if (n === Math.floor(n)) return String(Math.floor(n));
  return String(Math.round(n * 10) / 10);
}

function isWeightDominant(name: string): boolean {
  const n = norm(name);
  return WEIGHT_DOMINANT_FRAGMENTS.some(f => n.includes(norm(f)));
}

function isPantryCandidate(name: string): boolean {
  const n = norm(name);
  // Huile d'olive → pantry · Huile sésame → pantry · Huile (seul) → pas pantry
  if (/^huile\s*d/.test(n)) return true;
  if (/^huile\s+de\s+(sesame|sésame|noisette|noix)/.test(n)) return true;
  return Array.from(PANTRY_ITEMS).some(p => n === norm(p));
}

function getPackageOverride(name: string): { q: number; unit: string; display: string } | null {
  const n = norm(name);
  for (const [key, val] of Object.entries(PACKAGE_OVERRIDES)) {
    if (n === norm(key) || n.startsWith(norm(key))) return val;
  }
  return null;
}

// ─── Layer 1 : Invalid / Fuzzy Blocker ───────────────────────────────────────

function layer1_fuzzyBlocker(item: PipelineItem): PipelineItem {
  const unitNorm = norm(item.unit);

  // Unité floue explicite
  if (FUZZY_UNITS.has(unitNorm)) {
    item._blocked = true;
    // Fallback déterministe selon la catégorie
    const n = norm(item.name);
    if (/pois\s*chiches/.test(n))      item._fallbackLabel = "1 boîte";
    else if (/haricots/.test(n))       item._fallbackLabel = "1 boîte";
    else if (/mais|maïs/.test(n))      item._fallbackLabel = "1 boîte";
    else if (/mayonnaise|mayo/.test(n))item._fallbackLabel = "1 pot";
    else if (/moutarde/.test(n))       item._fallbackLabel = "1 pot";
    else if (/confiture/.test(n))      item._fallbackLabel = "1 pot";
    else if (/beurre/.test(n))         item._fallbackLabel = "250 g";
    else if (/farine/.test(n))         item._fallbackLabel = "500 g";
    else if (/sucre/.test(n))          item._fallbackLabel = "1 paquet";
    else if (/botte|bouquet/.test(unitNorm)) item._fallbackLabel = "1 botte";
    else                               item._fallbackLabel = "1";
  }

  // Quantité zéro sans unité connue
  if (item.qty === 0 && !FUZZY_QTY_ZERO_OK.has(unitNorm) && !item._blocked) {
    item._blocked = true;
    item._fallbackLabel = getPackageOverride(item.name)?.display ?? "1";
  }

  return item;
}

// ─── Layer 2 : Pantry Routing ─────────────────────────────────────────────────

function layer2_pantryRouting(item: PipelineItem): PipelineItem {
  if (item._pantry) return item;

  if (isPantryCandidate(item.name)) {
    item._pantry = true;
  }

  return item;
}

// ─── Layer 3 : Package Dominant ───────────────────────────────────────────────

function layer3_packageDominant(item: PipelineItem): PipelineItem {
  // Ne s'applique pas aux items pantry ni bloqués (déjà fallback)
  if (item._pantry || item._blocked) return item;

  const override = getPackageOverride(item.name);
  if (!override) return item;

  const unitNorm = norm(item._displayUnit || item.unit);

  // Override si l'unité recette est "recette-centrique" (tranches, c. à soupe, etc.)
  const isRecipeCentric = [
    "tranche", "tranches", "c. à soupe", "c.à.s", "c. à café", "c.à.c",
    "cuillère", "cuilleres", "portion", "portions",
  ].some(u => unitNorm.includes(norm(u)));

  if (isRecipeCentric || unitNorm === "" || PIECE_UNITS.has(unitNorm)) {
    // Calculer le nombre de paquets nécessaires
    const needed = item._displayQty > 0 ? Math.ceil(item._displayQty / 1) : 1;
    const packs = Math.max(1, Math.round(needed));

    if (packs === 1) {
      item._fallbackLabel = override.display;
    } else {
      item._fallbackLabel = `${packs} ${override.unit}s`;
    }
    item._blocked = true; // court-circuit les layers suivantes
  }

  return item;
}

// ─── Layer 4 : Weight Dominant ────────────────────────────────────────────────

function layer4_weightDominant(item: PipelineItem): PipelineItem {
  if (item._pantry || item._blocked) return item;
  if (!isWeightDominant(item.name)) return item;

  const unitNorm = norm(item._displayUnit);

  // Si pièces/portions → ignorer piece_count, calculer poids
  if (PIECE_UNITS.has(unitNorm) || unitNorm === "") {
    // Quantité sans unité sur une protéine = nombre de pièces, pas un poids
    // Laisser passer pour layer 6 qui retirera "pièces"
    return item;
  }

  // Si déjà en grammes / kg → garder
  if (unitNorm === "g" || unitNorm === "kg") {
    return item; // bien formaté, on laisse
  }

  return item;
}

// ─── Layer 5 : Shopping Identity Merge ───────────────────────────────────────
// (Appliqué au niveau liste dans computeShoppingList, pas ici)

function resolveIdentity(name: string): string {
  const n = norm(name);
  for (const [frag, canonical] of Object.entries(IDENTITY_MAP)) {
    if (n === norm(frag) || n.startsWith(norm(frag))) return canonical;
  }
  return name;
}

// ─── Layer 6 : Unit Normalization ─────────────────────────────────────────────

function layer6_unitNormalization(item: PipelineItem): PipelineItem {
  if (item._blocked) return item;

  const u = norm(item._displayUnit);

  // Supprimer "pièce/pièces/unité/unités" dans TOUS les render paths
  if (PIECE_UNITS.has(u)) {
    item._displayUnit = "";
  }

  // Normaliser cuillères
  if (u === "c.à.s" || u === "c. à s." || u === "cac" || u === "cas") {
    item._displayUnit = "c. à soupe";
  }
  if (u === "c.à.c" || u === "c. à c.") {
    item._displayUnit = "c. à café";
  }

  // Pluriels unités de comptage
  const q = item._displayQty;
  if (item._displayUnit === "gousse" && q > 1)  item._displayUnit = "gousses";
  if (item._displayUnit === "botte"  && q > 1)  item._displayUnit = "bottes";
  if (item._displayUnit === "sachet" && q > 1)  item._displayUnit = "sachets";
  if (item._displayUnit === "boîte"  && q > 1)  item._displayUnit = "boîtes";
  if (item._displayUnit === "paquet" && q > 1)  item._displayUnit = "paquets";
  if (item._displayUnit === "boule"  && q > 1)  item._displayUnit = "boules";
  if (item._displayUnit === "tranche"&& q > 1)  item._displayUnit = "tranches";

  return item;
}

// ─── Layer 7 : Human Rounding ─────────────────────────────────────────────────

function layer7_humanRounding(item: PipelineItem): PipelineItem {
  if (item._blocked) return item;

  const u = norm(item._displayUnit);
  const q = item._displayQty;

  // Bouquets / bottes → arrondi humain
  if (u === "bouquet" || u === "botte") {
    if (q <= 0)          item._displayQty = 1;
    else if (q <= 0.3)   { item._displayQty = 1; item._displayUnit = "1/4 " + item._displayUnit; }
    else if (q <= 0.6)   { item._displayUnit = "1/2 " + item._displayUnit; item._displayQty = 0; }
    else if (q <= 1.5)   item._displayQty = 1;
    else                 item._displayQty = Math.ceil(q);
    return item;
  }

  // Grammes : arrondir à la dizaine utile
  if (u === "g") {
    if (q >= 100) item._displayQty = Math.round(q / 10) * 10;
    else if (q >= 50) item._displayQty = Math.round(q / 5) * 5;
    else item._displayQty = Math.round(q);
    return item;
  }

  // Millilitres → cl si pertinent
  if (u === "ml") {
    if (q >= 100) {
      item._displayQty = Math.round(q / 10);
      item._displayUnit = "cl";
    }
    return item;
  }

  // Entiers pour unités de comptage
  if (["botte", "sachet", "boîte", "paquet", "boule", "tête"].some(x => u.startsWith(norm(x)))) {
    item._displayQty = Math.max(1, Math.ceil(q));
  }

  // Fractions < 1 sur pièces → ceil à 1
  if (u === "" && q > 0 && q < 1) {
    item._displayQty = 1;
  }

  return item;
}

// ─── Layer 8 : Visual Cleanup Final ───────────────────────────────────────────

function layer8_visualCleanup(item: PipelineItem): { name: string; q: string } {
  // Si fallback label défini, retourner directement
  if (item._blocked && item._fallbackLabel) {
    return { name: item.name, q: item._fallbackLabel };
  }

  const u = item._displayUnit;
  const q = item._displayQty;

  // Cas bouquet fractionné (unit déjà préfixée "1/2 bouquet")
  if (u.startsWith("1/") || u.startsWith("1 ")) {
    return { name: item.name, q: u };
  }

  // Construction finale
  let display = "";
  if (q > 0) {
    display = fmtNum(q);
    if (u) display += " " + u;
  } else if (u) {
    display = u;
  } else {
    display = "1";
  }

  // Interdit absolu : supprimer toute trace recipe-centric résiduelle
  display = display
    .replace(/\s*\bpièce[s]?\b/gi, "")
    .replace(/\s*\bunité[s]?\b/gi, "")
    .replace(/\s*\bportion[s]?\b/gi, "")
    .replace(/\s*\btranche[s]?\b(?!\s+de)/gi, "") // "tranches" seul, pas "tranche de brioche"
    .replace(/\s*quantité\s+non\s+précisée/gi, "")
    .replace(/\s*à\s+goût/gi, "")
    .replace(/\s+\(0\s*\w*\)/g, "")
    .trim();

  if (!display || display === "0") display = "1";

  return { name: item.name, q: display };
}

// ─── Couche transversale : Œufs → logique boîtes ─────────────────────────────

function handleEggs(item: PipelineItem): PipelineItem {
  if (!norm(item.name).startsWith("oeuf") && !norm(item.name).startsWith("œuf")) return item;

  const qty = item._displayQty || item.qty;
  if (qty <= 0) {
    item._fallbackLabel = "1 boîte";
    item._blocked = true;
    return item;
  }

  const boxes = Math.ceil(qty / 6);
  if (boxes === 1) item._fallbackLabel = `${qty <= 6 ? qty : "6"} (1 boîte)`;
  else item._fallbackLabel = `${boxes} boîtes`;
  item._blocked = true;
  return item;
}

// ─── Pipeline principal ───────────────────────────────────────────────────────

function runPipeline(raw: RawIngredient): { name: string; q: string; isPantry: boolean } {
  const parsed = parseQty(String(raw.qty || 0) + (raw.qty ? " " + raw.unit : raw.unit));

  let item: PipelineItem = {
    ...raw,
    qty: raw.qty,
    unit: raw.unit,
    _pantry: false,
    _blocked: false,
    _displayQty: parsed.qty > 0 ? parsed.qty : raw.qty,
    _displayUnit: parsed.unit || raw.unit,
  };

  // Œufs : traitement prioritaire transversal
  item = handleEggs(item);

  // Couches séquentielles obligatoires
  item = layer1_fuzzyBlocker(item);
  item = layer2_pantryRouting(item);
  item = layer3_packageDominant(item);
  item = layer4_weightDominant(item);
  // Layer 5 : merge → niveau liste (voir computeShoppingList)
  item = layer6_unitNormalization(item);
  item = layer7_humanRounding(item);

  const { name: finalName, q } = layer8_visualCleanup(item);

  return {
    name: resolveIdentity(finalName),
    q,
    isPantry: item._pantry,
  };
}

// ─── API publique ─────────────────────────────────────────────────────────────

/**
 * Transforme une liste d'ingrédients recette en liste de courses normalisée.
 * Applique le pipeline complet en 8 couches, agrège les doublons, et groupe par rayon.
 */
export function computeShoppingList(
  ingredients: Array<RawIngredient & { recipeCount?: number }>
): { aisles: CourseAisle[]; pantryCheck: string[] } {

  // ── Agrégation des doublons avant rendering ───────────────────────────────
  type AggEntry = { raw: RawIngredient; grams: number; recipeCount: number };
  const agg = new Map<string, AggEntry>();

  for (const ing of ingredients) {
    const identity = resolveIdentity(ing.name);
    const key = norm(identity) + "::" + ing.aisle;
    const { qty: parsedQty } = parseQty(String(ing.qty) + " " + ing.unit);

    if (!agg.has(key)) {
      agg.set(key, { raw: { ...ing, name: identity }, grams: parsedQty, recipeCount: ing.recipeCount ?? 1 });
    } else {
      const entry = agg.get(key)!;
      // Additionner si même unité ou convertible
      const u = norm(ing.unit);
      if (u === "kg") entry.grams += parsedQty * 1000;
      else entry.grams += parsedQty;
      entry.recipeCount = Math.max(entry.recipeCount, ing.recipeCount ?? 1);
    }
  }

  // ── Rendering par item ────────────────────────────────────────────────────
  const aisleMap = new Map<Aisle, CourseItem[]>();
  const pantryCheck: string[] = [];

  for (const [, entry] of agg.entries()) {
    const { raw, grams, recipeCount } = entry;

    const result = runPipeline({ ...raw, qty: grams });

    if (result.isPantry) {
      pantryCheck.push(raw.name);
      continue;
    }

    const note = recipeCount > 1 ? `utilisé dans ${recipeCount} repas` : undefined;

    const aisleItems = aisleMap.get(raw.aisle) ?? [];
    aisleItems.push({ name: result.name, q: result.q, note });
    aisleMap.set(raw.aisle, aisleItems);
  }

  // ── Ordre des rayons ──────────────────────────────────────────────────────
  const AISLE_ORDER: Aisle[] = [
    "Fruits & légumes",
    "Viandes & poissons",
    "Produits frais",
    "Épicerie",
    "Surgelés",
    "Condiments & huiles",
    "Boulangerie",
  ];

  const aisles: CourseAisle[] = AISLE_ORDER
    .filter(a => aisleMap.has(a))
    .map(a => ({ aisle: a, items: aisleMap.get(a)! }));

  return { aisles, pantryCheck };
}

/**
 * Validation runtime : vérifie qu'aucune sortie interdite n'est présente.
 * Retourne les violations trouvées (array vide = OK).
 */
export function validateShoppingOutput(aisles: CourseAisle[]): string[] {
  const FORBIDDEN = [
    /\bpièce[s]?\b/i,
    /\bunité[s]?\b/i,
    /\bportion[s]?\b/i,
    /quantité\s+non\s+précisée/i,
    /à\s+goût/i,
    /\d+\s*\(\s*\d+\s*g\s*\)/,   // "2(300g)"
    /\d+\s*×\s*\d+/,              // "2 × 300g"
    /c\.à\.s/i,
    /c\.à\.c/i,
  ];

  const violations: string[] = [];

  for (const group of aisles) {
    for (const item of group.items) {
      if (!item.q) continue;
      for (const re of FORBIDDEN) {
        if (re.test(item.q)) {
          violations.push(`[${group.aisle}] "${item.name}" → "${item.q}" : interdit par ${re}`);
        }
      }
    }
  }

  return violations;
}

/**
 * Snapshot test — à appeler en dev pour vérifier les sorties clés.
 */
export function runSnapshotTests(): void {
  const CASES: Array<{ input: RawIngredient; expectedQ: string }> = [
    { input: { name: "Citron",          qty: 2, unit: "pièces",    aisle: "Fruits & légumes" },   expectedQ: "2"         },
    { input: { name: "Concombre",       qty: 3, unit: "pièces",    aisle: "Fruits & légumes" },   expectedQ: "3"         },
    { input: { name: "Poulet",          qty: 600, unit: "g",       aisle: "Viandes & poissons" }, expectedQ: "600 g"     },
    { input: { name: "Cheddar",         qty: 4, unit: "tranches",  aisle: "Produits frais" },     expectedQ: "1 paquet"  },
    { input: { name: "Pain de campagne",qty: 2, unit: "tranches",  aisle: "Boulangerie" },        expectedQ: "1 pain"    },
    { input: { name: "Pain pita",       qty: 4, unit: "",          aisle: "Boulangerie" },        expectedQ: "1 paquet"  },
    { input: { name: "Crème fraîche",   qty: 4, unit: "c. à soupe",aisle: "Produits frais" },    expectedQ: "1 pot"     },
    { input: { name: "Pois chiches",    qty: 0, unit: "à goût",    aisle: "Épicerie" },           expectedQ: "1 boîte"   },
    { input: { name: "Mayonnaise",      qty: 0, unit: "à goût",    aisle: "Épicerie" },           expectedQ: "1 pot"     },
    { input: { name: "Œufs",           qty: 16, unit: "",          aisle: "Produits frais" },     expectedQ: "3 boîtes"  },
    { input: { name: "Basilic frais",   qty: 1.5, unit: "bouquet", aisle: "Fruits & légumes" },  expectedQ: "1 bouquet" },
    { input: { name: "Coriandre",       qty: 0.5, unit: "bouquet", aisle: "Fruits & légumes" },  expectedQ: "1/2 bouquet"},
    { input: { name: "Ail",             qty: 3, unit: "gousses",   aisle: "Fruits & légumes" },  expectedQ: "3 gousses" },
  ];

  let pass = 0; let fail = 0;
  for (const { input, expectedQ } of CASES) {
    const result = runPipeline(input);
    const ok = result.q === expectedQ;
    if (ok) { pass++; }
    else {
      fail++;
      console.warn(`❌ "${input.name}" : attendu "${expectedQ}", obtenu "${result.q}"`);
    }
  }
  console.info(`🧪 Snapshot tests : ${pass}/${CASES.length} OK${fail > 0 ? ` — ${fail} échecs` : " ✅"}`);
}
