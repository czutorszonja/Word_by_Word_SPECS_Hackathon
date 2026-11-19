# Phase C integration plan (Word by Word)

For: the **single agent** that wires Phase C into the live Lens Studio project (it has Lens Studio / MCP access).
Written read-only on 2026-11-19 ~02:00 from `agent/phase-c/research/R1_voice.md`, `R2_pointing.md`, `R3_hungarian.md`,
`R4_codemap.md`, `R5_tour.md`, the drafts in `agent/phase-c/drafts/`, `devpost/design-brief.md`, every
`Assets/Scripts/Wbw*.ts` and every `Assets/Tests/Leaf/*.ts`. Nothing under `Assets/` was changed and no MCP tool was used.

Where the brief, the research notes and the **AGREED PHASE C DESIGN** (from the user) disagree, the agreed design wins.
Where two research notes disagree, this plan picks one and says so in §1.

Revised ~04:00 after review: every draft below carries an explicit port / do-not-port decision; the default
Use-it-live flow is the agreed one (no prep state, D8); edits at step 2 follow R1's disarm rule (D23).

Deliverables next to this file:
- `drafts/WbwPhraseHelperModel.ts` + `.cases.md`: **port verbatim** to `Assets/Scripts/WbwPhraseHelperModel.ts`. The
  **canonical** pure phrase table, builder and state model, and the **only** phrase/ingredient table to port (§3.1
  maps older names onto it). Its own check is `selfTest()` over the cases in `.cases.md` (run command under "Run it";
  re-run 2026-11-19 with Node v24.14.0: prints `[]`).
- `drafts/WbwVoiceActivity.ts`: **port verbatim** to `Assets/Scripts/WbwVoiceActivity.ts` (§3.7). Its header + the
  closing "Integration sketch" are the contract and already use this plan's names (`init(gate, micAudio?)`,
  `setMicActive`, `arm(onEnd, clipSec)`, `saidIt(): boolean`, `disarm()`, `micLevelDb`, `noiseFloorDb`, `pulse`,
  `nudgeSaidIt`, `vadState`, `ignoreMicForTests`). It supersedes the R1 §4.6 skeleton. `drafts/WbwVoiceActivity.sim.mjs`
  is its Node check (`node agent/phase-c/drafts/WbwVoiceActivity.sim.mjs` → "ALL CHECKS PASSED", re-run 2026-11-19);
  do not copy the `.sim.mjs`.
- `drafts/WbwNameLabelUI.ts`: **port verbatim** to `Assets/Scripts/WbwNameLabelUI.ts` (§3.3). It owns the label's
  placement (`worldBox` AABB, `setObstacles`, view-box scoring, re-place on head move), the connector, the one hover
  bracket `NameLabelBracket` and the live buttons, so the plan no longer specifies `meshBox` / `chooseLabelSpot` /
  `setLink` / `replaceLabelIfHeadMoved`.
- `drafts/WbwPhraseBuilder.ts` (the R3 §11 reference): **superseded, do not copy**. It exports the same names with a
  different contract (`huSegments`, no `maxSlots`), so porting both would give `Assets/` two ingredient tables.
- `drafts/WbwAudioBank.phrase-entries.txt`: the 31 `AUDIO` entries the phrase helper needs (§4.1).
- `drafts/WbwPointing.ts`: the start of `Assets/Scripts/WbwPointing.ts` (§3.2): the **one** hover arbiter
  `WbwHoverArbiter` (plain class, owned and ticked by `WbwLearnController`, §4.7) plus `hideMouseRayVisual()` /
  `countMouseRayVisuals()`. Port it as is: label placement is **not** added here, because `WbwNameLabelUI` (draft)
  already places itself. It replaces the earlier `drafts/WbwPointer.ts` component (deleted: it duplicated the arbiter
  outside the learn controller).
- `drafts/StoryTour.ts`: the full LEAF story-tour scenario (R5 §5) written against the real `WbwLeafHelpers.ts` and
  the names/state this plan defines; U1–U6 follow the agreed flow (greeting at once, helper editable in step 1). Not
  type-checked (no `tsc` on this machine; syntax checked after Node type stripping, 2026-11-19); review notes in §8.4.
- `drafts/WbwSentenceBuilder.ts` + `.cases.md`: **obsolete** (old "… kérek, … nélkül" design). Do not copy.
- No draft exists for `WbwPhraseHelperUI.ts`, `WbwSpeakPromptUI.ts` or `WbwSuggestionUI.ts`: §3.4–§3.6 are their specs.

---

## Contents

0. Ground rules for the integrator
1. Decisions this plan makes, and open questions
2. Phase C0: preflight
3. New files in `Assets/Scripts`
4. Edits per existing script (file → function → change)
5. Scene wiring (inputs, microphone asset, colours, probe)
6. Audio keys
7. Build order (phases C1–C8) with gates
8. LEAF changes (helpers, DC1–DC5, StoryTour)
9. Verification checklist (captures per storyboard step, LEAF one at a time, logs)
10. Risks

---

## 0. Ground rules for the integrator

1. **The project is moving under you.** During this survey `WbwLearnController.ts` changed twice (01:37 colour defaults,
   01:56 new `@input hudClearDeg` used in `select()` placement), `WbwSharedUI.ts`, `WbwWordCardUI.ts`,
   `WbwPhraseChoicesUI.ts` changed at 01:37, and `WbwOrderController.ts` / `WbwCafeBuilder.ts` carry uncommitted work
   (`maxTrayDistanceCm` + `nearTray` placement; `stopAligningAfterWalkCm`). **Re-read every file right before you edit
   it and merge on top.** Line numbers below are as of 01:56 and are hints only; anchor edits on the function names
   and quoted strings. Keep the builder's work (`hudClearDeg`, `nearTray`, soft tones, mode chips).
2. Coordinate with the other agent before touching a file it is editing (SharedUI, CafeBuilder, LearnController,
   OrderController). Do not run LEAF or recompile while it is mid-edit.
3. Architecture rule (`WbwSharedUI.ts` header): only `Wbw*UI.ts` files import `WbwSharedUI` or create `Component.Text`.
   Controllers (`WbwLearnController`, `WbwOrderController`, `WbwMain`) never do. New colours come from SharedUI
   (`useTone(toneOf(mode))`, `tone.tint`, `toward()`, `CYAN`, `GREEN`, `AMBER`, `TEXT_*`, `modeChip()`); **no hex
   literals in new code**.
4. Never give a `panel()` root a name the tests `tap()`: its UIKit BackPlate carries a passive Interactable. Tapped
   names must be UIKit Buttons (`button()`).
5. Never parent UI (label, card, connector) under a `Learnable_<id>`: SIK bubbles trigger/hover events to ancestor
   Interactables (R2 §2.2), so a label button would re-select the object and replay audio.
6. Every sound goes through `WbwAudioController`. Mic cues and the speak prompt play **nothing**: never `playVoice`
   (DC3 `checkServerTurn` asserts the server clip is the last voice key; DC4 asserts voice counts), and no `playSfx`
   while a turn is armed (any Lens clip restarts the detector's guard and would eat the learner's first syllables;
   voice draft header).
7. LEAF scenarios run **strictly one at a time** (§9.2).
8. Do not commit unless the user asks. Ask the user whether to take a checkpoint commit before C1.

---

## 1. Decisions this plan makes, and open questions

### 1.1 Decisions (follow these unless the user says otherwise)

