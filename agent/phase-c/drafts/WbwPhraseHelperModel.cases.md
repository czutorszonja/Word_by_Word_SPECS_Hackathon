# WbwPhraseHelperModel — test cases

These are the cases for `agent/phase-c/drafts/WbwPhraseHelperModel.ts`, the pure model behind the Use it live phrase helper ("SAY IT AT THE COUNTER").

The same cases are in the module as `BUILD_CASES`, `MODEL_CASES` and `POINTER_CASES`, and `selfTest()` runs them. Every table below was produced by the module and then checked against it. Rows B1–B27 are R3 §9 rows 1–27, and a script confirmed they match R3 word for word.

This file and the module are the **canonical** phrase helper: port only `WbwPhraseHelperModel.ts` into `Assets/`, so there is a single ingredient table. They supersede both `WbwSentenceBuilder.ts` / `.cases.md` (the old order-strip design, see R3) and `WbwPhraseBuilder.ts` (the R3 §11 reference, which exports the same names with a different contract). Both files carry a "SUPERSEDED — DO NOT PORT" header.

**Run it** (Node 24 strips the types itself, so nothing needs installing):

```
node --input-type=module -e "import('file:///C:/LensProjects/Word_by_Word_SPECS_Hackhaton/agent/phase-c/drafts/WbwPhraseHelperModel.ts').then(M => console.log(JSON.stringify(M.selfTest())))"
```

It prints `[]` when everything passes. Last run: **0 mismatches** in about 60 ms. That covers the 30 build cases, 12 model sequences (38 steps), 9 pointer cases, the view and audio-gating helpers, and about 6,000 generated phrases.

Conventions:
- Ids are `WordEntry.id` from `Assets/Scripts/WbwVocab.ts`. Strings are NFC.
- Emphasis ranges are `[start, end)` in UTF-16 code units, the same as `String.slice`. Every character used is in the BMP, so a code unit is one character.
- An audio key `a+b+c` means the clips play in sequence. `""` means nothing to play, and Listen is disabled.

---

## A. `buildPhrase(slots, pattern)`: exact output

