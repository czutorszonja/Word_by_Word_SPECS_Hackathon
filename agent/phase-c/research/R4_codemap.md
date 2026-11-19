# R4: Code map for integrating Phase C

Read-only survey of `Assets/Scripts/Wbw*.ts` and `Assets/Tests/Leaf/*.ts` in the working tree on 2026-11-19, from about 01:30 to 01:40.
Uncommitted edits are included. `WbwSharedUI`, `WbwWordCardUI`, `WbwPhraseChoicesUI` and `WbwLearnController` changed during
the survey; I re-read them, and their citations reflect the 01:37 versions. `file:line` means the 1-based line in the current working copy. All paths are
relative to the project root.

This file replaces an earlier R4 draft. That draft was written against an older step-2 design (an ingredient
chooser with `IngredientWant_<id>` and the sentence "Sonkát és szalámit kérek, …"). Everything below follows the
**AGREED Phase C design**: a "Say it at the counter" phrase helper with "Kérek … a szendvicsembe." / "… nélkül, kérem.".

---

## 0. In-flux parts and hazards to clear before editing

| Item | What I see | What to do |
|---|---|---|
| `WbwOrderController.ts` (uncommitted, mtime 00:38) | New `@input maxTrayDistanceCm` (`WbwOrderController.ts:47-50`) and a new `camLookFlat` import (`:18`). `offer()` now lays the cards on the tray only when the user is near it, and otherwise floats them where the user is looking (`:224-238`). `.ts.meta` is also modified because of the new input. | **High collision risk.** Phase C rewrites `afterLine/offer/onPhrase` in this file. Merge on top of this version and keep the `nearTray` logic: reuse it to place the phrase helper. |
| `WbwCafeBuilder.ts` (uncommitted, mtime 00:32) | New `@input stopAligningAfterWalkCm` (`:45-48`). The start-up floor snap stops once the user has walked more than 12 cm (`:72-82`). Learnable discovery is unchanged (`:84-86`, `:113-135`). | Phase C does not need this file, because `learnables` are already exposed. Leave it to the other agent. |
| `WbwSharedUI.ts` (**changed while I was reading**, now uncommitted, +92/−46) | The builder replaced the saturated tones. `Tone` is now `{name, label, base, tint}` (`:79`), where `base` is a muted mid-deep fill and `tint` is the brief's pastel. Learn: slate #4E6A84 with tint #B9CEDF (`:84`). Use it live: dusty violet #675C86 with tint #CBBFE0 (`:86`). Practice: dusty rose #87566F with tint #D5ADC5 (`:88`). Text stays soft white (`TEXT_LIGHT` 0.97/0.96/0.94, `:58`), and there is **no dark-text role**. Focus `CYAN` is now a soft aqua (`:64`). New helpers: `toward(tone, k)` (`:105`), and `modeChip(parent, dist, name = "ModeChip")` with `modeChipH(dist)` (`:466-485`), which builds a pill holding the Text `ChipLabel` = `tone.label`. Button outlines now use `tone.tint` (`:390`), and `headerRule` uses the current tint (`:441`). Panel alpha is 0.86 (`:113`). | New UI must take every colour from SharedUI (see §d). Call `useTone(toneOf(mode))`, rely on the `text()`/`button()` defaults, and use `modeChip()` for the always-visible mode name. Use `tone.tint` / `toward()` for emphasis and highlights. Do not hard-code hex values. The file may still move: re-read it before coding. |
| Also changed while reading | `WbwWordCardUI.ts` (+7): a `ChipRow` with `modeChip` above the header (`:108-113`), so lines after `:104` moved by +3. `WbwPhraseChoicesUI.ts` (+8): a `Head` row with `ModeChip` plus `Prompt` (`:102-104`). `WbwLearnController.ts`: colour defaults only, now `bracketColor` = Learn tint, `highlightColor` = Live tint, `focusColor` = soft aqua (`:77, 82, 87`). `WbwHintUI.ts`: `arrowColor` default changed to soft aqua. | **Serialized inputs override code defaults.** `.virtual-scene.json` still stores the old values on `LearnController` (`focusColor {0.42,0.98,0.95}`, `bracketColor {1,0.9,0.6}`). Changing an `@input` default in code does not change scene objects that already exist. Someone with scene access (the other agent) must reset or re-set these inputs, or the brackets keep their old colours at runtime. |
| `WbwTempProbe.ts` (untracked) and scene object `TEMP_Probe` | Enabled in `.virtual-scene.json`, with its `stage` input currently set to **`"view:ServerSpot::0:0"`**, not `"setup"`. At 1.5 s that stage calls `setupPanel.hide()` and then rotates and moves the café (`WbwTempProbe.ts:146-178`). It also reaches private members through `as any` (`confirmSetup`, `saveCurrent`, `captionHideAt`, `pickPhrase`, …; `:56-78`, `:186-230`). | **This breaks LEAF**: `completeSetup()` waits for the setup panel (`WbwLeafHelpers.ts:195`). Set the stage back to `"setup"` or disable the object before any LEAF run, and delete it when Phase C lands. Renaming private methods breaks it silently. |
| Header drift | `WbwOrderController.ts:5` says `init(session, audio, cafe)`, but the real signature is `init(session, audio, learn?)` (`:104`). | Cosmetic. |
| Audio bank | `WbwAudioBank.ts:6-80` has **no** `p_kerek_<id>`, `p_nelkul_<id>` or `c_a_szendvicsembe` entries, although all 31 `.wav` files exist in `Assets/Audio/hu/` (untracked). | Phase C must add the 31 `requireAsset` lines, or `has()`/`playVoice()` will report a missing clip (`WbwAudioController.ts:127-129`, `:161-164`). |
| Vocab has no stored case forms | `WordEntry` (`WbwVocab.ts:10-20`) has `hu` and `audio` only. There is no accusative form and no accusative clip. | Add `acc` (and `accAudio`, `wantAudio = p_kerek_<id>`, `withoutAudio = p_nelkul_<id>`) per item, or (preferred) port `PHRASE_INGREDIENTS` from **`agent/phase-c/drafts/WbwPhraseHelperModel.ts`**, the canonical table. Do **not** adopt `ORDER_INGREDIENTS` from `WbwSentenceBuilder.ts` (old design, fixed sandwich order) or the table in `WbwPhraseBuilder.ts` (superseded reference). **Traps:** id `csirke` is roast chicken (`w_sult_csirke` / `a_sult_csirke`, not `w_csirke` / `a_csirke`). Id `uborka` is pickles (`w_uborka` says "savanyú uborka"; its accusative is `a_savanyu_uborka`). Id `uborka_friss` is cucumber. So "a_<id>" and "w_<id>" cannot be built from the id: store the clip keys. |
| Draft sentence builder | `agent/phase-c/drafts/WbwSentenceBuilder.ts:117` `buildOrderSentence(wantedIds, withoutIds)` builds the **old** combined pattern and never uses "a szendvicsembe". | **Done:** superseded by `agent/phase-c/drafts/WbwPhraseHelperModel.ts` (+ `.cases.md`), which implements the agreed patterns. Port only that file; `WbwSentenceBuilder.ts` and `WbwPhraseBuilder.ts` are marked superseded. |
| Glyphs | Strings already use `→` (`WbwPracticeBoardUI.ts:98`) and `✋` (`WbwOrderController.ts:301`). `✓` is not used in any rendered string: the saved state is the label "Saved" plus the `check_circle` icon (`WbwWordCardUI.ts:167-171`). | If the label becomes the literal "Saved ✓", check that the glyph renders and update DC2:189. Keeping "Saved" plus the check icon is the safer choice. |
| Icons | `Assets/Icons/` has arrow_forward, back_hand, bookmark_add, check_circle, close, extension, local_cafe, location_on, play_arrow, refresh, school, volume_up. | There is no `mic` icon (for the listening indicator) and no `add` icon (for "+ és"). Import them with IconSelector, or fall back to labels. |
| Scene wiring | The UI roots are authored under `WordByWord/UI/*Root` and the controllers under `WordByWord/Controllers/*` (from `.virtual-scene.json`). The other agent owns the scene. | New UI modules (NameLabel, PhraseHelper, Suggestion, speak prompt) can be added in two ways. (1) `@input @allowUndefined` plus later wiring through VirtualScene. (2) Created at runtime in `WbwMain.start()`: `const so = global.scene.createSceneObject("NameLabelRoot"); so.setParent(uiRoot); so.createComponent(WbwNameLabelUI.getTypeName())`. Runtime-created components run their lifecycle inline (AGENTS.md). Option 2 needs no scene or `.esproj` edits, and `WbwRaiseHand` already follows the "created in start()" pattern (`WbwMain.ts:105-108`). |

