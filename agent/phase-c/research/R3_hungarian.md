# R3: Hungarian phrase patterns for the phrase helper (Phase C, agreed design)

This note specifies the two checked patterns that the **Use it live** phrase helper ("SAY IT AT THE COUNTER") shows. For each case it gives the Hungarian, the English line under it, and an audio key that uses only clips that already exist.

> **This replaces the earlier R3.** The earlier version described the old order-strip design: `<W> kérek, <X> nélkül.`, items sorted in sandwich order, and the "nélkül"-only phrase not submittable. A copy is kept at `R3_hungarian.v1-superseded.md`.
> `agent/phase-c/drafts/WbwSentenceBuilder.ts` and `.cases.md` still implement that **old** design; don't reuse them.
> **Canonical implementation: `agent/phase-c/drafts/WbwPhraseHelperModel.ts`** (+ `.cases.md`). Port only that file into `Assets/`, so there is a single ingredient table. §11 below and its copy `drafts/WbwPhraseBuilder.ts` are an earlier reference with a different contract (`huSegments`, no `maxSlots`, any non-`"want"` pattern treated as `"without"`); they are superseded too.

Sources checked (all read-only):
- `devpost/design-brief.md` (phrase helper, step 2, Done criterion 3)
- the AGREED PHASE C DESIGN items 5–7
- `agent/tts/make_hu_voice.py` `CLIPS` (the exact text of every clip)
- the files in `Assets/Audio/hu/` (durations and padding were measured)
- `Assets/Scripts/WbwVocab.ts`, `WbwAudioBank.ts` and `WbwAudioController.ts`

The rules in §11 were run under Node 24 and also in an independent Python port. Both produce every row of §9 exactly. Every single-clip sentence matches the text in `CLIPS` character for character.

---

## 1. Decisions at a glance

| Question | Decision |
|---|---|
| Pattern A ("want") | **`Kérek <acc list> a szendvicsembe.`** This is correct Hungarian, so it stays as the user chose it. Alternatives are in §3.3. |
| Pattern B ("without") | **`<Nom list> nélkül, kérem.`** |
| Case | A: **accusative** on **every** item (`szalámit és paradicsomot`). B: **nominative** (dictionary form) on every item (`szalámi és paradicsom nélkül`). |
| List joining (A and B) | 1: `X` · 2: `X és Y` · 3+: `X, Y és Z`. Commas between items, **és** before the last item, **no comma before és**. |
| "nélkül" with several items | **Said once**, after the whole list (`hagyma és mustár nélkül`). Not repeated per item. Reasons in §4.2. |
| Capitalisation | A always starts with `Kérek`, so ingredients stay lower-case. In B, **only the first letter of the sentence** is capitalised (`Savanyú uborka nélkül, kérem.`, `Szalámi …`, never `SZalámi`). No other capitals. |
| Final punctuation | Full stop. In B, a comma before `kérem`. Nothing else. |
| Order of slots | **Insertion order** (the order the learner chose). Grammar doesn't depend on order. The phrase stays visually stable because a new word goes at the end of the list. |
| Duplicates / limit | One entry per id. **At most 4** ingredients (`MAX_SLOTS = 4`; 3 if the panel is tight). |
| What may fill the slot | **Only the 15 counter ingredients.** Coffee, pastry and bread words never go into `Kérek … a szendvicsembe` (*Kérek kávét a szendvicsembe* is nonsense). |
| Switching pattern | Keeps the same slots. Only the frame and the case change. |
| Empty slot | `Kérek … a szendvicsembe.` / `… nélkül, kérem.`, with Listen disabled and audio key `""`. |
| English | A: `I'd like <list> in my sandwich.` · B: `Without <list>, please.` Uses "and" before the last item, no Oxford comma, and plurals where English needs them (olives, peppers, pickles, meatballs). |
| Audio, 1 item | Whole recorded sentence: `p_kerek_<id>` / `p_nelkul_<id>` (all 30 exist). |
| Audio, 2+ items | A: `c_kerek + a_… (+ c_es before the last) + c_a_szendvicsembe`. B: `w_… (+ c_es before the last) + c_nelkul + c_kerem`. Uses the **per-item clip names in §2**, not `a_<id>` / `w_<id>`. |
| **Blocker** | `WbwAudioBank.ts` has **none** of the 31 new clips (`p_kerek_*`, `p_nelkul_*`, `c_a_szendvicsembe`). The files and their `.meta` exist, but until the bank lists them, `playVoice` prints "no clip named …" and stays silent. See §7.4. |

---

## 2. The 15 ingredients: stored forms and clips

Store **all** of these per vocabulary item. Never derive a clip name from the id: two ids are traps, marked ⚠.