| # | Slots (input) | Pattern | `hu` (`phraseHu`) | `en` (`phraseEn`) | `audioKey` (`phraseAudioKey`) | `emphasisRanges` in `hu` |
|---|---|---|---|---|---|---|
| B1 | uborka_friss | want | Kérek uborkát a szendvicsembe. | I'd like cucumber in my sandwich. | `p_kerek_uborka_friss` | uborka_friss 6–13 |
| B2 | szalami | want | Kérek szalámit a szendvicsembe. | I'd like salami in my sandwich. | `p_kerek_szalami` | szalami 6–14 |
| B3 | csirke | want | Kérek sült csirkét a szendvicsembe. | I'd like roast chicken in my sandwich. | `p_kerek_csirke` | csirke 6–18 |
| B4 | uborka | want | Kérek savanyú uborkát a szendvicsembe. | I'd like pickles in my sandwich. | `p_kerek_uborka` | uborka 6–21 |
| B5 | olivabogyo | want | Kérek olívabogyót a szendvicsembe. | I'd like olives in my sandwich. | `p_kerek_olivabogyo` | olivabogyo 6–17 |
| B6 | husgomboc | want | Kérek húsgombócot a szendvicsembe. | I'd like meatballs in my sandwich. | `p_kerek_husgomboc` | husgomboc 6–17 |
| B7 | sajt | want | Kérek sajtot a szendvicsembe. | I'd like cheese in my sandwich. | `p_kerek_sajt` | sajt 6–12 |
| B8 | szalami, paradicsom | want | Kérek szalámit és paradicsomot a szendvicsembe. | I'd like salami and tomato in my sandwich. | `c_kerek+a_szalami+c_es+a_paradicsom+c_a_szendvicsembe` | szalami 6–14; paradicsom 18–30 |
| B9 | csirke, paprika | want | Kérek sült csirkét és paprikát a szendvicsembe. | I'd like roast chicken and peppers in my sandwich. | `c_kerek+a_sult_csirke+c_es+a_paprika+c_a_szendvicsembe` | csirke 6–18; paprika 22–30 |
| B10 | uborka_friss, uborka | want | Kérek uborkát és savanyú uborkát a szendvicsembe. | I'd like cucumber and pickles in my sandwich. | `c_kerek+a_uborka_friss+c_es+a_savanyu_uborka+c_a_szendvicsembe` | uborka_friss 6–13; uborka 17–32 |
| B11 | sonka, sajt, paradicsom | want | Kérek sonkát, sajtot és paradicsomot a szendvicsembe. | I'd like ham, cheese and tomato in my sandwich. | `c_kerek+a_sonka+a_sajt+c_es+a_paradicsom+c_a_szendvicsembe` | sonka 6–12; sajt 14–20; paradicsom 24–36 |
| B12 | spenot, uborka, majonez | want | Kérek spenótot, savanyú uborkát és majonézt a szendvicsembe. | I'd like spinach, pickles and mayonnaise in my sandwich. | `c_kerek+a_spenot+a_savanyu_uborka+c_es+a_majonez+c_a_szendvicsembe` | spenot 6–14; uborka 16–31; majonez 35–43 |
| B13 | szalami, salata, hagyma, mustar | want | Kérek szalámit, salátát, hagymát és mustárt a szendvicsembe. | I'd like salami, lettuce, onion and mustard in my sandwich. | `c_kerek+a_szalami+a_salata+a_hagyma+c_es+a_mustar+c_a_szendvicsembe` | szalami 6–14; salata 16–23; hagyma 25–32; mustar 36–43 |
| B14 | uborka | without | Savanyú uborka nélkül, kérem. | Without pickles, please. | `p_nelkul_uborka` | uborka 0–14 |
| B15 | hagyma | without | Hagyma nélkül, kérem. | Without onion, please. | `p_nelkul_hagyma` | hagyma 0–6 |
| B16 | csirke | without | Sült csirke nélkül, kérem. | Without roast chicken, please. | `p_nelkul_csirke` | csirke 0–11 |
| B17 | szalami | without | Szalámi nélkül, kérem. | Without salami, please. | `p_nelkul_szalami` | szalami 0–7 |
| B18 | olivabogyo | without | Olívabogyó nélkül, kérem. | Without olives, please. | `p_nelkul_olivabogyo` | olivabogyo 0–10 |
| B19 | hagyma, mustar | without | Hagyma és mustár nélkül, kérem. | Without onion and mustard, please. | `w_hagyma+c_es+w_mustar+c_nelkul+c_kerem` | hagyma 0–6; mustar 10–16 |
| B20 | szalami, paradicsom | without | Szalámi és paradicsom nélkül, kérem. | Without salami and tomato, please. | `w_szalami+c_es+w_paradicsom+c_nelkul+c_kerem` | szalami 0–7; paradicsom 11–21 |
| B21 | uborka, olivabogyo | without | Savanyú uborka és olívabogyó nélkül, kérem. | Without pickles and olives, please. | `w_uborka+c_es+w_olivabogyo+c_nelkul+c_kerem` | uborka 0–14; olivabogyo 18–28 |
| B22 | paradicsom, paprika, majonez | without | Paradicsom, paprika és majonéz nélkül, kérem. | Without tomato, peppers and mayonnaise, please. | `w_paradicsom+w_paprika+c_es+w_majonez+c_nelkul+c_kerem` | paradicsom 0–10; paprika 12–19; majonez 23–30 |
| B23 | uborka_friss, csirke, spenot, sajt | without | Uborka, sült csirke, spenót és sajt nélkül, kérem. | Without cucumber, roast chicken, spinach and cheese, please. | `w_uborka_friss+w_sult_csirke+w_spenot+c_es+w_sajt+c_nelkul+c_kerem` | uborka_friss 0–6; csirke 8–19; spenot 21–27; sajt 31–35 |
| B24 | *(none)* | want | Kérek … a szendvicsembe. | I'd like … in my sandwich. | `""` | – |
| B25 | *(none)* | without | … nélkül, kérem. | Without …, please. | `""` | – |
| B26 | szalami, szalami, kave, paradicsom | want | Kérek szalámit és paradicsomot a szendvicsembe. | I'd like salami and tomato in my sandwich. | `c_kerek+a_szalami+c_es+a_paradicsom+c_a_szendvicsembe` | szalami 6–14; paradicsom 18–30 |
| B27 | sonka, szalami, csirke, sajt, hagyma | want | Kérek sonkát, szalámit, sült csirkét és sajtot a szendvicsembe. | I'd like ham, salami, roast chicken and cheese in my sandwich. | `c_kerek+a_sonka+a_szalami+a_sult_csirke+c_es+a_sajt+c_a_szendvicsembe` | sonka 6–12; szalami 14–22; csirke 24–36; sajt 40–46 |
| B28 | husgomboc, majonez | without | Húsgombóc és majonéz nélkül, kérem. | Without meatballs and mayonnaise, please. | `w_husgomboc+c_es+w_majonez+c_nelkul+c_kerem` | husgomboc 0–9; majonez 13–20 |
| B29 | kave, kenyer, szendvics | want | Kérek … a szendvicsembe. | I'd like … in my sandwich. | `""` | – |
| B30 | csirke, husgomboc, paradicsom, uborka | want | Kérek sült csirkét, húsgombócot, paradicsomot és savanyú uborkát a szendvicsembe. | I'd like roast chicken, meatballs, tomato and pickles in my sandwich. | `c_kerek+a_sult_csirke+a_husgomboc+a_paradicsom+c_es+a_savanyu_uborka+c_a_szendvicsembe` | csirke 6–18; husgomboc 20–31; paradicsom 33–45; uborka 49–64 |

