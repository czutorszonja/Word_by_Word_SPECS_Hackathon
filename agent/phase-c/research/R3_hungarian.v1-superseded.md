# R3 — Hungarian grammar for the built café order (step 2, "Mit kér bele?")

Scope: how the order strip turns a set of **wanted** ingredients (`orderWanted[]`) and a set of
**excluded** ingredients (`orderWithout[]`) into (a) the displayed Hungarian sentence, (b) the English
line under it, and (c) an audio key made only of existing clips in `Assets/Audio/hu/`.
Sources checked: `devpost/audio-recording-list.md`, `devpost/design-brief.md`,
`Assets/Scripts/WbwVocab.ts` (ingredient ids), `Assets/Scripts/WbwAudioController.ts` ("a+b+c" keys),
`agent/tts/make_hu_voice.py` (the exact text each clip says), and the clip files themselves
(durations and silence padding measured, read-only).

---

## 1. Decisions at a glance

| Question | Decision |
|---|---|
| Case of wanted items | **Accusative** (`a_*` clips): they are the objects of *kérek*. Every item in the list takes its own *-t* ending. |
| Case of excluded items | **Nominative** (`w_*` clips): *nélkül* is a postposition and the noun before it stays unchanged. |
| List joining | `A` · `A és B` · `A, B és C` — commas between items, **és** before the last, **no comma before és**. Same rule in both lists. |
| Wanted part | `<list> kérek` (object first, verb after). This is the focus position, which is exactly where the answer to the question *Mit kér bele?* goes. |
| Excluded part | **One** *nélkül* after the whole joined list: `hagyma és mustár nélkül`. Not one *nélkül* per item. |
| Joining both parts | `<W> kérek, <X> nélkül.` — a comma, no *de* (no clip for *de*; the version without it is fully natural). No closing *kérem*. |
| Only wanted | `<W> kérek.` Submittable. |
| Only excluded | Shown as a preview, `<X> nélkül, kérem.`, Listen works, but **not submittable** (design: at least one wanted). Hint: pick something with *Kérek*. |
| "Everything except…" | **Not supported** (needs *mindent / csak / bele*, which have no clips). |
| Order of items | **Fixed "sandwich order"** (meats → cheese → vegetables → pickled/olives → onion → sauces), *not* tap order. Natural, and the same choices always give the same string (stable for LEAF). |
| Display | First letter upper-case, the rest lower-case, ends with a full stop. Line break, if needed, after the comma before the *nélkül* part. |
| English | `<W>, please.` · `<W>, without <X>, please.` · `Without <X>, please.` — no Oxford comma, *please* always last. |
| Audio key | `a_` clips of W with `c_es` before the last, `c_kerek`, then `w_` clips of X with `c_es` before the last, `c_nelkul`. X-only adds `c_kerem`. No clip for commas (see §6 on pauses). |

---

## 2. The 15 counter ingredients

Ids are the `WordEntry.id` values (`Learnable_<id>` on the counter). Rows are in the **canonical
sandwich order** used to sort both lists.

| # | id | Nominative (after *nélkül*) | Accusative (before *kérek*) | `w_` clip (nom.) | `a_` clip (acc.) | English in the sentence |
|---|---|---|---|---|---|---|
| 1 | `sonka` | sonka | sonkát | `w_sonka` | `a_sonka` | ham |
| 2 | `szalami` | szalámi | szalámit | `w_szalami` | `a_szalami` | salami |
| 3 | `csirke` | sült csirke | sült csirkét | `w_sult_csirke` | `a_sult_csirke` | roast chicken |
| 4 | `husgomboc` | húsgombóc | húsgombócot | `w_husgomboc` | `a_husgomboc` | meatballs |
| 5 | `sajt` | sajt | sajtot | `w_sajt` | `a_sajt` | cheese |
| 6 | `salata` | saláta | salátát | `w_salata` | `a_salata` | lettuce |
| 7 | `spenot` | spenót | spenótot | `w_spenot` | `a_spenot` | spinach |
| 8 | `paradicsom` | paradicsom | paradicsomot | `w_paradicsom` | `a_paradicsom` | tomato |
| 9 | `paprika` | paprika | paprikát | `w_paprika` | `a_paprika` | peppers |
| 10 | `uborka_friss` | uborka | uborkát | `w_uborka_friss` | `a_uborka_friss` | cucumber |
| 11 | `uborka` (pickles) | savanyú uborka | savanyú uborkát | `w_uborka` | `a_savanyu_uborka` | pickles |
| 12 | `olivabogyo` | olívabogyó | olívabogyót | `w_olivabogyo` | `a_olivabogyo` | olives |
| 13 | `hagyma` | hagyma | hagymát | `w_hagyma` | `a_hagyma` | onion |
| 14 | `majonez` | majonéz | majonézt | `w_majonez` | `a_majonez` | mayonnaise |
| 15 | `mustar` | mustár | mustárt | `w_mustar` | `a_mustar` | mustard |