| id | Nominative (label, card, "nélkül") | Accusative (in "Kérek …") | English label | English in phrase | `wClip` (nom.) | `aClip` (acc.) | 1-item A | 1-item B |
|---|---|---|---|---|---|---|---|---|
| `sonka` | sonka | sonkát | ham | ham | `w_sonka` | `a_sonka` | `p_kerek_sonka` | `p_nelkul_sonka` |
| `szalami` | szalámi | szalámit | salami | salami | `w_szalami` | `a_szalami` | `p_kerek_szalami` | `p_nelkul_szalami` |
| `csirke` ⚠ | sült csirke | sült csirkét | roast chicken | roast chicken | **`w_sult_csirke`** | **`a_sult_csirke`** | `p_kerek_csirke` | `p_nelkul_csirke` |
| `sajt` | sajt | sajtot | cheese | cheese | `w_sajt` | `a_sajt` | `p_kerek_sajt` | `p_nelkul_sajt` |
| `husgomboc` | húsgombóc | húsgombócot | meatball | **meatballs** | `w_husgomboc` | `a_husgomboc` | `p_kerek_husgomboc` | `p_nelkul_husgomboc` |
| `salata` | saláta | salátát | lettuce | lettuce | `w_salata` | `a_salata` | `p_kerek_salata` | `p_nelkul_salata` |
| `spenot` | spenót | spenótot | spinach | spinach | `w_spenot` | `a_spenot` | `p_kerek_spenot` | `p_nelkul_spenot` |
| `paradicsom` | paradicsom | paradicsomot | tomato | tomato | `w_paradicsom` | `a_paradicsom` | `p_kerek_paradicsom` | `p_nelkul_paradicsom` |
| `paprika` | paprika | paprikát | peppers | peppers | `w_paprika` | `a_paprika` | `p_kerek_paprika` | `p_nelkul_paprika` |
| `uborka_friss` | uborka | uborkát | cucumber | cucumber | `w_uborka_friss` | `a_uborka_friss` | `p_kerek_uborka_friss` | `p_nelkul_uborka_friss` |
| `uborka` ⚠ (pickles) | savanyú uborka | savanyú uborkát | pickles | pickles | **`w_uborka`** (says "savanyú uborka") | **`a_savanyu_uborka`** | `p_kerek_uborka` | `p_nelkul_uborka` |
| `hagyma` | hagyma | hagymát | onion | onion | `w_hagyma` | `a_hagyma` | `p_kerek_hagyma` | `p_nelkul_hagyma` |
| `olivabogyo` | olívabogyó | olívabogyót | olives | olives | `w_olivabogyo` | `a_olivabogyo` | `p_kerek_olivabogyo` | `p_nelkul_olivabogyo` |
| `majonez` | majonéz | majonézt | mayonnaise | mayonnaise | `w_majonez` | `a_majonez` | `p_kerek_majonez` | `p_nelkul_majonez` |
| `mustar` | mustár | mustárt | mustard | mustard | `w_mustar` | `a_mustar` | `p_kerek_mustar` | `p_nelkul_mustar` |

Traps, all verified against `CLIPS`:
- **`csirke`**: `a_csirke` says *csirkét* and `w_csirke` says *csirke*, without *sült*. If you used them, the audio would not match the displayed *sült csirkét* / *sült csirke*. Use `a_sult_csirke` / `w_sult_csirke`. The 1-item clips are named by id (`p_kerek_csirke`, `p_nelkul_csirke`) and do say *sült csirke(t)*.
- **`uborka` (pickles)**: **there is no `a_uborka` clip.** The naive key `a_<id>` would be silently skipped (the controller prints "no clip named 'a_uborka'" and moves on). Use `a_savanyu_uborka`. `w_uborka` correctly says *savanyú uborka*.
- **English label vs phrase**: the label keeps `WbwVocab.en` ("meatball"), but the phrase uses "meatballs". This is the only item where the two differ. It is kept as a singular dictionary gloss because the label renders `WbwVocab.en` (under `Assets/`). To make every gloss plural, change `WbwVocab.ts` husgomboc `en` **and** the model's `enLabel` to "meatballs" in the same commit (`checkAgainstVocab` flags a mismatch otherwise).

Accusatives checked one by one:
- *sajt → sajtot*, *spenót → spenótot*, *húsgombóc → húsgombócot* and *paradicsom → paradicsomot* take the linking vowel **-o-**.
- *majonéz → majonézt* and *mustár → mustárt* take a bare **-t**. *majonézet* and *mustárot* would be wrong.
- Stems ending in *-a* or *-e* lengthen the vowel: *sonkát, salátát, paprikát, uborkát, hagymát, csirkét*.
- *-i* and *-ó* stems just add *-t*: *szalámit, olívabogyót*.
- In the two-word items **only the noun changes**: *sült csirkét*, *savanyú uborkát*.

**Singular in Hungarian is correct and natural** for fillings that English puts in the plural (*olívabogyót, húsgombócot, paprikát, paradicsomot*). Hungarian uses the singular for generic or mass reference. Don't "fix" this to *olívabogyókat*: that sounds like specific, counted olives.

---

## 3. Pattern A: `Kérek <accusative> a szendvicsembe.`

### 3.1 Template
```
1 item : Kérek X a szendvicsembe.
2 items: Kérek X és Y a szendvicsembe.
3 items: Kérek X, Y és Z a szendvicsembe.
4 items: Kérek W, X, Y és Z a szendvicsembe.
```
X, Y and Z are the **accusative** forms (column 3 of §2). The frame (`Kérek ` … ` a szendvicsembe.`) never changes. Only the slot changes.

### 3.2 Grammar check
- **Conjugation**: *kérek* is the indefinite form, which is correct because the objects are bare nouns with no article. *Kérem* (definite) would be wrong here.
- **Case on every item**: the accusative *-t* has to appear on each item in the list: *szalámit és paradicsomot*. Marking only the last one (*szalámi és paradicsomot*) is ungrammatical.
- **-be, not -ben**: *szendvics + -em* (my) + *-be* (into). This is the illative case: you ask for something to be **put into** your sandwich. ✓
  - *a szendvicsemben* (inessive, "inside my sandwich", a static location) would be wrong with *kérek*.
