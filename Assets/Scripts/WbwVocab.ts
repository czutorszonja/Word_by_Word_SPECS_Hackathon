// WbwVocab.ts — Word by Word content data (pure data, no scene access).
// Owns: every learnable word, every user phrase, every scripted server line,
//       the 7-step order script and the table numbers.
// Must NOT: touch the scene, play audio, or hold session state.
// Audio keys are the exact file base names in Assets/Audio/hu/ (see WbwAudioBank.ts);
// illustration keys are file base names in Assets/Illustrations/ (see WbwIllustrations.ts).

export type WordArea = "sandwich" | "pastry" | "coffee"

export interface WordEntry {
  id: string            // stable id, also used in SceneObject names: Learnable_<id>
  hu: string            // Hungarian word (large on the card)
  en: string            // English translation
  exampleHu: string     // example sentence, reusing an ordering phrase pattern
  exampleEn: string
  exampleAudio: string  // phrase clip key if the example IS a recorded phrase, else ""
  audio: string         // word clip key (w_*.wav)
  picture: string       // illustration key
  area: WordArea
}

export interface PhraseEntry {
  id: string            // stable id, used in SceneObject names: PhraseCard_<id>
  hu: string
  en: string
  audio: string         // p_*.wav key ("" for UI-only cards like Done)
  picture: string
  words: string[]       // word ids this phrase uses (for "favour saved words")
}

export interface ServerLine {
  id: string
  hu: string
  en: string
  audio: string         // s_*.wav key
}

export const WORDS: WordEntry[] = [
  // Sandwich counter — ingredient row (left → right as seen from the user)
  {id: "sonka", hu: "sonka", en: "ham", exampleHu: "Sonkát és sajtot kérek.", exampleEn: "Ham and cheese, please.", exampleAudio: "p_sonka_sajt", audio: "w_sonka", picture: "sonka", area: "sandwich"},
  {id: "sajt", hu: "sajt", en: "cheese", exampleHu: "Sonkát és sajtot kérek.", exampleEn: "Ham and cheese, please.", exampleAudio: "p_sonka_sajt", audio: "w_sajt", picture: "sajt", area: "sandwich"},
  {id: "csirke", hu: "csirke", en: "chicken", exampleHu: "Kérhetek csirkét?", exampleEn: "Could I have some chicken?", exampleAudio: "", audio: "w_csirke", picture: "csirke", area: "sandwich"},
  {id: "husgomboc", hu: "húsgombóc", en: "meatball", exampleHu: "Kérhetek húsgombócot?", exampleEn: "Could I have meatballs?", exampleAudio: "", audio: "w_husgomboc", picture: "husgomboc", area: "sandwich"},
  {id: "salata", hu: "saláta", en: "lettuce", exampleHu: "Kérhetek salátát?", exampleEn: "Could I have some lettuce?", exampleAudio: "", audio: "w_salata", picture: "salata", area: "sandwich"},
  {id: "spenot", hu: "spenót", en: "spinach", exampleHu: "Spenót nélkül, kérem.", exampleEn: "Without spinach, please.", exampleAudio: "", audio: "w_spenot", picture: "spenot", area: "sandwich"},
  {id: "paradicsom", hu: "paradicsom", en: "tomato", exampleHu: "Kérhetek paradicsomot?", exampleEn: "Could I have some tomato?", exampleAudio: "", audio: "w_paradicsom", picture: "paradicsom", area: "sandwich"},
  {id: "olivabogyo", hu: "olívabogyó", en: "olives", exampleHu: "Kérhetek olívabogyót?", exampleEn: "Could I have some olives?", exampleAudio: "p_kerhetek_oliva", audio: "w_olivabogyo", picture: "olivabogyo", area: "sandwich"},
  {id: "uborka", hu: "savanyú uborka", en: "pickles", exampleHu: "Savanyú uborka nélkül, kérem.", exampleEn: "Without pickles, please.", exampleAudio: "p_uborka_nelkul", audio: "w_uborka", picture: "uborka", area: "sandwich"},
  {id: "hagyma", hu: "hagyma", en: "onion", exampleHu: "Hagyma nélkül, kérem.", exampleEn: "Without onion, please.", exampleAudio: "", audio: "w_hagyma", picture: "hagyma", area: "sandwich"},
  {id: "majonez", hu: "majonéz", en: "mayonnaise", exampleHu: "Majonéz nélkül, kérem.", exampleEn: "Without mayonnaise, please.", exampleAudio: "", audio: "w_majonez", picture: "majonez", area: "sandwich"},
  // Pastry display
  {id: "szendvics", hu: "szendvics", en: "sandwich", exampleHu: "Egy szendvicset kérek.", exampleEn: "I'd like a sandwich, please.", exampleAudio: "p_szendvicset_kerek", audio: "w_szendvics", picture: "szendvics", area: "pastry"},
  {id: "kenyer", hu: "kenyér", en: "bread", exampleHu: "Kérhetek kenyeret?", exampleEn: "Could I have some bread?", exampleAudio: "", audio: "w_kenyer", picture: "kenyer", area: "pastry"},
  // Coffee area
  {id: "kave", hu: "kávé", en: "coffee", exampleHu: "Egy kicsi tejes kávét kérek.", exampleEn: "A small coffee with milk, please.", exampleAudio: "p_tejes_kave", audio: "w_kave", picture: "kave", area: "coffee"},
  {id: "tej", hu: "tej", en: "milk", exampleHu: "Egy kicsi tejes kávét kérek.", exampleEn: "A small coffee with milk, please.", exampleAudio: "p_tejes_kave", audio: "w_tej", picture: "tej", area: "coffee"},
  {id: "viz", hu: "víz", en: "water", exampleHu: "Kérhetek vizet?", exampleEn: "Could I have some water?", exampleAudio: "", audio: "w_viz", picture: "viz", area: "coffee"},
  {id: "kicsi", hu: "kicsi", en: "small", exampleHu: "Egy kicsi tejes kávét kérek.", exampleEn: "A small coffee with milk, please.", exampleAudio: "p_tejes_kave", audio: "w_kicsi", picture: "kicsi", area: "coffee"},
  {id: "nagy", hu: "nagy", en: "large", exampleHu: "Egy nagy tejes kávét kérek.", exampleEn: "A large coffee with milk, please.", exampleAudio: "", audio: "w_nagy", picture: "nagy", area: "coffee"},
  {id: "asztal", hu: "asztal", en: "table", exampleHu: "Szabad ez az asztal?", exampleEn: "Is this table free?", exampleAudio: "p_szabad_asztal", audio: "w_asztal", picture: "asztal", area: "coffee"},
]

