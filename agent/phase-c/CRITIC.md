# Phase C completeness critic

Written 2026-11-19, read-only. I did not use any MCP tool and changed nothing outside `agent/phase-c/`.

**What I read:** every file in `agent/phase-c/`: `INTEGRATION_PLAN.md`, `drafts/*`, `research/R1–R5`. I checked them against the agreed design, `devpost/design-brief.md`, today's `Assets/Scripts/Wbw*.ts`, `Assets/Tests/Leaf/*.ts`, the Leaf/SIK package sources and `Support/StudioLib.d.ts`.

**Checks I ran myself (all passed):**
- `selfTest()` on `drafts/WbwPhraseHelperModel.ts` returned `[]`.
- `checkAgainstVocab(WORDS)` against today's `Assets/Scripts/WbwVocab.ts` returned `[]`.
- `node drafts/WbwVoiceActivity.sim.mjs` printed "ALL CHECKS PASSED".
- All 65 `phraseClipKeys()` exist as `Assets/Audio/hu/*.wav` plus `.meta`. 31 are not yet in `WbwAudioBank.ts`, as plan §4.1 already says.
- Example outputs:
  - "Kérek szalámit, paradicsomot és sült csirkét a szendvicsembe." → `c_kerek+a_szalami+a_paradicsom+c_es+a_sult_csirke+c_a_szendvicsembe`
  - "Savanyú uborka nélkül, kérem." → `p_nelkul_uborka`
  - "Kérek uborkát a szendvicsembe." → `p_kerek_uborka_friss`
- Every API the drafts use exists in the sources:
  - LEAF:
    - `DefaultLeafInteractor(name)`, protected `enterHover` / `exitHover` (`BaseLeafInteractor.ts:221/:231`)
    - `findInteractableByName`, `findInteractablesByName`, `findSceneObjectsByName`, `withTimeout`, `nextFrame`, `sleep`
    - scenario timeout 600 s
  - SIK:
    - `onInteractorHoverEnter/Exit`, `TargetingVisual`
    - `InteractorRayVisual._interactor` / `.cursor`, `RAY_VISIBILITY_THRESHOLD`, `InteractorCursor.rayAlpha`
    - `InteractionManager.getInteractorsByType`, `InteractorEvent.propagationPhase`
  - Lens:
    - `Text.enableRichText`, `Text.getHighlightRects`
    - `FileAudioTrackProvider.duration`
    - `MicrophoneAudioProvider.start/stop/getAudioFrame`
    - `RenderMeshVisual.worldAabbMin`, `vec3.min/max`, `quat.rotationFromTo`, `HorizontalOverflow.Shrink`, `isEditor()`
  - Project: every `WbwSharedUI` / `WbwGeo` / `WbwSpatial` import of `drafts/WbwNameLabelUI.ts`, and every game field `StoryTour.ts` reads today (`lastMessage`, `currentEn`, `hintText`, `popupText`, `progressText`, …).

**How to read the status column:**
- **Covered** means the plan specifies the item and a draft or test exists.
- **Covered in plan (no draft)** means the integrator still has to write the code from the plan's spec.
- **Partly** means something is missing or contradicts the agreed design.

---

## 1. Summary

