// WbwVocab.ts — Word by Word content data (pure data, no scene access).
// Owns: every learnable word, every user phrase, every scripted server line,
//       the 7-step order script and the table numbers.
// Must NOT: touch the scene, play audio, or hold session state.
// The answer to step 2 ("Kérek … a szendvicsembe.") is built by the phrase helper: the inflected
// ingredient forms and their clips live in WbwPhraseHelperModel (PHRASE_INGREDIENTS), which the
// order controller checks against WORDS at start-up. Do not add them here as well.
// Audio keys are the exact file base names in Assets/Audio/hu/ (see WbwAudioBank.ts);
// illustration keys are file base names in Assets/Illustrations/ (see WbwIllustrations.ts).

export type WordArea = "entrance" | "sandwich" | "pastry" | "coffee"

export interface WordEntry {
  id: string            // stable id, also used in SceneObject names: Learnable_<id>
  hu: string            // Hungarian word (large on the card)
  en: string            // English translation
  exampleHu: string     // example sentence, reusing an ordering phrase pattern
  exampleEn: string
  exampleAudio: string  // clip key for the example sentence ("a+b+c" = clips played in sequence), else ""
  audio: string         // word clip key (w_*.wav)
  picture: string       // illustration key
  area: WordArea
}

export interface PhraseEntry {
  id: string            // stable id, used in SceneObject names: PhraseCard_<id>
  hu: string
  en: string
  audio: string         // p_*.wav key, or "a+b+c" clips played in sequence
  picture: string
  words: string[]       // word ids this phrase uses (their objects are highlighted while the card is offered)
}

export interface ServerLine {
  id: string
  hu: string
  en: string
  audio: string         // s_*.wav key
}

