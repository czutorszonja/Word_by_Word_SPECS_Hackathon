// WbwPhraseHelperModel.ts — state and rules for the Use it live phrase helper ("SAY IT AT THE COUNTER").
// Owns: the 15 counter ingredients' stored forms (nominative, accusative, English label, English in
//       the phrase, clip keys); the helper state (ordered slot ids + pattern "want" | "without");
//       and the checked rules from agent/phase-c/research/R3_hungarian.md:
//         want    : "Kérek <acc> a szendvicsembe."      2+: "Kérek A, B és C a szendvicsembe."
//         without : "<Nom> nélkül, kérem."              2+: "A, B és C nélkül, kérem."
//       plus the English line, the emphasis spans of every ingredient and the audio key.
// Must NOT: touch the scene, play audio, submit an answer or know about modes / the order step.
//           Building or showing a phrase never submits it (the order controller advances only on
//           speech detection or SaidItButton). No Lens API: runs under plain Node (see selfTest()).
// Ids are WordEntry.id values from Assets/Scripts/WbwVocab.ts (SceneObject Learnable_<id>).
// Strings are NFC (precomposed accents), like WbwVocab.ts. Offsets are UTF-16 code units, which are
// plain characters here (everything used is in the BMP), half-open [start, end) like String.slice.
// Clip keys are written out per item, NEVER derived from the id (traps: "csirke", "uborka").
// CANONICAL: this is the only phrase table/builder to port into Assets/. WbwPhraseBuilder.ts (R3 §11
// reference) and WbwSentenceBuilder.ts (old order-strip design) are superseded; do not port them.
// Audio wiring (owner = order controller; this module never plays anything):
//   - WbwAudioBank.ts must list all 65 phraseClipKeys(). Today 31 are missing (c_a_szendvicsembe, the 15
//     p_kerek_<id>, the 15 p_nelkul_<id>); paste agent/phase-c/drafts/WbwAudioBank.phrase-entries.txt.
//     WbwAudioController skips a missing part silently, so a gap mid-sequence would not match the text.
//   - At startup: const miss = missingClips((k) => !!AUDIO[k]); if (miss.length) print("WbwPhrase: MISSING
//     CLIPS " + miss.join(",")) — loudly, every launch.
//   - Gate PhraseHelperListenButton on canListen(model.build(), (k) => audio.has(k)), so a phrase with any
//     missing part is never played half-silent.

// ---------------------------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------------------------

export type PhrasePattern = "want" | "without"

export interface PhraseIngredient {
  id: string          // WordEntry.id (SceneObject Learnable_<id>)
  nom: string         // dictionary form: hover label, word card, the "nélkül" pattern (= WordEntry.hu)
  acc: string         // accusative: only ever inside "Kérek … a szendvicsembe."
  enLabel: string     // English on the hover label / word card (= WordEntry.en)
  enPhrase: string    // English inside the phrase line (plural where English needs it)
  wClip: string       // clip saying `nom` (multi-item "nélkül" sentences; = WordEntry.audio)
  aClip: string       // clip saying `acc` (multi-item "Kérek" sentences)
  wantClip: string    // whole recorded sentence for 1 item: "Kérek <acc> a szendvicsembe."
  withoutClip: string // whole recorded sentence for 1 item: "<Nom> nélkül, kérem."
}

/** One emphasised ingredient inside a line: text.slice(start, end) is the inflected form. */
export interface EmphasisRange { id: string; start: number; end: number }

/**
 * A line split at its slot span: frame-left / slot / frame-right. Only the LEFT frame keeps its position
 * as the slot changes, and only in "want" ("Kérek "): in "without" left is "" and the whole frame
 * (" nélkül, kérem.") sits to the right, so it moves whenever the slot text changes length. `slot` also
 * contains the joiners (", " and " és "), so styling it emphasises them too. For per-ingredient emphasis
 * use emphasisRanges with toRichText / segmentsOf; use these parts only where a moving right frame and
 * emphasised joiners are acceptable.
 */
export interface LineParts { left: string; slot: string; right: string }

export interface PhraseBuild {
  pattern: PhrasePattern
  slotIds: string[]                 // normalised: ingredients only, no duplicates, insertion order, <= max
  hu: string                        // "Kérek uborkát a szendvicsembe."
  en: string                        // "I'd like cucumber in my sandwich."
  emphasisRanges: EmphasisRange[]   // ingredient spans in `hu`, in slot order ([] when empty)
  enEmphasisRanges: EmphasisRange[] // ingredient spans in `en`, in slot order ([] when empty)
  slotSpan: {start: number; end: number}   // whole list region in `hu` (or the "…" placeholder)
  enSlotSpan: {start: number; end: number} // same in `en`
  huParts: LineParts                // `hu` split at slotSpan (slot includes joiners; see LineParts)
  enParts: LineParts                // `en` split at enSlotSpan
  audioKey: string                  // "a+b+c" = clips in sequence; "" when empty (Listen disabled)
  audioParts: string[]              // audioKey split on "+" ([] when empty)
  valid: boolean                    // at least one ingredient: Listen enabled, can be said
  empty: boolean                    // no ingredient: placeholder shown
  answerToken: string               // optional DC3 answer id, e.g. "fillings:want:szalami,paradicsom"
}

/** What the hover label should offer for a pointed object while Use it live is active. */
export interface PointerActions {
  usable: boolean    // a counter ingredient (may fill the slot at all)
  inPhrase: boolean  // already in the phrase: show "In the phrase ✓" (no phrase buttons)
  showUse: boolean   // UseThisWordButton: usable and NOT already in the phrase (so it can never collapse
                     // a combined phrase back to one word; there is no remove/undo control)
  showAdd: boolean   // AddWordButton ("+ és"): usable, phrase has >= 1 slot, id not in it, not full
  full: boolean      // phrase already holds maxSlots ingredients
  formInPhrase: string // the form that would appear in the sentence ("szalámit" / "szalámi"), "" if unusable
}

/** Readable state for LEAF, named exactly as the order controller should expose it. */
export interface PhraseTestState {
  phraseSlotIds: string[]
  phrasePattern: PhrasePattern
  phraseHu: string
  phraseEn: string
  phraseAudioKey: string
}

// ---------------------------------------------------------------------------------------------
// Data: the 15 counter ingredients (R3 §2). Only these may fill the slot.
// ---------------------------------------------------------------------------------------------

// Traps (verified against make_hu_voice.py CLIPS):
//  - id "csirke" is roast chicken: w_sult_csirke / a_sult_csirke. a_csirke / w_csirke say plain
//    "csirkét" / "csirke" and must not be used. The 1-item clips ARE named by id (p_kerek_csirke).
//  - id "uborka" is pickles: w_uborka says "savanyú uborka"; the accusative clip is
//    a_savanyu_uborka (there is NO a_uborka clip). id "uborka_friss" is fresh cucumber.
//  - id "husgomboc": label "meatball", phrase "meatballs" (the only label/phrase difference).
//    enLabel only mirrors WbwVocab WordEntry.en (checkAgainstVocab enforces it); the label UI renders
//    WordEntry.en. To make every gloss plural, change BOTH WbwVocab.ts husgomboc en and enLabel here to
//    "meatballs" in the same commit (then enLabel === enPhrase for all 15).
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

/** Upper bound for the slot list (R3 §5.3). The model can be built with a lower cap (e.g. 3). */
export const MAX_SLOTS = 4
/** Shown in place of the ingredient list while no ingredient is chosen (U+2026). */
export const SLOT_PLACEHOLDER = "…"

/** Connector clips (Assets/Audio/hu/c_*.wav). Commas have no clip: every clip has ~0.29 s padding. */
export const CLIP_KEREK = "c_kerek"
export const CLIP_ES = "c_es"
export const CLIP_A_SZENDVICSEMBE = "c_a_szendvicsembe"
export const CLIP_NELKUL = "c_nelkul"
export const CLIP_KEREM = "c_kerem"