| # | Agreed item | Status | Main gap |
|---|---|---|---|
| S | Storyboard (Look → Point → Select → Save → Open Use it live → Reuse) | **Covered** | Every step has a plan section, a tour beat and a DC assertion (§2). |
| 1 | Look around (3–4 quiet markers) | **Covered** | The markers change to `markerTint("learn")` (D24); check "quiet" in capture 2. |
| 2 | Point to reveal (silent label beside the object) | **Partly** | (a) Two brackets show on marked or highlighted objects. (b) `PointerRay` is never built. (c) The Preview-mouse hover path has no automated check. |
| 3 | Select to listen (steady card, plays once, Listen again / Save / Use it live →) | **Covered in plan (no draft)** | The `WbwWordCardUI` and `WbwLearnController` changes are spec only. |
| 4 | Looking up ≠ saving ≠ ordering | **Covered** | D22 seeds the phrase from *saved* words on menu entry, which sits close to "saving fills the sandwich". |
| 5 | Open Use it live (violet, "SAY IT AT THE COUNTER" helper) | **Partly** | `WbwPhraseHelperUI` is spec only. The stable reusable part is not specified (alignment). The rich-text emphasis is unverified. The helper also shows during step 1. |
| 6 | Reuse the same phrase (Use this word, + és, nélkül, stored forms, audio) | **Covered** | The model and label drafts implement and check it. Minor notes in §3.6. |
| 7 | Showing never submits; voice activity / Said it; step 2 = helper; fixed step-2 cards removed | **Partly** | Step-1 helper edits run during an armed step-1 turn. D14 arms the mic without replay. `WbwSpeakPromptUI` is spec only. |
| 8 | Arrival (setup → toast → suggestion with Learn / Practice / Use it live / Later) | **Partly** | `WbwSuggestionUI` is spec only. The "walks into the café" start depends on the optional C7 work in the builder-owned `WbwCafeBuilder`. |
| 9 | Colour identity (UI only, SharedUI tones, mode chip everywhere) | **Covered** (minor) | Rich text needs a `hexOf()` helper in the builder-owned `WbwSharedUI`. Two inspector labels contain a hex colour. CYAN is used for a status line. |
| 10 | LEAF stability (keep names, add the agreed names and state) | **Partly** | No `PointerRay`. The tour's `REAL_VOICE_SECS` can never work. The tour's `pointerRayVisible` check is not gated on `isEditor()`. The timing of `ignoreMicForTests` is unsafe. |

---

## 2. Storyboard coverage

| Step | Plan | Tour beat (`drafts/StoryTour.ts`) | DC test edit |
|---|---|---|---|
| Look around | Existing `scan()`, `maxBrackets` 4; §4.7 D24 tints | L1 (`bracketedIds` 3–4, nothing ordered), L2 (≤ 4 `Brackets`) | DC2 :25-58 unchanged |
| Point to reveal | D1–D4, §3.2 `WbwPointing.ts`, §3.3 `WbwNameLabelUI.ts` | L3 ("uborka" / "cucumber", no voice, no SFX, label < 30 cm), L4 (silent sweep, one label) | DC2 insert (§8.2): `pointHold("sonka")`, label texts, no audio, tap `NameLabel` |
| Select to listen | D5, D6, §4.6, §4.7 `select` / `speak` | L5 (plays once, "Playing pronunciation" → "Ready to listen again"), L6 (Listen again), L7 (card steady), L12 (select via the label) | DC2 `cardPlayCount` 1 → 2, `WordCardStatus` |
| Save | §4.7 `saveCurrent` (no fly, card stays) | L8 ("Saved…", card stays, `answers` / `orderStep` / `phraseSlotIds` empty), L9–L11 | DC2 :97/:104; `learnAndSave` closes the card |
| Open Use it live | D8, D22, §4.9 `setActive` / `seedPhrase` / `runStep` | L13 (`WordCardUseLiveButton`), U1 (greets at once, helper "Kérek uborkát a szendvicsembe.", no auto-play) | DC1 unchanged; DC3 step 1 asserts the helper and its empty phrase |
| Reuse the same phrase | D10, D12, D23, §4.9 editing | U2 (violet label + Use this word / + és, silent), U3 (same `PhraseHelper` uniqueIdentifier, "Kérek szalámit…"), U4 (combined), U5 (Listen never submits), U5b optional (nélkül) | DC3 step 2 (nélkül, want, combined, Listen, Said it) |

---

## 3. Item by item

### 3.1 Look around: **Covered**
- `WbwLearnController.scan()` keeps 3–4 markers (`maxBrackets` 4). The tour (L1/L2) and DC2 (:25-58) check it.
- Watch: D24 changes the "discreet warm" markers to `TONE_LEARN.tint` (powder blue, unlit, 0.45 cm). Use capture 2 (§9.1) to judge whether they still read as *quiet*.
- See also §4 F1: pointing at a marked object adds a second bracket. That spoils the quiet look exactly at the counter.