Traps to avoid in code:
- **Roast chicken:** the id is `csirke` but the item is *sült csirke*. Use `w_sult_csirke` / `a_sult_csirke`,
  **not** `w_csirke` / `a_csirke` (those say plain *csirke / csirkét*).
- **Pickles:** the id is `uborka`. Its nominative clip is `w_uborka`, which says *savanyú uborka*
  (checked in `make_hu_voice.py`). The accusative is `a_savanyu_uborka`. Fresh cucumber is `uborka_friss`
  → `w_uborka_friss` (*uborka*) / `a_uborka_friss` (*uborkát*).
- **English "meatballs":** the word card says "meatball", but in an order sentence use the plural
  "meatballs" (as the existing example "Meatballs, please." already does).
- Every accusative form was checked: *sajtot* and *spenótot* need the linking vowel *-o-*; *majonézt*
  and *mustárt* take a bare *-t* (*majonézet* would be wrong); *-a/-e* stems lengthen (*sonkát*,
  *csirkét*, *salátát*). In the two-word items only the noun changes (*sült csirkét*, *savanyú uborkát*).
- **Singular is correct in Hungarian** for countable fillings (*olívabogyót, paradicsomot, paprikát,
  húsgombócot*), while English uses plurals (olives, peppers, meatballs). Don't "fix" Hungarian to the
  plural: *olívabogyókat kérek* sounds like specific, countable olives.

---

## 3. Grammar rules

### 3.1 List joining (both lists)
- 1 item: `A`
- 2 items: `A és B`
- 3+ items: `A, B, … és Z`. Comma + space between items. **No comma before *és*.** Hungarian
  orthography puts no comma before *és* when it joins parallel parts of a sentence
  (AkH. 12, comma rules for parallel parts).
- Each wanted item carries its own accusative *-t*: *sonkát, szalámit és paprikát*. Writing
  *sonka, szalámi és paprikát* is ungrammatical.
- Each excluded item stays nominative: *hagyma, mustár és savanyú uborka nélkül*.
- Colloquial *meg* ("sonkát meg sajtot") is natural speech, but there's no clip. Use *és*.

### 3.2 The wanted part: `<W> kérek`
- *kérek* = "I'd like / I ask for". Indefinite conjugation, because the objects are bare (no article).
- **Object before verb** (`Sonkát és sajtot kérek.`). The answer to a wh-question goes in the focus
  slot right before the verb, so this is the textbook reply to *Mit kér bele?* The question's *bele* is
  dropped in the answer, which is normal.
- The other order, `Kérek sonkát és sajtot.`, is also correct but sounds more like an opening
  request than an answer. Don't use it (one pattern is easier to learn).

### 3.3 The excluded part: `<X> nélkül`
- *nélkül* ("without") is a **postposition** and takes the unchanged nominative noun: *hagyma nélkül*,
  *sült csirke nélkül*, *savanyú uborka nélkül*. A typical learner mistake is *hagymát nélkül*. The
  `w_` clips keep this right automatically.