What each row tests:
- **B1–B7**: one item, pattern A. Each plays the whole recorded clip, whose text matches `hu` character for character.
- **B8–B13, B30**: lists, pattern A. Each item is accusative, joined `X és Y` / `X, Y és Z` with no comma before *és*. Audio is `c_kerek … c_a_szendvicsembe`.
- **B14–B23, B28**: pattern B. The noun is nominative and only the first letter of the sentence is capitalised (*Savanyú uborka*, *Sült csirke*, *Uborka*, never *SZalámi*). One *nélkül* follows the whole list, and the sentence ends `, kérem.`
- **Clip traps**:
  - `csirke`: B3, B9, B16, B23, B27 and B30 use `a_sult_csirke` / `w_sult_csirke`, never `a_csirke` / `w_csirke`.
  - `uborka` (pickles): B4, B10, B12, B14, B21 and B30 use `a_savanyu_uborka` / `w_uborka`. There is no `a_uborka` clip.
- **English plurals**: B6 and B28 say *meatballs* (the label says *meatball*, a deliberate singular gloss mirroring `WbwVocab.en`; to pluralise it, change `WbwVocab.ts` and `enLabel` together, see R3 §2); B9 and B22 say *peppers*; B5, B18 and B21 say *olives*; B4 and B10 say *pickles*.
- **Normalisation**:
  - B26 drops a duplicate and a non-ingredient.
  - B27 caps the list at 4.
  - B29 gives an empty phrase, because coffee and bread words never fill the slot.
- **Empty state**: B24, B25 and B29 show `…` as the placeholder, have audio key `""`, `valid: false`, and no emphasis ranges.

English ranges checked exactly: B1 (cucumber 9–17), B8 (salami 9–15; tomato 20–26) and B14 (pickles 8–15). For every other build, the invariants in §E check that each English range slices to that ingredient's `enPhrase`.

---

## B. `PhraseHelperModel`: operation sequences