export const PHRASES: PhraseEntry[] = [
  {id: "jonapot", hu: "Jó napot!", en: "Hello!", audio: "p_jonapot", picture: "hello", words: []},
  {id: "szendvicset", hu: "Egy szendvicset kérek.", en: "I'd like a sandwich, please.", audio: "p_szendvicset_kerek", picture: "szendvics", words: ["szendvics"]},
  {id: "sonka_sajt", hu: "Sonkát és sajtot kérek.", en: "Ham and cheese, please.", audio: "p_sonka_sajt", picture: "ham_cheese", words: ["sonka", "sajt"]},
  {id: "kerhetek_oliva", hu: "Kérhetek olívabogyót?", en: "Could I have some olives?", audio: "p_kerhetek_oliva", picture: "olivabogyo", words: ["olivabogyo"]},
  {id: "uborka_nelkul", hu: "Savanyú uborka nélkül, kérem.", en: "Without pickles, please.", audio: "p_uborka_nelkul", picture: "no_pickles", words: ["uborka"]},
  {id: "tejes_kave", hu: "Egy kicsi tejes kávét kérek.", en: "A small coffee with milk, please.", audio: "p_tejes_kave", picture: "coffee_milk", words: ["kicsi", "tej", "kave"]},
  {id: "itt_eszem", hu: "Itt eszem.", en: "I'll eat here.", audio: "p_itt_eszem", picture: "eat_here", words: []},
  {id: "elvitelre", hu: "Elvitelre, kérem.", en: "Takeaway, please.", audio: "p_elvitelre", picture: "takeaway", words: []},
  {id: "szabad_asztal", hu: "Szabad ez az asztal?", en: "Is this table free?", audio: "p_szabad_asztal", picture: "table_free", words: ["asztal"]},
  {id: "negyes_asztal", hu: "A négyes asztalnál ülök.", en: "I'm at table four.", audio: "p_negyes_asztal", picture: "table4", words: ["asztal"]},
  {id: "nyolcas_asztal", hu: "A nyolcas asztalnál ülök.", en: "I'm at table eight.", audio: "p_nyolcas_asztal", picture: "table8", words: ["asztal"]},
  {id: "tizenkettes_asztal", hu: "A tizenkettes asztalnál ülök.", en: "I'm at table twelve.", audio: "p_tizenkettes_asztal", picture: "table12", words: ["asztal"]},
  {id: "koszonom", hu: "Köszönöm!", en: "Thank you!", audio: "p_koszonom", picture: "thanks", words: []},
  {id: "done", hu: "Kész", en: "Done", audio: "", picture: "done", words: []},
]