export const WORDS: WordEntry[] = [
  // Sandwich counter — ingredient row (left → right as seen from the user)
  // Back row of the well: meats, cheese and sauces · front row: vegetables (see SandwichCounter)
  {id: "sonka", hu: "sonka", en: "ham", exampleHu: "Sonkát és sajtot kérek.", exampleEn: "Ham and cheese, please.", exampleAudio: "p_sonka_sajt", audio: "w_sonka", picture: "sonka", area: "sandwich"},
  {id: "sajt", hu: "sajt", en: "cheese", exampleHu: "Sonkát és sajtot kérek.", exampleEn: "Ham and cheese, please.", exampleAudio: "p_sonka_sajt", audio: "w_sajt", picture: "sajt", area: "sandwich"},
  // id stays "csirke" (stable SceneObject name Learnable_csirke); the item is roast chicken
  {id: "csirke", hu: "sült csirke", en: "roast chicken", exampleHu: "Sült csirkét kérek.", exampleEn: "Roast chicken, please.", exampleAudio: "a_sult_csirke+c_kerek", audio: "w_sult_csirke", picture: "csirke", area: "sandwich"},
  {id: "szalami", hu: "szalámi", en: "salami", exampleHu: "Szalámit és sajtot kérek.", exampleEn: "Salami and cheese, please.", exampleAudio: "a_szalami+c_es+a_sajt+c_kerek", audio: "w_szalami", picture: "szalami", area: "sandwich"},
  {id: "husgomboc", hu: "húsgombóc", en: "meatball", exampleHu: "Húsgombócot kérek.", exampleEn: "Meatballs, please.", exampleAudio: "a_husgomboc+c_kerek", audio: "w_husgomboc", picture: "husgomboc", area: "sandwich"},
  {id: "mustar", hu: "mustár", en: "mustard", exampleHu: "Mustár nélkül, kérem.", exampleEn: "Without mustard, please.", exampleAudio: "w_mustar+c_nelkul+c_kerem", audio: "w_mustar", picture: "mustar", area: "sandwich"},
  {id: "salata", hu: "saláta", en: "lettuce", exampleHu: "Salátát kérek.", exampleEn: "Lettuce, please.", exampleAudio: "a_salata+c_kerek", audio: "w_salata", picture: "salata", area: "sandwich"},
  {id: "spenot", hu: "spenót", en: "spinach", exampleHu: "Spenót nélkül, kérem.", exampleEn: "Without spinach, please.", exampleAudio: "w_spenot+c_nelkul+c_kerem", audio: "w_spenot", picture: "spenot", area: "sandwich"},
  {id: "paradicsom", hu: "paradicsom", en: "tomato", exampleHu: "Paradicsomot kérek.", exampleEn: "Tomato, please.", exampleAudio: "a_paradicsom+c_kerek", audio: "w_paradicsom", picture: "paradicsom", area: "sandwich"},
  {id: "paprika", hu: "paprika", en: "peppers", exampleHu: "Paprikát és uborkát kérek.", exampleEn: "Peppers and cucumber, please.", exampleAudio: "a_paprika+c_es+a_uborka_friss+c_kerek", audio: "w_paprika", picture: "paprika", area: "sandwich"},
  {id: "uborka_friss", hu: "uborka", en: "cucumber", exampleHu: "Uborkát kérek.", exampleEn: "Cucumber, please.", exampleAudio: "a_uborka_friss+c_kerek", audio: "w_uborka_friss", picture: "uborka_friss", area: "sandwich"},
  {id: "olivabogyo", hu: "olívabogyó", en: "olives", exampleHu: "Kérhetek olívabogyót?", exampleEn: "Could I have some olives?", exampleAudio: "p_kerhetek_oliva", audio: "w_olivabogyo", picture: "olivabogyo", area: "sandwich"},
  {id: "uborka", hu: "savanyú uborka", en: "pickles", exampleHu: "Savanyú uborka nélkül, kérem.", exampleEn: "Without pickles, please.", exampleAudio: "p_uborka_nelkul", audio: "w_uborka", picture: "uborka", area: "sandwich"},
  {id: "hagyma", hu: "hagyma", en: "onion", exampleHu: "Hagyma nélkül, kérem.", exampleEn: "Without onion, please.", exampleAudio: "w_hagyma+c_nelkul+c_kerem", audio: "w_hagyma", picture: "hagyma", area: "sandwich"},
  {id: "majonez", hu: "majonéz", en: "mayonnaise", exampleHu: "Majonéz nélkül, kérem.", exampleEn: "Without mayonnaise, please.", exampleAudio: "w_majonez+c_nelkul+c_kerem", audio: "w_majonez", picture: "majonez", area: "sandwich"},
  // Entrance — the two-sided sign on the door: NYITVA outside, ZÁRVA inside (a real flip sign)
  {id: "nyitva", hu: "nyitva", en: "open", exampleHu: "A kávézó nyitva van.", exampleEn: "The café is open.", exampleAudio: "p_nyitva_van", audio: "w_nyitva", picture: "nyitva", area: "entrance"},
  {id: "zarva", hu: "zárva", en: "closed", exampleHu: "A kávézó zárva van.", exampleEn: "The café is closed.", exampleAudio: "p_zarva_van", audio: "w_zarva", picture: "zarva", area: "entrance"},
  // Pastry display — the glass case and the cake on top
  {id: "repatorta", hu: "répatorta", en: "carrot cake", exampleHu: "Egy szelet répatortát kérek.", exampleEn: "A slice of carrot cake, please.", exampleAudio: "p_repatorta", audio: "w_repatorta", picture: "repatorta", area: "pastry"},
  {id: "perec", hu: "perec", en: "pretzel", exampleHu: "Egy perecet kérek.", exampleEn: "A pretzel, please.", exampleAudio: "p_perec", audio: "w_perec", picture: "perec", area: "pastry"},
  {id: "kakaos_csiga", hu: "kakaós csiga", en: "cocoa roll", exampleHu: "Egy kakaós csigát kérek.", exampleEn: "A cocoa roll, please.", exampleAudio: "p_kakaos_csiga", audio: "w_kakaos_csiga", picture: "kakaos_csiga", area: "pastry"},
  {id: "pogacsa", hu: "pogácsa", en: "savoury scone", exampleHu: "Két pogácsát kérek.", exampleEn: "Two savoury scones, please.", exampleAudio: "p_pogacsa", audio: "w_pogacsa", picture: "pogacsa", area: "pastry"},
  // Pastry display
  {id: "szendvics", hu: "szendvics", en: "sandwich", exampleHu: "Egy szendvicset kérek.", exampleEn: "I'd like a sandwich, please.", exampleAudio: "p_szendvicset_kerek", audio: "w_szendvics", picture: "szendvics", area: "pastry"},
  {id: "kenyer", hu: "kenyér", en: "bread", exampleHu: "Kérhetek kenyeret?", exampleEn: "Could I have some bread?", exampleAudio: "", audio: "w_kenyer", picture: "kenyer", area: "pastry"},
  // Coffee area
  {id: "kave", hu: "kávé", en: "coffee", exampleHu: "Egy kicsi tejeskávét kérek.", exampleEn: "A small coffee with milk, please.", exampleAudio: "p_tejes_kave", audio: "w_kave", picture: "kave", area: "coffee"},
  {id: "tej", hu: "tej", en: "milk", exampleHu: "Egy kicsi tejeskávét kérek.", exampleEn: "A small coffee with milk, please.", exampleAudio: "p_tejes_kave", audio: "w_tej", picture: "tej", area: "coffee"},
  {id: "viz", hu: "víz", en: "water", exampleHu: "Kérhetek vizet?", exampleEn: "Could I have some water?", exampleAudio: "", audio: "w_viz", picture: "viz", area: "coffee"},
  {id: "kicsi", hu: "kicsi", en: "small", exampleHu: "Egy kicsi tejeskávét kérek.", exampleEn: "A small coffee with milk, please.", exampleAudio: "p_tejes_kave", audio: "w_kicsi", picture: "kicsi", area: "coffee"},
  {id: "nagy", hu: "nagy", en: "large", exampleHu: "Egy nagy tejeskávét kérek.", exampleEn: "A large coffee with milk, please.", exampleAudio: "", audio: "w_nagy", picture: "nagy", area: "coffee"},
  // Wall menu board — the drinks (pointing at a line on the board)
  {id: "tejeskave", hu: "tejeskávé", en: "latte", exampleHu: "Egy tejeskávét kérek.", exampleEn: "A latte, please.", exampleAudio: "p_tejeskave", audio: "w_tejeskave", picture: "tejeskave", area: "coffee"},
  {id: "presszo", hu: "presszó", en: "espresso", exampleHu: "Egy presszót kérek.", exampleEn: "An espresso, please.", exampleAudio: "p_presszo", audio: "w_presszo", picture: "presszo", area: "coffee"},
  {id: "forro_csoki", hu: "forró csoki", en: "hot chocolate", exampleHu: "Egy forró csokit kérek.", exampleEn: "A hot chocolate, please.", exampleAudio: "p_forro_csoki", audio: "w_forro_csoki", picture: "forro_csoki", area: "coffee"},
  // Coffee station — milks, grinder, cups
  {id: "zabtej", hu: "zabtej", en: "oat milk", exampleHu: "Zabtejjel kérem.", exampleEn: "With oat milk, please.", exampleAudio: "p_zabtej", audio: "w_zabtej", picture: "zabtej", area: "coffee"},
  {id: "mandulatej", hu: "mandulatej", en: "almond milk", exampleHu: "Mandulatejjel kérem.", exampleEn: "With almond milk, please.", exampleAudio: "p_mandulatej", audio: "w_mandulatej", picture: "mandulatej", area: "coffee"},
  {id: "kavedaralo", hu: "kávédaráló", en: "coffee grinder", exampleHu: "A kávédaráló hangos.", exampleEn: "The coffee grinder is loud.", exampleAudio: "p_kavedaralo", audio: "w_kavedaralo", picture: "kavedaralo", area: "coffee"},
  {id: "csesze", hu: "csésze", en: "cup", exampleHu: "Egy csésze kávét kérek.", exampleEn: "A cup of coffee, please.", exampleAudio: "p_csesze", audio: "w_csesze", picture: "csesze", area: "coffee"},
  {id: "asztal", hu: "asztal", en: "table", exampleHu: "Szabad ez az asztal?", exampleEn: "Is this table free?", exampleAudio: "p_szabad_asztal", audio: "w_asztal", picture: "asztal", area: "coffee"},
]