- **One *nélkül* after the joined list** (`hagyma és mustár nélkül`) is the standard written form and
  the most natural spoken one. Repeating it (*hagyma nélkül, mustár nélkül*) is heard in quick
  checklist speech, but it sounds fussy, and it's longer as audio. Don't use it.
- No ambiguity: in `Sonkát kérek, hagyma és mustár nélkül`, the nominative forms can't be objects of
  *kérek* (objects need *-t*), so every item clearly belongs to *nélkül*.

### 3.4 Joining the two parts
- **Supported:** `<W> kérek, <X> nélkül.` e.g. *Sonkát, szalámit és paprikát kérek, savanyú uborka nélkül.*
  (This is the example sentence in the design brief and the audio list.)
- `…kérek, de <X> nélkül.` ("…but without…") is equally natural, maybe slightly more conversational.
  It needs a `c_de` clip, which doesn't exist, so it isn't supported now (see §8 for optional clips).
- **Don't** join with *és* (`…kérek, és hagyma nélkül` sounds wrong).
- **Don't** add a closing *kérem* (`…kérek, hagyma nélkül, kérem.` repeats *kérek… kérem* and sounds clumsy).
- The comma before the *nélkül* part isn't strictly required by spelling rules (a trailing
  adverbial can go without one), but it's **recommended**: it shows the spoken pause, splits two lists
  visually, and is where the line should break on the strip.

### 3.5 Cases to support

| State | Hungarian pattern | Submittable? | Notes |
|---|---|---|---|
| nothing chosen | — (empty) | no | Strip shows an English hint: "Point at the ingredients on the counter." Listen disabled. |
| wanted only | `<W> kérek.` | **yes** | |
| wanted + excluded | `<W> kérek, <X> nélkül.` | **yes** | |
| excluded only | `<X> nélkül, kérem.` | **no** | Shown as a preview so the learner sees and hears the *nélkül* pattern (same shape as the existing *Savanyú uborka nélkül, kérem.*). "Said it" / voice advance stays gated, with the hint: "Choose at least one thing you want (Kérek)." Answering *Mit kér bele?* only with exclusions is incomplete in real life too. A Hungarian server would ask back what to put in. |
| "everything except X" | (*Mindent kérek bele, csak hagymát ne.* / *Mindennel kérem, csak hagyma nélkül.*) | not supported | No clips for *mindent / mindennel / csak / bele / ne*. *Mindent kérek, hagyma nélkül.* is understandable but less idiomatic, and still needs *mindent*. |

In the X-only preview, *kérem* (definite form) works as the polite "please" tag, set off by a comma.
Without the comma, *Hagyma nélkül kérem.* means "I'd like it (the sandwich) without onion", which is
also correct. Keep the comma version to match `p_uborka_nelkul`.

### 3.6 Item order (canonical, not tap order)
Sort **both** lists by the table in §2 (meats → cheese → vegetables → pickled/olives → onion → sauces).
This is how Hungarians list fillings (*Sonkát, sajtot, salátát, paradicsomot és majonézt kérek.*), and
the sentence doesn't depend on the order of taps, so LEAF tests can assert exact strings. A newly marked
item may appear in the middle of the sentence. That's fine and reads naturally. If the team prefers
tap order, the grammar still works; only the sort changes.

### 3.7 One state per ingredient
*Kérek* and *Nélkül* exclude each other for the same ingredient (the chooser sets one or the other;
*Mégse* clears it). As a safeguard, the builder drops an id from the excluded list if it's also wanted.

### 3.8 Capitalisation and punctuation of the displayed sentence
- Upper-case **only the first letter** of the sentence (`charAt(0).toUpperCase()`). With digraphs, only
  the first letter is capitalised: **Sz**alámit, not *SZalámit*. JS `toUpperCase` handles accented
  letters if one ever comes first.
- Everything else stays lower-case (no ingredient is a proper noun). Keep all accents (á é í ó ö ő ú ü ű).
- End with a full stop `.` (not `!`). No space before `,` or `.`.
- Line breaking on the strip: prefer a break **after the comma before the *nélkül* part**
  (`Sonkát, szalámit és paprikát kérek,` / `savanyú uborka nélkül.`). Never break inside *sült csirkét*
  or *savanyú uborkát*. If the Text component honours U+00A0, use a no-break space inside these two
  items in the display string only (the exact-match strings in §7 use normal spaces).