Each step lists the mutator's return value (`true` only when the state changed; `revision` increments exactly then) and the readable state afterwards (`testState()`).

### M1: the user's storyboard (R3 §10 golden path)
Start: new model.

| # | Call | Returns | `phraseSlotIds` | `phrasePattern` | `phraseHu` | `phraseAudioKey` |
|---|---|---|---|---|---|---|
| 1 | `useWord("uborka_friss")` (card "Use it live →") | true | uborka_friss | want | Kérek uborkát a szendvicsembe. | `p_kerek_uborka_friss` |
| 2 | `useWord("szalami")` (UseThisWordButton) | true | szalami | want | Kérek szalámit a szendvicsembe. | `p_kerek_szalami` |
| 3 | `addWord("paradicsom")` (AddWordButton "+ és") | true | szalami, paradicsom | want | Kérek szalámit és paradicsomot a szendvicsembe. | `c_kerek+a_szalami+c_es+a_paradicsom+c_a_szendvicsembe` |
| 4 | `useWord("uborka")` | true | uborka | want | Kérek savanyú uborkát a szendvicsembe. | `p_kerek_uborka` |
| 5 | `setPattern("without")` (PatternWithoutButton) | true | uborka | without | Savanyú uborka nélkül, kérem. | `p_nelkul_uborka` |

### M2: switching pattern keeps the slots, in both directions
Start: `{slots: [szalami, paradicsom]}`.

| # | Call | Returns | `phraseSlotIds` | `phrasePattern` | `phraseHu` | `phraseAudioKey` |
|---|---|---|---|---|---|---|
| 1 | `setPattern("without")` | true | szalami, paradicsom | without | Szalámi és paradicsom nélkül, kérem. | `w_szalami+c_es+w_paradicsom+c_nelkul+c_kerem` |
| 2 | `setPattern("without")` | false | szalami, paradicsom | without | Szalámi és paradicsom nélkül, kérem. | `w_szalami+c_es+w_paradicsom+c_nelkul+c_kerem` |
| 3 | `setPattern("want")` | true | szalami, paradicsom | want | Kérek szalámit és paradicsomot a szendvicsembe. | `c_kerek+a_szalami+c_es+a_paradicsom+c_a_szendvicsembe` |

### M3: adding builds the 3-item list (commas, *és* before the last)
Start: `{slots: [sonka]}`.

| # | Call | Returns | `phraseSlotIds` | `phrasePattern` | `phraseHu` | `phraseAudioKey` |
|---|---|---|---|---|---|---|
| 1 | `addWord("sajt")` | true | sonka, sajt | want | Kérek sonkát és sajtot a szendvicsembe. | `c_kerek+a_sonka+c_es+a_sajt+c_a_szendvicsembe` |
| 2 | `addWord("paradicsom")` | true | sonka, sajt, paradicsom | want | Kérek sonkát, sajtot és paradicsomot a szendvicsembe. | `c_kerek+a_sonka+a_sajt+c_es+a_paradicsom+c_a_szendvicsembe` |

### M4: adding an id that is already in the phrase does nothing
Start: `{slots: [szalami, paradicsom]}`.

| # | Call | Returns | `phraseSlotIds` | `phrasePattern` | `phraseHu` | `phraseAudioKey` |
|---|---|---|---|---|---|---|
| 1 | `addWord("szalami")` | false | szalami, paradicsom | want | Kérek szalámit és paradicsomot a szendvicsembe. | `c_kerek+a_szalami+c_es+a_paradicsom+c_a_szendvicsembe` |
| 2 | `addWord("paradicsom")` | false | szalami, paradicsom | want | Kérek szalámit és paradicsomot a szendvicsembe. | `c_kerek+a_szalami+c_es+a_paradicsom+c_a_szendvicsembe` |

### M5: adding is refused when the phrase is full (4); "Use this word" still replaces
Start: `{slots: [sonka, szalami, csirke, sajt]}`.