export const SERVER_LINES: ServerLine[] = [
  {id: "mit_ker", hu: "Jó napot! Mit kér?", en: "Hello, what would you like?", audio: "s_mit_ker"},
  {id: "mit_ker_bele", hu: "Mit kér bele?", en: "What would you like in it?", audio: "s_mit_ker_bele"},
  {id: "inni", hu: "Inni valamit?", en: "Anything to drink?", audio: "s_inni"},
  {id: "itt_vagy_elvitel", hu: "Itt fogyasztja vagy elvitelre?", en: "For here or to take away?", audio: "s_itt_vagy_elvitel"},
  {id: "hanyas_asztal", hu: "Hányas asztalnál ül?", en: "What's your table number?", audio: "s_hanyas_asztal"},
  {id: "jo_etvagyat", hu: "Jó étvágyat!", en: "Enjoy your meal!", audio: "s_jo_etvagyat"},
]

/** Tables in the seating area. Empty tables (4, 8, 12) are selectable. No table 13. */
export interface TableInfo { num: number; empty: boolean; hu: string; audio: string; phraseId: string }
export const TABLES: TableInfo[] = [
  {num: 2, empty: false, hu: "kettő", audio: "", phraseId: ""},
  {num: 4, empty: true, hu: "négy", audio: "n_4", phraseId: "negyes_asztal"},
  {num: 5, empty: false, hu: "öt", audio: "", phraseId: ""},
  {num: 7, empty: false, hu: "hét", audio: "", phraseId: ""},
  {num: 8, empty: true, hu: "nyolc", audio: "n_8", phraseId: "nyolcas_asztal"},
  {num: 10, empty: false, hu: "tíz", audio: "", phraseId: ""},
  {num: 12, empty: true, hu: "tizenkettő", audio: "n_12", phraseId: "tizenkettes_asztal"},
]

/** The scripted order (Use it live). Step numbers are 1-based and exposed for tests. */
export interface OrderStep {
  step: number
  name: string
  line: string            // ServerLine id
  choices: string[]       // PhraseEntry ids offered (dynamic for step 2 / 5)
  advanceOn: string[]     // phrase ids that complete the step
  multi: boolean          // multi-pick with a Done card
}
export const ORDER_STEPS: OrderStep[] = [
  {step: 1, name: "greet", line: "mit_ker", choices: ["jonapot", "szendvicset"], advanceOn: ["szendvicset"], multi: false},
  {step: 2, name: "fillings", line: "mit_ker_bele", choices: ["sonka_sajt", "kerhetek_oliva", "uborka_nelkul"], advanceOn: ["done"], multi: true},
  {step: 3, name: "drink", line: "inni", choices: ["tejes_kave"], advanceOn: ["tejes_kave"], multi: false},
  {step: 4, name: "here_or_takeaway", line: "itt_vagy_elvitel", choices: ["itt_eszem", "elvitelre"], advanceOn: ["itt_eszem"], multi: false},
  {step: 5, name: "table", line: "hanyas_asztal", choices: [], advanceOn: ["negyes_asztal", "nyolcas_asztal", "tizenkettes_asztal"], multi: false},
  {step: 6, name: "enjoy", line: "jo_etvagyat", choices: ["koszonom"], advanceOn: ["koszonom"], multi: false},
]

export function wordById(id: string): WordEntry | null {
  for (const w of WORDS) if (w.id === id) return w
  return null
}
export function phraseById(id: string): PhraseEntry | null {
  for (const p of PHRASES) if (p.id === id) return p
  return null
}
export function lineById(id: string): ServerLine | null {
  for (const l of SERVER_LINES) if (l.id === id) return l
  return null
}
export function tableByNum(n: number): TableInfo | null {
  for (const t of TABLES) if (t.num === n) return t
  return null
}
