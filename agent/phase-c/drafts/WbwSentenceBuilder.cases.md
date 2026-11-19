# WbwSentenceBuilder — test cases

> **Superseded — do not port.** These cases belong to the old order-strip design. The canonical phrase model and its cases are `agent/phase-c/drafts/WbwPhraseHelperModel.ts` / `.cases.md`.

These cases test `buildOrderSentence(wantedIds, withoutIds)` in `WbwSentenceBuilder.ts`, which builds the step 2 sentence ("Mit kér bele?").
The rules come from `agent/phase-c/research/R3_hungarian.md`.
Rows 1–20 are the worked examples in R3 §7. Rows 21–28 are extra edge cases.
`SENTENCE_CASES` in the module holds the same rows, and `selfTest()` returns one message for each field that doesn't match.

**Inputs are listed in tap order.** The output is always in the fixed sandwich order: sonka, szalami, csirke, husgomboc, sajt, salata, spenot, paradicsom, paprika, uborka_friss, uborka, olivabogyo, hagyma, majonez, mustar.

The "Valid" column means the order can be submitted, which needs at least one wanted item.
When a case is not valid, the strip shows an English hint:
- If nothing is chosen: "Point at the ingredients on the counter."
- If only "nélkül" items are chosen: "Choose at least one thing you want (Kérek)."

The "Play key" column is the clip that actually plays. It is shown only when it differs from the audio key, which happens when a whole recorded phrase matches the built key.

| # | Want (tap order) | Without (tap order) | Hungarian | English | Audio key | Valid | Play key |
|---|---|---|---|---|---|---|---|
| 1 | sonka | – | Sonkát kérek. | Ham, please. | `a_sonka+c_kerek` | yes | |
| 2 | sonka, sajt | – | Sonkát és sajtot kérek. | Ham and cheese, please. | `a_sonka+c_es+a_sajt+c_kerek` | yes | `p_sonka_sajt` |
| 3 | sonka, szalami, paprika | uborka | Sonkát, szalámit és paprikát kérek, savanyú uborka nélkül. | Ham, salami and peppers, without pickles, please. | `a_sonka+a_szalami+c_es+a_paprika+c_kerek+w_uborka+c_nelkul` | yes | |
| 4 | csirke | hagyma | Sült csirkét kérek, hagyma nélkül. | Roast chicken, without onion, please. | `a_sult_csirke+c_kerek+w_hagyma+c_nelkul` | yes | |
| 5 | husgomboc, sajt | hagyma, mustar | Húsgombócot és sajtot kérek, hagyma és mustár nélkül. | Meatballs and cheese, without onion and mustard, please. | `a_husgomboc+c_es+a_sajt+c_kerek+w_hagyma+c_es+w_mustar+c_nelkul` | yes | |
| 6 | salata, paradicsom, uborka_friss | – | Salátát, paradicsomot és uborkát kérek. | Lettuce, tomato and cucumber, please. | `a_salata+a_paradicsom+c_es+a_uborka_friss+c_kerek` | yes | |
| 7 | uborka_friss | uborka | Uborkát kérek, savanyú uborka nélkül. | Cucumber, without pickles, please. | `a_uborka_friss+c_kerek+w_uborka+c_nelkul` | yes | |
| 8 | uborka, olivabogyo | – | Savanyú uborkát és olívabogyót kérek. | Pickles and olives, please. | `a_savanyu_uborka+c_es+a_olivabogyo+c_kerek` | yes | |
| 9 | szalami, spenot | majonez | Szalámit és spenótot kérek, majonéz nélkül. | Salami and spinach, without mayonnaise, please. | `a_szalami+c_es+a_spenot+c_kerek+w_majonez+c_nelkul` | yes | |
| 10 | sonka, sajt, salata, paradicsom, majonez | – | Sonkát, sajtot, salátát, paradicsomot és majonézt kérek. | Ham, cheese, lettuce, tomato and mayonnaise, please. | `a_sonka+a_sajt+a_salata+a_paradicsom+c_es+a_majonez+c_kerek` | yes | |
| 11 | csirke, paprika | hagyma, olivabogyo, uborka | Sült csirkét és paprikát kérek, savanyú uborka, olívabogyó és hagyma nélkül. | Roast chicken and peppers, without pickles, olives and onion, please. | `a_sult_csirke+c_es+a_paprika+c_kerek+w_uborka+w_olivabogyo+c_es+w_hagyma+c_nelkul` | yes | |
| 12 | mustar | – | Mustárt kérek. | Mustard, please. | `a_mustar+c_kerek` | yes | |
| 13 | sajt | sonka | Sajtot kérek, sonka nélkül. | Cheese, without ham, please. | `a_sajt+c_kerek+w_sonka+c_nelkul` | yes | |
| 14 | paprika, sonka | mustar, majonez | Sonkát és paprikát kérek, majonéz és mustár nélkül. | Ham and peppers, without mayonnaise and mustard, please. | `a_sonka+c_es+a_paprika+c_kerek+w_majonez+c_es+w_mustar+c_nelkul` | yes | |
| 15 | sonka, szalami, csirke, husgomboc | spenot, paradicsom, paprika, hagyma | Sonkát, szalámit, sült csirkét és húsgombócot kérek, spenót, paradicsom, paprika és hagyma nélkül. | Ham, salami, roast chicken and meatballs, without spinach, tomato, peppers and onion, please. | `a_sonka+a_szalami+a_sult_csirke+c_es+a_husgomboc+c_kerek+w_spenot+w_paradicsom+w_paprika+c_es+w_hagyma+c_nelkul` | yes | |
| 16 | hagyma | – | Hagymát kérek. | Onion, please. | `a_hagyma+c_kerek` | yes | |
| 17 | – | hagyma | Hagyma nélkül, kérem. | Without onion, please. | `w_hagyma+c_nelkul+c_kerem` | **no** (preview) | |
| 18 | – | uborka | Savanyú uborka nélkül, kérem. | Without pickles, please. | `w_uborka+c_nelkul+c_kerem` | **no** (preview) | `p_uborka_nelkul` |
| 19 | – | hagyma, mustar | Hagyma és mustár nélkül, kérem. | Without onion and mustard, please. | `w_hagyma+c_es+w_mustar+c_nelkul+c_kerem` | **no** (preview) | |
| 20 | – | – | *(empty)* | *(empty)* | *(empty: Listen disabled)* | **no** | *(empty)* |
| 21 | sajt, sonka, sajt *(duplicate tap)* | – | Sonkát és sajtot kérek. | Ham and cheese, please. | `a_sonka+c_es+a_sajt+c_kerek` | yes | `p_sonka_sajt` |
| 22 | sonka | sonka, hagyma *(sonka is in both lists, so wanted wins)* | Sonkát kérek, hagyma nélkül. | Ham, without onion, please. | `a_sonka+c_kerek+w_hagyma+c_nelkul` | yes | |
| 23 | kave, olivabogyo *(kave is not a counter item)* | szendvics *(not a counter item)* | Olívabogyót kérek. | Olives, please. | `a_olivabogyo+c_kerek` | yes | |
| 24 | – | csirke | Sült csirke nélkül, kérem. | Without roast chicken, please. | `w_sult_csirke+c_nelkul+c_kerem` | **no** (preview) | |
| 25 | uborka | uborka_friss | Savanyú uborkát kérek, uborka nélkül. | Pickles, without cucumber, please. | `a_savanyu_uborka+c_kerek+w_uborka_friss+c_nelkul` | yes | |
| 26 | szalami | husgomboc, salata, spenot | Szalámit kérek, húsgombóc, saláta és spenót nélkül. | Salami, without meatballs, lettuce and spinach, please. | `a_szalami+c_kerek+w_husgomboc+w_salata+c_es+w_spenot+c_nelkul` | yes | |
| 27 | sajt, sonka | uborka | Sonkát és sajtot kérek, savanyú uborka nélkül. | Ham and cheese, without pickles, please. | `a_sonka+c_es+a_sajt+c_kerek+w_uborka+c_nelkul` | yes | *(no override: the key is longer than `p_sonka_sajt`)* |
| 28 | kave *(only unknown ids)* | – | *(empty)* | *(empty)* | *(empty)* | **no** | *(empty)* |

