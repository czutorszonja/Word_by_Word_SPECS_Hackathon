// SUPERSEDED by agent/phase-c/drafts/WbwPhraseHelperModel.ts — DO NOT PORT (and do not adopt ORDER_INGREDIENTS).
// This file implements the OLD order-strip design (fixed sandwich order, "<W> kérek, <X> nélkül."); the agreed
// design uses insertion order and "Kérek <acc> a szendvicsembe." / "<Nom> nélkül, kérem.". Port only the model.
// WbwSentenceBuilder.ts — builds the step-2 order sentence ("Mit kér bele?") from ingredient choices.
// Owns: the 15 counter ingredients' order forms (nominative for "nélkül", accusative for "kérek"),
//       the English order words, the clip keys, and the list/case rules from
//       agent/phase-c/research/R3_hungarian.md (wanted list + "kérek", one "nélkül" after the
//       excluded list, "A, B és C" with no comma before "és", fixed sandwich order, not tap order).
// Must NOT: touch the scene, play audio, or hold session state. Pure functions, no Lens API,
//           so it runs under plain Node for unit checks (see selfTest()).
// Ids are WordEntry.id values from WbwVocab.ts (SceneObject Learnable_<id> on the counter).
// Strings use precomposed (NFC) accents, like WbwVocab.ts; compare test strings in NFC.

export interface OrderIngredient {
  id: string      // WordEntry.id (Learnable_<id>)
  nom: string     // nominative, used before "nélkül" ("savanyú uborka")
  acc: string     // accusative, used before "kérek" ("savanyú uborkát")
  en: string      // English word inside an order sentence (plural where English says so)
  wClip: string   // clip saying the nominative (also the word-card clip, WordEntry.audio)
  aClip: string   // clip saying the accusative
}

/**
 * The 15 counter ingredients in canonical sandwich order
 * (meats → cheese → vegetables → pickled/olives → onion → sauces). Both lists are sorted by this.
 * Traps: id "csirke" is roast chicken (w_sult_csirke / a_sult_csirke, NOT w_csirke / a_csirke);
 * id "uborka" is pickles (w_uborka says "savanyú uborka"; accusative a_savanyu_uborka);
 * id "uborka_friss" is fresh cucumber.
 */
export const ORDER_INGREDIENTS: OrderIngredient[] = [
  {id: "sonka", nom: "sonka", acc: "sonkát", en: "ham", wClip: "w_sonka", aClip: "a_sonka"},
  {id: "szalami", nom: "szalámi", acc: "szalámit", en: "salami", wClip: "w_szalami", aClip: "a_szalami"},
  {id: "csirke", nom: "sült csirke", acc: "sült csirkét", en: "roast chicken", wClip: "w_sult_csirke", aClip: "a_sult_csirke"},
  {id: "husgomboc", nom: "húsgombóc", acc: "húsgombócot", en: "meatballs", wClip: "w_husgomboc", aClip: "a_husgomboc"},
  {id: "sajt", nom: "sajt", acc: "sajtot", en: "cheese", wClip: "w_sajt", aClip: "a_sajt"},
  {id: "salata", nom: "saláta", acc: "salátát", en: "lettuce", wClip: "w_salata", aClip: "a_salata"},
  {id: "spenot", nom: "spenót", acc: "spenótot", en: "spinach", wClip: "w_spenot", aClip: "a_spenot"},
  {id: "paradicsom", nom: "paradicsom", acc: "paradicsomot", en: "tomato", wClip: "w_paradicsom", aClip: "a_paradicsom"},
  {id: "paprika", nom: "paprika", acc: "paprikát", en: "peppers", wClip: "w_paprika", aClip: "a_paprika"},
  {id: "uborka_friss", nom: "uborka", acc: "uborkát", en: "cucumber", wClip: "w_uborka_friss", aClip: "a_uborka_friss"},
  {id: "uborka", nom: "savanyú uborka", acc: "savanyú uborkát", en: "pickles", wClip: "w_uborka", aClip: "a_savanyu_uborka"},
  {id: "olivabogyo", nom: "olívabogyó", acc: "olívabogyót", en: "olives", wClip: "w_olivabogyo", aClip: "a_olivabogyo"},
  {id: "hagyma", nom: "hagyma", acc: "hagymát", en: "onion", wClip: "w_hagyma", aClip: "a_hagyma"},
  {id: "majonez", nom: "majonéz", acc: "majonézt", en: "mayonnaise", wClip: "w_majonez", aClip: "a_majonez"},
  {id: "mustar", nom: "mustár", acc: "mustárt", en: "mustard", wClip: "w_mustar", aClip: "a_mustar"},
]