| # | Call | Returns | `phraseSlotIds` | `phrasePattern` | `phraseHu` | `phraseAudioKey` |
|---|---|---|---|---|---|---|
| 1 | `addWord("hagyma")` | false | sonka, szalami, csirke, sajt | want | Kérek sonkát, szalámit, sült csirkét és sajtot a szendvicsembe. | `c_kerek+a_sonka+a_szalami+a_sult_csirke+c_es+a_sajt+c_a_szendvicsembe` |
| 2 | `useWord("hagyma")` | true | hagyma | want | Kérek hagymát a szendvicsembe. | `p_kerek_hagyma` |

### M6: non-ingredients never fill the slot
Coffee, bread, table and unknown ids are all refused. Start: `{slots: [uborka_friss]}`.

| # | Call | Returns | `phraseSlotIds` | `phrasePattern` | `phraseHu` | `phraseAudioKey` |
|---|---|---|---|---|---|---|
| 1 | `useWord("kave")` | false | uborka_friss | want | Kérek uborkát a szendvicsembe. | `p_kerek_uborka_friss` |
| 2 | `addWord("kenyer")` | false | uborka_friss | want | Kérek uborkát a szendvicsembe. | `p_kerek_uborka_friss` |
| 3 | `useWord("asztal")` | false | uborka_friss | want | Kérek uborkát a szendvicsembe. | `p_kerek_uborka_friss` |
| 4 | `addWord("nonexistent")` | false | uborka_friss | want | Kérek uborkát a szendvicsembe. | `p_kerek_uborka_friss` |

### M7: "use" on a word already in the phrase is a no-op (a combined phrase is never collapsed); "use" of a new word replaces a longer list
Start: `{slots: [szalami]}`.

| # | Call | Returns | `phraseSlotIds` | `phrasePattern` | `phraseHu` | `phraseAudioKey` |
|---|---|---|---|---|---|---|
| 1 | `useWord("szalami")` | false | szalami | want | Kérek szalámit a szendvicsembe. | `p_kerek_szalami` |
| 2 | `addWord("paradicsom")` | true | szalami, paradicsom | want | Kérek szalámit és paradicsomot a szendvicsembe. | `c_kerek+a_szalami+c_es+a_paradicsom+c_a_szendvicsembe` |
| 3 | `useWord("paradicsom")` | false | szalami, paradicsom | want | Kérek szalámit és paradicsomot a szendvicsembe. | `c_kerek+a_szalami+c_es+a_paradicsom+c_a_szendvicsembe` |
| 4 | `useWord("szalami")` | false | szalami, paradicsom | want | Kérek szalámit és paradicsomot a szendvicsembe. | `c_kerek+a_szalami+c_es+a_paradicsom+c_a_szendvicsembe` |
| 5 | `useWord("hagyma")` | true | hagyma | want | Kérek hagymát a szendvicsembe. | `p_kerek_hagyma` |

### M8: removing keeps the order of the rest; removing the last word empties the phrase
Start: `{slots: [sonka, sajt, paradicsom]}`.

| # | Call | Returns | `phraseSlotIds` | `phrasePattern` | `phraseHu` | `phraseAudioKey` |
|---|---|---|---|---|---|---|
| 1 | `removeWord("sajt")` | true | sonka, paradicsom | want | Kérek sonkát és paradicsomot a szendvicsembe. | `c_kerek+a_sonka+c_es+a_paradicsom+c_a_szendvicsembe` |
| 2 | `removeWord("sajt")` | false | sonka, paradicsom | want | Kérek sonkát és paradicsomot a szendvicsembe. | `c_kerek+a_sonka+c_es+a_paradicsom+c_a_szendvicsembe` |
| 3 | `removeWord("sonka")` | true | paradicsom | want | Kérek paradicsomot a szendvicsembe. | `p_kerek_paradicsom` |
| 4 | `removeWord("paradicsom")` | true | [] | want | Kérek … a szendvicsembe. | `""` |

