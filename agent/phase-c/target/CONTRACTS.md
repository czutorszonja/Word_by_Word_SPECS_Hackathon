# Phase C contracts (Word by Word)

Written 2026-11-19 ~04:40 from `agent/phase-c/DECISIONS.md` (wins), `INTEGRATION_PLAN.md` §3–§8, `CRITIC.md`, the
reviewed drafts and the project files as they are on disk now. No Lens Studio tool was used and nothing outside
`agent/phase-c/` was written.

**This file is the one cross-module contract.** Every author of a Phase C target file codes against the names,
signatures and behaviour written here, so that files written in parallel compile and work together.
Order of authority: `DECISIONS.md` > this file > `INTEGRATION_PLAN.md` > research notes. Where this file differs from
the plan, the difference is listed in §1 with the reason.

Sections: 0 Rules for every author · 1 Decisions taken in this contract · 2 File map and base snapshot ·
3 Shared values, wording and SceneObject names · 4 Module contracts (4.1–4.21) · 5 Use it live: state machine ·
6 Learn and pointing: rules · 7 Arrival: phases · 8 LEAF: helper API and exact assertions · 9 Notes for the integrator.

---

## 0. Rules for every author

1. Write only inside `agent/phase-c/`. A target is the **complete final file** at
   `agent/phase-c/target/<project path>` (for example `agent/phase-c/target/Assets/Scripts/WbwOrderController.ts`).
   No `.meta` files, no diffs.
2. For an **existing** project file: read the file on disk right before you write, start from that content, keep
   everything this contract does not change (soft tones, mode chips, `hudClearDeg`, `maxTrayDistanceCm` / `nearTray`
   placement, hints, sliders), and append `<relative path>  <sha256>` to `agent/phase-c/target/BASES.txt`
   (`sha256sum "<file>"`). §2 lists the hashes this contract was written against; if yours differs, the other agent
   changed the file: merge on top of the new content. The API in this contract still holds.
3. Do not target `WbwSharedUI.ts`, `WbwCafeBuilder.ts`, `WbwGeo.ts` or anything outside the file map in §2. Use
   their exports as they are today (§3.5 lists the SharedUI helpers).
4. Use only APIs that exist: `Support/StudioLib.d.ts`, `Cache/TypeScript/Src/Packages/*` and the project scripts.
   Do not invent SharedUI helpers.
5. **Colours:** no hex literal in new code, in comments that look like code, or in a new or reworded `@ui.label`.
   UI colours come from `WbwSharedUI` (`TONE_LEARN`, `TONE_LIVE`, `TONE_PRACTICE`, `toneOf()`, `useTone()`,
   `toward()`, `shade()`, `CYAN`, `GREEN`, `GREEN_FILL`, `AMBER`, `TEXT_LIGHT`, `TEXT_SOFT`, `MUTED`).
   A `@ui.label` line you do not need to change stays byte-identical. A label you create or reword is plain text:
   `@ui.label("WbwSpeakPromptUI – say-it strip (mic indicator + Said it)")`.
6. **Architecture:** only `Wbw*UI.ts` files import `WbwSharedUI` or create `Component.Text` / images / panels.
   Controllers (`WbwLearnController`, `WbwOrderController`, `WbwMain`), `WbwPointing`, `WbwVoiceActivity`,
   `WbwPhraseHelperModel`, `WbwSession`, `WbwSpatial` never do. Views never place themselves, never play audio and
   never change session or order state: they emit events.
7. **Header comment** of every file, in the style of the existing scripts:
   `// WbwX.ts — one line.` / `// Owns: …` / `// Expects: …` (controllers) / `// Must NOT: …` /
   `// Stable names: …` (views). Update the header of an existing file when its behaviour changes.
8. Events use the SIK pattern already in the project:
   `private _onX = new Event<T>()` + `get onX(): PublicApi<T> { return this._onX.publicApi() }`
   (`import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"`).
9. Optional references are declared `@input @allowUndefined name: Type | undefined` and every use is guarded
   (`if (this.x)` / `this.x?.m()`): a missing view must never throw.
10. A `panel()` root is never a tapped name (its BackPlate carries a passive Interactable). Tapped names are UIKit
    Buttons made with `button()` (or a `Button` component, as `PhraseCard_<id>` does).
11. Never parent UI under a `Learnable_<id>` (SIK bubbles events to ancestor Interactables).
12. Audio: every sound goes through `WbwAudioController`. Hover, labels, the pointer dot, the phrase helper being
    shown, the speak prompt and Said it play **nothing**. No `playSfx` and no `playVoice` while a speak turn is
    armed, except the learner's own Listen / phrase change (which re-arms, §5.4).
13. Reserved SceneObject names that tests search globally. New views must not create objects with these names:
    `Message`, `ModeLabel`, `SavedBadge`, `ActiveLabel`, `SavedCount`, `CaptionHu`, `CaptionEn`, `Bravo`, `Number`,
    `Line`, `Brackets`, `Hint`, `HintText`, `Title` (use `SuggestTitle`, `PhraseHelperTitle`), and every name in §3.4
    that belongs to another module.
14. Keep every existing SceneObject name and readable state field unless this contract says it changes.

---

## 1. Decisions taken in this contract

These settle points the plan left open or that the router decisions changed. They are binding for all targets.

| # | Decision | Reason |
|---|---|---|
| K1 | **Prep state is the default flow.** Entering Use it live with `orderStep` 0 or ≥ 7 calls `order.enterPrep()`: `orderStep = 0`, `orderStepName = "prep"`, `waitingFor = "ready"`, helper shown with `ReadyToOrderButton`, server silent. `ReadyToOrderButton` → `order.readyToOrder()` → `startOrder()` → step 1. Re-selecting Use it live in the menu while it is active also calls `enterPrep()` (was `startOrder()`). Mid-order re-entry (steps 1–6) still resumes with `runStep(orderStep)`. | DECISIONS Q2 / F8 |
| K2 | **Helper visibility:** prep (editable), step 2 (visible from the start of the step, editable once "Mit kér bele?" has ended). Hidden in steps 1, 3, 4, 5, 6 and after the order. Step 1 keeps its two cards; nothing is stacked. | DECISIONS Q2 |
| K3 | **`phraseEditable`** = `active && phraseHelperVisible && (waitingFor === "ready" \|\| (waitingFor === "user" && stepDef.helper))`. Live label buttons exist only while it is true. | follows K1/K2 |
| K4 | **Seeding (`seedPhrase`)** happens only when the phrase is empty: the card's word if it is one of the 15 ingredients, else `session.liveWord` if it is one, else nothing. Never from `session.saved`. A built phrase survives leaving and re-entering Use it live and survives a finished order. | DECISIONS Q12, plan D22 |
| K5 | **Step 2 turn:** when "Mit kér bele?" ends and the phrase has a word, the speak turn opens at once (prompt + `SaidItButton`) and the detector is armed without playback. With an empty phrase no turn opens (nothing to say); it opens when the first word is chosen. "Said it is always visible" means: in every mic state while a turn is open. | DECISIONS Q13 |
| K6 | **One bracket (F1) is done by `WbwLearnController`**, the only writer of `Brackets.enabled`: a learnable's `Brackets` are enabled only if the id is in the current set (Learn: `bracketedIds`; otherwise `highlightIds`) **and** `id !== labelForId`. `WbwNameLabelUI` never touches `Brackets`; it draws `NameLabelBracket`. The task brief words this as "the label hides the object's Brackets"; the controller does it because `scan()` rewrites `enabled` five times a second. `bracketedIds` keeps its meaning (the 3–4 chosen ids, the labelled one included). | DECISIONS F1 |
| K7 | **Pointer dot:** `WbwHoverArbiter` decides and locates it (`pointerDotVisible`, `pointerDotPos`; editor only, never for hand input), `WbwNameLabelUI.setPointerDot(pos, mode)` draws the `PointerDot` object, `WbwLearnController` forwards it every LateUpdate and exposes `pointerDotVisible` (the drawn state) for LEAF. No `PointerRay` object exists. `pointerRayVisible` stays as a measured value; tests assert it only when `global.deviceInfoSystem.isEditor()`. | DECISIONS Q5 / F2 / F15 |
| K8 | **No chip on the hover label.** `NameLabelChip` and the `showModeChip` input are removed from the label draft. | DECISIONS Q8 |
| K9 | **Helper text layout (F5) and emphasis (F6):** left-aligned, two fixed lines, three Text runs: line 1 = `PhraseHelperHead` ("Kérek", pattern want only) + `PhraseHelperSlot` (the ingredient list, in `toneOf("live").tint`, heavier weight) at a fixed x; line 2 = `PhraseHelperTail` ("a szendvicsembe." or "nélkül, kérem."). Head and tail never move. The slot has a fixed box: one line with `HorizontalOverflow.Shrink` (the view may reserve a second line for 3–4 items, as long as the panel size, the head and the tail stay fixed). **No rich text by default** (it cannot be verified without Lens Studio); an optional `@input slotRichText = false` may switch the slot run to `enableRichText` + `toRichText()` later. Tests read `order.phraseHu` / `helper.plainHu`, never the Text objects. No `hexOf()` in `WbwSharedUI`. | DECISIONS F5, F6 |
| K10 | **`WbwPhraseHelperUI.show(b, canListen, ready)` / `setPhrase(b, canListen)`:** the controller passes `canListen(b, (k) => audio.has(k))`, because a view has no audio access. There is no `setPattern()` on the view: `b.pattern` carries it. | plan §3.4 gap |
| K11 | **"Heard you ✓" survives the step change:** `closeSpeakTurn()` hides the prompt only if a turn is open. `onSaid()` clears the turn first and calls `speakPrompt.showHeard()`; the later `next()` / `runStep()` calls do not hide it. `setActive(false)`, `finish()` and `enterPrep()` hide the prompt unconditionally. | plan §4.9 would hide the done state at once |
| K12 | **`voiceDetection`** is an `@input` on `WbwOrderController` (default true). `WbwVoiceActivity` gained `setVoiceDetection(on)`; `WbwMain.start()` and `order.setActive(true)` call it. The speak prompt gets state `"off"` when it is false. | DECISIONS Q13 |
| K13 | **`lazyFollowStep`** carries its one bit of state through the caller: it takes `following` and returns the new value (§4.12). | plan §4.5 was stateless and would stop at the edge of the comfort zone |
| K14 | **Suggestion descriptions are owned by `WbwSuggestionUI`** (it knows `savedCount`). `WbwMain` does not call `setDescription()` on hover; it only reads `hoveredOption` to freeze the lazy follow. | one owner instead of two |
| K15 | **Compact HUD:** `HudModeChip` sits **above** `MenuButton` (column), not beside it. A row would be 15.4 cm wide at 60 cm and leave the ±16° view at the current chip offset. The chip's bottom edge and left edge stay where they are today. | plan §4.11 geometry |
| K16 | **Phrase cards:** the card's `onTriggerUp` first invokes `onPick`, then re-applies the toggle state of every card from `chosenId`, so the controller's synchronous `setChosen()` always wins. | plan §4.8 scheduled the old state first |
| K17 | **Glyph labels are constants** (`SAVED_LABEL = "Saved ✓"`, `USE_LIVE_LABEL = "Use it live →"`, `HEARD_DONE = "Heard you ✓"`) at the top of their view, so the integrator can drop a glyph after the capture check (Q4). Tests match the prefix (`indexOf("Saved") === 0`). | DECISIONS Q4 |
| K18 | **`init()` of the order controller mirrors the model at once**, so `phraseHu` is `"Kérek … a szendvicsembe."` from start-up and never `""`. | tests read it before Use it live was opened |
| K19 | **DC3** does the "reuse the same phrase" block in prep (the default flow) and one pattern switch at step 2 (edit with an open turn). **DC1** asserts the prep state, then `startOrdering()`. | follows K1 |
| K20 | **Not in these targets:** the walk-in start (C7: `arrivalWalkIn`, `EntranceSpot`, `startSpotLocal`) lives in `WbwCafeBuilder` and the scene. Nothing here depends on it; the tour reads `cafe.startSpotLocal` through `any`. `WbwTempProbe.ts` is left alone (it reads everything through `any`, so it still compiles); the integrator deletes it. | task constraint |
| K21 | **`WbwPracticeController.place()`** nudge clamp becomes `[-20, 25]` and DC5 takes its seat from `Table_8` at runtime. | DECISIONS Q11 |
| K22 | **Wording:** the plan's strings plus "Ready to order" (§3.3). `AddWordButton` reads "Add (+ és)". | DECISIONS Q9 |

---

## 2. File map and base snapshot

`new` = the file does not exist in the project. Hashes are sha256 of the project file at 04:33 on 2026-11-19.

| Target (under `agent/phase-c/target/`) | Kind | Base sha256 (first 12) | Imports from other Phase C modules |
|---|---|---|---|
| `Assets/Scripts/WbwPhraseHelperModel.ts` | new, **written** (draft verbatim) | draft `d2bcef3b65a9` | none |
| `Assets/Scripts/WbwVoiceActivity.ts` | new, **written** (draft + label + `setVoiceDetection`) | draft `c90727da2e9b` → target `270fbc415f46` | none |
| `Assets/Scripts/WbwPointing.ts` | new (from `drafts/WbwPointing.ts`) | — | none |
| `Assets/Scripts/WbwNameLabelUI.ts` | new (from `drafts/WbwNameLabelUI.ts`) | — | none |
| `Assets/Scripts/WbwPhraseHelperUI.ts` | new | — | `WbwPhraseHelperModel` (types) |
| `Assets/Scripts/WbwSpeakPromptUI.ts` | new | — | none |
| `Assets/Scripts/WbwSuggestionUI.ts` | new | — | none |
| `Assets/Scripts/WbwWordCardUI.ts` | existing, rewrite | `bc6f7bb9c499` | none |
| `Assets/Scripts/WbwHudUI.ts` | existing | `708e1b09112b` | none |
| `Assets/Scripts/WbwPhraseChoicesUI.ts` | existing | `ccf56d1c83d9` | none |
| `Assets/Scripts/WbwLearnController.ts` | existing | `1ac0836d3e64` | `WbwNameLabelUI`, `WbwPointing`, `WbwPhraseHelperModel`, `WbwWordCardUI` |
| `Assets/Scripts/WbwOrderController.ts` | existing | `fd563646b0f4` | `WbwPhraseHelperUI`, `WbwSpeakPromptUI`, `WbwVoiceActivity`, `WbwPhraseHelperModel`, `WbwLearnController`, `WbwPhraseChoicesUI`, `WbwVocab`, `WbwSession`, `WbwAudioController` |
| `Assets/Scripts/WbwMain.ts` | existing | `fd6e103a0dcc` | all views, `WbwVoiceActivity`, `WbwSpatial.lazyFollowStep`, `WbwSession` |
| `Assets/Scripts/WbwSession.ts` | existing | `95ea8779fb55` | none |
| `Assets/Scripts/WbwAudioController.ts` | existing | `19b36e36a769` | `WbwAudioBank` |
| `Assets/Scripts/WbwAudioBank.ts` | existing | `77a31fe39f17` | none |
| `Assets/Scripts/WbwVocab.ts` | existing | `c9fb20e56157` | none |
| `Assets/Scripts/WbwSpatial.ts` | existing | `61bbb56091e4` | none |
| `Assets/Scripts/WbwPracticeController.ts` | existing, one line | `2853c825c3eb` | none |
| `Assets/Tests/Leaf/WbwLeafHelpers.ts` | existing | `b64a2baa050e` | game scripts |
| `Assets/Tests/Leaf/DC1_ModeMenu.ts` | existing | `d0e38503589b` | helpers |
| `Assets/Tests/Leaf/DC2_Learn.ts` | existing | `7649e82c5e92` | helpers, `WbwVocab.wordById` |
| `Assets/Tests/Leaf/DC3_OrderingAtCounter.ts` | existing | `fe4737da2399` | helpers |
| `Assets/Tests/Leaf/DC4_TableNumber.ts` | existing | `1c870c9661f2` | helpers, DC3 |
| `Assets/Tests/Leaf/DC5_Practice.ts` | existing | `3192c2db97e3` | helpers |
| `Assets/Tests/Leaf/StoryTour.ts` | new (from `drafts/StoryTour.ts`) | — | helpers, `WbwVocab.wordById` |
| `Assets/Tests/Leaf/LeafIndex.ts` | existing | `15552a20fe0c` | `StoryTour` |

Read-only, not targeted (hash for drift checks): `WbwSharedUI.ts` `f163dc84bc23`, `WbwCafeBuilder.ts` `462fbe51054b`.

Import graph (no cycles): model, pointing, voice, session, spatial, vocab, bank ← views ← controllers ← `WbwMain` ←
LEAF. `WbwLearnController` never imports `WbwOrderController`; the order controller imports the learn controller
(as today).

---

## 3. Shared values, wording and SceneObject names

### 3.1 String unions (plain `string` fields unless a type is named)

| Value set | Members | Used by |
|---|---|---|
| `Mode` (`WbwSession`) | `"none" \| "learn" \| "practice" \| "live"` | session, main |
| Point mode | `"off" \| "learn" \| "live"` | `learn.pointMode`, `learn.setPointMode()` |
| Label mode | `"learn" \| "live"`, `""` when hidden | `learn.labelMode`, `nameLabel.labelMode` |
| `PhrasePattern` (`WbwPhraseHelperModel`) | `"want" \| "without"` | model, helper view, order |
| `order.waitingFor` | `""` (never started) · `"ready"` (prep) · `"server"` · `"user"` · `"table"` · `"done"` | order, LEAF |
| `order.orderStepName` | `""` · `"prep"` · `"greet"` · `"fillings"` · `"drink"` · `"here_or_takeaway"` · `"table"` · `"enjoy"` · `"done"` | order, LEAF |
| `order.speechSource` | `""` · `"mic"` · `"button"` | order, LEAF |
| `main.arrivalPhase` | `"setup"` → `"walkIn"` → `"toast"` → `"suggest"` → `"done"` | main, LEAF |
| `main.toastTrigger` | `""` · `"walk"` · `"timeout"` · `"skip"` | main |
| Suggestion option | `"learn" \| "practice" \| "live" \| "later"`, `""` = none | suggestion view, main |
| Speak prompt state (= `vad.vadState` or `"off"`) | `"off"` · `"guard"` · `"calibrating"` · `"listening"` · `"candidate"` · `"speech"` · `"done"` · `"nosignal"` | order → speak prompt |
| `order.answers` ids | `jonapot`, `szendvicset`, `fillings`, `tejes_kave`, `itt_eszem`, `elvitelre`, `negyes_asztal`, `nyolcas_asztal`, `tizenkettes_asztal`, `koszonom` | order, LEAF |

