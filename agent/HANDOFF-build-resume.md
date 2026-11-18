# Handoff: resume the Word by Word build

Written 2026-11-18. The project was copied here from OneDrive because Lens Studio could not compile TypeScript there: every `RecompileTypeScriptTool` call failed with "Failed to perform file operation on folder: …/Cache/TypeScript" (OneDrive read-only/pinned flags on `Cache/`). The copy skipped `Cache/`; Lens Studio rebuilds it.

The old OneDrive copy is left untouched as a backup. Work only in this folder.

## Where things stand
- Spec: `devpost/design-brief.md` (approved). Audio list: `devpost/audio-recording-list.md`. Reference photos: `devpost/references/`.
- Done, **never compiled or run**:
  - Scene "Phase A": `WordByWord` root with `Cafe` (WbwCafeBuilder, y = -160 = floor), `UI` roots, `Controllers`; SIK prefab at scene root; preview set to SPECS Interactive.
  - 25 scripts in `Assets/Scripts/Wbw*.ts`.
  - 41 placeholder voice clips in `Assets/Audio/hu/` (no Hungarian TTS voice on this PC; the list says 43 but names 41 files). 7 SFX in `Assets/GeneratedSFX/`. 31 illustrations in `Assets/Illustrations/`. 12 icons in `Assets/Icons/`.
- Not done: Phase B input wiring, first compile and fixing its errors, runtime check, the café dressing pass, LEAF tests.
- Nothing committed since `1c7755c`. The `.agents/skills/plan-lens/` deletions in `git status` were already in the OneDrive copy before the move.

## Resume plan
1. Run `RecompileTypeScriptTool`. Expect a few TypeScript errors (the code has never compiled). Fix them.
2. Apply Phase B wiring as one VirtualScene apply: `agent/phaseB_wiring.json`.
3. Run `RunAndCollectLogsTool`. WbwMain logs the camera start position; check the floor is ~160 cm below eye, else move the `Cafe` root.
4. Capture and check the basic flow: setup → toast → Learn → Use it live → Practice.
5. Dressing pass (`/build-mesh`): server (stylized barista), red espresso machine, seated diner, mustard velvet sofa → `ServerSpot.bodyPrefab`, `Cafe.espressoPrefab`, `Cafe.dinerPrefab`, `Cafe.sofaPrefab`. Match the reference photos; keep colours mid-to-light (additive display).
6. Save, then LEAF: one scenario per done criterion (5), run in preview, report which pass and which criteria have no test.

## LEAF targets
- Interactive objects: `MenuButton`; `ModeLearnButton`, `ModePracticeButton`, `ModeUseLiveButton`, `ModeMenuCloseButton`; `Setup*` + `SetupConfirmButton`; `Learnable_<id>` (e.g. `Learnable_olivabogyo`); `WordCardPlayButton`, `WordCardSaveButton`, `WordCardCloseButton`; `PhraseCard_<id>` (jonapot, szendvicset, sonka_sajt, kerhetek_oliva, uborka_nelkul, done, tejes_kave, itt_eszem, elvitelre, negyes_asztal, nyolcas_asztal, tizenkettes_asztal, koszonom); `TableNumberButton_4/_8/_12`; `PracticeHu_<id>`, `PracticeEn_<id>`, `PracticeCloseButton`, `PracticeNewSetButton`.
- State: `WbwMain` (currentMode, savedWords, savedCount, setupComplete, menuOpen); `WbwLearnController` (activeCardWordId, bracketedIds); `WbwOrderController` (orderStep 0–7, waitingFor, answers, chosenTable, lastServerLine); `WbwPracticeController` (pairsMatched, pairsTotal, complete, wrongAttempts); `WbwAudioController` (lastVoiceKey, voicePlayCount).

## Deviations from the brief (tell the user)
- "✋ Menu" is a hand icon + "Menu"; the toast uses a pin icon (font likely lacks emoji).
- Step 3 offers only "Egy kicsi tejes kávét kérek." (the only drink phrase with a clip).
- Some example sentences were written by the builder (e.g. "Kérhetek csirkét?", "Spenót nélkül, kérem."). The native-speaker learner should review them.
- Learn mode starts automatically after setup (`WbwMain.firstMode`).