/** A word saved on an earlier outing (pre-saved, so the saved-words viewer can show categories). */
export interface EarlierWord {
  id: string
  hu: string
  en: string
  audio: string         // w_*.wav key
  icon: string          // WORD_ICONS key (Assets/Icons/)
  category: string      // "Street" | "Park"
  daysAgo: number       // when it was saved, for "Date added"
}

/** Café words saved in this session show under this category. */
export const CAFE_CATEGORY = "Café"
/** Category order in the saved-words viewer. */
export const CATEGORY_ORDER = [CAFE_CATEGORY, "Street", "Park"]

export const EARLIER_WORDS: EarlierWord[] = [
  {id: "utca", hu: "utca", en: "street", audio: "w_utca", icon: "add_road", category: "Street", daysAgo: 3},
  {id: "jarda", hu: "járda", en: "pavement", audio: "w_jarda", icon: "directions_walk", category: "Street", daysAgo: 3},
  {id: "bolt", hu: "bolt", en: "shop", audio: "w_bolt", icon: "storefront", category: "Street", daysAgo: 3},
  {id: "busz", hu: "busz", en: "bus", audio: "w_busz", icon: "directions_bus", category: "Street", daysAgo: 3},
  {id: "villamos", hu: "villamos", en: "tram", audio: "w_villamos", icon: "tram", category: "Street", daysAgo: 2},
  {id: "megallo", hu: "megálló", en: "stop", audio: "w_megallo", icon: "signpost", category: "Street", daysAgo: 2},
  {id: "lampa", hu: "lámpa", en: "traffic light", audio: "w_lampa", icon: "traffic", category: "Street", daysAgo: 2},
  {id: "auto", hu: "autó", en: "car", audio: "w_auto", icon: "directions_car", category: "Street", daysAgo: 2},
  {id: "bicikli", hu: "bicikli", en: "bicycle", audio: "w_bicikli", icon: "pedal_bike", category: "Street", daysAgo: 2},
  {id: "taxi", hu: "taxi", en: "taxi", audio: "w_taxi", icon: "local_taxi", category: "Street", daysAgo: 2},
  {id: "posta", hu: "posta", en: "post office", audio: "w_posta", icon: "local_post_office", category: "Street", daysAgo: 2},
  {id: "gyogyszertar", hu: "gyógyszertár", en: "pharmacy", audio: "w_gyogyszertar", icon: "local_pharmacy", category: "Street", daysAgo: 2},
  {id: "fa", hu: "fa", en: "tree", audio: "w_fa", icon: "park", category: "Park", daysAgo: 1},
  {id: "virag", hu: "virág", en: "flower", audio: "w_virag", icon: "local_florist", category: "Park", daysAgo: 1},
  {id: "fu", hu: "fű", en: "grass", audio: "w_fu", icon: "grass", category: "Park", daysAgo: 1},
  {id: "pad", hu: "pad", en: "bench", audio: "w_pad", icon: "event_seat", category: "Park", daysAgo: 1},
  {id: "szokokut", hu: "szökőkút", en: "fountain", audio: "w_szokokut", icon: "water_drop", category: "Park", daysAgo: 1},
  {id: "kutya", hu: "kutya", en: "dog", audio: "w_kutya", icon: "pets", category: "Park", daysAgo: 1},
  {id: "madar", hu: "madár", en: "bird", audio: "w_madar", icon: "flutter_dash", category: "Park", daysAgo: 1},
  {id: "to", hu: "tó", en: "lake", audio: "w_to", icon: "water", category: "Park", daysAgo: 1},
  {id: "jatszoter", hu: "játszótér", en: "playground", audio: "w_jatszoter", icon: "playground_2", category: "Park", daysAgo: 1},
  {id: "hinta", hu: "hinta", en: "swing", audio: "w_hinta", icon: "attractions", category: "Park", daysAgo: 1},
  {id: "labda", hu: "labda", en: "ball", audio: "w_labda", icon: "sports_soccer", category: "Park", daysAgo: 1},
  {id: "osveny", hu: "ösvény", en: "path", audio: "w_osveny", icon: "route", category: "Park", daysAgo: 1},
]