### 3.2 Numbers every module agrees on

| Name | Value | Owner |
|---|---|---|
| `MAX_SLOTS` | 4 | model |
| Label first show / switch dwell / hand dwell / exit grace / reacquire | 0 / 0.12 / 0.15 / 0.5 / 0.35 s | arbiter options |
| Live pinch pin | 2 s (`hover.pin(id, 2)`) | learn |
| Toast trigger | 80 cm walked or 1.5 s | main inputs |
| Suggestion delay after the toast | `toastSeconds + 0.35 + 0.3` s | main |
| "Heard you ✓" hold | 0.6 s | speak prompt |
| Detector tail guard | 0.35 s | voice |
| `durationOf` fallback per missing part | 1.2 s | audio |

### 3.3 Wording (exact strings)

| Where | String |
|---|---|
| Word card status while the clip plays / after | `"Playing pronunciation"` / `"Ready to listen again"` |
| `WordCardPlayButton` label | `"Listen again"` |
| `WordCardSaveButton` label | `"Save"` → `SAVED_LABEL` = `"Saved ✓"` (fallback `"Saved"`) |
| `WordCardUseLiveButton` label | `USE_LIVE_LABEL` = `"Use it live →"` (fallback `"Use it live"`) |
| Label buttons | `"Use this word"`, `"Add (+ és)"`; status `"In your phrase"` |
| Helper title | `"SAY IT AT THE COUNTER"` |
| Helper hint (empty phrase only) | `"Point at an ingredient, then choose Use this word"` |
| `PhraseHelperListenButton` | `"Listen"` |
| `PatternWantButton` / `PatternWithoutButton` | `"Kérek …"` / `"… nélkül"` |
| `ReadyToOrderButton` | `"Ready to order"` |
| Phrase card prompt | `"Choose your answer, then say it"` |
| Speak prompt: guard, calibrating, listening, candidate | `"Say it out loud"` |
| Speak prompt: speech | `"Heard you…"` |
| Speak prompt: done | `HEARD_DONE` = `"Heard you ✓"` (fallback `"Heard you"`) |
| Speak prompt: nosignal | `"Mic off · tap Said it"` |
| Speak prompt: nudge (any state but speech / done) | `"Say it out loud, or tap Said it"` |
| Speak prompt: off | `"Say it out loud, then tap Said it"` |
| `SaidItButton` | `"Said it"` |
| Suggestion title | `"What would you like to do here?"` |
| Suggestion tiles (scoped `Label`) | `"Learn"`, `"Practice"`, `"Use it live"` |
| `SuggestLaterButton` | `"Later"` |
| Suggestion description: nothing hovered | `"Suggested here: start with Learn"` |
| … Learn / Practice (≥ 4 saved) / Practice (< 4 saved) / Use it live / Later | `"Point at food to see its Hungarian name"` / `"Match the words you saved"` / `"Save 4 words first, then match them"` / `"Order at the counter in Hungarian"` / `"Close; the Menu has every mode"` |
| Mode chips (`ChipLabel`, from `Tone.label`) | `"Learn"`, `"Use it live"`, `"Practice"` |
| Toast | `"Café detected (demo)"` (unchanged) |

### 3.4 SceneObject name registry (new and changed)

**B** = UIKit Button, tappable by LEAF. P = `panel()` root (never tapped). T = Text. Names not listed are unchanged.

| Name | Kind | Created by | Notes |
|---|---|---|---|
| `NameLabelRoot`, `PhraseHelperRoot`, `SpeakPromptRoot`, `SuggestionRoot` | host | scene or `WbwMain.ensureViews()` | children of `WordByWord/UI` |
| `PointingUI` | group | `WbwNameLabelUI` | world origin, identity, scale 1 |
| `NameLabelAnchor` | Canvas host | `WbwNameLabelUI` | enabled = label visible |
| `NameLabel` | **B** | `WbwNameLabelUI` | the whole label; Learn: select opens the card |
| `NameLabelHu`, `NameLabelEn` | T | `WbwNameLabelUI` | word large, meaning small |
| `NameLabelStatus` (`StatusIcon`, `StatusText`) | row | `WbwNameLabelUI` | "In your phrase" + check |
| `UseThisWordButton`, `AddWordButton` | **B** | `WbwNameLabelUI` | live only, while `phraseEditable` |
| `NameLabelLink` | box | `WbwNameLabelUI` | connector, no collider |
| `NameLabelBracket` (`H_*`, `V_*`) | group | `WbwNameLabelUI` | the one hover bracket |
| `PointerDot` (`PointerDotCentre`) | group | `WbwNameLabelUI` | Preview / LEAF hit point, no collider |
| ~~`NameLabelChip`~~ | — | — | removed (K8) |
| `Brackets` | group | `WbwLearnController` | unchanged name; child of `Learnable_<id>`; hidden for `labelForId` (K6) |
| `WordCard` | P | `WbwWordCardUI` | unchanged |
| `ChipRow` / `ModeChip` / `ChipLabel`, `Top`, `Words`, `WordCardHu`, `WordCardEn` | | `WbwWordCardUI` | unchanged |
| `WordCardStatusRow`, `WordCardStatusIcon`, `WordCardStatus` | row, image, T | `WbwWordCardUI` | new status line |
| `WordCardPlayButton`, `WordCardSaveButton`, `WordCardCloseButton` | **B** | `WbwWordCardUI` | unchanged names |
| `WordCardUseLiveButton` | **B** | `WbwWordCardUI` | new |
| ~~`Illustration`, `Example`, `ExampleHu`, `ExampleEn`, `WordCardPlaySentenceButton`~~ | — | — | removed |
| `PhraseHelper` | P | `WbwPhraseHelperUI` | same object across edits |
| `Head` / `ModeChip` / `ChipLabel`, `PhraseHelperTitle` | row, T | `WbwPhraseHelperUI` | chip text "Use it live" |
| `PhraseHelperHu` | container | `WbwPhraseHelperUI` | holds the three runs below |
| `PhraseHelperHead`, `PhraseHelperSlot`, `PhraseHelperTail` | T | `WbwPhraseHelperUI` | K9 |
| `PhraseHelperEn` | T | `WbwPhraseHelperUI` | full English line |
| `PhraseHelperHint` | T | `WbwPhraseHelperUI` | enabled only while the phrase is empty |
| `PhraseHelperListenButton`, `PatternWantButton`, `PatternWithoutButton` | **B** | `WbwPhraseHelperUI` | inactive (Interactable off) when not usable |
| `ReadyToOrderButton` | **B** | `WbwPhraseHelperUI` | prep only |
| `SpeakPrompt` | P | `WbwSpeakPromptUI` | built once, enabled / disabled |
| `ModeChip`, `MicIndicator`, `SpeakPromptText` | chip, dot, T | `WbwSpeakPromptUI` | |
| `SaidItButton` | **B** | `WbwSpeakPromptUI` | the only one in the scene |
| `SuggestionPanel` | P | `WbwSuggestionUI` | |
| `SuggestTitle`, `SuggestDescription` | T | `WbwSuggestionUI` | |
| `SuggestLearnButton`, `SuggestPracticeButton`, `SuggestLiveButton`, `SuggestLaterButton` | **B** | `WbwSuggestionUI` | each has a scoped `Label` |
| `Hud`, `MenuButton` (**B**), `SavedBadge`, `ModeLabel` | | `WbwHudUI` | unchanged |
| `HudModeChip` (`ChipLabel`) | chip | `WbwHudUI` | compact HUD only |
| `PhraseChoices`, `Head`, `ModeChip`, `Prompt`, `Cards`, `PhraseCard_<id>` (**B**), `Face`, `Picture`, `Words`, `Hu`, `En` | | `WbwPhraseChoicesUI` | unchanged |
| ~~`PhraseCard_sonka_sajt`, `_kerhetek_oliva`, `_uborka_nelkul`, `_szalami_sajt`, `_csirke_paprika`, `_done`~~ | — | — | never created again |

### 3.5 `WbwSharedUI` helpers available today (read-only; exact signatures)

```ts
roleSize(role: TextRole, distanceCm = 110, boost = READ_BOOST): number
applyTextRole(t: Text, role: TextRole, distanceCm = 110, boost = READ_BOOST): void
textWidthCm(chars: number, role: TextRole, distanceCm: number, onPanel = true, boost = READ_BOOST): number
lineHeightCm(role: TextRole, distanceCm: number, onPanel = true, boost = READ_BOOST): number
useTone(t: Tone): void            toneOf(mode: string): Tone          // Tone {name, label, base, tint}
shade(c: vec4, k: number, alpha = 1): vec4      toward(t: Tone, k: number, alpha = 1): vec4
obj(parent, name, pos?): SceneObject
panel(host, name, w, h, o?: FlexOpts, solid = false): Panel           // {root, plate, content, flex}; h < 10 → solid strip
flexBox(parent, name, dir: "row" | "column", w, h, o?: FlexOpts): SceneObject
register(parent, item: FlexItem): void          item(so, w?, h?, stretch = false): FlexItem
text(parent, name, str, role: TextRole, dist, o?: TextOpts): Text     // TextOpts {w, h, color, align, wrap, z, onPanel, boost}
setTextColor(t: Text, c: vec4): void
image(parent, name, tex: Texture, w, h?, tint?: vec4, asItem = true): Image
button(parent, name, w, h, label, dist, onClick: () => void, o?: ButtonOpts): ButtonParts
        // ButtonOpts {icon, iconSize, role, toggle, primary, column, asItem, labelColor, tone}
        // ButtonParts {so, btn, face, label: Text | null, icon: Image | null}; the label Text is named "Label"
styleWhenReady(btn: Button, primary = false, t?: Tone): void          styleButton(btn, primary = false, t = currentTone): void
setInactiveColor(btn: Button, color: vec4): void
headerRule(parent, rowW = 0, name = "HeaderRule"): SceneObject         HEADER_RULE_H = 0.52
retire(so: SceneObject | null, owner: ScriptComponent): void           setToggleLater(btn: Button, on: boolean, owner): void
modeChip(parent, dist, name = "ModeChip"): SceneObject                 modeChipH(dist): number   // text child "ChipLabel"
constants: TEXT_LIGHT, TEXT_SOFT, MUTED, CYAN, GREEN, GREEN_FILL, AMBER, TONE_LEARN, TONE_LIVE, TONE_PRACTICE,
           READ_BOOST, PANEL_ALPHA_SEE_THROUGH, PANEL_ALPHA_STRIP, FONT_SIZE_SCALE
```
UIKit facts used below: `Button.inactive = true` switches the Button's Interactable and collider off (so
`findInteractablesByName(name, undefined, true)` no longer returns it); `Button.isOn`, `setIsToggleable(true)`,
`onTriggerUp`, `onHoverEnter` / `onHoverExit` (Target phase), `interactable`, `initialized`, `onInitialized`, `size`.
Icons that exist in `Assets/Icons/`: `arrow_forward`, `back_hand`, `bookmark_add`, `check_circle`, `close`,
`extension`, `local_cafe`, `location_on`, `play_arrow`, `refresh`, `school`, `volume_up` (`.png`). There is no
microphone icon: the mic indicator is a `RoundedRectangle` dot.

---
## 4. Module contracts

Each block gives: path · what it exports · construction · public methods · readable state (**[LEAF]** = read by
tests) · events and who subscribes · SceneObject names · what it calls in other modules.

### 4.1 `Assets/Scripts/WbwPhraseHelperModel.ts` — pure phrase table, builder and model (WRITTEN)

Target file is `drafts/WbwPhraseHelperModel.ts` byte for byte (no decision touches it; `selfTest()` returns `[]`).
No Lens API, no imports. Real exported API:

```ts
export type PhrasePattern = "want" | "without"
export interface PhraseIngredient { id: string; nom: string; acc: string; enLabel: string; enPhrase: string;
                                    wClip: string; aClip: string; wantClip: string; withoutClip: string }
export interface EmphasisRange { id: string; start: number; end: number }          // [start, end) like String.slice
export interface LineParts { left: string; slot: string; right: string }
export interface PhraseBuild {
  pattern: PhrasePattern; slotIds: string[]; hu: string; en: string
  emphasisRanges: EmphasisRange[]; enEmphasisRanges: EmphasisRange[]
  slotSpan: {start: number; end: number}; enSlotSpan: {start: number; end: number}
  huParts: LineParts; enParts: LineParts
  audioKey: string; audioParts: string[]; valid: boolean; empty: boolean; answerToken: string
}
export interface PointerActions { usable: boolean; inPhrase: boolean; showUse: boolean; showAdd: boolean; full: boolean; formInPhrase: string }
export interface PhraseTestState { phraseSlotIds: string[]; phrasePattern: PhrasePattern; phraseHu: string; phraseEn: string; phraseAudioKey: string }

export const PHRASE_INGREDIENTS: PhraseIngredient[]        // the 15 counter ingredients
export const MAX_SLOTS = 4
export const SLOT_PLACEHOLDER = "…"
export const CLIP_KEREK = "c_kerek", CLIP_ES = "c_es", CLIP_A_SZENDVICSEMBE = "c_a_szendvicsembe", CLIP_NELKUL = "c_nelkul", CLIP_KEREM = "c_kerem"

export function ingredientById(id: string): PhraseIngredient | null
export function canUseInPhrase(id: string): boolean
export function capFirst(s: string): string
export function normaliseSlots(ids: string[], maxSlots: number = MAX_SLOTS): string[]
export function formInPhrase(id: string, pattern: PhrasePattern): string
export function buildPhrase(slotIdsIn: string[], pattern: PhrasePattern, maxSlots: number = MAX_SLOTS): PhraseBuild
export function toRichText(text: string, ranges: EmphasisRange[], open: string, close: string): string
export function segmentsOf(text: string, ranges: EmphasisRange[]): {text: string; id: string}[]
export function withNoBreakItems(text: string, ranges: EmphasisRange[]): string
export function phraseClipKeys(): string[]                 // 65 keys
export function missingClips(has: (key: string) => boolean): string[]
export function canListen(b: PhraseBuild, has: (key: string) => boolean): boolean
export function checkAgainstVocab(words: {id: string; hu: string; en: string; audio: string}[]): string[]

export class PhraseHelperModel {
  readonly maxSlots: number
  constructor(opts?: {slots?: string[]; pattern?: PhrasePattern; maxSlots?: number})
  get slots(): string[]            // copy
  get pattern(): PhrasePattern
  get revision(): number
  get isEmpty(): boolean
  get isFull(): boolean
  has(id: string): boolean
  canUse(id: string): boolean      // ingredient and not already in the phrase
  canAdd(id: string): boolean      // ingredient, ≥ 1 slot, not in it, not full
  pointerActions(id: string): PointerActions
  useWord(id: string): boolean     // replaces the list with [id]; false for a non-ingredient or a word already in it
  addWord(id: string): boolean     // appends; false for a non-ingredient, a duplicate or a full list
  removeWord(id: string): boolean  // not used by Phase C
  setPattern(p: PhrasePattern): boolean
  clear(): boolean                 // not used by Phase C
  build(): PhraseBuild             // cached; treat as read-only
  testState(): PhraseTestState
}
export function selfTest(limit: number = 100): string[]    // plus PHRASE_CLIP_TEXT, BUILD_CASES, MODEL_CASES, POINTER_CASES and their types
```

Facts the views and tests rely on:
- Every mutator returns `true` only when the state changed.
- `huParts`: want → `{left: "Kérek ", slot: "<list>", right: " a szendvicsembe."}`; without →
  `{left: "", slot: "<List>", right: " nélkül, kérem."}`. Empty list → `slot === "…"`, `audioKey === ""`,
  `empty === true`, `valid === false`.
- Strings: `[]`/want → `"Kérek … a szendvicsembe."` / `"I'd like … in my sandwich."`;
  `[uborka_friss]` → `"Kérek uborkát a szendvicsembe."` / `"I'd like cucumber in my sandwich."` / `p_kerek_uborka_friss`;
  `[uborka]` → `"Kérek savanyú uborkát a szendvicsembe."` / `p_kerek_uborka`;
  `[uborka]`/without → `"Savanyú uborka nélkül, kérem."` / `"Without pickles, please."` / `p_nelkul_uborka`;
  `[szalami]` → `"Kérek szalámit a szendvicsembe."` / `"I'd like salami in my sandwich."` / `p_kerek_szalami`;
  `[szalami, paradicsom]` → `"Kérek szalámit és paradicsomot a szendvicsembe."` /
  `"I'd like salami and tomato in my sandwich."` / `c_kerek+a_szalami+c_es+a_paradicsom+c_a_szendvicsembe`;
  `[szalami, paradicsom]`/without → `"Szalámi és paradicsom nélkül, kérem."` /
  `w_szalami+c_es+w_paradicsom+c_nelkul+c_kerem`.
- Calls nothing. Used by: `WbwOrderController` (one `PhraseHelperModel` instance, `canUseInPhrase`, `canListen`,
  `missingClips`, `checkAgainstVocab`, types), `WbwLearnController` (`canUseInPhrase`, `MAX_SLOTS`),
  `WbwPhraseHelperUI` (types `PhraseBuild`, `PhrasePattern`; optionally `toRichText`).

### 4.2 `Assets/Scripts/WbwVoiceActivity.ts` — "the learner spoke" detector (WRITTEN)

Target file = `drafts/WbwVoiceActivity.ts` with exactly three changes: the `@ui.label` is plain text (no colour
span); new method `setVoiceDetection(on)`; the header and the closing sketch mention it. The draft's Node check
still prints "ALL CHECKS PASSED" on the target copy, and the hook was checked the same way.
`@component export class WbwVoiceActivity extends BaseScriptComponent`. Created at runtime by `WbwMain` (§4.18);
it has no scene wiring. Exports also `interface PlaybackGate { isBusy(): boolean; isVoiceBusy?(): boolean }` and
`interface VoiceTurnResult`.

