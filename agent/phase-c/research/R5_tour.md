# R5 (tour): Arrival story and the watchable "story tour" (agreed Phase C design)

Scope: how the demo begins (the learner walks into the café, setup, "Café detected (demo)", the suggestion panel), how that works in Interactive Preview and in LEAF without breaking DC1 to DC5, and a beat-by-beat LEAF scenario `TOUR_Story` that records as a demo video of the agreed storyboard. The storyboard is Look around → Point to reveal → Select to listen → Save → Open Use it live → Reuse the same phrase with another word, then the server conversation, the table, and Practice.

This note supersedes `R5_arrival.md`. That earlier pass was written against the older design: cobalt/violet/magenta colours, a step-2 want/nélkül chooser, per-object `NameLabel_<id>`, and a card that closes on Save. Its layout facts are re-verified below.

Read-only sources:
- `devpost/design-brief.md`
- `Assets/Scripts/WbwMain.ts`, `WbwCafeBuilder.ts`, `WbwSetupPanelUI.ts`, `WbwToastUI.ts`, `WbwSpatial.ts`, `WbwSession.ts`, `WbwSharedUI.ts`, `WbwLearnController.ts`, `WbwOrderController.ts`, `WbwPracticeController.ts`, `WbwAudioController.ts`, `WbwVocab.ts`, `WbwHudUI.ts`, `WbwWordCardUI.ts`, `WbwTableCardUI.ts`
- all `Assets/Tests/Leaf/*.ts`
- `.virtual-scene.json` (snapshot of 2026-11-19 01:24)
- `Leaf.lspkg` interactor and scenario-manager sources
- clip lengths measured from `Assets/Audio/hu/*.wav`
- sibling notes R1 to R4, the step-2 sentence-builder draft (`agent/phase-c/drafts/`), and the skill `.claude/skills/realistic-lens-scenes` §6

Nothing outside `agent/phase-c/` was changed.

---

## 0. Key decisions (TL;DR)

1. **Start spot:** just inside a door in the middle of the front wall, at café-local **(x 0, z 520)**, facing the counter (yaw 0) down the clear centre aisle. The counter front is 6.2 m ahead and the server 6.9 m. The café origin stays at the counter spot, so every `eyeAt(x, z)` in the tests keeps its meaning. The builder reads an authored marker `EntranceSpot` if one exists, otherwise the input `startSpot`.
2. **Sequence:** setup panel (at the door) → *Start* → walk-in → toast "Café detected (demo)" (fires after 80 cm of walking, or 1.5 s after Start) → toast 3 s plus a 0.35 s fade → **suggestion panel 0.3 s later** → the learner picks. **Nothing auto-starts.** An optional `suggestAutoPickSec` exists only for kiosk use and defaults to 0, meaning off.
3. **Suggestion panel** `SuggestionPanel`, 33 × 22.4 cm at 70 cm, lazy-follows at `inView(70, -3)`:
   - The heading asks "What would you like to do here?".
   - Three equal tiles: **Learn / Practice / Use it live**. Each tile is labelled with its mode name and filled with its own mode tone from `WbwSharedUI` (no hex values in new code).
   - One description line that changes when a tile is hovered.
   - A smaller **Later** button.
   - Learn is the suggested tile while fewer than 4 words are saved.
   - The HUD stays hidden until the learner picks.
4. **DC1 to DC5 stay green with one helper change:** `completeSetup()` waits for the suggestion, taps `SuggestLearnButton`, then puts the head at the counter spot `eyeAt(0, 0)`. Scenario bodies stay unchanged. Fallback: a new input `arrivalSuggestion = false` restores the old automatic Learn start.
5. **Story tour:** one LEAF scenario, about 2:45 at watch pace, in 4 acts and about 50 beats. Camera poses are written as eye position + look target and resolved at runtime (`aimAt(name)`), so layout changes don't break them. Reference yaw/pitch numbers for today's layout are in §5. `PACE` scales every pause and glide (0.25 gives a ~60 s regression run).
6. **Two Phase C dependencies the tour needs from other owners** (§7):
   - (a) **prep state in Use it live:** entering from the card's "Use it live →" shows the phrase helper, and the server greets only when the learner looks up at her (about 0.8 s) or taps `ReadyToOrderButton`. Entering from the menu or the suggestion starts the greeting at once, as today, which keeps DC1/3/4.
   - (b) **seated board distance:** allow a negative nudge so a seated learner gets the practice board at about 65 cm.
7. **Layout drift that breaks a test today:** `Table_8` is now at (-405, 440). DC5's seat `eyeAt(-145, 310)` is 291 cm from it, more than `nearTableCm` (250), so the board opens "front" and `placedAt === "table"` fails. Fix: derive the seat from `Table_8`'s world position (§4.4).

---

## 1. Facts from the files

### 1.1 Start-up today
- `WbwMain.start()` runs `cafe.build()`, then initialises the controllers, then shows the setup panel at `inView(70, -7)`.
- `confirmSetup()` then:
  - hides the setup panel;
  - **shows the HUD**;
  - shows the toast once at `inView(80, 14)` (it does not follow);
  - after `toastSeconds + 0.2` calls `selectMode(firstMode)`. The scene serializes `firstMode = "learn"`, so a changed code default would not apply. Add a **new** input instead of re-using it.
- `WbwCafeBuilder.alignFloor()` puts the café origin **under the camera** (x/z) and 160 cm below the eyes. It keeps doing this for 2.5 s, or until the camera has moved 12 cm. So today the café origin = start spot = counter spot.
- `WbwLeafHelpers.completeSetup()`:
  - taps the 3 setup buttons;
  - asserts the toast within 3 s;
  - asserts that **Learn starts automatically within 8 s**, plus HUD text "Mode: Learn".
- `eyeAt(x, z)` = café origin + (x, 160, z). Yaw 0 looks at the counter (-Z), +90 looks left (-X, pastry side, table 8 side), 180 looks at the seating and the entrance. Negative pitch looks down.
- LEAF:
  - `DefaultLeafInteractor.trigger()` = hover enter → select → release.
  - `hover(target, ms)` is public. `enterHover`/`exitHover` are protected, so a small subclass can hold a hover (§5.1).
  - Scenario timeout: `__leaf__timeout_secs` defaults to **600 s**.
  - LEAF has no mic injection (R1). Its hand interactor uses direct (poke) targeting, so the far-field "point" in the video comes from `DefaultLeafInteractor` + our `PointerRay` (R2).
- Preview view: about **±16° horizontally × ±20° vertically** (`agent/cafe-visual-brief.md`). Keep each beat's subject within about ±12° of the view centre.

### 1.2 Café layout (café-local cm, floor y = 0, origin = counter spot; unchanged since R5_arrival)