Hard architecture rule (`WbwSharedUI.ts:9`): only `*UI.ts` files may import `WbwSharedUI` or create `Component.Text`.
Controllers (`WbwLearnController`, `WbwOrderController`, `WbwMain`) must not. So the label, helper, suggestion and
speak prompt have to be `Wbw*UI.ts` passive views. The pointer ray and the voice-activity detector are non-UI files
(`WbwGeo` geometry / Lens API only).

---

## (a) Startup, setup, toast and mode flow, and where the arrival suggestion hooks in

**Entry point: `WbwMain`**
- `onAwake` (`WbwMain.ts:80-88`) checks the 9 required inputs and binds `OnStartEvent → start()`.
- `start()` (`:90-116`), in order:
  1. `cafe.build()` (`:91`): floor snap plus learnable colliders, see (b).
  2. `learn.init(session, audio, hud, cafe.learnables)` (`:92`), `order.init(session, audio, learn)` (`:93`) and `practice.init(session, audio, cafe, order, () => selectMode("none"))` (`:94`).
  3. Session events: `onSavedChanged → hud.setSaved` (`:95`) and `onModeChanged → applyMode` (`:96`).
  4. UI events: `hud.onMenu → toggleMenu` (`:97`), `modeMenu.onPick → selectMode` (`:98`), `modeMenu.onClose → hide` (`:99`) and `setupPanel.onConfirm → confirmSetup` (`:100`).
  5. An UpdateEvent calls `hud.setCompact(order.active)` every frame (`:102-104`). In Use it live the HUD shrinks to a "Menu" chip and **hides the mode text** (`WbwHudUI.ts:90-103`). That means the "always show the mode name" rule is currently broken in Use it live, so Phase C needs a mode chip on the live panels.
  6. The raise-hand detector, if enabled (`:105-108`).
  7. With `skipSetup`, `confirmSetup()` runs and `start()` returns (`:110-113`). Otherwise `setupPanel.show()` runs and the panel is placed at `inView(70, -7)` (`:114-115`).
- `confirmSetup()` (`:118-133`):
  - Guards on `setupComplete` and then sets it to true.
  - Plays SFX `ToastPop`, hides the setup panel, shows the HUD and calls `setSaved` / `setMode` (mode is "none", shown as "—", which falls back to the Learn tone).
  - Shows `toast.show("Café detected (demo)", 3)` at `inView(80, 14)` (`:126-127`).
  - **Then, in a `DelayedCallbackEvent` at `toastSeconds + 0.2` s, auto-enters `firstMode`** (combobox `:46-49`, default `"learn"`) if the mode is still `"none"` (`:128-132`).
- `selectMode(m)` (`:161-170`) hides the menu and completes setup if needed. Picking the same mode calls `applyMode(m, true)` (a restart). A different mode goes through `session.setMode(m)` → `applyMode` (`:172-184`), which increments `modeSwitches`, calls `learn/order/practice.setActive(...)` and `hud.setMode(MODE_LABEL[m])`.
- `WbwSession.ts`: `Mode = "none"|"learn"|"practice"|"live"` (`:7`), `MODE_LABEL` (`:9-14`). `setMode` fires only on an actual change (`:27-31`). The saved list is `save`/`isSaved`/`saved` (`:34-43`).
- Readable state on WbwMain (`:69-76`): `currentMode, currentModeLabel, savedWords, savedCount, setupComplete, menuOpen, modeSwitches`.
- Views involved:
  - `WbwSetupPanelUI.show()` (`WbwSetupPanelUI.ts:38-71`). Names: `SetupPanel`, `Title`, `SetupSpeakEnglish`, `SetupLearnHungarian`, `SetupSoon`, `SetupConfirmButton`.
  - `WbwToastUI.show(msg, s)` (`WbwToastUI.ts:38-55`). Names: `CafeToast`, text `Message`. It shrinks and fades out (`:65-75`) and exposes `lastMessage` and `isVisible`.
  - `WbwModeMenuUI.show()` (`WbwModeMenuUI.ts:46-77`). Each tile wears its own tone (`:64-75`), which is the pattern to copy for the suggestion buttons.

**Arrival suggestion hook (the AGREED design, item 8)**
- New passive view `WbwSuggestionUI.ts` (or `WbwSuggestionPanelUI.ts`):
  - Root named `SuggestionPanel`. Buttons `SuggestLearnButton`, `SuggestPracticeButton`, `SuggestLiveButton`, `SuggestLaterButton`.
  - Each mode button passes `tone: toneOf(mode)` and shows its label, as in `WbwModeMenuUI.ts:64-75`. "Later" is a toned button too: the brief says buttons are never grey.
  - Events: `onPick(mode)` and `onLater`.
- Replace the body of the delayed callback in `confirmSetup()` (`WbwMain.ts:128-132`) with: `if (session.mode === "none") { suggestion.show(); placeFacingUser(..., inView(~72, -4)) }`.
  - Expose `get suggestionVisible()` on WbwMain.
  - `onPick(m)` → `suggestion.hide(); selectMode(m)`. `onLater` → hide and stay in `"none"`; the HUD Menu is still there.
  - Keep a way to bypass the panel. Add a `firstMode` combobox value `"suggest"` as the new default, and keep `"learn"` etc. so a demo can skip the panel. `skipSetup` (`:110-113`) should keep skipping straight to a mode.
- `selectMode()` (`:161`) must also hide the suggestion, because the user may open the Menu while it is up.
- Do **not** re-show the suggestion when the mode returns to `"none"`. Practice close calls `selectMode("none")` (`WbwMain.ts:94`), and DC5 asserts `currentMode === "none"` afterwards (`DC5_Practice.ts:131`).
- "Walks into the café": the café origin is snapped under the user's start spot at the counter (`WbwCafeBuilder.ts:102-111`). Starting at the door means offsetting that position (see `R5_arrival.md`). LEAF positions the head with `eyeAt(x, z)` relative to the café origin (`WbwLeafHelpers.ts:152-154`), so the tests survive such an offset.

---

## (b) Learnables today, the word card, and what changes for point-to-reveal and the steady card

**Discovery (`WbwCafeBuilder`)**
- `build()` (`WbwCafeBuilder.ts:66-88`) runs `collectLearnables` over `sandwichCounter`, `pastryDisplay` and `coffeeArea` (`:84-86`). Objects match the regex `^Learnable_(\w+)$` and must have a `wordById(id)` entry (`:113-120`).
- `makeInteractive` (`:123-135`) adds a box collider sized to the merged mesh AABB plus `2 × colliderPaddingCm` (minimum 4 cm), with `fitVisual = false`, and adds a SIK `Interactable`. It then pushes `Learnable {id, so, size, interactable}` (interface `:14-19`).
  - `size` is the **padded collider size**, and the wrapper sits at the mesh centre. So the top of the object is about `so.worldPos.y + size.y/2`, and the right edge (seen from the user) is about `+camRight·size.x/2`.
- Counter neighbours are about 18 cm apart in a row, and the two rows are offset by about 9 cm in x. A label has to sit *close beside* its object without covering the neighbours, which favours above the object or above-right.

**Brackets, hover and select (`WbwLearnController`)**
- `init` (`WbwLearnController.ts:111-131`): for each learnable it creates a `Tracked {l, word, bracket, hovered}` and subscribes:
  - `interactable.onTriggerEnd → select(tr)` (`:121`)
  - `onHoverEnter / onHoverExit → tr.hovered = …; refreshTint(tr)` (`:122-123`)
  - Card events (`:125-128`): `onPlay → playWord`, `onPlaySentence → playSentence`, `onSave → saveCurrent`, `onClose → closeCard`.