### M9: on an empty phrase, "add" acts like "use"; `clear()` empties the phrase but keeps the pattern
Start: `{pattern: "without"}`.

| # | Call | Returns | `phraseSlotIds` | `phrasePattern` | `phraseHu` | `phraseAudioKey` |
|---|---|---|---|---|---|---|
| 1 | `addWord("hagyma")` | true | hagyma | without | Hagyma nélkül, kérem. | `p_nelkul_hagyma` |
| 2 | `addWord("mustar")` | true | hagyma, mustar | without | Hagyma és mustár nélkül, kérem. | `w_hagyma+c_es+w_mustar+c_nelkul+c_kerem` |
| 3 | `clear()` | true | [] | without | … nélkül, kérem. | `""` |
| 4 | `clear()` | false | [] | without | … nélkül, kérem. | `""` |

### M10: the constructor normalises duplicates, non-ingredients and the cap
Start: `{slots: [szalami, szalami, kave, paradicsom, sonka, sajt, hagyma]}`.

| # | Call | Returns | `phraseSlotIds` | `phrasePattern` | `phraseHu` | `phraseAudioKey` |
|---|---|---|---|---|---|---|
| 1 | `addWord("mustar")` | false | szalami, paradicsom, sonka, sajt | want | Kérek szalámit, paradicsomot, sonkát és sajtot a szendvicsembe. | `c_kerek+a_szalami+a_paradicsom+a_sonka+c_es+a_sajt+c_a_szendvicsembe` |

### M11: `maxSlots: 3` (tight panel) refuses the 4th add
Start: `{slots: [sonka, sajt], maxSlots: 3}`.

| # | Call | Returns | `phraseSlotIds` | `phrasePattern` | `phraseHu` | `phraseAudioKey` |
|---|---|---|---|---|---|---|
| 1 | `addWord("paradicsom")` | true | sonka, sajt, paradicsom | want | Kérek sonkát, sajtot és paradicsomot a szendvicsembe. | `c_kerek+a_sonka+a_sajt+c_es+a_paradicsom+c_a_szendvicsembe` |
| 2 | `addWord("hagyma")` | false | sonka, sajt, paradicsom | want | Kérek sonkát, sajtot és paradicsomot a szendvicsembe. | `c_kerek+a_sonka+a_sajt+c_es+a_paradicsom+c_a_szendvicsembe` |

### M12: two-word items keep their case and capital through every operation
Start: new model.

| # | Call | Returns | `phraseSlotIds` | `phrasePattern` | `phraseHu` | `phraseAudioKey` |
|---|---|---|---|---|---|---|
| 1 | `useWord("csirke")` | true | csirke | want | Kérek sült csirkét a szendvicsembe. | `p_kerek_csirke` |
| 2 | `addWord("uborka")` | true | csirke, uborka | want | Kérek sült csirkét és savanyú uborkát a szendvicsembe. | `c_kerek+a_sult_csirke+c_es+a_savanyu_uborka+c_a_szendvicsembe` |
| 3 | `setPattern("without")` | true | csirke, uborka | without | Sült csirke és savanyú uborka nélkül, kérem. | `w_sult_csirke+c_es+w_uborka+c_nelkul+c_kerem` |
| 4 | `removeWord("csirke")` | true | uborka | without | Savanyú uborka nélkül, kérem. | `p_nelkul_uborka` |

---

## C. `pointerActions(id)`: what the violet hover label offers in Use it live

The columns:
- `showUse`: `UseThisWordButton`
- `showAdd`: `AddWordButton` ("+ és")
- `inPhrase`: shows "In the phrase ✓"
- `formInPhrase`: optional teaching hint, e.g. "→ szalámit"