| # | Topic | Decision | Why / source |
|---|---|---|---|
| D1 | Where the hover arbiter lives | **Exactly one arbiter**, owned by `WbwLearnController` (it owns the learnables): it creates one `WbwHoverArbiter` (plain class in the new non-UI file `WbwPointing.ts`, `drafts/WbwPointing.ts`) in `init()`, ticks it from its `LateUpdateEvent`, and exposes `hoveredId` / `labelForId` / `pointerRayVisible` as getters for LEAF. The arbiter holds the only hover/trigger subscriptions on learnables; the learn controller drops its own. Placement **and** drawing (label, connector, the hover bracket) are `WbwNameLabelUI.ts`, ported from `drafts/WbwNameLabelUI.ts` (it places itself from the object's world AABB and re-places on head moves); no `meshBox` / `chooseLabelSpot` in `WbwPointing.ts`. | R2 §4, R4 (b), drafts |
| D2 | Label object | **One reused `NameLabel`** (a UIKit Button) under a neutral `NameLabelRoot`. Shown/hidden by enabling, texts rewritten per switch, never rebuilt per hover. | R2 §1.3 |
| D3 | Flicker | First show immediate (except within 0.35 s of a deliberate hide such as selecting through the label, so the pan that sat behind the label does not pop up); switch only after 0.12 s on a new object (0.15 s for the hand ray); hide 0.5 s after nothing (object or label) is hovered. The pointed object is the one the **most recently entering interactor** points at; a stale mouse or the other hand is never a fallback. Never show/hide inside `onHoverExit`. | R2 §4 |
| D4 | Pointer visual | **No `PointerRay` is drawn in the Preview.** Learnables get `targetingVisual = None` in the editor and `Ray` on device (SIK's own hand ray, only while pointing at a learnable); the Mouse `InteractorRayVisual` component is disabled in the editor. `learn.pointerRayVisible` is measured, not a constant: true while any SIK `InteractorRayVisual` is drawing (component on, cursor `rayAlpha` above threshold). It must be `false` in the Preview and is `true` on device while SIK's hand ray shows. R5 expected a visible ray in the tour; R2 (newer) found the "diagonal band" is SIK's mouse ray. Plan follows R2; open question Q5. | R2 §8 |
| D5 | Steady card | Placed once at select; closes only on its close button, another object's select, walk-away (> `walkAwayCm` 150) or leaving Learn. Save no longer flies the card away. Re-selecting the **same** object replays the clip (`cardPlayCount++`) without rebuilding or moving the card. | Agreed 3, R2 §7 |
| D6 | Word card contents | ChipRow (`ModeChip` "Learn"), `WordCardHu` (large), `WordCardEn` (small), `WordCardCloseButton`, status line `WordCardStatus` ("Playing pronunciation" → "Ready to listen again"), buttons `WordCardPlayButton` "Listen again", `WordCardSaveButton` "Save" → "Saved ✓", `WordCardUseLiveButton` "Use it live →". Illustration, example sentence and `WordCardPlaySentenceButton` are removed. | Agreed 3, brief "Word card" |
| D7 | Phrase builder | `WbwPhraseHelperModel.ts` = `drafts/WbwPhraseHelperModel.ts` verbatim (it supersedes the R3 §11 listing / `drafts/WbwPhraseBuilder.ts`, which must not be ported). Its `PHRASE_INGREDIENTS` table **is** the per-item store of nominative, accusative, English and clip keys (agreed 6: forms stored per item). The startup check is `checkAgainstVocab(WORDS)` from the model (WordEntry exists, `hu` = nom, `en` = enLabel, `audio` = wClip), printed loudly with `missingClips` in the order controller's `init()` (§4.9). Max 4 slots, insertion order, only the 15 counter ingredients. One `PhraseHelperModel` instance in the order controller holds the phrase, so `useWord` / `addWord` / `setPattern` follow its refusal rules. | R3 §1, §11 |
| D8 | Entering Use it live (card link, mode menu or suggestion) | **The agreed flow, no extra gate:** the greeting starts at once (`startOrder()` / `runStep(orderStep)` as today), and the `PhraseHelper` is visible from entry with the seeded phrase (D22): from the card, "Kérek uborkát a szendvicsembe." while the server says "Jó napot! Mit kér?". No prep state, no `ReadyToOrderButton`, `waitingFor` gains no `"ready"`. Keeps DC1 `orderStep === 1`, DC3, DC4. A prep state that waits for "Ready to order" is only an alternative (Q2). | Agreed 5/6, storyboard order |
| D9 | Where the helper shows | Steps 1 and 2. **Step 1:** stacked on the tray directly above the step-1 phrase row (`placeColumn`, §4.9); editable while the server is not speaking; **never armed** (the chosen step-1 card's speak turn is the only turn). **Step 2:** the single answer surface (no cards). Steps 3–6 and after `finish()`: hidden, slots kept. | Agreed 5/7 |
| D10 | Live-mode label | Violet (`toneOf("live")`) label with `UseThisWordButton` (replace slots) and `AddWordButton` "+ és" (append; only when the phrase already has ≥ 1 slot, < 4 slots, and the word is not in it). Buttons only while the phrase is editable (`phraseEditable`: helper visible, step 1 or 2, server not speaking) and only for the 15 phrase ingredients; otherwise the label is word + translation only. A word already in the phrase shows "In your phrase" + check instead of buttons. | Agreed 6, R3 §8 labels |
| D11 | Pinching an ingredient in Use it live | Pins the label (keeps it shown ~2 s more: `hover.pin(id, 2)`). **No phrase change, no audio, never opens the Learn card.** Only the label buttons edit the phrase. Open question Q3. | Agreed 4/7 ("deliberate") |
| D12 | Auto-play on deliberate phrase change | `@input playPhraseOnChange = true`: Use this word / + és / pattern switch play the updated phrase once. Hover never plays. Showing the helper (on entry, at step 2) never auto-plays. Never while the server speaks: editing and Listen are refused while `waitingFor === "server"`, because a new `playVoice` replaces the server line's `onDone` and the step would never continue (`WbwAudioController.playOne`). Open question Q1 (R1's question). | R1 §5.1.3 |
| D13 | Speak turns | One speak turn per answer. Choosing an answer (tapping a phrase card; at step 2: the helper having ≥ 1 slot) opens the turn: `waitingForSpeech = true`, the single `SpeakPrompt` strip with **`SaidItButton`** appears under the active surface, and the voice detector is armed. The detector ignores frames while `audio.isBusy()` and 0.35 s after (R1 §4.4), so our own clip never counts. Speech end (mic) or Said it → `onSaid(source)` → answer recorded → server continues. **Showing, choosing, listening or editing never submits.** | Agreed 7, R1 §5 |
| D14 | Step 2 turn opening | After "Mit kér bele?" ends: helper on the tray as the answer; if it already has ≥ 1 slot the turn opens immediately (Said it visible) and the detector is armed with `durationOf(phraseAudioKey)` without playback (the learner read and heard this phrase during step 1); else it opens when the first word is chosen (which auto-plays it, D23). Arming without playback is the risk R1 names; open question Q13. | R5 U8, voice draft "WHEN TO ARM" |
| D15 | `answers` scheme | Pushed **on said**, not on tap: `jonapot`, `szendvicset`, `fillings`, `tejes_kave`, `itt_eszem`, `nyolcas_asztal`, `koszonom` (non-advancing answers such as `jonapot` are recorded but stay on the step). Step 2 also stores `fillingsSaid = phraseHu`. DC3's string becomes `"jonapot,szendvicset,fillings,tejes_kave,itt_eszem"`. | R4 c.4 |
| D16 | Removed step-2 cards | `sonka_sajt`, `kerhetek_oliva`, `uborka_nelkul`, `szalami_sajt`, `csirke_paprika` and pseudo-card `done` are deleted from `PHRASES`; step 2 is `helper: true` with no choices. Their audio files stay (unused or used elsewhere). | Agreed 7 |
| D17 | Arrival | `WbwMain.arrivalPhase`: `setup → walkIn → toast → suggest → done`. Toast fires after 80 cm of walking or 1.5 s, stays `toastSeconds`, then the `SuggestionPanel` (Learn / Practice / Use it live + Later, each in its tone with its label) appears 0.3 s after the fade. **Nothing auto-starts.** HUD hidden until a pick. New `@input arrivalSuggestion = true` (false = old auto `firstMode`). | Agreed 8, R5 §3 |
| D18 | Walk-in start spot | Optional phase C7 (touches `WbwCafeBuilder`, which the other agent owns): `arrivalWalkIn` + `EntranceSpot` (0, 0, 520). The tour works with or without it (it cuts to the door when the builder has no walk-in). | R5 §2 |
| D19 | Mode name always visible | Every new panel calls `modeChip()`. The compact Use-it-live HUD chip gets a `HudModeChip` next to "Menu" (today it hides the mode text). | Agreed 9, R4 (d) gap |
| D20 | UI module creation | New views are `@input @allowUndefined` on their controllers; `WbwMain.start()` creates any that are not wired (empty SceneObject under the UI root + `createComponent`). Scene-authored objects are preferred (inspector-tunable) but not required. | R4 §0 "Scene wiring" |
| D21 | Voice detector creation | `WbwVoiceActivity` = `drafts/WbwVoiceActivity.ts` verbatim. Created at runtime by `WbwMain` and initialised explicitly with `init(this.audio, this.micAudio)` (gate = the audio controller's `isBusy()` / `isVoiceBusy()`; runtime-created components get no `@input`s before `onAwake`). The Microphone Audio asset is an `@input @allowUndefined micAudio` on `WbwMain`, passed through `init` (the detector's own `micAudio` input stays empty). No asset → Said-it-only mode, no errors. | R1 §3.1, voice draft header |
| D22 | Seeding the phrase on entry | Only when the phrase is **empty** (an edited phrase survives leaving and re-entering Use it live): first the card's word (`takeLiveEntry().wordId`), else `session.liveWord` (last word carried from a card), else the most recently **saved** counter ingredient (`session.saved` scanned from the end, first id with `canUseInPhrase`), else empty ("Kérek … a szendvicsembe."). Seeded words use pattern "want". So "after learning uborka" the menu entry also shows "Kérek uborkát a szendvicsembe." DC3/DC4 save nothing, so their empty-slot assert holds; DC1 seeds `olivabogyo` and asserts nothing about the phrase. Open question Q12. | Agreed 5 |
| D23 | Editing while the step-2 turn is open | R1 §5.1 rule: every phrase change (`UseThisWordButton`, `AddWordButton`, pattern switch) at step 2 first calls `vad.disarm()`; the controller's `speakTurn` (and Said it) stays open. With auto-play (D12) the detector is re-armed right after `playVoice(newKey)` starts: the gate holds detection while it plays and 0.35 s after, which equals arming in its `onDone`. Without auto-play (Q1 = no) the mic re-arms only after the next `PhraseHelperListenButton` playback. So a phrase that changed must be heard before the mic can submit it; Said it is always available. Edits in step 1 never touch the step-1 card turn. | R1 §5.1, voice draft sketch |
| D24 | Bracket colours | No colour literals in the learn controller. Its three `vec4` inputs (`bracketColor`, `focusColor`, `highlightColor`) are deleted (`.ts.meta` changes); it asks the UI module at use time: `markerTint("learn")` (discovery markers), `markerTint("live")` (live highlight), `markerTint("focus")` (open card's word), exported by `WbwNameLabelUI.ts` (`toneOf(kind).tint` / `CYAN` from SharedUI), so the builder's tone refinements reach the brackets with no scene reset. The hover bracket `NameLabelBracket` already uses the same tones. | Agreed 9, Hard Rule 3 |

### 1.2 Open questions for the user (defaults are what this plan builds)

| # | Question | Default built |
|---|---|---|
| Q1 | Should "Use this word", "+ és" and the pattern switch **play the updated phrase once**? (R1 recommends yes; otherwise the learner must press Listen.) | Yes (`playPhraseOnChange = true`) |
| Q2 | Opening Use it live: should the server **wait** (a prep state with a "Ready to order" button on the helper) so the learner can reuse the phrase before the greeting? Not in the agreed design; ask before C5. If yes, add the §4.9 "Q2 alternative" block and the tour's prep variant (§8.4). | No: greeting at once, helper visible and editable during step 1 (D8, D9) |
| Q3 | In Use it live, should **pinching an ingredient** do "Use this word"? | No: it only pins the label |
| Q4 | Does the font render **"Saved ✓"**? If not: "Saved" + the check icon (brief wording). | "Saved ✓", fallback "Saved" |
| Q5 | Confirm **no visible pointer ray in the laptop Preview** (R5 assumed one; R2 traced the "diagonal band" to SIK's mouse ray). | None in Preview; SIK hand ray on device |
| Q6 | Start at the **café door** (walk-in, needs ~6 m clear floor on device) or at the counter? | Counter until C7; then walk-in in Preview, `arrivalWalkIn = false` for small rooms |
| Q7 | "Use it live →" on a **non-ingredient** card (kávé, kenyér…): open anyway, or hide the link? | Link always shown; the card's word is skipped (not a filling) and the phrase is seeded per D22, else empty |
| Q8 | Keep a tiny **mode chip on the hover label** (always name the mode) or keep the label to word + translation only? | Tiny chip |
| Q9 | Wording: "SAY IT AT THE COUNTER", "Said it", "Say it out loud", "What would you like to do here?", "Later", label buttons "Use this word" / "Add (+ és)" / "In your phrase" (the label draft's strings). | As listed |
| Q10 | Multi-item stitched audio has ~0.58 s gaps (R3 §7.3). Trim the start/end padding of the `a_*` and `c_*` clips in place (same names)? | Not done |
| Q11 | DC5 seat fix + practice board nudge clamp `[-20, 25]` (R5 §4.4, §7b): OK to change? | Yes (C0 if DC5 fails at baseline) |
| Q12 | Opening Use it live from the **menu or suggestion** after learning words: seed the phrase with the last carried word, else the last saved counter ingredient (D22), or start empty? | Seed (only when the phrase is empty) |
| Q13 | At step 2, arm the mic as soon as "Mit kér bele?" ends when the phrase is ready, **without** replaying it (D14)? Risk (R1 §5.1): self-talk such as "hmm, szalámi" could submit; the 0.66–0.8 s minimum speech from the phrase length lowers it, does not remove it. Alternative: replay the phrase once at step 2 and arm in its end (then DC3/tour must stop asserting `lastVoiceKey === "s_mit_ker_bele"` after the question), or arm only after Listen. | Arm without replay; Said it always visible |

---

## 2. Phase C0: preflight (before any code change)

1. **Disable `TEMP_Probe`.** Its `stage` input is currently `"wordcard:szalami"` in `.virtual-scene.json` (earlier
   `"view:ServerSpot::0:0"`); any non-`"setup"` stage drives the flow and breaks `completeSetup()`. Set `stage = "setup"`
   **and** disable the object now; delete `Assets/Scripts/WbwTempProbe.ts` + the object at the end of C5 (it calls
   private methods Phase C changes and expects the deleted `sonka_sajt`/`done` cards).
2. **Do not reset the bracket colours to literals.** `bracketColor`, `focusColor`, `highlightColor` on
   `WordByWord/Controllers/LearnController` still hold old serialized values (R4 §0), but C3 deletes these three inputs
   and the brackets take their tints from `WbwNameLabelUI.markerTint()` (D24), which reads SharedUI's tones at use time.
   Until C3 the old colours only affect captures; ignore them.
3. Recompile (`RecompileTypeScriptTool`) and collect logs (`RunAndCollectLogsTool`): zero TS errors, no
   `WbwMain: required @input not wired`.
4. **Baseline LEAF**, one at a time: DC1, DC2, DC3, DC4, DC5. Record pass/fail and the first failing assertion.
   Expected pre-existing failure: **DC5** (`Table_8` moved to (-405, 440); the seat `eyeAt(-145, 310)` is 291 cm away,
   over `nearTableCm` 250 → board "front"). If it fails that way, apply the DC5 fix in §8.3 now.
5. Ask the user whether to take a checkpoint commit (do not commit unasked).

---

## 3. New files in `Assets/Scripts`

### 3.1 `WbwPhraseHelperModel.ts` (pure, non-UI)
- Copy `agent/phase-c/drafts/WbwPhraseHelperModel.ts` verbatim. It is the canonical table and builder; do **not** copy
  `drafts/WbwPhraseBuilder.ts` (superseded R3 §11 reference) or `drafts/WbwSentenceBuilder.ts` (old design).
- Exports: `PhrasePattern`, `PhraseIngredient`, `PHRASE_INGREDIENTS`, `MAX_SLOTS = 4`, `SLOT_PLACEHOLDER = "…"`,
  `PhraseBuild {pattern, slotIds, hu, en, emphasisRanges, enEmphasisRanges, slotSpan, enSlotSpan, huParts, enParts,
  audioKey, audioParts, valid, empty, answerToken}`, `ingredientById`, `canUseInPhrase`, `normaliseSlots`, `capFirst`,
  `formInPhrase`, `buildPhrase(slotIds, pattern, maxSlots?)`, `toRichText`, `segmentsOf`, `phraseClipKeys()`,
  `missingClips(has)`, `canListen(build, has)`, `checkAgainstVocab(words)`, the `PhraseHelperModel` class
  (`useWord`, `addWord`, `setPattern`, `canUse`, `canAdd`, `pointerActions`, `build()`, `testState()`) and `selfTest()`.
- **Name mapping for the rest of this plan** (written against the older builder): `BuiltPhrase` → `PhraseBuild`;
  `phraseIngredientById` → `ingredientById`; `huSegments` / `enSegments` → `segmentsOf(b.hu, b.emphasisRanges)` /
  `segmentsOf(b.en, b.enEmphasisRanges)`, or `toRichText(...)` for one rich-text `Text`.
- Rules the controller must take from the model rather than re-implement: `UseThisWordButton` → `model.useWord(id)`, which
  **refuses a word already in the phrase**, so a combined phrase is never collapsed; `AddWordButton` → `model.addWord(id)`;
  `PatternWantButton` / `PatternWithoutButton` → `model.setPattern(p)`. The label draft's button rule mirrors
  `model.pointerActions(id)` (`showUse` false when `inPhrase`, `showAdd` only for 1–3 words; §3.3), and every press is
  re-checked by the model, which is the single authority.
- The model's own check is `selfTest()` (cases in `.cases.md`; it returns `[]`); `checkAgainstVocab(WORDS)` against
  today's `Assets/Scripts/WbwVocab.ts` also returns `[]` (run 2026-11-19 under Node v24.14.0).
- Traps it already handles: id `csirke` → `w_sult_csirke`/`a_sult_csirke`; id `uborka` (pickles) → `w_uborka`/
  `a_savanyu_uborka` (there is no `a_uborka`); "meatball" label vs "meatballs" in the phrase.

### 3.2 `WbwPointing.ts` (non-UI pointing logic; imports `WbwSpatial` and SIK only; start from `drafts/WbwPointing.ts`)
- `class WbwHoverArbiter` (plain class, **not** a `@component`; the only hover arbiter in the Lens):
  `new WbwHoverArbiter(targets: {id, interactable}[], options?)` subscribes Target-phase
  `onInteractorHoverEnter/Exit` + `onTriggerEnd` on every learnable (the **only** such subscriptions: the learn
  controller drops its own) and sets `targetingVisual` (`None` in the editor, `Ray` on device). The owner calls
  `update()` from its `LateUpdateEvent`. Options (defaults): `switchDwellSec` 0.12, `handSwitchDwellSec` 0.15,
  `exitGraceSec` 0.5, `reacquireSec` 0.35, `quietLearnableCursor` true, `hidePreviewMouseRay` true.
  - Readable: `hoveredId` (follows only the interactor that most recently entered a learnable, so a stale preview
    mouse or the other hand is never a fallback), `labelForId` (debounced), `pointerRayVisible` (true while any SIK
    `InteractorRayVisual` draws: component on and cursor `rayAlpha` > `RAY_VISIBILITY_THRESHOLD`; rescanned at
    0.05/0.5/1.5/3 s, then every 5 s), `hoverStackIds`, `activeInput`, `holding`, `suppressedId`, `pinnedId`,
    `mouseRayVisualsHidden`, `labelChanges`, `selectCount`.
  - Methods: `setLabelsEnabled(on)`, `refresh()` (re-sends the current label so the owner re-styles it),
    `setHoldSource(fn)`, `setSuppressSource(fn)` (the open card's word: hidden at once), `pin(id, s)` (D11),
    `clearFocus()`, `isHovered(id)`, test hooks `pointAt(id)` / `clearPoint()`, `dispose()`.
  - Events: `onLabelChanged({id, previousId, inputType, refresh})`, `onSelected({id, inputType})`.
  - Rules (D3): first label at once, except within `reacquireSec` of a deliberate hide (select, card opened,
    `clearFocus`), because the unmoved pointer then hits whatever sat behind the label; switch after the dwell; hide
    `exitGraceSec` after nothing is pointed at and the label is not hovered; never inside a SIK exit callback.
- No `meshBox` / `chooseLabelSpot` here (the draft header's "add them from R2 §5–§6" note is void): the label draft
  already implements both (`worldBox` + `placeNow`, §3.3), so porting them here would duplicate placement.
- `hideMouseRayVisual(visuals?): number`: disables every `InteractorRayVisual` whose `_interactor.inputType` is
  `InteractorInputType.Mouse` (R2 §8 step 2). The arbiter calls it on each ray scan in the editor, so nobody else
  needs to. `countMouseRayVisuals(enabledOnly = true): number` for a LEAF "no band" check.

### 3.3 `WbwNameLabelUI.ts` (view; Learn and Use it live hover label) — port `drafts/WbwNameLabelUI.ts` verbatim
Component on `NameLabelRoot` (under `WordByWord/UI`, world-static, unrotated, scale 1, never under a learnable). It
builds a `PointingUI` child on the first `show()` and reuses it. The draft's header is the contract; summary:
- Objects (stable names): `NameLabel` (**UIKit Button**, the whole label is selectable) with `NameLabelChip` (tiny
  `modeChip`, its text is `ChipLabel`, Q8), `NameLabelHu` (large, `TEXT_LIGHT`), `NameLabelEn` (small, `TEXT_SOFT`);
  live row: `UseThisWordButton` ("Use this word"), `AddWordButton` ("Add (+ és)", only once the phrase has 1–3 words),
  or `NameLabelStatus` ("In your phrase" + check icon); `NameLabelLink` (connector, thin unlit box, no collider);
  `NameLabelBracket` (the **one** discreet hover bracket, `toneOf(mode).tint`, `CYAN` while the label is hovered;
  never named `Brackets`, which DC2 counts). The learnable's own `Brackets` are never enabled or retinted by hover.
- **Placement is the view's own** (draft `placeNow`): candidates right / left / upper-right / upper-left of the
  object's world AABB (`worldBox`, skipping `Brackets` and our UI), scored in gaze angles inside
  `viewHalfWidthDeg` 16 × `viewHalfHeightDeg` 19, avoiding the obstacles from `setObstacles(learnables)` and the open
  card, pulled `pullTowardEyeCm` 10 toward the eye; re-placed in its own `tick()` when the head moved > `replaceMoveCm`
  10 or turned > `replaceTurnDeg` 8 (never while the label itself is hovered).
- API used by the learn controller:
  - `setObstacles(list: {id, so, size}[])` once in `init()` (the café's `learnables` fit as they are);
  - `show(target: {id, hu, en, so, size}, opts: {mode: "learn" | "live", live?: {phraseIds, maxSlots, usable}, card?: {pos, size} | null})`;
  - `refresh({live?, card?})` (phrase or card changed while shown; does not move the label), `hide()`;
  - readable: `labelForId`, `labelMode`, `labelHu`, `labelEn`, `labelSide`, `labelSize`, `liveControls`, `isVisible`,
    `hovered` (alias of `isHovered`: raw SIK hover on the label and its child buttons), `showCount`;
  - events: `onSelect({id, mode})`, `onUseWord(id)`, `onAddWord(id)`, `onHoverChanged(bool)`;
  - exported `markerTint(kind: "learn" | "live" | "focus"): vec4` (D24) and `worldBox(so, fallbackSize?)`.
- Live row rule (draft `liveRowSpec`): no row unless `mode` is live and `live.usable`; `inPhrase` → status; else Use,
  plus Add while `1 ≤ phraseIds.length < maxSlots`. This mirrors `PhraseHelperModel.pointerActions(id)` exactly; the
  order controller re-checks every press through the model (`useWord` / `addWord` refuse), so a stale label can
  never produce a wrong phrase.
- Must not: play audio, track hover on learnables (the arbiter does), decide what a select means, change the phrase.

### 3.4 `WbwPhraseHelperUI.ts` (passive view; "SAY IT AT THE COUNTER")
Component on `PhraseHelperRoot`. Built by `show()`; **updated in place** by `setPhrase()` (same `PhraseHelper`
object across edits: the tour asserts its `uniqueIdentifier` does not change). Fixed panel size sized for the longest
phrase (4 slots, two lines) so the frame never jumps.
```
┌──────────────────────────────────────────────────────┐ PhraseHelper (TONE_LIVE panel, see-through)
│ [Use it live]  SAY IT AT THE COUNTER                 │ Head: ModeChip + PhraseHelperTitle (Caption, TEXT_SOFT)
│ Kérek szalámit és paradicsomot a szendvicsembe.      │ PhraseHelperHu (Callout/Headline2), slot runs emphasised
│ I'd like salami and tomato in my sandwich.           │ PhraseHelperEn (Caption, TEXT_SOFT)
│ Point at an ingredient, then "Use this word"         │ PhraseHelperHint (only while empty)
│ [▶ Listen] [Kérek … | … nélkül]                       │ Buttons
└──────────────────────────────────────────────────────┘
```
- Buttons: `PhraseHelperListenButton` ("Listen"; inactive unless `canListen(b, (k) => audio.has(k))`, i.e. the phrase
  is non-empty **and** every clip of its sequence is in the bank, so a partly missing sequence is never played), `PatternWantButton` ("Kérek …" /
  "I'd like") and `PatternWithoutButton` ("… nélkül" / "Without") as a toggle pair (`setToggleLater`). All three are
  inactive while `setEditable(false)` (the server is speaking). No `ReadyToOrderButton` (only in the Q2 alternative).
- Emphasis of the slot (agreed 5: ingredient gently emphasised, frame stable):
  - **A (try first):** single `Text` with `enableRichText = true` (Lens Scripting 356+, `Support/StudioLib.d.ts`
    `Text.enableRichText`), each ingredient range from `b.emphasisRanges` wrapped in bold + the tone tint via
    `toRichText(b.hu, b.emphasisRanges, open, close)` (not `huParts.slot`, which also covers the joiners). Verify the tag syntax with
    `QueryLensStudioKnowledgeBase` and a capture. Convert `toneOf("live").tint` to the tag colour at runtime (add a
    `hexOf(vec4)` helper to SharedUI if needed); no literal hex.
  - **B (fallback):** plain text + a soft tinted `RoundedRectangle` pill behind each slot range using
    `Text.getHighlightRects(start, end)` (Lens Scripting 362+), colour `toward(TONE_LIVE, 0.6, 0.5)`.
  - Line breaks (R3 §8): never inside "sült csirkét"/"savanyú uborkát"; pattern A breaks before " a szendvicsembe.",
    pattern B keeps "<last> nélkül, kérem." together.
  - Readable `plainHu` / `plainEn` (the untagged strings) for tests; tests should prefer `order.phraseHu`.
- `setPhrase()` / `setEditable()` before the first `show()` only store their values (the order controller rebuilds
  the phrase in `setActive(true)` before `runStep` shows the helper).
- API: `show(b: PhraseBuild)`, `setPhrase(b: PhraseBuild)`, `setPattern(p)`, `setEditable(on: boolean)`, `hide()`,
  `get sizeCm(): vec2`, readable `isVisible`, `plainHu`, `plainEn`, `editable`; events `onListen`,
  `onPattern(p: PhrasePattern)`. (Q2 alternative only: `ReadyToOrderButton` + `onReady`.)

### 3.5 `WbwSpeakPromptUI.ts` (passive view; the ONE `SaidItButton`)
Component on `SpeakPromptRoot`. A solid strip (height < 10 cm, so `panel()` draws it solid), `TONE_LIVE`.
- Objects: `SpeakPrompt` (panel root, not tapped), `ModeChip`, `MicIndicator` (small `RoundedRectangle` dot that pulses
  with the level), `SpeakPromptText` (Caption), `SaidItButton` ("Said it", primary, `check_circle` icon).
- States (R1 §5.4), text examples: listening "Say it out loud"; speech "Heard you…" (`GREEN` dot); done
  "Heard you ✓" (~0.6 s, then hide); nosignal "Mic off · tap Said it" (Said it styled primary); nudge
  "Say it out loud, or tap Said it" (Said it pulses); detector off "Say it out loud, then tap Said it".
  **Never `AMBER`** (VAD cannot judge correctness).
- API: `show()`, `hide()`, `setState(state: string, level01: number, nudge: boolean)`, `showHeard()`,
  `get sizeCm(): vec2`, readable `isVisible`, `stateText`, `showToken`; event `onSaidIt`.
- **Show token (the next answer must not be hidden by the last one's "Heard you ✓"):** `private showToken = 0`;
  `show()` and `hide()` each do `showToken++`; `showHeard()` sets the done state, captures `const tok = ++showToken`
  and schedules the ~0.6 s hide as `if (tok === this.showToken) this.hideNow()` (`hideNow` = the hide body without
  bumping the token). So a `show()` for the next answer inside those 0.6 s (DC3 chooses `szendvicset` ~0.2–0.3 s after
  saying "Jó napot!") cancels the pending hide, and `SaidItButton` stays enabled.
- `setState()` is the controller's job only while a turn is open (§4.9 `tick()`); after `showHeard()` nothing
  overwrites the done state.
- Because it is the only owner of `SaidItButton`, LEAF's "first enabled match" is always the right one.

### 3.6 `WbwSuggestionUI.ts` (passive view; arrival suggestion)
R5 §3.3 layout: `SuggestionPanel` 33 × 22.4 cm at 70 cm, app-level tone (`TONE_LEARN` as setup/menu use).
- `SuggestTitle` "What would you like to do here?" (Headline2) + `headerRule`.
- Tiles (pattern of `WbwModeMenuUI.show()` entries): `SuggestLearnButton` (`school.png`, `tone: TONE_LEARN`),
  `SuggestPracticeButton` (`extension.png`, `TONE_PRACTICE`), `SuggestLiveButton` (`local_cafe.png`, `TONE_LIVE`);
  the scoped `Label` of each is exactly "Learn" / "Practice" / "Use it live". Suggested tile (Learn while
  `savedCount < 4`) gets `primary: true`.
- `SuggestDescription` (Caption, soft): "Suggested here: start with Learn" / hover texts from R5 §3.3 table.
- `SuggestLaterButton` "Later" (toned, not grey).
- API: `show(savedCount: number, suggested: string)`, `hide()`, `setDescription(text)`; events
  `onPick(option: "learn" | "practice" | "live" | "later")`, `onHover(option | "")`; readable `isVisible`,
  `hoveredOption`, `descriptionText`.
- Do not use globally searched text names (`Title`, `Message`, `ModeLabel`, `SavedBadge`, `ActiveLabel`, `SavedCount`).

### 3.7 `WbwVoiceActivity.ts` (non-UI detector) — port `drafts/WbwVoiceActivity.ts` verbatim
- **Do not** start from the R1 §4.6 skeleton: the draft supersedes it, keeps its names and passes
  `drafts/WbwVoiceActivity.sim.mjs`. Its header + "Integration sketch" (end of file) are the contract.
- Use **style a** only (plan / R1 style; never mix with `start()` / `onSpeechDetected` in the same controller):
  `init(gate, micAudio?)` (gate = `WbwAudioController`, which must have `isBusy()`, and optionally `isVoiceBusy()`,
  §4.2), `setMicActive(on)`, `arm(onEnd: (source: "mic" | "button") => void, clipSec)` (re-arming an open turn drops a
  half-heard utterance and restarts the tail guard), `saidIt(): boolean` (**false when no turn is armed**: then the
  controller calls its own `onSaid("button")`), `disarm()`, `recalibrate()`,
  `injectBlocksForTest(db, count, gated = false)`.
- Readable: `vadState` (off | guard | listening | candidate | speech | done | nosignal), `speechDetected` (mic only),
  `speechSource`, `micAvailable`, `micStatus`, `nudgeSaidIt`, `noisy`, `micLevelDb`, `noiseFloorDb`, `pulse` (0..1 for
  the `MicIndicator`, 0 while a Lens clip or its tail guard runs), `sampleRateActual`, `armCount`, `ignoreMicForTests`
  (setter), LEAF counts `settleBlocks`, `minSpeechBlocks`, `endSilenceBlocksMax`. Its `waitingForSpeech` / `listening`
  are detector-side only: the order controller owns `waitingForSpeech` (`speakTurn !== null`) and never mirrors them.
- `clipSec` is always `audio.durationOf(key)` (§4.2): minimum speech `clamp(0.3 × clip, 0.5, 0.8)` s, fluent end
  window after half the phrase is voiced. Gate: nothing counts while `isBusy()` and `tailGuardSec` 0.35 s after; no-
  signal watchdog 1.5 s; nudge at 8 s (4 s noisy). Never advances on a timeout; never stores or uploads samples.
- **No sound between arming and the end of the turn** (draft header): any Lens clip restarts the guard, so the speak
  prompt and mic cues stay silent; "Heard you…" is visual only.

---

## 4. Edits per existing script (file → function → change)

### 4.1 `WbwAudioBank.ts`
- Add these 31 lines inside `AUDIO` (all `.wav` + `.meta` exist in `Assets/Audio/hu/`):
```ts
  "c_a_szendvicsembe": requireAsset("../Audio/hu/c_a_szendvicsembe.wav") as AudioTrackAsset,
  "p_kerek_csirke": requireAsset("../Audio/hu/p_kerek_csirke.wav") as AudioTrackAsset,
  "p_kerek_hagyma": requireAsset("../Audio/hu/p_kerek_hagyma.wav") as AudioTrackAsset,
  "p_kerek_husgomboc": requireAsset("../Audio/hu/p_kerek_husgomboc.wav") as AudioTrackAsset,
  "p_kerek_majonez": requireAsset("../Audio/hu/p_kerek_majonez.wav") as AudioTrackAsset,
  "p_kerek_mustar": requireAsset("../Audio/hu/p_kerek_mustar.wav") as AudioTrackAsset,
  "p_kerek_olivabogyo": requireAsset("../Audio/hu/p_kerek_olivabogyo.wav") as AudioTrackAsset,
  "p_kerek_paprika": requireAsset("../Audio/hu/p_kerek_paprika.wav") as AudioTrackAsset,
  "p_kerek_paradicsom": requireAsset("../Audio/hu/p_kerek_paradicsom.wav") as AudioTrackAsset,
  "p_kerek_sajt": requireAsset("../Audio/hu/p_kerek_sajt.wav") as AudioTrackAsset,
  "p_kerek_salata": requireAsset("../Audio/hu/p_kerek_salata.wav") as AudioTrackAsset,
  "p_kerek_sonka": requireAsset("../Audio/hu/p_kerek_sonka.wav") as AudioTrackAsset,
  "p_kerek_spenot": requireAsset("../Audio/hu/p_kerek_spenot.wav") as AudioTrackAsset,
  "p_kerek_szalami": requireAsset("../Audio/hu/p_kerek_szalami.wav") as AudioTrackAsset,
  "p_kerek_uborka": requireAsset("../Audio/hu/p_kerek_uborka.wav") as AudioTrackAsset,
  "p_kerek_uborka_friss": requireAsset("../Audio/hu/p_kerek_uborka_friss.wav") as AudioTrackAsset,
  "p_nelkul_csirke": requireAsset("../Audio/hu/p_nelkul_csirke.wav") as AudioTrackAsset,
  "p_nelkul_hagyma": requireAsset("../Audio/hu/p_nelkul_hagyma.wav") as AudioTrackAsset,
  "p_nelkul_husgomboc": requireAsset("../Audio/hu/p_nelkul_husgomboc.wav") as AudioTrackAsset,
  "p_nelkul_majonez": requireAsset("../Audio/hu/p_nelkul_majonez.wav") as AudioTrackAsset,
  "p_nelkul_mustar": requireAsset("../Audio/hu/p_nelkul_mustar.wav") as AudioTrackAsset,
  "p_nelkul_olivabogyo": requireAsset("../Audio/hu/p_nelkul_olivabogyo.wav") as AudioTrackAsset,
  "p_nelkul_paprika": requireAsset("../Audio/hu/p_nelkul_paprika.wav") as AudioTrackAsset,
  "p_nelkul_paradicsom": requireAsset("../Audio/hu/p_nelkul_paradicsom.wav") as AudioTrackAsset,
  "p_nelkul_sajt": requireAsset("../Audio/hu/p_nelkul_sajt.wav") as AudioTrackAsset,
  "p_nelkul_salata": requireAsset("../Audio/hu/p_nelkul_salata.wav") as AudioTrackAsset,
  "p_nelkul_sonka": requireAsset("../Audio/hu/p_nelkul_sonka.wav") as AudioTrackAsset,
  "p_nelkul_spenot": requireAsset("../Audio/hu/p_nelkul_spenot.wav") as AudioTrackAsset,
  "p_nelkul_szalami": requireAsset("../Audio/hu/p_nelkul_szalami.wav") as AudioTrackAsset,
  "p_nelkul_uborka": requireAsset("../Audio/hu/p_nelkul_uborka.wav") as AudioTrackAsset,
  "p_nelkul_uborka_friss": requireAsset("../Audio/hu/p_nelkul_uborka_friss.wav") as AudioTrackAsset,
```
- Keep the existing entries (incl. legacy `p_sonka_sajt`, `p_kerhetek_oliva`, `p_uborka_nelkul`, `a_csirke`, `w_csirke`).

### 4.2 `WbwAudioController.ts`
- Add `isBusy(): boolean`: `true` while `pendingDone !== null`, the voice channel `isPlaying()`, or any SFX channel
  `isPlaying()` (the mic gate, R1 §3.3: every Lens sound goes through this controller).
- Add `isVoiceBusy(): boolean` (`pendingDone !== null` or the voice channel `isPlaying()`); `isBusy()` = `isVoiceBusy()`
  or any SFX channel playing. Code: the voice draft's closing sketch.
- Add `sfxPlayCount: number = 0`, incremented in `playSfx()` (exact "pointing is silent" checks).
- **Required** (the detector's `clipSec`, D14/D23): `durationOf(key)` = sum of
  `(AUDIO[k].control as FileAudioTrackProvider).duration` over `key.split("+")`, 1.2 s per part without one (check the
  cast on device, R1 §7.6). Code: the voice draft's closing sketch.
- Note for tests: `voicePlayCount` grows once **per clip part** (`playOne`), so a 5-part sequence adds 5 over its
  length; tests compare it only after `!isBusy()` (§8.2 DC3, StoryTour U5).

### 4.3 `WbwVocab.ts`
- `interface OrderStep`: add `helper?: boolean`; delete `pinned?`. Keep `multi` (all `false`).
- `ORDER_STEPS` step 2 → `{step: 2, name: "fillings", line: "mit_ker_bele", choices: [], advanceOn: [], multi: false, helper: true}`.
- `PHRASES`: delete `sonka_sajt`, `kerhetek_oliva`, `uborka_nelkul`, `szalami_sajt`, `csirke_paprika`, `done` (only
  `WbwOrderController` step 2 and `WbwTempProbe` reference them).
- Leave `WORDS.example*` (unused by the slimmer card). Optional consistency fix (R3 §8): none needed.
- Update the header/`PhraseEntry.audio` comment (no more "UI-only cards like Done").

### 4.4 `WbwSession.ts`
- Add the carried-word handoff (single owner of session state):
```ts
private _liveEntry: {via: "card" | "menu"; wordId: string} | null = null
/** Last word carried from a word card into Use it live ("" if none). */
liveWord: string = ""
setLiveEntry(via: "card" | "menu", wordId: string): void { this._liveEntry = {via, wordId}; if (wordId) this.liveWord = wordId }
/** Read once by the order controller when Use it live activates. */
takeLiveEntry(): {via: "card" | "menu"; wordId: string} { const e = this._liveEntry ?? {via: "menu" as const, wordId: ""}; this._liveEntry = null; return e }
```
- `liveWord` and the existing `saved` getter (insertion order) are read by the order controller's seeding (D22,
  §4.9 `seedPhrase()`); nothing else writes `liveWord`.

### 4.5 `WbwSpatial.ts`
- Add the pure lazy-follow step (R5 §3.2), used by `WbwMain` for the toast and the suggestion:
  `lazyFollowStep(so: SceneObject, dist: number, up: number, dt: number, maxAngleDeg = 18, minD = 55, maxD = 95, frozen = false): void`
  — re-target to `inView(dist, up)` only when the panel is > `maxAngleDeg` off the gaze or its horizontal distance
  leaves `[minD, maxD]`; glide `lerp(cur, goal, min(1, dt*5))`; always `faceRotation(pos, camPos())`; do nothing to
  the position while `frozen` (a button on it is hovered).

### 4.6 `WbwWordCardUI.ts` (compact steady card, D6)
- Header comment + stable names: `WordCard`, `WordCardHu`, `WordCardEn`, `WordCardStatus`, `WordCardPlayButton`,
  `WordCardSaveButton`, `WordCardUseLiveButton`, `WordCardCloseButton`.
- `WordCardData` → `{id: string; hu: string; en: string; saved: boolean}`.
- Delete: `showExample`, `flySeconds`, `sentenceBtn`, `_onPlaySentence`/`onPlaySentence`, `fly`, `flyTo()`, the fly part
  of `tick()`, `ICON_*` not used any more.
- Add: `useLiveBtn`, `statusText: Text | null`, `private _onUseLive = new Event<void>()` + `get onUseLive()`;
  `const SAVED_LABEL = "Saved ✓"` (Q4 fallback "Saved").
- `show(data)`: keep `useTone(TONE_LEARN)`, the `ChipRow`/`modeChip`, `Top` row (Words column + close). Remove the
  illustration and the example block. Add `WordCardStatus` (Caption, `TEXT_SOFT`, one line) under the words. Buttons
  row (icon above label, `btnH` 5.2): `WordCardPlayButton` "Listen again" (`play_arrow`), `WordCardSaveButton`
  "Save"/`SAVED_LABEL` (`bookmark_add`/`check_circle`, `GREEN` label when saved), `WordCardUseLiveButton`
  "Use it live →" with `tone: TONE_LIVE` (`arrow_forward` icon). Recompute `cardSize`. Status starts as
  "Playing pronunciation" only after the controller calls `setPlaying("word")`.
- `setPlaying(kind)`: `kind === "word"` → status "Playing pronunciation" (`CYAN`), play icon → `volume_up` and pulses;
  `""` → status "Ready to listen again" (`TEXT_SOFT`), icon back to `play_arrow`. The button label stays
  "Listen again".
- `setSaved()`: label `SAVED_LABEL`, `GREEN`, check icon; `savedShown = true`.
- Keep `showCount`, `currentWordId`, `currentHu`, `playing`, `savedShown`, `cardSize`, `isVisible`.

### 4.7 `WbwLearnController.ts` (point to reveal + steady card + Use it live link)
Imports: add `WbwNameLabelUI` + `markerTint` from `WbwNameLabelUI`, `canUseInPhrase`/`MAX_SLOTS` from
`WbwPhraseHelperModel`, `WbwHoverArbiter` from `WbwPointing`, SIK `Event`/`PublicApi`. Drop `PICTURES`. (No
`TargetingVisual`, `hideMouseRayVisual`, `meshBox` or `chooseLabelSpot` here: the arbiter sets the targeting visual and
hides the mouse ray itself, and the label view places itself.)

**One arbiter only (D1).** The hover logic is the `WbwHoverArbiter` from `drafts/WbwPointing.ts` (its header has the
full wiring). Do not also write an inline arbiter, a hover stack or per-learnable hover/trigger subscriptions here.

- **Inputs:** add `@input @allowUndefined nameLabel: WbwNameLabelUI`; settings `switchDwellSec = 0.12`,
  `exitGraceSec = 0.5` (optional: `handSwitchDwellSec = 0.15`, `reacquireSec = 0.35`, passed to the arbiter; the label's
  pull / view box / re-place thresholds are inputs on `WbwNameLabelUI` itself). Delete `savedHoldSec` and the three
  colour inputs `highlightColor`, `focusColor`, `bracketColor` (D24; `.ts.meta` changes, expected). Keep the builder's
  `hudClearDeg`.
- **State (readable):** getters `get hoveredId(): string { return this.hover ? this.hover.hoveredId : "" }`,
  `get labelForId(): string { return this.hover ? this.hover.labelForId : "" }`,
  `get pointerRayVisible(): boolean { return this.hover ? this.hover.pointerRayVisible : false }` (the names DC2, the
  helpers and StoryTour read on `t.learn`); fields `labelMode = ""`, `pointMode: "off" | "learn" | "live" = "off"`,
  `cardPlayCount = 0`, `get cardWordId(): string { return this.activeCardWordId }` (keep `activeCardWordId` /
  `activeCardWord` for DC2). Private: `hover: WbwHoverArbiter | null = null`, `liveSlotIds: string[]`,
  `liveCanEdit = false`, last placement cam pos/yaw. Delete `Tracked.hovered`.
- **Events:** `onUseLive(id)`, `onUse(id)`, `onAdd(id)`.
- **`init()`**:
  - Delete the three per-learnable subscriptions (`onTriggerEnd → select`, `onHoverEnter/onHoverExit → refreshTint`).
  - After the tracked loop: `this.hover = new WbwHoverArbiter(this.tracked.map((t) => ({id: t.l.id, interactable: t.l.interactable})), {switchDwellSec: this.switchDwellSec, exitGraceSec: this.exitGraceSec})`
    (it sets `targetingVisual` `None` in the editor / `Ray` on device, here rather than in the builder, which the other
    agent owns, and holds the only Target-phase hover/trigger subscriptions);
    `this.hover.setHoldSource(() => !!this.nameLabel && this.nameLabel.hovered)`;
    `this.hover.setSuppressSource(() => this.wordCard.isVisible ? this.activeCardWordId : "")`;
    `this.hover.onLabelChanged.add((c) => c.id ? this.showLabel(c.id) : this.hideLabel())`;
    `this.hover.onSelected.add((s) => this.onObjectSelect(s.id))`; `OnDestroyEvent` → `this.hover.dispose()`.
  - Card events: remove `onPlaySentence`; add `wordCard.onUseLive.add(() => this.useLiveFromCard())`.
  - Label: `nameLabel.setObstacles(learnables)` (the label avoids covering other learnables);
    `nameLabel.onSelect.add((s) => { if (this.pointMode === "learn") this.selectById(s.id) })`,
    `onUseWord.add((id) => this._onUse.invoke(id))`, `onAddWord.add((id) => this._onAdd.invoke(id))`.
  - `this.createEvent("LateUpdateEvent").bind(() => this.hover.update())`. No re-place code here: the label view
    re-places itself in its own `tick()` (head moved > 10 cm or turned > 8°, never while hovered).
  - Mouse ray: nothing to do here; the arbiter calls `hideMouseRayVisual()` on its ray scans (editor only).
- **New `setPointMode(m)`** (called by `WbwMain.applyMode`): store `pointMode`;
  `this.hover.setLabelsEnabled(m !== "off" && !!this.nameLabel)` (off hides at once and drops any pin), then
  `this.hover.refresh()`, so a label that is up during a Learn ↔ Use it live switch is re-shown in the new mode's
  colour, with or without the live buttons, instead of keeping the old style until the pointer moves.
- **New `setLiveSlots(ids: string[], canEdit: boolean)`** (called by the order controller): store; if
  `labelMode === "live"`, `this.hover.refresh()` (re-`show()` with a fresh `liveStateFor(id)`; the view keeps its
  place for the same id/mode).
- **New `onObjectSelect(id)`** (from `hover.onSelected`): `pointMode === "learn" && active` → `select(tracked of id)`;
  `"live"` → `this.hover.pin(id, 2)` (D11), nothing else.
- **`select(t)`**: if `wordCard.isVisible && activeCardWordId === t.l.id` → `speak(w.audio, "word")` and return (D5:
  replay, no rebuild/move). Else: `wordCard.show({id, hu, en, saved})`, `cardPlayCount = 0`, keep the existing
  placement block unchanged (incl. `hudClearDeg`), then `speak(...)`. (No explicit `hideLabel()`: the suppress source
  makes the arbiter hide that word's label in the same frame's LateUpdate, as a deliberate hide.) If a label for
  another word is up, `nameLabel.refresh({card: this.cardObstacle()})` so it keeps clear of the new card
  (`cardObstacle()` = `{pos: card world position, size: wordCard.cardSize}`, or `null` when the card is hidden;
  `closeCard()` calls `refresh({card: null})`).
  Keep `playSfx("UiClick")` (select only, never hover).
- **`speak(key, kind)`**: `if (kind === "word") this.cardPlayCount++` before `playVoice`.
- **Delete `playSentence()`**.
- **`saveCurrent()`** (D5): keep `session.save(id)`, `playSfx("SaveConfirm")`, `wordCard.setSaved()`. Delete clearing
  `activeCardWordId`/`activeCardWord` and the whole `DelayedCallbackEvent`/`flyTo` block. Saving never touches the
  order controller (agreed 4).
- **New `useLiveFromCard()`**: `const id = this.activeCardWordId; this.closeCard(); this._onUseLive.invoke(id)`.
- **`refreshTint(t)` / `scan()` / `tick()`**: hover no longer touches the learnable's `Brackets`. The one hover
  bracket is `NameLabelBracket` in `WbwNameLabelUI` (§3.3), tinted by mode through SharedUI. `refreshTint` keeps only
  the open card's word focus tint; delete `t.hovered` from it and from `scan()` (`chosen.indexOf(t) >= 0 || t.hovered`
  → `chosen.indexOf(t) >= 0`). `Brackets` are now only the 3–4 Learn discovery markers and the live highlight
  (`setHighlight`). `tick()` when `!active` calls `faceBrackets` only if `highlightIds.length > 0`. `scan()` stays
  Learn-only. DC2's "enabled `Brackets` count == `bracketedIds.length`" now holds while pointing too.
- **Bracket tints (D24):** every `this.bracketColor` → `markerTint("learn")` (`makeBracket`, `setActive(true)`,
  `refreshTint`), `this.highlightColor` → `markerTint("live")` (`setHighlight`), `this.focusColor` →
  `markerTint("focus")` (`refreshTint`, open card's word). Called at use time, never cached in a field, so the
  builder's SharedUI tone changes apply on the next tint.
- **Arbiter** (no `arbitrate()` method here): the rules are D3 and §3.2, implemented once in `WbwHoverArbiter.update()`.
  Live pinch pin, card suppression, hold while the pointer is on the label, dwell, grace, per-interactor tracking and
  the deliberate-hide reacquire delay all live there.
- **New `showLabel(id)`**: `const t = tracked of id; const w = t.word`;
  `nameLabel.show({id, hu: w.hu, en: w.en, so: t.l.so, size: t.l.size}, {mode: pointMode, live: this.liveStateFor(id), card: this.cardObstacle()})`
  (the view places itself, draws the connector and `NameLabelBracket`); `labelMode = pointMode` (`labelForId` belongs
  to the arbiter; never assign it here). **No `audio.*` call anywhere on this path.**
- **New `liveStateFor(id)`**: `pointMode !== "live"` → `undefined`; else
  `{phraseIds: this.liveSlotIds, maxSlots: MAX_SLOTS, usable: this.liveCanEdit && canUseInPhrase(id)}`. With
  `usable` false the label shows word + translation only (no buttons, no status), e.g. while the server speaks or in
  steps 3–6. The order controller passes `canEdit = phraseEditable` (§4.9).
- **New `hideLabel()`**: `nameLabel.hide(); labelMode = ""`.
- **Test hooks:** `pointAtById(id)` → `this.hover.pointAt(id)` and `clearPoint()` → `this.hover.clearPoint()`; keep
  `selectById`.
- Header comment: replace "fly-into-counter" / "hiding the card on save" with the steady-card rules.

### 4.8 `WbwPhraseChoicesUI.ts` (choose ≠ submit)
- Replace `picked` map + one-way `setPicked(id)` with single-select `chosenId = ""` + `setChosen(id: string)`
  (`setToggleLater(btn, cid === id, this)` for every card).
- `makeCard` `onTriggerUp`: `setToggleLater(btn, this.chosenId === c.id, this)` then **always**
  `this._onPick.invoke(c.id)` (re-tapping the chosen card = listen again).
- `PhraseCardData.picked` → `chosen`. Header: remove `PhraseCard_done` / multi-pick wording.
- Keep names `PhraseChoices`, `Head`/`ModeChip`/`Prompt`, `PhraseCard_<id>` with `Face/Picture`, `Words/Hu`, `Words/En`.

### 4.9 `WbwOrderController.ts` (phrase helper, speak turns)
Imports: add `WbwPhraseHelperUI`, `WbwSpeakPromptUI`, `WbwVoiceActivity`, `WORDS` (from `WbwVocab`, if not yet
imported), and from `WbwPhraseHelperModel`: `PhraseHelperModel`, `canUseInPhrase`, `missingClips`, `canListen`,
`checkAgainstVocab`, `PhrasePattern`, `PhraseBuild`. Keep `camLookFlat`, the `maxTrayDistanceCm` input and the
`nearTray` logic.
- **Inputs:** `@input @allowUndefined phraseHelper: WbwPhraseHelperUI`, `@input @allowUndefined speakPrompt: WbwSpeakPromptUI`,
  `@input playPhraseOnChange: boolean = true` (D12), `@input voiceDetection: boolean = true` (copied to
  `vad.voiceActivityEnabled`). **Delete `fillingsCardCount`** (`.ts.meta` changes).
- **State (readable):** `phraseSlotIds: string[] = []`, `phrasePattern: PhrasePattern = "want"`, `phraseHu = ""`,
  `phraseEn = ""`, `phraseAudioKey = ""`, `get phraseHelperVisible(): boolean`, `get waitingForSpeech(): boolean`
  (`speakTurn !== null`), `speechDetected = false`, `speechSource = ""`, `chosenPhraseId = ""`, `fillingsSaid = ""`,
  `vad: WbwVoiceActivity | null`. Private: `speakTurn: {answerId: string; epoch: number} | null`,
  `phrase = new PhraseHelperModel()`. Delete `picked`. `waitingFor` keeps its values (no `"ready"`; D8).
- **New getter `phraseEditable`** (the one definition every guard and the label use):
  `this.active && this.phraseHelperVisible && this.waitingFor !== "server" && (this.orderStep === 1 || (this.orderStep === 2 && !!this.stepDef && !!this.stepDef.helper))`.
  `waitingFor !== "server"` matters: a `playVoice` during a server line replaces its `onDone`, so `afterLine` would
  never run. (Q2 alternative: also true while `waitingFor === "ready"`.)
- **New `refreshEditable()`**: `phraseHelper?.setEditable(this.phraseEditable)`;
  `learn?.setLiveSlots(this.phraseSlotIds, this.phraseEditable)`. Called wherever `waitingFor`, the step or the
  helper's visibility changes: `runStep` (after `waitingFor = "server"`), `afterLine`, `offer`, `showHelperTurn`,
  `onSaid`, `next`, `finish`, `setActive`.
- **`init(session, audio, learn?, vad?)`**: also subscribe `phraseHelper.onListen → listenPhrase()`,
  `onPattern(p) → setPattern(p, true)`, `speakPrompt.onSaidIt → saidIt()`,
  `learn.onUse(id) → useWord(id)`, `learn.onAdd(id) → addWord(id)`. Startup checks, loudly, every launch
  (`WbwAudioController` otherwise skips a missing part silently, mid-sentence, and a drifted table would show one
  form and say another):
  ```ts
  const miss = missingClips((k) => audio.has(k))
  if (miss.length) print("WbwOrder: missing phrase clips: " + miss.join(","))
  const drift = checkAgainstVocab(WORDS)
  if (drift.length) print("WbwOrder: phrase table differs from WbwVocab: " + drift.join("; "))
  ```
  Fix the stale header (`init(session, audio, learn?, vad?)`).
- **New `seedPhrase(e)`** (D22), only `if (this.phrase.isEmpty)`: candidate = `e.wordId` if
  `canUseInPhrase(e.wordId)`, else `session.liveWord` if `canUseInPhrase`, else the last id in `session.saved` with
  `canUseInPhrase`; if found → `phrase.setPattern("want"); phrase.useWord(id)`. An edited phrase is never replaced
  (from the card with a phrase already built, the carried word is offered on the label instead, D10).
- **`setActive(true)`**: `const e = this.session.takeLiveEntry(); this.seedPhrase(e); this.rebuildPhrase(false)`
  (**always**, also with nothing seeded, so `phraseHu` is "Kérek … a szendvicsembe." and never the field default
  `""`); `vad?.setMicActive(true)`; then unchanged: `startOrder()` (step 0 or ≥ 7) or `runStep(orderStep)`. The
  helper shows from `runStep` (D9).
- **`setActive(false)`**: also `closeSpeakTurn()`, `phraseHelper?.hide()`, `vad?.setMicActive(false)`,
  `learn?.setLiveSlots([], false)`.
- **`startOrder()`**: unchanged (it must **not** clear the phrase).
- **`runStep(step)`**: at the top add `closeSpeakTurn()`, `chosenPhraseId = ""`. After `waitingFor = "server"`:
  steps 1 and 2 → `if (!phraseHelper.isVisible) phraseHelper.show(this.phrase.build())` and place it
  (`placeColumn()`, below); other steps → `phraseHelper?.hide()`. Then `refreshEditable()` (false while the server
  speaks). Rest unchanged (server line, caption, `afterLine` on clip end).
- **`afterLine(def)`**: first line `if (def.helper) { this.showHelperTurn(); return }`; at the end
  `refreshEditable()`.
- **New `showHelperTurn()`** (step 2): `const b = this.phrase.build()`; `waitingFor = "user"`,
  `offeredPhraseIds = []`, `phrases.hide()`, `phraseHelper.setPhrase(b)` (already visible since step 1; `show(b)` if
  not), `placeColumn()`, `refreshHighlight()`, `refreshEditable()`,
  `if (!b.empty) { beginSpeakTurn("fillings"); this.armVoice(b.audioKey) }` (D14, no playback).
  **No auto-play** (DC3 `checkServerTurn` needs `lastVoiceKey === "s_mit_ker_bele"`).
- **`offer(ids, multi)`** → `offer(ids)`: **first** `closeSpeakTurn(); phrases.setChosen(""); chosenPhraseId = ""`
  (a re-offer, e.g. `offerTablePhrase()` after tapping a different table, must never leave a turn open whose
  `answerId` is the old card); delete the fillings scoring/pinned block and `if (multi) … "done"`; prompt
  `"Choose your answer, then say it"`; placement via **`placeColumn()`**; the ingredient highlight via
  `refreshHighlight()`; `refreshEditable()`.
- **New `refreshHighlight()`**: `learn?.setHighlight(union of the offered cards' words and, while the helper is
  visible, phraseSlotIds)` (today's highlight block in `offer()` plus the phrase), so a step-1 edit never drops the
  cards' highlight and a re-offer never drops the phrase's.
- **New `placeColumn()`**: the tray/float logic of today's `offer()` (same `nearTray` test) for a column anchored
  where today's phrase row goes (the tray position, or today's float point): the phrase row (`PhraseChoices`) sits on
  the anchor; `PhraseHelper` (steps 1–2) directly above the row's slot (along the tray's local up, 1 cm gap; the slot
  is reserved even while the row is hidden, so the helper never moves when cards appear at step 1 or vanish at
  step 2); `SpeakPrompt` directly below the active surface (the row, or at step 2 the helper). Same rotation as the
  tray (or facing the user when floating); sizes from each view's `sizeCm` (`WbwPhraseChoicesUI` needs a `sizeCm`
  getter if it has none). Check in captures 6 / 10 (§9.1) that the step-1 column (helper + 2 cards + prompt) fits
  ±19°; if not, float the helper above the tray at the same distance (only during step 1).
- **`onPhrase(id)`** (choose, never submit):
```ts
if (!this.active || !this.stepDef || this.waitingFor !== "user" || this.stepDef.helper) return
const p = phraseById(id); if (!p) return
this.closeSpeakTurn()                // a different (or the same) card replaces the choice: R1 §5.1 disarm first
this.chosenPhraseId = id
this.phrases.setChosen(id)
this.audio.playVoice(p.audio)        // first, so audio.isBusy() is already true when the detector arms
this.beginSpeakTurn(id)              // Said it visible now
this.armVoice(p.audio)               // the gate holds the mic until the clip ends + 0.35 s
```
  (No `answers.push`, no `next()` here any more; the `elvitelre` hint moves to `onSaid`. `closeSpeakTurn()` hides the
  prompt and `beginSpeakTurn()` shows it again in the same frame; the show token, §3.5, keeps that safe.)
- **New `beginSpeakTurn(answerId)`**: `speakTurn = {answerId, epoch: this.epoch}`, `speechDetected = false`,
  `speakPrompt.show()` (bumps its show token, so a pending "Heard you ✓" hide from the previous answer is void),
  `placeColumn()` (prompt directly below the active surface). Does **not** arm: callers arm with `armVoice`.
- **New `armVoice(key)`**: `this.vad?.arm((src) => this.onSaid(src), this.audio.durationOf(key))` (voice draft sketch;
  re-arming drops a half-heard utterance).
- **New public `saidIt()`**: `if (!this.waitingForSpeech) return; if (!this.vad || !this.vad.saidIt()) this.onSaid("button")`
  (`saidIt()` returns false when the detector holds no armed turn, e.g. after a step-2 edit without auto-play, D23).
- **New `onSaid(source)`**: guard `speakTurn && speakTurn.epoch === epoch && active` (the controller's own flag, never
  the detector's); `const id = speakTurn.answerId; speakTurn = null; speechSource = source; speechDetected = source === "mic"`;
  `vad?.disarm()`; `speakPrompt.showHeard()`.
  - helper step: `answers.push("fillings"); fillingsSaid = phraseHu; next(def)`;
  - phrase step: `answers.push(id)`; if `def.advanceOn` has `id` → `phrases.hide(); offeredPhraseIds = []; waitingFor = "server"; next(def)`;
    else `phrases.setChosen(""); chosenPhraseId = ""` and for `elvitelre` the existing demo hint.
  - `refreshEditable()`.
- **New `closeSpeakTurn()`**: `speakTurn = null; vad?.disarm(); speakPrompt?.hide()`. Called from `runStep`, `finish`,
  `setActive(false)`, `onPhrase` (a new choice), `offer()` (every re-offer, incl. `offerTablePhrase()`), and
  `rebuildPhrase` when the step-2 slots become empty.
- **Phrase editing** (one `phrase` model instance for the session; the readable `phraseSlotIds` / `phrasePattern` /
  `phraseHu` / `phraseEn` / `phraseAudioKey` fields mirror `phrase.testState()` after every change):
  - `useWord(id)`: `if (!this.phraseEditable) return`; `if (this.phrase.useWord(id)) rebuildPhrase(true)`. The model
    refuses non-ingredients **and a word already in the phrase**, so no path (button, label pinch, object select)
    collapses `[szalami, paradicsom]` to `[szalami]`.
  - `addWord(id)`: same guard, then `if (this.phrase.addWord(id)) rebuildPhrase(true)` (the model refuses a
    non-ingredient, a word already in it and a full phrase; the label offers `AddWordButton` only when
    `pointerActions(id).showAdd` would be true, §3.3).
  - `setPattern(p, fromUser)`: same guard; `if (this.phrase.setPattern(p)) rebuildPhrase(fromUser)`.
  - `rebuildPhrase(fromUser)`:
    ```ts
    const b = this.phrase.build()
    this.phraseSlotIds = b.slotIds.slice(); this.phrasePattern = b.pattern
    this.phraseHu = b.hu; this.phraseEn = b.en; this.phraseAudioKey = b.audioKey
    this.phraseHelper?.setPhrase(b)
    this.refreshHighlight()
    this.learn?.setLiveSlots(b.slotIds, this.phraseEditable)
    const helperTurn = this.orderStep === 2 && !!this.stepDef && !!this.stepDef.helper && this.waitingFor === "user"
    const play = fromUser && this.playPhraseOnChange && canListen(b, (k) => this.audio.has(k))
    if (helperTurn) {
      if (b.empty) this.closeSpeakTurn()
      else {
        this.vad?.disarm()                                  // D23 / R1 §5.1: a changed phrase must be heard first
        if (!this.speakTurn) this.beginSpeakTurn("fillings") // Said it visible; the turn stays open across edits
      }
    }
    if (play) this.audio.playVoice(b.audioKey)
    if (helperTurn && !b.empty && play) this.armVoice(b.audioKey)  // gate holds the mic until the clip + 0.35 s
    ```
    Without auto-play the mic stays disarmed until `listenPhrase()` (Said it still works). In step 1 there is no
    helper turn, so editing never touches the step-1 card's turn. Editing never calls `next()`.
  - `listenPhrase()`: `if (!this.phraseEditable) return; const b = this.phrase.build(); if (!canListen(b, (k) => this.audio.has(k))) return;
    this.audio.playVoice(b.audioKey)`; at step 2 with an open turn also `this.armVoice(b.audioKey)` (D23).
    Never a partly missing sequence.
- **`next(def)`**: also `closeSpeakTurn()` (normally already closed) and `refreshEditable()`.
- **`finish()`**: also `closeSpeakTurn()`, `phraseHelper?.hide()`, `vad?.setMicActive(false)`,
  `learn?.setLiveSlots([], false)`.
- **`tick()`**: only while `this.speakTurn !== null` (never just "while the prompt is visible", so the done state of
  `showHeard()` is not overwritten the next frame):
  `speakPrompt.setState(this.vad ? this.vad.vadState : "off", this.vad ? this.vad.pulse : 0, this.vad ? this.vad.nudgeSaidIt : false)`.
- `onTable()` guard (`waitingFor === "table" || "user"`) is unchanged; `offerTablePhrase()` reaches `offer()`, which
  now closes any open turn and clears the chosen card first (above).
- `pickPhrase(id)` stays (now "choose").
- **Q2 alternative only** (if the user wants the server to wait): `enterPrep()` (`epoch++`, `orderStep = 0`,
  `orderStepName = "prep"`, `waitingFor = "ready"`, `answers = []`, `phrases.hide()`, `phraseHelper.show(this.phrase.build())`,
  `placeColumn()`, `refreshEditable()`, no voice), called from `setActive(true)` instead of `startOrder()` when
  `e.via === "card"` and `orderStep` is 0 or ≥ 7; `ReadyToOrderButton` → `readyToOrder()` (guard
  `waitingFor === "ready"` → `startOrder()`); `phraseEditable` also true while `waitingFor === "ready"`.

### 4.10 `WbwMain.ts` (arrival, suggestion, views, voice, routing)
Imports: add `WbwSuggestionUI`, `WbwNameLabelUI`, `WbwPhraseHelperUI`, `WbwSpeakPromptUI`, `WbwVoiceActivity`,
`lazyFollowStep`.
- **Inputs (all new, so code defaults apply):** `@input @allowUndefined suggestion: WbwSuggestionUI`,
  `@input @allowUndefined micAudio: AudioTrackAsset` ("Microphone Audio asset; empty = Said-it only"),
  `@input arrivalSuggestion: boolean = true`, `@input suggestAutoPickSec: number = 0` (kiosk only),
  `@input toastAfterWalkCm: number = 80`, `@input toastFallbackSec: number = 1.5`. Keep `firstMode` (still used by
  `skipSetup` and `arrivalSuggestion = false`). Do not add them to the required-inputs check.
- **Readable:** `arrivalPhase: string = "setup"`, `get suggestionVisible(): boolean`, `suggestionPick = ""`,
  `toastTrigger = ""`, `walkedSinceStartCm = 0`, `vad: WbwVoiceActivity | null = null`.
- **`start()`**, before `learn.init`: `ensureViews()` — for each unwired view create
  `global.scene.createSceneObject("<Name>Root")`, parent it to the HUD's parent (the UI root), `createComponent(X.getTypeName())`,
  assign to `learn.nameLabel` / `order.phraseHelper` / `order.speakPrompt` / `this.suggestion`. Then
  `this.vad = this.sceneObject.createComponent(WbwVoiceActivity.getTypeName()) as WbwVoiceActivity;
  this.vad.init(this.audio, this.micAudio); this.vad.voiceActivityEnabled = this.order.voiceDetection`, and pass it:
  `order.init(session, audio, learn, this.vad)`.
  Wire: `learn.onUseLive.add((id) => { this.session.setLiveEntry("card", id); this.selectMode("live") })`;
  `suggestion.onPick.add((o) => this.onSuggestionPick(o))`; `suggestion.onHover.add((o) => suggestion.setDescription(...))`
  (texts from R5 §3.3; Practice text depends on `savedCount < 4`). Add `this.tickArrival()` to the existing
  UpdateEvent.
- **`confirmSetup(skipArrival = false)`**: keep `setupComplete`, `ToastPop`, `setupPanel.hide()`. Then:
  - if `skipArrival || !this.arrivalSuggestion || !this.suggestion` → old behaviour (HUD show, toast now,
    delayed `firstMode`), `arrivalPhase = "done"`;
  - else `arrivalPhase = "walkIn"`, remember `walkStart = camPos()`, `walkT0 = getTime()`; **HUD stays hidden**.
- **New `tickArrival()`** (every frame):
  - `walkIn`: `walkedSinceStartCm = horizDist(camPos(), walkStart)`; when `>= toastAfterWalkCm` (`toastTrigger = "walk"`)
    or `getTime() - walkT0 >= toastFallbackSec` (`"timeout"`) → `toast.show(toastText, toastSeconds)`, place at
    `inView(80, 14)`, `arrivalPhase = "toast"`, `toastT0 = getTime()`;
  - `toast`: `lazyFollowStep(toast, 80, 14, dt)`; after `toastSeconds + 0.35 + 0.3` → `showSuggestion()`;
  - `suggest`: `lazyFollowStep(suggestionSO, 70, -3, dt, …, frozen = suggestion.hoveredOption !== "")`;
    `suggestAutoPickSec > 0` → auto-pick the suggested option after that time.
- **New `showSuggestion()`**: `arrivalPhase = "suggest"`, `audio.playSfx("ToastPop")`,
  `suggestion.show(savedCount, "learn")`, `placeFacingUser(suggestionSO, inView(70, -3))`.
- **New `onSuggestionPick(o)`**: `suggestionPick = o`; `suggestion.hide()`; `arrivalPhase = "done"`; `hud.show()`;
  `hud.setSaved(...)`; `hud.setMode(MODE_LABEL[session.mode])`; `audio.playSfx("UiClick")`; if `o !== "later"` →
  `session.setLiveEntry("menu", "")` when `o === "live"`, then `selectMode(o as Mode)`. "Later" stays in `"none"`.
- **`selectMode(m)`**: `if (!session.setupComplete) confirmSetup(true)`; if the suggestion is visible → hide it,
  `arrivalPhase = "done"`, `hud.show()` if hidden. Never re-show the suggestion when the mode returns to `"none"`
  (DC5 expects `"none"` after closing Practice).
- **`checkRaisedHand()`**: also require `arrivalPhase === "done"`.
- **`applyMode(m)`**: add `this.learn.setPointMode(m === "learn" ? "learn" : m === "live" ? "live" : "off")`.
  Every entry into live (card, menu, suggestion) greets at once; the order controller reads `takeLiveEntry()` and
  seeds an empty phrase from it, `session.liveWord` or the last saved counter ingredient (D22).

### 4.11 `WbwHudUI.ts` (mode name in the compact chip, D19)
- In the `compact` branch of `show()`: put `MenuButton` and `modeChip(row, d, "HudModeChip")` in a `flexBox` row;
  widen the panel by the chip width + 0.8 cm. Keep the hidden `SavedBadge` / `ModeLabel` Text objects exactly as
  they are (DC1 reads `ModeLabel` text in compact mode).
- Remove `getBadgeWorldPos()` only if nothing uses it after 4.7 (it becomes unused; harmless to keep).

### 4.12 `WbwPracticeController.ts` (optional, Q11)
- `place()`: clamp the nudge to `[-20, 25]` instead of `[0, 25]`
  (`Math.max(-20, Math.min(25, horizDist(tp, cam) - this.boardDistanceCm))`) so a seated learner (57 cm from the
  table) still gets the board at ~65 cm. DC5's "board < 40 cm off the table centre" still holds.

### 4.13 `WbwCafeBuilder.ts` (optional phase C7, coordinate with the other agent)
- New inputs `arrivalWalkIn: boolean = true`, `startSpot: vec3 = new vec3(0, 0, 520)`; readable `startSpotLocal`.
- `alignFloor()`: `s = arrivalWalkIn ? (EntranceSpot local position ?? startSpot) : vec3.zero()`; target x/z =
  camera x/z − `s` (café root unrotated today); y unchanged. Fix the hint text that says the user starts at the counter.

### 4.14 `WbwTempProbe.ts`
- Delete the file and the `TEMP_Probe` scene object at the end of C5 (disabled in C0).

---

## 5. Scene wiring

| What | Where | Action |
|---|---|---|
| `TEMP_Probe` | scene root object | C0: `stage = "setup"` + disable. C5: delete object and script. |
| Learn colours | `WordByWord/Controllers/LearnController` | No reset. C3 deletes `bracketColor`, `focusColor`, `highlightColor` (D24); the serialized values disappear with the inputs. |
| New views (optional authoring; runtime fallback exists) | `WordByWord/UI/NameLabelRoot` (+`WbwNameLabelUI`), `PhraseHelperRoot` (+`WbwPhraseHelperUI`), `SpeakPromptRoot` (+`WbwSpeakPromptUI`), `SuggestionRoot` (+`WbwSuggestionUI`) | Wire `LearnController.nameLabel`, `OrderController.phraseHelper`, `OrderController.speakPrompt`, `WordByWord.WbwMain.suggestion`. World scale 1; never under `Cafe`. |
| **Microphone Audio asset** | `Assets/Audio/MicrophoneAudio` | C6: create it (Asset Browser → + → "Microphone Audio"; R1 §3.1). Try the Editor API `createNativeAsset` once and check `getTypeName()`; the type string is undocumented. If that fails, **ask the user** for the one-click add. Wire `WbwMain.micAudio`. The Preview mic button (bottom-left) appears once a script references it. |
| Mouse ray visual | `InteractorCursors` | No scene change: the hover arbiter calls `hideMouseRayVisual()` at runtime (editor only). |
| New `@input`s | `WbwMain`, `WbwLearnController`, `WbwOrderController` | New inputs pick up code defaults; check the inspector after recompile. `firstMode` stays `"learn"`. |
| LEAF | `LeafIndex` | C8: register `StoryTour` last. |
| Optional C7 | `Cafe/Room/EntranceSpot` (empty, local (0, 0, 520)); decor `Cafe/Room/Entrance` (door frame ~110 × 230 cm at (0, 0, 597), doormat at (0, 0.5, 560)) | Only with the builder change in 4.13. |

---

## 6. Audio keys

| Action | Key | Notes |
|---|---|---|
| Pointing / hover (label) | **none** | Not even SFX. |
| Select object or label (card opens) | SFX `UiClick` + voice `WordEntry.audio` once | e.g. `w_uborka_friss`; `w_uborka` says "savanyú uborka"; csirke uses `w_sult_csirke`. |
| Listen again / re-select same object | `WordEntry.audio` | `cardPlayCount++`. |
| Save | SFX `SaveConfirm` | No voice. |
| Helper Listen / auto-play on change | `phraseAudioKey` | 1 item: `p_kerek_<id>` / `p_nelkul_<id>`; 2+ items: `c_kerek + aClip… (+ c_es before last) + c_a_szendvicsembe` or `wClip… (+ c_es) + c_nelkul + c_kerem`, from `PHRASE_INGREDIENTS` (never built from the id). Empty → `""` (Listen inactive). `lastVoiceKey` reports the whole `a+b+c` key. |
| Phrase cards | `p_jonapot`, `p_szendvicset_kerek`, `p_tejes_kave`, `p_itt_eszem`, `p_elvitelre`, `p_negyes_asztal`, `p_nyolcas_asztal`, `p_tizenkettes_asztal`, `p_koszonom` | Plays on choose; re-tap replays. |
| Server | `s_mit_ker`, `s_mit_ker_bele`, `s_inni`, `s_itt_vagy_elvitel`, `s_hanyas_asztal`, `s_jo_etvagyat` | Unchanged. |
| Tables | `n_4`, `n_8`, `n_12` | Unchanged. |
| Arrival | SFX `ToastPop` (toast, suggestion), `UiClick` (pick) | **No voice during arrival.** |
| Speak prompt / Said it / mic | none | **Never `playVoice`**, and no SFX while a turn is armed (it restarts the detector's guard). |
| No longer used by Phase C | `p_sonka_sajt`, `p_kerhetek_oliva`, `p_uborka_nelkul`, `a_csirke`, `w_csirke` | Keep the files and bank entries. |

Startup checks (4.9): `WbwOrder: missing phrase clips:` and `WbwOrder: phrase table differs from WbwVocab:` must not
appear. Optional device check: `audio.has()` for
`phraseClipKeys()` = 65 distinct keys all true.

---

## 7. Build order (each phase ends green before the next starts)

| Phase | Work | Gate (LEAF one at a time, §9.2) |
|---|---|---|
| **C0** | §2 preflight (probe off, baseline, DC5 seat fix if needed; no colour reset) | Baseline recorded |
| **C1** Foundations (no behaviour change) | 4.1 bank, 4.2 `isBusy`/`isVoiceBusy`/`durationOf`/`sfxPlayCount`, 3.1 `WbwPhraseHelperModel` (verbatim), 4.4 session, 4.5 `lazyFollowStep`, 3.2 `WbwPointing` | Recompile clean; no "missing phrase clips" / "phrase table differs" print once 4.9's checks are in; DC1, DC2 unchanged green |
| **C2** Steady card | 4.6 card, 4.7 card parts (`select` replay, `speak` count, `saveCurrent`, `useLiveFromCard`, delete `playSentence`), 4.10 `onUseLive` wiring (greets at once, D8; the helper arrives in C5), LEAF helper `learnAndSave` + DC2 card edits (§8.2) | DC2, DC1, DC5 |
| **C3** Point to reveal | 3.3 label UI (`drafts/WbwNameLabelUI.ts` verbatim), 4.7 arbiter wiring + `showLabel`/`liveStateFor` + `markerTint` bracket tints (delete the three colour inputs), `setPointMode` from `applyMode` (live mode label without buttons until C5), DC2 pointing block | DC2 (+ captures 2–5 of §9.1) |
| **C4** Arrival + mode chips | 3.6 suggestion, 4.10 arrival phases + suggestion, 4.11 HUD chip, helper `completeSetup` (§8.1) | DC1, then DC2–DC5 each once (they all pass through `completeSetup`) |
| **C5** Use it live | **Before starting: ask the user Q2, Q12, Q13** (defaults otherwise). 4.3 vocab, 4.8 phrase choices, 3.4 helper, 3.5 speak prompt (show token; Said it only; `vad` may be null), 4.9 order controller (seeding, helper in steps 1–2, `placeColumn`, speak turns, editing, re-offer closes the turn), 4.7 `setLiveSlots` + live label buttons, helper `waitForUserTurn`/`sayIt`/`useWord`, DC3/DC4 edits; delete `WbwTempProbe` | DC3, DC4, DC1, DC2 |
| **C6** Voice activity | §5 mic asset, 3.7 detector (`drafts/WbwVoiceActivity.ts` verbatim; re-run its `.sim.mjs` first), 4.10 creation/wiring, `ignoreMicForTests` in the helper | DC3 (mic ignored), manual Preview check with the mic on (speak during a turn → `speechSource === "mic"`; edit the step-2 phrase, speak during the auto-play → nothing fires) |
| **C7** Optional | 4.13 walk-in + `EntranceSpot`, 4.12 practice nudge, lazy-follow tuning, R5 §4.4 DC2 pastry spot `eyeAt(-230, 40)` if flaky | DC1–DC5 again |
| **C8** Tour + final | Copy `drafts/StoryTour.ts` to `Assets/Tests/Leaf/StoryTour.ts`, register last in `LeafIndex`; `PACE = 0.25` run, then `PACE = 1` recording; §9 checklist | TOUR_Story green at both paces; DC1–DC5 green |

---

## 8. LEAF changes

### 8.1 `WbwLeafHelpers.ts`
- **Constructor:** after `this.interactor = …` add a second interactor and quiet the mic and mouse:
```ts
this.pointer = new WbwPointer("WbwLeafPointer")          // export class WbwPointer (same as drafts/StoryTour.ts) here
const vad = (this.main as unknown as {vad?: {ignoreMicForTests: boolean}}).vad
if (vad) vad.ignoreMicForTests = true                      // room noise must never advance a test
this.quietMouse()                                          // disable SIK Mouse interactors (R2 §9.4); restored in restoreHead()
```
  `quietMouse()` / restore: as `Tour.quietMouse()` / `restoreMouse()` in the tour draft. Call the restore inside
  `restoreHead()` (every scenario calls it in `finally`). Keep `quietMouse()` as a C3 gate even though the arbiter
  tracks hover per interactor: LEAF's `enterHover` still hangs if the Mouse already hovers the target (R2 §9.4).
  Naming: this `WbwPointer` is the **LEAF test interactor** (`t.pointer`). The game-side hover logic is
  `WbwHoverArbiter` (`WbwPointing.ts`), read through `t.learn.hoveredId` / `labelForId` / `pointerRayVisible`, so the
  two never clash when WbwLeafHelpers imports game scripts.
- **Accessors:** `get helper() { return this.main.order.phraseHelper }`, `get speak() { return this.main.order.speakPrompt }`.
- **`completeSetup()`**: replace the tail after the toast `Message` wait (today
  `waitFor(() => this.main.currentMode === "learn", "Learn mode starts automatically …", 8000)` and the two lines after) with:
```ts
await waitFor(() => this.main.suggestionVisible && this.hasEnabledInteractable("SuggestLearnButton"), "arrival suggestion panel", 8000)
if (this.main.currentMode !== "none") throw new Error("no mode may start before the learner picks one")
await this.tap("SuggestLearnButton")
await waitFor(() => this.main.currentMode === "learn" && !this.main.suggestionVisible, "Learn picked on the suggestion", 4000)
await this.setHead(this.eyeAt(0, 0), 0, -15)      // tests expect the counter spot (matters once C7 walk-in exists)
if (!this.learn.active) throw new Error("WbwLearnController.active is false after picking Learn")
await waitFor(() => textOf("ModeLabel") === "Mode: Learn", "HUD ModeLabel 'Mode: Learn'", 3000)
log("setup complete → suggestion → Learn")
```
  The toast wait (3000 ms) already fits the 1.5 s fallback.
- **`learnAndSave(id)`**: replace the last line (`waitFor(() => !this.card.isVisible, "word card hidden after save (fly-to-counter)", 4000)`) with:
```ts
await waitFor(() => this.card.savedShown && this.card.isVisible, `'${id}' card stays open showing Saved`)
await this.tap("WordCardCloseButton")
await waitFor(() => !this.card.isVisible, "word card closed")
```
- **`waitForUserTurn(step)`**: condition `this.phrases.isVisible` → `(this.phrases.isVisible || this.order.phraseHelperVisible)`.
- **New:**
```ts
/** Answer the open speak turn with the Said it button (the Preview stand-in for speaking). */
async sayIt(): Promise<void> {
  const step = this.order.orderStep
  await waitFor(() => this.order.waitingForSpeech && this.hasEnabledInteractable("SaidItButton"), `step ${step} waits for the learner to say it`, 12000)
  await this.tap("SaidItButton")
  await waitFor(() => !this.order.waitingForSpeech, `step ${step}: Said it accepted`, 4000)
}
/** Hold a pointer hover on Learnable_<id> (no select) until pointRelease(). */
async pointHold(id: string): Promise<void> {
  const it = findInteractablesByName(`Learnable_${id}`, undefined, true)[0]
  if (!it) throw new Error(`Learnable_${id} not found`)
  await this.pointer.hold(it, `Learnable_${id}`)
  await waitFor(() => this.learn.labelForId === id, `label for ${id}`, 2000)
}
async pointRelease(): Promise<void> { await this.pointer.release() }
/** Use it live: point at an ingredient and press Use this word (or + és when add = true). */
async useWord(id: string, add: boolean = false): Promise<void> {
  const btn = add ? "AddWordButton" : "UseThisWordButton"
  await this.pointHold(id)
  await waitFor(() => this.hasEnabledInteractable(btn), `${btn} for ${id}`, 2000)
  await this.tap(btn)
  await waitFor(() => this.order.phraseSlotIds.indexOf(id) >= 0, `${id} in the phrase`, 2000)
  await this.pointRelease()
}
```

### 8.2 DC1–DC5 minimal edits (line numbers as of 01:56)

**DC1 `DC1_ModeMenu.ts`: no body change.** It passes through `completeSetup` and `learnAndSave`. Live entry is via
the menu, so the greeting starts at once and `orderStep === 1` (:59) holds.

**DC2 `DC2_Learn.ts`:**
- Header (:1-8): new criterion text (pointing shows the label without click or sound; card plays once; Listen
  again; Saved ✓ without ordering) and the new driven names (`NameLabel`, `WordCardUseLiveButton` not used).
- Insert after `await t.setHead(t.eyeAt(0, 0), 0, -15)` (:61), before `const plays0` (:64):
```ts
// ── point to reveal: label beside the object, no click, no sound ──
const pv0 = audio.voicePlayCount, psfx0 = audio.lastSfxKey
await t.pointHold("sonka")
expect(textOf("NameLabelHu", findEnabled("NameLabel")), "label Hungarian").toBe("sonka")
expect(textOf("NameLabelEn", findEnabled("NameLabel")), "label English").toBe("ham")
expect(audio.voicePlayCount, "pointing plays no voice").toBe(pv0)
expect(audio.lastSfxKey, "pointing plays no sound effect").toBe(psfx0)
await t.tap("NameLabel")                                            // selecting the label opens the card
await waitFor(() => card.isVisible && card.currentWordId === "sonka", "card via the label")
expect(learn.cardPlayCount, "played once").toBe(1)
await t.pointRelease()
await t.tap("WordCardCloseButton")
await waitFor(() => !card.isVisible && learn.labelForId === "", "card closed, label gone", 3000)
```
- Replace :72-75 (example sentence + illustration) with:
```ts
expect(learn.cardPlayCount, "pronunciation played once on open").toBe(1)
await waitFor(() => textOf("WordCardStatus", findEnabled("WordCard")) === "Ready to listen again", "status after the clip", 6000)
expect(textOf("Label", findEnabled("WordCardPlayButton")), "Listen again label").toBe("Listen again")
```
- After :82 add `expect(learn.cardPlayCount, "Listen again counted").toBe(2)`.
- Delete :84-90 (`WordCardPlaySentenceButton` block).
- Replace :97 with
  `await waitFor(() => card.isVisible && card.savedShown && learn.activeCardWordId === "olivabogyo", "card stays open showing Saved", 3000)`
  and add `expect(t.order.phraseSlotIds.length, "saving never fills the phrase").toBe(0)` and
  `expect(t.order.orderStep, "saving never orders").toBe(0)`.
- Before the reopen tap (:102) add `await t.tap("WordCardCloseButton")` + `await waitFor(() => !card.isVisible, "closed")`
  (the card no longer hides itself).
- Replace :104 `.toBe("Saved")` with
  `expect((textOf("Label", findEnabled("WordCardSaveButton")) ?? "").indexOf("Saved") === 0, "save button shows Saved").toBe(true)`.
- Optional (C7): pastry spot :51 `t.eyeAt(-170, 40)` → `t.eyeAt(-230, 40)` (R5 §4.4: today it passes only through
  `szendvics`).

**DC3 `DC3_OrderingAtCounter.ts`:**
- Header (:1-8): step 2 via the phrase helper; every answer is said (Said it in the Preview).
- Imports: add `sleep` from `"Leaf.lspkg/Utils/common/Utils"` (used once below).
- Step 1 (:51-55) becomes:
```ts
// the helper is up from entry (D8/D9), empty because nothing was saved (D22), never "" (always rebuilt)
expect(o.phraseHelperVisible, "phrase helper visible from entry").toBe(true)
expect(o.phraseHu, "empty phrase on entry").toBe("Kérek … a szendvicsembe.")
await t.tap("PhraseCard_jonapot")
await waitFor(() => a.lastVoiceKey === "p_jonapot", "'Jó napot!' card plays its audio")
expect(o.orderStep, "choosing does not submit").toBe(1)
await t.sayIt()
expect(o.orderStep, "greeting back does not advance").toBe(1)
expect(o.offeredPhraseIds.join(","), "step 1 cards still offered").toBe("jonapot,szendvicset")
await t.tap("PhraseCard_szendvicset")
await waitFor(() => a.lastVoiceKey === "p_szendvicset_kerek", "'Egy szendvicset kérek.' plays its audio")
expect(o.orderStep, "choosing does not submit").toBe(1)
// the previous answer's "Heard you ✓" hide (~0.6 s) must not hide this answer's prompt (show token, §3.5)
await sleep(800)
expect(o.waitingForSpeech && t.hasEnabledInteractable("SaidItButton"), "Said it still offered 0.8 s after choosing").toBe(true)
await t.sayIt()
```
- Replace the step 2 block (:57-76) with:
```ts
// step 2 — fillings: the phrase helper (the fixed step-2 cards are gone)
await checkServerTurn(t, 2, "Mit kér bele?", "What would you like in it?", "s_mit_ker_bele")
expect(o.orderStepName, "step 2 name").toBe("fillings")
expect(t.phrases.isVisible, "no phrase cards at step 2").toBe(false)
expect(o.offeredPhraseIds.length, "nothing offered as cards").toBe(0)
for (const old of ["sonka_sajt", "kerhetek_oliva", "uborka_nelkul", "szalami_sajt", "csirke_paprika", "done"]) {
  expect(findEnabled(`PhraseCard_${old}`) === undefined, `no PhraseCard_${old}`).toBe(true)
}
const helper = findEnabled("PhraseHelper")
expect(helper !== undefined && o.phraseHelperVisible, "phrase helper shown").toBe(true)
expect(textOf("ChipLabel", helper), "helper mode chip").toBe("Use it live")
expect(o.phraseHu, "empty slot").toBe("Kérek … a szendvicsembe.")
expect(o.waitingForSpeech, "nothing to say before a word is chosen").toBe(false)
// leaving something out
await t.useWord("uborka")
await t.tap("PatternWithoutButton")
await waitFor(() => o.phrasePattern === "without", "'… nélkül, kérem.' pattern")
expect(o.phraseHu, "without HU").toBe("Savanyú uborka nélkül, kérem.")
expect(o.phraseEn, "without EN").toBe("Without pickles, please.")
expect(o.phraseAudioKey, "without audio").toBe("p_nelkul_uborka")
// reuse the same phrase with other words
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
expect(o.waitingForSpeech, "the step-2 turn stays open across edits (Said it visible)").toBe(true)
// Listen must be proven by a NEW playback: "+ és" already auto-played this exact key (D12), and voicePlayCount
// grows once per clip part, so wait for that sequence to end before counting.
await waitFor(() => !a.isBusy(), "auto-played combined phrase finished", 15000)
const lv0 = a.voicePlayCount
await t.tap("PhraseHelperListenButton")
await waitFor(() => a.voicePlayCount > lv0 && a.lastVoiceKey === o.phraseAudioKey, "Listen plays the phrase again")
expect(o.orderStep, "showing and listening never submit").toBe(2)
await t.sayIt()
```
- After the coffee tap/wait (:82-83) add `await t.sayIt()`; after `Itt eszem.` (:92-93) add `await t.sayIt()`.
- :99 → `expect(o.answers.join(","), "answers so far").toBe("jonapot,szendvicset,fillings,tejes_kave,itt_eszem")`.
- `checkServerTurn` (:15-24) unchanged: valid because showing the helper never auto-plays and the speak prompt never
  calls `playVoice`.

**DC4 `DC4_TableNumber.ts`:**
- After `waitFor(() => a.lastVoiceKey === "p_nyolcas_asztal", …)` (:77) add `await t.sayIt()`.
- After `await t.tap("PhraseCard_koszonom")` (:82) add `await t.sayIt()` (then the existing step-7 wait).
- :84 (`lastVoiceKey === "p_koszonom"`) and :51 (no voice on an occupied table) stay valid (Said it and `finish()`
  play no voice).

**DC5 `DC5_Practice.ts`:**
- Body unchanged except the seat (if C0 shows the known failure):
  `const seat = t.eyeAt(-145, 385 - 75)` (:34) → `const seat = table.add(new vec3(0, 160, -80))` (80 cm on the counter
  side of `Table_8`'s runtime position); keep `t.setHead(seat, t.yawToward(seat, table), -25)` (R5 §4.4 uses
  pitch -36; either works for the asserts).

### 8.3 `LeafIndex.ts`
- C8: `import {StoryTour} from "./StoryTour"` and append `{id: "TOUR_Story", typename: StoryTour.getTypeName()}` last.

### 8.4 `drafts/StoryTour.ts` (R5 tour, 4 acts, ~50 beats)
- Self-contained: its own `WbwPointer` (hold/release via the protected `enterHover`/`exitHover`), `Tour` helpers
  (`glide` per-frame camera with forced turn direction, `look`, `lookAt`, `point`, `tap` that frees the pointer first,
  `waitAudioIdle` via `audio.isBusy()`, `sayIt`, `answerTurn`, mouse quieting) and one accessor map
  `phaseCState(t)` that reads every Phase C field through `any` (compiles before all fields exist; rename in one place).
- Constants: `PACE` (1 recording / 0.25 regression), `OPTIONAL_BEATS` (U1b Listen, U5b pattern switch, "Jó napot!"),
  `REAL_VOICE_SECS` (a real Preview-mic take falls back to Said it), `SEATED_PRACTICE` (needs 4.12; else the
  standing fallback pose).
- Acts and the plan items they prove:
  1. **Arrival** A1–A6: setup → walk in (or the fallback cut to the door when `cafe.startSpotLocal` is missing) →
     toast → suggestion (tiles, labels, no voice, nothing auto-starts) → hover descriptions → Learn.
  2. **Look, point, select, save** L1–L13: 3–4 markers; silent label for cucumber ("uborka"/"cucumber"); silent sweep
     with **one** label max; select → card, played once, status line; Listen again; pointer onto the card's controls,
     card does not move; Save → "Saved…", card stays, nothing ordered; three more words; select **the label**;
     "Use it live →".
  3. **Use it live** U1–U16 (agreed flow, D8/D9): entering greets at once (`orderStep 1`, "Jó napot! Mit kér?") and
     the helper shows the carried word ("Kérek uborkát a szendvicsembe.", no phrase auto-play); after the greeting
     ends, violet label + Use this word → same helper object updates to "Kérek szalámit a szendvicsembe."; + és →
     combined; Listen (proved by a new `voicePlayCount` after audio idle) never submits; step 1 card + Said it;
     steps 3–6 via card + Said it; step 2 with no fixed cards and the prepared phrase; table 8 detour. If the user
     picks the Q2 prep alternative, U1–U6 go back to asserting `orderStep 0` / `waitingFor "ready"` and a
     `ReadyToOrderButton` tap before U7 (the 02:00 version of these beats).
  4. **Seated practice** P1–P7: walk to table 8, sit, Menu → Practice, a wrong pair, four matches, completion, stand.
- Review notes (not compiled here): it imports `findEnabled, horiz, log, tableCard, textOf, waitFor, WbwTester` from
  `./WbwLeafHelpers`, `wordById` from `../../Scripts/WbwVocab`, SIK `InteractionManager`/`InteractorInputType`.
  Class name `StoryTour` = file name. Default scenario timeout is 600 s (`Leaf.lspkg/Scenarios/scenario/ScenarioConfig.ts`);
  PACE 1 is ~3 min plus waits. Waypoint numbers (W1–W4, seat offsets) assume today's tables (R5 §8); re-check if the
  seating moves.

---

## 9. Verification checklist

### 9.1 Captures per storyboard step (`CaptureRuntimeViewTool`, Preview at the Specs-like narrow view)
Take each at the end of its phase; check against the brief's colour/size rules (soft tones, no grey/black/white
panels, mode chip visible, content inside ±16° × ±19°, nothing covering the server or the object being named).

| # | Storyboard step | Pose / state | What must be visible |
|---|---|---|---|
| 1 | Arrival | after Start, suggestion up | Toast gone; `SuggestionPanel` with Learn / Practice / Use it live tiles in their tones + labels, Later; HUD hidden |
| 2 | Look around | counter spot, pitch -22 | 3–4 quiet brackets on the nearest ingredients; nothing else |
| 3 | Point to reveal | hover cucumber | Small label **close beside** the cucumber, "uborka" large / "cucumber" small, connector or focus bracket, Learn chip; no card |
| 4 | Select to listen | just after select | Compact card near the cucumber, "Playing pronunciation" indicator; then a second capture with "Ready to listen again" |
| 5 | Save | after Save | Same card, same place, "Saved ✓" in green; HUD "Saved: 1" |
| 6 | Open Use it live | after "Use it live →", greeting ended | Server caption "Jó napot! Mit kér?"; violet `PhraseHelper` on the tray above the two step-1 cards: "SAY IT AT THE COUNTER", "Kérek **uborkát** a szendvicsembe." + English, Listen, pattern switch, "Use it live" chip; the whole column inside ±19°; HUD chip names the mode |
| 7 | Reuse: point | hover salami in live | Violet label "szalámi / salami" with "Use this word" and "+ és" |
| 8 | Reuse: updated | after Use this word, then + és | Same helper: "Kérek **szalámit** a szendvicsembe.", then "Kérek **szalámit és paradicsomot** a szendvicsembe." |
| 9 | Say it (step 2) | after "Mit kér bele?" | Caption above the server, helper on the tray, `SpeakPrompt` with mic indicator + "Said it" below it |
| 10 | Say it (card step) | step 1 card chosen | Chosen card highlighted (selected state), `SpeakPrompt` below the cards |
| 11 | Table | after tapping 8 | "8 = nyolc" popup on table 8 |
| 12 | Practice | seated at table 8 | Board ~65 cm, rose tone, "0 / 4 pairs", Practice chip |

### 9.2 LEAF discipline
- **Strictly one scenario at a time.** Start one (`run_leaf_scenario`), wait for its result, read its logs, then the
  next. Never queue or overlap runs; never run while TypeScript is recompiling or while the other agent is editing.
- Before every batch: `RecompileTypeScriptTool`, zero compile errors; `TEMP_Probe` disabled (C0) or deleted (C5).
- During runs: **mouse off the Preview** (the helper also disables SIK Mouse interactors), Preview mic **off**
  (and `ignoreMicForTests` is set by the helper), Preview not resized mid-run.
- Order per gate: as listed in §7. Re-run a failed scenario alone once before debugging (audio-gated timing).
- Record for each run: scenario, pass/fail, duration, first failing `expect`/`waitFor` label, and the `[WbwLeaf]` lines
  around it.

### 9.3 Logs to check (`RunAndCollectLogsTool`)
- Compile: no TS errors (watch removed names: `onPlaySentence`, `flyTo`, `setPicked`, `fillingsCardCount`, `PICTURES`
  in Learn).
- `WbwMain: required @input not wired` (must not appear).
- `WbwAudio: no clip named '…'` (must not appear; any `p_kerek_*` here means 4.1 is missing).
- `WbwOrder: missing phrase clips:` and `WbwOrder: phrase table differs from WbwVocab:` (must not appear).
- `WbwSharedUI: button style not applied` / `could not tint inactive state` (UIKit timing; must not appear for new views).
- SIK errors about colliders on `Learnable_*` children (would mean UI got parented under a learnable).
- `[WbwLeaf] SOFT CHECK FAILED` (tour; review each, they are layout/feel items).
- `Timed out after … waiting for:` (the label tells which state never arrived).
- `WbwLearn: tracking N learnable objects` (N = number of `Learnable_*`, today 23 words in vocab) and
  `WbwCafeBuilder: found N authored learnable objects`.
- Voice (C6, Preview mic on): detector `debugLog` state changes; `sampleRateActual`; `vadState` reaches `nosignal` with
  the mic off within 1.5 s.

### 9.4 Agreed-design acceptance (tick all before calling Phase C done)
- [ ] Look around: only 3–4 quiet markers; the counter stays the main view.
- [ ] Pointing shows the label immediately, close beside the object, HU large / EN small, bracket and/or connector;
      **no click, no audio**, one label at a time; works with the Preview mouse (hover) and LEAF.
- [ ] Selecting the object **or its label** opens one compact card, plays once with "Playing pronunciation", then
      "Ready to listen again"; Listen again replays; Save → "Saved ✓"; "Use it live →" present.
- [ ] The card stays steady: pointer onto its controls or other objects does not move/close it; it closes on close,
      another select, or walking > ~1.5 m.
- [ ] Saving or exploring never orders (`answers` empty, `orderStep` 0, `phraseSlotIds` empty).
- [ ] Use it live (from card or menu) turns the UI lavender; the helper shows one sentence with the slot emphasised,
      English under it, Listen; the frame stays still while the slot changes.
- [ ] Use this word updates the same phrase; + és makes "X és Y" (3+: commas, "és" before the last); "… nélkül,
      kérem." switchable; correct stored forms (uborkát, szalámit, paradicsomot, sült csirkét, savanyú uborkát);
      audio keys per §6.
- [ ] Every answer (steps 1–6) is chosen, played, then said (mic) or Said it; showing a phrase never submits; the
      near-identical step-2 cards are gone.
- [ ] Arrival: setup → "Café detected (demo)" → suggestion with labelled, toned options + Later; nothing auto-starts.
- [ ] Colour only on UI; tones from SharedUI; mode chip on every panel; success green + "Saved ✓"/checks; incorrect
      amber + "Try again".
- [ ] DC1–DC5 and TOUR_Story green, each run alone.

---

## 10. Risks
- **Concurrent edits** (§0.1): highest risk is `WbwLearnController` and `WbwOrderController`. Merge, don't overwrite.
- **Hover flicker on device** (two-row grid, no SIK hysteresis): tune the arbiter's `switchDwellSec` 0.12 /
  `handSwitchDwellSec` 0.15 (hand ray) / `reacquireSec` 0.35;
  optional +2 cm collider growth while hovered (R2 §4).
- **Label occluding pans** (a UIKit Button is an Interactable; nearest hit wins): the spot scoring keeps it off
  neighbours; never raise learnables' `targetingPriority`.
- **Rich-text tags** for the slot emphasis are unverified (§3.4 A); fallback B exists.
- **Microphone Audio asset creation** may need the user's one click; detector thresholds are untested on device and
  in the Preview (R1 §7). Said it always works.
- **Runtime-created views** have code-default settings only; author them in the scene if tuning is needed.
- **Step-1 column** (helper above the two step-1 cards, prompt below, D9): may not fit ±19° at the tray distance;
  fallback in `placeColumn()` (float the helper during step 1). Capture 6 decides.
- **Q2 / Q12 / Q13 answers** can change C5: a "yes" to Q2 adds the §4.9 "Q2 alternative" block and restores the
  prep variant of tour U1–U6; Q13 "replay at step 2" changes DC3's and the tour's step-2 voice asserts.
- **Arming at step 2 without playback** (D14, Q13): self-talk could submit; Said it remains the reliable path.
- **Tour waypoints** assume today's seating; the DC5 seat fix reads `Table_8` at runtime.