```ts
// inputs (code defaults apply to the runtime-created component)
micAudio: AudioTrackAsset | undefined          voiceActivityEnabled: boolean = true
onsetDb = 12   releaseDb = 6   absMinOnsetDbfs = -55   minSpeechMinSec = 0.5   minSpeechMaxSec = 0.8   preGapSec = 0.3
endSilenceSec = 0.7   hesitationSilenceSec = 1.2   maxUtterSec = 8   calibrationSec = 0.4   tailGuardSec = 0.35
defaultListenTimeoutSec = 8   noisyListenTimeoutSec = 4   noisyFloorDbfs = -38   noSignalSec = 1.5   debugLog = false

// methods — the order controller uses style "a" only
init(gate: PlaybackGate | (() => boolean), micAudio?: AudioTrackAsset | null): void
setMicActive(on: boolean): void
setVoiceDetection(on: boolean): void           // NEW: false = mic path off, only Said it ends a turn
arm(onEnd: (source: "mic" | "button") => void, clipSec: number = 1.2): void   // re-arming drops a half-heard utterance
saidIt(): boolean                              // ends the armed turn with onEnd("button"); false if no turn is armed
disarm(): void                                 // closes the turn silently (= stop())
start(listenTimeoutSec?: number, expectedPhraseSec?: number): void           // style "b": not used
stop(): void
recalibrate(): void
injectBlocksForTest(db: number, count: number, gated: boolean = false): void

// readable
listening: boolean                 // detector side only; NOT the controller's waitingForSpeech
vadState: string                   // "off" | "guard" | "calibrating" | "listening" | "candidate" | "speech" | "done" | "nosignal"
level: number   noiseFloor: number   noiseSpread: number   calibrated: boolean
speechDetected: boolean            // confirmed MIC speech only
speechSource: string               // "" | "mic" | "button"
micAvailable: boolean   micStatus: string   gated: boolean   timedOut: boolean   noisy: boolean
turnCount: number   detectCount: number   noiseRejectCount: number   lastSpeechSec: number
lastResult: VoiceTurnResult | null   sampleRateActual: number   measuredRate: number
get waitingForSpeech(): boolean    get nudgeSaidIt(): boolean    get micLevelDb(): number    get noiseFloorDb(): number
get armCount(): number             get pulse(): number           // 0..1 for the mic indicator
get hasMic(): boolean              get micRunning(): boolean
get settleBlocks(): number         get minSpeechBlocks(): number  get endSilenceBlocksMax(): number
get ignoreMicForTests(): boolean   set ignoreMicForTests(v: boolean)        // [LEAF] set lazily by the helper

// events (PublicApi): onSpeechStarted<number>, onSpeechDetected<VoiceTurnResult>, onTimeout<number>,
//                     onStateChanged<string>, onMicStatusChanged<string>   — nobody has to subscribe in Phase C
```
- Calls: `gate.isBusy()` / `gate.isVoiceBusy()` on the `WbwAudioController` (§4.13) every frame.
- Called by: `WbwMain.start()` (`init`, `setVoiceDetection`), `WbwOrderController` (`setVoiceDetection`,
  `setMicActive`, `arm`, `saidIt`, `disarm`, reads `vadState`, `pulse`, `nudgeSaidIt`), LEAF (`ignoreMicForTests`).
- Never plays audio, never creates UI, never advances the order on a timeout.

### 4.3 `Assets/Scripts/WbwPointing.ts` — the one hover arbiter (non-UI)

Start from `drafts/WbwPointing.ts` and keep its code. Changes: drop "[DRAFT]" and the draft paths from the header;
add the pointer dot (K7). Imports SIK only (`Interactable`, `TargetingVisual`, `Interactor`, `InteractorInputType`,
`InteractorEvent`, `InteractorRayVisual`, `RAY_VISIBILITY_THRESHOLD`, `Event`, `PublicApi`).

```ts
export interface PointerTarget { id: string; interactable: Interactable }     // WbwCafeBuilder.Learnable fits
export interface HoverArbiterOptions {
  switchDwellSec: number          // 0.12
  handSwitchDwellSec: number      // 0.15
  exitGraceSec: number            // 0.5
  reacquireSec: number            // 0.35
  quietLearnableCursor: boolean   // true: learnables get TargetingVisual.None in the editor, .Ray on device
  hidePreviewMouseRay: boolean    // true: editor only, disables the Mouse InteractorRayVisual
  previewPointerDot: boolean      // NEW, true: editor only, offer a pointer dot (K7)
}
export const DEFAULT_HOVER_OPTIONS: HoverArbiterOptions
export interface LabelChange { id: string; previousId: string; inputType: InteractorInputType; refresh: boolean }
export interface PointerSelect { id: string; inputType: InteractorInputType }

export class WbwHoverArbiter {                                // plain class, NOT a @component
  constructor(targets: PointerTarget[], options?: Partial<HoverArbiterOptions>)
  readonly options: HoverArbiterOptions
  // readable
  hoveredId: string                // raw: what the most recently entering interactor points at ("" = none)
  labelForId: string               // debounced: the learnable the label shows ("" = hidden)
  hoverStackIds: string[]
  activeInput: InteractorInputType
  labelsEnabled: boolean
  suppressedId: string
  holding: boolean
  pinnedId: string
  pinnedUntil: number
  pointerRayVisible: boolean       // a SIK ray visual is drawing; false in the Preview
  rayVisualsFound: number
  mouseRayVisualsHidden: number
  labelChanges: number
  selectCount: number
  pointerDotVisible: boolean       // NEW: a dot should be drawn this frame
  pointerDotPos: vec3 | null       // NEW: world hit point for it (null when !pointerDotVisible)
  // events
  get onLabelChanged(): PublicApi<LabelChange>        // id "" = hide; refresh: true = same id, re-style
  get onSelected(): PublicApi<PointerSelect>          // trigger end on a learnable, Target phase
  // methods
  update(): void                                       // owner calls it from its LateUpdateEvent
  dispose(): void
  setLabelsEnabled(on: boolean): void                  // off: hides at once, drops a pin and the dot
  refresh(): void                                      // re-sends onLabelChanged for the label that is up
  setHoldSource(fn: (() => boolean) | null): void
  setSuppressSource(fn: (() => string) | null): void
  pin(id: string, seconds: number): void
  clearFocus(): void
  isHovered(id: string): boolean
  pointAt(id: string): boolean                         // test hook
  clearPoint(): void                                   // test hook
}
export function hideMouseRayVisual(visuals?: InteractorRayVisual[]): number
export function countMouseRayVisuals(enabledOnly: boolean = true): number
```

Pointer dot rule (computed at the end of every `update()`):
- `pointerDotVisible = editor && options.previewPointerDot && labelsEnabled && hoveredId !== "" && (activeInput & (LeftHand | RightHand)) === 0`.
  So it is on for the Preview mouse, a LEAF interactor (`CustomController`) and the `pointAt()` test hook, and always
  off on device.
- `pointerDotPos`: for an interactor key, `key.targetHitInfo && key.targetHitInfo.hit ? key.targetHitInfo.hit.position : key.targetHitPosition`
  (both are on SIK's `Interactor`; LEAF's interactor fills them); if that is null, or the key is the synthetic test
  hook, the hovered Interactable's `getTransform().getWorldPosition()`. `null` when not visible.
- The dot follows `hoveredId`, not `labelForId`: it also shows on the open card's word, whose label is suppressed.
- The arbiter creates no SceneObject. It never plays audio and never imports `WbwSharedUI`.

Unchanged rules from the draft: Target-phase events only; `hoveredId` follows only the interactor that entered
last; first label at once (after a deliberate hide: `reacquireSec`); switch after the dwell; hide after
`exitGraceSec`; hold while the hold source is true; the suppress source's id is hidden at once.
Owner and only user: `WbwLearnController` (§4.16). Calls nothing in other Phase C modules.

### 4.4 `Assets/Scripts/WbwNameLabelUI.ts` — hover label, connector, hover bracket, pointer dot (view)

Start from `drafts/WbwNameLabelUI.ts` and keep its placement, connector, bracket and live-row code.
`@component export class WbwNameLabelUI extends BaseScriptComponent`, host `NameLabelRoot`.
Changes against the draft:
1. Header without "[DRAFT]"; `@ui.label("WbwNameLabelUI – hover label beside the pointed-at object")`.
2. **No chip (K8):** delete the `showModeChip` input, `chip`, `chipKey`, `CHIP_BOOST_REL`, the chip part of
   `layout()` and the `modeChip` / `modeChipH` imports. The label is word + meaning (+ live row).
3. **Pointer dot (K7):** new input `drawPointerDot: boolean = true`, new method `setPointerDot()`, new readable
   `pointerDotVisible`, new object `PointerDot` with child `PointerDotCentre` under `PointingUI`.
4. It still never touches a learnable's `Brackets` (K6) and `worldBox()` still skips them.

```ts
export type NameLabelMode = "learn" | "live"
export interface NameLabelTarget { id: string; hu: string; en: string; so: SceneObject; size?: vec3 }
export interface NameLabelLiveState { phraseIds: string[]; maxSlots?: number; usable?: boolean }
export interface NameLabelShowOpts { mode: string; live?: NameLabelLiveState; card?: {pos: vec3; size: vec2} | null }
export interface NameLabelObstacle { id: string; so: SceneObject; size?: vec3 }        // WbwCafeBuilder.Learnable fits
export interface NameLabelSelect { id: string; mode: NameLabelMode }
export interface WorldBox { c: vec3; h: vec3 }
export function markerTint(kind: "learn" | "live" | "focus"): vec4   // focus = CYAN, else toneOf(kind).tint
export function worldBox(so: SceneObject, fallbackSize?: vec3): WorldBox

// inputs: viewHalfWidthDeg = 16, viewHalfHeightDeg = 19, pullTowardEyeCm = 10, gapCm = 1.5, replaceMoveCm = 10,
//         replaceTurnDeg = 8, labelBoost = 1.25, drawBracket = true, drawConnector = true, drawPointerDot = true
// methods
setObstacles(list: NameLabelObstacle[]): void
show(target: NameLabelTarget, opts: NameLabelShowOpts): void        // same id + mode while visible: re-layout in place
refresh(patch: {live?: NameLabelLiveState; card?: {pos: vec3; size: vec2} | null}): void
hide(): void                                                        // label, connector, bracket; NOT the dot
setPointerDot(pos: vec3 | null, mode: string): void                 // null hides it; mode picks the tint
accentFor(mode: string): vec4
// readable
labelForId: string    labelMode: string    labelHu: string    labelEn: string    labelSide: string
labelSize: vec2       labelDistanceCm: number                 liveControls: string[]     // "UseThisWordButton" | "AddWordButton" | "NameLabelStatus"
isHovered: boolean    get hovered(): boolean                  connectorLengthCm: number   placementScore: number
showCount: number     get isVisible(): boolean                get accentColor(): vec4
pointerDotVisible: boolean                                    // the PointerDot object is enabled
// events
get onSelect(): PublicApi<NameLabelSelect>      // the label surface was selected
get onUseWord(): PublicApi<string>              // UseThisWordButton, arg = labelForId
get onAddWord(): PublicApi<string>              // AddWordButton, arg = labelForId
get onHoverChanged(): PublicApi<boolean>
```

- Live row rule (unchanged): no row unless `labelMode === "live"` and `live.usable !== false`; the id is in
  `live.phraseIds` → `NameLabelStatus`; else `UseThisWordButton`, plus `AddWordButton` while
  `1 ≤ phraseIds.length < (maxSlots ?? 4)`.
- `setPointerDot(pos, mode)`: `pos === null` or `!drawPointerDot` → disable the dot, `pointerDotVisible = false`.
  Else place it at `pos` moved about 0.4 cm toward the eye, facing the user, diameter about 0.7° of view
  (`clamp(distance × 0.012, 0.8, 2.2)` cm), outer part in `toneOf(mode).tint`, centre (`PointerDotCentre`, about
  45 % of the diameter) in `TEXT_LIGHT`; unlit, no collider, no Interactable (WbwGeo primitives or a
  `RoundedRectangle`); build it once and reuse it. Silent.
- Subscribers: `WbwLearnController` subscribes `onSelect`, `onUseWord`, `onAddWord`, reads `hovered` (hold source)
  and `pointerDotVisible`, and calls `setObstacles`, `show`, `refresh`, `hide`, `setPointerDot`, `markerTint`.
- Calls: `WbwSharedUI` (`button`, `text`, `image`, `obj`, `retire`, `styleWhenReady`, `setTextColor`,
  `applyTextRole`, `lineHeightCm`, `textWidthCm`, `toneOf`, `useTone`, tones and colours), `WbwGeo` (`box`, `group`,
  `tint`, optionally `sphere` / `cyl`), `WbwSpatial` (`camTransform`, `faceRotation`, `placeFacingUser`).
- Must not: play audio, subscribe to learnables, decide what a select means, change the phrase, parent anything
  under a learnable.

### 4.5 `Assets/Scripts/WbwPhraseHelperUI.ts` — "SAY IT AT THE COUNTER" (new passive view)

`@component export class WbwPhraseHelperUI extends BaseScriptComponent`, host `PhraseHelperRoot`. Tone `TONE_LIVE`
(`useTone(TONE_LIVE)` before building). The controller places the host; the view never does.

```ts
// suggested inputs (the view author may tune them; they are not read by other modules)
viewDistanceCm: number = 100      // text sizing distance; the panel lies on the counter tray like the phrase cards
maxWidthCm: number = 46           // fixed panel width
slotRichText: boolean = false     // optional (K9): slot run with enableRichText + toRichText()

show(b: PhraseBuild, canListen: boolean, ready: boolean): void
      // builds the PhraseHelper panel; if it is already visible with the same `ready` it only updates in place
setPhrase(b: PhraseBuild, canListen: boolean): void      // in place; before the first show it only stores the values
setEditable(on: boolean): void                           // false: Listen and both pattern buttons inactive; stored if hidden
hide(): void
get sizeCm(): vec2                // panel size of the variant last shown (answer variant before any show); fixed per variant
get isVisible(): boolean          // [LEAF via order.phraseHelperVisible]
plainHu: string                   // [LEAF] b.hu of the phrase shown ("" before the first show / setPhrase)
plainEn: string                   // [LEAF]
pattern: PhrasePattern            // of the phrase shown
editable: boolean                 // last setEditable value (default false)
listenEnabled: boolean            // PhraseHelperListenButton is active (editable && canListen)
readyShown: boolean               // ReadyToOrderButton exists and the panel is visible
showCount: number                 // +1 each time the panel object is (re)built

get onListen(): PublicApi<void>              // PhraseHelperListenButton
get onPattern(): PublicApi<PhrasePattern>    // PatternWantButton → "want", PatternWithoutButton → "without"
get onReady(): PublicApi<void>               // ReadyToOrderButton
```

Layout (fixed size per variant, sized for the longest phrase, so the frame never jumps):
```
PhraseHelper (panel, TONE_LIVE)
  Head            row: ModeChip ("Use it live") + PhraseHelperTitle "SAY IT AT THE COUNTER" (Caption, TEXT_SOFT)
  PhraseHelperHu  line 1: PhraseHelperHead "Kérek" (want only) + PhraseHelperSlot <list> (tint, heavier, Shrink)
                  line 2: PhraseHelperTail "a szendvicsembe."  |  "nélkül, kérem."
  PhraseHelperEn  full English line (Caption, TEXT_SOFT, left, Shrink)
  PhraseHelperHint  only while b.empty
  Buttons         PhraseHelperListenButton · PatternWantButton | PatternWithoutButton (toggle pair)
  ReadyToOrderButton   (ready variant only; primary, own row, full width)
```
- Text content: `PhraseHelperHead.text = "Kérek"` (want) or `""` (without); `PhraseHelperSlot.text = b.huParts.slot`
  (`"…"` when empty); `PhraseHelperTail.text = b.huParts.right.trim()`; `PhraseHelperEn.text = b.en`. All left
  aligned. Head and tail never change position; in pattern "without" the slot starts at the left edge.
- Buttons: Listen is inactive (`btn.inactive = true`) unless `editable && canListen`. The pattern pair is inactive
  unless `editable`; its toggle state follows `b.pattern` (`setToggleLater`). A pattern button press invokes
  `onPattern(p)` and then re-applies the toggles from the stored pattern, so a refused change snaps back.
  `ReadyToOrderButton` is active whenever it is shown.
- **Same object across edits:** `setPhrase()`, `setEditable()` and `show()` with an unchanged `ready` never
  destroy or rebuild `PhraseHelper` (the tour compares its `uniqueIdentifier`). `hide()` retires it.
- Subscribers: `WbwOrderController.init()` subscribes all three events. Calls: `WbwSharedUI` only (+ the model's
  types and optionally `toRichText`). Must not: play audio, call `canListen` with an audio source, place itself,
  know the order step.

### 4.6 `Assets/Scripts/WbwSpeakPromptUI.ts` — the say-it strip with the one `SaidItButton` (new passive view)

`@component export class WbwSpeakPromptUI extends BaseScriptComponent`, host `SpeakPromptRoot`. A solid strip
(height below 10 cm, so `panel()` draws it solid), `TONE_LIVE`. **Built once** on the first `show()`, then only
enabled / disabled, so the scene never holds two `SaidItButton` objects.

```ts
show(): void                       // showToken++; enable; state "listening" text until setState arrives
hide(): void                       // showToken++; disable now
setState(state: string, level01: number, nudge: boolean): void    // §3.1 states; level01 = vad.pulse (0..1)
showHeard(): void                  // done state ("Heard you ✓", GREEN dot) for 0.6 s, then hides unless shown again
get sizeCm(): vec2                 // fixed strip size; valid before the first show
get isVisible(): boolean           // [LEAF]
state: string                      // last state applied ("done" after showHeard)
stateText: string                  // [LEAF] text in SpeakPromptText
showToken: number                  // [LEAF] bumps on every show / hide / showHeard
get onSaidIt(): PublicApi<void>    // SaidItButton
```
- Objects: `SpeakPrompt` (panel root) → `ModeChip`, `MicIndicator` (small `RoundedRectangle` dot, imported from
  `SpectaclesUIKit.lspkg/Scripts/Visuals/RoundedRectangle/RoundedRectangle`), `SpeakPromptText` (Caption),
  `SaidItButton` ("Said it", `check_circle` icon, primary).
- Show token rule: `showHeard()` does `const tok = ++this.showToken`, shows the done state and schedules
  `if (tok === this.showToken) <hide without bumping>` after 0.6 s. A `show()` or `hide()` inside that time wins.