// The fixed frame. It never changes, so the reusable part stays visually stable.
const HU_WANT_HEAD = "Kérek "
const HU_WANT_TAIL = " a szendvicsembe."
const HU_WITHOUT_TAIL = " nélkül, kérem."
const HU_AND = "és"
const EN_WANT_HEAD = "I'd like "
const EN_WANT_TAIL = " in my sandwich."
const EN_WITHOUT_HEAD = "Without "
const EN_WITHOUT_TAIL = ", please."
const EN_AND = "and"

// ---------------------------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------------------------

export function ingredientById(id: string): PhraseIngredient | null {
  for (const g of PHRASE_INGREDIENTS) if (g.id === id) return g
  return null
}

/** True only for the 15 counter ingredients ("Kérek kávét a szendvicsembe" would be nonsense). */
export function canUseInPhrase(id: string): boolean {
  return ingredientById(id) !== null
}

/** "Szalámi", never "SZalámi": only the first character is upper-cased. */
export function capFirst(s: string): string {
  return s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

function clampMax(maxSlots: number): number {
  const n = Math.floor(maxSlots)
  if (!(n >= 1)) return 1
  return n > MAX_SLOTS ? MAX_SLOTS : n
}

/** Ingredient ids only, first occurrence wins, insertion order kept, capped at maxSlots. */
export function normaliseSlots(ids: string[], maxSlots: number = MAX_SLOTS): string[] {
  const cap = clampMax(maxSlots)
  const out: string[] = []
  for (const id of ids) {
    if (out.length >= cap) break
    if (canUseInPhrase(id) && out.indexOf(id) < 0) out.push(id)
  }
  return out
}

/** The form an ingredient takes in the sentence for a pattern, lower-case ("" if not an ingredient). */
export function formInPhrase(id: string, pattern: PhrasePattern): string {
  const g = ingredientById(id)
  if (!g) return ""
  return pattern === "without" ? g.nom : g.acc
}

interface LineBuilder {
  text: string
  ranges: EmphasisRange[]
  spanStart: number
  spanEnd: number
}

function newLine(): LineBuilder {
  return {text: "", ranges: [], spanStart: 0, spanEnd: 0}
}

/** Appends "A" · "A <conj> B" · "A, B <conj> C" (no comma before the conjunction), or "…". */
function appendList(line: LineBuilder, ids: string[], forms: string[], conj: string): void {
  line.spanStart = line.text.length
  if (ids.length === 0) line.text += SLOT_PLACEHOLDER
  for (let i = 0; i < ids.length; i++) {
    if (i > 0) line.text += i === ids.length - 1 ? " " + conj + " " : ", "
    const start = line.text.length
    line.text += forms[i]
    line.ranges.push({id: ids[i], start: start, end: line.text.length})
  }
  line.spanEnd = line.text.length
}

function partsOf(line: LineBuilder): LineParts {
  return {
    left: line.text.slice(0, line.spanStart),
    slot: line.text.slice(line.spanStart, line.spanEnd),
    right: line.text.slice(line.spanEnd),
  }
}

/** Item clips with c_es before the last one only (commas have no clip). */
function listClips(clips: string[]): string[] {
  const out: string[] = []
  for (let i = 0; i < clips.length; i++) {
    if (i > 0 && i === clips.length - 1) out.push(CLIP_ES)
    out.push(clips[i])
  }
  return out
}

/**
 * Builds the helper sentence for an ordered slot list and a pattern (R3 §3–§7).
 * Unknown / non-ingredient / duplicate ids are dropped; the list is capped at maxSlots.
 */
export function buildPhrase(slotIdsIn: string[], pattern: PhrasePattern, maxSlots: number = MAX_SLOTS): PhraseBuild {
  const p: PhrasePattern = pattern === "without" ? "without" : "want"
  const slotIds = normaliseSlots(slotIdsIn, maxSlots)
  const items: PhraseIngredient[] = []
  for (const id of slotIds) items.push(ingredientById(id) as PhraseIngredient)
  const n = items.length

  const hu = newLine()
  const en = newLine()
  const enForms = items.map((g) => g.enPhrase)
  let parts: string[] = []

  if (p === "want") {
    hu.text = HU_WANT_HEAD
    appendList(hu, slotIds, items.map((g) => g.acc), HU_AND)
    hu.text += HU_WANT_TAIL
    en.text = EN_WANT_HEAD
    appendList(en, slotIds, enForms, EN_AND)
    en.text += EN_WANT_TAIL
    if (n === 1) parts = [items[0].wantClip]
    else if (n > 1) parts = [CLIP_KEREK].concat(listClips(items.map((g) => g.aClip)), [CLIP_A_SZENDVICSEMBE])
  } else {
    const noms = items.map((g) => g.nom)
    if (noms.length > 0) noms[0] = capFirst(noms[0]) // sentence capital only: "Savanyú uborka", "Szalámi"
    appendList(hu, slotIds, noms, HU_AND)
    hu.text += HU_WITHOUT_TAIL
    en.text = EN_WITHOUT_HEAD
    appendList(en, slotIds, enForms, EN_AND)
    en.text += EN_WITHOUT_TAIL
    if (n === 1) parts = [items[0].withoutClip]
    else if (n > 1) parts = listClips(items.map((g) => g.wClip)).concat([CLIP_NELKUL, CLIP_KEREM])
  }

  return {
    pattern: p,
    slotIds: slotIds,
    hu: hu.text,
    en: en.text,
    emphasisRanges: hu.ranges,
    enEmphasisRanges: en.ranges,
    slotSpan: {start: hu.spanStart, end: hu.spanEnd},
    enSlotSpan: {start: en.spanStart, end: en.spanEnd},
    huParts: partsOf(hu),
    enParts: partsOf(en),
    audioKey: parts.join("+"),
    audioParts: parts,
    valid: n > 0,
    empty: n === 0,
    answerToken: "fillings:" + p + ":" + slotIds.join(","),
  }
}

/**
 * Wraps each range in rich-text tags, e.g. toRichText(b.hu, b.emphasisRanges, "<b>", "</b>")
 * or with "<color=#xxxxxx>" / "</color>" built from WbwSharedUI's tone (never a hard-coded hex here).
 * For Text.enableRichText. The phrase strings contain no "<", so nothing needs escaping.
 */
export function toRichText(text: string, ranges: EmphasisRange[], open: string, close: string): string {
  let out = ""
  let at = 0
  for (const r of ranges) {
    if (r.start < at || r.end < r.start || r.end > text.length) continue // defensive: skip bad ranges
    out += text.slice(at, r.start) + open + text.slice(r.start, r.end) + close
    at = r.end
  }
  return out + text.slice(at)
}

/** Splits a line into runs for a multi-Text layout: [{text, id}] where id "" = frame / joiner. */
export function segmentsOf(text: string, ranges: EmphasisRange[]): {text: string; id: string}[] {
  const out: {text: string; id: string}[] = []
  let at = 0
  for (const r of ranges) {
    if (r.start < at || r.end < r.start || r.end > text.length) continue
    if (r.start > at) out.push({text: text.slice(at, r.start), id: ""})
    out.push({text: text.slice(r.start, r.end), id: r.id})
    at = r.end
  }
  if (at < text.length) out.push({text: text.slice(at), id: ""})
  return out
}

/**
 * Display-only copy of `text` with a no-break space (U+00A0) inside each two-word ingredient
 * ("sült csirkét", "savanyú uborka"), so wrapping never splits them. Same length, so every range
 * stays valid. Whether Lens Text honours U+00A0 is UNVERIFIED; tests should read `hu`, not this.
 */
export function withNoBreakItems(text: string, ranges: EmphasisRange[]): string {
  let out = text
  for (const r of ranges) {
    const inner = out.slice(r.start, r.end).split(" ").join(" ")
    out = out.slice(0, r.start) + inner + out.slice(r.end)
  }
  return out
}

/** Every clip the builder can emit, for a startup check against WbwAudioBank. */
export function phraseClipKeys(): string[] {
  const keys = [CLIP_KEREK, CLIP_ES, CLIP_A_SZENDVICSEMBE, CLIP_NELKUL, CLIP_KEREM]
  for (const g of PHRASE_INGREDIENTS) keys.push(g.wClip, g.aClip, g.wantClip, g.withoutClip)
  return keys
}

/** Clip keys missing from the audio bank, e.g. missingClips((k) => !!AUDIO[k]). [] when all present. */
export function missingClips(has: (key: string) => boolean): string[] {
  const out: string[] = []
  for (const k of phraseClipKeys()) if (!has(k)) out.push(k)
  return out
}

/**
 * PhraseHelperListenButton enabled: the phrase has an ingredient AND every clip of its sequence exists,
 * e.g. canListen(model.build(), (k) => audio.has(k)) or (k) => !!AUDIO[k]. Never play a partial sequence.
 */
export function canListen(b: PhraseBuild, has: (key: string) => boolean): boolean {
  if (!b.valid || b.audioParts.length === 0) return false
  for (const k of b.audioParts) if (!has(k)) return false
  return true
}

/**
 * Consistency check with WbwVocab.WORDS (passed in so this module stays standalone):
 * for each ingredient, WordEntry exists, hu === nom, en === enLabel and audio === wClip.
 */
export function checkAgainstVocab(words: {id: string; hu: string; en: string; audio: string}[]): string[] {
  const out: string[] = []
  for (const g of PHRASE_INGREDIENTS) {
    let w: {id: string; hu: string; en: string; audio: string} | null = null
    for (const x of words) if (x.id === g.id) w = x
    if (!w) { out.push(g.id + ": no WordEntry"); continue }
    if (w.hu !== g.nom) out.push(g.id + ": WordEntry.hu '" + w.hu + "' != nom '" + g.nom + "'")
    if (w.en !== g.enLabel) out.push(g.id + ": WordEntry.en '" + w.en + "' != enLabel '" + g.enLabel + "'")
    if (w.audio !== g.wClip) out.push(g.id + ": WordEntry.audio '" + w.audio + "' != wClip '" + g.wClip + "'")
  }
  return out
}

// ---------------------------------------------------------------------------------------------
// The model
// ---------------------------------------------------------------------------------------------

/**
 * Holds the helper's slot list and pattern. Every mutator returns true only if the state changed,
 * so the controller knows when to re-render (and, if the team decides so, replay the phrase once).
 * The same model instance is reused for the whole Use it live session: "Use this word" updates
 * the same phrase, it never creates a new card.
 */
export class PhraseHelperModel {
  readonly maxSlots: number
  private slotList: string[] = []
  private pat: PhrasePattern = "want"
  private rev: number = 0
  private cached: PhraseBuild | null = null
  private cachedRev: number = -1

  constructor(opts?: {slots?: string[]; pattern?: PhrasePattern; maxSlots?: number}) {
    this.maxSlots = clampMax(opts && opts.maxSlots !== undefined ? opts.maxSlots : MAX_SLOTS)
    if (opts && opts.slots) this.slotList = normaliseSlots(opts.slots, this.maxSlots)
    if (opts && opts.pattern === "without") this.pat = "without"
  }

  /** Copy of the ordered slot ids (LEAF: phraseSlotIds). */
  get slots(): string[] { return this.slotList.slice() }
  /** LEAF: phrasePattern. */
  get pattern(): PhrasePattern { return this.pat }
  /** Increments on every change; a view can compare it to skip redundant re-renders. */
  get revision(): number { return this.rev }
  get isEmpty(): boolean { return this.slotList.length === 0 }
  get isFull(): boolean { return this.slotList.length >= this.maxSlots }

  has(id: string): boolean { return this.slotList.indexOf(id) >= 0 }

  /**
   * UseThisWordButton is offered: an ingredient that is NOT already in the phrase. A word already in it
   * shows "In the phrase ✓" instead, so "Use this word" can never silently collapse a combined phrase
   * ([szalami, paradicsom] -> [szalami]); the agreed design has no remove/undo control.
   */
  canUse(id: string): boolean {
    return canUseInPhrase(id) && !this.has(id)
  }

  /** AddWordButton ("+ és") is offered: an ingredient, the phrase has >= 1 slot, id not in it, not full. */
  canAdd(id: string): boolean {
    return canUseInPhrase(id) && this.slotList.length >= 1 && !this.has(id) && !this.isFull
  }

  /** Everything the violet hover label needs for the pointed object. */
  pointerActions(id: string): PointerActions {
    const usable = canUseInPhrase(id)
    return {
      usable: usable,
      inPhrase: this.has(id),
      showUse: this.canUse(id),
      showAdd: this.canAdd(id),
      full: this.isFull,
      formInPhrase: formInPhrase(id, this.pat),
    }
  }

  /**
   * "Use this word": replaces the whole list with [id]. Refused (false) exactly when canUse(id) is false:
   * a non-ingredient, or a word already in the phrase. So every caller (button, label surface pinch,
   * object select, card "Use it live →") keeps a combined phrase that already holds id intact.
   */
  useWord(id: string): boolean {
    if (!this.canUse(id)) return false
    this.slotList = [id]
    return this.touch()
  }

  /**
   * "+ és": appends id at the end if it is an ingredient, not already present and the list is not full.
   * On an empty list this behaves like useWord (the UI only offers Add once a slot exists).
   */
  addWord(id: string): boolean {
    if (!canUseInPhrase(id) || this.has(id) || this.isFull) return false
    this.slotList.push(id)
    return this.touch()
  }

  /**
   * Removes id if present; the other words keep their order. Removing the last one empties the phrase.
   * No control in the agreed design calls this (a RemoveWordButton would, if the team adds one).
   */
  removeWord(id: string): boolean {
    const i = this.slotList.indexOf(id)
    if (i < 0) return false
    this.slotList.splice(i, 1)
    return this.touch()
  }

  /** PatternWantButton / PatternWithoutButton. Keeps the slots; only the frame and case change. */
  setPattern(p: PhrasePattern): boolean {
    if (p !== "want" && p !== "without") return false
    if (p === this.pat) return false
    this.pat = p
    return this.touch()
  }

  /** Empties the slot list (keeps the pattern). */
  clear(): boolean {
    if (this.slotList.length === 0) return false
    this.slotList = []
    return this.touch()
  }

  /** The current sentence; cached until the next change. Treat the result as read-only. */
  build(): PhraseBuild {
    if (this.cached === null || this.cachedRev !== this.rev) {
      this.cached = buildPhrase(this.slotList, this.pat, this.maxSlots)
      this.cachedRev = this.rev
    }
    return this.cached
  }

  /** The readable state names the order controller should mirror for LEAF. */
  testState(): PhraseTestState {
    const b = this.build()
    return {phraseSlotIds: b.slotIds.slice(), phrasePattern: b.pattern, phraseHu: b.hu, phraseEn: b.en, phraseAudioKey: b.audioKey}
  }

  private touch(): boolean {
    this.rev++
    return true
  }
}

// ---------------------------------------------------------------------------------------------
// Test data (mirrors agent/tts/make_hu_voice.py CLIPS for every clip the helper may emit)
// ---------------------------------------------------------------------------------------------

/** Spoken text of each phrase-helper clip, used by selfTest to prove audio matches the display. */
export const PHRASE_CLIP_TEXT: {[key: string]: string} = {
  "c_kerek": "kérek", "c_es": "és", "c_a_szendvicsembe": "a szendvicsembe", "c_nelkul": "nélkül", "c_kerem": "kérem",
  "w_sonka": "sonka", "w_szalami": "szalámi", "w_sult_csirke": "sült csirke", "w_sajt": "sajt",
  "w_husgomboc": "húsgombóc", "w_salata": "saláta", "w_spenot": "spenót", "w_paradicsom": "paradicsom",
  "w_paprika": "paprika", "w_uborka_friss": "uborka", "w_uborka": "savanyú uborka", "w_hagyma": "hagyma",
  "w_olivabogyo": "olívabogyó", "w_majonez": "majonéz", "w_mustar": "mustár",
  "a_sonka": "sonkát", "a_szalami": "szalámit", "a_sult_csirke": "sült csirkét", "a_sajt": "sajtot",
  "a_husgomboc": "húsgombócot", "a_salata": "salátát", "a_spenot": "spenótot", "a_paradicsom": "paradicsomot",
  "a_paprika": "paprikát", "a_uborka_friss": "uborkát", "a_savanyu_uborka": "savanyú uborkát", "a_hagyma": "hagymát",
  "a_olivabogyo": "olívabogyót", "a_majonez": "majonézt", "a_mustar": "mustárt",
  "p_kerek_sonka": "Kérek sonkát a szendvicsembe.", "p_kerek_szalami": "Kérek szalámit a szendvicsembe.",
  "p_kerek_csirke": "Kérek sült csirkét a szendvicsembe.", "p_kerek_sajt": "Kérek sajtot a szendvicsembe.",
  "p_kerek_husgomboc": "Kérek húsgombócot a szendvicsembe.", "p_kerek_salata": "Kérek salátát a szendvicsembe.",
  "p_kerek_spenot": "Kérek spenótot a szendvicsembe.", "p_kerek_paradicsom": "Kérek paradicsomot a szendvicsembe.",
  "p_kerek_paprika": "Kérek paprikát a szendvicsembe.", "p_kerek_uborka_friss": "Kérek uborkát a szendvicsembe.",
  "p_kerek_uborka": "Kérek savanyú uborkát a szendvicsembe.", "p_kerek_hagyma": "Kérek hagymát a szendvicsembe.",
  "p_kerek_olivabogyo": "Kérek olívabogyót a szendvicsembe.", "p_kerek_majonez": "Kérek majonézt a szendvicsembe.",
  "p_kerek_mustar": "Kérek mustárt a szendvicsembe.",
  "p_nelkul_sonka": "Sonka nélkül, kérem.", "p_nelkul_szalami": "Szalámi nélkül, kérem.",
  "p_nelkul_csirke": "Sült csirke nélkül, kérem.", "p_nelkul_sajt": "Sajt nélkül, kérem.",
  "p_nelkul_husgomboc": "Húsgombóc nélkül, kérem.", "p_nelkul_salata": "Saláta nélkül, kérem.",
  "p_nelkul_spenot": "Spenót nélkül, kérem.", "p_nelkul_paradicsom": "Paradicsom nélkül, kérem.",
  "p_nelkul_paprika": "Paprika nélkül, kérem.", "p_nelkul_uborka_friss": "Uborka nélkül, kérem.",
  "p_nelkul_uborka": "Savanyú uborka nélkül, kérem.", "p_nelkul_hagyma": "Hagyma nélkül, kérem.",
  "p_nelkul_olivabogyo": "Olívabogyó nélkül, kérem.", "p_nelkul_majonez": "Majonéz nélkül, kérem.",
  "p_nelkul_mustar": "Mustár nélkül, kérem.",
}

// ---------------------------------------------------------------------------------------------
// Self-test cases (same content as WbwPhraseHelperModel.cases.md)
// ---------------------------------------------------------------------------------------------

export interface BuildCase {
  n: string; slots: string[]; pattern: PhrasePattern
  hu: string; en: string; key: string
  ranges?: [string, number, number][]   // expected emphasisRanges in hu as [id, start, end]
  enRanges?: [string, number, number][] // expected enEmphasisRanges in en
}

/** B1–B27 are R3 §9 rows 1–27, verbatim. B28–B30 add other edges. */
export const BUILD_CASES: BuildCase[] = [
  {n: "B1", slots: ["uborka_friss"], pattern: "want", hu: "Kérek uborkát a szendvicsembe.", en: "I'd like cucumber in my sandwich.", key: "p_kerek_uborka_friss", ranges: [["uborka_friss", 6, 13]], enRanges: [["uborka_friss", 9, 17]]},
  {n: "B2", slots: ["szalami"], pattern: "want", hu: "Kérek szalámit a szendvicsembe.", en: "I'd like salami in my sandwich.", key: "p_kerek_szalami", ranges: [["szalami", 6, 14]]},
  {n: "B3", slots: ["csirke"], pattern: "want", hu: "Kérek sült csirkét a szendvicsembe.", en: "I'd like roast chicken in my sandwich.", key: "p_kerek_csirke", ranges: [["csirke", 6, 18]]},
  {n: "B4", slots: ["uborka"], pattern: "want", hu: "Kérek savanyú uborkát a szendvicsembe.", en: "I'd like pickles in my sandwich.", key: "p_kerek_uborka", ranges: [["uborka", 6, 21]]},
  {n: "B5", slots: ["olivabogyo"], pattern: "want", hu: "Kérek olívabogyót a szendvicsembe.", en: "I'd like olives in my sandwich.", key: "p_kerek_olivabogyo"},
  {n: "B6", slots: ["husgomboc"], pattern: "want", hu: "Kérek húsgombócot a szendvicsembe.", en: "I'd like meatballs in my sandwich.", key: "p_kerek_husgomboc"},
  {n: "B7", slots: ["sajt"], pattern: "want", hu: "Kérek sajtot a szendvicsembe.", en: "I'd like cheese in my sandwich.", key: "p_kerek_sajt"},
  {n: "B8", slots: ["szalami", "paradicsom"], pattern: "want", hu: "Kérek szalámit és paradicsomot a szendvicsembe.", en: "I'd like salami and tomato in my sandwich.", key: "c_kerek+a_szalami+c_es+a_paradicsom+c_a_szendvicsembe", ranges: [["szalami", 6, 14], ["paradicsom", 18, 30]], enRanges: [["szalami", 9, 15], ["paradicsom", 20, 26]]},
  {n: "B9", slots: ["csirke", "paprika"], pattern: "want", hu: "Kérek sült csirkét és paprikát a szendvicsembe.", en: "I'd like roast chicken and peppers in my sandwich.", key: "c_kerek+a_sult_csirke+c_es+a_paprika+c_a_szendvicsembe", ranges: [["csirke", 6, 18], ["paprika", 22, 30]]},
  {n: "B10", slots: ["uborka_friss", "uborka"], pattern: "want", hu: "Kérek uborkát és savanyú uborkát a szendvicsembe.", en: "I'd like cucumber and pickles in my sandwich.", key: "c_kerek+a_uborka_friss+c_es+a_savanyu_uborka+c_a_szendvicsembe", ranges: [["uborka_friss", 6, 13], ["uborka", 17, 32]]},
  {n: "B11", slots: ["sonka", "sajt", "paradicsom"], pattern: "want", hu: "Kérek sonkát, sajtot és paradicsomot a szendvicsembe.", en: "I'd like ham, cheese and tomato in my sandwich.", key: "c_kerek+a_sonka+a_sajt+c_es+a_paradicsom+c_a_szendvicsembe", ranges: [["sonka", 6, 12], ["sajt", 14, 20], ["paradicsom", 24, 36]]},
  {n: "B12", slots: ["spenot", "uborka", "majonez"], pattern: "want", hu: "Kérek spenótot, savanyú uborkát és majonézt a szendvicsembe.", en: "I'd like spinach, pickles and mayonnaise in my sandwich.", key: "c_kerek+a_spenot+a_savanyu_uborka+c_es+a_majonez+c_a_szendvicsembe"},
  {n: "B13", slots: ["szalami", "salata", "hagyma", "mustar"], pattern: "want", hu: "Kérek szalámit, salátát, hagymát és mustárt a szendvicsembe.", en: "I'd like salami, lettuce, onion and mustard in my sandwich.", key: "c_kerek+a_szalami+a_salata+a_hagyma+c_es+a_mustar+c_a_szendvicsembe"},
  {n: "B14", slots: ["uborka"], pattern: "without", hu: "Savanyú uborka nélkül, kérem.", en: "Without pickles, please.", key: "p_nelkul_uborka", ranges: [["uborka", 0, 14]], enRanges: [["uborka", 8, 15]]},
  {n: "B15", slots: ["hagyma"], pattern: "without", hu: "Hagyma nélkül, kérem.", en: "Without onion, please.", key: "p_nelkul_hagyma"},
  {n: "B16", slots: ["csirke"], pattern: "without", hu: "Sült csirke nélkül, kérem.", en: "Without roast chicken, please.", key: "p_nelkul_csirke", ranges: [["csirke", 0, 11]]},
  {n: "B17", slots: ["szalami"], pattern: "without", hu: "Szalámi nélkül, kérem.", en: "Without salami, please.", key: "p_nelkul_szalami"},
  {n: "B18", slots: ["olivabogyo"], pattern: "without", hu: "Olívabogyó nélkül, kérem.", en: "Without olives, please.", key: "p_nelkul_olivabogyo"},
  {n: "B19", slots: ["hagyma", "mustar"], pattern: "without", hu: "Hagyma és mustár nélkül, kérem.", en: "Without onion and mustard, please.", key: "w_hagyma+c_es+w_mustar+c_nelkul+c_kerem", ranges: [["hagyma", 0, 6], ["mustar", 10, 16]]},
  {n: "B20", slots: ["szalami", "paradicsom"], pattern: "without", hu: "Szalámi és paradicsom nélkül, kérem.", en: "Without salami and tomato, please.", key: "w_szalami+c_es+w_paradicsom+c_nelkul+c_kerem"},
  {n: "B21", slots: ["uborka", "olivabogyo"], pattern: "without", hu: "Savanyú uborka és olívabogyó nélkül, kérem.", en: "Without pickles and olives, please.", key: "w_uborka+c_es+w_olivabogyo+c_nelkul+c_kerem"},
  {n: "B22", slots: ["paradicsom", "paprika", "majonez"], pattern: "without", hu: "Paradicsom, paprika és majonéz nélkül, kérem.", en: "Without tomato, peppers and mayonnaise, please.", key: "w_paradicsom+w_paprika+c_es+w_majonez+c_nelkul+c_kerem"},
  {n: "B23", slots: ["uborka_friss", "csirke", "spenot", "sajt"], pattern: "without", hu: "Uborka, sült csirke, spenót és sajt nélkül, kérem.", en: "Without cucumber, roast chicken, spinach and cheese, please.", key: "w_uborka_friss+w_sult_csirke+w_spenot+c_es+w_sajt+c_nelkul+c_kerem", ranges: [["uborka_friss", 0, 6], ["csirke", 8, 19], ["spenot", 21, 27], ["sajt", 31, 35]]},
  {n: "B24", slots: [], pattern: "want", hu: "Kérek … a szendvicsembe.", en: "I'd like … in my sandwich.", key: "", ranges: []},
  {n: "B25", slots: [], pattern: "without", hu: "… nélkül, kérem.", en: "Without …, please.", key: "", ranges: []},
  {n: "B26", slots: ["szalami", "szalami", "kave", "paradicsom"], pattern: "want", hu: "Kérek szalámit és paradicsomot a szendvicsembe.", en: "I'd like salami and tomato in my sandwich.", key: "c_kerek+a_szalami+c_es+a_paradicsom+c_a_szendvicsembe"},
  {n: "B27", slots: ["sonka", "szalami", "csirke", "sajt", "hagyma"], pattern: "want", hu: "Kérek sonkát, szalámit, sült csirkét és sajtot a szendvicsembe.", en: "I'd like ham, salami, roast chicken and cheese in my sandwich.", key: "c_kerek+a_sonka+a_szalami+a_sult_csirke+c_es+a_sajt+c_a_szendvicsembe"},
  {n: "B28", slots: ["husgomboc", "majonez"], pattern: "without", hu: "Húsgombóc és majonéz nélkül, kérem.", en: "Without meatballs and mayonnaise, please.", key: "w_husgomboc+c_es+w_majonez+c_nelkul+c_kerem", ranges: [["husgomboc", 0, 9], ["majonez", 13, 20]]},
  {n: "B29", slots: ["kave", "kenyer", "szendvics"], pattern: "want", hu: "Kérek … a szendvicsembe.", en: "I'd like … in my sandwich.", key: "", ranges: []},
  {n: "B30", slots: ["csirke", "husgomboc", "paradicsom", "uborka"], pattern: "want", hu: "Kérek sült csirkét, húsgombócot, paradicsomot és savanyú uborkát a szendvicsembe.", en: "I'd like roast chicken, meatballs, tomato and pickles in my sandwich.", key: "c_kerek+a_sult_csirke+a_husgomboc+a_paradicsom+c_es+a_savanyu_uborka+c_a_szendvicsembe"},
]

export interface ModelStep {
  op: "use" | "add" | "remove" | "pattern" | "clear"
  arg?: string
  changed: boolean          // expected return value of the mutator
  slots?: string[]          // expected slots after the step
  pattern?: PhrasePattern   // expected pattern after the step
  hu?: string               // expected phraseHu after the step
  key?: string              // expected phraseAudioKey after the step
}

export interface ModelCase {
  n: string; name: string
  init?: {slots?: string[]; pattern?: PhrasePattern; maxSlots?: number}
  steps: ModelStep[]
}

/** M1 is the user's storyboard / R3 §10 golden path. */
export const MODEL_CASES: ModelCase[] = [
  {n: "M1", name: "golden path: uborka -> use szalami -> add paradicsom -> use pickles -> without", steps: [
    {op: "use", arg: "uborka_friss", changed: true, slots: ["uborka_friss"], pattern: "want", hu: "Kérek uborkát a szendvicsembe.", key: "p_kerek_uborka_friss"},
    {op: "use", arg: "szalami", changed: true, slots: ["szalami"], hu: "Kérek szalámit a szendvicsembe.", key: "p_kerek_szalami"},
    {op: "add", arg: "paradicsom", changed: true, slots: ["szalami", "paradicsom"], hu: "Kérek szalámit és paradicsomot a szendvicsembe.", key: "c_kerek+a_szalami+c_es+a_paradicsom+c_a_szendvicsembe"},
    {op: "use", arg: "uborka", changed: true, slots: ["uborka"], hu: "Kérek savanyú uborkát a szendvicsembe.", key: "p_kerek_uborka"},
    {op: "pattern", arg: "without", changed: true, slots: ["uborka"], pattern: "without", hu: "Savanyú uborka nélkül, kérem.", key: "p_nelkul_uborka"},
  ]},
  {n: "M2", name: "switching pattern keeps the slots (both ways)", init: {slots: ["szalami", "paradicsom"]}, steps: [
    {op: "pattern", arg: "without", changed: true, slots: ["szalami", "paradicsom"], hu: "Szalámi és paradicsom nélkül, kérem.", key: "w_szalami+c_es+w_paradicsom+c_nelkul+c_kerem"},
    {op: "pattern", arg: "without", changed: false, pattern: "without"},
    {op: "pattern", arg: "want", changed: true, slots: ["szalami", "paradicsom"], hu: "Kérek szalámit és paradicsomot a szendvicsembe.", key: "c_kerek+a_szalami+c_es+a_paradicsom+c_a_szendvicsembe"},
  ]},
  {n: "M3", name: "add builds the 3-item list with commas and 'és' before the last", init: {slots: ["sonka"]}, steps: [
    {op: "add", arg: "sajt", changed: true, hu: "Kérek sonkát és sajtot a szendvicsembe."},
    {op: "add", arg: "paradicsom", changed: true, slots: ["sonka", "sajt", "paradicsom"], hu: "Kérek sonkát, sajtot és paradicsomot a szendvicsembe.", key: "c_kerek+a_sonka+a_sajt+c_es+a_paradicsom+c_a_szendvicsembe"},
  ]},
  {n: "M4", name: "add an id already in the phrase does nothing", init: {slots: ["szalami", "paradicsom"]}, steps: [
    {op: "add", arg: "szalami", changed: false, slots: ["szalami", "paradicsom"]},
    {op: "add", arg: "paradicsom", changed: false, slots: ["szalami", "paradicsom"]},
  ]},
  {n: "M5", name: "add is refused when the phrase is full (4)", init: {slots: ["sonka", "szalami", "csirke", "sajt"]}, steps: [
    {op: "add", arg: "hagyma", changed: false, slots: ["sonka", "szalami", "csirke", "sajt"], hu: "Kérek sonkát, szalámit, sült csirkét és sajtot a szendvicsembe."},
    {op: "use", arg: "hagyma", changed: true, slots: ["hagyma"], hu: "Kérek hagymát a szendvicsembe."},
  ]},
  {n: "M6", name: "non-ingredients never fill the slot (coffee, bread, table, unknown)", init: {slots: ["uborka_friss"]}, steps: [
    {op: "use", arg: "kave", changed: false, slots: ["uborka_friss"]},
    {op: "add", arg: "kenyer", changed: false, slots: ["uborka_friss"]},
    {op: "use", arg: "asztal", changed: false, slots: ["uborka_friss"]},
    {op: "add", arg: "nonexistent", changed: false, slots: ["uborka_friss"], hu: "Kérek uborkát a szendvicsembe."},
  ]},
  {n: "M7", name: "use on a word already in the phrase is a no-op (never collapses a combined phrase); use of a new word replaces a longer list", init: {slots: ["szalami"]}, steps: [
    {op: "use", arg: "szalami", changed: false, slots: ["szalami"]},
    {op: "add", arg: "paradicsom", changed: true, slots: ["szalami", "paradicsom"]},
    {op: "use", arg: "paradicsom", changed: false, slots: ["szalami", "paradicsom"], hu: "Kérek szalámit és paradicsomot a szendvicsembe.", key: "c_kerek+a_szalami+c_es+a_paradicsom+c_a_szendvicsembe"},
    {op: "use", arg: "szalami", changed: false, slots: ["szalami", "paradicsom"]},
    {op: "use", arg: "hagyma", changed: true, slots: ["hagyma"], hu: "Kérek hagymát a szendvicsembe.", key: "p_kerek_hagyma"},
  ]},
  {n: "M8", name: "remove keeps the order of the rest; removing the last empties the phrase", init: {slots: ["sonka", "sajt", "paradicsom"]}, steps: [
    {op: "remove", arg: "sajt", changed: true, slots: ["sonka", "paradicsom"], hu: "Kérek sonkát és paradicsomot a szendvicsembe.", key: "c_kerek+a_sonka+c_es+a_paradicsom+c_a_szendvicsembe"},
    {op: "remove", arg: "sajt", changed: false, slots: ["sonka", "paradicsom"]},
    {op: "remove", arg: "sonka", changed: true, slots: ["paradicsom"], hu: "Kérek paradicsomot a szendvicsembe.", key: "p_kerek_paradicsom"},
    {op: "remove", arg: "paradicsom", changed: true, slots: [], hu: "Kérek … a szendvicsembe.", key: ""},
  ]},
  {n: "M9", name: "empty start: add acts like use; clear empties but keeps the pattern", init: {pattern: "without"}, steps: [
    {op: "add", arg: "hagyma", changed: true, slots: ["hagyma"], hu: "Hagyma nélkül, kérem.", key: "p_nelkul_hagyma"},
    {op: "add", arg: "mustar", changed: true, hu: "Hagyma és mustár nélkül, kérem.", key: "w_hagyma+c_es+w_mustar+c_nelkul+c_kerem"},
    {op: "clear", changed: true, slots: [], pattern: "without", hu: "… nélkül, kérem.", key: ""},
    {op: "clear", changed: false, slots: []},
  ]},
  {n: "M10", name: "constructor normalises: duplicates, non-ingredients and the cap", init: {slots: ["szalami", "szalami", "kave", "paradicsom", "sonka", "sajt", "hagyma"]}, steps: [
    {op: "add", arg: "mustar", changed: false, slots: ["szalami", "paradicsom", "sonka", "sajt"], hu: "Kérek szalámit, paradicsomot, sonkát és sajtot a szendvicsembe."},
  ]},
  {n: "M11", name: "maxSlots 3 (tight panel): the 4th add is refused", init: {slots: ["sonka", "sajt"], maxSlots: 3}, steps: [
    {op: "add", arg: "paradicsom", changed: true, slots: ["sonka", "sajt", "paradicsom"]},
    {op: "add", arg: "hagyma", changed: false, slots: ["sonka", "sajt", "paradicsom"]},
  ]},
  {n: "M12", name: "two-word items keep their case and capital through every operation", steps: [
    {op: "use", arg: "csirke", changed: true, hu: "Kérek sült csirkét a szendvicsembe.", key: "p_kerek_csirke"},
    {op: "add", arg: "uborka", changed: true, hu: "Kérek sült csirkét és savanyú uborkát a szendvicsembe.", key: "c_kerek+a_sult_csirke+c_es+a_savanyu_uborka+c_a_szendvicsembe"},
    {op: "pattern", arg: "without", changed: true, hu: "Sült csirke és savanyú uborka nélkül, kérem.", key: "w_sult_csirke+c_es+w_uborka+c_nelkul+c_kerem"},
    {op: "remove", arg: "csirke", changed: true, hu: "Savanyú uborka nélkül, kérem.", key: "p_nelkul_uborka"},
  ]},
]

export interface PointerCase {
  n: string; slots: string[]; pattern?: PhrasePattern; maxSlots?: number; id: string
  expect: PointerActions
}

export const POINTER_CASES: PointerCase[] = [
  {n: "P1", slots: [], id: "szalami", expect: {usable: true, inPhrase: false, showUse: true, showAdd: false, full: false, formInPhrase: "szalámit"}},
  {n: "P2", slots: ["uborka_friss"], id: "szalami", expect: {usable: true, inPhrase: false, showUse: true, showAdd: true, full: false, formInPhrase: "szalámit"}},
  {n: "P3", slots: ["szalami"], id: "szalami", expect: {usable: true, inPhrase: true, showUse: false, showAdd: false, full: false, formInPhrase: "szalámit"}},
  {n: "P4", slots: ["szalami", "paradicsom"], id: "szalami", expect: {usable: true, inPhrase: true, showUse: false, showAdd: false, full: false, formInPhrase: "szalámit"}},
  {n: "P5", slots: ["sonka", "szalami", "csirke", "sajt"], id: "hagyma", expect: {usable: true, inPhrase: false, showUse: true, showAdd: false, full: true, formInPhrase: "hagymát"}},
  {n: "P6", slots: ["szalami"], id: "kave", expect: {usable: false, inPhrase: false, showUse: false, showAdd: false, full: false, formInPhrase: ""}},
  {n: "P7", slots: ["hagyma"], pattern: "without", id: "uborka", expect: {usable: true, inPhrase: false, showUse: true, showAdd: true, full: false, formInPhrase: "savanyú uborka"}},
  {n: "P8", slots: ["sonka", "sajt", "paradicsom"], maxSlots: 3, id: "hagyma", expect: {usable: true, inPhrase: false, showUse: true, showAdd: false, full: true, formInPhrase: "hagymát"}},
  {n: "P9", slots: ["sonka", "szalami", "csirke", "sajt"], id: "csirke", expect: {usable: true, inPhrase: true, showUse: false, showAdd: false, full: true, formInPhrase: "sült csirkét"}},
]

// ---------------------------------------------------------------------------------------------
// selfTest
// ---------------------------------------------------------------------------------------------

function sameList(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

function show(v: unknown): string { return JSON.stringify(v) }

/** Lower-case, no "." / ",", single spaces: compares a sentence with the words its clips speak. */
function spoken(s: string): string {
  return s.toLowerCase().split(".").join("").split(",").join("").split(/\s+/).join(" ").trim()
}

/** The fixed frame around the slot, written out here independently of the builder's constants. */
function expectedFrame(pattern: PhrasePattern, lang: "hu" | "en"): {left: string; right: string; conj: string} {
  if (lang === "hu") return pattern === "want" ? {left: "Kérek ", right: " a szendvicsembe.", conj: " és "} : {left: "", right: " nélkül, kérem.", conj: " és "}
  return pattern === "want" ? {left: "I'd like ", right: " in my sandwich.", conj: " and "} : {left: "Without ", right: ", please.", conj: " and "}
}

/**
 * One line (hu or en) of a build: the parts carry exactly the frame literals, parts.slot is the text at
 * the span, the span runs from the first to the last ingredient (or covers "…" when empty), there is one
 * range per slot in slot order, each range slices to that item's form, and the joiners between ranges are
 * ", " with the conjunction before the last. Returns early (no crash) when the shape is broken.
 */
function checkLine(b: PhraseBuild, lang: "hu" | "en", tag: string, out: string[]): void {
  const hu = lang === "hu"
  const text = hu ? b.hu : b.en
  const parts = hu ? b.huParts : b.enParts
  const span = hu ? b.slotSpan : b.enSlotSpan
  const ranges = hu ? b.emphasisRanges : b.enEmphasisRanges
  const f = expectedFrame(b.pattern, lang)
  const t = tag + " " + lang
  if (!(span.start >= 0 && span.start <= span.end && span.end <= text.length)) { out.push(t + ": span out of bounds " + show(span)); return }
  if (parts.left !== f.left || parts.right !== f.right) out.push(t + ": parts frame " + show(parts))
  if (parts.slot !== text.slice(span.start, span.end)) out.push(t + ": parts.slot " + show(parts.slot) + " != text at span " + show(text.slice(span.start, span.end)))
  if (parts.left + parts.slot + parts.right !== text) out.push(t + ": parts do not join to the line")
  if (ranges.length !== b.slotIds.length) { out.push(t + ": range count " + ranges.length + " != slot count " + b.slotIds.length); return }
  if (ranges.length === 0) {
    if (parts.slot !== SLOT_PLACEHOLDER) out.push(t + ": empty slot is " + show(parts.slot))
    return
  }
  if (span.start !== ranges[0].start || span.end !== ranges[ranges.length - 1].end) out.push(t + ": span " + show(span) + " does not run from the first to the last ingredient")
  for (let i = 0; i < ranges.length; i++) {
    const r = ranges[i]
    const g = ingredientById(r.id)
    if (!g || r.id !== b.slotIds[i]) { out.push(t + ": range " + i + " id " + r.id + " != slot " + b.slotIds[i]); return }
    if (!(r.start >= 0 && r.start < r.end && r.end <= text.length)) { out.push(t + ": bad range " + show(r)); return }
    if (i > 0) {
      const gap = text.slice(ranges[i - 1].end, r.start)
      const joiner = i === ranges.length - 1 ? f.conj : ", "
      if (gap !== joiner) { out.push(t + ": joiner before " + r.id + " is " + show(gap) + ", expected " + show(joiner)); return }
    }
    let form = g.enPhrase
    if (hu) {
      form = b.pattern === "want" ? g.acc : g.nom
      if (b.pattern === "without" && i === 0) form = capFirst(form)
    }
    if (text.slice(r.start, r.end) !== form) out.push(t + " range " + r.id + " = " + show(text.slice(r.start, r.end)) + ", expected " + show(form))
  }
}

/** Structural checks that must hold for ANY build: case, frame, joining, spans, parts, audio = display. */
function checkInvariants(b: PhraseBuild, tag: string, out: string[]): void {
  const want = b.pattern === "want"
  if (want ? !(b.hu.indexOf("Kérek ") === 0 && b.hu.slice(-17) === " a szendvicsembe.") : b.hu.slice(-15) !== " nélkül, kérem.") {
    out.push(tag + ": frame broken: " + show(b.hu))
  }
  if (b.hu.indexOf("  ") >= 0 || b.hu.indexOf(", és") >= 0 || b.en.indexOf(", and") >= 0) out.push(tag + ": spacing / comma before és|and: " + show(b.hu) + " " + show(b.en))
  checkLine(b, "hu", tag, out)
  checkLine(b, "en", tag, out)
  if (b.empty !== (b.slotIds.length === 0) || b.valid === b.empty) out.push(tag + ": valid/empty flags " + b.valid + "/" + b.empty)
  if (b.audioKey !== b.audioParts.join("+")) out.push(tag + ": audioKey " + show(b.audioKey) + " != audioParts joined")
  if (b.empty) {
    if (b.audioKey !== "" || b.audioParts.length !== 0) out.push(tag + ": empty state has audio")
    return
  }
  // Audio must say exactly what is displayed.
  const texts: string[] = []
  for (const k of b.audioParts) {
    const t = PHRASE_CLIP_TEXT[k]
    if (t === undefined) { out.push(tag + ": unknown clip " + k); return }
    texts.push(t)
  }
  if (b.audioParts.length === 1) {
    if (texts[0] !== b.hu) out.push(tag + ": whole clip text " + show(texts[0]) + " != hu " + show(b.hu))
  } else if (spoken(texts.join(" ")) !== spoken(b.hu)) {
    out.push(tag + ": clips say " + show(texts.join(" ")) + " but hu is " + show(b.hu))
  }
  // 1 item: one whole clip. n >= 2: n item clips + c_es + 2 frame clips (c_kerek…c_a_szendvicsembe / c_nelkul+c_kerem).
  if (b.audioParts.length !== (b.slotIds.length === 1 ? 1 : b.slotIds.length + 3)) out.push(tag + ": unexpected audio part count " + b.audioParts.length)
}

function checkRanges(actual: EmphasisRange[], expected: [string, number, number][], tag: string, out: string[]): void {
  const a = actual.map((r) => [r.id, r.start, r.end])
  if (show(a) !== show(expected)) out.push(tag + ": got " + show(a) + ", expected " + show(expected))
}

/**
 * Runs every case and invariant; returns a list of mismatches ([] = all good).
 * At most `limit` entries are returned (plus one "(+N more)" line), so a broken table cannot flood a log.
 */
export function selfTest(limit: number = 100): string[] {
  const out: string[] = []

  // 1. Data sanity.
  if (PHRASE_INGREDIENTS.length !== 15) out.push("data: expected 15 ingredients, got " + PHRASE_INGREDIENTS.length)
  const seen: string[] = []
  for (const g of PHRASE_INGREDIENTS) {
    if (seen.indexOf(g.id) >= 0) out.push("data: duplicate id " + g.id)
    seen.push(g.id)
    if (g.acc.lastIndexOf("t") !== g.acc.length - 1) out.push("data: accusative of " + g.id + " does not end in -t")
    if (g.wantClip !== "p_kerek_" + g.id || g.withoutClip !== "p_nelkul_" + g.id) out.push("data: 1-item clip names for " + g.id)
  }
  for (const k of phraseClipKeys()) if (PHRASE_CLIP_TEXT[k] === undefined) out.push("data: no clip text for " + k)
  if (ingredientById("csirke")!.aClip !== "a_sult_csirke" || ingredientById("uborka")!.aClip !== "a_savanyu_uborka") out.push("data: clip trap regression")

  // 2. Build cases (R3 §9 + extras).
  for (const c of BUILD_CASES) {
    const b = buildPhrase(c.slots, c.pattern)
    if (b.hu !== c.hu) out.push(c.n + " hu: got " + show(b.hu) + ", expected " + show(c.hu))
    if (b.en !== c.en) out.push(c.n + " en: got " + show(b.en) + ", expected " + show(c.en))
    if (b.audioKey !== c.key) out.push(c.n + " key: got " + show(b.audioKey) + ", expected " + show(c.key))
    if (b.valid !== (c.key !== "")) out.push(c.n + " valid: got " + b.valid)
    if (c.ranges) checkRanges(b.emphasisRanges, c.ranges, c.n + " ranges", out)
    if (c.enRanges) checkRanges(b.enEmphasisRanges, c.enRanges, c.n + " enRanges", out)
    checkInvariants(b, c.n, out)
  }

  // 3. Model sequences.
  for (const c of MODEL_CASES) {
    const m = new PhraseHelperModel(c.init)
    for (let i = 0; i < c.steps.length; i++) {
      const s = c.steps[i]
      const tag = c.n + " step " + (i + 1) + " (" + s.op + (s.arg ? " " + s.arg : "") + ")"
      const revBefore = m.revision
      let changed = false
      if (s.op === "use") changed = m.useWord(s.arg as string)
      else if (s.op === "add") changed = m.addWord(s.arg as string)
      else if (s.op === "remove") changed = m.removeWord(s.arg as string)
      else if (s.op === "pattern") changed = m.setPattern(s.arg as PhrasePattern)
      else if (s.op === "clear") changed = m.clear()
      if (changed !== s.changed) out.push(tag + ": returned " + changed + ", expected " + s.changed)
      if ((m.revision !== revBefore) !== changed) out.push(tag + ": revision did not follow the change flag")
      const st = m.testState()
      if (s.slots && !sameList(st.phraseSlotIds, s.slots)) out.push(tag + ": slots " + show(st.phraseSlotIds) + ", expected " + show(s.slots))
      if (s.pattern && st.phrasePattern !== s.pattern) out.push(tag + ": pattern " + st.phrasePattern + ", expected " + s.pattern)
      if (s.hu !== undefined && st.phraseHu !== s.hu) out.push(tag + ": hu " + show(st.phraseHu) + ", expected " + show(s.hu))
      if (s.key !== undefined && st.phraseAudioKey !== s.key) out.push(tag + ": key " + show(st.phraseAudioKey) + ", expected " + show(s.key))
      checkInvariants(m.build(), tag, out)
    }
  }

  // 4. Pointer actions.
  for (const c of POINTER_CASES) {
    const m = new PhraseHelperModel({slots: c.slots, pattern: c.pattern, maxSlots: c.maxSlots})
    const a = m.pointerActions(c.id)
    if (show(a) !== show(c.expect)) out.push(c.n + " pointerActions(" + c.id + "): got " + show(a) + ", expected " + show(c.expect))
  }

  // 5. Exhaustive invariants: every single, ordered pair and ordered triple, both patterns;
  //    plus 30 four-item lists per pattern (rotations of the table, forwards and backwards).
  const ids = PHRASE_INGREDIENTS.map((g) => g.id)
  const pats: PhrasePattern[] = ["want", "without"]
  for (const p of pats) {
    for (let i = 0; i < ids.length; i++) {
      checkInvariants(buildPhrase([ids[i]], p), "single " + p + " " + ids[i], out)
      for (let j = 0; j < ids.length; j++) {
        if (j === i) continue
        checkInvariants(buildPhrase([ids[i], ids[j]], p), "pair " + p + " " + ids[i] + "," + ids[j], out)
        for (let k = 0; k < ids.length; k++) {
          if (k === i || k === j) continue
          checkInvariants(buildPhrase([ids[i], ids[j], ids[k]], p), "triple " + p + " " + ids[i] + "," + ids[j] + "," + ids[k], out)
        }
      }
      const fwd = [ids[i], ids[(i + 1) % 15], ids[(i + 2) % 15], ids[(i + 3) % 15]]
      checkInvariants(buildPhrase(fwd, p), "quad " + p + " " + fwd.join(","), out)
      const back = fwd.slice().reverse()
      checkInvariants(buildPhrase(back, p), "quad " + p + " " + back.join(","), out)
    }
  }

  // 6. Helpers.
  const b8 = buildPhrase(["szalami", "paradicsom"], "want")
  const rich = toRichText(b8.hu, b8.emphasisRanges, "<b>", "</b>")
  if (rich !== "Kérek <b>szalámit</b> és <b>paradicsomot</b> a szendvicsembe.") out.push("toRichText: " + show(rich))
  const segs = segmentsOf(b8.hu, b8.emphasisRanges)
  if (show(segs) !== show([{text: "Kérek ", id: ""}, {text: "szalámit", id: "szalami"}, {text: " és ", id: ""}, {text: "paradicsomot", id: "paradicsom"}, {text: " a szendvicsembe.", id: ""}])) out.push("segmentsOf: " + show(segs))
  if (show(b8.huParts) !== show({left: "Kérek ", slot: "szalámit és paradicsomot", right: " a szendvicsembe."})) out.push("huParts: " + show(b8.huParts))
  const b14 = buildPhrase(["uborka"], "without")
  if (show(b14.huParts) !== show({left: "", slot: "Savanyú uborka", right: " nélkül, kérem."})) out.push("huParts B14: " + show(b14.huParts))
  const nb = withNoBreakItems(b14.hu, b14.emphasisRanges)
  if (nb !== "Savanyú uborka nélkül, kérem." || nb.length !== b14.hu.length) out.push("withNoBreakItems: " + show(nb))
  if (b8.answerToken !== "fillings:want:szalami,paradicsom") out.push("answerToken: " + b8.answerToken)
  if (capFirst("szalámi") !== "Szalámi" || capFirst("") !== "") out.push("capFirst")
  if (missingClips((k) => k !== "c_a_szendvicsembe").join(",") !== "c_a_szendvicsembe") out.push("missingClips")
  // canListen: today's bank (no c_a_szendvicsembe / p_kerek_* / p_nelkul_*) must disable Listen for B8 and
  // B14 instead of playing them half-silent; a complete bank enables them; an empty phrase never plays.
  const todayBank = (k: string) => k !== "c_a_szendvicsembe" && k.indexOf("p_kerek_") !== 0 && k.indexOf("p_nelkul_") !== 0
  const allBank = (k: string) => PHRASE_CLIP_TEXT[k] !== undefined
  if (canListen(b8, todayBank) || canListen(b14, todayBank)) out.push("canListen: partial / missing sequence enabled")
  if (!canListen(b8, allBank) || !canListen(b14, allBank)) out.push("canListen: complete bank disabled")
  if (canListen(buildPhrase(["hagyma", "mustar"], "without"), todayBank) !== true) out.push("canListen: 2-item without uses only existing clips")
  if (canListen(buildPhrase([], "want"), allBank)) out.push("canListen: empty phrase enabled")
  if (normaliseSlots(["sonka", "sonka", "tej"], 0).join(",") !== "sonka") out.push("normaliseSlots clamp to >= 1")

  if (out.length > limit) {
    const more = out.length - limit
    out.length = limit
    out.push("(+" + more + " more)")
  }
  return out
}