/** Connector clips (Assets/Audio/hu/c_*.wav). Commas have no clip: every clip has ~0.3 s padding. */
export const CLIP_ES = "c_es"
export const CLIP_KEREK = "c_kerek"
export const CLIP_NELKUL = "c_nelkul"
export const CLIP_KEREM = "c_kerem"

/** Recorded whole phrases that equal a built key: played instead (natural prosody, half as long). */
export const WHOLE_PHRASE_OVERRIDES: {[builtKey: string]: string} = {
  "a_sonka+c_es+a_sajt+c_kerek": "p_sonka_sajt",
  "w_uborka+c_nelkul+c_kerem": "p_uborka_nelkul",
}

/** English hint on the strip when nothing is chosen yet. */
export const HINT_EMPTY = "Point at the ingredients on the counter."
/** English hint when only "nélkül" items are chosen (preview, not submittable). */
export const HINT_NEED_WANT = "Choose at least one thing you want (Kérek)."

export interface BuiltSentence {
  hu: string              // display sentence; "" when nothing is chosen
  en: string              // English line under it; "" when nothing is chosen
  audioKey: string        // composed "a+b+c" key, deterministic (assert this in tests); "" when empty
  valid: boolean          // submittable: at least one wanted ingredient ("Said it" / voice may advance)
  playKey: string         // key to actually play (whole-phrase override applied); "" when empty
  wanted: string[]        // known wanted ids, deduped, canonical order
  without: string[]       // known excluded ids, deduped, canonical order, never also wanted
  ignored: string[]       // input ids that are not counter ingredients (deduped, input order)
  huLines: string[]       // suggested strip lines: break after the comma before the "nélkül" part
  hint: string            // English hint for the strip ("" when valid)
  parts: string[]         // audioKey split on "+"
  commaAfter: number[]    // part indices followed by a list comma (short pause if timing is tightened)
  mainBreakAfter: number  // part index followed by the main comma (long pause), -1 if none
}

export function orderIngredientById(id: string): OrderIngredient | null {
  for (const g of ORDER_INGREDIENTS) if (g.id === id) return g
  return null
}

export function isOrderIngredient(id: string): boolean {
  return orderIngredientById(id) !== null
}

/** "A" · "A és B" · "A, B és C" (no comma before the conjunction). */
export function joinList(items: string[], conjunction: string): string {
  if (items.length <= 1) return items.join("")
  return items.slice(0, -1).join(", ") + " " + conjunction + " " + items[items.length - 1]
}