### 3.2 Point to reveal: **Partly**
Implemented as complete code: `drafts/WbwPointing.ts` (one arbiter: immediate first show, 0.12 s / 0.15 s dwell, 0.5 s grace, per-interactor, no audio import) and `drafts/WbwNameLabelUI.ts` (one reused `NameLabel` Button, HU large / EN small, mode chip, connector, bracket, AABB placement inside ±16° × ±19°, never under a learnable).

Gaps:
- **F1 (contradiction): two brackets on marked objects.**
  - `WbwNameLabelUI.ts:36-38` says "the object never gets two brackets".
  - Plan §4.7 (INTEGRATION_PLAN.md:484-489) says hover no longer touches the learnable's `Brackets`, so DC2's count "holds while pointing too".
  - So any object already carrying a discovery marker (Learn) or a live highlight (`setHighlight`) shows **both** its `Brackets` set and `NameLabelBracket`, at different sizes.
  - The tour's own L3 target (cucumber) is in the expected marked set (`StoryTour.ts:406`), so capture 3 will show the double bracket.
  - The design asks for "a discreet bracket", one.
  - Fix options:
    - (a) While `labelForId === id`, hide that learnable's `Brackets` and adjust DC2's count to exclude `labelForId`.
    - (b) Skip `NameLabelBracket` when the object already has an enabled `Brackets` set, and retint that set instead.
- **F2 (deviation from item 10): `PointerRay` is never built.**
  - D4 / Q5 (plan :97, :127) drop it. R2 §8 had kept it "disabled in the editor".
  - StoryTour hard-asserts `pointerRayVisible === false` (`StoryTour.ts:432`).
  - In the recorded tour no pointer is visible at all (LEAF interactors draw nothing). The video shows labels appearing with no visible cause; only `NameLabelBracket` hints at what is pointed at.
  - The user must decide:
    - (a) Accept "no ray in the Preview" and drop `PointerRay` from the agreed name list.
    - (b) Add a subtle `PointerRay` that draws only from the LEAF tour pointer, or only in recordings, and relax the tour assert.
- **F3: the "mouse hover in the laptop Preview" path is untested.**
  - Every LEAF run disables the Mouse interactors (plan §8.1 `quietMouse`, `StoryTour.ts:303`).
  - `PreviewInteractTool` Hover needs an `AgentInteractScript` the scene lacks (R2 §9.4).
  - The §9.4 checkbox "works with the Preview mouse" therefore needs a manual check by the user, or computer-use.
  - Also: `TouchRayProvider` keeps the last cursor point after the mouse leaves the panel (R2 §2.5). In a live Preview demo, WASD or right-drag turns then sweep silent labels across objects. That is harmless, but worth knowing before recording with the mouse.
- **Minor, device only.** The label re-places itself when the head moves > 10 cm or turns > 8° (`WbwNameLabelUI.ts` `tick`). On Specs, natural head motion may make it hop. Tune `replaceTurnDeg` on device.

### 3.3 Select to listen: **Covered in plan (no draft)**
- Covered by:
  - D5 / D6, §4.6, §4.7 (`select` replays the same object without moving the card, `cardPlayCount`, `WordCardStatus` "Playing pronunciation" → "Ready to listen again", "Listen again" / "Save" → "Saved ✓" / "Use it live →").
  - The label surface selects in Learn (`nameLabel.onSelect` → `selectById`).
  - One card only.
  - It closes on its close button, on another select, or on walk-away: the existing `walkAwayCm = 150` (`WbwLearnController.ts:52, :295`), already tested by DC2 :109-116.
- Missing as code: the `WbwWordCardUI.ts` rewrite and every `WbwLearnController.ts` edit are prose only.
- Open: Q4, whether the font renders "Saved ✓".