- **Vowel harmony**: *szendvics* has front vowels, so it takes *-em* and *-be*. ✓
- **Article**: a noun with a possessive suffix normally takes the definite article, so *a szendvicsembe* (not *az*, because *sz* is a consonant). ✓ The article doesn't affect *kérek*: *a szendvicsembe* is an adverbial, not the object.
- **No comma** before *a szendvicsembe* (it's an ordinary adverbial). ✓

### 3.3 Is `Kérek uborkát a szendvicsembe.` natural? (vs `Uborkát kérek a szendvicsembe.`)
**Yes. It's correct and natural, so keep it.** Details:
- **`Kérek X …` (verb first)** is a neutral, self-contained request, like English "I'll have / I'd like X". In shops and cafés *kérek* is used almost like a formula (*Kérek két kiflit. Kérek még kenyeret.*), and the verb-first order works with bare nouns too. As a reusable frame for a learner it's ideal:
  - it mirrors English "I'd like …"
  - the slot sits in the middle
  - the fixed parts stay put on screen
  - with 3–4 items the verb comes **first**, not last after a long list. This fixes a weakness of the old `<list> kérek` design.
- **`Uborkát kérek (a szendvicsembe).` (object first)** puts the ingredient in focus. It's the most "textbook" direct answer to *Mit kér bele?* ("What would you like in it?"), because the answer to a wh-question goes right before the verb. It's equally correct, but the start of the sentence would change with every ingredient, so the frame wouldn't stay stable. **Don't switch to it.**
- **Slight redundancy**: right after *Mit kér bele?*, saying *a szendvicsembe* again is a little over-explicit. The question already established "into it". A native speaker in the middle of the exchange would most likely say one of the forms in the table below. Spelling it out is still polite, unambiguous and fine. The sentence also works on its own at any sandwich bar, which is the point of a reusable phrase.

Alternatives, for reference only (do not implement; none have clips):

| Hungarian | Nuance |
|---|---|
| *Kérek bele uborkát.* / *Uborkát kérek bele.* | Most natural reply to *Mit kér bele?* (*bele* = "into it"). |
| *Uborkával kérem.* | "With cucumber, please" (instrumental *-val/-vel*). Very common for sandwiches, but it's a different case system. |
| *Kérnék uborkát a szendvicsembe.* | Conditional, a touch more polite. |
| *Kérhetek uborkát a szendvicsembe?* | "Could I have …?" (the style of the old `p_kerhetek_oliva`). |

### 3.4 Never produce

| Wrong | Why | Right |
|---|---|---|
| *Kérek uborka a szendvicsembe.* | bare dictionary form | *Kérek uborkát a szendvicsembe.* |
| *Kérek szalámi és paradicsomot …* | *-t* only on the last item | *Kérek szalámit és paradicsomot …* |
| *Kérek szalámit, és paradicsomot …* | comma before *és* | *Kérek szalámit és paradicsomot …* |
| *Kérek sonkát, sajtot, és paradicsomot …* | Oxford-style comma | *Kérek sonkát, sajtot és paradicsomot …* |
| *Kérek sajtet / majonézet / mustárot / spenótt …* | wrong accusative | *sajtot / majonézt / mustárt / spenótot* |
| *… a szendvicsemben.* | static location (-ben) | *… a szendvicsembe.* |
| *Kérem uborkát …* | definite verb form with an indefinite object | *Kérek uborkát …* |
| *Kérek savanyú uborkát* with audio `a_uborka` | clip doesn't exist | `a_savanyu_uborka` |
| *Kérek sült csirkét* with audio `a_csirke` | audio says *csirkét* | `a_sult_csirke` |

---

## 4. Pattern B: `<Nominative> nélkül, kérem.`

### 4.1 Template
```
1 item : X nélkül, kérem.
2 items: X és Y nélkül, kérem.
3 items: X, Y és Z nélkül, kérem.
4 items: W, X, Y és Z nélkül, kérem.
```
Here X, Y and Z are the **nominative** (dictionary) forms, and the **first letter of the whole sentence** is capitalised.

- *nélkül* ("without") is a **postposition**. The noun before it stays in the plain nominative: *hagyma nélkül*, *sült csirke nélkül*, *savanyú uborka nélkül*.
- The most typical learner mistake is putting the accusative before *nélkül* (*hagymát nélkül*). Storing `nom` separately prevents it.

### 4.2 One *nélkül* after the list, not one per item. Decision: once.
- `Szalámi és paradicsom nélkül, kérem.` ✓ (chosen)
- `Szalámi nélkül és paradicsom nélkül, kérem.` (not chosen)

Why the single *nélkül*:
1. **Grammar.** A Hungarian postposition takes the whole coordinated noun phrase: `[szalámi és paradicsom] nélkül`. This is the standard written form, and in speech it's the default.
   - Contrast with pattern A: a **case ending** has to be repeated on each item (*szalámit és paradicsomot*), but a **postposition** comes once after the whole group. That's a clean, teachable difference between the two patterns.
2. **Naturalness.** Repeating it (*… nélkül és … nélkül*) is grammatical but sounds emphatic or pedantic, like two separate conditions. With 3–4 items it becomes clumsy (*hagyma nélkül, mustár nélkül és majonéz nélkül*).
3. **No ambiguity.**
   - Every item is nominative, so all of them belong to *nélkül*.
   - Hungarian *és* under "without" means "neither of them". *Hagyma és mustár nélkül* = no onion and no mustard.
   - *vagy* ("or") would be wrong here.
4. **Audio.** One `c_nelkul` gives the shortest sequence and the same shape as the recorded 1-item clips.

### 4.3 Capitalisation
- Only the first character of the sentence: `capFirst(nom[0])`, so *Savanyú uborka nélkül, kérem.*, *Sült csirke nélkül, kérem.*
  - *savanyú* and *sült* are ordinary adjectives that happen to come first.
  - The second word (*uborka*, *csirke*) stays lower-case.
- **Digraphs**: capitalise only the first letter: *Szalámi*, never *SZalámi*. JS `charAt(0).toUpperCase()` does this correctly.
- Later items stay lower-case: *Szalámi és paradicsom nélkül, kérem.*
- None of the 15 items starts with an accented letter (s, sz, h, o, m, p, u), so there are no `Á`/`Ó` edge cases. If one is ever added, `toUpperCase()` handles accented letters.
- On screen, the emphasised slot text in B therefore shows the capital (*Savanyú uborka*).

### 4.4 The comma before *kérem*
- `…, kérem.` uses *kérem* as the polite "please" tag, set off by a comma like other politeness formulas. This matches the recorded `p_nelkul_*` texts and the design.
- Without the comma, `Savanyú uborka nélkül kérem.` means "I'd like it (the sandwich) without pickles" (*kérem* = definite form, the implied object is the sandwich). That's also correct, but **keep the comma**: it matches the clips and the design.
- Use *kérem*, not *kérek*, in B. There's no indefinite object, so *Savanyú uborka nélkül, kérek.* would be wrong.

### 4.5 Pragmatics (for the hint text, not the grammar)
- On its own, `X nélkül, kérem.` is a perfectly natural thing to say at a sandwich counter. As the *only* answer to *Mit kér bele?* it's slightly partial: it says what to leave out, not what to put in. It works best **after** a pattern A sentence.
  - The demo server moves on after any speech, so nothing breaks.
  - Optional helper hint: "Say what you'd like (Kérek …) — and what to leave out (… nélkül)."
- Natural alternatives, for reference only (no clips): *Hagymát nem kérek bele.* ("I don't want onion in it") · *Se hagyma, se mustár ne legyen benne.* · *Hagyma nélkül kérem.* As a request to the server: *Hagymát ne tegyen bele, legyen szíves.*
  - Never *Hagymát **ne** kérek bele*: *ne* is the imperative/subjunctive negator and cannot negate the indicative *kérek* in a statement; the indicative takes *nem*.

### 4.6 Never produce

| Wrong | Why | Right |
|---|---|---|
| *Uborkát nélkül, kérem.* | accusative before a postposition | *Uborka nélkül, kérem.* |
| *Savanyú uborkát és hagymát nélkül …* | same | *Savanyú uborka és hagyma nélkül …* |
| *savanyú uborka nélkül, kérem.* | missing sentence capital | *Savanyú uborka nélkül, kérem.* |
| *Savanyú Uborka nélkül …* / *SZalámi nélkül …* | over-capitalised | *Savanyú uborka …* / *Szalámi …* |
| *Hagyma, és mustár nélkül, kérem.* | comma before *és* | *Hagyma és mustár nélkül, kérem.* |
| *Hagyma vagy mustár nélkül, kérem.* | *vagy* reads as "one or the other" | *Hagyma és mustár nélkül, kérem.* |
| *Hagyma nélkül, kérek.* | wrong verb form for the tag | *Hagyma nélkül, kérem.* |
| *Sült csirke nélkül* with audio `w_csirke` | audio says just *csirke* | `w_sult_csirke` |

---

## 5. Rules shared by both patterns

1. **Joining**: `joinList(items, "és")`:
   - 1 item: `X`
   - 2 items: `X és Y`
   - 3+ items: `X, Y és Z`

   That's comma + space between items and plain space + *és* + space before the last. **No comma before *és*.** This is the Hungarian spelling rule for coordinated sentence parts (AkH. 12, comma rules for coordinated sentence parts / *mellérendelt mondatrészek*: no comma before *és, s, meg, vagy* when they join parts of the same sentence).
2. **Slot order** = insertion order. Recommended UI semantics:
   - "Use this word" **replaces** the whole list with `[id]`. This covers the design's example *uborka → szalámi*. It is offered (and accepted by the model) only for a word **not** already in the phrase; a word already in it shows "In the phrase ✓", so a combined phrase can never be silently collapsed to one word (there is no remove/undo control).
   - "+ és" (`AddWordButton`) **appends** `id` at the end.

   The existing words never move, which keeps the phrase visually stable. Tests can assert exact strings for a given click sequence.
3. **Normalisation**: drop unknown ids, keep only the first occurrence of each id, and cap at `MAX_SLOTS = 4`.
   - Disable `AddWordButton` when the list is full.
   - If the pointed ingredient is already in the phrase, show it as "In the phrase ✓".
   - The longest possible strings are 81 characters (A, 4 items: *Kérek sült csirkét, húsgombócot, paradicsomot és savanyú uborkát a szendvicsembe.*) and 68 characters (B, 4 items). With 3 items the longest A is 68 characters. If the compact panel only fits about 2 lines, use `MAX_SLOTS = 3`.
4. **Only ingredients**: `canUseInPhrase(id)` is true only for the 15 ids in §2.
   - "Use it live →" from a card for a non-ingredient (*kávé, tej, kenyér, szendvics, kicsi, nagy, asztal, víz*) opens Use it live **without** filling the slot. Don't show "Use this word" on those objects.
   - *Kérek kenyeret a szendvicsembe* / *kávét a szendvicsembe* would be nonsense.
5. **Switching pattern** (`PatternWantButton` / `PatternWithoutButton`) keeps `phraseSlotIds` and re-renders in the other case, e.g. `[uborka]`: *Kérek savanyú uborkát a szendvicsembe.* ↔ *Savanyú uborka nélkül, kérem.*
   - Seeing the same word in both patterns is a good learning moment.
   - Excluding something you just asked for is still grammatical. The learner chooses what to say.
6. **Empty state**: `Kérek … a szendvicsembe.` / `I'd like … in my sandwich.` and `… nélkül, kérem.` / `Without …, please.`
   - The placeholder is U+2026 "…" with a space on each side, standing in for a word.
   - `audioKey = ""`, and `PhraseHelperListenButton` is disabled.
7. **Unicode**: every string is NFC (precomposed á é í ó ö ő ú ü ű), the same as `WbwVocab.ts`. Compare test strings in NFC.

---

## 6. The English line

**Templates**
- A: `I'd like <list> in my sandwich.` (*Kérek uborkát a szendvicsembe.* → *I'd like cucumber in my sandwich.*, the user's own example)
- B: `Without <list>, please.` (*Savanyú uborka nélkül, kérem.* → *Without pickles, please.*)
- The list uses `X`, `X and Y`, `X, Y and Z`, with **no Oxford comma**. This mirrors the Hungarian and matches the existing "Ham and cheese, please." The first letter is always a capital ("I'd", "Without").

Item word choices (the "English in phrase" column of §2):

| Hungarian | English | Why |
|---|---|---|
| uborka | **cucumber** | Mass noun as a filling ("cucumber in my sandwich"). |
| savanyú uborka | **pickles** | Plural, as used on US and international menus. British English would say *gherkins*. Keep *pickles*, matching the label. |
| olívabogyó | **olives** | Countable, so plural. Hungarian singular is correct (see §2). |
| húsgombóc | **meatballs** | Plural in the phrase. The label keeps "meatball". |
| paprika | **peppers** | English *paprika* is the spice, and singular *pepper* reads as black pepper. |
| paradicsom | **tomato** | A singular mass filling ("with tomato") is idiomatic in both UK and US English. *tomatoes* is also fine. |
| hagyma | **onion** | Singular mass ("with onion"). US English often says *onions*. Either is fine; keep the label word. |
| sült csirke | **roast chicken** | |
| sonka / szalámi / sajt / saláta / spenót / majonéz / mustár | ham / salami / cheese / lettuce / spinach / mayonnaise / mustard | Mass nouns, no article. |

Notes:
- **"in" vs "on" my sandwich**: American English often says *on* (especially for sauces: "mayo on my sandwich"), and British English says *in*. Keep **in** everywhere: it mirrors *-be* ("into") and the server's *Mit kér bele?* → "What would you like in it?"
- **"Without onion and mustard"** vs **"Without onion or mustard"**: "or" is the slightly more idiomatic English in negative contexts ("no milk or sugar"). However, the gloss sits right under *és*, and glossing *és* as "or" would mislead a beginner. **Keep "and"**, which is fully acceptable ordering English. Treat "or" as a free alternative if the team prefers.
- No "some" ("I'd like some cucumber …"). Leaving it out is natural and keeps the gloss short.

---

## 7. Audio keys (existing clips only)

### 7.1 Rules
```
pattern A, 1 item : wantClip                       e.g. p_kerek_uborka_friss
pattern A, n ≥ 2  : c_kerek + aClip₁ (+ aClip₂ …) + c_es + aClipₙ + c_a_szendvicsembe
pattern B, 1 item : withoutClip                    e.g. p_nelkul_uborka
pattern B, n ≥ 2  : wClip₁ (+ wClip₂ …) + c_es + wClipₙ + c_nelkul + c_kerem
empty             : ""  (Listen disabled)
```
- Parts are joined with `+`, which `WbwAudioController.playVoice` plays in sequence.
- `c_es` appears only once, before the last item. Commas have **no clip**: each clip already carries about 0.29 s of silence at both ends, so every join already has a gap of about 0.58 s.
- `aClip` / `wClip` / `wantClip` / `withoutClip` come from the §2 table, never from a string template.

### 7.2 Clip texts verified
All texts come from `make_hu_voice.py`. Each built single-item sentence equals its clip text exactly; this was checked by script for all 30.
- `c_kerek` = "kérek"
- `c_es` = "és"
- `c_a_szendvicsembe` = "a szendvicsembe"
- `c_nelkul` = "nélkül"
- `c_kerem` = "kérem"
- every `a_*` and `w_*` in §2 says that row's accusative / nominative

Two legacy clips should not be used by the helper:
- `p_uborka_nelkul` has the **same text** as `p_nelkul_uborka`. Use `p_nelkul_uborka` so the naming is consistent; the old clip can stay for anything else that uses it.
- `p_sonka_sajt` is *Sonkát és sajtot kérek.*, a different word order. It is **not** an override for pattern A any more.

### 7.3 Durations (measured; voice: hu-HU-TamasNeural, rate −8 %)
- 1-item A clips: 2.2–2.8 s. 1-item B clips: 2.0–2.6 s.
- Built 2-item sentences: about 5.1–6.4 s. 3 items: about 6.5–7.5 s. 4 items: up to 9.4 s (A) / 8.7 s (B).

The longer built sequences have two causes:
- the 0.58 s silence at every join (6–8 joins)
- every part was spoken on its own, with full stress and a falling, sentence-final tone

The result is understandable but clearly stitched together. The 1-item whole clips sound natural.

Optional improvements, for whoever owns audio. None are needed for the demo, and none change the keys:
1. Trim the start and end padding of the **`a_*` and `c_*`** clips in place to about 0.06 s, keeping the same file names (they're only ever used inside sequences).
   - Don't trim the `w_*` clips in place: they also play alone on word cards. That means multi-item B keeps its gaps unless option 2 is used.
2. Have the controller skip the lead silence of each sequence part. `AudioComponent.position` is writable in `StudioLib.d.ts`; whether it works in `LowLatency` mode is unverified.
3. *(Not existing; future only.)* Record whole clips for the two combined sentences the demo script uses, e.g. *Kérek szalámit és paradicsomot a szendvicsembe.* That needs new names and new bank entries, so it is outside the "existing clips only" rule.

Not recommended: building multi-item B as `w_X + c_es + p_nelkul_Y`. It's shorter, but the whole clip starts with sentence-initial stress on Y, and it breaks the agreed key format.

### 7.4 Blocker: register the new clips in `WbwAudioBank.ts`
The files exist in `Assets/Audio/hu/`, and all 31 have `.wav.meta`. But `AUDIO` in `WbwAudioBank.ts` has **no entry** for:
- `c_a_szendvicsembe`
- the 15 `p_kerek_*`: sonka, szalami, csirke, sajt, husgomboc, salata, spenot, paradicsom, paprika, uborka_friss, uborka, hagyma, olivabogyo, majonez, mustar
- the 15 `p_nelkul_*`, with the same ids

Without these entries, `has()` returns false and `playVoice` prints "no clip named …", so every 1-item phrase and every multi-item A phrase is silent.
- Add 31 lines in the existing style: `"p_kerek_sonka": requireAsset("../Audio/hu/p_kerek_sonka.wav") as AudioTrackAsset,` and so on. The exact 31 lines, with where each group goes in the sorted table, are in `agent/phase-c/drafts/WbwAudioBank.phrase-entries.txt`.
- WbwAudioController skips a missing part and plays on, so with only `c_a_szendvicsembe` missing a 2+ item A phrase would be heard without its ending. In the order controller: at startup print `missingClips((k) => !!AUDIO[k])` loudly when it isn't empty, and enable `PhraseHelperListenButton` only when `canListen(model.build(), (k) => audio.has(k))` (both in `WbwPhraseHelperModel.ts`).

---

## 8. Display and UI wording

- **Emphasis**: render the model's `emphasisRanges` (via `toRichText` or `segmentsOf` in `WbwPhraseHelperModel.ts`). Each range is one ingredient word, shown bold or in the mode tint. Emphasise the **whole** inflected form, including both words of the two-word items (*sült csirkét*, *savanyú uborkát*, *Savanyú uborka*).
  - Don't emphasise *és*, the commas or the frame. (The model's `huParts.slot` includes the joiners, so don't style that part for emphasis.)
  - The frame text `Kérek ` / ` a szendvicsembe.` / ` nélkül, kérem.` never changes, which satisfies "the reusable part stays visually stable". Its *position* only stays put for the left frame of A (`Kérek `); in B the whole frame follows the slot, so it shifts when the slot text changes length.
  - The English line can lightly emphasise its slot the same way (`enSegments`).
- **Line breaks** in the compact panel:
  - Never break inside *sült csirkét / savanyú uborkát / savanyú uborka / sült csirke*.
  - Pattern A: if two lines are needed, break **before** ` a szendvicsembe.`, or after a list comma.
  - Pattern B: break after a list comma, and keep `<last item> nélkül, kérem.` together.
  - If the Lens Text component honours U+00A0, put a no-break space inside the two-word items **in the display string only**. That hasn't been checked; the `hu` used in tests keeps normal spaces.
- **Optional teaching touch**: on the violet hover label in Use it live, show the form that will go into the sentence: *szalámi* (large) / *salami*, plus a tiny "→ szalámit".
- **Labels** (English UI, Hungarian kept where it teaches):
  - `PatternWantButton`: "Kérek …" / "I'd like"
  - `PatternWithoutButton`: "… nélkül" / "Without"
  - `AddWordButton`: "+ és" / "add another"
  - `UseThisWordButton`: "Use this word"
  - `PhraseHelperListenButton`: "Listen"

  *és* = "and", *nélkül* = "without", *Kérek* = "I'd like": all correct.
- **Word card example (optional consistency fix)**: if a sandwich word card still shows an example sentence, use the pattern A 1-item sentence and clip (`wantClip`) instead of the older `"<acc> kérek."` / `p_sonka_sajt` examples in `WbwVocab.ts`. The old ones are correct Hungarian, just a different pattern.
- Other step phrases, spot-checked and all correct: *Jó napot! · Egy szendvicset kérek. · Egy kicsi tejes kávét kérek. · Itt eszem. · Elvitelre, kérem. · A négyes / nyolcas / tizenkettes asztalnál ülök. · Köszönöm!* Server lines: *Mit kér bele? · Inni valamit? · Itt fogyasztja vagy elvitelre? · Hányas asztalnál ül? · Jó étvágyat!*

---

## 9. Worked examples (exact strings; usable as LEAF expectations)

These are output from §11, with Python as a cross-check. The slots are listed in the order the learner chose them.

| # | Slots (`phraseSlotIds`) | Pattern | Hungarian (`phraseHu`) | English (`phraseEn`) | Audio key (`phraseAudioKey`) | Length |
|---|---|---|---|---|---|---|
| 1 | uborka_friss | want | Kérek uborkát a szendvicsembe. | I'd like cucumber in my sandwich. | `p_kerek_uborka_friss` | 2.3 s |
| 2 | szalami | want | Kérek szalámit a szendvicsembe. | I'd like salami in my sandwich. | `p_kerek_szalami` | 2.2 s |
| 3 | csirke | want | Kérek sült csirkét a szendvicsembe. | I'd like roast chicken in my sandwich. | `p_kerek_csirke` | 2.5 s |
| 4 | uborka | want | Kérek savanyú uborkát a szendvicsembe. | I'd like pickles in my sandwich. | `p_kerek_uborka` | 2.8 s |
| 5 | olivabogyo | want | Kérek olívabogyót a szendvicsembe. | I'd like olives in my sandwich. | `p_kerek_olivabogyo` | 2.5 s |
| 6 | husgomboc | want | Kérek húsgombócot a szendvicsembe. | I'd like meatballs in my sandwich. | `p_kerek_husgomboc` | 2.6 s |
| 7 | sajt | want | Kérek sajtot a szendvicsembe. | I'd like cheese in my sandwich. | `p_kerek_sajt` | 2.2 s |
| 8 | szalami, paradicsom | want | Kérek szalámit és paradicsomot a szendvicsembe. | I'd like salami and tomato in my sandwich. | `c_kerek+a_szalami+c_es+a_paradicsom+c_a_szendvicsembe` | 5.9 s |
| 9 | csirke, paprika | want | Kérek sült csirkét és paprikát a szendvicsembe. | I'd like roast chicken and peppers in my sandwich. | `c_kerek+a_sult_csirke+c_es+a_paprika+c_a_szendvicsembe` | 6.1 s |
| 10 | uborka_friss, uborka | want | Kérek uborkát és savanyú uborkát a szendvicsembe. | I'd like cucumber and pickles in my sandwich. | `c_kerek+a_uborka_friss+c_es+a_savanyu_uborka+c_a_szendvicsembe` | 6.4 s |
| 11 | sonka, sajt, paradicsom | want | Kérek sonkát, sajtot és paradicsomot a szendvicsembe. | I'd like ham, cheese and tomato in my sandwich. | `c_kerek+a_sonka+a_sajt+c_es+a_paradicsom+c_a_szendvicsembe` | 7.0 s |
| 12 | spenot, uborka, majonez | want | Kérek spenótot, savanyú uborkát és majonézt a szendvicsembe. | I'd like spinach, pickles and mayonnaise in my sandwich. | `c_kerek+a_spenot+a_savanyu_uborka+c_es+a_majonez+c_a_szendvicsembe` | 7.5 s |
| 13 | szalami, salata, hagyma, mustar | want | Kérek szalámit, salátát, hagymát és mustárt a szendvicsembe. | I'd like salami, lettuce, onion and mustard in my sandwich. | `c_kerek+a_szalami+a_salata+a_hagyma+c_es+a_mustar+c_a_szendvicsembe` | 8.1 s |
| 14 | uborka | without | Savanyú uborka nélkül, kérem. | Without pickles, please. | `p_nelkul_uborka` | 2.6 s |
| 15 | hagyma | without | Hagyma nélkül, kérem. | Without onion, please. | `p_nelkul_hagyma` | 2.0 s |
| 16 | csirke | without | Sült csirke nélkül, kérem. | Without roast chicken, please. | `p_nelkul_csirke` | 2.3 s |
| 17 | szalami | without | Szalámi nélkül, kérem. | Without salami, please. | `p_nelkul_szalami` | 2.1 s |
| 18 | olivabogyo | without | Olívabogyó nélkül, kérem. | Without olives, please. | `p_nelkul_olivabogyo` | 2.4 s |
| 19 | hagyma, mustar | without | Hagyma és mustár nélkül, kérem. | Without onion and mustard, please. | `w_hagyma+c_es+w_mustar+c_nelkul+c_kerem` | 5.1 s |
| 20 | szalami, paradicsom | without | Szalámi és paradicsom nélkül, kérem. | Without salami and tomato, please. | `w_szalami+c_es+w_paradicsom+c_nelkul+c_kerem` | 5.3 s |
| 21 | uborka, olivabogyo | without | Savanyú uborka és olívabogyó nélkül, kérem. | Without pickles and olives, please. | `w_uborka+c_es+w_olivabogyo+c_nelkul+c_kerem` | 6.0 s |
| 22 | paradicsom, paprika, majonez | without | Paradicsom, paprika és majonéz nélkül, kérem. | Without tomato, peppers and mayonnaise, please. | `w_paradicsom+w_paprika+c_es+w_majonez+c_nelkul+c_kerem` | 6.5 s |
| 23 | uborka_friss, csirke, spenot, sajt | without | Uborka, sült csirke, spenót és sajt nélkül, kérem. | Without cucumber, roast chicken, spinach and cheese, please. | `w_uborka_friss+w_sult_csirke+w_spenot+c_es+w_sajt+c_nelkul+c_kerem` | 7.6 s |
| 24 | *(none)* | want | Kérek … a szendvicsembe. | I'd like … in my sandwich. | `""` (Listen disabled) | – |
| 25 | *(none)* | without | … nélkül, kérem. | Without …, please. | `""` (Listen disabled) | – |
| 26 | input `szalami, szalami, kave, paradicsom` → `szalami, paradicsom` | want | Kérek szalámit és paradicsomot a szendvicsembe. | I'd like salami and tomato in my sandwich. | `c_kerek+a_szalami+c_es+a_paradicsom+c_a_szendvicsembe` | 5.9 s |
| 27 | input `sonka, szalami, csirke, sajt, hagyma` → first 4 (cap) | want | Kérek sonkát, szalámit, sült csirkét és sajtot a szendvicsembe. | I'd like ham, salami, roast chicken and cheese in my sandwich. | `c_kerek+a_sonka+a_szalami+a_sult_csirke+c_es+a_sajt+c_a_szendvicsembe` | 8.3 s |

Notes on the edge rows:
- **#26**: the duplicate and the non-ingredient (`kave`) are dropped.
- **#27**: the 5th item is ignored because of the cap. In the UI, `AddWordButton` is already disabled at 4.
- **Rows 8 and 20** are the same slots in the two patterns: switching pattern keeps the slots.
- **Rows 3, 9, 16 and 23** exercise the `csirke` trap. **Rows 4, 10, 12, 14 and 21** exercise the `uborka` (pickles) trap.

---

## 10. LEAF golden path (the user's storyboard)

1. Learn `uborka_friss` → card "Use it live →" → `phraseSlotIds == ["uborka_friss"]`, `phrasePattern == "want"`, `phraseHu == "Kérek uborkát a szendvicsembe."`, `phraseEn == "I'd like cucumber in my sandwich."`. Listen → `lastVoiceKey == "p_kerek_uborka_friss"`.
2. Point at `szalami` → `UseThisWordButton` → `phraseSlotIds == ["szalami"]`, `phraseHu == "Kérek szalámit a szendvicsembe."`, key `p_kerek_szalami`. It's the same helper object; no new card.
3. Point at `paradicsom` → `AddWordButton` → `phraseHu == "Kérek szalámit és paradicsomot a szendvicsembe."`, key `c_kerek+a_szalami+c_es+a_paradicsom+c_a_szendvicsembe`. After Listen, `lastVoiceKey` equals that full key: the controller reports the full key for sequences.
4. Point at `uborka` → `UseThisWordButton` → `PatternWithoutButton` → `phrasePattern == "without"`, `phraseHu == "Savanyú uborka nélkül, kérem."`, `phraseEn == "Without pickles, please."`, key `p_nelkul_uborka`.
5. Showing or listening **never** submits. Only speech detection or `SaidItButton` advances step 2.

---

## 11. Reference implementation (pure TS, no Lens API; Node-tested)

> **Superseded by `agent/phase-c/drafts/WbwPhraseHelperModel.ts`**, which is the one to port. It keeps the same ingredient table and sentences but adds the state model, emphasis ranges, `maxSlots`, `canListen` and a self-test. This listing (and its copy `drafts/WbwPhraseBuilder.ts`) is kept only as the record of what was checked.

```ts
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
```

How it was checked:
- Run under Node 24 (scratchpad copy, nothing under `Assets/` touched), all 27 rows of §9 come out exactly as listed. The same holds for an independent Python port.
- `phraseClipKeys()` checked against `Assets/Audio/hu/`: no file is missing.
- Checked against `WbwAudioBank.ts`: 31 keys are missing (§7.4).
- Suggested consistency check with `WbwVocab.WORDS`: for each id, `nom === WordEntry.hu`, `wClip === WordEntry.audio` and `enLabel === WordEntry.en`. All 15 match today.

---

## 12. Flags a native speaker might notice (none block the demo)

1. **`a szendvicsembe` right after "Mit kér bele?"** is a little over-explicit. Mid-exchange, a native speaker would say *Uborkát kérek bele.* / *Kérek bele uborkát.* It's correct and polite, so keep it, since it makes the phrase reusable on its own (§3.3).
2. **The stitched multi-item audio** has about 0.58 s gaps and a falling citation tone on every part. Understandable, but robotic. The 1-item phrases sound natural. Options are in §7.3.
3. **Cucumber and pickles together**: *Kérek uborkát és savanyú uborkát …* is acceptable. A native speaker might say *friss uborkát* for contrast, but there's no *friss* clip.
4. **Adjective scope in theory**: in *sült csirke és paprika nélkül*, *sült* could be read as covering both items ("roast peppers" exist). In practice nobody reads it that way. No change needed.
5. ***olívabogyó* vs *olajbogyó***: both are standard. *Olívabogyó* is very common on menus and matches the clips. Keep it.
6. ***spenót*** may suggest cooked spinach to some Hungarians (menus say *bébispenót* for fresh leaves). It's understood in context.
7. **Pattern B alone** as an answer to *Mit kér bele?* is pragmatically partial (§4.5). Grammatically it's perfect. An optional hint can steer learners to say A first.
8. **English choices**:
   - "pickles" (US/international) vs "gherkins" (UK)
   - "in my sandwich" vs American "on"
   - "without A and B" vs "without A or B"

   All are deliberate and explained in §6.