- State → text per §3.3. `nudge === true` replaces the text of every state except `speech` and `done` and makes
  `SaidItButton` pulse gently. Dot: tint of `TONE_LIVE` scaled by `level01` (guard … candidate), `GREEN` for
  `speech` / `done`, dim (`MUTED`) for `nosignal` / `off`. **Never `AMBER`** (voice activity cannot judge
  correctness). After `showHeard()` nothing overwrites the done state until the next `show()`.
- Subscribers: `WbwOrderController.init()` subscribes `onSaidIt` → `order.saidIt()`. Calls: `WbwSharedUI` only.
  Must not: play audio or SFX, place itself, decide anything.

### 4.7 `Assets/Scripts/WbwSuggestionUI.ts` — arrival suggestion (new passive view)

`@component export class WbwSuggestionUI extends BaseScriptComponent`, host `SuggestionRoot`. Panel tone
`TONE_LEARN` (the app-level tone setup, menu and toast use). About 33 × 22.4 cm, text sized for 70 cm
(input `viewDistanceCm: number = 70`). Built like `WbwModeMenuUI.show()`.

```ts
show(savedCount: number, suggested: string): void     // suggested: "learn" | "practice" | "live"
hide(): void
setDescription(text: string): void                    // optional override; the view manages the text itself (K14)
get sizeCm(): vec2
get isVisible(): boolean          // [LEAF via main.suggestionVisible]
hoveredOption: string             // [LEAF] "" | "learn" | "practice" | "live" | "later"
descriptionText: string           // [LEAF] text in SuggestDescription
suggestedOption: string           // value passed to show()
get onPick(): PublicApi<string>   // "learn" | "practice" | "live" | "later"
get onHover(): PublicApi<string>  // "" when nothing is hovered
```
- Objects: `SuggestionPanel` (panel root) → `SuggestTitle` (Headline2) + `headerRule`; tile row
  `SuggestLearnButton` (`school.png`, `tone: TONE_LEARN`), `SuggestPracticeButton` (`extension.png`,
  `tone: TONE_PRACTICE`), `SuggestLiveButton` (`local_cafe.png`, `tone: TONE_LIVE`), icon above the label
  (`column: true`), gap ≥ 1.6 cm; `SuggestDescription` (Caption, `TEXT_SOFT`); `SuggestLaterButton` ("Later",
  panel tone, not primary). The suggested tile gets `primary: true`.
- Hover: each button's `onHoverEnter` / `onHoverExit` sets `hoveredOption`, updates `SuggestDescription` from the
  §3.3 table (Practice text depends on `savedCount < 4`) and invokes `onHover`.
- A press invokes `onPick(option)`; the view does not hide itself (`WbwMain` calls `hide()`).
- Subscribers: `WbwMain` subscribes `onPick`; reads `isVisible`, `hoveredOption`. Calls: `WbwSharedUI` only.
  No voice, no SFX.

### 4.8 `Assets/Scripts/WbwWordCardUI.ts` — compact steady word card (rewrite of the existing view)

Host `WordCardRoot` (unchanged). `useTone(TONE_LEARN)`. The card is HU word, EN meaning, status line, three
buttons and close. No illustration, no example sentence, no fly animation.

```ts
export interface WordCardData { id: string; hu: string; en: string; saved: boolean }

// inputs: keep viewDistanceCm (70). Delete showExample and flySeconds.
show(data: WordCardData): void
hide(): void
setPlaying(kind: string): void       // "word" → status "Playing pronunciation" + pulsing WordCardStatusIcon; "" → "Ready to listen again"
setSaved(): void                     // Save control → SAVED_LABEL, GREEN label, check icon; savedShown = true
currentWordId: string                // [LEAF] "" when hidden
currentHu: string                    // [LEAF]
playing: string                      // [LEAF] "word" | ""
savedShown: boolean                  // [LEAF]
cardSize: vec2                       // size of the card shown; the learn controller places it with this
showCount: number                    // [LEAF] +1 per show()
statusText: string                   // [LEAF] text in WordCardStatus ("" when hidden)
get isVisible(): boolean             // [LEAF]
get onPlay(): PublicApi<void>        // WordCardPlayButton
get onSave(): PublicApi<void>        // WordCardSaveButton, only while !savedShown
get onClose(): PublicApi<void>       // WordCardCloseButton
get onUseLive(): PublicApi<void>     // WordCardUseLiveButton (NEW)
```
- Removed members: `onPlaySentence`, `flyTo()`, the fly part of `tick()`, `sentenceBtn`, `WordCardData.exampleHu /
  exampleEn / picture / hasSentenceAudio`.
- Layout: `ChipRow` (`ModeChip` "Learn") · `Top` row (`Words` column with `WordCardHu` Headline1 and `WordCardEn`
  Body `TEXT_SOFT`, then `WordCardCloseButton`) · `WordCardStatusRow` (`WordCardStatusIcon` = `volume_up`,
  `WordCardStatus` Caption) · `Buttons` row: `WordCardPlayButton` ("Listen again", `play_arrow`),
  `WordCardSaveButton` ("Save" / `SAVED_LABEL`, `bookmark_add` / `check_circle`, primary while unsaved),
  `WordCardUseLiveButton` (`USE_LIVE_LABEL`, `arrow_forward`, `tone: TONE_LIVE`). Icon above the label
  (`column: true`), `btnH` 5.2 as today.
- Status colour: `TEXT_SOFT` in both states (never `CYAN`). The status text is `""` between `show()` and the
  first `setPlaying()`; `setPlaying("word")` is called by the controller in the same frame. While playing, the
  status icon is visible and pulses (the existing `Math.sin(getTime() * 8)` pulse); otherwise it is hidden or still.
  The `WordCardPlayButton` label stays "Listen again" in both states.
- `show()` rebuilds the panel (as today) and computes `cardSize`; the card is never moved or rebuilt by
  `setPlaying()` / `setSaved()`.
- Subscribers: `WbwLearnController.init()` subscribes the four events. Calls: `WbwSharedUI` only.

### 4.9 `Assets/Scripts/WbwHudUI.ts` — mode chip on the compact HUD

Only the compact branch of `show()` and `target()` change. Everything else stays (inputs, `onMenu`, `isVisible`,
`isCompact`, `setCompact`, `setSaved`, `setMode`, `getBadgeWorldPos`, the full strip).
- Compact layout (K15): `panel(this.sceneObject, "Hud", W, H, …, true)` with a column: `HudModeChip`
  (`modeChip(col, d, "HudModeChip")`, built after `useTone(toneOf(this.modeLabel))`, so it reads "Use it live")
  above `MenuButton` (`chipWidthCm` × `max(3.8, chipHeightCm)`, unchanged). `W = max(chipWidthCm, chip width + 0.6)`,
  `H = modeChipH(d) + 0.4 + button height + 0.6`.
- The hidden `SavedBadge` and `ModeLabel` Text objects stay exactly as today (children of the panel root, text
  kept up to date by `render()`, `enabled = false` on the Text component): DC1 reads `ModeLabel` in compact mode.
- `target()`: keep today's left and bottom edge. Sideways offset `chipOffsetRightCm + (W − chipWidthCm) / 2`,
  vertical offset `chipOffsetUpCm + (H − max(3.8, chipHeightCm)) / 2`. Store `W` / `H` when the compact panel is built.
- No new public member is required. New name: `HudModeChip` (child text `ChipLabel`).

### 4.10 `Assets/Scripts/WbwPhraseChoicesUI.ts` — choose ≠ submit

```ts
export interface PhraseCardData { id: string; hu: string; en: string; picture: Texture | null; chosen: boolean }

show(cards: PhraseCardData[], prompt: string): void     // unchanged layout; a card with chosen: true starts selected
hide(): void                                            // also chosenId = ""
setChosen(id: string): void                             // single select; "" = none. Applies the toggle state to every card
chosenId: string                                        // [LEAF] "" = none
offeredIds: string[]                                    // unchanged [LEAF]
lastSizeCm: vec2                                        // unchanged
get sizeCm(): vec2                                      // NEW: = lastSizeCm (same getter name as the other views)
get isVisible(): boolean                                // unchanged [LEAF]
get onPick(): PublicApi<string>                         // fires on EVERY card press, also on the chosen card
```
- Removed: `picked` map, `setPicked()`, `PhraseCardData.picked`.
- Card `onTriggerUp` (K16): `this._onPick.invoke(c.id)` first, then re-apply `setToggleLater(btn, cid === this.chosenId, this)`
  for every card. The controller answers `onPick` synchronously with `setChosen(id)`.
- Header comment: remove the `PhraseCard_done` / multi-pick wording. Names unchanged.
- Subscriber: `WbwOrderController` (`onPick`), which also calls `show`, `hide`, `setChosen`, `sizeCm`.

### 4.11 `Assets/Scripts/WbwSession.ts` — carried word for Use it live

Add (everything else unchanged):
```ts
export interface LiveEntry { via: "card" | "menu"; wordId: string }

// in class WbwSession
/** Last word carried from a word card into Use it live ("" if none). Read by the order controller's seeding. */
liveWord: string = ""
/** Remember how Use it live is being entered; read once by the order controller when it activates. */
setLiveEntry(via: "card" | "menu", wordId: string): void     // stores the entry; if (wordId) this.liveWord = wordId
/** Returns the pending entry and clears it; {via: "menu", wordId: ""} when none is pending. */
takeLiveEntry(): LiveEntry
```
Writers: `WbwMain` (`setLiveEntry`). Reader: `WbwOrderController.setActive(true)` (`takeLiveEntry`, `liveWord`).
`save()` never touches `liveWord` (saving is not ordering).

### 4.12 `Assets/Scripts/WbwSpatial.ts` — lazy follow

Add one pure function (everything else unchanged):
```ts
/**
 * Lazy view-follow for a world-placed panel (toast, suggestion). Call every frame while the panel is visible.
 * Starts gliding to inView(dist, up) when the panel is more than maxAngleDeg off the gaze or its horizontal
 * distance to the user leaves [minD, maxD]; keeps gliding (lerp factor min(1, dt * 5)) until it is within 2 cm
 * of the goal; always turns the panel to face the user; never moves it while `frozen` (a button on it is hovered).
 * @returns true while it is gliding: pass the value back in as `following` on the next frame.
 */
export function lazyFollowStep(so: SceneObject, dist: number, up: number, dt: number, following: boolean = false,
                               frozen: boolean = false, maxAngleDeg: number = 18, minD: number = 55, maxD: number = 95): boolean
```
Used only by `WbwMain.tickArrival()`.

### 4.13 `Assets/Scripts/WbwAudioController.ts` — mic gate and clip length

Add (existing members unchanged; `playOne` keeps counting one `voicePlayCount` per clip part):
```ts
/** Number of SFX started this session. */                       sfxPlayCount: number = 0      // [LEAF] ++ at the top of playSfx()
/** Voice channel only: a clip plays or its finish is pending. */ isVoiceBusy(): boolean        // pendingDone !== null || (!!voice && voice.isPlaying())
/** Any Lens sound: voice (see above) or an SFX channel. */       isBusy(): boolean             // [LEAF]
/** Seconds of a key; "a+b+c" = the sum; 1.2 s for each part without a duration. */
durationOf(key: string): number    // sum over key.split("+") of (AUDIO[k].control as FileAudioTrackProvider).duration, 1.2 if missing or ≤ 0
```
`WbwAudioController` satisfies `PlaybackGate` of §4.2. Callers: `WbwVoiceActivity` (`isBusy`, `isVoiceBusy`),
`WbwOrderController` (`durationOf`, `has`, `playVoice`, `playSfx`, `stopVoice`), LEAF (`isBusy`, `sfxPlayCount`,
`voicePlayCount`, `lastVoiceKey`, `lastSfxKey`).

### 4.14 `Assets/Scripts/WbwAudioBank.ts` — 31 new entries

Add exactly these keys to `AUDIO`, each as `"<key>": requireAsset("../Audio/hu/<key>.wav") as AudioTrackAsset,`
(all 31 `.wav` + `.meta` files exist), in the table's alphabetical places; keep every existing entry:
`c_a_szendvicsembe` · `p_kerek_csirke`, `p_kerek_hagyma`, `p_kerek_husgomboc`, `p_kerek_majonez`, `p_kerek_mustar`,
`p_kerek_olivabogyo`, `p_kerek_paprika`, `p_kerek_paradicsom`, `p_kerek_sajt`, `p_kerek_salata`, `p_kerek_sonka`,
`p_kerek_spenot`, `p_kerek_szalami`, `p_kerek_uborka`, `p_kerek_uborka_friss` · `p_nelkul_csirke`, `p_nelkul_hagyma`,
`p_nelkul_husgomboc`, `p_nelkul_majonez`, `p_nelkul_mustar`, `p_nelkul_olivabogyo`, `p_nelkul_paprika`,
`p_nelkul_paradicsom`, `p_nelkul_sajt`, `p_nelkul_salata`, `p_nelkul_sonka`, `p_nelkul_spenot`, `p_nelkul_szalami`,
`p_nelkul_uborka`, `p_nelkul_uborka_friss`. (The ready-made lines are in `drafts/WbwAudioBank.phrase-entries.txt`.)
After this, `missingClips((k) => !!AUDIO[k])` is `[]`.

### 4.15 `Assets/Scripts/WbwVocab.ts` — step 2 becomes the helper step

- `interface OrderStep`: add `helper?: boolean   // the answer is the phrase helper, not phrase cards`; delete
  `pinned?`. Keep `multi` (all `false` now; comment: unused).
- `ORDER_STEPS[1]` → `{step: 2, name: "fillings", line: "mit_ker_bele", choices: [], advanceOn: [], multi: false, helper: true}`.
  The other five steps are unchanged.
- `PHRASES`: delete the entries `sonka_sajt`, `kerhetek_oliva`, `uborka_nelkul`, `szalami_sajt`, `csirke_paprika`, `done`.
- `PhraseEntry.audio` comment: drop "UI-only cards like Done". `WordEntry.example*` fields stay (unused by the card).
- No new field on `WordEntry`: the inflected forms live in `PHRASE_INGREDIENTS` (§4.1), checked against `WORDS` at
  start-up by the order controller.

### 4.16 `Assets/Scripts/WbwLearnController.ts` — point to reveal, steady card, one bracket

Imports to add: `WbwNameLabelUI`, `markerTint` (`./WbwNameLabelUI`); `WbwHoverArbiter` (`./WbwPointing`);
`canUseInPhrase`, `MAX_SLOTS` (`./WbwPhraseHelperModel`); `Event`, `PublicApi` (SIK). Drop `PICTURES`. Never
imports `WbwSharedUI`.

```ts
// inputs
@input wordCard!: WbwWordCardUI                               // unchanged
@input @allowUndefined nameLabel: WbwNameLabelUI | undefined   // NEW; WbwMain assigns it before init() if not wired
// kept: maxBrackets, viewConeDeg, maxDistanceCm, walkAwayCm, cardDistanceCm, viewHalfWidthDeg, viewHalfHeightDeg, hudClearDeg
switchDwellSec: number = 0.12     // NEW slider 0–0.5: a new object must be pointed at this long before the label switches
exitGraceSec: number = 0.5        // NEW slider 0–1.5: the label stays this long after nothing is pointed at
// deleted: savedHoldSec, highlightColor, focusColor, bracketColor

// methods
init(session: WbwSession, audio: WbwAudioController, hud: WbwHudUI, learnables: Learnable[]): void   // signature unchanged
setActive(on: boolean): void
setHighlight(ids: string[]): void                    // unchanged meaning (ingredients highlighted outside Learn)
selectById(id: string): boolean                      // unchanged: same as pinching the object in Learn
setPointMode(m: "off" | "learn" | "live"): void      // NEW, from WbwMain.applyMode
setLiveSlots(ids: string[], canEdit: boolean): void  // NEW, from the order controller
pointAtById(id: string): boolean                     // NEW test hook → hover.pointAt(id)
clearPoint(): void                                   // NEW test hook → hover.clearPoint()

// readable
active: boolean                    // [LEAF]
activeCardWordId: string           // [LEAF] "" if no card
activeCardWord: string             // [LEAF]
bracketedIds: string[]             // [LEAF] the 3–4 ids chosen by scan() (the labelled one included)
learnableIds: string[]             // [LEAF]
highlightIds: string[]
get hoveredId(): string            // [LEAF] hover ? hover.hoveredId : ""
get labelForId(): string           // [LEAF] hover ? hover.labelForId : ""
get pointerRayVisible(): boolean   // [LEAF, editor only] hover ? hover.pointerRayVisible : false
get pointerDotVisible(): boolean   // [LEAF, editor only] !!nameLabel && nameLabel.pointerDotVisible
get cardWordId(): string           // [LEAF] = activeCardWordId
labelMode: string = ""             // [LEAF] "learn" | "live" while a label is up
pointMode: string = "off"          // [LEAF]
cardPlayCount: number = 0          // [LEAF] pronunciation plays for the card that is open (1 right after it opens)

// events
get onUseLive(): PublicApi<string>   // "Use it live →" on the card; arg = the card's word id. Subscriber: WbwMain
get onUse(): PublicApi<string>       // UseThisWordButton; arg = word id. Subscriber: WbwOrderController → useWord
get onAdd(): PublicApi<string>       // AddWordButton; arg = word id. Subscriber: WbwOrderController → addWord
```

Calls into other modules (exact members): `wordCard.show / hide / setPlaying / setSaved / isVisible / cardSize /
currentWordId / playing / onPlay / onSave / onClose / onUseLive`; `nameLabel.setObstacles / show / refresh / hide /
setPointerDot / hovered / pointerDotVisible / onSelect / onUseWord / onAddWord`; `markerTint()`;
`new WbwHoverArbiter(...)` and its `update / dispose / setLabelsEnabled / refresh / setHoldSource /
setSuppressSource / pin / pointAt / clearPoint / onLabelChanged / onSelected / hoveredId / labelForId /
pointerRayVisible / pointerDotVisible / pointerDotPos`; `session.save / isSaved`; `audio.playSfx / playVoice`.
Behaviour: §6.

### 4.17 `Assets/Scripts/WbwOrderController.ts` — prep, phrase helper, speak turns

