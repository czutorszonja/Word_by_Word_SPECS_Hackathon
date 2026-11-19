// SUPERSEDED by agent/phase-c/drafts/WbwPhraseHelperModel.ts — DO NOT PORT. Port only WbwPhraseHelperModel.ts,
// so Assets/ ends up with a single ingredient table. This file (the R3 §11 reference) exports the same names
// with a different contract: huSegments instead of emphasisRanges, normaliseSlots ignores maxSlots, and any
// pattern other than "want" falls into the "without" branch.
// WbwPhraseBuilder.ts — the two checked phrase patterns for the Use it live phrase helper.
// Owns: per-ingredient forms (nominative / accusative / English / clip keys) and the rules for
//       "Kérek <acc> a szendvicsembe." and "<Nom> nélkül, kérem." with 1..MAX_SLOTS ingredients.
// Must NOT: touch the scene, play audio or hold state. Pure functions (runs under plain Node).
// Strings are NFC (precomposed accents), like WbwVocab.ts.

export type PhrasePattern = "want" | "without"

export interface PhraseIngredient {
  id: string          // WordEntry.id (SceneObject Learnable_<id>)
  nom: string         // dictionary form: hover label, word card, the "nélkül" pattern
  acc: string         // accusative: only inside "Kérek … a szendvicsembe."
  enLabel: string     // English on the hover label / word card (= WbwVocab en)
  enPhrase: string    // English inside the phrase line
  wClip: string       // clip saying `nom` (multi-item "nélkül" sentences)
  aClip: string       // clip saying `acc` (multi-item "Kérek" sentences)
  wantClip: string    // whole recorded sentence, 1 item: "Kérek <acc> a szendvicsembe."
  withoutClip: string // whole recorded sentence, 1 item: "<Nom> nélkül, kérem."
}

// Clip keys are written out, never derived from the id: id "csirke" must use *_sult_csirke
// (a_csirke / w_csirke say plain "csirkét" / "csirke"), id "uborka" (pickles) uses w_uborka and
// a_savanyu_uborka (there is no a_uborka clip).
export const PHRASE_INGREDIENTS: PhraseIngredient[] = [
  {id: "sonka", nom: "sonka", acc: "sonkát", enLabel: "ham", enPhrase: "ham", wClip: "w_sonka", aClip: "a_sonka", wantClip: "p_kerek_sonka", withoutClip: "p_nelkul_sonka"},
  {id: "szalami", nom: "szalámi", acc: "szalámit", enLabel: "salami", enPhrase: "salami", wClip: "w_szalami", aClip: "a_szalami", wantClip: "p_kerek_szalami", withoutClip: "p_nelkul_szalami"},
  {id: "csirke", nom: "sült csirke", acc: "sült csirkét", enLabel: "roast chicken", enPhrase: "roast chicken", wClip: "w_sult_csirke", aClip: "a_sult_csirke", wantClip: "p_kerek_csirke", withoutClip: "p_nelkul_csirke"},
  {id: "sajt", nom: "sajt", acc: "sajtot", enLabel: "cheese", enPhrase: "cheese", wClip: "w_sajt", aClip: "a_sajt", wantClip: "p_kerek_sajt", withoutClip: "p_nelkul_sajt"},
  {id: "husgomboc", nom: "húsgombóc", acc: "húsgombócot", enLabel: "meatball", enPhrase: "meatballs", wClip: "w_husgomboc", aClip: "a_husgomboc", wantClip: "p_kerek_husgomboc", withoutClip: "p_nelkul_husgomboc"},
  {id: "salata", nom: "saláta", acc: "salátát", enLabel: "lettuce", enPhrase: "lettuce", wClip: "w_salata", aClip: "a_salata", wantClip: "p_kerek_salata", withoutClip: "p_nelkul_salata"},
  {id: "spenot", nom: "spenót", acc: "spenótot", enLabel: "spinach", enPhrase: "spinach", wClip: "w_spenot", aClip: "a_spenot", wantClip: "p_kerek_spenot", withoutClip: "p_nelkul_spenot"},
  {id: "paradicsom", nom: "paradicsom", acc: "paradicsomot", enLabel: "tomato", enPhrase: "tomato", wClip: "w_paradicsom", aClip: "a_paradicsom", wantClip: "p_kerek_paradicsom", withoutClip: "p_nelkul_paradicsom"},
  {id: "paprika", nom: "paprika", acc: "paprikát", enLabel: "peppers", enPhrase: "peppers", wClip: "w_paprika", aClip: "a_paprika", wantClip: "p_kerek_paprika", withoutClip: "p_nelkul_paprika"},
  {id: "uborka_friss", nom: "uborka", acc: "uborkát", enLabel: "cucumber", enPhrase: "cucumber", wClip: "w_uborka_friss", aClip: "a_uborka_friss", wantClip: "p_kerek_uborka_friss", withoutClip: "p_nelkul_uborka_friss"},
  {id: "uborka", nom: "savanyú uborka", acc: "savanyú uborkát", enLabel: "pickles", enPhrase: "pickles", wClip: "w_uborka", aClip: "a_savanyu_uborka", wantClip: "p_kerek_uborka", withoutClip: "p_nelkul_uborka"},
  {id: "hagyma", nom: "hagyma", acc: "hagymát", enLabel: "onion", enPhrase: "onion", wClip: "w_hagyma", aClip: "a_hagyma", wantClip: "p_kerek_hagyma", withoutClip: "p_nelkul_hagyma"},
  {id: "olivabogyo", nom: "olívabogyó", acc: "olívabogyót", enLabel: "olives", enPhrase: "olives", wClip: "w_olivabogyo", aClip: "a_olivabogyo", wantClip: "p_kerek_olivabogyo", withoutClip: "p_nelkul_olivabogyo"},
  {id: "majonez", nom: "majonéz", acc: "majonézt", enLabel: "mayonnaise", enPhrase: "mayonnaise", wClip: "w_majonez", aClip: "a_majonez", wantClip: "p_kerek_majonez", withoutClip: "p_nelkul_majonez"},
  {id: "mustar", nom: "mustár", acc: "mustárt", enLabel: "mustard", enPhrase: "mustard", wClip: "w_mustar", aClip: "a_mustar", wantClip: "p_kerek_mustar", withoutClip: "p_nelkul_mustar"},
]