| # | Phrase slots | Pointed id | usable | inPhrase | showUse | showAdd | full | formInPhrase |
|---|---|---|---|---|---|---|---|---|
| P1 | [] | szalami | yes | no | yes | no | no | szalámit |
| P2 | uborka_friss | szalami | yes | no | yes | yes | no | szalámit |
| P3 | szalami | szalami | yes | yes | no | no | no | szalámit |
| P4 | szalami, paradicsom | szalami | yes | yes | no | no | no | szalámit |
| P5 | sonka, szalami, csirke, sajt | hagyma | yes | no | yes | no | yes | hagymát |
| P6 | szalami | kave | no | no | no | no | no | – |
| P7 | hagyma (without) | uborka | yes | no | yes | yes | no | savanyú uborka |
| P8 | sonka, sajt, paradicsom (max 3) | hagyma | yes | no | yes | no | yes | hagymát |
| P9 | sonka, szalami, csirke, sajt | csirke | yes | yes | no | no | yes | sült csirkét |

Rules:
- Add is offered only once the phrase has a slot (R4: "+ és once the phrase already has a slot").
- "Use this word" is hidden whenever the word is already in the phrase (`showUse = usable && !inPhrase`); the label shows "In the phrase ✓" instead. `useWord` refuses the same cases, so no path (button, label pinch, object select, card link) can collapse `[szalami, paradicsom]` to `[szalami]`. The agreed design has no remove/undo control; `removeWord` exists for a `RemoveWordButton` if the team ever adds one.
- Non-ingredients get no phrase buttons. The card's "Use it live →" opens the mode without filling the slot.

---

## D. View helpers (checked in `selfTest`)

| Call (on B8 / B14) | Result |
|---|---|
| `toRichText(b8.hu, b8.emphasisRanges, "<b>", "</b>")` | `Kérek <b>szalámit</b> és <b>paradicsomot</b> a szendvicsembe.` |
| `segmentsOf(b8.hu, b8.emphasisRanges)` | `Kérek ` · **`szalámit`** (szalami) · ` és ` · **`paradicsomot`** (paradicsom) · ` a szendvicsembe.` |
| `b8.huParts` | left `Kérek ` · slot `szalámit és paradicsomot` · right ` a szendvicsembe.` |
| `b14.huParts` | left `""` · slot `Savanyú uborka` · right ` nélkül, kérem.` |
| `canListen(b8 / b14, today's bank)` | `false` (would otherwise play half-silent); `true` with the full bank; `false` for an empty phrase |
| `withNoBreakItems(b14.hu, b14.emphasisRanges)` | `Savanyú` U+00A0 `uborka nélkül, kérem.` (same length, so the ranges stay valid; display only) |
| `b8.answerToken` | `fillings:want:szalami,paradicsom` |
| `missingClips(k => k !== "c_a_szendvicsembe")` | `["c_a_szendvicsembe"]` |

`huParts` / `enParts` are **not** an emphasis or "fixed frame" tool: only the left frame of A (`Kérek `) keeps its position; in B the whole frame (` nélkül, kérem.`) sits right of the slot and moves with it, and the slot part includes the joiners (`, ` / ` és `). For per-ingredient emphasis use `emphasisRanges` with `toRichText` or `segmentsOf`.

---

## E. Invariants checked on every build

`selfTest` checks these on every case above. It also checks them on every single item, every ordered pair (210) and every ordered triple (2,730) in both patterns, plus 30 four-item lists per pattern. That is about 6,000 generated phrases.

1. **Frame unchanged**:
   - A starts `Kérek ` and ends ` a szendvicsembe.`
   - B ends ` nélkül, kérem.`
2. **Spacing**: no double spaces, no `, és` and no `, and`.
3. **Case**: each Hungarian range slices to exactly that item's form.
   - A: the accusative.
   - B: the nominative, with only the first item capitalised.

   A bare dictionary form can therefore never appear in a "Kérek" sentence.