### 3.4 Looking up, saving and ordering are separate: **Covered**
- `saveCurrent()` no longer touches order or phrase state.
- Asserts: L8 (`answers`, `orderStep`, `phraseSlotIds` all empty), DC2 edit (§8.2), §9.4 checklist.
- **Tension (Q12 / D22, plan :115).** Entering Use it live from the menu or the suggestion seeds an empty phrase with the **last saved** counter ingredient.
  - The agreed design only gives the card example ("after learning uborka → Kérek uborkát…").
  - Pre-filling the sandwich sentence from the save list can read as "saving adds it to the sandwich".
  - Ask the user. The safer default is to seed only from the card's "Use it live →" (`via === "card"`) or `session.liveWord`, not from `session.saved`.

### 3.5 Open Use it live: **Partly**
- Covered:
  - The deliberate switch: card link (`learn.onUseLive` → `setLiveEntry("card")` → `selectMode("live")`), mode menu, suggestion.
  - The violet tone through `applyMode`.
  - The helper spec: §3.4 layout, `PhraseHelperTitle` "SAY IT AT THE COUNTER", `PhraseHelperHu` / `PhraseHelperEn`, Listen (gated by `canListen`), pattern toggle, mode chip, fixed frame, same object across edits (the tour asserts the `uniqueIdentifier`).
- **F4: no draft.** `WbwPhraseHelperUI.ts` exists only as spec (§3.4).
- **F5: "the reusable part stays visually stable" is not specified.**
  - §3.4 (plan :235-267) never sets text alignment or a fixed break.
  - With a centred `Text`, "Kérek" and "a szendvicsembe." move on every slot change.
  - Specify:
    - left alignment, so "Kérek " never moves;
    - in pattern A, always break before " a szendvicsembe." (not only when it wraps), so the tail sits at a fixed line start;
    - pattern B keeps "… nélkül, kérem." on its own run.
  - Sizing the panel for 4 slots on two lines (§3.4) also works against "compact". Check capture 6.
- **F6: emphasis.**
  - Option A (`enableRichText`, Lens Scripting 356+) is unverified: tag syntax, and whether LS 5.23's runtime is ≥ 356.
  - It also needs a runtime tint-to-hex helper that the plan puts in `WbwSharedUI` (`hexOf`, plan :256-257). That file belongs to the builder, so coordinate.
  - Fallback B (`getHighlightRects`, 362+) is also unverified.
- **F7: the helper shows during step 1** (D9, plan :102). See §3.7. It competes with the step-1 cards, while item 7 says step 2 uses the helper and step 1 keeps its own phrases.

### 3.6 Reuse the same phrase: **Covered**
- `drafts/WbwPhraseHelperModel.ts`:
  - The per-item stored nominative / accusative / English / clip keys cover all 15 counter ingredients.
  - It handles the traps: `csirke` → `w_sult_csirke` / `a_sult_csirke`; `uborka` (pickles) → `a_savanyu_uborka`; meatball / meatballs.
  - `useWord` replaces the list and refuses a word already in it; `addWord` appends (max 4).
  - 3+ items: commas plus "és" before the last.
  - Pattern "without" uses a capitalised nominative ("Savanyú uborka nélkül, kérem.").
  - Audio: one item → `p_kerek_<id>` / `p_nelkul_<id>`; several → stitched sequence.
- `drafts/WbwNameLabelUI.ts` live row:
  - "Use this word".
  - "Add (+ és)" only for 1–3 words.
  - "In your phrase" plus a check once the word is in the phrase.
  - No buttons for non-ingredients or while the phrase is not editable.
- Plan §4.9: `useWord` / `addWord` / `setPattern` / `rebuildPhrase`.
- Tour U2–U5 and DC3 step 2 assert the exact strings and audio keys.
- Notes, none blocking:
  - The agreed text reads "(+ c_es + a_<id>…)". The model puts `c_es` **only before the last** item (commas are silent), which matches the displayed sentence. Confirm with the user if in doubt.
  - The forms live in the new `PHRASE_INGREDIENTS` table, not in `WbwVocab` `WordEntry`. They are still "stored per item", and drift is caught by the loud startup `checkAgainstVocab` (§4.9).
  - There is no remove or clear control. A combined phrase can only shrink by choosing "Use this word" on a word *not* already in it. That is within the agreed design, which has no remove.
  - R3 §12.7: a "… nélkül, kérem." answer on its own to "Mit kér bele?" is pragmatically partial. An optional hint could suggest pattern A first.
  - Stitched multi-item audio has ~0.58 s gaps (Q10).