export const MAX_SLOTS = 4
export const SLOT_PLACEHOLDER = "…" // "…" while no ingredient is chosen

export interface PhraseSegment { text: string; slot: boolean } // slot = gently emphasised

export interface BuiltPhrase {
  pattern: PhrasePattern
  slotIds: string[]            // normalised: known ids, no duplicates, insertion order, <= MAX_SLOTS
  hu: string                   // e.g. "Kérek uborkát a szendvicsembe."
  en: string                   // e.g. "I'd like cucumber in my sandwich."
  audioKey: string             // "" when there is no ingredient (Listen disabled)
  huSegments: PhraseSegment[]  // joined = hu; slot segments are the ingredient words
  enSegments: PhraseSegment[]  // joined = en
  empty: boolean
}

export function phraseIngredientById(id: string): PhraseIngredient | null {
  for (const g of PHRASE_INGREDIENTS) if (g.id === id) return g
  return null
}

/** Only these 15 counter ingredients may fill the slot ("Kérek kávét a szendvicsembe" is nonsense). */
export function canUseInPhrase(id: string): boolean {
  return phraseIngredientById(id) !== null
}

/** Known ids only, first occurrence wins, insertion order kept, capped at MAX_SLOTS. */
export function normaliseSlots(ids: string[]): string[] {
  const out: string[] = []
  for (const id of ids) {
    if (out.length >= MAX_SLOTS) break
    if (canUseInPhrase(id) && out.indexOf(id) < 0) out.push(id)
  }
  return out
}

/** Upper-cases the first character only ("Szalámi", never "SZalámi"). */
export function capFirst(s: string): string {
  return s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

/** "A" · "A <conj> B" · "A, B <conj> C" — no comma before the conjunction. */
function listSegments(items: string[], conj: string): PhraseSegment[] {
  if (items.length === 0) return [{text: SLOT_PLACEHOLDER, slot: true}]
  const out: PhraseSegment[] = []
  for (let i = 0; i < items.length; i++) {
    if (i > 0) out.push({text: i === items.length - 1 ? " " + conj + " " : ", ", slot: false})
    out.push({text: items[i], slot: true})
  }
  return out
}

/** Item clips with c_es before the last one (commas have no clip). */
function listClips(clips: string[]): string[] {
  const out: string[] = []
  for (let i = 0; i < clips.length; i++) {
    if (i > 0 && i === clips.length - 1) out.push("c_es")
    out.push(clips[i])
  }
  return out
}

function joinText(segs: PhraseSegment[]): string {
  return segs.map((s) => s.text).join("")
}

export function buildPhrase(slotIdsIn: string[], pattern: PhrasePattern): BuiltPhrase {
  const slotIds = normaliseSlots(slotIdsIn)
  const g = slotIds.map((id) => phraseIngredientById(id) as PhraseIngredient)
  const enList = listSegments(g.map((x) => x.enPhrase), "and")
  let huSegments: PhraseSegment[]
  let enSegments: PhraseSegment[]
  let audioKey = ""
  if (pattern === "want") {
    huSegments = [{text: "Kérek ", slot: false}]
      .concat(listSegments(g.map((x) => x.acc), "és"))
      .concat([{text: " a szendvicsembe.", slot: false}])
    enSegments = [{text: "I'd like ", slot: false}]
      .concat(enList)
      .concat([{text: " in my sandwich.", slot: false}])
    if (g.length === 1) audioKey = g[0].wantClip
    else if (g.length > 1) audioKey = ["c_kerek"].concat(listClips(g.map((x) => x.aClip)), ["c_a_szendvicsembe"]).join("+")
  } else {
    const noms = g.map((x) => x.nom)
    if (noms.length > 0) noms[0] = capFirst(noms[0])
    huSegments = listSegments(noms, "és").concat([{text: " nélkül, kérem.", slot: false}])
    enSegments = [{text: "Without ", slot: false}]
      .concat(enList)
      .concat([{text: ", please.", slot: false}])
    if (g.length === 1) audioKey = g[0].withoutClip
    else if (g.length > 1) audioKey = listClips(g.map((x) => x.wClip)).concat(["c_nelkul", "c_kerem"]).join("+")
  }
  return {
    pattern, slotIds,
    hu: joinText(huSegments), en: joinText(enSegments), audioKey,
    huSegments, enSegments, empty: g.length === 0,
  }
}

/** Every clip the builder can emit, for a startup check against WbwAudioBank (`(k) => !!AUDIO[k]`). */
export function phraseClipKeys(): string[] {
  const keys = ["c_kerek", "c_es", "c_a_szendvicsembe", "c_nelkul", "c_kerem"]
  for (const g of PHRASE_INGREDIENTS) keys.push(g.wClip, g.aClip, g.wantClip, g.withoutClip)
  return keys
}