Imports to add: `WbwPhraseHelperUI`, `WbwSpeakPromptUI`, `WbwVoiceActivity`, `WORDS` (from `./WbwVocab`),
`LiveEntry` (from `./WbwSession`), and from `./WbwPhraseHelperModel`: `PhraseHelperModel`, `PhraseBuild`,
`PhrasePattern`, `canUseInPhrase`, `canListen`, `missingClips`, `checkAgainstVocab`. Keep everything it imports
today (`PICTURES`, `camLookFlat`, …). Never imports `WbwSharedUI`.

```ts
// inputs: all existing ones stay (caption, phrases, hint, server, seating, phraseTray, replyPauseSec,
//         captionLingerSec, phrasesOnCounter, maxTrayDistanceCm, phraseDistanceCm, phraseDropCm, arrowInViewDeg)
@input @allowUndefined phraseHelper: WbwPhraseHelperUI | undefined   // NEW; WbwMain assigns it before init()
@input @allowUndefined speakPrompt: WbwSpeakPromptUI | undefined     // NEW; WbwMain assigns it before init()
playPhraseOnChange: boolean = true   // NEW: Use this word / + és / pattern switch play the new phrase once
voiceDetection: boolean = true       // NEW: off = only the Said it button ends a turn (recordings)
// deleted: fillingsCardCount

// methods
init(session: WbwSession, audio: WbwAudioController, learn?: WbwLearnController, vad?: WbwVoiceActivity | null): void
setActive(on: boolean): void
enterPrep(): void                    // NEW public: prep state (K1); no-op while !active
readyToOrder(): void                 // NEW public: ReadyToOrderButton; only while waitingFor === "ready"
startOrder(): void                   // kept: answers = [], chosenTable = 0, hide hint, runStep(1). Never clears the phrase
pickPhrase(id: string): boolean      // kept name; now "choose" (same as pressing the card). false if not offered
saidIt(): void                       // NEW public: SaidItButton
useWord(id: string): boolean         // NEW public: "Use this word"; true if the phrase changed
addWord(id: string): boolean         // NEW public: "+ és"; true if the phrase changed
setPattern(p: PhrasePattern, fromUser: boolean = true): boolean   // NEW public
listenPhrase(): boolean              // NEW public: PhraseHelperListenButton; true if it played

// readable
active: boolean                      // [LEAF]
orderStep: number                    // [LEAF] 0 = prep / not started, 1..6, 7 = done
orderStepName: string                // [LEAF] §3.1
waitingFor: string                   // [LEAF] §3.1
answers: string[]                    // [LEAF] ids SAID so far, in order (pushed in onSaid, never on a tap)
chosenTable: number                  // [LEAF]
lastTableTapped: number              // [LEAF]
offeredPhraseIds: string[]           // [LEAF] cards on offer ([] in prep and at step 2)
lastServerLine: string               // [LEAF]
phraseSlotIds: string[] = []         // [LEAF] mirrors the model
phrasePattern: PhrasePattern = "want"   // [LEAF]
phraseHu: string                     // [LEAF] "Kérek … a szendvicsembe." from init() on (K18)
phraseEn: string                     // [LEAF]
phraseAudioKey: string               // [LEAF] "" while empty
get phraseHelperVisible(): boolean   // [LEAF] !!phraseHelper && phraseHelper.isVisible
get phraseEditable(): boolean        // [LEAF] K3
get waitingForSpeech(): boolean      // [LEAF] a speak turn is open (speakTurn !== null)
speechDetected: boolean = false      // [LEAF] the last answer was ended by the mic
speechSource: string = ""            // [LEAF] "mic" | "button" for the last answer
chosenPhraseId: string = ""          // [LEAF] phrase card chosen and waiting to be said ("" = none)
fillingsSaid: string = ""            // [LEAF] phraseHu at the moment the step-2 answer was said
vad: WbwVoiceActivity | null = null  // the detector passed to init()
```
No events. Subscribes to: `phrases.onPick`, `phraseHelper.onListen / onPattern / onReady`, `speakPrompt.onSaidIt`,
`learn.onUse / onAdd`, each table card's `onSelected` (as today).
Calls into other modules (exact members): `phrases.show / hide / setChosen / sizeCm / isVisible / getSceneObject`;
`phraseHelper.show / setPhrase / setEditable / hide / sizeCm / isVisible / getSceneObject`;
`speakPrompt.show / hide / setState / showHeard / sizeCm / getSceneObject`;
`vad.setVoiceDetection / setMicActive / arm / saidIt / disarm / vadState / pulse / nudgeSaidIt`;
`learn.setHighlight / highlightIds / setLiveSlots`; `session.takeLiveEntry / liveWord`;
`audio.playVoice / playSfx / stopVoice / has / durationOf`; `caption.show / hide`; `hint.*`; `server.*` (as today).
Behaviour: §5.

### 4.18 `Assets/Scripts/WbwMain.ts` — arrival, runtime views, detector, routing

Imports to add: `WbwSuggestionUI`, `WbwNameLabelUI`, `WbwPhraseHelperUI`, `WbwSpeakPromptUI`, `WbwVoiceActivity`,
`lazyFollowStep` and `horizDist` (`./WbwSpatial`). Never imports `WbwSharedUI`.

```ts
// inputs: all existing ones stay; the required-inputs check in onAwake() is unchanged
@input @allowUndefined suggestion: WbwSuggestionUI | undefined    // NEW; created at runtime if not wired
@input @allowUndefined micAudio: AudioTrackAsset | undefined      // NEW: Microphone Audio asset; empty = Said-it only
arrivalSuggestion: boolean = true     // NEW: false = old behaviour (firstMode starts by itself after the toast)
suggestAutoPickSec: number = 0        // NEW: > 0 picks the suggested option after that time (kiosk); 0 = never
toastAfterWalkCm: number = 80         // NEW
toastFallbackSec: number = 1.5        // NEW

// readable (existing: currentMode, currentModeLabel, savedWords, savedCount, setupComplete, menuOpen, modeSwitches)
arrivalPhase: string = "setup"        // [LEAF] §3.1
get suggestionVisible(): boolean      // [LEAF] !!suggestion && suggestion.isVisible
suggestionPick: string = ""           // [LEAF] option picked on the suggestion ("" = none)
toastTrigger: string = ""             // [LEAF] "walk" | "timeout" | "skip"
walkedSinceStartCm: number = 0        // [LEAF]
vad: WbwVoiceActivity | null = null   // [LEAF] the helper sets vad.ignoreMicForTests

// public methods (unchanged names): getSession(), toggleMenu(), selectMode(m: Mode)
```
`start()` order (binding, because `init()` subscribes to the views):
1. `cafe.build()`
2. `ensureViews()`: for each unwired view create `global.scene.createSceneObject("<Name>Root")`, parent it to
   `this.hud.getSceneObject().getParent()` (`WordByWord/UI`), `createComponent(X.getTypeName()) as X`, and assign:
   `this.learn.nameLabel` (`NameLabelRoot`, `WbwNameLabelUI`), `this.order.phraseHelper` (`PhraseHelperRoot`,
   `WbwPhraseHelperUI`), `this.order.speakPrompt` (`SpeakPromptRoot`, `WbwSpeakPromptUI`), `this.suggestion`
   (`SuggestionRoot`, `WbwSuggestionUI`).
3. `this.vad = this.sceneObject.createComponent(WbwVoiceActivity.getTypeName()) as WbwVoiceActivity`;
   `this.vad.init(this.audio, this.micAudio)`; `this.vad.setVoiceDetection(this.order.voiceDetection)`.
4. `learn.init(session, audio, hud, cafe.learnables)`; `order.init(session, audio, learn, this.vad)`;
   `practice.init(...)` (unchanged).
5. Subscriptions as today, plus
   `learn.onUseLive.add((id) => { this.session.setLiveEntry("card", id); this.selectMode("live") })` and
   `suggestion.onPick.add((o) => this.onSuggestionPick(o))`.
6. Update events as today (`hud.setCompact(order.active)`, raised hand) plus `tickArrival()`.

`applyMode(m, restart)` (binding order): the restart block calls `this.order.enterPrep()` for `"live"` (was
`startOrder()`); then `learn.setActive(m === "learn")`,
`learn.setPointMode(m === "learn" ? "learn" : m === "live" ? "live" : "off")`, `order.setActive(m === "live")`,
`practice.setActive(m === "practice")`, `hud.setMode(...)`. `setPointMode` comes before `order.setActive`, so the
live slots the order controller pushes are styled in the new mode.
Calls into other modules (exact members): the above plus `suggestion.show / hide / isVisible / hoveredOption /
getSceneObject`, `toast.show / isVisible / getSceneObject`, `hud.show / isVisible / setSaved / setMode / setCompact`,
`session.setLiveEntry`. Behaviour of the arrival: §7.

### 4.19 `Assets/Scripts/WbwPracticeController.ts` — seated board

One expression in `place()`: `Math.max(0, Math.min(25, horizDist(tp, cam) - this.boardDistanceCm))` →
`Math.max(-20, Math.min(25, horizDist(tp, cam) - this.boardDistanceCm))`. Nothing else changes.

### 4.20 `Assets/Tests/Leaf/WbwLeafHelpers.ts` — helper API (assertions: §8)

Existing exports stay (`log`, `waitFor`, `findEnabled`, `textOf`, `child`, `horiz`, `getMain`, `tableCard`).
New and changed:
```ts
/** LEAF test interactor that can HOLD a hover (LEAF's enterHover / exitHover are protected). */
export class WbwPointer extends DefaultLeafInteractor {
  currentName: string                                              // "" when free
  hold(target: Interactable, name: string): Promise<void>          // releases a previous hold first
  release(): Promise<void>                                         // tolerant: a target that disabled itself is fine
}

export class WbwTester {
  readonly main: WbwMain
  readonly interactor: DefaultLeafInteractor                       // "WbwLeafInteractor": taps
  readonly pointer: WbwPointer                                     // NEW "WbwLeafPointer": hover holds
  // accessors (existing: learn, order, practice, audio, hud, toast, card, caption, phrases, hint, board)
  get helper()        // main.order.phraseHelper        (WbwPhraseHelperUI | undefined)
  get speak()         // main.order.speakPrompt         (WbwSpeakPromptUI | undefined)
  get nameLabel()     // main.learn.nameLabel           (WbwNameLabelUI | undefined)
  get suggestion()    // main.suggestion                (WbwSuggestionUI | undefined)
  get vad()           // main.vad                       (WbwVoiceActivity | null)

  tap(name: string, timeoutMs: number = 6000): Promise<void>       // CHANGED: releases this.pointer first if it holds `name`
  hasEnabledInteractable(name: string): boolean
  quietMouse(): void                 // NEW: disables every enabled SIK Mouse interactor (idempotent); called in the constructor and in completeSetup()
  restoreMouse(): void               // NEW: re-enables them
  quietMic(): void                   // NEW: if (main.vad && !main.vad.ignoreMicForTests) main.vad.ignoreMicForTests = true (lazy, F14)
  restoreHead(): void                // CHANGED: also restoreMouse() and a fire-and-forget pointer.release()
  completeSetup(): Promise<void>     // CHANGED: … toast → suggestion → tap SuggestLearnButton → Learn (§8.2)
  switchModeViaMenu(buttonName: string, expectedMode: string): Promise<void>     // unchanged
  learnAndSave(id: string): Promise<void>                          // CHANGED: the card stays; the helper closes it
  waitForUserTurn(step: number, timeoutMs: number = 25000): Promise<void>        // CHANGED: phrase cards OR the helper
  startOrdering(): Promise<void>     // NEW: prep → tap ReadyToOrderButton → the greeting has started (orderStep 1)
  sayIt(): Promise<void>             // NEW: answer the open speak turn with SaidItButton
  pointHold(id: string): Promise<void>      // NEW: hover Learnable_<id> until pointRelease(); waits for its label
  pointRelease(): Promise<void>             // NEW
  useWord(id: string, add: boolean = false): Promise<void>         // NEW: point → UseThisWordButton / AddWordButton → released
  waitAudioIdle(timeoutMs: number = 15000): Promise<void>          // NEW: nextFrame, then waitFor(() => !audio.isBusy())
  // unchanged: cameraObject, camPos, cafeOrigin, eyeAt, setHead, yawToward, faceCounter
}
```

### 4.21 Not targeted

- `WbwSharedUI.ts`: used as it is (§3.5). No `hexOf()`; no new helper.
- `WbwCafeBuilder.ts`: used as it is (`learnables`, `Learnable {id, so, size, interactable}`, `getTablePosition`).
  The walk-in start (K20) is a later change by its owner; `startSpotLocal` may not exist.
- `WbwGeo.ts`, `WbwIllustrations.ts`, `WbwModeMenuUI.ts`, `WbwSetupPanelUI.ts`, `WbwToastUI.ts`, `WbwHintUI.ts`,
  `WbwServerCaptionUI.ts`, `WbwServerCharacter.ts`, `WbwTableCardUI.ts`, `WbwSignageUI.ts`, `WbwPracticeBoardUI.ts`,
  `WbwRaiseHand.ts`: unchanged.
- `WbwTempProbe.ts`: unchanged and still compiles: it reads the game through `any`, except typed calls to
  `WbwMain.selectMode(m)` and `WbwMain.toggleMenu()`, which therefore stay public with today's signatures. It
  expects the deleted step-2 cards, so its `stage` must stay `"setup"` and the integrator deletes it.

---
## 5. Use it live: state machine (`WbwOrderController`)

Private names below are recommended, public names are binding.

### 5.1 Step table

| `orderStep` | `orderStepName` | Server line (voice key) | Answer surface | Cards offered (`PhraseCard_<id>`) | Advances on (said) | Pushed to `answers` |
|---|---|---|---|---|---|---|
| 0 | `prep` | none (server silent) | `PhraseHelper` + `ReadyToOrderButton` | — | `ReadyToOrderButton` | nothing |
| 1 | `greet` | "Jó napot! Mit kér?" (`s_mit_ker`) | `PhraseChoices` | `jonapot`, `szendvicset` | `szendvicset` | `jonapot` (stays on the step), `szendvicset` |
| 2 | `fillings` | "Mit kér bele?" (`s_mit_ker_bele`) | `PhraseHelper` (no cards) | — | the phrase being said | `fillings` (+ `fillingsSaid = phraseHu`) |
| 3 | `drink` | "Inni valamit?" (`s_inni`) | `PhraseChoices` | `tejes_kave` | `tejes_kave` | `tejes_kave` |
| 4 | `here_or_takeaway` | "Itt fogyasztja vagy elvitelre?" (`s_itt_vagy_elvitel`) | `PhraseChoices` | `itt_eszem`, `elvitelre` | `itt_eszem` | `itt_eszem`; `elvitelre` (stays, demo hint) |
| 5 | `table` | "Hányas asztalnál ül?" (`s_hanyas_asztal`, + SFX `AttentionChime`) | table cards, then `PhraseChoices` | the chosen table's phrase: `negyes_asztal` / `nyolcas_asztal` / `tizenkettes_asztal` | that phrase | that id |
| 6 | `enjoy` | "Jó étvágyat!" (`s_jo_etvagyat`) | `PhraseChoices` | `koszonom` | `koszonom` | `koszonom` |
| 7 | `done` | none | hint + arrow | — | — | — |

`waitingFor` per step: 0 → `"ready"`; 1–6 → `"server"` while the line plays, then `"user"` (step 5: `"table"` until
an empty table is tapped, then `"user"`); 7 → `"done"`. A full DC3/DC4 order gives
`answers = ["jonapot", "szendvicset", "fillings", "tejes_kave", "itt_eszem", "nyolcas_asztal", "koszonom"]`.

### 5.2 Transitions