| Thing | Position | Notes |
|---|---|---|
| Room | x -553 to 553, z -243 (back wall) to 600 (front wall), ceiling 303 | Windows only on the side walls (x ±549). **No door object yet** |
| Sandwich counter | root (0, 0, -130); front edge z ≈ -100; top 90 | `PhraseTray` (0, 95.5, -104), tilted -50° |
| Ingredient front row (y 94, z -120) | salata -63, spenot -45, **paradicsom -27**, paprika -9, **uborka_friss 9** (cucumber, "uborka"), uborka 27 (pickles, "savanyú uborka"), hagyma 45, olivabogyo 63 | |
| Ingredient back row (y 95.5, z -137.5) | sonka -54, **szalami -36**, **sajt -18**, csirke 0, husgomboc 18, majonez 36, mustar 54 | |
| Server | `ServerSpot` (0, 0, -172), height 172; face ≈ (0, 160, -172); caption anchor (0, 190, -172) | |
| Pastry / coffee | pastry root (-200, 0, -130), kenyer (-301, 100, -130) · coffee root (250, 0, -130) | |
| Tables (empty: **4, 8, 12**) | 2 (-405, 240) diner · **4 (-135, 240)** · 5 (135, 240) diner · 7 (405, 240) diner · **8 (-405, 440)**, only `ChairL` at (-455, 440), facing +X · 10 (-135, 440), two diners · **12 (135, 440)** | Number card at table + (0, 81, -22), facing the counter |
| Lounge | sofas (370 to 500, 470) | Right front corner |
| Clear walkways | centre aisle x -60 to 60 from z 597 to the counter · front lane z -80 to 200 · gap between tables 2 and 4 at x -330 to -210 · aisle between rows z ≈ 300 to 390 | |

```
 z      x: -550 ............................ 0 ............................ +550
-243  ┌───────────────── chalkboard ─────────────── neon "COFFEE" ────────────────┐
-130  │ shelves   [pastry ● kenyér]  [== sandwich counter ==]   [coffee bar]       │
-172  │                               S  server                                  │
-104  │                            ─── tray ───                                  │
   0  │                               C  counter spot (café origin)              │
 110  │          W2·                                         stools              │
 240  │   ●[2]   ·   [4]         ║ aisle ║         [5]●          [7]●            │
 345  │ W4·  ·  ·W3                ║       ║                                       │
 440  │  ♦[8]        [10]●●        ║       ║         [12]          lounge          │
 520  │                               E  entrance spot (start)                   │
 600  └──────────────────────────────[door]───────────────────────────────────────┘
       ● diner   ♦ free chair at table 8 (the seat used in Act 4)   · walking route
```

---

## 2. Where the learner starts

**Entrance:** a door in the middle of the front wall (x 0, z 597). The centre aisle leads straight from it to the counter and the server, so walking in feels natural. Start **80 cm inside, at (0, 520), yaw 0**. From there the learner sees the aisle, the green counter and the server ahead, and the chalkboard above (yaw +4.5°). Tables 10 and 12 are about 1.6 m to each side, and tables 4 and 5 come into view at the edges as they walk.

### 2.1 Implementation (for the café-builder owner; Assets/ is not touched here)

- New `WbwCafeBuilder` inputs (new inputs pick up their code defaults):
  - `arrivalWalkIn: boolean = true`. Hint: "Start at the entrance (walk-in demo). Off = start at the counter (small rooms, on device)."
  - `startSpot: vec3 = new vec3(0, 0, 520)`. Hint: "Café-local start spot when no `EntranceSpot` marker exists."