### 3.7 Showing never submits; speak turns: **Partly**
- Covered:
  - D13–D16, §4.8 (choose ≠ submit), §4.9 (`onPhrase` plays and opens the turn, `onSaid` advances, `closeSpeakTurn` on every re-offer).
  - The step-2 fixed cards are deleted (`sonka_sajt`, `kerhetek_oliva`, `uborka_nelkul`, `szalami_sajt`, `csirke_paprika`, `done`).
  - Steps 1 / 3 / 4 / 5 / 6 keep `PhraseCard_<id>`.
  - "Said it" is always the fallback.
  - The detector (`drafts/WbwVoiceActivity.ts`, passes its sim) has a playback gate and tail guard, never advances on a timeout, and stores no samples.
  - DC3 / DC4 / tour use `sayIt()`.
- **F8 (contradiction risk, needs a user decision):**
  - D9 shows the helper, editable, above the step-1 cards while the server has just asked "Mit kér?". The helper's sentence is the step-2 answer and the wrong answer to step 1, and nothing on screen says so: §3.4 has a hint only while the phrase is empty.
  - Worse: if a step-1 card was chosen (turn armed) and the learner then edits the helper, D12 auto-plays the helper phrase. D23 says step-1 edits never touch the card turn, so the step-1 turn stays armed. After the clip plus 0.35 s the mic listens again, and saying the *helper* sentence advances step 1 as "Egy szendvicset kérek." (`rebuildPhrase`, plan :628-647).
  - Options:
    - (a) On a step-1 helper edit, disarm the detector the same way step 2 does (D23); keep Said it.
    - (b) During step 1, add a small helper line such as "For the next question ('Mit kér bele?')", or dim the helper.
    - (c) The Q2 prep state.
- **F9:** D14 / Q13 (plan :107, :135) arm the mic at step 2 with no replay. Self-talk, or a presenter narrating a demo with the Preview mic on, submits the answer. Recommendations:
  - keep the mic off for recordings (and keep `ignoreMicForTests` set);
  - add `voiceDetection` default guidance to the README.
- **F10: no draft.** `WbwSpeakPromptUI.ts` is spec only (§3.5). The show-token rule is well specified.

### 3.8 Arrival story: **Partly**
- Covered in plan:
  - D17, §3.6 (`SuggestionPanel` with toned, labelled tiles, Later, description on hover, no voice, nothing auto-starts, HUD hidden until a pick).
  - §4.10 (`arrivalPhase` setup → walkIn → toast → suggest → done, toast after 80 cm or 1.5 s, lazy follow).
  - §8.1 `completeSetup` taps `SuggestLearnButton`.
  - Tour A1–A6.
- **F11: no draft.** `WbwSuggestionUI.ts` is spec only.
- **F12: "begins as the learner walks into the café"** depends on the optional C7 (`arrivalWalkIn` / `EntranceSpot`, §4.13). It lives in `WbwCafeBuilder.ts`, which the other agent owns.
  - Without it, the live Preview starts at the counter and the "walk in" exists only as a hard cut in the tour (`StoryTour.ts:355-358`).
  - Decide with the builder whether C7 is in scope for the demo.

### 3.9 Colour identity: **Covered** (minor items)
- The drafts take every colour from `WbwSharedUI` (`toneOf` / `useTone` / `TONE_*` / `CYAN` / `GREEN` / `TEXT_*`). D24 removes the learn controller's colour inputs and asks `markerTint()` at use time. Mode chips are on the label (Q8), the helper, the speak prompt, the card and the compact HUD (D19).
- Minor:
  - `@ui.label('<span style="color: #60A5FA;">…')` in `drafts/WbwNameLabelUI.ts:139` and `drafts/WbwVoiceActivity.ts:145`. This is inspector-only and matches the existing project pattern (`WbwPracticeController.ts:19`), but it is a literal "electric" blue hex. Drop it or leave it knowingly.
  - Plan §4.6 colours the "Playing pronunciation" status `CYAN`. The brief reserves cyan for "current target or focus"; `TEXT_SOFT` plus the pulsing `volume_up` icon is enough.
  - `hexOf()` for rich text must be added in `WbwSharedUI`, which belongs to the builder.
  - FYI for the builder, do not edit: the `WbwSharedUI.ts` header (line 6) still says "cobalt / violet / magenta".