```
init(session, audio, learn?, vad?)
  store; this.vad = vad ?? null
  phrases.onPick → onPhrase(id)
  phraseHelper?.onListen → listenPhrase() · onPattern(p) → setPattern(p, true) · onReady → readyToOrder()
  speakPrompt?.onSaidIt → saidIt()
  learn?.onUse(id) → useWord(id) · learn?.onAdd(id) → addWord(id)
  table cards as today
  print loudly if missingClips((k) => audio.has(k)) or checkAgainstVocab(WORDS) is not empty:
     "WbwOrder: missing phrase clips: …"  /  "WbwOrder: phrase table differs from WbwVocab: …"
  mirrorPhrase()                         // phraseSlotIds / phrasePattern / phraseHu / phraseEn / phraseAudioKey (K18)
  UpdateEvent → tick()

setActive(true)                          // guard: on === active → return; active = on; epoch++
  vad?.setVoiceDetection(voiceDetection); vad?.setMicActive(true)
  seedPhrase(session.takeLiveEntry()); mirrorPhrase()
  orderStep === 0 || orderStep >= 7 ? enterPrep() : runStep(orderStep)

setActive(false)
  closeSpeakTurn(); speakPrompt?.hide(); phraseHelper?.hide(); vad?.setMicActive(false); learn?.setLiveSlots([], false)
  + today's body (phrases.hide, clearHighlight, caption.hide, server.setSpeaking(false), audio.stopVoice,
    hint arrow / hint off, arrowTarget = null, offeredPhraseIds = [], waitingFor "server" → "user")
  waitingFor "ready" stays "ready"; orderStep stays

enterPrep()                              // public; guard: !active → return
  epoch++; closeSpeakTurn(); speakPrompt?.hide(); chosenPhraseId = ""
  orderStep = 0; orderStepName = "prep"; stepDef = null; waitingFor = "ready"
  answers = []; chosenTable = 0; offeredPhraseIds = []
  phrases.hide(); caption.hide(); server.setSpeaking(false); audio.stopVoice(); hint.hideHint(); hint.setArrow(false); arrowTarget = null
  vad?.setMicActive(true)
  b = phrase.build(); phraseHelper?.show(b, canListen(b, has), true); placeSurface(); refreshHighlight(); refreshEditable()
  // no voice, no SFX

readyToOrder()                           // public; guard: active && waitingFor === "ready"
  startOrder()

startOrder()                             // public, body as today
  answers = []; chosenTable = 0; hint.hideHint(); runStep(1)

runStep(step)
  ep = ++epoch; closeSpeakTurn(); chosenPhraseId = ""
  orderStep = step; phrases.hide(); clearHighlight(); offeredPhraseIds = []
  step > ORDER_STEPS.length → finish(); return
  def = ORDER_STEPS[step - 1]; stepDef = def; orderStepName = def.name
  waitingFor = "server"; lastServerLine = line.hu; showCaption(line.hu, line.en); server.setSpeaking(true)
  def.helper ? (phraseHelper?.show(b, canListen(b, has), false), placeSurface()) : phraseHelper?.hide()
  refreshHighlight(); refreshEditable()            // not editable while the server speaks
  def.name === "table" → audio.playSfx("AttentionChime")
  audio.playVoice(line.audio, () => { if (ep !== epoch || !active) return; server.setSpeaking(false); captionHideAt = …; afterLine(def) })

afterLine(def)
  def.helper → showHelperTurn(); return
  def.name === "table" → today's branch (offerTablePhrase() or waitingFor = "table" + caption + arrow)
  else offer(def.choices)

showHelperTurn()                          // step 2, after "Mit kér bele?" ended
  waitingFor = "user"; offeredPhraseIds = []; phrases.hide()
  b = phrase.build(); phraseHelper?.setPhrase(b, canListen(b, has)); placeSurface(); refreshHighlight(); refreshEditable()
  !b.empty → beginSpeakTurn("fillings"); armVoice(b.audioKey)      // K5: no playback here

offer(ids)                                // phrase-card steps; also from offerTablePhrase()
  closeSpeakTurn(); chosenPhraseId = ""
  cards = ids.map(p => ({id, hu, en, picture: PICTURES[p.picture] ?? null, chosen: false}))
  waitingFor = "user"; offeredPhraseIds = ids.slice()
  phrases.show(cards, "Choose your answer, then say it"); placeSurface(); refreshHighlight(); refreshEditable()

onPhrase(id)                              // choose, never submit
  guard: active && stepDef && waitingFor === "user" && !stepDef.helper && offeredPhraseIds has id && phraseById(id)
  closeSpeakTurn(); chosenPhraseId = id; phrases.setChosen(id)
  audio.playVoice(p.audio)                // first: the gate is busy when the detector arms
  beginSpeakTurn(id); armVoice(p.audio)   // re-pressing the chosen card = listen again + re-arm

beginSpeakTurn(answerId)
  speakTurn = {answerId, epoch}; speechDetected = false; speechSource = ""; speakPrompt?.show(); placeSurface()

armVoice(key)
  vad?.arm((src) => this.onSaid(src), audio.durationOf(key))

saidIt()                                  // public (SaidItButton)
  !waitingForSpeech → return
  if (!vad || !vad.saidIt()) onSaid("button")

onSaid(source)
  guard: speakTurn && speakTurn.epoch === epoch && active
  id = speakTurn.answerId; def = stepDef; speakTurn = null
  speechSource = source; speechDetected = source === "mic"; vad?.disarm(); speakPrompt?.showHeard()
  def.helper → answers.push("fillings"); fillingsSaid = phraseHu; next(def)
  else       → answers.push(id)
               def.advanceOn has id → phrases.hide(); offeredPhraseIds = []; next(def)
               else → phrases.setChosen(""); chosenPhraseId = ""; id === "elvitelre" → today's demo hint (5 s)
  refreshEditable()

next(def)                                 // as today (waitingFor = "server", runStep(def.step + 1) after replyPauseSec, epoch-guarded)
  + phraseHelper stays as it is until runStep; refreshEditable()

finish()                                  // as today, plus
  closeSpeakTurn(); speakPrompt?.hide(); phraseHelper?.hide(); vad?.setMicActive(false); learn?.setLiveSlots([], false)

closeSpeakTurn()                          // K11
  vad?.disarm(); if (!speakTurn) return; speakTurn = null; speakPrompt?.hide()

tick()                                    // today's body, plus
  speakTurn !== null → speakPrompt?.setState(!vad || !voiceDetection ? "off" : vad.vadState, vad ? vad.pulse : 0, vad ? vad.nudgeSaidIt : false)
```
`onTable()`, `offerTablePhrase()`, `showCaption()`, `seatingCenter()`, `tablePos()`, `clearHighlight()` and the
arrow logic stay as they are. In prep (`orderStep` 0) tapping an empty table still teaches its number and sets
`chosenTable` (today's `orderStep < 5` branch).

### 5.3 Helpers

```
phrase                 private phrase = new PhraseHelperModel()        // the one model instance for the session
has                    (k: string) => this.audio.has(k)                // the bank lookup passed to canListen / missingClips
b                      this.phrase.build()
get phraseEditable()   active && phraseHelperVisible && (waitingFor === "ready" || (waitingFor === "user" && !!stepDef && !!stepDef.helper))
refreshEditable()      phraseHelper?.setEditable(phraseEditable); learn?.setLiveSlots(phraseSlotIds, phraseEditable)
refreshHighlight()     learn?.setHighlight(union of the offered cards' words and, while the helper is visible, phraseSlotIds)
seedPhrase(e)          if (!phrase.isEmpty) return                      // K4
                       id = canUseInPhrase(e.wordId) ? e.wordId : canUseInPhrase(session.liveWord) ? session.liveWord : ""
                       if (id) { phrase.setPattern("want"); phrase.useWord(id) }
mirrorPhrase()         copy phrase.testState() into phraseSlotIds / phrasePattern / phraseHu / phraseEn / phraseAudioKey
placeSurface()         the visible surface (PhraseHelper or PhraseChoices; never both) goes where the phrase row goes
                       today: on the tray (position + rotation of phraseTray) when phrasesOnCounter && nearTray,
                       else today's floating point with placeFacingUser. If a speak turn is open, SpeakPrompt goes
                       directly below it: surfacePos − surfaceUp × (surface.sizeCm.y / 2 + 1 + speakPrompt.sizeCm.y / 2),
                       same rotation (surfaceUp = the surface host transform's `up`).
```
Every view's panel is centred on its host SceneObject with +Z toward the user; the controller moves the host.

### 5.4 Editing the phrase (prep and step 2)

```
useWord(id)       if (!phraseEditable) return false; if (!phrase.useWord(id)) return false; rebuildPhrase(true); return true
addWord(id)       same with phrase.addWord(id)
setPattern(p, fromUser = true)   same with phrase.setPattern(p), rebuildPhrase(fromUser)
listenPhrase()    if (!phraseEditable) return false; b = phrase.build(); if (!canListen(b, has)) return false
                  audio.playVoice(b.audioKey); if (speakTurn) armVoice(b.audioKey); return true

rebuildPhrase(fromUser)
  b = phrase.build(); mirrorPhrase()
  phraseHelper?.setPhrase(b, canListen(b, has)); refreshHighlight(); learn?.setLiveSlots(b.slotIds, phraseEditable)
  helperTurn = orderStep === 2 && !!stepDef && !!stepDef.helper && waitingFor === "user"
  play = fromUser && playPhraseOnChange && canListen(b, has)
  if (helperTurn) {
    if (b.empty) closeSpeakTurn()
    else { vad?.disarm(); if (!speakTurn) beginSpeakTurn("fillings") }   // the turn and Said it stay open across edits
  }
  if (play) audio.playVoice(b.audioKey)
  if (helperTurn && !b.empty) { if (play) armVoice(b.audioKey) }          // without playback the mic stays off until Listen
```
- The model is the only authority: `useWord` refuses a non-ingredient and a word already in the phrase; `addWord`
  refuses a non-ingredient, a duplicate and a full phrase. No path collapses `[szalami, paradicsom]`.
- In prep there is no speak turn: edits only change and (by default) play the phrase.
- Editing and Listen are refused while `waitingFor === "server"` (a new `playVoice` would replace the server
  line's `onDone`).

### 5.5 Audio per action

| Action | Sound |
|---|---|
| Entering Use it live, showing the helper, `ReadyToOrderButton`, Said it, speech detected, speak prompt | none |
| Use this word / Add / pattern switch (when `playPhraseOnChange`) and `PhraseHelperListenButton` | voice `phraseAudioKey` (1 item: `p_kerek_<id>` / `p_nelkul_<id>`; 2–4 items: the `a+b+c` sequence; `lastVoiceKey` reports the whole key) |
| Phrase card pressed | voice `PhraseEntry.audio` (`p_jonapot`, `p_szendvicset_kerek`, `p_tejes_kave`, `p_itt_eszem`, `p_elvitelre`, `p_negyes_asztal`, `p_nyolcas_asztal`, `p_tizenkettes_asztal`, `p_koszonom`) |
| Server line | `s_*` as in §5.1; step 5 also SFX `AttentionChime` |
| Empty table tapped | `n_4` / `n_8` / `n_12` |

### 5.6 Invariants (tests rely on them)

1. Showing, choosing, listening and editing never push to `answers` and never change `orderStep`. Only `onSaid`
   pushes; only `readyToOrder()` leaves prep.
2. At most one answer surface is visible: `phrases.isVisible` and `phraseHelperVisible` are never both true.
3. `waitingForSpeech === true` ⇒ `SpeakPrompt` is visible with an enabled `SaidItButton` (same frame), and
   `orderStep` ∈ 1..6 with `waitingFor === "user"`. (The prompt may stay up to 0.6 s longer for "Heard you ✓".)
4. After a server line ends, `audio.lastVoiceKey` is that line's key until the learner presses something
   (no automatic phrase playback: DC3 `checkServerTurn`).
5. `phraseHu` is never `""` after `init()`.
6. The phrase is never cleared by `startOrder()`, `enterPrep()`, `finish()` or a mode switch.
7. `voicePlayCount` grows by one per clip part; tests compare it only after `!audio.isBusy()`.

---

## 6. Learn and pointing: rules (`WbwLearnController`)

### 6.1 `init()`

- Build `tracked` (`{l, word, bracket}`; no `hovered` field) and the `Brackets` group per learnable as today, with
  `markerTint("learn")` instead of `this.bracketColor`. **No** per-learnable `onTriggerEnd` / `onHoverEnter` /
  `onHoverExit` subscription here: the arbiter holds the only ones.
- `this.hover = new WbwHoverArbiter(this.tracked.map((t) => ({id: t.l.id, interactable: t.l.interactable})), {switchDwellSec: this.switchDwellSec, exitGraceSec: this.exitGraceSec})`
- `hover.setHoldSource(() => !!this.nameLabel && this.nameLabel.hovered)`
- `hover.setSuppressSource(() => this.wordCard.isVisible ? this.activeCardWordId : "")`
- `hover.onLabelChanged.add((c) => c.id ? this.showLabel(c.id) : this.hideLabel())`
- `hover.onSelected.add((s) => this.onObjectSelect(s.id))`
- Card: `wordCard.onPlay → playWord()`, `onSave → saveCurrent()`, `onClose → closeCard()`, `onUseLive → useLiveFromCard()`.
- Label (if present): `nameLabel.setObstacles(learnables)`;
  `nameLabel.onSelect.add((s) => { if (this.pointMode === "learn") this.selectById(s.id) })`;
  `nameLabel.onUseWord.add((id) => this._onUse.invoke(id))`; `nameLabel.onAddWord.add((id) => this._onAdd.invoke(id))`.
- `UpdateEvent → tick()` (as today). `LateUpdateEvent →`
  `this.hover.update(); this.nameLabel?.setPointerDot(this.hover.pointerDotVisible ? this.hover.pointerDotPos : null, this.pointMode)`.
- `OnDestroyEvent → this.hover.dispose()`. Keep the `print("WbwLearn: tracking …")` line.

### 6.2 Card (steady)

```
onObjectSelect(id)   pointMode === "learn" && active → select(tracked of id)
                     pointMode === "live"            → hover.pin(id, 2)        // nothing else: no audio, no card, no phrase change
select(t)            if (!active) return; audio.playSfx("UiClick")
                     same word as the open card → speak(w.audio, "word"); return      // replay; card not rebuilt or moved
                     wordCard.show({id, hu, en, saved: session.isSaved(id)}); activeCardWordId / activeCardWord; cardPlayCount = 0
                     today's placement block unchanged (incl. hudClearDeg); openedAt = cam; speak(w.audio, "word")
                     applyBrackets(); if a label for another word is up → nameLabel.refresh({card: cardObstacle()})
speak(key, kind)     if (kind === "word") cardPlayCount++; wordCard.setPlaying(kind); audio.playVoice(key, () => setPlaying("") if still the same card)
playWord()           speak(word.audio, "word")                                  // "Listen again"
saveCurrent()        session.save(id); audio.playSfx("SaveConfirm"); wordCard.setSaved()      // the card stays; nothing else
closeCard()          wordCard.hide() if visible; activeCardWordId = ""; activeCardWord = ""; applyBrackets(); nameLabel?.refresh({card: null})
useLiveFromCard()    id = activeCardWordId; closeCard(); this._onUseLive.invoke(id)
```
- The card closes only on its close button, another object's select, walking more than `walkAwayCm` from where it
  opened (today's check in `tick()`), "Use it live →", or leaving Learn (`setActive(false)` → `closeCard()`).
- `saveCurrent()` never touches the order controller, the phrase or the mode. `playSentence()` is deleted.
- `cardObstacle()` = `{pos: wordCard.getSceneObject().getTransform().getWorldPosition(), size: wordCard.cardSize}`
  while the card is visible, else `null`.

### 6.3 Label

```
showLabel(id)        t = tracked of id; w = t.word
                     nameLabel?.show({id, hu: w.hu, en: w.en, so: t.l.so, size: t.l.size},
                                     {mode: pointMode, live: liveStateFor(id), card: cardObstacle()})
                     labelMode = pointMode; applyBrackets()
hideLabel()          nameLabel?.hide(); labelMode = ""; applyBrackets()
liveStateFor(id)     pointMode !== "live" → undefined
                     else {phraseIds: liveSlotIds, maxSlots: MAX_SLOTS, usable: liveCanEdit && canUseInPhrase(id)}
setPointMode(m)      pointMode = m; hover.setLabelsEnabled(m !== "off" && !!nameLabel); hover.refresh()
setLiveSlots(ids, canEdit)   liveSlotIds = ids.slice(); liveCanEdit = canEdit; if (labelMode === "live") hover.refresh()
pointAtById(id)      hover.pointAt(id)          clearPoint()   hover.clearPoint()
```
- There is **no `audio.*` call** on the label path, in `setPointMode`, `setLiveSlots`, or the pointer dot.
- The label is word + meaning. In Learn, selecting the label = selecting the object. In Use it live the label
  surface does nothing; only its buttons act, and only while `usable`.
- A label never shows for the word on the open card (suppress source), and the pointer on the label keeps it up
  (hold source).

### 6.4 Brackets (one bracket, K6)

```
applyBrackets()      for every tracked t:
                       inSet = active ? bracketedIds has t.l.id : highlightIds has t.l.id
                       t.bracket.enabled = inSet && t.l.id !== this.labelForId
                       tint: active → (open card's word ? markerTint("focus") : markerTint("learn")); else markerTint("live")
                       scale 1.08 for the open card's word, else 1
```
- Called from `scan()` (after it sets `bracketedIds`), `setHighlight()`, `setActive()`, `showLabel()`,
  `hideLabel()`, `select()`, `closeCard()`. `scan()` stays Learn-only and no longer looks at hover.
- `markerTint()` is read at use time, never cached in a field. `scan()` runs five times a second: it may set only
  `enabled` there and leave the tint and scale to the calls that change state.
- `setActive(false)` clears `bracketedIds` (as today); the enabled set is then `highlightIds`. `setActive(true)`
  clears `highlightIds` (as today). `setHighlight(ids)` keeps only ids that are learnables.
- LEAF rule: the number of enabled `Brackets` objects equals
  `bracketedIds.filter((id) => id !== labelForId).length` in Learn. `NameLabelBracket` is the bracket of the
  labelled object.
- `tick()` while `!active` calls `faceBrackets` only when `highlightIds.length > 0` (as today).

### 6.5 Invariants

1. Pointing (hover) plays no voice and no SFX: `audio.voicePlayCount`, `audio.sfxPlayCount` and `audio.lastSfxKey`
   do not change between hover enter and a select.
2. At most one `NameLabel` object is enabled; `nameLabel.labelForId === learn.labelForId` after the same frame's
   LateUpdate.
3. A `WordCard` exists only in Learn. Saving changes `session.saved`, the HUD badge and the card's Save control,
   and nothing else (`order.answers`, `order.orderStep`, `order.phraseSlotIds` stay as they were).
4. `cardPlayCount` is 1 right after a card opens and grows by one for "Listen again" and for a re-select of the
   same object.

---

## 7. Arrival: phases (`WbwMain`)

| `arrivalPhase` | Starts | Shows / plays | Ends |
|---|---|---|---|
| `setup` | Lens start | setup panel (as today); HUD hidden | `SetupConfirmButton` |
| `walkIn` | `confirmSetup()`: `setupComplete = true`, SFX `ToastPop`, setup hidden; remember the head position and time | nothing new; HUD stays hidden | `walkedSinceStartCm >= toastAfterWalkCm` (`toastTrigger = "walk"`) or `toastFallbackSec` passed (`"timeout"`) |
| `toast` | trigger | `toast.show(toastText, toastSeconds)` at `inView(80, 14)`, lazy-follows | `toastSeconds + 0.35 + 0.3` s after the toast appeared |
| `suggest` | then | SFX `ToastPop`; `suggestion.show(session.savedCount, "learn")` at `inView(70, -3)`, lazy-follows, frozen while `suggestion.hoveredOption !== ""` | a pick (`onSuggestionPick`) or any `selectMode()` |
| `done` | pick | suggestion hidden; **HUD shown** (`hud.show()`, `hud.setSaved(...)`, `hud.setMode(...)`); SFX `UiClick` | — |

```
confirmSetup(skipArrival = false)        // private; guard: setupComplete → return
  setupComplete = true; audio.playSfx("ToastPop"); setupPanel.hide()
  if (skipArrival || !arrivalSuggestion || !suggestion)        // old behaviour = today's body, unchanged
    hud.show(); hud.setSaved(...); hud.setMode(...); toast.show(...) at inView(80, 14); arrivalPhase = "done"; toastTrigger = "skip"
    after toastSeconds + 0.2 → if (mode === "none" && firstMode !== "none") selectMode(firstMode)
  else arrivalPhase = "walkIn"; walkStart = camPos(); walkT0 = getTime()

tickArrival()                            // every frame
  walkIn  : walkedSinceStartCm = horizDist(camPos(), walkStart); on trigger → show the toast, arrivalPhase = "toast"
  toast   : toastFollowing = lazyFollowStep(toast.getSceneObject(), 80, 14, getDeltaTime(), toastFollowing) while toast.isVisible;
            after toastSeconds + 0.65 s → showSuggestion()
  suggest : suggestFollowing = lazyFollowStep(suggestion.getSceneObject(), 70, -3, getDeltaTime(), suggestFollowing, suggestion.hoveredOption !== "")
            suggestAutoPickSec > 0 and that time passed → onSuggestionPick("learn")

onSuggestionPick(o)                      // private
  suggestionPick = o; audio.playSfx("UiClick"); finishArrival()
  o === "live" → session.setLiveEntry("menu", ""); o !== "later" → selectMode(o as Mode)       // "later": mode stays "none"

finishArrival()                          // private; also called at the top of selectMode() when arrivalPhase !== "done"
  suggestion?.hide(); arrivalPhase = "done"; if (!hud.isVisible) { hud.show(); hud.setSaved(session.savedCount); hud.setMode(MODE_LABEL[session.mode]) }

selectMode(m)                            // public, as today, with two lines first
  modeMenu.hide(); if (!session.setupComplete) confirmSetup(true); if (arrivalPhase !== "done") finishArrival(); …
```
Rules:
- Nothing auto-starts while `arrivalSuggestion` is true: `currentMode` stays `"none"` until a tile is picked.
- No voice clip plays during the arrival (`voicePlayCount` unchanged from Lens start to the pick).
- `skipSetup` (iteration aid) calls `confirmSetup(true)`: today's behaviour (HUD, toast, `firstMode` after the
  toast), no suggestion. `selectMode()` before setup also uses `confirmSetup(true)`, as today.
- `checkRaisedHand()` also requires `arrivalPhase === "done"`.
- The suggestion never comes back when the mode later returns to `"none"` (DC5 closes Practice into `"none"`).
- Entering Use it live from the card: `learn.onUseLive` → `session.setLiveEntry("card", id)` → `selectMode("live")`
  → `applyMode` → `order.setActive(true)` → seeding (K4) → prep (K1).

---
## 8. LEAF: helper API and exact assertions

Tests read game state only through the fields marked **[LEAF]** in §4 and the names in §3.4. They wait on state
(`waitFor`), never on fixed sleeps, except the 0.8 s show-token check in DC3. Scenarios run one at a time.

### 8.1 `WbwLeafHelpers.ts` — bodies of the new and changed helpers

New imports: `InteractionManager` (`SpectaclesInteractionKit.lspkg/Core/InteractionManager/InteractionManager`),
`InteractorInputType` (`SpectaclesInteractionKit.lspkg/Core/Interactor/Interactor`).

```ts
export class WbwPointer extends DefaultLeafInteractor {
  currentName: string = ""
  private current: Interactable | null = null
  async hold(target: Interactable, name: string): Promise<void> {
    if (this.current) await this.release()
    await withTimeout(this.enterHover(target), 3000, `pointer could not hover "${name}"`)
    this.current = target
    this.currentName = name
  }
  async release(): Promise<void> {
    if (!this.current) return
    const was = this.currentName
    this.current = null
    this.currentName = ""
    try { await withTimeout(this.exitHover(), 2000, `pointer release of "${was}"`) }
    catch (e) { log(`pointer release of ${was}: ${e}`) }      // a target that disabled itself already sent its exit
  }
}

// WbwTester
constructor() { this.main = getMain(); this.interactor = new DefaultLeafInteractor("WbwLeafInteractor")
                this.pointer = new WbwPointer("WbwLeafPointer"); this.quietMouse() }      // NOT the mic here (F14)

async tap(name, timeoutMs = 6000)   // first line: if (this.pointer.currentName === name) await this.pointer.release(); rest as today

quietMouse(): void                  // every enabled Mouse interactor from InteractionManager.getInstance().getInteractorsByType(InteractorInputType.Mouse)
                                    // not yet in this.mice → enabled = false, remember it. try/catch + log. Idempotent.
restoreMouse(): void                // re-enable the remembered ones, clear the list
quietMic(): void                    { const v = this.main.vad; if (v && !v.ignoreMicForTests) v.ignoreMicForTests = true }
restoreHead(): void                 // today's body + this.restoreMouse() + void this.pointer.release()

async learnAndSave(id: string): Promise<void> {
  const before = this.main.savedCount
  await waitFor(() => !this.card.isVisible, "word card closed before selecting a new object", 5000)
  await this.tap(`Learnable_${id}`)
  await waitFor(() => this.card.isVisible && this.card.currentWordId === id, `word card open for '${id}'`)
  await this.tap("WordCardSaveButton")
  await waitFor(() => this.main.savedCount === before + 1 && this.main.savedWords.indexOf(id) >= 0, `'${id}' saved`)
  await waitFor(() => this.card.savedShown && this.card.isVisible, `'${id}' card stays open showing Saved`)
  await this.tap("WordCardCloseButton")
  await waitFor(() => !this.card.isVisible, "word card closed")
}

async waitForUserTurn(step: number, timeoutMs: number = 25000): Promise<void> {
  await waitFor(() => this.order.orderStep === step && this.order.waitingFor === "user" && (this.phrases.isVisible || this.order.phraseHelperVisible),
    `order step ${step} waiting for the user (got step ${this.order.orderStep}, waitingFor '${this.order.waitingFor}')`, timeoutMs)
}

async startOrdering(): Promise<void> {
  await waitFor(() => this.order.active && this.order.waitingFor === "ready" && this.order.phraseHelperVisible && this.hasEnabledInteractable("ReadyToOrderButton"),
    "Use it live prep state with Ready to order", 6000)
  if (this.order.orderStep !== 0) throw new Error(`prep must keep orderStep 0, got ${this.order.orderStep}`)
  await this.tap("ReadyToOrderButton")
  await waitFor(() => this.order.orderStep === 1 && this.order.waitingFor !== "ready", "Ready to order starts the greeting (step 1)", 4000)
}

async sayIt(): Promise<void> {
  this.quietMic()
  const step = this.order.orderStep, n = this.order.answers.length
  await waitFor(() => this.order.waitingForSpeech && this.hasEnabledInteractable("SaidItButton"), `step ${step} waits for the learner to say it`, 12000)
  await this.tap("SaidItButton")
  await waitFor(() => !this.order.waitingForSpeech && this.order.answers.length === n + 1, `step ${step}: Said it accepted`, 4000)
}

async pointHold(id: string): Promise<void> {
  const it = findInteractablesByName(`Learnable_${id}`, undefined, true)[0]
  if (!it) throw new Error(`Learnable_${id} not found`)
  await this.pointer.hold(it, `Learnable_${id}`)
  await waitFor(() => this.learn.labelForId === id, `label for ${id}`, 2000)
}
async pointRelease(): Promise<void> { await this.pointer.release() }

async useWord(id: string, add: boolean = false): Promise<void> {
  const btn = add ? "AddWordButton" : "UseThisWordButton"
  await this.pointHold(id)
  await waitFor(() => this.hasEnabledInteractable(btn), `${btn} for ${id}`, 2000)
  await this.tap(btn)
  await waitFor(() => this.order.phraseSlotIds.indexOf(id) >= 0, `${id} in the phrase`, 2000)
  await this.pointRelease()
}

async waitAudioIdle(timeoutMs: number = 15000): Promise<void> { await nextFrame(); await waitFor(() => !this.audio.isBusy(), "audio idle", timeoutMs) }
```
Never hold the pointer on the object `tap()` is about to trigger (both interactors are `CustomController`; the
tap's hover-enter would never fire). `tap()` guards the same-name case; `useWord()` taps a label button, which is
a different target.

### 8.2 `completeSetup()` (replaces today's tail after the toast `Message` wait)

```ts
await waitFor(() => this.main.setupPanel.isVisible && this.hasEnabledInteractable("SetupConfirmButton"), "setup panel visible", 15000)   // unchanged
this.quietMouse(); this.quietMic()                       // NEW, lazy: WbwMain.start() has created the detector by now
… unchanged up to and including:
await waitFor(() => textOf("Message") === "Café detected (demo)", "toast Message text visible", 3000)
await waitFor(() => this.main.suggestionVisible && this.hasEnabledInteractable("SuggestLearnButton"), "arrival suggestion panel", 8000)
if (this.main.currentMode !== "none") throw new Error("no mode may start before the learner picks one")
if (this.hud.isVisible) throw new Error("the HUD must stay hidden until a pick")
await this.tap("SuggestLearnButton")
await waitFor(() => this.main.currentMode === "learn" && !this.main.suggestionVisible, "Learn picked on the suggestion", 4000)
await this.setHead(this.eyeAt(0, 0), 0, -15)             // tests expect the counter spot
if (!this.learn.active) throw new Error("WbwLearnController.active is false after picking Learn")
await waitFor(() => textOf("ModeLabel") === "Mode: Learn", "HUD ModeLabel 'Mode: Learn'", 3000)
log("setup complete → suggestion → Learn")
```
The toast wait (3000 ms) fits the 1.5 s fallback; the suggestion appears about 5.2 s after Start.

### 8.3 DC1 `DC1_ModeMenu.ts`

Unchanged except the Use it live block. Replace
`await waitFor(() => t.order.orderStep === 1, "Use it live starts the scripted order at step 1")` with:
```ts
await waitFor(() => t.order.waitingFor === "ready" && t.order.phraseHelperVisible, "Use it live opens with the phrase helper; the server waits")
expect(t.order.orderStep, "nothing is ordered before Ready to order").toBe(0)
expect(t.order.phraseSlotIds.length, "a saved word never fills the phrase").toBe(0)      // olives were saved, not carried
expect(t.order.phraseHu, "empty phrase").toBe("Kérek … a szendvicsembe.")
await t.startOrdering()
expect(t.order.orderStep, "Ready to order starts the scripted order at step 1").toBe(1)
```
All other DC1 lines keep passing: `completeSetup()` and `learnAndSave()` are helper changes; `ModeLabel` texts
(`"Mode: Learn"`, `"Mode: Practice"`, `"Mode: Use it live"`), `SavedBadge`, `ActiveLabel`, `SavedCount`, the
`Mode*Button` labels and toggle states are unchanged.

### 8.4 DC2 `DC2_Learn.ts`

Header: new criterion text (pointing shows the label without click or sound; the card plays once; Listen again;
Saved without ordering). New import: `wordById` from `../../Scripts/WbwVocab`.

1. `checkBrackets(where)`: skip `id === learn.labelForId` in the per-id loop, and compare the count with
   `learn.bracketedIds.filter((id) => id !== learn.labelForId).length`.
2. After "back to the counter" (`await t.setHead(t.eyeAt(0, 0), 0, -15)`) and before `const plays0`, insert:
```ts
// ── point to reveal: label beside the object, no click, no sound, one bracket ──
await sleep(400)                                        // scan settles at the counter
const mid = learn.bracketedIds[0], mw = wordById(mid)!
const pv0 = audio.voicePlayCount, ps0 = audio.sfxPlayCount
await t.pointHold(mid)
expect(learn.hoveredId, "hoveredId").toBe(mid)
expect(learn.labelMode, "label mode").toBe("learn")
const label = findEnabled("NameLabel")
expect(textOf("NameLabelHu", label), "label Hungarian").toBe(mw.hu)
expect(textOf("NameLabelEn", label), "label English").toBe(mw.en)
expect(findEnabled("NameLabelChip") === undefined, "no chip on the label").toBe(true)
expect(audio.voicePlayCount, "pointing plays no voice").toBe(pv0)
expect(audio.sfxPlayCount, "pointing plays no sound effect").toBe(ps0)
expect(card.isVisible, "pointing opens no card").toBe(false)
const ownBr = child(findEnabled(`Learnable_${mid}`)!, "Brackets")
expect(ownBr !== undefined && !ownBr.enabled, "the object's own Brackets are hidden while its label shows").toBe(true)
expect(findEnabled("NameLabelBracket") !== undefined, "the one hover bracket").toBe(true)
checkBrackets("pointing")
if (global.deviceInfoSystem.isEditor()) {
  expect(learn.pointerDotVisible && findEnabled("PointerDot") !== undefined, "pointer dot on the pointed object").toBe(true)
  expect(learn.pointerRayVisible, "no ray band in the Preview").toBe(false)
}
await t.tap("NameLabel")                                // selecting the label opens the card
await waitFor(() => card.isVisible && card.currentWordId === mid, "card via the label")
expect(learn.cardPlayCount, "played once").toBe(1)
expect(audio.lastVoiceKey, "the word's clip").toBe(mw.audio)
await t.pointRelease()
await t.tap("WordCardCloseButton")
await waitFor(() => !card.isVisible && learn.labelForId === "", "card closed, label gone", 3000)
await waitFor(() => !learn.pointerDotVisible, "pointer dot gone", 2000)
```
3. Olives card (after `await t.tap("Learnable_olivabogyo")` and the existing HU / EN asserts) replace the example
   sentence and illustration asserts with:
```ts
expect(child(cardRoot, "Illustration") === undefined, "no illustration on the compact card").toBe(true)
expect(textOf("ExampleHu", cardRoot) === null, "no example sentence on the compact card").toBe(true)
expect(textOf("ChipLabel", cardRoot), "card mode chip").toBe("Learn")
expect(learn.cardPlayCount, "pronunciation played once on open").toBe(1)
await waitFor(() => textOf("WordCardStatus", findEnabled("WordCard")) === "Ready to listen again" && card.playing === "", "status after the clip", 6000)
expect(textOf("Label", findEnabled("WordCardPlayButton")), "Listen again label").toBe("Listen again")
expect((textOf("Label", findEnabled("WordCardUseLiveButton")) ?? "").indexOf("Use it live") === 0, "Use it live link").toBe(true)
```
   keep `audio.lastVoiceKey === "w_olivabogyo"` and `audio.voicePlayCount === plays0 + 1`.
4. Listen again: keep the tap and the `plays0 + 2` wait; add `expect(learn.cardPlayCount, "Listen again counted").toBe(2)`.
   Then re-select the same object:
```ts
const cardPos0 = findEnabled("WordCard")!.getTransform().getWorldPosition(), shows0 = card.showCount
await t.tap("Learnable_olivabogyo")
await waitFor(() => learn.cardPlayCount === 3, "re-selecting the same object replays it")
expect(card.showCount, "the card is not rebuilt").toBe(shows0)
expect(findEnabled("WordCard")!.getTransform().getWorldPosition().distance(cardPos0) < 0.5, "the card does not move").toBe(true)
```
5. Delete the `WordCardPlaySentenceButton` block.
6. Save: replace the "card flies into the counter and hides" wait with
```ts
await waitFor(() => card.isVisible && card.savedShown && learn.activeCardWordId === "olivabogyo", "card stays open showing Saved", 3000)
expect((textOf("Label", findEnabled("WordCardSaveButton")) ?? "").indexOf("Saved") === 0, "save button shows Saved").toBe(true)
expect(t.order.phraseSlotIds.length, "saving never fills the phrase").toBe(0)
expect(t.order.orderStep, "saving never orders").toBe(0)
expect(t.order.answers.length, "saving never answers").toBe(0)
```
   keep the `SavedBadge` and `SaveConfirm` asserts; then `await t.tap("WordCardCloseButton")` + wait closed before
   the reopen tap. Reopen assert: `indexOf("Saved") === 0` instead of `.toBe("Saved")`.
7. Walk-away, second save (`learnAndSave("sajt")`), move and mode switches: unchanged. (Switching to Use it live
   now lands in prep; DC2 asserts nothing there.)

### 8.5 DC3 `DC3_OrderingAtCounter.ts`

Exports stay: `checkServerTurn(t, step, hu, en, voiceKey)` (body unchanged), `checkCards(t, step, cards)` (body
unchanged), `orderUpToTable(t)`. New import: `sleep` from `Leaf.lspkg/Utils/common/Utils`. `run()` is unchanged
(`completeSetup` → `setHead(eyeAt(0, 0), 0, -15)` → `switchModeViaMenu("ModeUseLiveButton", "live")` →
`orderUpToTable(t)` → table caption / arrow asserts). `orderUpToTable(t)` becomes:
```ts
const o = t.order, a = t.audio
// prep — the server waits; the phrase helper is the only surface (K1)
await waitFor(() => o.waitingFor === "ready" && o.phraseHelperVisible, "prep state: helper shown, server quiet")
const v0 = a.voicePlayCount
expect(o.orderStep, "prep keeps step 0").toBe(0)
expect(o.orderStepName, "prep step name").toBe("prep")
expect(t.caption.isVisible, "no server caption in prep").toBe(false)
expect(t.phrases.isVisible, "no phrase cards in prep").toBe(false)
const helper0 = findEnabled("PhraseHelper")
expect(helper0 !== undefined, "PhraseHelper visible").toBe(true)
expect(textOf("PhraseHelperTitle", helper0), "helper heading").toBe("SAY IT AT THE COUNTER")
expect(textOf("ChipLabel", helper0), "helper mode chip").toBe("Use it live")
expect(o.phraseHu, "empty phrase (nothing carried)").toBe("Kérek … a szendvicsembe.")
expect(o.phraseEn, "empty phrase EN").toBe("I'd like … in my sandwich.")
expect(o.phraseAudioKey, "nothing to play").toBe("")
expect(t.hasEnabledInteractable("PhraseHelperListenButton"), "Listen inactive while empty").toBe(false)
expect(t.hasEnabledInteractable("ReadyToOrderButton"), "Ready to order offered").toBe(true)
expect(o.waitingForSpeech, "nothing to say in prep").toBe(false)
// reuse the same phrase: leave something out …
await t.useWord("uborka")
expect(o.phraseHu, "pickles HU").toBe("Kérek savanyú uborkát a szendvicsembe.")
await t.tap("PatternWithoutButton")
await waitFor(() => o.phrasePattern === "without", "'… nélkül, kérem.' pattern")
expect(o.phraseHu, "without HU").toBe("Savanyú uborka nélkül, kérem.")
expect(o.phraseEn, "without EN").toBe("Without pickles, please.")
expect(o.phraseAudioKey, "without audio").toBe("p_nelkul_uborka")
// … and with other words
await t.tap("PatternWantButton")
await waitFor(() => o.phrasePattern === "want", "'Kérek …' pattern")
await t.useWord("szalami")
expect(o.phraseSlotIds.join(","), "Use this word replaces the slot").toBe("szalami")
expect(o.phraseHu, "want HU").toBe("Kérek szalámit a szendvicsembe.")
expect(o.phraseAudioKey, "want audio").toBe("p_kerek_szalami")
await t.useWord("paradicsom", true)
expect(o.phraseHu, "combined HU").toBe("Kérek szalámit és paradicsomot a szendvicsembe.")
expect(o.phraseEn, "combined EN").toBe("I'd like salami and tomato in my sandwich.")
expect(o.phraseAudioKey, "combined audio").toBe("c_kerek+a_szalami+c_es+a_paradicsom+c_a_szendvicsembe")
expect(findEnabled("PhraseHelper")!.uniqueIdentifier, "same helper object across edits").toBe(helper0!.uniqueIdentifier)
await t.waitAudioIdle()                                  // "+ és" auto-played this key; count parts only when idle
const lv0 = a.voicePlayCount
await t.tap("PhraseHelperListenButton")
await waitFor(() => a.voicePlayCount > lv0 && a.lastVoiceKey === o.phraseAudioKey, "Listen plays the phrase again")
expect(o.orderStep, "showing, editing and listening never submit").toBe(0)
expect(o.waitingFor, "still waiting for Ready to order").toBe("ready")
expect(o.answers.length, "nothing answered").toBe(0)
expect(o.lastServerLine, "the server has not spoken").toBe("")
expect(a.voicePlayCount > v0, "the learner's own phrase played").toBe(true)
await t.startOrdering()

// step 1 — greet (two cards; the helper is hidden)
await checkServerTurn(t, 1, "Jó napot! Mit kér?", "Hello, what would you like?", "s_mit_ker")
expect(o.orderStepName, "step 1 name").toBe("greet")
expect(o.phraseHelperVisible, "helper hidden during step 1").toBe(false)
checkCards(t, 1, [{id: "jonapot", hu: "Jó napot!", en: "Hello!"}, {id: "szendvicset", hu: "Egy szendvicset kérek.", en: "I'd like a sandwich, please."}])
expect(o.waitingForSpeech, "no turn before a card is chosen").toBe(false)
await t.tap("PhraseCard_jonapot")
await waitFor(() => a.lastVoiceKey === "p_jonapot", "'Jó napot!' card plays its audio")
expect(o.orderStep, "choosing does not submit").toBe(1)
expect(o.chosenPhraseId, "chosen card").toBe("jonapot")
await t.sayIt()
expect(o.orderStep, "greeting back does not advance").toBe(1)
expect(o.offeredPhraseIds.join(","), "step 1 cards still offered").toBe("jonapot,szendvicset")
await t.tap("PhraseCard_szendvicset")
await waitFor(() => a.lastVoiceKey === "p_szendvicset_kerek", "'Egy szendvicset kérek.' plays its audio")
expect(o.orderStep, "choosing does not submit").toBe(1)
await sleep(800)                                         // the previous "Heard you ✓" hide must not hide this prompt
expect(o.waitingForSpeech && t.hasEnabledInteractable("SaidItButton"), "Said it still offered 0.8 s after choosing").toBe(true)
await t.sayIt()

// step 2 — fillings: the prepared phrase is the answer (no cards)
await checkServerTurn(t, 2, "Mit kér bele?", "What would you like in it?", "s_mit_ker_bele")
expect(o.orderStepName, "step 2 name").toBe("fillings")
expect(t.phrases.isVisible, "no phrase cards at step 2").toBe(false)
expect(o.offeredPhraseIds.length, "nothing offered as cards").toBe(0)
for (const old of ["sonka_sajt", "kerhetek_oliva", "uborka_nelkul", "szalami_sajt", "csirke_paprika", "done"]) {
  expect(findEnabled(`PhraseCard_${old}`) === undefined, `no PhraseCard_${old}`).toBe(true)
}
expect(findEnabled("PhraseHelper") !== undefined && o.phraseHelperVisible, "phrase helper is the answer surface").toBe(true)
expect(t.hasEnabledInteractable("ReadyToOrderButton"), "no Ready to order at step 2").toBe(false)
expect(o.phraseHu, "prepared phrase kept").toBe("Kérek szalámit és paradicsomot a szendvicsembe.")
await waitFor(() => o.waitingForSpeech && t.hasEnabledInteractable("SaidItButton"), "the turn opens when the question ends (phrase ready)", 3000)
await t.tap("PatternWithoutButton")                      // an edit with the turn open
await waitFor(() => o.phrasePattern === "without", "pattern switch at step 2")
expect(o.phraseHu, "without, two words").toBe("Szalámi és paradicsom nélkül, kérem.")
expect(o.phraseAudioKey, "without audio, two words").toBe("w_szalami+c_es+w_paradicsom+c_nelkul+c_kerem")
expect(o.waitingForSpeech, "the turn stays open across edits").toBe(true)
expect(o.orderStep, "editing never submits").toBe(2)
await t.tap("PatternWantButton")
await waitFor(() => o.phrasePattern === "want", "back to 'Kérek …'")
await t.sayIt()
expect(o.fillingsSaid, "what was said at step 2").toBe("Kérek szalámit és paradicsomot a szendvicsembe.")

// step 3 — drink, step 4 — here or takeaway: as today, each followed by Said it
await checkServerTurn(t, 3, "Inni valamit?", "Anything to drink?", "s_inni")
expect(o.orderStepName, "step 3 name").toBe("drink")
checkCards(t, 3, [{id: "tejes_kave", hu: "Egy kicsi tejes kávét kérek.", en: "A small coffee with milk, please."}])
await t.tap("PhraseCard_tejes_kave")
await waitFor(() => a.lastVoiceKey === "p_tejes_kave", "coffee card plays its audio")
await t.sayIt()
await checkServerTurn(t, 4, "Itt fogyasztja vagy elvitelre?", "For here or to take away?", "s_itt_vagy_elvitel")
expect(o.orderStepName, "step 4 name").toBe("here_or_takeaway")
checkCards(t, 4, [{id: "itt_eszem", hu: "Itt eszem.", en: "I'll eat here."}, {id: "elvitelre", hu: "Elvitelre, kérem.", en: "Takeaway, please."}])
await t.tap("PhraseCard_itt_eszem")
await waitFor(() => a.lastVoiceKey === "p_itt_eszem", "'Itt eszem.' plays its audio")
await t.sayIt()
// step 5 starts (unchanged three lines), then:
expect(o.answers.join(","), "answers so far").toBe("jonapot,szendvicset,fillings,tejes_kave,itt_eszem")
```
Header comment: prep + phrase helper; every answer is chosen, played, then said (Said it in the Preview).

### 8.6 DC4 `DC4_TableNumber.ts`

Unchanged except two added lines:
- after `await waitFor(() => a.lastVoiceKey === "p_nyolcas_asztal", …)` → `await t.sayIt()`;
- after `await t.tap("PhraseCard_koszonom")` → `await t.sayIt()` (before the step-7 wait).
The occupied-table block still holds (`a.voicePlayCount` unchanged, `o.waitingFor === "table"`), and
`a.lastVoiceKey === "p_koszonom"` at step 7 still holds because Said it and `finish()` play no voice.

### 8.7 DC5 `DC5_Practice.ts`

Body unchanged except the seat (K21):
`const seat = t.eyeAt(-145, 385 - 75)` → `const seat = table.add(new vec3(0, 160, -80))` (80 cm on the counter
side of `Table_8`, read at runtime), keeping `await t.setHead(seat, t.yawToward(seat, table), -25)`.

### 8.8 `StoryTour.ts` (new scenario `TOUR_Story`, class `StoryTour`)

Start from `drafts/StoryTour.ts`. Changes:
1. Use the helper's `WbwPointer` through `t.pointer` (delete the local class) and the tester's `quietMouse()` /
   `restoreMouse()` (delete `Tour.quietMouse` / `restoreMouse`). `Tour.tap()` delegates to `t.tap()`.
2. Delete `REAL_VOICE_SECS` and its block (F13). `Tour.sayIt()` calls `t.quietMic()` first.
3. `phaseCState`: add `pointerDotVisible`, `waitingFor`, `orderStepName`; keep the rest.
4. L3: replace the hard ray assert with
   `if (global.deviceInfoSystem.isEditor()) { expect(S.pointerRayVisible()).toBe(false); expect(S.pointerDotVisible()).toBe(true) }`
   and add the one-bracket check (the cucumber's own `Brackets` disabled, `NameLabelBracket` enabled).
5. U2: delete the label chip check; add `findEnabled("NameLabelChip") === undefined` (soft).
6. U1–U7 follow the prep flow:

| Beat | Action | Assertions (hard unless marked soft) |
|---|---|---|
| L13 | tap `WordCardUseLiveButton` | `m.currentMode === "live"`, `!card.isVisible`, `m.currentModeLabel === "Use it live"` |
| U1 | look down at the tray | `o.waitingFor === "ready"`, `o.orderStep === 0`, `o.orderStepName === "prep"`, `S.phraseHelperVisible()`, `!t.caption.isVisible`, `a.voicePlayCount === voiceBeforeLive` (nothing played on opening), `textOf("PhraseHelperTitle", helper) === "SAY IT AT THE COUNTER"`, `textOf("ChipLabel", helper) === "Use it live"`, `S.phraseSlotIds() === "uborka_friss"`, `S.phrasePattern() === "want"`, `S.phraseHu() === "Kérek uborkát a szendvicsembe."`, `S.phraseEn() === "I'd like cucumber in my sandwich."`, `S.phraseAudioKey() === "p_kerek_uborka_friss"`, `t.hasEnabledInteractable("ReadyToOrderButton")`, `!S.waitingForSpeech()`; soft: HUD shows `HudModeChip` |
| U1b (optional) | tap `PhraseHelperListenButton` | `a.lastVoiceKey === "p_kerek_uborka_friss"`; `o.orderStep === 0` |
| U2 | point `Learnable_szalami` | `S.labelForId() === "szalami"`, `UseThisWordButton` and `AddWordButton` enabled, `S.labelMode() === "live"` (soft), `a.voicePlayCount` unchanged |
| U3 | tap `UseThisWordButton` | `S.phraseSlotIds() === "szalami"`, HU `"Kérek szalámit a szendvicsembe."`, EN `"I'd like salami in my sandwich."`, key `p_kerek_szalami`, same `PhraseHelper` `uniqueIdentifier`, no `WordCard`, `o.orderStep === 0`, `!S.waitingForSpeech()`; then `waitAudioIdle` |
| U4 | point `Learnable_paradicsom`, tap `AddWordButton` | slots `"szalami,paradicsom"`, HU `"Kérek szalámit és paradicsomot a szendvicsembe."`, EN `"I'd like salami and tomato in my sandwich."`, key `c_kerek+a_szalami+c_es+a_paradicsom+c_a_szendvicsembe`, same helper id |
| U5 | tap `PhraseHelperListenButton` after audio idle | a new playback (`voicePlayCount` grew, `lastVoiceKey === phraseAudioKey`); `o.orderStep === 0` |
| U5b (optional) | `PatternWithoutButton`, `PatternWantButton` | `"Szalámi és paradicsom nélkül, kérem."` / `w_szalami+c_es+w_paradicsom+c_nelkul+c_kerem`, then back with the slots kept |
| U6 | look up, tap `ReadyToOrderButton` | before: `o.waitingFor === "ready"`, `o.answers.length === 0`, `o.lastServerLine === ""`; after: `o.orderStep === 1`, `o.lastServerLine === "Jó napot! Mit kér?"`, `a.lastVoiceKey === "s_mit_ker"` (soft), `!S.phraseHelperVisible()` |
| U7 | `answerTurn(1, "szendvicset", "p_szendvicset_kerek")` | choosing does not submit; Said it advances |
| U8 | step 2 | `t.waitForUserTurn(2)`, `o.orderStepName === "fillings"`, `o.offeredPhraseIds.length === 0`, `!t.phrases.isVisible`, the six old `PhraseCard_*` absent, `S.phraseHelperVisible()`, phrase kept, `S.waitingForSpeech()` true within 3 s; `sayIt(2)`; last answer `"fillings"` (soft) |
| U9–U16 | as in the draft | each card turn ends with `sayIt`; final `o.orderStep === 7`, `o.waitingFor === "done"`, hint names table 8 and Practice |

Acts 1, 2 and 4 keep the draft's beats. Arrival asserts: `SuggestLearnButton`, `SuggestPracticeButton`,
`SuggestLiveButton`, `SuggestLaterButton` enabled; tile `Label` texts `"Learn"`, `"Practice"`, `"Use it live"`;
`m.currentMode === "none"` and `a.voicePlayCount` unchanged while the suggestion is up; `textOf("SuggestDescription")`
changes per hovered tile (soft); after the pick `m.currentMode === "learn"`, `textOf("SavedBadge") === "Saved: 0"`.
Learn asserts: 3–4 `bracketedIds`; label `"uborka"` / `"cucumber"`, then `"savanyú uborka"` / `"pickles"`; at most
one enabled `NameLabel`; `cardPlayCount` 1 → 2; `WordCardStatus` `"Playing pronunciation"` (soft) →
`"Ready to listen again"`; card position unchanged while pointing at its controls; Save keeps the card,
`answers.length === 0`, `orderStep === 0`, `phraseSlotIds` empty; `savedWords` in order
`uborka_friss,szalami,paradicsom,sajt`; the label select opens the card (`cardPlayCount === 1`).

### 8.9 `LeafIndex.ts`

Add `import {StoryTour} from "./StoryTour"` and, last in the list,
`{id: "TOUR_Story", typename: StoryTour.getTypeName()}`.

### 8.10 Cross-check: what the tests read

| Object | Members read by LEAF |
|---|---|
| `main` (`WbwMain`) | `currentMode`, `currentModeLabel`, `savedWords`, `savedCount`, `setupComplete`, `menuOpen`, `modeSwitches`, `arrivalPhase`, `suggestionVisible`, `suggestionPick`, `toastTrigger`, `vad`, `setupPanel`, `toast`, `hud`, `learn`, `order`, `practice`, `audio`, `cafe`, `suggestion` |
| `learn` | `active`, `activeCardWordId`, `activeCardWord`, `bracketedIds`, `learnableIds`, `hoveredId`, `labelForId`, `labelMode`, `pointMode`, `cardWordId`, `cardPlayCount`, `pointerDotVisible`, `pointerRayVisible`, `wordCard`, `nameLabel` |
| `card` (`WbwWordCardUI`) | `isVisible`, `currentWordId`, `playing`, `savedShown`, `showCount` |
| `order` | `active`, `orderStep`, `orderStepName`, `waitingFor`, `answers`, `chosenTable`, `lastTableTapped`, `offeredPhraseIds`, `lastServerLine`, `phraseSlotIds`, `phrasePattern`, `phraseHu`, `phraseEn`, `phraseAudioKey`, `phraseHelperVisible`, `waitingForSpeech`, `speechDetected`, `speechSource`, `chosenPhraseId`, `fillingsSaid`, `caption`, `phrases`, `hint`, `phraseHelper`, `speakPrompt` |
| `phrases` | `isVisible`, `offeredIds` |
| `audio` | `lastVoiceKey`, `lastSfxKey`, `voicePlayCount`, `sfxPlayCount`, `isBusy()` |
| `vad` | `ignoreMicForTests` (set) |
| Text by name | `Message`, `ModeLabel`, `SavedBadge`, `ActiveLabel`, `SavedCount`, `Title` (scoped), `SetupSoon`, `WordCardHu`, `WordCardEn`, `WordCardStatus`, `ChipLabel` (scoped to `WordCard` / `PhraseHelper`), `Label` (scoped to a button), `NameLabelHu`, `NameLabelEn`, `PhraseHelperTitle`, `SpeakPromptText`, `SuggestDescription`, `CaptionHu`, `CaptionEn`, `Hu` / `En` (scoped to a phrase card), `Number`, `Line`, `Bravo` |
| Tapped Buttons | `SetupSpeakEnglish`, `SetupLearnHungarian`, `SetupConfirmButton`, `SuggestLearnButton`, `MenuButton`, `Mode*Button`, `ModeMenuCloseButton`, `Learnable_<id>` (Interactable), `NameLabel`, `WordCardPlayButton`, `WordCardSaveButton`, `WordCardCloseButton`, `WordCardUseLiveButton`, `UseThisWordButton`, `AddWordButton`, `PhraseHelperListenButton`, `PatternWantButton`, `PatternWithoutButton`, `ReadyToOrderButton`, `PhraseCard_<id>`, `SaidItButton`, `TableNumberButton_<n>`, `TableNumberCard_5`, `Practice*` |

---

## 9. Notes for the integrator

- Copy order that keeps the project compiling: model, voice, pointing, session, spatial, audio (+ bank), vocab →
  views (name label, word card, phrase choices, HUD, phrase helper, speak prompt, suggestion) → controllers
  (learn, order, practice) → main → LEAF helpers, DC1–DC5, StoryTour, LeafIndex. The controllers, the changed
  views and `WbwVocab` depend on each other, so recompile only after the whole set is in.
- New `.ts` files get their `.meta` from Lens Studio on import. Deleted inputs (`savedHoldSec`, the three bracket
  colours, `fillingsCardCount`, `showExample`, `flySeconds`) disappear from the `.meta` files and the scene; new
  inputs take their code defaults. Scene wiring of the four new views is optional (`WbwMain` creates them).
- `TEMP_Probe`: keep `stage = "setup"` and the object disabled, then delete it and `WbwTempProbe.ts`.
- Microphone Audio asset: none exists in `Assets/Audio/`. Without one the Lens runs in Said-it-only mode
  (`micStatus "none"`); wire `WbwMain.micAudio` after creating it. `OrderController.voiceDetection` off = mic path
  off for recordings.
- Check in a capture: "Saved ✓", "Use it live →", "Heard you ✓" and "…" render in the UI font (constants in K17);
  the helper's fixed two-line layout and the speak prompt below the tray surface stay inside ±16° × ±19°; the
  compact HUD column does not cover the tray; `slotRichText` only after the tag syntax is confirmed in Lens Studio.
- Expected log lines that must not appear: `WbwOrder: missing phrase clips:`, `WbwOrder: phrase table differs from
  WbwVocab:`, `WbwAudio: no clip named`, `WbwMain: required @input not wired`.
- The walk-in start (C7) and the devpost brief text are outside these targets.