export const PHRASES: PhraseEntry[] = [
  {id: "jonapot", hu: "Jó napot!", en: "Hello!", audio: "p_jonapot", picture: "hello", words: []},
  {id: "szendvicset", hu: "Egy szendvicset kérek.", en: "I'd like a sandwich, please.", audio: "p_szendvicset_kerek", picture: "szendvics", words: ["szendvics"]},
  {id: "tejes_kave", hu: "Egy kicsi tejeskávét kérek.", en: "A small coffee with milk, please.", audio: "p_tejes_kave", picture: "coffee_milk", words: ["kicsi", "tej", "kave"]},
  {id: "itt_eszem", hu: "Itt eszem.", en: "I'll eat here.", audio: "p_itt_eszem", picture: "eat_here", words: []},
  {id: "elvitelre", hu: "Elvitelre, kérem.", en: "Takeaway, please.", audio: "p_elvitelre", picture: "takeaway", words: []},
  {id: "szabad_asztal", hu: "Szabad ez az asztal?", en: "Is this table free?", audio: "p_szabad_asztal", picture: "table_free", words: ["asztal"]},
  {id: "negyes_asztal", hu: "A négyes asztalnál ülök.", en: "I'm at table four.", audio: "p_negyes_asztal", picture: "table4", words: ["asztal"]},
  {id: "nyolcas_asztal", hu: "A nyolcas asztalnál ülök.", en: "I'm at table eight.", audio: "p_nyolcas_asztal", picture: "table8", words: ["asztal"]},
  {id: "tizenkettes_asztal", hu: "A tizenkettes asztalnál ülök.", en: "I'm at table twelve.", audio: "p_tizenkettes_asztal", picture: "table12", words: ["asztal"]},
  {id: "koszonom", hu: "Köszönöm!", en: "Thank you!", audio: "p_koszonom", picture: "thanks", words: []},
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
  choices: string[]       // PhraseEntry ids offered as phrase cards (none for the helper step 2; step 5 offers the chosen table's phrase)
  advanceOn: string[]     // phrase ids that complete the step
  multi: boolean          // unused: every step takes one answer now (always false)
  helper?: boolean        // the answer is the phrase helper, not phrase cards
}
export const ORDER_STEPS: OrderStep[] = [
  {step: 1, name: "greet", line: "mit_ker", choices: ["jonapot", "szendvicset"], advanceOn: ["szendvicset"], multi: false},
  {step: 2, name: "fillings", line: "mit_ker_bele", choices: [], advanceOn: [], multi: false, helper: true},
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