### 3.10 LEAF stability: **Partly**
- Kept names: `WordCardPlayButton` (now "Listen again"), `WordCardSaveButton`, `MenuButton`, `Mode*Button`, `TableNumberButton_N`, `PhraseCard_<id>`, `Practice*`, `activeCardWordId`.
- New names present: `NameLabel`, `NameLabelHu` / `En`, `WordCardUseLiveButton`, `WordCardStatus`, `UseThisWordButton`, `AddWordButton`, `PhraseHelper` (+ `Hu` / `En` / `Title`), `PhraseHelperListenButton`, `PatternWantButton`, `PatternWithoutButton`, `SaidItButton`, `SuggestionPanel`, `Suggest{Learn,Practice,Live,Later}Button`.
- State present: `hoveredId`, `labelForId`, `cardWordId`, `cardPlayCount`, `savedWords`, `phraseSlotIds`, `phrasePattern`, `phraseHu` / `En` / `AudioKey`, `waitingForSpeech`, `speechDetected`, `suggestionVisible`.
- Tapped names are Buttons, not `panel()` roots.
- Gaps:
  - **`PointerRay`**: F2.
  - **F13.** `StoryTour.ts:37-38, :264-270` `REAL_VOICE_SECS` can never hear a voice: plan §8.1 sets `ignoreMicForTests = true` in the `WbwTester` constructor for every scenario. Either clear it in the tour when `REAL_VOICE_SECS > 0`, or delete the option.
  - **F14.** The constructor reads `main.vad`, which `WbwMain.start()` (OnStart) creates. If the tester is built before that, the flag is never set. Set it again lazily in `sayIt()` and `completeSetup()`.
  - **F15.** The hard assert `pointerRayVisible === false` (`StoryTour.ts:432`) would fail in a device LEAF run (learnables use `TargetingVisual.Ray`). Gate it on `global.deviceInfoSystem.isEditor()`.
  - **Duplication.** Plan §8.1 adds `WbwPointer` plus `quietMouse` to `WbwLeafHelpers.ts`, and `StoryTour.ts` defines its own copies. This works (different modules, so the tour's `quietMouse` finds 0 mice), but import the helper's copies when porting.

---

## 4. Contradictions and bugs, most serious first
1. **F1: two brackets** on marked or highlighted objects. Contradicts "a discreet bracket" and the draft's own claim (`WbwNameLabelUI.ts:36-38` versus plan :484-489).
2. **F8: helper during step 1.** Two competing "say this" surfaces. A step-1 edit's auto-play leaves the step-1 turn armed, so saying the helper sentence advances step 1 (D9 / D12 / D23).
3. **F2: `PointerRay`** (agreed item 10) is absent, and the tour hard-asserts no ray. The recorded video has no visible pointer.
4. **F5: the reusable part is not pinned in place** (alignment and break unspecified in §3.4).
5. **F12: walk-in** depends on optional builder-owned C7.
6. **D22 seeding from saved words** (tension with item 4).
7. **F13–F15:** LEAF details (`REAL_VOICE_SECS`, `ignoreMicForTests` timing, device-ungated ray assert).
8. **Brief drift (docs, not `Assets/`).** These `devpost/design-brief.md` lines still describe the old behaviour, which the agreed design overrides:
   - :80 card flies into the counter;
   - :81 a phrase card "counts as your answer";
   - :95 the word card "hides when saved";
   - :97 phrase choices "hide once answered".
   - Update them after integration so the Devpost text matches the build.

**Spec-only modules the integrator must still write**, with no draft code. Together they are the largest remaining build risk:
- `WbwPhraseHelperUI.ts`
- `WbwSpeakPromptUI.ts`
- `WbwSuggestionUI.ts`
- the `WbwWordCardUI.ts` rewrite
- the `WbwHudUI.ts` compact chip
- every edit to `WbwLearnController`, `WbwOrderController`, `WbwMain`, `WbwSession`, `WbwSpatial`, `WbwAudioController`, `WbwVocab`, `WbwPhraseChoicesUI`

**Ported as is:** `WbwPhraseHelperModel.ts`, `WbwPointing.ts`, `WbwNameLabelUI.ts`, `WbwVoiceActivity.ts`, `StoryTour.ts`.

---

## 5. Open risks the integrator must settle in Lens Studio
1. **Rich text.** Check the `Text.enableRichText` tag syntax (`<b>`, `<color=#…>`) and that LS 5.23 runs Lens Scripting ≥ 356. The fallback `getHighlightRects` needs 362. Check with `QueryLensStudioKnowledgeBase` and a capture before writing §3.4 option A.
2. **Preview microphone.**
   - The Microphone Audio asset may need the user's one click (the Editor API `createNativeAsset` type string is undocumented).
   - The Preview mic button appears only once a script references the asset, and its default state is unknown.
   - What `getAudioFrame` returns while the mic is off (x = 0 or zeros; the watchdog handles both), the real `sampleRate`, and the laptop / Specs dB thresholds can only be tested live.
   - Said-it-only must stay the default for LEAF and for recordings (F9).
3. **`durationOf()`.** `(AUDIO[k].control as FileAudioTrackProvider).duration` is typed, but check it at runtime for the WAV clips (R1 §7.6). The fallback is 1.2 s per part.
4. **Hover without select in LEAF.**
   - `enterHover` awaits `onHoverEnter`, which never fires if another CustomController interactor (or a stale mouse) already hovers that target.
   - So never hold the pointer on the object you tap. `Tour.tap` releases first; `pointHold` + tap `NameLabel` / `UseThisWordButton` use different targets, which is safe.
   - Keep `quietMouse()` as a gate. Check that the arbiter receives Target-phase `onInteractorHoverEnter` from LEAF interactors and that `pruneStale` (`currentInteractable`) does not drop them.
5. **Preview mouse hover** (no automated path; F3). Ask the user to hover in the Preview, or add an `AgentInteractScript` so `PreviewInteractTool` Hover works. Also check that `targetingVisual = None` on learnables still delivers mouse hover (R2 says visual only).
6. **`hideMouseRayVisual()`.** Disabling the Mouse `InteractorRayVisual` component must stick (CursorController creates it in its own onStart; the arbiter rescans at 0.05 / 0.5 / 1.5 / 3 s and then every 5 s). Confirm "no band" with a capture and `countMouseRayVisuals()`.
7. **UIKit at runtime.** Check that `NameLabel`'s `Button.size` changes on every `layout()` resize the collider and keep the style. Check that child live buttons are retired inside their own trigger callback without breaking `WbwTester.tap` (it tolerates a "gone" target only if `onTriggerEnd` fired). Check `Component.Canvas` on `NameLabelAnchor`.
8. **Runtime-created views** (`ensureViews`, `createComponent(X.getTypeName())`) get code-default inputs only. Check them in the inspector and in captures.
9. **Step-1 column fit** (helper above two cards, speak prompt below) within ±19° at the tray (capture 6). The fallback is to float the helper.
10. **Concurrent edits.** Re-read `WbwLearnController`, `WbwOrderController`, `WbwSharedUI` and `WbwCafeBuilder` right before editing (plan §0). The plan's line numbers are hints from 01:56.
11. **Before C5, ask the user:** Q2 (prep state; it also resolves F8), Q5 (`PointerRay`; F2), Q12 (seeding; §3.4), Q13 (arming without replay; F9), plus the new decisions here: F1 fix (a) or (b), F5 alignment, F8 option (a), (b) or (c), and whether C7 walk-in is in scope (F12).