4. **English**: each English range slices to that item's `enPhrase`.
5. **Ranges and spans**, checked the same way for `hu` and `en` (`checkLine` in the module):
   - The range count is compared with the slot count first. A mismatch is reported and that line's remaining checks are skipped, so `selfTest` never crashes on it.
   - There is one range per slot, in slot order. The text between neighbouring ranges is exactly `, ` or the conjunction (` és ` / ` and `) before the last, so ranges cannot overlap.
   - `slotSpan` / `enSlotSpan` run from the first range's start to the last range's end (or cover `…` when empty).
   - `huParts` / `enParts`: `left` and `right` equal the frame literals, which `selfTest` writes out independently of the builder's constants, and `slot` equals the line text at the span. (That the three parts join back to the line is also asserted, but that holds by construction.)
6. **Audio matches the display**:
   - 1 item: the whole clip's text (from `make_hu_voice.py`, mirrored in `PHRASE_CLIP_TEXT`) equals `hu` exactly.
   - 2+ items: the clip texts in sequence say the same words as `hu`, ignoring case and punctuation. That is n + 3 parts: n items + `c_es` + 2 frame clips.
7. **Empty state**: `audioKey ""`, `valid false`, and the slot shows `…`.
8. **Revision**: `revision` changes exactly when a mutator returns `true`.

The tests themselves were mutation-checked; each of these deliberate bugs makes `selfTest` fail:
- `a_csirke` used for chicken
- a comma before *és*
- the capital dropped in B
- *majonézet*
- `c_es` between every item
- *meatball* in the phrase
- `enSlotSpan` off by one at either end, an English range dropped or shifted by one, a duplicated Hungarian range, and `enParts` cut at the Hungarian span

---

## F. Checks against the project (run once from a scratch script; nothing under Assets/ was changed)

| Check | Result |
|---|---|
| `checkAgainstVocab(WbwVocab.WORDS)`: `hu === nom`, `en === enLabel`, `audio === wClip` for all 15 | `[]` (all match) |
| `missingClips(k => file Assets/Audio/hu/<k>.wav exists)` | `[]` (all 65 clips exist) |
| `missingClips(k => WbwAudioBank.ts has an entry for k)` | **31 missing**: `c_a_szendvicsembe`, the 15 `p_kerek_*` and the 15 `p_nelkul_*`. This is the R3 §7.4 blocker. Until the bank lists them, `WbwAudioController` skips each missing part: every 1-item phrase plays nothing, and every 2+ item A phrase is heard without its *a szendvicsembe* ending. Only 2+ item B phrases play in full. `canListen` keeps Listen disabled for every incomplete sequence. The 31 lines to paste are in `drafts/WbwAudioBank.phrase-entries.txt` (re-checked: pasting them leaves `[]` missing, with no duplicate keys). |
| `missingClips(k => WbwAudioBank.ts has k, or phrase-entries.txt has k)` | `[]` |

---

## G. LEAF mapping (for whoever wires `WbwOrderController`)

- **Readable state**: the controller can mirror `model.testState()` one-to-one. It gives `phraseSlotIds`, `phrasePattern`, `phraseHu`, `phraseEn` and `phraseAudioKey`.
- **Expected values**: the M1 rows are the expected values for R5 tour beats U1–U4 and the R4 DC test block. For example, the LEAF helper `t.useWord("paradicsom", true)` (R4 §(e) `WbwLeafHelpers.ts`; it taps `AddWordButton`) corresponds to the model call `addWord("paradicsom")`, and afterwards the phrase key is `c_kerek+a_szalami+c_es+a_paradicsom+c_a_szendvicsembe` (M1 step 3).
- **Do not confuse the two `useWord`s**: the model's `useWord(id)` takes one argument and *replaces* the list (`UseThisWordButton`); "+ és" (`AddWordButton`) must be wired to the model's `addWord(id)`. The two-argument `useWord(id, add)` exists only in the LEAF helpers.
- **Nothing submits**: no model call submits anything. Tests that tap Listen should still assert `orderStep` is unchanged; the model has no way to advance it.