- **What hover does today:** it only recolours the object's own brackets to `focusColor` (cyan, `:79-82`), scales them by 1.08, and enables them even when the object is not one of the scanned 3–4 (`refreshTint`, `:266-273`). **It plays no audio and shows no label.**
- **Hover works only in Learn**: `refreshTint` enables brackets only `if (t.hovered && this.active)` (`:271`), and `select()` returns early unless the controller is active (`:164`). In Use it live the learnables respond to nothing except `setHighlight` (`:147-154`), a lavender `highlightColor` (`:74-77`) that the order controller applies to ingredients named on offered cards (`WbwOrderController.ts:240-244`).
- **Discovery brackets:** `scan()` runs every 0.2 s (`:303-326`) and keeps the nearest `maxBrackets = 4` objects inside a ±38° horizontal cone and within 300 cm (`:34-47`). It writes `bracketedIds` and sets `bracket.enabled = chosen || hovered` (`:325`). `makeBracket` builds four L corners as `Learnable_<id>/Brackets/H_*, V_*` (`:253-263`) in `bracketColor` (`:84-87`; the code default is now the Learn tint #B9CEDF, but the scene still serializes the old warm value). `faceBrackets` turns them toward the user and pushes them `size.z/2 + 0.5` cm toward the camera (`:291-301`). This already matches "quiet discovery markers on the 3–4 nearest" (design item 1).
  - Bracket colours are `@input vec4`s on a **non-UI** controller (`:74-87`), so they cannot import the tone from SharedUI. The defaults were copied by hand to match the tints. The cleaner route: draw the hover bracket and connector inside the new label UI module, which can use `toneOf(mode).tint`, and keep the discovery corners as they are.

**Selecting an object and the card (`select()`, `WbwLearnController.ts:163-204`)**
- `select()` plays SFX `UiClick` (`:165`). This is a sound effect, not a voice clip, and it happens only on select, never on hover.
- It then calls `wordCard.show({...})` with id, hu, en, example, picture, saved flag and `hasSentenceAudio` (`:167-172`), and sets `activeCardWordId` and `activeCardWord` (`:173-174`).
- **Placement:** the card opens once at `cardDistanceCm = 68` from the user, just above the object's top edge, turned toward the object but clamped inside a ±16°/±19° view box (`:176-201`), and then calls `placeFacingUser` (`:201`) and records `openedAt = cam` (`:202`). **It does not follow the head.**
- **Does it play on open?** Yes. `this.speak(w.audio, "word")` (`:203`) plays the word once on open. `speak()` (`:217-223`) calls `wordCard.setPlaying("word")` and clears it in the `playVoice` finish callback.
- **Does it close on hover exit?** **No.** Hover exit only re-tints the brackets (`:123`), so the card is already "steady" with respect to the pointer.
- **It closes when:**
  - the close button is pressed (`:128` → `closeCard`, `:245-250`);
  - another object is selected (`WbwWordCardUI.show()` calls `hide()` first, `WbwWordCardUI.ts:85`);
  - the user walks more than 150 cm horizontally from `openedAt` (`tick`, `:287`; `walkAwayCm`, `:49-52`);
  - Learn is left (`setActive(false)` → `closeCard`, `:135-136`);
  - **Save is pressed**: `saveCurrent()` (`:225-243`) clears `activeCardWordId` and `activeCardWord` immediately (`:230-231`), calls `setSaved()`, and after `savedHoldSec = 0.8` flies the card into the HUD badge, which hides it (`:235-242`; `WbwWordCardUI.flyTo`, `:175-181`, and `tick`, `:200-212`).
- **What the card shows (`WbwWordCardUI.show`, `:84-139`, line numbers after the builder's chip edit):**
  - `ChipRow` with a `ModeChip` "Learn" (`:111-113`).
  - Header: `Illustration` (`:116`), `WordCardHu` in Headline1 (`:118`), `WordCardEn` (`:119`) and `WordCardCloseButton` (`:120`).
  - An `Example` block with `ExampleHu` „…” and `ExampleEn` (`:122-126`).
  - Buttons: `WordCardPlayButton` "Listen" (`:129`), `WordCardPlaySentenceButton` "Sentence" when a clip exists (`:130-132`), and `WordCardSaveButton` "Save"/"Saved" (`:134-136`).
  - Playing state: the button label turns "Playing" in `CYAN` with a `volume_up` icon (`paintPlay`, `:183-190`), and the icon pulses (`tick`, `:192-199`).
  - Readable state: `currentWordId, currentHu, playing, savedShown, cardSize, showCount, isVisible` (`:65-76`).

**Exactly what changes for point-to-reveal (design items 2 and 6)**

1. **New passive view `WbwNameLabelUI.ts`** (single instance; root `NameLabel`):
   - Texts: `NameLabelHu` (Hungarian, large role such as Headline2) and `NameLabelEn` (English, smaller, the secondary text role).
   - A small mode chip.
   - A short connector line, or a focus bracket around the object, built from SharedUI/UIKit `RoundedRectangle` strips so it can take the tone.
   - In live mode: `UseThisWordButton`, plus `AddWordButton` ("+ és") once the phrase already has a slot.
   - Methods: `show(id, hu, en, mode, canUse, canAdd)`, `hide()`, `place(objPos, objSize)`.
   - Events: `onSelect` (open the card), `onUse(id)`, `onAdd(id)`, `onHoverChanged(bool)`.
   - Readable state: `labelForId`, `isVisible`.
   - **Gotcha:** `panel()` adds a BackPlate, and UIKit's BackPlate carries a passive Interactable (`DC4_TableNumber.ts:155-157`). If the panel root is named `NameLabel`, `tap("NameLabel")` hits that dead Interactable. In Learn, make the selectable surface a UIKit `Button` named `NameLabel` (with an inner panel named something else, e.g. `NameLabelPanel`). Or make the Button the root, and give live-mode buttons their own names.
2. **The hover handlers in `WbwLearnController.init` (`:122-123`)** become:
   - On enter: set `hoveredId = id` and show the label (one at a time; the latest hover wins), apply bracket focus, and play no audio.
   - On exit: start a grace timer of about 0.4 s. Cancel it if the label itself is hovered, so the hand or cursor can travel to the label. When it expires, hide the label and clear `labelForId`.
   - Run this in **both** Learn and Use it live, with a mode switch such as `setPointMode("learn"|"live"|"off")` called from `WbwMain.applyMode` (`WbwMain.ts:179-181`). Keeping it in LearnController makes sense because it owns the Learnable list and its Interactable subscriptions.
   - In live mode, set `canUse = word.area === "sandwich"` (`WbwVocab.ts:19`).
   - Readable state: `learn.hoveredId` and `learn.labelForId`.
   - Add a programmatic hook next to `selectById` (`:157-160`), e.g. `pointAtById(id)` / `clearPoint()`, for timing-free tests.
3. **`refreshTint` (`:266-273`) and `scan` (`:325`)**: keep the discovery brackets separate from the hover visual. DC2 counts enabled `Learnable_<id>/Brackets` objects and expects exactly `bracketedIds.length` (`DC2_Learn.ts:124-129`). If a hover enables an extra `Brackets` set, that count breaks whenever a hover is still pending. Put the hover bracket and connector in the label module, or add the hovered id to `bracketedIds`.
4. **Placement of the label:** recompute every frame while it is visible (objects are static, but the user moves).
   - Position: `objPos + up·(size.y/2 + gap + labelH/2)`, nudged toward `camRightFlat()` so it sits "close beside", then `placeFacingUser`.
   - Text size: base it on the actual distance (`roleSize(role, dist)`), and keep a floor (about 1.5 cm cap height at 1 m).
   - Hide the label for the object whose card is open, so the card is not duplicated. The card already sits just above that object.
5. **Selecting from the label:** `nameLabel.onSelect → select(tracked)`, the same path as the object (`:121`). In live mode, selecting the object itself should do nothing or pin the label. "Use this word" is the deliberate action (design item 6). This needs to be decided.

**Exactly what changes for the steady card (design item 3)**

1. **`saveCurrent()` (`:225-243`)**:
   - Do **not** clear `activeCardWordId` / `activeCardWord` (`:230-231`).
   - Do **not** schedule `flyTo` (`:234-242`).
   - Call `session.save(id)`, play SFX `SaveConfirm`, and call `wordCard.setSaved()`, then stop. The HUD badge already pulses on `setSaved` (`WbwHudUI.ts:128-131`).
   - `savedHoldSec` (`:69-72`) and `flyTo` can then be removed or left unused.
2. **The card closes only on** the close button, another select (already covered by `show()` → `hide()`), walk-away (`:287`, already in place) and mode exit (`:136`). Hover exit must keep doing nothing. The card's own Buttons have their own colliders, so hovering them never reaches the learnable.
3. **`WbwWordCardUI.show` (`:84-139`)**, rebuilt compact:
   - Keep: `WordCard` root, the builder's `ChipRow`/`ModeChip`, `WordCardHu` (large), `WordCardEn` (small) and `WordCardCloseButton`.
   - Add a status line `WordCardStatus`: "Playing pronunciation" while `playing === "word"`, "Ready to listen again" after.
   - Buttons: `WordCardPlayButton` with the label **"Listen again"** (the name is kept for LEAF), `WordCardSaveButton` "Save"→"Saved" (plus the check icon), and a new `WordCardUseLiveButton` "Use it live →" with a new event `onUseLive`.
   - Drop `Illustration`, `Example*` and `WordCardPlaySentenceButton` (the updated brief removes them, design-brief "Word card"). Make the `WordCardData` fields `exampleHu/exampleEn/picture/hasSentenceAudio` optional or remove them.
   - `setPlaying` and `paintPlay` (`:156-160`, `:183-190`) must also update the status line. The idle label becomes "Listen again" rather than "Listen".
4. **Counting plays:** `speak()` (`:217-223`) should increment `cardPlayCount`, reset to 0 in `select()`. Expose `learn.cardWordId` as an alias of `activeCardWordId`, and keep the old name because DC2 reads it (`DC2_Learn.ts:152, 192, 201`).
5. **"Use it live →" handoff:**
   - LearnController emits `onUseLive(id)`; it has no reference to WbwMain.
   - WbwMain subscribes in `start()`: `learn.onUseLive.add((id) => { session.setLiveWord(id); selectMode("live") })`.
   - Store the carried word in `WbwSession`, which is the single owner of session-wide state (`WbwSession.ts:1-4`). The order controller reads it when it activates.
   - Decide what happens for non-sandwich words (kávé, tej, kenyér…). Suggestion: show the link only when `area === "sandwich"`, or open Use it live with no slot.
6. **Separate actions (design item 4):** `saveCurrent()` touches only `WbwSession.save`. Exploring never calls the order controller. Make sure the new `onUseLive` / `onUse` paths are the only writers of `phraseSlotIds`.

---

## (c) The order state machine today, and what changes for the phrase helper and "say it"

**State (`WbwOrderController.ts:73-102`)**
- `active`
- `orderStep`: 0 = not started, 1..6 = steps, 7 = done
- `orderStepName`
- `waitingFor`: `"server" | "user" | "table" | "done"`
- `answers[]`: **every tap is recorded, including non-advancing phrases and `done`**
- `chosenTable`, `lastTableTapped`
- `offeredPhraseIds[]`
- `lastServerLine`
- private: `stepDef`, `picked[]` (multi-pick), `tableCards`, `captionHideAt`, `arrowTarget`, `epoch` (cancels stale callbacks)
- `fillingsCardCount = 3` (`:67-70`)

**Script data (`WbwVocab.ts:109-126`)**: `OrderStep {step, name, line, choices, advanceOn, multi, pinned?}`.
- Step 1 `greet`: `[jonapot, szendvicset]`, advances on `szendvicset`.
- **Step 2 `fillings`**: `[sonka_sajt, kerhetek_oliva, uborka_nelkul, szalami_sajt, csirke_paprika]`, `advanceOn: ["done"]`, `multi: true`, `pinned: ["uborka_nelkul"]` (`:121`).
- Step 3 `drink`: `[tejes_kave]`.
- Step 4 `here_or_takeaway`: `[itt_eszem, elvitelre]`, advances on `itt_eszem`.
- Step 5 `table`: dynamic.
- Step 6 `enjoy`: `[koszonom]`.
- The phrases are in `PHRASES` (`:69-86`). Step-2 phrase ids: `sonka_sajt` (`:72`), `kerhetek_oliva` (`:73`), `uborka_nelkul` (`:74`), `szalami_sajt` (`:75`), `csirke_paprika` (`:76`), plus the pseudo-phrase `done` (`:85`).

**Flow**
1. `setActive(on)` (`:124-143`):
   - On: `epoch++`. If `orderStep` is 0 or ≥ 7, `startOrder()` runs (`answers = []`, `chosenTable = 0`, `runStep(1)`, `:146-151`); otherwise `runStep(orderStep)` replays the current step.
   - Off: hides the cards, highlight, caption, speaking state, voice, arrow and hint, clears `offeredPhraseIds`, and turns `waitingFor` "server" into "user" (`:141`).
2. `runStep(step)` (`:161-187`):
   - `ep = ++epoch`. Sets `orderStep`, hides the cards, clears the highlight, `offered` and `picked`.
   - If `step > 6`, calls `finish()`.
   - Otherwise sets `waitingFor = "server"`, shows the caption at `server.getCaptionAnchor()`, sets the server speaking, plays `AttentionChime` for the table step, and calls `playVoice(line.audio, …)`. When the line ends (and the epoch still matches): stop speaking, schedule the caption linger, call `afterLine(def)`.
3. `afterLine(def)` (`:189-202`): the table step calls `offerTablePhrase()` if a table is already chosen. If not, it sets `waitingFor = "table"`, shows a "Turn around…" caption and points the arrow at the seating. Every other step calls `offer(def.choices, def.multi)`.
4. `offer(ids, multi)` (`:204-245`):
   - **Fillings:** sort by the number of saved words a phrase contains, keep the pinned phrase plus the best `fillingsCardCount - pinned` others (`:206-215`), then append `"done"` when multi (`:216`).
   - Build `PhraseCardData` with picture and picked flag. Set `waitingFor = "user"` and `offeredPhraseIds = list`. Call `phrases.show(cards, multi ? "Pick any, then Kész" : "Tap your answer")` (`:223`).
   - Place on the tray when near (`maxTrayDistanceCm`), otherwise float (`:225-238`).
   - Call `learn.setHighlight(words of offered phrases)` (`:240-244`).
5. `onPhrase(id)` (`:247-278`):
   - Guard: `active && stepDef && waitingFor === "user"`. Then `answers.push(id)` (`:252`).
   - **Multi and not `done`:** add to `picked`, call `phrases.setPicked(id)` (one-way toggle), play the phrase clip, return (`:253-258`).
   - **`done`:** play SFX `UiClick`, then `next(def)` (`:259-263`).
   - **Others:** if `advanceOn` contains the id, hide the cards, clear `offered` and set `waitingFor = "server"`; otherwise `setPicked(id)`. Play the clip. **On clip end**, call `next(def)` if advancing, or show the demo-path hint if the id is `elvitelre` (`:264-277`). **So today, picking a phrase submits it.**
6. `next(def)` (`:280-290`): hides the cards, sets `waitingFor = "server"`, waits `replyPauseSec` (0.6 s), then `runStep(def.step + 1)`.
7. `finish()` (`:292-302`): step 7, `"done"`, hint "Walk to table N. While you wait, open ✋ Menu and choose Practice.", arrow to the table.
8. Tables: `onTable(n)` (`:305-327`) ignores occupied tables. For empty ones it sets `lastTableTapped`, shows the popup `"8 = nyolc"` and plays `n_8`. In the table step it sets `chosenTable` and, if `waitingFor` is "table" or "user", calls `offerTablePhrase()` after 1.2 s. Outside steps 5–6 it also sets `chosenTable` (used for Practice placement). `offerTablePhrase()` (`:329-337`) calls `offer([info.phraseId], false)`.
9. `pickPhrase(id)` (`:154-158`) is the programmatic tap hook; only offered ids are accepted.
- `WbwPhraseChoicesUI` (`WbwPhraseChoicesUI.ts`):
  - Methods: `show(cards, prompt)` (`:64-112`, now with a `Head` row of `ModeChip` plus `Prompt`, `:102-104`), `hide()` (`:114-120`), `setPicked(id)` (one-way; picked cards ignore taps, `:123-127`, `:143-148`).
  - Names: `PhraseChoices`, `Prompt`, `Cards`, `PhraseCard_<id>` with `Face/Picture`, `Words/Hu`, `Words/En` (`:131-141`).
  - State: `offeredIds`, `isVisible`, `lastSizeCm`.

**What changes**

**c.1 Data (`WbwVocab.ts`)**
- Step 2 (`:121`) becomes `{step: 2, name: "fillings", line: "mit_ker_bele", choices: [], advanceOn: [], multi: false, helper: true}`. Add `helper?: boolean` to `OrderStep` (`:110-118`) and drop `pinned`.
- Remove the fixed step-2 phrases `sonka_sajt`, `kerhetek_oliva`, `uborka_nelkul`, `szalami_sajt`, `csirke_paprika` (`:72-76`) and `done` (`:85`) from what can be offered. Deleting them from `PHRASES` is safe: nothing else references them. The word examples (`:41-56`) reference `p_sonka_sajt`, `p_kerhetek_oliva` and `p_uborka_nelkul` only as `exampleAudio`, which the slimmer card drops.
- Add the stored case forms and clip keys per sandwich item (§0 row "Vocab").

**c.2 New pure builder** (now `drafts/WbwPhraseHelperModel.ts`, the canonical port; `WbwSentenceBuilder.ts` / `WbwPhraseBuilder.ts` are superseded): `buildPhrase(slotIds, pattern) → {hu, en, audioKey, emphasisRanges, …}` plus the `PhraseHelperModel` state class.
- `want`, one slot: `Kérek <acc> a szendvicsembe.`, audio `p_kerek_<id>`.
- `want`, several slots: `Kérek <acc1> és <acc2> a szendvicsembe.`; three or more use `A, B és C`. Audio `c_kerek + aClip(1) [+ c_es + aClip(n)] + c_a_szendvicsembe`. With 3 or more slots, there are no comma clips: play `c_es` only before the last item, or decide whether to pause.
- `without`, one slot: `<Nom capitalised> nélkül, kérem.`, audio `p_nelkul_<id>`.
- `without`, several slots: `A és B nélkül, kérem.`, audio `wClip(1) [+ c_es + wClip(n)] + c_nelkul + c_kerem`.
- English: "I'd like cucumber in my sandwich." and "Without pickles, please.".
- Return the slot character spans so the view can bold or tint the ingredient while the frame text stays stable.
- Never insert the bare `hu` form into a "Kérek" sentence.

**c.3 New passive view `WbwPhraseHelperUI.ts`** (root `PhraseHelper`, Use it live tone):
- A heading "SAY IT AT THE COUNTER" and a "Use it live" chip.
- `PhraseHelperHu`: the sentence, with the ingredient emphasised. This needs either Text rich runs, or three Text parts (frame-left / slot / frame-right) so the frame stays still.
- `PhraseHelperEn`.
- Buttons: `PhraseHelperListenButton`, `PatternWantButton`, `PatternWithoutButton`, and `SaidItButton` when armed.
- A small prompt such as "Point at an ingredient → Use this word" while there is no slot.
- Events: `onListen`, `onPattern(p)`, `onSaidIt`.
- No Learnable-related logic in the view.

**c.4 `WbwOrderController` edits**
- **New state:** `phraseSlotIds: string[]`, `phrasePattern: "want"|"without"`, `phraseHu`, `phraseEn`, `phraseAudioKey`, `phraseHelperVisible` (getter), `waitingForSpeech`, `speechDetected`, `chosenPhraseId`.
- **`init` (`:104-122`):** subscribe `learn.onUse(id)` → `setSlots([id])` and `learn.onAdd(id)` → `addSlot(id)`. Both are allowed only while `active`. Also subscribe the helper events and the voice-activity detector's `onSpeech`.
- **`setActive(true)` (`:128-130`):** seed `phraseSlotIds` from `session.liveWord`, if it exists and is a sandwich item, before running the step. Show the helper whenever a slot exists, or at step 2 (decision below). `startOrder()` (`:146-151`) must not wipe the carried slot.
- **`setActive(false)` (`:131-142`):** also hide the helper, stop listening and set `waitingForSpeech = false`.
- **`afterLine` (`:189-202`):** `if (def.helper) { showHelperTurn(); return }`.
  - `showHelperTurn()` sets `waitingFor = "user"` and `offeredPhraseIds = []`, hides `PhraseChoices`, and shows the helper on the tray. Reuse the `nearTray` placement from `:225-238` on `phraseHelper.getSceneObject()`.
  - It calls `learn.setHighlight(phraseSlotIds)` and arms speech: `waitingForSpeech = phraseSlotIds.length > 0`, with Said it shown.
  - **It must not auto-play** the phrase, so `checkServerTurn`'s `lastVoiceKey === "s_mit_ker_bele"` still holds (`DC3_OrderingAtCounter.ts:23`).
- **`offer` (`:204-245`):** delete the fillings scoring and pinning (`:206-215`), the `multi`/`"done"` code (`:216`, `:223` prompt) and the `fillingsCardCount` input (`:67-70`; this changes `.ts.meta`). Keep the tray placement and the highlight.
- **`onPhrase(id)` (`:247-278`) becomes "choose, do not submit":**
  - Guard as now. Set `chosenPhraseId = id` and call `phrases.setChosen(id)`. That is a new single-select method replacing the one-way `setPicked`, so the learner can change their mind.
  - Play `p.audio`; when it ends, start listening. Set `waitingForSpeech = true` and show `SaidItButton`.
  - **Do not push to `answers` and do not advance here.** Keep `waitingFor === "user"` during the speech wait. `waitForUserTurn` and the `onTable` guard (`:314`) depend on "user".
- **New `onSaid(source: "mic"|"button")`:**
  - Guard on `waitingForSpeech`. Then set `waitingForSpeech = false`, `speechDetected = source === "mic"`, stop listening, and hide Said it.
  - Helper step: push `"fillings"` (or `fillings:<pattern>:<ids>`) to `answers`, store `fillingsSaidHu = phraseHu`, call `next(def)`.
  - Phrase steps: push `chosenPhraseId`. If `advanceOn` contains it: hide the cards, set `waitingFor = "server"`, call `next(def)`. Otherwise (jonapot, elvitelre): stay on the step, clear the chosen state, and for `elvitelre` show the existing demo-path hint (`:276`).
  - Add a public `saidIt()` hook, like `pickPhrase` (`:154`).
- **Phrase editing:**
  - `setSlots` / `addSlot` / `setPattern` rebuild with the builder and update `phraseHu/En/AudioKey`, the helper view and the highlight.
  - Cap the slots (2–3 suggested).
  - Picking the same id again does nothing. "Use this word" **replaces** the slot list with `[id]`; "+ és" **appends**.
  - Changing the phrase while `waitingForSpeech` keeps the wait armed. Showing or editing a phrase never submits it (design item 7).
- **Listen:** `onListen → audio.playVoice(phraseAudioKey)`. It does not advance anything.
- **Voice activity** (new non-UI file, see `R1_voice.md`):
  - It needs an "Audio From Microphone" asset under `Assets/`, which the main agent must create.
  - Start listening only **after** our own clip has finished, so the mic does not hear the Lens.
  - Any listening cue must use `playSfx`, never `playVoice`. Otherwise `lastVoiceKey` and `voicePlayCount` assertions break (`DC3:23`, `DC4:171`).
  - Add a switch, e.g. `@input micEnabled` or `order.voiceDetection = false`, so LEAF runs are not advanced by room noise.
- **SaidItButton naming:** only one `SaidItButton` may be enabled at a time. LEAF's `findInteractablesByName(name)[0]` picks the first one it finds. At step 2 it lives on the helper; at other steps it lives on the phrase panel or a small speak-prompt strip.

**Decision for the orchestrator.** The design says opening Use it live shows the helper (item 5), but step 1 also shows its own cards on the same tray.
- My suggestion: show the helper as a compact panel above the tray whenever a slot word exists, with Listen and the pattern switch, but **not armed** (no Said it).
- At step 2 it moves onto the tray as the answer surface, and the cards are hidden.
- At other steps the step's cards plus Said it are the answer surface.

---

## (d) WbwSharedUI API that new UI must reuse (`Assets/Scripts/WbwSharedUI.ts`)

Line numbers are from the working copy **after** the builder's soft-palette edit (485 lines). The file is still in flux, so re-read it before coding.

**Typography**
- `TextRole` (`:22-24`): Title1, Title2, HeadlineXL, Headline1, Headline2, Subheadline, Button, Callout, Body, Caption. Sizes are in `TYPE_SCALE` (`:25-31`).
- `READ_BOOST = 2` (`:35`): text is sized as if the panel were twice as far away.
- `roleSize(role, distCm, boost)` (`:40`) and `applyTextRole(t, role, distCm, boost)` (`:43`).
- `textWidthCm(chars, role, distCm, onPanel = true, boost)` (`:48`) and `lineHeightCm(role, distCm, onPanel = true, boost)` (`:52`) are the sizing estimates every view uses to size its panel around its content.

**Colour roles (`:57-74`)**
- `TEXT_LIGHT` (soft white, the default text colour, `:58`), `TEXT_SOFT` (secondary, `:60`), `MUTED` (`:62`).
- `CYAN` (soft aqua for focus and selected, `:64`), `GREEN` and `GREEN_FILL` (success, `:66-67`), `AMBER` (incorrect, `:69`).
- Legacy aliases: `WHITE`, `SOFT`, `GOLD`, `RED` (`:71-74`).
- Reference these by name; never copy the values.

**Tones (`:76-107`)**
- `interface Tone {name, label, base, tint}` (`:79`).
  - `base` is the muted fill used for panels and buttons.
  - `tint` is the brief's pastel (#B9CEDF / #CBBFE0 / #D5ADC5), used for outlines, chips, heading marks and highlights.
  - `label` is "Learn" / "Use it live" / "Practice".
- `TONE_LEARN` (`:84`), `TONE_LIVE` (`:86`), `TONE_PRACTICE` (`:88`).
- `useTone(t)` (`:91`) sets **module-global** `currentTone` (`:89`). `panel()`, `button()`, `headerRule()` and `modeChip()` read it at build time, so call it at the top of every `show()`.
- `toneOf(modeOrLabel)` (`:92-97`) matches by substring: "practice" → Practice tone, "live" (which includes "Use it live") → Live tone, anything else → Learn tone. So `toneOf("live")` and `toneOf(MODE_LABEL[m])` both work.
- `shade(c, k, alpha)` (`:99-103`) lightens toward soft white (k > 0) or deepens (k < 0).
- `toward(t, k, alpha)` (`:105-107`) blends `base` toward `tint` (0 = fill, 1 = tint). Use it for the emphasised ingredient slot, a selected chip, or the Use it live violet label.

**Mode chip (`:465-485`)**
- `modeChipH(dist)` (`:466`).
- `modeChip(parent, dist, name = "ModeChip")` (`:472-485`): a pill (`RoundedRectangle`) holding the Text `ChipLabel` = `currentTone.label`, in the tint colour, registered as a flex item.
- Use it on every new panel: name label, phrase helper, suggestion (each option chip), and the speak prompt. It already appears on the word card (`WbwWordCardUI.ts:111-113`) and the phrase cards (`WbwPhraseChoicesUI.ts:102-103`).
- Several `ModeChip` / `ChipLabel` objects will exist at once. Tests must scope `textOf("ChipLabel", root)`.

**Surfaces**
- `PANEL_ALPHA_SEE_THROUGH = 0.86` and `PANEL_ALPHA_STRIP = 0.95` (`:113-114`). Panels shorter than `SEE_THROUGH_FROM_HEIGHT = 10` cm are drawn solid automatically (`:111`, `:193`).
- Radii: panel 1.6, strip 1.1, button 0.9 (`:116-118`).

**Scaffold**
- `obj(parent, name, pos?)` (`:123-128`).
- `FlexOpts {gap, padX, padY, justify, align}` (`:130-136`).
- `register(parent, item)` (`:155-163`) and `item(so, w?, h?, stretch)` (`:165-173`).
- `Panel {root, plate, content, flex}` (`:175-180`).
- `panel(host, name, w, h, opts?, solid = false)` (`:188-198`): a Canvas plus a BackPlate tinted to `currentTone.base` (re-applied for 5 frames, `tintPanelWhenReady`, `:200-218`), with a column FlexLayout on `Content` at +0.6 cm. **Its BackPlate adds a passive Interactable**: never give a `panel()` root a name the tests `tap()`.
- `flexBox(parent, name, "row"|"column", w, h, opts?)` (`:221-228`).

**Text**
- `TextOpts {w, h, color, align, wrap, z, onPanel, boost}` (`:230-241`).
- `text(parent, name, str, role, dist, opts?) → Text` (`:244-271`). The default colour is `TEXT_LIGHT` (`:261`). On-panel text is 15 % larger and gets a same-colour outline; button labels pass `onPanel: false`.
- `setTextColor(t, c)` (`:274-277`).

**Images**
- `image(parent, name, tex, w, h?, tint?, asItem = true)` (`:280-293`).

**Buttons**
- `ButtonParts {so, btn, face, label, icon}` (`:295-301`).
- `ButtonOpts {icon, iconSize, role, toggle, primary, column, asItem, labelColor, tone}` (`:303-315`).
- `button(parent, name, w, h, label, dist, onClick, opts?)` (`:322-344`) builds a UIKit `Button`, which brings its own collider and Interactable. **`name` becomes the SceneObject name for LEAF.** `onClick` is bound to `onTriggerUp` (`:342`). Per-button `tone` lets one panel hold buttons of different modes (the suggestion panel).
- `styleWhenReady(btn, primary, tone?)` (`:357-361`) and `styleButton` (`:370-398`) paint the states: idle = `toward(t, 0.1|0.2)` with a tint outline; hover = `toward(t, 0.3)` with a `CYAN` outline; pressed = `toward(t, 0.42)`; toggled = deeper `base` with a `CYAN` outline; inactive.
- `setInactiveColor(btn, color)` (`:401-417`), e.g. for the matched green state.
- `setToggleLater(btn, on, owner)` (`:457-463`) sets the toggle one frame later, so it wins over UIKit's own flip. Use it for the chosen phrase card and the `PatternWantButton` / `PatternWithoutButton` pair.

**Other**
- `HEADER_RULE_H` and `headerRule(parent, rowW, name)` (`:420-443`): dashes in the current tint.
- `retire(so, owner)` (`:446-454`): disables now and destroys after 0.05 s. It is safe inside a Button callback, and every view's `hide()` uses it.

**View conventions to copy**
- `@component` passive view with `root: SceneObject | null` and `get isVisible() { return root !== null }`.
- `show(...)` starts with `this.hide()` and then `useTone(...)`.
- Events use SIK `Event` with a `PublicApi` getter (e.g. `WbwWordCardUI.ts:55-62`).
- Readable test state goes in public fields.
- The caller places the view with `placeFacingUser(view.getSceneObject(), pos)` (`WbwSpatial.ts:40-44`).
- Other placement helpers: `inView(dist, up, right)` (`:53-60`), `inFront` (`:47-49`), `faceRotation` (`:29-37`), `camRightFlat` (`:23-26`), `horizDist` (`:71-74`).

**Size references in existing views**

| View | Text sized for | Main text role | Buttons |
|---|---|---|---|
| Word card | 70 cm | Headline1 | 5.2 cm tall, icon above the label |
| Phrase cards | 100 cm (80 cm minimum) | Callout / Caption | — |
| Caption | 150 cm | Headline2 / Body | — |
| HUD | 60 cm | — | chip at least 3.8 cm tall |

**Gap in the current code:** the compact HUD chip in Use it live still hides the mode text (`WbwHudUI.ts:90-103`). The live panels' `modeChip` covers the "always name the mode" rule while they are visible. If nothing live is on screen, the HUD chip could say "Menu" plus `ModeChip`.

---

## (e) LEAF tests: what each one taps and asserts, what Phase C breaks, and the minimal fix

### Shared helper `WbwLeafHelpers.ts`
- **Accessors** (`:90-100`): `main.learn`, `.order`, `.practice`, `.audio`, `.hud`, `.toast`, `learn.wordCard`, `order.caption`, `order.phrases`, `order.hint`, `practice.board`. These are the `@input` property names, so keep them.
- **`tap(name)`** (`:105-129`) triggers the first **enabled** Interactable named `name` through SIK (hover, select, release). It tolerates targets that destroy themselves after `onTriggerEnd`.
- **`completeSetup()`** (`:194-215`):
  - Requires the setup panel to be visible, `setupComplete` false and mode `"none"` (`:195-197`).
  - Faces the counter. Checks the `Title` "Choose your languages" and the `SetupSoon` text containing "soon" (`:201-202`). Checks there is no `SetupSpeakOther` (`:203`).
  - Taps `SetupSpeakEnglish`, `SetupLearnHungarian` and `SetupConfirmButton` (`:204-206`).
  - Waits for `setupComplete`, the panel hidden, the toast `lastMessage` and `Message` text "Café detected (demo)" (`:207-210`).
  - **Waits for `currentMode === "learn"` within 8 s (`:211`)**, then `learn.active` (`:212`) and the `ModeLabel` text "Mode: Learn" (`:213`).
  - **Phase C breaks `:211`**: the suggestion panel waits for a choice. **Fix:** insert after `:210`: `await waitFor(() => this.main.suggestionVisible && this.hasEnabledInteractable("SuggestLearnButton"), "arrival suggestion", 8000)`, optionally check that the 4 `Suggest*Button`s are enabled, then `await this.tap("SuggestLearnButton")`. Keep `:211-213`. This one change covers DC1–DC5.
- **`switchModeViaMenu(btn, mode)`** (`:218-223`): taps `MenuButton` and the mode button, then expects `currentMode` and the menu closed. Unaffected.
- **`learnAndSave(id)`** (`:226-234`): waits for the card to be closed, taps `Learnable_<id>`, waits for the card with `currentWordId === id`, taps `WordCardSaveButton`, waits for `savedCount + 1` and the id in `savedWords`, and then **waits for the card to hide after save (`:233`)**.
  - **Phase C breaks `:233`** because the card stays open.
  - **Fix:** replace `:233` with `await waitFor(() => this.card.savedShown, "Saved state")`, then `await this.tap("WordCardCloseButton")` and `await waitFor(() => !this.card.isVisible, "card closed")`. Used by DC1, DC2 and DC5.
- **`waitForUserTurn(step)`** (`:237-240`) requires `orderStep === step && waitingFor === "user" && phrases.isVisible`.
  - **Phase C breaks it at step 2**: the phrase cards are hidden and the helper is shown.
  - **Fix:** `(this.phrases.isVisible || this.order.phraseHelperVisible)`.
- **Add:**
  - `get helper()`.
  - `async sayIt()`: wait for `order.waitingForSpeech && hasEnabledInteractable("SaidItButton")`, tap it, then wait for `!order.waitingForSpeech`. Tolerate an already-cleared wait if the mic is on.
  - `async pointAt(id, ms)`: uses a **second** `DefaultLeafInteractor("WbwLeafPointer")` and a non-awaited `hover()`, then `waitFor(learn.labelForId === id)`. Do not hover and trigger on the same interactor at once (`R2_pointing.md` §7).
  - `async useWord(id, add = false)`: `pointAt(id)`, then tap `UseThisWordButton` or `AddWordButton`.

### DC1 `DC1_ModeMenu.ts`
- **Taps:** `completeSetup` (`:17`); `learnAndSave("olivabogyo")` (`:21`); `MenuButton` (`:26, 51, 71, 76, 78`); `ModePracticeButton` (`:41`); `ModeUseLiveButton` (`:56`); `ModeLearnButton` through the helper (`:64`); `ModeMenuCloseButton` (`:73`).
- **Asserts:**
  - `savedCount` 1 (`:22`); `SavedBadge` "Saved: 1" (`:23, 68`).
  - `menuOpen` (`:27, 52, 72, 74, 77, 79`).
  - Enabled `ModeLearnButton`, `ModePracticeButton`, `ModeUseLiveButton`, `ModeMenuCloseButton` (`:28-30`).
  - `ActiveLabel` "Active: Learn" / "Active: Practice" (`:31, 53`); `SavedCount` "Saved words: 1" (`:32`).
  - Mode button `Label` texts (`:33-35`); `ModeLearnButton` / `ModePracticeButton` `Button.isOn` (`:36-37, 54-55`).
  - `currentMode` (`:42, 57, 75`), `practice.active`, `learn.active`, `order.active` (`:44-45, 58, 65-66`).
  - `modeSwitches` relative (+1, `:46`).
  - `ModeLabel` "Mode: Practice" / "Mode: Use it live" (`:47, 60`). In compact mode the Text component is disabled but its SceneObject is enabled, and `textOf` still returns the text. Keep it that way.
  - `order.orderStep === 1` after entering live (`:59`); `savedWords` contains olivabogyo (`:67`).
- **Phase C breaks:** only the helper paths (`completeSetup`, `learnAndSave`). **Body change: none.** Keep `ModeLabel` existing in compact HUD mode. Do not let a suggestion pick, or the "Use it live →" path, change `modeSwitches` in the middle of the test; the check is relative, so it is safe.

### DC2 `DC2_Learn.ts`
- **Taps:**
  - `Learnable_olivabogyo` (`:150, 187`), `WordCardPlayButton` (`:165`), `WordCardPlaySentenceButton` (`:170-171`, only if present).
  - `WordCardSaveButton` (`:179`), `WordCardCloseButton` (`:190`), `Learnable_sajt` (`:195`), `learnAndSave("sajt")` (`:205`).
  - Mode switches (`:212-214`). Head poses (`:108, 137, 146, 199, 202, 209`).
- **Asserts:**
  - Brackets: 3–4 `bracketedIds` at the counter and at the pastry spot, including `kenyer` or `szendvics` (`:110-111, 139-141`).
  - For each bracketed id: `Learnable_<id>/Brackets` enabled, a child of the object, less than 30 cm away (`:114-122`). **The number of enabled `Brackets` equals `bracketedIds.length`** (`:124-129`).
  - Card: `isVisible`, `currentWordId` (`:151`); `learn.activeCardWordId` "olivabogyo" and `activeCardWord` "olívabogyó" (`:152-153`); `WordCardHu` and `WordCardEn` (`:155-156`).
  - **`ExampleHu` contains "Kérhetek olívabogyót?" (`:157`), `ExampleEn` (`:158`), an `Illustration` image (`:159-160`).**
  - `lastVoiceKey === "w_olivabogyo"` and `voicePlayCount === plays0 + 1` on open (`:161-162`); Play adds 1 more clip and `w_olivabogyo` (`:166-167`); Sentence plays `p_kerhetek_oliva` (`:172`, optional).
  - `savedCount + 1`, `savedWords` (`:180-181`); **`!card.isVisible` after save (`:182`)**; `SavedBadge` (`:183`); `lastSfxKey === "SaveConfirm"` (`:184`).
  - Reopen: Save `Label` text **"Saved"** (`:189`); close → hidden and `activeCardWordId ""` (`:191-192`).
  - Walk-away 200 cm → hidden and id "" (`:197-201`); saved list kept after moving and switching modes (`:206-216`).
- **Phase C breaks and minimal fixes:**
  - `:157-160` (example and illustration): delete, or replace with `textOf("WordCardStatus")` reaching "Ready to listen again" once the clip ends.
  - `:165-167`: still valid, because `WordCardPlayButton` is kept. Optionally add `textOf("Label", findEnabled("WordCardPlayButton")) === "Listen again"` and `learn.cardPlayCount === 2`.
  - `:170-175`: the sentence button disappears. The `else` branch only logs, so no failure. Delete it for clarity.
  - `:182`: replace with `await waitFor(() => card.isVisible && card.savedShown && learn.activeCardWordId === "olivabogyo", "card stays steady showing Saved")`.
  - `:189`: valid if the label stays "Saved"; change it to "Saved ✓" only if the label text changes.
  - `:161-162` stay valid if hover plays nothing and open plays exactly once. LEAF's trigger hovers first, so that hover must not play audio.
  - `:124-129` stays valid only if the hover visual is not an extra enabled `Brackets` set (see b.3).
  - Add new asserts:
    - Point at `Learnable_sonka`: `labelForId === "sonka"`, `textOf("NameLabelHu") === "sonka"`, `textOf("NameLabelEn") === "ham"`, `voicePlayCount` unchanged.
    - Tap `NameLabel`, which opens the card.
    - After Save, `order.phraseSlotIds` is empty and `order.orderStep` is 0 (saving never orders).
  - Update the header comment (`:1-8`).

### DC3 `DC3_OrderingAtCounter.ts` (also exports `checkServerTurn`, `checkCards` and `orderUpToTable` for DC4)
- **`checkServerTurn(t, step, hu, en, key)`** (`:15-24`): `waitForUserTurn(step)`, `lastServerLine`, `caption.isVisible/currentHu/currentEn`, the `CaptionHu`/`CaptionEn` texts, and **`lastVoiceKey === key`** (server clip).
- **`checkCards`** (`:26-38`): `offeredPhraseIds` and `phrases.offeredIds` match exactly, and each `PhraseCard_<id>` has `Hu`, `En` and a `Picture` image.
- **`orderUpToTable`:**
  - Step 1 (`:45-55`): cards `jonapot` and `szendvicset`. Taps `PhraseCard_jonapot` → `p_jonapot`, `orderStep` still 1. Taps `PhraseCard_szendvicset` → `p_szendvicset_kerek`.
  - **Step 2 (`:57-76`)**: offers `sonka_sajt`, `kerhetek_oliva`, `uborka_nelkul`, `done`; `done` is last; the leave-out card's HU, EN and picture; the `Kész` card. Taps `PhraseCard_sonka_sajt`, `PhraseCard_uborka_nelkul`, `PhraseCard_done`. Expects `orderStep` 2 until done and `uborka_nelkul` in `answers`.
  - Step 3 (`:79-83`): `tejes_kave`. Step 4 (`:86-93`): `itt_eszem`, `elvitelre`; tap `itt_eszem`.
  - Step 5 (`:96-98`): server line, `waitingFor === "table"`, `s_hanyas_asztal`.
  - **`answers` exact string (`:99`).**
- **Scenario:** caption stays "Hányas…" with "Turn around" in the English line, arrow visible (`:112-114`).
- **Phase C breaks:**
  1. The `completeSetup` helper.
  2. **After every phrase tap the order now waits for speech.** Add `await t.sayIt()` after `:52` (jonapot; still expect `orderStep === 1` after it and the cards still offered), `:55`, `:83` and `:93`.
  3. **Replace step 2 (`:57-76`)** with:
     - `checkServerTurn(t, 2, "Mit kér bele?", "What would you like in it?", "s_mit_ker_bele")` (works once `waitForUserTurn` is fixed) and `orderStepName === "fillings"`.
     - `t.phrases.isVisible === false`, and none of `PhraseCard_sonka_sajt`, `kerhetek_oliva`, `uborka_nelkul`, `szalami_sajt`, `csirke_paprika`, `done` enabled.
     - `findEnabled("PhraseHelper")` exists.
     - `await t.useWord("szalami")` → `phraseSlotIds` "szalami", `phrasePattern` "want", `phraseHu` "Kérek szalámit a szendvicsembe.", `phraseAudioKey` "p_kerek_szalami".
     - `await t.useWord("paradicsom", true)` → "Kérek szalámit és paradicsomot a szendvicsembe.", key `c_kerek+a_szalami+c_es+a_paradicsom+c_a_szendvicsembe`.
     - Tap `PhraseHelperListenButton` → `lastVoiceKey === phraseAudioKey`, and **`orderStep` still 2** (showing and listening never submit).
     - Tap `PatternWithoutButton` → `phrasePattern` "without", `phraseHu` "Szalámi és paradicsom nélkül, kérem." (or set a single `uborka` slot first: "Savanyú uborka nélkül, kérem.", `p_nelkul_uborka`). Then tap `PatternWantButton`.
     - `await t.sayIt()`.
  4. Change `:99` to the new scheme, e.g. `"jonapot,szendvicset,fillings,tejes_kave,itt_eszem"`. This depends on the `answers` decision in c.4.
  5. `checkServerTurn`'s `lastVoiceKey === <server key>` (`:23`) holds only if nothing calls `playVoice` between the user's last clip and the next server line. Mic start and stop cues must be SFX or nothing.

### DC4 `DC4_TableNumber.ts`
- **Taps:** everything in `orderUpToTable` (`:145`); `TableNumberCard_5` (`:166`); `TableNumberButton_8` (`:179`); `PhraseCard_nyolcas_asztal` (`:196`); `PhraseCard_koszonom` (`:202`).
- **Asserts:**
  - `hint.arrowVisible` on and then off after turning (`:149, 153`).
  - `TableNumberCard_2/5/7/10` exist, are not a Button, have no `TableNumberButton_<n>`, and show the scoped `Number` text (`:158-164`).
  - Tapping an occupied table changes nothing: `lastTableTapped` 0, `chosenTable` 0, `tableCard(5).popupText ""`, **`voicePlayCount` unchanged**, `waitingFor === "table"` (`:165-172`).
  - `TableNumberButton_4/8/12` enabled with `Number` (`:173-176`).
  - Table 8: popup "8 = nyolc", `TableTranslation_8` with `Line`, `lastVoiceKey n_8`, `lastTableTapped` / `chosenTable` 8 (`:180-185`).
  - `waitForUserTurn(5)` → offered only `nyolcas_asztal`, other table phrases absent, card texts (`:189-195`); `p_nyolcas_asztal` (`:197`).
  - `checkServerTurn(6, …)` (`:200`); offered `koszonom` (`:201`).
  - `orderStep 7 && waitingFor "done"` (`:203`); **`lastVoiceKey === "p_koszonom"` (`:204`)**; `hint.hintText` contains "Walk to table 8" and "Practice" (`:205-206`).
- **Phase C breaks:** it inherits the DC3 and helper changes through `orderUpToTable`. Add `await t.sayIt()` after `:197` and after the `koszonom` tap (`:202`).
  - `:204` still holds if neither Said it nor `finish()` plays a voice clip.
  - `:171` requires that listening never calls `playVoice`.

### DC5 `DC5_Practice.ts`
- **Taps:**
  - `learnAndSave` for `olivabogyo`, `sajt`, `sonka`, `uborka` (`:29`); `ModePracticeButton` through the helper (`:36`).
  - `PracticeHu_<id>` / `PracticeEn_<id>` (`:72-93, 109`); `PracticeNewSetButton` (`:124`); `PracticeCloseButton` (`:129`); `ModeLearnButton` (`:135`).
- **Asserts:**
  - `savedCount` 4 (`:30, 137`).
  - Practice `active`, `board.state`, `pairsTotal`, `placedAt === "table"`, `boardTable === 8` (`:37-39`).
  - `PracticeBoard` position and up vector (`:40-48`).
  - `leftIds` / `rightIds`, cards with `Label` and `Picture` (`:51-64`).
  - `progressText` and the global `PracticeProgress` (`:65-66, 99-100, 118, 126`).
  - Wrong pair: `wrongAttempts`, `feedbackText` and the global `PracticeFeedback` "Try again", `selected`, `lastSfxKey "MatchWrong"` (`:69-85`).
  - Matches: `pairsMatched`, `matchedIds`, **`lastVoiceKey === "w_<id>"`** (fine for these 4 ids), `MatchedFill`, `Check` (`:88-113`).
  - Completion: `complete`, the global `Bravo`, `PracticeNewSetButton`, `PracticeDoneButton` (`:117-121`).
  - Close → `currentMode === "none"`, `practice.active` false (`:130-132`).
- **Phase C breaks:** only the helper paths (`completeSetup`, `learnAndSave`). **Body change: none.** Do not show the suggestion again on `mode "none"` (`:131`). The Practice flow is untouched by Phase C apart from the colour tokens.

### Names and state Phase C must keep
- **Scene objects:** `WordByWord`, `Camera Object`, `Table_<n>`, `TableCard_<n>`.
- **Setup and toast:** `SetupPanel`, `Title`, `SetupSoon`, `SetupSpeakEnglish`, `SetupLearnHungarian`, `SetupConfirmButton`; `Message` (inside `CafeToast`).
- **HUD:** `MenuButton`, `SavedBadge`, `ModeLabel` (it must stay a Text object even in the compact chip).
- **Mode menu:** `ModeLearnButton`, `ModePracticeButton`, `ModeUseLiveButton`, `ModeMenuCloseButton`, `ActiveLabel`, `SavedCount`; each tile's `Label`.
- **Learn:** `Learnable_<id>` with its `Brackets` child.
- **Word card:** `WordCard`, `WordCardHu`, `WordCardEn`, `WordCardPlayButton`, `WordCardSaveButton` (with its `Label`), `WordCardCloseButton`.
- **Order:** `CaptionHu`, `CaptionEn`; `PhraseCard_<id>` (with `Hu`, `En`, `Picture`) for `jonapot`, `szendvicset`, `tejes_kave`, `itt_eszem`, `elvitelre`, `nyolcas_asztal` (and 4 / 12), `koszonom`.
- **Tables:** `TableNumberCard_<n>`, `TableNumberButton_<n>` (with `Number`), `TableTranslation_<n>` (with `Line`).
- **Practice:** `PracticeBoard`, `PracticeHu_<id>`, `PracticeEn_<id>`, `PracticeProgress`, `PracticeFeedback`, `Bravo`, `PracticeNewSetButton`, `PracticeDoneButton`, `PracticeCloseButton`, `MatchedFill`, `Check`.
- **State read by the tests:**
  - main: `currentMode`, `savedWords`, `savedCount`, `setupComplete`, `menuOpen`, `modeSwitches`
  - learn: `active`, `activeCardWordId`, `activeCardWord`, `bracketedIds`, `learnableIds`
  - card: `isVisible`, `currentWordId`, `savedShown`
  - order: `active`, `orderStep`, `orderStepName`, `waitingFor` ("user", "table", "done"), `answers`, `chosenTable`, `lastTableTapped`, `offeredPhraseIds`, `lastServerLine`
  - audio: `lastVoiceKey`, `lastSfxKey`, `voicePlayCount`
  - caption: `isVisible`, `currentHu`, `currentEn`
  - phrases: `isVisible`, `offeredIds`
  - hint: `arrowVisible`, `hintText`
  - toast: `isVisible`, `lastMessage`
  - Practice and board fields as listed above.

### New (AGREED) names and state to add
- **Interactive objects:** `SuggestionPanel`, `SuggestLearnButton`, `SuggestPracticeButton`, `SuggestLiveButton`, `SuggestLaterButton`, `NameLabel` (texts `NameLabelHu`, `NameLabelEn`), `UseThisWordButton`, `AddWordButton`, `WordCardUseLiveButton`, `WordCardStatus`, `PhraseHelper` (texts `PhraseHelperHu`, `PhraseHelperEn`), `PhraseHelperListenButton`, `PatternWantButton`, `PatternWithoutButton`, `SaidItButton`, `PointerRay`.
- **State:**
  - `main.suggestionVisible`
  - learn: `hoveredId`, `labelForId`, `cardWordId` (alias), `cardPlayCount`
  - `main.savedWords` (already exists)
  - order: `phraseSlotIds[]`, `phrasePattern`, `phraseHu`, `phraseEn`, `phraseAudioKey`, `phraseHelperVisible`, `waitingForSpeech`, `speechDetected`, plus a `saidIt()` test hook
  - session: `liveWord` (the word carried over from Learn)