/** Upper-cases only the first character ("Szalámit", not "SZalámit"). */
export function capFirst(s: string): string {
  return s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

/** Appends list clips with c_es before the last one; records where list commas fall. */
function pushListClips(parts: string[], clips: string[], commaAfter: number[]): void {
  for (let i = 0; i < clips.length; i++) {
    if (i > 0 && i === clips.length - 1) parts.push(CLIP_ES)
    parts.push(clips[i])
    if (i < clips.length - 2) commaAfter.push(parts.length - 1)
  }
}

/**
 * Builds the order sentence. `wantedIds` / `withoutIds` may be in tap order, contain duplicates
 * or unknown ids; the output is always in canonical sandwich order. An id in both lists counts as
 * wanted only (the chooser keeps one state per ingredient; this is a safeguard).
 *
 *   wanted only      → "<W> kérek."              valid
 *   wanted + without → "<W> kérek, <X> nélkül."  valid
 *   without only     → "<X> nélkül, kérem."      preview, NOT valid (hint HINT_NEED_WANT)
 *   nothing          → "" (hint HINT_EMPTY, no audio)
 */
export function buildOrderSentence(wantedIds: string[], withoutIds: string[]): BuiltSentence {
  const want = ORDER_INGREDIENTS.filter((g) => wantedIds.indexOf(g.id) >= 0)
  const wout = ORDER_INGREDIENTS.filter((g) => withoutIds.indexOf(g.id) >= 0 && wantedIds.indexOf(g.id) < 0)
  const ignored: string[] = []
  for (const id of wantedIds.concat(withoutIds)) {
    if (!isOrderIngredient(id) && ignored.indexOf(id) < 0) ignored.push(id)
  }

  const parts: string[] = []
  const commaAfter: number[] = []
  let mainBreakAfter = -1
  let hu = ""
  let en = ""
  let huLines: string[] = []
  let hint = ""

  if (want.length > 0) {
    const wHu = capFirst(joinList(want.map((g) => g.acc), "és")) + " kérek"
    const wEn = joinList(want.map((g) => g.en), "and")
    pushListClips(parts, want.map((g) => g.aClip), commaAfter)
    parts.push(CLIP_KEREK)
    if (wout.length > 0) {
      const xHu = joinList(wout.map((g) => g.nom), "és") + " nélkül."
      mainBreakAfter = parts.length - 1
      pushListClips(parts, wout.map((g) => g.wClip), commaAfter)
      parts.push(CLIP_NELKUL)
      hu = wHu + ", " + xHu
      huLines = [wHu + ",", xHu]
      en = capFirst(wEn) + ", without " + joinList(wout.map((g) => g.en), "and") + ", please."
    } else {
      hu = wHu + "."
      huLines = [hu]
      en = capFirst(wEn) + ", please."
    }
  } else if (wout.length > 0) {
    hu = capFirst(joinList(wout.map((g) => g.nom), "és")) + " nélkül, kérem."
    huLines = [hu]
    en = "Without " + joinList(wout.map((g) => g.en), "and") + ", please."
    pushListClips(parts, wout.map((g) => g.wClip), commaAfter)
    parts.push(CLIP_NELKUL)
    mainBreakAfter = parts.length - 1
    parts.push(CLIP_KEREM)
    hint = HINT_NEED_WANT
  } else {
    hint = HINT_EMPTY
  }

  const audioKey = parts.join("+")
  return {
    hu,
    en,
    audioKey,
    valid: want.length > 0,
    playKey: WHOLE_PHRASE_OVERRIDES[audioKey] || audioKey,
    wanted: want.map((g) => g.id),
    without: wout.map((g) => g.id),
    ignored,
    huLines,
    hint,
    parts,
    commaAfter,
    mainBreakAfter,
  }
}

// ---------------------------------------------------------------------------------------------
// Self-check. The cases mirror agent/phase-c/drafts/WbwSentenceBuilder.cases.md (rows 1–20 are the
// worked examples in R3_hungarian.md §7; 21+ are edge cases). Inputs are in tap order.

export interface SentenceCase {
  n: number
  want: string[]
  without: string[]
  hu: string
  en: string
  audioKey: string
  valid: boolean
  playKey?: string   // defaults to audioKey
}

export const SENTENCE_CASES: SentenceCase[] = [
  {n: 1, want: ["sonka"], without: [],
    hu: "Sonkát kérek.", en: "Ham, please.",
    audioKey: "a_sonka+c_kerek", valid: true},
  {n: 2, want: ["sonka", "sajt"], without: [],
    hu: "Sonkát és sajtot kérek.", en: "Ham and cheese, please.",
    audioKey: "a_sonka+c_es+a_sajt+c_kerek", valid: true, playKey: "p_sonka_sajt"},
  {n: 3, want: ["sonka", "szalami", "paprika"], without: ["uborka"],
    hu: "Sonkát, szalámit és paprikát kérek, savanyú uborka nélkül.",
    en: "Ham, salami and peppers, without pickles, please.",
    audioKey: "a_sonka+a_szalami+c_es+a_paprika+c_kerek+w_uborka+c_nelkul", valid: true},
  {n: 4, want: ["csirke"], without: ["hagyma"],
    hu: "Sült csirkét kérek, hagyma nélkül.", en: "Roast chicken, without onion, please.",
    audioKey: "a_sult_csirke+c_kerek+w_hagyma+c_nelkul", valid: true},
  {n: 5, want: ["husgomboc", "sajt"], without: ["hagyma", "mustar"],
    hu: "Húsgombócot és sajtot kérek, hagyma és mustár nélkül.",
    en: "Meatballs and cheese, without onion and mustard, please.",
    audioKey: "a_husgomboc+c_es+a_sajt+c_kerek+w_hagyma+c_es+w_mustar+c_nelkul", valid: true},
  {n: 6, want: ["salata", "paradicsom", "uborka_friss"], without: [],
    hu: "Salátát, paradicsomot és uborkát kérek.", en: "Lettuce, tomato and cucumber, please.",
    audioKey: "a_salata+a_paradicsom+c_es+a_uborka_friss+c_kerek", valid: true},
  {n: 7, want: ["uborka_friss"], without: ["uborka"],
    hu: "Uborkát kérek, savanyú uborka nélkül.", en: "Cucumber, without pickles, please.",
    audioKey: "a_uborka_friss+c_kerek+w_uborka+c_nelkul", valid: true},
  {n: 8, want: ["uborka", "olivabogyo"], without: [],
    hu: "Savanyú uborkát és olívabogyót kérek.", en: "Pickles and olives, please.",
    audioKey: "a_savanyu_uborka+c_es+a_olivabogyo+c_kerek", valid: true},
  {n: 9, want: ["szalami", "spenot"], without: ["majonez"],
    hu: "Szalámit és spenótot kérek, majonéz nélkül.", en: "Salami and spinach, without mayonnaise, please.",
    audioKey: "a_szalami+c_es+a_spenot+c_kerek+w_majonez+c_nelkul", valid: true},
  {n: 10, want: ["sonka", "sajt", "salata", "paradicsom", "majonez"], without: [],
    hu: "Sonkát, sajtot, salátát, paradicsomot és majonézt kérek.",
    en: "Ham, cheese, lettuce, tomato and mayonnaise, please.",
    audioKey: "a_sonka+a_sajt+a_salata+a_paradicsom+c_es+a_majonez+c_kerek", valid: true},
  {n: 11, want: ["csirke", "paprika"], without: ["hagyma", "olivabogyo", "uborka"],
    hu: "Sült csirkét és paprikát kérek, savanyú uborka, olívabogyó és hagyma nélkül.",
    en: "Roast chicken and peppers, without pickles, olives and onion, please.",
    audioKey: "a_sult_csirke+c_es+a_paprika+c_kerek+w_uborka+w_olivabogyo+c_es+w_hagyma+c_nelkul", valid: true},
  {n: 12, want: ["mustar"], without: [],
    hu: "Mustárt kérek.", en: "Mustard, please.",
    audioKey: "a_mustar+c_kerek", valid: true},
  {n: 13, want: ["sajt"], without: ["sonka"],
    hu: "Sajtot kérek, sonka nélkül.", en: "Cheese, without ham, please.",
    audioKey: "a_sajt+c_kerek+w_sonka+c_nelkul", valid: true},
  {n: 14, want: ["paprika", "sonka"], without: ["mustar", "majonez"],
    hu: "Sonkát és paprikát kérek, majonéz és mustár nélkül.",
    en: "Ham and peppers, without mayonnaise and mustard, please.",
    audioKey: "a_sonka+c_es+a_paprika+c_kerek+w_majonez+c_es+w_mustar+c_nelkul", valid: true},
  {n: 15, want: ["sonka", "szalami", "csirke", "husgomboc"], without: ["spenot", "paradicsom", "paprika", "hagyma"],
    hu: "Sonkát, szalámit, sült csirkét és húsgombócot kérek, spenót, paradicsom, paprika és hagyma nélkül.",
    en: "Ham, salami, roast chicken and meatballs, without spinach, tomato, peppers and onion, please.",
    audioKey: "a_sonka+a_szalami+a_sult_csirke+c_es+a_husgomboc+c_kerek+w_spenot+w_paradicsom+w_paprika+c_es+w_hagyma+c_nelkul",
    valid: true},
  {n: 16, want: ["hagyma"], without: [],
    hu: "Hagymát kérek.", en: "Onion, please.",
    audioKey: "a_hagyma+c_kerek", valid: true},
  {n: 17, want: [], without: ["hagyma"],
    hu: "Hagyma nélkül, kérem.", en: "Without onion, please.",
    audioKey: "w_hagyma+c_nelkul+c_kerem", valid: false},
  {n: 18, want: [], without: ["uborka"],
    hu: "Savanyú uborka nélkül, kérem.", en: "Without pickles, please.",
    audioKey: "w_uborka+c_nelkul+c_kerem", valid: false, playKey: "p_uborka_nelkul"},
  {n: 19, want: [], without: ["hagyma", "mustar"],
    hu: "Hagyma és mustár nélkül, kérem.", en: "Without onion and mustard, please.",
    audioKey: "w_hagyma+c_es+w_mustar+c_nelkul+c_kerem", valid: false},
  {n: 20, want: [], without: [],
    hu: "", en: "",
    audioKey: "", valid: false},
  // Edge cases beyond R3 §7
  {n: 21, want: ["sajt", "sonka", "sajt"], without: [],
    hu: "Sonkát és sajtot kérek.", en: "Ham and cheese, please.",
    audioKey: "a_sonka+c_es+a_sajt+c_kerek", valid: true, playKey: "p_sonka_sajt"},
  {n: 22, want: ["sonka"], without: ["sonka", "hagyma"],
    hu: "Sonkát kérek, hagyma nélkül.", en: "Ham, without onion, please.",
    audioKey: "a_sonka+c_kerek+w_hagyma+c_nelkul", valid: true},
  {n: 23, want: ["kave", "olivabogyo"], without: ["szendvics"],
    hu: "Olívabogyót kérek.", en: "Olives, please.",
    audioKey: "a_olivabogyo+c_kerek", valid: true},
  {n: 24, want: [], without: ["csirke"],
    hu: "Sült csirke nélkül, kérem.", en: "Without roast chicken, please.",
    audioKey: "w_sult_csirke+c_nelkul+c_kerem", valid: false},
  {n: 25, want: ["uborka"], without: ["uborka_friss"],
    hu: "Savanyú uborkát kérek, uborka nélkül.", en: "Pickles, without cucumber, please.",
    audioKey: "a_savanyu_uborka+c_kerek+w_uborka_friss+c_nelkul", valid: true},
  {n: 26, want: ["szalami"], without: ["husgomboc", "salata", "spenot"],
    hu: "Szalámit kérek, húsgombóc, saláta és spenót nélkül.",
    en: "Salami, without meatballs, lettuce and spinach, please.",
    audioKey: "a_szalami+c_kerek+w_husgomboc+w_salata+c_es+w_spenot+c_nelkul", valid: true},
  {n: 27, want: ["sajt", "sonka"], without: ["uborka"],
    hu: "Sonkát és sajtot kérek, savanyú uborka nélkül.",
    en: "Ham and cheese, without pickles, please.",
    audioKey: "a_sonka+c_es+a_sajt+c_kerek+w_uborka+c_nelkul", valid: true},
  {n: 28, want: ["kave"], without: [],
    hu: "", en: "",
    audioKey: "", valid: false},
]

/** Runs every SENTENCE_CASES row; returns one message per mismatch ([] = all good). */
export function selfTest(): string[] {
  const out: string[] = []
  const check = (n: number, field: string, expected: string, got: string): void => {
    if (expected !== got) out.push(`#${n} ${field}: expected "${expected}" got "${got}"`)
  }
  for (const c of SENTENCE_CASES) {
    const r = buildOrderSentence(c.want, c.without)
    check(c.n, "hu", c.hu, r.hu)
    check(c.n, "en", c.en, r.en)
    check(c.n, "audioKey", c.audioKey, r.audioKey)
    check(c.n, "valid", String(c.valid), String(r.valid))
    check(c.n, "playKey", c.playKey !== undefined ? c.playKey : c.audioKey, r.playKey)
    check(c.n, "parts", c.audioKey, r.parts.join("+"))
    check(c.n, "huLines", c.hu, r.huLines.join(" "))
    const expHint = c.valid ? "" : (c.hu === "" ? HINT_EMPTY : HINT_NEED_WANT)
    check(c.n, "hint", expHint, r.hint)
  }
  return out
}

/**
 * Consistency with WbwVocab.WORDS (pass it in; no import keeps this module standalone):
 * every ingredient id exists, `nom` equals WordEntry.hu, `wClip` equals WordEntry.audio,
 * and every "sandwich" word is in the table. Returns mismatch messages ([] = consistent).
 */
export function vocabMismatches(words: {id: string; hu: string; audio: string; area: string}[]): string[] {
  const out: string[] = []
  for (const g of ORDER_INGREDIENTS) {
    let w: {id: string; hu: string; audio: string; area: string} | null = null
    for (const x of words) if (x.id === g.id) w = x
    if (!w) { out.push(`${g.id}: not in WORDS`); continue }
    if (w.hu !== g.nom) out.push(`${g.id}: nom "${g.nom}" != WORDS.hu "${w.hu}"`)
    if (w.audio !== g.wClip) out.push(`${g.id}: wClip "${g.wClip}" != WORDS.audio "${w.audio}"`)
  }
  for (const w of words) {
    if (w.area === "sandwich" && !isOrderIngredient(w.id)) out.push(`${w.id}: sandwich word missing from ORDER_INGREDIENTS`)
  }
  return out
}

/**
 * Every clip the builder can emit exists. Pass e.g. `(k) => !!AUDIO[k]` (WbwAudioBank) or
 * `(k) => audio.has(k)` (WbwAudioController). Returns the missing keys ([] = all present).
 */
export function missingClips(has: (key: string) => boolean): string[] {
  const keys: string[] = [CLIP_ES, CLIP_KEREK, CLIP_NELKUL, CLIP_KEREM]
  for (const g of ORDER_INGREDIENTS) keys.push(g.wClip, g.aClip)
  for (const k in WHOLE_PHRASE_OVERRIDES) keys.push(WHOLE_PHRASE_OVERRIDES[k])
  return keys.filter((k) => !has(k))
}