- In `alignFloor()`:
  - `s = arrivalWalkIn ? (EntranceSpot local position ?? startSpot) : vec3.zero()`;
  - target x/z = camera x/z − `s` (rotated by the café root's rotation, which is identity today);
  - y unchanged.
- Expose `startSpotLocal` (readable). Fix the stale "starts the user at the counter" hint text.
- Scene (for the scene agent):
  - An empty marker `Cafe/Room/EntranceSpot` at (0, 0, 520).
  - Optional decor `Cafe/Room/Entrance`: a wooden door frame about 110 × 230 cm with a glass door at (0, 0, 597), a doormat about 90 × 60 cm at (0, 0.5, 560), and a small "NYITVA" plate. Keep the colours mid-to-light (additive display).
  - The door is seen in step 5 when the learner turns around ("that's where I came in").
- Nothing else assumes the start spot: tables, server and tray are read at runtime.

**Why (0, 520):** it is clearly "just came in" (the wall and door are behind, the room ahead). It also gives a calm 3.3 m walk to where the suggestion appears and 1.9 m more to the counter. A spot between the table rows does not read as arriving.

---

## 3. Arrival sequence

### 3.1 Phases (`WbwMain.arrivalPhase`)

| Phase | Starts | Shows / plays | Ends |
|---|---|---|---|
| `setup` | Lens start, after `cafe.build()` | Setup panel at `inView(70, -7)`, as today. **HUD hidden** | `SetupConfirmButton` pinched |
| `walkIn` | Start: `setupComplete = true`, `ToastPop`, setup hides | Nothing new: the café is revealed | `walkedSinceStartCm >= 80` (`toastTrigger = "walk"`), **or** 1.5 s after Start (`"timeout"`) |
| `toast` | Trigger fires | Toast "Café detected (demo)" (exact text; tests check it), 3 s, then a 0.35 s shrink-fade. **Lazy-follows** at `inView(80, 14)` | Fade ends |
| `suggest` | Fade end + 0.3 s | Suggestion panel with a soft `ToastPop`, lazy-follows at `inView(70, -3)`. **Never auto-picks** (unless `suggestAutoPickSec > 0`) | A tile or Later is picked (`UiClick`) |
| `done` | Pick | Panel retires (pressed state shown for 0.25 s first). **HUD shows** with the mode chip and "Saved: 0", then `selectMode()` | — |

**Timeline after Start:**

| Event | Learner walking (about 1 m/s) | Learner standing still |
|---|---|---|
| Toast appears | about 1.0 s | 1.5 s |
| Suggestion appears | about 4.6 s | 5.15 s |

The 1.5 s fallback keeps the helper's existing 3 s toast wait valid.

**Rules:**
- `checkRaisedHand()` also requires `arrivalPhase === "done"`, so a raised hand never opens the mode menu over the suggestion.
- `selectMode()` (from anywhere) hides the suggestion and sets `done`.
- `skipSetup` (iteration aid) jumps straight to `firstMode`, as today.
- If the suggestion @input is not wired yet (scene in flux), fall back to the old automatic `firstMode` start. Mark the input `@allowUndefined` and keep it out of the required-inputs check. Creating the UI at runtime in `start()` (R4's option 2) avoids scene wiring entirely.
- New inputs on `WbwMain`:
  - `arrivalSuggestion: boolean = true` (false = old automatic start);
  - `suggestAutoPickSec: number = 0` (0 = never).
- Audio: SFX only (`ToastPop`, `UiClick`). **No voice clips during arrival**, so voice counts in tests are unaffected.

### 3.2 Lazy follow (toast and suggestion; owned by WbwMain, because UI modules never place themselves)

Each frame while visible:
- goal = `inView(dist, up)`;
- re-target only when the panel is more than **18°** from the gaze, or its horizontal distance leaves **55 to 95 cm**;
- glide `lerp(cur, goal, min(1, dt * 5))` (the skill's "about rate 6") and stop within 2 cm;
- always `faceRotation(pos, camPos())`;
- **freeze while any of its buttons is hovered**, so a target never slides out from under the pointer.

This could be a pure helper `lazyFollowStep(t, goal, dt, maxAngleDeg, minD, maxD)` in `WbwSpatial`. Without it, a world-fixed toast 80 cm ahead is walked through in under a second.

### 3.3 Suggestion panel (`WbwSuggestionUI.ts`, passive view, built with the WbwSharedUI helpers like `WbwModeMenuUI`)

Sized with the skill §6 values at `viewDistanceCm = 70` (card 33 cm, padding 1.6, gaps 1.3, tile gap 1.6, button 3.8):

```
┌───────────────────────────────────────────────┐ SuggestionPanel 33 × 22.4 cm, app-level tone, see-through
│  (pin) Café (demo)                            │ optional context chip SuggestContext (Caption, soft text)
│        What would you like to do here?        │ SuggestTitle  Headline2 (≈2.3 cm line, ≈27.8 cm wide)
│                  ─── ── ─                     │ headerRule
│ ┌──────────┐  ┌──────────┐  ┌──────────┐      │ 3 tiles 8.93 × 6.6 cm (icon 2.6 above the label)
│ │ (school) │  │(extension│  │(local_   │      │ SuggestLearnButton    tone = Learn  (primary outline)
│ │  Learn   │  │ Practice │  │ cafe)    │      │ SuggestPracticeButton tone = Practice
│ │          │  │          │  │Use it live│     │ SuggestLiveButton     tone = Use it live
│ └──────────┘  └──────────┘  └──────────┘      │
│       Suggested here: start with Learn        │ SuggestDescription  Caption, soft text (≤ 40 chars)
│                 [  Later  ]                   │ SuggestLaterButton 12 × 3.8 cm, app tone, not primary
└───────────────────────────────────────────────┘
```

- **Height:** 1.6 + 2.3 (title) + 0.52 (rule) + 1.3 + 6.6 (tiles) + 1.3 + 1.84 (description) + 1.3 + 3.8 (Later) + 1.6 ≈ **22.2 to 22.4 cm**. Add about 2.2 cm if the context chip is used.
- **Fit:** the panel spans ±13.3° × ±9.1°, inside the view. At `inView(70, -3)` the upper part of the view (server, signage) stays visible.
- **Colour (AGREED DESIGN 9):**
  - The panel uses the **app-level tone** that setup, the menu and the toast use (today `TONE_LEARN`; if the builder adds a neutral app tone, use that).
  - Each tile uses `button(..., {tone: toneOf(mode)})`.
  - Text colours come from WbwSharedUI's constants for that tone (the builder is refining the fill and text treatment). **No hex values in the new file.**
  - Learn: soft powder blue (~#B9CEDF); Use it live: soft lavender (~#CBBFE0); Practice: dusty rose (~#D5ADC5).
  - The tile label *is* the mode name, so colour is never the only cue.
  - Panels and buttons are never grey, black or white.
- **Tile order:** Learn, Practice, Use it live (the same as the mode menu). Icons: `school.png`, `extension.png`, `local_cafe.png` (all exist in `Assets/Icons/`).
- **Suggested tile:** Learn while `savedCount < 4`. It gets the `primary` (thicker) outline, and the description says so.
  - This is the "context-aware suggestion" stand-in.
  - Optional: with 4 or more saved words, at a table, suggest Practice; near the counter, suggest Use it live.
- **Description line** (`SuggestDescription`, at most about 40 characters so it fits 30 cm):

  | Hovered | Text |
  |---|---|
  | nothing | "Suggested here: start with Learn" |
  | Learn | "Point at food to see its Hungarian name" |
  | Practice | "Match the words you saved", or with fewer than 4 saved: "Save 4 words first, then match them" |
  | Use it live | "Order at the counter in Hungarian" |
  | Later | "Close; the Menu has every mode" |

- **States** from `styleButton()`: idle, targeted (focus outline), pressed, then retire. The whole tile is the button surface. Gap of 1.6 cm or more between tiles, so the ray can't hit the wrong one.
- **Text names:** don't use the globally searched names (`Message`, `ModeLabel`, `SavedBadge`, `ActiveLabel`, `SavedCount`, `CaptionHu`, `CaptionEn`, `Practice*`, `Bravo`). Tile labels are the scoped `Label` that `button()` creates.
- **API:** `show(savedCount, suggested)`, `hide()`, `setDescription(text)`, `onPick(option)` where option is `"learn" | "practice" | "live" | "later"`, and `onHover(option | "")`.
- **Readable state:** `isVisible`, `hoveredOption`, `descriptionText`.

| Pick | Effect |
|---|---|
| `SuggestLearnButton` | `selectMode("learn")`. Brackets appear as the learner comes within `maxDistanceCm` (300); from the suggestion spot none are in range, so markers "arrive" as they walk up. If no learnable is in range for 3 s: hint "Walk up to the counter. Things you can learn get small markers." |
| `SuggestPracticeButton` | `selectMode("practice")`. With fewer than 4 saved words, the existing need-words board opens in front |
| `SuggestLiveButton` | `selectMode("live")`. The greeting starts when the learner is within `maxTrayDistanceCm` (260) of the tray. Further away: "Walk up to the counter to order" + edge arrow to the server. The phrase helper shows an empty slot: "Kérek … a szendvicsembe." / "Point at an ingredient" |
| `SuggestLaterButton` | Mode stays `"none"`. The HUD shows with Menu; the Menu chip pulses once; hint "Open Menu any time to choose a mode." The suggestion does not come back when the mode later returns to `"none"` (DC5 relies on that) |

### 3.4 Readable state and names (additions)
- `WbwMain`: `arrivalPhase`, `suggestionVisible`, `suggestionPick`, `toastTrigger`, `walkedSinceStartCm`.
- `WbwCafeBuilder`: `startSpotLocal`.
- Names: `SuggestionPanel`, `SuggestTitle`, `SuggestDescription`, `SuggestLearnButton`, `SuggestPracticeButton`, `SuggestLiveButton`, `SuggestLaterButton` (optional `SuggestContext`).

---

## 4. How it runs: Interactive Preview, device, LEAF

### 4.1 Interactive Preview (WASD)
1. Press Play. The café aligns so the preview camera stands at the entrance spot, with the floor 160 cm below the eyes. The setup panel is 70 cm ahead.
2. Click English, Hungarian, **Start** (click = pinch).
3. Hold **W** to walk down the aisle (A/D to sidestep, Q/E down/up, right-drag or Shift to look).
   - After about 80 cm, or 1.5 s if you don't move, the toast appears.
   - The toast and then the suggestion glide along while you walk, and settle when you stop.
4. Move the mouse over a tile: the focus outline appears and the description line explains it. The mouse *is* the pointer; the simulated hand ray (`PointerRay`, R2) comes from the lower right. Click to choose.
5. Walk on to the counter (about 2 m) for Learn or Use it live. The HUD Menu (low left) switches modes at any time.
6. For voice activity in Use it live, turn on the Preview's mic button (bottom left of the Preview panel, R1). Otherwise use **Said it**.

### 4.2 On device (Specs)
- The virtual café is 11 × 8.4 m, so walking in needs about 6 m of clear floor. Otherwise set `arrivalWalkIn = false`: the learner starts at the counter, and the toast and suggestion still run (the 1.5 s fallback fires the toast). This is "feel unproven".
- The toast is the stand-in for real location recognition and is labelled "(demo)".

### 4.3 LEAF: keep DC1 to DC5 green (one helper change, scenario bodies unchanged)

Replace the tail of `WbwTester.completeSetup()` in `WbwLeafHelpers.ts`:

```ts
await this.tap("SetupConfirmButton")
await waitFor(() => this.main.setupComplete, "setupComplete after SetupConfirmButton")
await waitFor(() => !this.main.setupPanel.isVisible, "setup panel hidden")
await waitFor(() => this.toast.isVisible && this.toast.lastMessage === "Café detected (demo)", "toast", 3000) // 1.5 s fallback
await waitFor(() => textOf("Message") === "Café detected (demo)", "toast Message text visible", 3000)
// NEW: the arrival suggestion replaces the automatic Learn start
await waitFor(() => this.main.suggestionVisible && this.hasEnabledInteractable("SuggestLearnButton"), "arrival suggestion panel", 8000)
if (this.main.currentMode !== "none") throw new Error("no mode may start before the learner picks one")
await this.tap("SuggestLearnButton")
await waitFor(() => this.main.currentMode === "learn" && !this.main.suggestionVisible, "Learn picked on the suggestion", 4000)
// NEW: the start spot is now the entrance; tests expect to be at the counter
await this.setHead(this.eyeAt(0, 0), 0, -15)
if (!this.learn.active) throw new Error("WbwLearnController.active is false after picking Learn")
await waitFor(() => this.main.currentModeLabel === "Learn", "mode label Learn", 3000) // robust to the HUD chip text change
log("setup complete → suggestion → Learn")
```

Why each test stays valid:
- **DC1** calls `learnAndSave("olivabogyo")` and later switches to Use it live **without moving the head**. The helper now leaves the head at the counter, so the menu-entry greeting starts at once (orderStep 1).
- **DC2 to DC5** set the head explicitly right after `completeSetup()`.
- `modeSwitches` is sampled after setup.
- The suggestion pick goes through `selectMode()`, so the saved words and HUD behave as before.
- `toastTrigger` is `"timeout"` in DC runs, because the head doesn't move.

**Why not "Learn by default after a timeout"?**
- It contradicts the agreed "deliberate switch" principle and could surprise a viewer.
- It would add the timeout to every DC run.
- It would never exercise the new panel.

It stays available as `suggestAutoPickSec` for a kiosk. Test fallback (only if the panel is not built yet): set `this.main.arrivalSuggestion = false` before tapping Start, and keep the old `currentMode === "learn"` wait.

Optional new scenario **`ARR_Arrival`** (not a brief done criterion, so not numbered DC):
- start pose ≈ `eyeAt(startSpotLocal)` within 5 cm;
- phases `setup → walkIn → toast → suggest`, with `toastTrigger === "timeout"`;
- HUD hidden and mode `none` while the suggestion is up;
- title text and the scoped `Label` texts "Learn", "Practice", "Use it live", "Later";
- hovering each tile (`interactor.hover`) changes `descriptionText`;
- `SuggestLaterButton` → mode `none`, HUD visible, hint mentions Menu; then menu → Learn works.

### 4.4 Layout drift (independent of the arrival)
- **DC5 fails as written:** replace `const seat = t.eyeAt(-145, 385 - 75)` with `const seat = table.add(new vec3(0, 160, -80))`, where `table` is the `Table_8` world position it already reads. That puts the seat 80 cm on the counter side, so the board is nudged to about 65 cm and `placedAt === "table"` holds.
- **DC2 pastry spot** `eyeAt(-170, 40)`:
  - Today the 4 nearest objects in the cone are salata 204 cm, szendvics 212, spenot 214 (yaw 38.0°, on the cone edge) and sonka 222; kenyer is 223.
  - It passes only through szendvics, so it is fragile.
  - Use `eyeAt(-230, 40)`, which keeps the counter items out of the cone.
- Phase C's other DC impacts (the card stays open on Save, Said it after every answer, the step-2 helper) are owned by the Learn/Order notes (R2, R4) and are not repeated here.

---

## 5. Story tour: LEAF scenario `TOUR_Story`

**Files:**
- `Assets/Tests/Leaf/TOUR_Story.ts`, plus helpers in `WbwLeafHelpers.ts` or a new `WbwTourKit.ts`.
- Register it **last** in `LeafIndex` as `{id: "TOUR_Story", typename: TOUR_Story.getTypeName()}`.

It is both a recording script and an end-to-end check. Every wait on audio or flow is state-based. The `pause()` calls exist only for viewing.

**Camera = the learner's head.** `setHead()` disables `DeviceTracking`, then the tour moves the camera transform per frame. "Several perspectives" are head poses with distinct framings, tagged in the beat tables:

| Tag | Framing |
|---|---|
| WIDE | doorway or room |
| WALK | moving point of view |
| MID | counter: helper + ingredient row |
| CLOSE | ingredient row at 1.4 m |
| UP | server at eye level + caption |
| TURN | pan to the seating |
| TABLE | number card at about 4 m |
| SEAT | practice board |
| END | standing wide shot |

Don't use LEAF's `ThirdPersonCamera`: it is a debug picture-in-picture with a backing plate. A true third-person cutaway would break the head-relative UI (HUD, lazy follow).

### 5.1 Helper kit (test-only)

```ts
export let PACE = 1.0                       // 1 = recording; 0.25 = regression (~60 s)
export const GLANCE = 0.6, READ = 1.5, READ_LONG = 2.5, SPEAK = 1.3, SETTLE = 0.4  // seconds × PACE
export async function pause(s: number) { await sleep(Math.max(50, s * PACE * 1000)) }

/** Holds a hover until released (LEAF's enterHover/exitHover are protected). Use a SEPARATE
 *  interactor from t.interactor, so "point at the object" can stay while t.tap() presses a
 *  label button (R2: never trigger on an interactor whose hover is still pending). */
export class WbwPointer extends DefaultLeafInteractor {
  async hold(target: Interactable) { await this.enterHover(target) }
  async release() { await this.exitHover() }
}

export interface Pose { x: number; z: number; h?: number /* eye height, default 160 */;
  yaw?: number; pitch?: number;              // explicit, or…
  look?: string | vec3; dYaw?: number; dPitch?: number }  // …aim at a SceneObject/point plus a framing offset

class Tour {
  yaw = 0; pitch = 0
  pointer = new WbwPointer("WbwTourPointer")
  constructor(readonly t: WbwTester) {}
  beat(id: string, what: string) { log(`beat ${id} — ${what}`) }        // cut markers for editing
  local(x: number, z: number, h = 160) { return this.t.cafeOrigin().add(new vec3(x, h, z)) }
  aim(eye: vec3, look: string | vec3) {                                   // yaw/pitch toward a target
    const p = typeof look === "string" ? findEnabled(look)!.getTransform().getWorldPosition() : look
    const d = p.sub(eye)
    return {yaw: Math.atan2(-d.x, -d.z) / D2R, pitch: Math.atan2(d.y, Math.hypot(d.x, d.z)) / D2R}
  }
  /** Smooth per-frame head move. Yaw is unwrapped: pass `turn: "left"|"right"` to force the turn
   *  direction for ~180° turns (left = yaw increasing). ease "inOut" (smoothstep) | "out" | "linear". */
  async glide(p: Pose, secs: number, ease = "inOut", turn?: "left" | "right") { /* lerp pos, yaw, pitch; nextFrame() loop on getTime() */ }
  async point(name: string, secs: number) { const it = await interactable(name); await this.pointer.hold(it); await pause(secs) }
  async unpoint() { await this.pointer.release() }
  async waitAudioIdle(ms = 9000) { await waitFor(() => !this.t.audio.isBusy(), "audio idle", ms) } // R1 adds isBusy()
  /** After choosing a phrase: the prompt appears → "speak" → Said it → server continues. */
  async sayIt(step: number, realVoiceSecs = 0) {
    await waitFor(() => S.waitingForSpeech() && this.t.hasEnabledInteractable("SaidItButton"), `step ${step} waits for speech`, 12000)
    if (this.t.order.orderStep !== step) throw new Error("showing/choosing a phrase must not advance the order")
    if (realVoiceSecs > 0) { try { await waitFor(() => S.speechDetected(), "voice", realVoiceSecs * 1000) ; return } catch (e) {} }
    await pause(SPEAK)
    await this.t.tap("SaidItButton")
    await waitFor(() => S.speechDetected() || this.t.order.orderStep !== step, "speech accepted")
  }
}
```

Start with `await t.setHead(eye, yaw, pitch)` once. That disables tracking and validates the pose; later glides write the transform directly and track `yaw`/`pitch`.

Keep all Phase C state reads in **one accessor map**, so only one place changes when owners settle:

```ts
const S = {
  hoveredId: () => t.learn.hoveredId, labelForId: () => t.learn.labelForId,
  cardWordId: () => t.learn.cardWordId, cardPlayCount: () => t.learn.cardPlayCount,
  phraseSlotIds: () => t.order.phraseSlotIds, phrasePattern: () => t.order.phrasePattern,
  phraseHu: () => t.order.phraseHu, phraseEn: () => t.order.phraseEn, phraseAudioKey: () => t.order.phraseAudioKey,
  waitingForSpeech: () => t.order.waitingForSpeech, speechDetected: () => t.order.speechDetected,
  suggestionVisible: () => t.main.suggestionVisible, arrivalPhase: () => t.main.arrivalPhase,
}
```

### 5.2 Beats

**How to read the tables:**
- Poses are café-local: eye (x, h, z) → yaw/pitch. Numbers are for today's layout. In code, prefer `look:` + offset, with the target named in the Notes column.
- "Glide n s" = smooth camera move; "Hold" = viewing pause at PACE 1.
- **Point** = `tour.point()` (held hover via `WbwPointer`); **tap** = `t.tap()` (real SIK trigger).
- In the Assert column, `·` separates checks.

**ACT 1: Arrival (≈ 0:00 to 0:17)**

| # | Shot | Pose / motion | Action | Hold | Assert |
|---|---|---|---|---|---|
| A1 | WIDE | (0, 160, 520) → 0 / -4. The aisle, counter and server 6.9 m ahead, mostly hidden behind the setup panel 70 cm away. Wait for the setup panel + 1 s first (the café is still aligning for 2.5 s) | — | 2.5 | `arrivalPhase=="setup"` · mode `none` · HUD hidden · camera ≈ `eyeAt(startSpotLocal)` |
| A2 | WIDE | Same | tap `SetupSpeakEnglish` (+0.6), `SetupLearnHungarian` (+0.6), pause 0.8, tap `SetupConfirmButton` | — | `setupComplete` · setup hidden · `arrivalPhase=="walkIn"` |
| A3 | WALK | Glide 3.6 s to (0, 160, 190), smooth start and stop. Yaw drifts 0 → +5 → -5 → 0; pitch -4 → -5. The panel disappears and the café is "revealed"; tables 4 and 5 slide past the edges | the toast fires during the walk | — | toast "Café detected (demo)" · log `toastTrigger` (expect `walk`; don't fail on `timeout`) |
| A4 | WALK→MID | Stand at (0, 160, 190) → 0 / -5. Counter 3 m, server 3.6 m | wait for `suggestionVisible` (about 1 s after the walk) | 2.5 | `arrivalPhase=="suggest"` · 4 `Suggest*` enabled · mode `none` · HUD hidden · no voice played |
| A5 | MID | Same | point `SuggestLearnButton` 1.0 → `SuggestPracticeButton` 0.8 → `SuggestLiveButton` 0.8; unpoint | 0.3 | `descriptionText` changes per tile · `PointerRay` visible while pointing |
| A6 | MID | Same | tap `SuggestLearnButton` | 1.0 | mode `learn` · `!suggestionVisible` · `suggestionPick=="learn"` · HUD chip "Learn" (`currentModeLabel`) · "Saved: 0" |

**ACT 2: Look around, point, select, save (≈ 0:17 to 0:52)**

| # | Shot | Pose / motion | Action | Hold | Assert |
|---|---|---|---|---|---|
| L1 | WALK→CLOSE | Glide 2.4 s to (0, 160, 0), pitch -5 → -22. Brackets appear when the row comes within 3 m (at about z 170) | — | 1.0 | `bracketedIds` 3 to 4, expected paprika, uborka_friss, paradicsom, uborka · `orderStep==0` |
| L2 | CLOSE | Look along the counter: yaw 0 → +16 (0.9 s), hold 0.3 → -16 (1.4 s), hold 0.3 → -3 (0.7 s); pitch -22 | — | — | brackets stay on their objects (< 30 cm) · at most 4 enabled |
| L3 | CLOSE | (0, 160, 0) → -3 / -24 (cucumber at -4.3 / -28.7, low-centre, room above it for label and card) | point `Learnable_uborka_friss` 1.6 | 0.3 | `hoveredId`/`labelForId=="uborka_friss"` · `NameLabel` texts "uborka" (large) / "cucumber" (small), within about 25 cm of the object · its bracket in focus colour · **`voicePlayCount` and `lastSfxKey` unchanged** · `PointerRay` enabled |
| L4 | CLOSE | Same | silent sweep: point `Learnable_paprika` 0.7 → `Learnable_uborka` 0.8 ("savanyú uborka / pickles": the uborka vs savanyú uborka contrast) → `Learnable_uborka_friss` 0.6 | — | the label follows each · **exactly one enabled `NameLabel`** · voice count unchanged |
| L5 | CLOSE | Same | tap `Learnable_uborka_friss` (select) | 1.5 after audio | card near/above the cucumber · `cardWordId=="uborka_friss"` · `cardPlayCount==1` · `lastVoiceKey=="w_uborka_friss"` · voice +1 · "Playing pronunciation" while busy, then "Ready to listen again" (`WordCardStatus`) · `card.playing==""` |
| L6 | CLOSE | Same | tap `WordCardPlayButton` ("Listen again") → waitAudioIdle | 0.4 | `cardPlayCount==2` · voice +1 |
| L7 | CLOSE | Same | point `WordCardSaveButton` 0.6 (the pointer leaves the object for the card's controls) | — | card still visible, world position unchanged (< 0.5 cm): **steady** |
| L8 | CLOSE | Same | tap `WordCardSaveButton`; unpoint | 1.1 | Save label "Saved ✓" (green) · `savedWords==[uborka_friss]` · HUD "Saved: 1" · **card still open** · `answers==[]`, `orderStep==0` (saving ≠ ordering) |
| L9 | CLOSE | Glide 0.6 s → +11 / -22 (salami +14.7 / -24.4, tomato +12.7 / -28.2 and cheese +7.5 / -24.9 all in view) | point `Learnable_szalami` 0.8 (label "szalámi / salami"; the cucumber card stays steady), tap it → waitAudioIdle → tap `WordCardSaveButton`; unpoint | 0.7 | one enabled `WordCard` · `cardWordId=="szalami"` · `cardPlayCount==1` · saved 2 |
| L10 | CLOSE | Same | the same for `Learnable_paradicsom` ("paradicsom / tomato") | 0.7 | saved 3 |
| L11 | CLOSE | Same | the same for `Learnable_sajt` ("sajt / cheese") | 0.7 | `savedWords==[uborka_friss, szalami, paradicsom, sajt]` · "Saved: 4" · `orderStep==0` |
| L12 | CLOSE | Glide 0.6 s → -3 / -24 | point `Learnable_uborka_friss` (held), **tap `NameLabel`** (selecting the label), waitAudioIdle; unpoint | 0.8 | `cardWordId=="uborka_friss"` · `cardPlayCount==1` · Save shows "Saved ✓" (remembered) |
| L13 | CLOSE | Same | tap `WordCardUseLiveButton` ("Use it live →") | 0.5 | mode `live` · chip "Use it live" (lavender) · card closed |

**ACT 3: Use it live (≈ 0:52 to 2:13)**

| # | Shot | Pose / motion | Action | Hold | Assert |
|---|---|---|---|---|---|
| U1 | MID | Glide 0.8 s → 0 / -27: `PhraseHelper` + ingredient row in view. On the tray the helper is at -31.8° (`frame(["PhraseHelper","Learnable_szalami"])` in code) | — | 2.5 | `PhraseHelper` visible, title "SAY IT AT THE COUNTER" · `phraseSlotIds==[uborka_friss]` · `phrasePattern=="want"` · `phraseHu=="Kérek uborkát a szendvicsembe."` · `phraseEn=="I'd like cucumber in my sandwich."` · `phraseAudioKey=="p_kerek_uborka_friss"` · **`orderStep==0`** (prep; the server waits) · no automatic playback |
| U1b (optional, +3 s) | MID | Same | tap `PhraseHelperListenButton` → waitAudioIdle | 0.4 | `lastVoiceKey=="p_kerek_uborka_friss"` |
| U2 | MID | Glide 0.5 s → +8 / -26 | point `Learnable_szalami` (held) | 1.0 | violet label "szalámi / salami" · `UseThisWordButton` and `AddWordButton` ("+ és") enabled · voice count unchanged |
| U3 | MID | Same | tap `UseThisWordButton`; unpoint | 1.5 | `phraseSlotIds==[szalami]` · `phraseHu=="Kérek szalámit a szendvicsembe."` · `phraseEn=="I'd like salami in my sandwich."` · `phraseAudioKey=="p_kerek_szalami"` · **same `PhraseHelper` object** (uniqueIdentifier unchanged) · no `WordCard` · `orderStep==0` |
| U4 | MID | Same | point `Learnable_paradicsom` 0.8, tap `AddWordButton`; unpoint | 2.3 | `phraseSlotIds==[szalami, paradicsom]` · `phraseHu=="Kérek szalámit és paradicsomot a szendvicsembe."` · `phraseEn=="I'd like salami and tomato in my sandwich."` · `phraseAudioKey=="c_kerek+a_szalami+c_es+a_paradicsom+c_a_szendvicsembe"` |
| U5 | MID | Same | tap `PhraseHelperListenButton` → waitAudioIdle (≈ 5.9 s) | 0.4 | `lastVoiceKey==phraseAudioKey` · **`orderStep==0`** (listening never submits) |
| U5b (optional, +4 s) | MID | Same | tap `PatternWithoutButton`, hold 1.6, tap `PatternWantButton` | — | `phraseHu=="Szalámi és paradicsom nélkül, kérem."` · key `w_szalami+c_es+w_paradicsom+c_nelkul+c_kerem` · back to `want` |
| U6 | UP | Glide 0.9 s → 0 / -2 (server face at 0°, caption at +9.9°) | prep trigger: wait up to 1.5 s for the gaze greeting; if `orderStep` is still 0, tap `ReadyToOrderButton` | — | `orderStep==1` · `lastServerLine=="Jó napot! Mit kér?"` · caption HU/EN · `lastVoiceKey=="s_mit_ker"` |

**Each answer turn** (U7 to U10, U15, U16):
1. Stay UP until the server line ends and the cards are offered (state wait).
2. Glide 0.7 s down to the tray (0 / -28).
3. Point the card 0.4 s, then tap `PhraseCard_<id>`. Its clip plays.
4. `sayIt(step)`. During the SPEAK pause the prompt "Say it out loud" with the mic indicator and `SaidItButton` is in view.
5. Glide 0.7 s back up to 0 / -2 during the server's reply pause.

| # | Shot | Step | Action | Assert |
|---|---|---|---|---|
| U7 | UP→MID | 1 "Jó napot! Mit kér?" | `PhraseCard_szendvicset` ("Egy szendvicset kérek.") → `p_szendvicset_kerek` → Said it | `orderStep` stays 1 until Said it, then 2 · (optional: `PhraseCard_jonapot` first; it plays, then Said it, without advancing) |
| U8 | UP→MID | 2 "Mit kér bele?" | glide down to frame the helper; hold 1.4 (it still reads "Kérek szalámit és paradicsomot a szendvicsembe.", now marked as the answer); `sayIt(2)` | `orderStep==2` · **no step-2 phrase cards** (`offeredPhraseIds` empty; no `PhraseCard_sonka_sajt`, `kerhetek_oliva`, `szalami_sajt`, `csirke_paprika`, `uborka_nelkul`) · `waitingForSpeech` true right after the line (the helper has 1 or more words) · after Said it: `answers` +1, step 3 |
| U9 | UP→MID | 3 "Inni valamit?" | `PhraseCard_tejes_kave` → `p_tejes_kave` → Said it | step 4 |
| U10 | UP→MID | 4 "Itt fogyasztja vagy elvitelre?" | `PhraseCard_itt_eszem` → `p_itt_eszem` → Said it | step 5 |

| # | Shot | Pose / motion | Action | Hold | Assert |
|---|---|---|---|---|---|
| U11 | UP | 0 / -2 | wait for "Hányas asztalnál ül?" and `waitingFor=="table"` | 1.4 | `AttentionChime` · `hint.arrowVisible` · caption contains "Turn around" |
| U12 | TURN | At (0, 0), glide 2.0 s yaw 0 → **+180, turning left** (past the pastry case), pitch -2 → -8. You see the aisle, tables 10/12 at the edges and the entrance door 6 m away | — | 0.6 | the arrow hides once the seating is in view |
| U13 | WALK/TABLE | Glide 2.4 s → **W1 = (-140, 160, 90)**, yaw 180 → 141, pitch -8 → -10. The table-8 card is 4.3 m ahead (yaw 141.1, pitch -10.6); table 2's diner at yaw 116 | — | 0.5 | — |
| U14 | TABLE | 141 / -10 | point `TableNumberButton_8` 0.7, tap; unpoint | 2.0 | popup "8 = nyolc" (`tableCard(8).popupText`) · `lastVoiceKey=="n_8"` · `chosenTable==8` |
| U15 | WALK→MID | Glide 2.8 s back to (0, 160, 0), yaw 141 → 0 (turning right), pitch -10 → -2. Then the answer turn | `PhraseCard_nyolcas_asztal` ("A nyolcas asztalnál ülök.") → `p_nyolcas_asztal` → Said it | — | only `nyolcas_asztal` offered · step 6 |
| U16 | UP→MID→UP | Step 6 "Jó étvágyat!" | `PhraseCard_koszonom` → `p_koszonom` → Said it; glide up to 0 / -2 | 2.0 | `orderStep==7` · `waitingFor=="done"` · hint has "Walk to table 8" and "Practice" · arrow to table 8 |

W1 is 248 cm from the tray, under `maxTrayDistanceCm` (260), so the table phrase lands on the tray with today's code. If the order owner adds "defer the table phrase until the learner is back near the counter", use the closer **W1′ = (-230, 160, 160)**: the card is then 3.2 m away at 146 / -14.

**ACT 4: Seated practice (≈ 2:13 to 2:45)**

| # | Shot | Pose / motion | Action | Hold | Assert |
|---|---|---|---|---|---|
| P1 | WALK | At (0, 0): yaw 0 → +112, turning left (0.8 s). Then, at about 1.2 m/s:<br>• glide to **W2 (-270, 160, 110)**, yaw 112 → 150 (2.3 s, front lane);<br>• glide to **W3 (-270, 160, 345)**, yaw 150 → 125 (1.9 s, through the gap between tables 2 and 4; table 8 is 1.6 m ahead-left);<br>• glide to **W4 (-470, 160, 345)**, yaw 125 → 160 (1.7 s, the aisle between rows) | — | — | the arrow points at table 8 and hides on arrival |
| P2 | SEAT | Glide 1.6 s to **SEAT (-462, 120, 440)** (the empty `ChairL`), yaw 160 → **270, turning left** (facing +X: the table, then the diners at table 10, then the lounge), pitch -8 → -12 | — | 0.6 | — |
| P3 | SEAT | 270 / -12 | tap `MenuButton`, pause 0.5, tap `ModePracticeButton` | 2.3 | mode `practice` · `placedAt=="table"` · `boardTable==8` · board about 65 cm away (needs §7b; 57 cm today, which makes the 38 cm board wider than the view) · "0 / 4 pairs" · `leftIds` sorted == saved sorted |
| P4 | SEAT | Same | tap `PracticeHu_<left[0]>` (+0.4), then `PracticeEn_<another id>` | 1.3 | amber "Try again" · `wrongAttempts==1` · cards clickable again |
| P5 | SEAT | Same | for each id: tap `PracticeHu_<id>` (+0.35), tap `PracticeEn_<id>`, waitAudioIdle, pause 0.3 | — | green + check · `lastVoiceKey=="w_<id>"` · "n / 4 pairs" |
| P6 | SEAT | Same | — | 2.3 | `complete` · "Szuper! All pairs matched." (`Bravo`) |
| P7 | END | Stand up: glide 2.0 s to (-450, 160, 440), yaw 270 → 324 (turning left toward the counter; server at yaw 323.7, 7.6 m), pitch -12 → -3. The café, the diners and the server at the counter | — | 2.0 | end · `restoreHead()` in `finally` |

Fallback for P2 if §7b is not built: stand at **(-405, 160, 360)**, 80 cm on the counter side of table 8, at yaw 180 / pitch -36. The board is then nudged to 65 cm (the DC5 geometry).

### 5.3 Time budget (PACE 1)

| Act | Estimate | Main contributors |
|---|---|---|
| 1 Arrival | ≈ 17 s | 3.6 s walk, about 5 s toast to suggestion, 2.5 s read, tile hovers |
| 2 Learn | ≈ 35 s | 4 words × (point + w_ clip 1.0 to 1.2 s + Save), Listen again, re-open via the label |
| 3 Use it live | ≈ 81 s | server lines 13.3 s total; phrase clips 1.0 to 2.3 s; combined phrase 5.9 s; 6 Said-it pauses; table detour about 15 s |
| 4 Practice | ≈ 32 s | 8.7 s walk + sit; 4 pairs (each w_ clip about 1.1 s); end shot |
| **Total** | **≈ 2:45** | |

The optional beats (U1b, U5b, the `jonapot` greeting) add about 9 s. Keep them out of the 3-minute cut.

Cut candidates if the run goes long:
- hard-cut the walks: `setHead` straight to W3, which saves about 4 s;
- shorten L2;
- drop the L4 sweep to 2 targets;
- shorten SPEAK to 1.0.

At PACE 0.25 the run takes about 60 s, bounded by the audio. It works as an end-to-end smoke test.

### 5.4 Recording notes
- Run from the LEAF panel with the Preview large. **Keep the mouse off the Preview**: a mouse hover steals `onHoverEnter` from LEAF (R2).
- Each beat prints `[WbwLeaf] beat <id> — <what>`, which gives edit points.
- Preview mic **off** for the deterministic take, so Said it is used. For a "real voice" take, pass `realVoiceSecs = 6` to `sayIt()`, turn the Preview mic on (headphones), and speak during the wait. The tour still falls back to Said it.
- `PointerRay` must be driven by Interactable hover events (any interactor), not by the mouse, so the LEAF hovers draw it in the video (R2 §5).

---

## 6. New names and state the tour relies on (from the AGREED DESIGN item 10, plus this note)

- **Interactables:**
  - arrival: `SuggestLearnButton`, `SuggestPracticeButton`, `SuggestLiveButton`, `SuggestLaterButton`;
  - Learn: `NameLabel` (single, current label), `WordCardPlayButton` ("Listen again"), `WordCardSaveButton`, `WordCardUseLiveButton`;
  - Use it live: `UseThisWordButton`, `AddWordButton`, `PhraseHelperListenButton`, `PatternWantButton`, `PatternWithoutButton`, `SaidItButton`, **`ReadyToOrderButton` (new, §7a)**;
  - existing: `PhraseCard_<id>` (steps 1/3/4/5/6), `TableNumberButton_8`, `MenuButton`, `Mode*Button`, `Practice*`.
- **Visible roots:** `SuggestionPanel`, `PhraseHelper`, `NameLabel`, `WordCard`, `PointerRay`.
- **Suggested scoped texts:** `NameLabelHu`/`NameLabelEn`, `WordCardStatus`, `PhraseHelperHu`/`PhraseHelperEn`.
- **State:**
  - `hoveredId`, `labelForId`, `cardWordId`, `cardPlayCount` (plays since this card opened), `savedWords`;
  - `phraseSlotIds`, `phrasePattern`, `phraseHu`, `phraseEn`, `phraseAudioKey`, `waitingForSpeech`, `speechDetected`;
  - `suggestionVisible`, `arrivalPhase`, `toastTrigger`, `suggestionPick`;
  - `audio.isBusy()` (R1).

---

## 7. Dependencies for other Phase C owners

**a. Prep state in Use it live (order owner).** The storyboard has the learner build and reuse the phrase *before* the server talks. Proposal:
- Entering via the card's `WordCardUseLiveButton`:
  - `orderStep = 0`, `waitingFor = "ready"`;
  - the helper is seeded with the card's word;
  - the server is idle.
  - Step 1 starts when the learner either:
    - looks at the server's face for 0.8 s (within 12° of the gaze, within 260 cm of the tray), or
    - taps `ReadyToOrderButton` ("Ready to order", small, on the helper).
  - The gaze trigger is "feel unproven"; the button is the deterministic path.
- Entering via the menu or the suggestion near the counter starts step 1 at once, as today, which keeps DC1/DC3/DC4.
- During steps 1/3/4/5/6 the helper collapses (not interactive) while `PhraseCard_*` lie on the tray. It expands again at step 2 as the answer.

**b. Seated board (practice owner).** In `WbwPracticeController.place()`, clamp the nudge to `[-20, 25]` instead of `[0, 25]`. The board is then about `boardDistanceCm` away even when the learner is closer (seated 57 cm from the table → board 8 cm past the table centre → 65 cm, pitch about -12°). DC5's "under 40 cm off the table centre" still holds.

**c. Label grace (Learn owner, R2).** Keep `NameLabel` for 0.4 to 0.6 s after hover exit, and while the label or its buttons are hovered. The tour holds the object hover with a second interactor, so it does not depend on the exact grace time.

**d. Silence on pointing.** Hover must not play voice or SFX (`voicePlayCount`/`lastSfxKey` checks in L3/L4/U2). An `audio.sfxPlayCount` would make that check exact.

**e. One `SaidItButton` enabled at a time** (`tap` takes the first enabled match).

---

## 8. Risks and open questions
- **The layout is still moving.**
  - Code (arrival, tour) reads `EntranceSpot`, `Table_<n>`, `ServerSpot`, `PhraseTray` and `PhraseHelper` at runtime.
  - The walking waypoints (W1 to W4, SEAT) assume today's tables: the gap between tables 2 and 4, the aisle between rows, and the free `ChairL` at table 8. Re-check them if the seating moves.
- **Wording to confirm with the learner:** "What would you like to do here?", the description lines, "Later" vs "Not now", "Ready to order", "SAY IT AT THE COUNTER".
- **The gaze-to-greet trigger** (§7a) is a design proposal, not in the agreed list. If it is rejected, the tour taps `ReadyToOrderButton` (it already does so as the fallback).
- The table-8 number is readable at about 4.3 m in the Preview (the number is about 1° tall). On glasses the learner would walk closer.
- **The narrow view:** the 38 cm practice board at 65 cm sits right at the ±16° edge; the seated pose keeps it centred.
- **Walking in on device** needs about 6 m of clear floor. `arrivalWalkIn = false` covers small rooms.