- Exact templates:
  - W only: `Cap(join(acc(W), "és")) + " kérek."`
  - W + X: `Cap(join(acc(W), "és")) + " kérek, " + join(nom(X), "és") + " nélkül."`
  - X only (preview): `Cap(join(nom(X), "és")) + " nélkül, kérem."`

---

## 4. English line (small text under the Hungarian)

Rule: **`<W>, please.`**, **`<W>, without <X>, please.`**, **`Without <X>, please.`**
- Same lists, same canonical order, "and" before the last item, **no Oxford comma**
  (matches the Hungarian and the existing "Ham and cheese, please.").
- One "without" for the whole excluded list, mirroring the single *nélkül*.
- First letter upper-case, ends with ".", item words from the "English in the sentence" column in §2.
- Why "please" and not "I'd like": the project already translates `<X> kérek.` as "X, please."
  (`p_sonka_sajt`, every word-card example) and `<X> nélkül, kérem.` as "Without X, please."
  (`p_uborka_nelkul`). Keeping "please" at the end of every English line keeps all three cases
  consistent and natural. It's a meaning translation, not word for word.
  If a closer gloss is wanted later, `I'd like <W>, without <X>.` is the alternative. Don't mix the two.

---

## 5. Audio key rules (existing clips only)

```
W only : acc(W)[0] + … + "c_es" + acc(W)[last] + "c_kerek"
W + X  : (as above) + nom(X)[0] + … + "c_es" + nom(X)[last] + "c_nelkul"
X only : nom(X)[0] + … + "c_es" + nom(X)[last] + "c_nelkul" + "c_kerem"
```
joined with `+`, where `acc()` = the `a_` clip and `nom()` = the `w_` clip from §2. `c_es` appears only
before the last item of a list with 2+ items. Commas have **no** clip.

**Whole-phrase overrides (recommended).** When the built key is identical to a phrase that was recorded
as one clip, play the single clip instead. It has natural sentence prosody and is half the length:

| Built key | Play instead | Sentence |
|---|---|---|
| `a_sonka+c_es+a_sajt+c_kerek` | `p_sonka_sajt` | Sonkát és sajtot kérek. |
| `w_uborka+c_nelkul+c_kerem` | `p_uborka_nelkul` | Savanyú uborka nélkül, kérem. (X-only preview) |

Expose both `builtAudioKey` (the composed key, deterministic, for tests) and the key actually
played. If the override makes LEAF assertions awkward, drop it. Everything works without it.

---

## 6. Pauses and timing (measured)

All `a_*`, `c_*` and `w_*` clips carry **~0.29 s silence at the start and ~0.30 s at the end**
(measured on every file; 44.1 kHz). The controller plays parts back to back, so **every join already
gives a ~0.6 s gap** (plus a frame of callback latency). As a result:
- Comma positions (between list items, and the main comma before the *nélkül* part) already get a
  long enough pause. **No pause token is needed in the key.**
- The *non*-comma joins (`sonkát | és`, `és | sajtot`, `sajtot | kérek`, `hagyma | nélkül`,
  `nélkül | kérem`) are **too long**. The sentence sounds like a list of separate words and takes about
  twice as long as natural speech (example 3: 8.2 s composed vs ~3–3.5 s spoken).

Where a pause *helps* (if the timing is ever tightened):
- **long (~0.35 s):** at the main comma, after `c_kerek`, before the first `w_` clip of the *nélkül* part;
  and before `c_kerem` in the X-only preview.
- **short (~0.15 s):** between list items separated by a comma (between two `a_` clips or two `w_` clips).
- **none (~0.05 s):** before/after `c_es`, before `c_kerek`, before `c_nelkul`.

Options to tighten (for the owner of audio/controller; not required for the demo):
1. Trim the padding of the `a_*` and `c_*` clips **in place** (same file names; they exist only for
   sentence building) to ~0.05–0.08 s. Keep the `w_*` padding: those clips also play alone on word cards.