## What else the self-check covers

- **`huLines`:** joined with a space, the lines must equal `hu`. When both parts are present, the break comes after "kérek,".
  For #3 the lines are "Sonkát, szalámit és paprikát kérek," and "savanyú uborka nélkül."
- **`parts`:** joined with "+", the parts must equal `audioKey`.
- **`hint`:**
  - It is "" when the case is valid.
  - It is `HINT_EMPTY` when `hu` is empty.
  - Otherwise it is `HINT_NEED_WANT`.

## Other checks, run once outside the Lens

These were run under Node 24 on 2026-11-19, using a copy in the scratchpad. Nothing under Assets/ was changed.

- **`selfTest()`:** returned `[]`, so all 28 cases pass. With a deliberately wrong expected value, it reports the mismatch, so the check is not trivially true.
- **`vocabMismatches(WORDS)`:** run against `Assets/Scripts/WbwVocab.ts`, it returned `[]`. All 15 ids exist, each `nom` equals `WordEntry.hu`, each `wClip` equals `WordEntry.audio`, and every sandwich word is in the table.
- **`missingClips(...)`:** checked against the file names in `Assets/Audio/hu/`, it returned `[]`. All 30 `a_`/`w_` clips, the 4 connector clips and the 2 whole-phrase clips exist.
- **NFC:** every Hungarian string in the table and in the cases is already NFC (precomposed accents).

## Golden case for LEAF (DC3, step 2)

This is case #3, the sentence from the design brief.

- Input: `orderWanted = ["sonka", "szalami", "paprika"]`, `orderWithout = ["uborka"]`
- `builtSentenceHu = "Sonkát, szalámit és paprikát kérek, savanyú uborka nélkül."`
- `builtAudioKey = "a_sonka+a_szalami+c_es+a_paprika+c_kerek+w_uborka+c_nelkul"`