2. Or in the controller: for multi-part keys, seek past the lead silence (`AudioComponent.position` is
   writable in `StudioLib.d.ts`; **unverified** whether seeking works in `LowLatency` mode) and start the
   next part early. Then add the long/short pauses above at comma joins. The builder in §9 returns
   `commaAfter` / `mainBreakAfter` indices for this.

Clip lengths to expect: the composed audio ranges from ~2.1 s (one item) to ~13.6 s
(4 wanted + 4 excluded). See the last column of §7.

---

## 7. Worked examples (exact strings; usable as LEAF expectations)

Selections are listed in **tap order** to show that the output is sorted (see #14).

| # | Selection (want / without) | Hungarian (display) | English | Audio key | Submit | Audio |
|---|---|---|---|---|---|---|
| 1 | sonka / – | Sonkát kérek. | Ham, please. | `a_sonka+c_kerek` | yes | 2.2 s |
| 2 | sonka, sajt / – | Sonkát és sajtot kérek. | Ham and cheese, please. | `a_sonka+c_es+a_sajt+c_kerek` | yes | 4.2 s (override `p_sonka_sajt` 2.1 s) |
| 3 | sonka, szalami, paprika / uborka | Sonkát, szalámit és paprikát kérek, savanyú uborka nélkül. | Ham, salami and peppers, without pickles, please. | `a_sonka+a_szalami+c_es+a_paprika+c_kerek+w_uborka+c_nelkul` | yes | 8.2 s |
| 4 | csirke / hagyma | Sült csirkét kérek, hagyma nélkül. | Roast chicken, without onion, please. | `a_sult_csirke+c_kerek+w_hagyma+c_nelkul` | yes | 4.5 s |
| 5 | husgomboc, sajt / hagyma, mustar | Húsgombócot és sajtot kérek, hagyma és mustár nélkül. | Meatballs and cheese, without onion and mustard, please. | `a_husgomboc+c_es+a_sajt+c_kerek+w_hagyma+c_es+w_mustar+c_nelkul` | yes | 8.6 s |
| 6 | salata, paradicsom, uborka_friss / – | Salátát, paradicsomot és uborkát kérek. | Lettuce, tomato and cucumber, please. | `a_salata+a_paradicsom+c_es+a_uborka_friss+c_kerek` | yes | 5.8 s |
| 7 | uborka_friss / uborka | Uborkát kérek, savanyú uborka nélkül. | Cucumber, without pickles, please. | `a_uborka_friss+c_kerek+w_uborka+c_nelkul` | yes | 5.0 s |
| 8 | uborka, olivabogyo / – | Savanyú uborkát és olívabogyót kérek. | Pickles and olives, please. | `a_savanyu_uborka+c_es+a_olivabogyo+c_kerek` | yes | 5.1 s |
| 9 | szalami, spenot / majonez | Szalámit és spenótot kérek, majonéz nélkül. | Salami and spinach, without mayonnaise, please. | `a_szalami+c_es+a_spenot+c_kerek+w_majonez+c_nelkul` | yes | 6.6 s |
| 10 | sonka, sajt, salata, paradicsom, majonez / – | Sonkát, sajtot, salátát, paradicsomot és majonézt kérek. | Ham, cheese, lettuce, tomato and mayonnaise, please. | `a_sonka+a_sajt+a_salata+a_paradicsom+c_es+a_majonez+c_kerek` | yes | 8.0 s |
| 11 | csirke, paprika / hagyma, olivabogyo, uborka | Sült csirkét és paprikát kérek, savanyú uborka, olívabogyó és hagyma nélkül. | Roast chicken and peppers, without pickles, olives and onion, please. | `a_sult_csirke+c_es+a_paprika+c_kerek+w_uborka+w_olivabogyo+c_es+w_hagyma+c_nelkul` | yes | 10.6 s |
| 12 | mustar / – | Mustárt kérek. | Mustard, please. | `a_mustar+c_kerek` | yes | 2.1 s |
| 13 | sajt / sonka | Sajtot kérek, sonka nélkül. | Cheese, without ham, please. | `a_sajt+c_kerek+w_sonka+c_nelkul` | yes | 4.2 s |
| 14 | paprika, sonka / mustar, majonez | Sonkát és paprikát kérek, majonéz és mustár nélkül. | Ham and peppers, without mayonnaise and mustard, please. | `a_sonka+c_es+a_paprika+c_kerek+w_majonez+c_es+w_mustar+c_nelkul` | yes | 8.6 s |
| 15 | sonka, szalami, csirke, husgomboc / spenot, paradicsom, paprika, hagyma | Sonkát, szalámit, sült csirkét és húsgombócot kérek, spenót, paradicsom, paprika és hagyma nélkül. | Ham, salami, roast chicken and meatballs, without spinach, tomato, peppers and onion, please. | `a_sonka+a_szalami+a_sult_csirke+c_es+a_husgomboc+c_kerek+w_spenot+w_paradicsom+w_paprika+c_es+w_hagyma+c_nelkul` | yes | 13.6 s |
| 16 | hagyma / – | Hagymát kérek. | Onion, please. | `a_hagyma+c_kerek` | yes | 2.2 s |
| 17 | – / hagyma | Hagyma nélkül, kérem. | Without onion, please. | `w_hagyma+c_nelkul+c_kerem` | **no** (preview) | 3.1 s |
| 18 | – / uborka | Savanyú uborka nélkül, kérem. | Without pickles, please. | `w_uborka+c_nelkul+c_kerem` | **no** (preview) | 3.7 s (override `p_uborka_nelkul` 2.6 s) |
| 19 | – / hagyma, mustar | Hagyma és mustár nélkül, kérem. | Without onion and mustard, please. | `w_hagyma+c_es+w_mustar+c_nelkul+c_kerem` | **no** (preview) | 5.1 s |
| 20 | – / – | *(empty; hint "Point at the ingredients on the counter.")* | – | *(none; Listen disabled)* | **no** | – |

Recommended LEAF golden case (the design-brief sentence): #3.
`orderWanted = [sonka, szalami, paprika]`, `orderWithout = [uborka]` →
`builtSentenceHu = "Sonkát, szalámit és paprikát kérek, savanyú uborka nélkül."`,
`builtAudioKey = "a_sonka+a_szalami+c_es+a_paprika+c_kerek+w_uborka+c_nelkul"`.
Compare strings in NFC (the TS sources use precomposed UTF-8 accents).

---

## 8. Flags: what a native speaker might notice

1. **Concatenated "citation" clips sound robotic.** Each `a_`/`c_` clip was spoken alone, so each word
   has full stress and a falling, sentence-final tone. In natural speech *kérek*, *és*, *nélkül* and
   *kérem* are unstressed and low after the stressed item, and list items before the last stay level.
   It's understandable, but clearly stitched together. The whole-phrase overrides (§5) avoid this for the
   two recorded sentences. If the learner re-records: say `c_kerek`, `c_nelkul`, `c_kerem` low and
   unstressed as if after a word, `c_es` short and light, and the `a_*` items with a level
   (non-final) tone.
2. **0.6 s gaps at every join** (measured, §6) make it sound like a word list and double the length.
   Biggest audible issue; fixed by trimming `a_*`/`c_*` padding.
3. **Long lists.** With 5+ wanted items in front of *kérek*, the verb arrives very late. It's
   grammatical, but a native would rather restructure (*Kérek bele sonkát, szalámit, …*). The audio
   also gets long (up to ~13–20 s with many items). Optional UX cap: about 6 wanted + 4 excluded.
   That's a product decision, not grammar.
4. **Cucumber vs pickles in one sentence.** *Uborkát kérek, savanyú uborka nélkül.* is natural.
   The reverse, *Savanyú uborkát kérek, uborka nélkül.*, is slightly confusing. A native would say
   *friss uborka nélkül*, but there's no *friss* clip. Acceptable for the demo.
5. **olívabogyó vs olajbogyó.** *Olajbogyó* is the traditional dictionary word. *Olívabogyó* is very
   common on menus and in speech. Both are fine; keep *olívabogyó* (matches the clips).
6. **spenót on a sandwich.** Plain *spenót* makes some Hungarians think of cooked spinach
   (*spenótfőzelék*). Menus say *bébispenót* for fresh leaves. Understood in context; acceptable.
7. **Excluding something you didn't ask for** (*Sajtot kérek, sonka nélkül.*) is a little redundant,
   but people say *hagyma nélkül* pre-emptively all the time. Fine.
8. **No *de*.** `…kérek, de hagyma nélkül.` is perhaps the most conversational version, but the version
   without *de* is not unnatural. A `c_de` clip would allow it later.
9. **Chooser labels.** *Kérek* ("I'd like") ✓, *Nélkül* ("without") ✓, *Mégse* ✓ (the standard Hungarian
   "Cancel / never mind"). **Use "Clear" (or "Undo") as the English sub-label for *Mégse*, not "Remove":**
   "remove" can be read as "take it off the sandwich", which is what *Nélkül* means. Show the state as
   text as well as colour: a small "kérek ✓" / "nélkül" tag next to the marker.
10. **X-only as an answer** to *Mit kér bele?* is pragmatically incomplete, so it's gated (matches the
    design's "at least one wanted").

Optional future clips (only if the team wants more natural variants; none are needed now):
`c_de` "de" (…kérek, de … nélkül), `c_bele` "bele" + `c_csak` "csak" + `c_mindent` "mindent"
(Mindent kérek bele, csak … nélkül), `w_friss` "friss" (friss uborka).

---

## 9. Reference implementation (pure TS, no scene access; for whoever writes the order strip)

```ts
// Order sentence builder — Hungarian / English / audio key from wanted + excluded ingredient ids.
export interface OrderIngredient { id: string; nom: string; acc: string; wClip: string; aClip: string; en: string }

// Canonical sandwich order (meats → cheese → veg → pickled/olives → onion → sauces).
export const ORDER_INGREDIENTS: OrderIngredient[] = [
  {id: "sonka",        nom: "sonka",          acc: "sonkát",          wClip: "w_sonka",        aClip: "a_sonka",          en: "ham"},
  {id: "szalami",      nom: "szalámi",        acc: "szalámit",        wClip: "w_szalami",      aClip: "a_szalami",        en: "salami"},
  {id: "csirke",       nom: "sült csirke",    acc: "sült csirkét",    wClip: "w_sult_csirke",  aClip: "a_sult_csirke",    en: "roast chicken"},
  {id: "husgomboc",    nom: "húsgombóc",      acc: "húsgombócot",     wClip: "w_husgomboc",    aClip: "a_husgomboc",      en: "meatballs"},
  {id: "sajt",         nom: "sajt",           acc: "sajtot",          wClip: "w_sajt",         aClip: "a_sajt",           en: "cheese"},
  {id: "salata",       nom: "saláta",         acc: "salátát",         wClip: "w_salata",       aClip: "a_salata",         en: "lettuce"},
  {id: "spenot",       nom: "spenót",         acc: "spenótot",        wClip: "w_spenot",       aClip: "a_spenot",         en: "spinach"},
  {id: "paradicsom",   nom: "paradicsom",     acc: "paradicsomot",    wClip: "w_paradicsom",   aClip: "a_paradicsom",     en: "tomato"},
  {id: "paprika",      nom: "paprika",        acc: "paprikát",        wClip: "w_paprika",      aClip: "a_paprika",        en: "peppers"},
  {id: "uborka_friss", nom: "uborka",         acc: "uborkát",         wClip: "w_uborka_friss", aClip: "a_uborka_friss",   en: "cucumber"},
  {id: "uborka",       nom: "savanyú uborka", acc: "savanyú uborkát", wClip: "w_uborka",       aClip: "a_savanyu_uborka", en: "pickles"},
  {id: "olivabogyo",   nom: "olívabogyó",     acc: "olívabogyót",     wClip: "w_olivabogyo",   aClip: "a_olivabogyo",     en: "olives"},
  {id: "hagyma",       nom: "hagyma",         acc: "hagymát",         wClip: "w_hagyma",       aClip: "a_hagyma",         en: "onion"},
  {id: "majonez",      nom: "majonéz",        acc: "majonézt",        wClip: "w_majonez",      aClip: "a_majonez",        en: "mayonnaise"},
  {id: "mustar",       nom: "mustár",         acc: "mustárt",         wClip: "w_mustar",       aClip: "a_mustar",         en: "mustard"},
]

/** Recorded whole phrases that equal a built key (natural prosody, shorter). */
const WHOLE_PHRASE: {[key: string]: string} = {
  "a_sonka+c_es+a_sajt+c_kerek": "p_sonka_sajt",
  "w_uborka+c_nelkul+c_kerem": "p_uborka_nelkul",
}

export interface BuiltOrder {
  hu: string            // display sentence ("" when nothing chosen)
  en: string            // English line
  audioKey: string      // composed key, deterministic (for tests); "" when nothing chosen
  playKey: string       // key to actually play (whole-phrase override applied)
  canSubmit: boolean    // at least one wanted ingredient
  parts: string[]       // audioKey split
  commaAfter: number[]  // part indices followed by a list comma (short pause)
  mainBreakAfter: number // part index followed by the main comma (long pause), -1 if none
}

function joinWords(items: string[], and: string): string {
  if (items.length <= 1) return items.join("")
  return items.slice(0, -1).join(", ") + " " + and + " " + items[items.length - 1]
}
function cap(s: string): string { return s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s }

/** Appends clips with "c_es" before the last; records comma positions. */
function pushList(parts: string[], clips: string[], commaAfter: number[]): void {
  for (let i = 0; i < clips.length; i++) {
    if (i > 0 && i === clips.length - 1) parts.push("c_es")
    parts.push(clips[i])
    if (i < clips.length - 2) commaAfter.push(parts.length - 1)
  }
}

export function buildOrder(wantedIds: string[], withoutIds: string[]): BuiltOrder {
  const want = ORDER_INGREDIENTS.filter((g) => wantedIds.indexOf(g.id) >= 0)
  const wout = ORDER_INGREDIENTS.filter((g) => withoutIds.indexOf(g.id) >= 0 && wantedIds.indexOf(g.id) < 0)
  const parts: string[] = []
  const commaAfter: number[] = []
  let mainBreakAfter = -1
  let hu = ""
  let en = ""
  if (want.length > 0) {
    hu = cap(joinWords(want.map((g) => g.acc), "és")) + " kérek"
    en = joinWords(want.map((g) => g.en), "and")
    pushList(parts, want.map((g) => g.aClip), commaAfter)
    parts.push("c_kerek")
    if (wout.length > 0) {
      mainBreakAfter = parts.length - 1
      hu += ", " + joinWords(wout.map((g) => g.nom), "és") + " nélkül"
      en += ", without " + joinWords(wout.map((g) => g.en), "and")
      pushList(parts, wout.map((g) => g.wClip), commaAfter)
      parts.push("c_nelkul")
    }
    hu += "."
    en = cap(en) + ", please."
  } else if (wout.length > 0) {
    hu = cap(joinWords(wout.map((g) => g.nom), "és")) + " nélkül, kérem."
    en = "Without " + joinWords(wout.map((g) => g.en), "and") + ", please."
    pushList(parts, wout.map((g) => g.wClip), commaAfter)
    parts.push("c_nelkul")
    mainBreakAfter = parts.length - 1
    parts.push("c_kerem")
  }
  const audioKey = parts.join("+")
  return {
    hu, en, audioKey,
    playKey: WHOLE_PHRASE[audioKey] || audioKey,
    canSubmit: want.length > 0,
    parts, commaAfter, mainBreakAfter,
  }
}
```

I checked this algorithm against all 20 rows in §7 with a Python port of the same rules: the
Hungarian, English and key columns are its output. The durations come from the real clip files.
