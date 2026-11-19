# R5: Arrival story and the "story tour" walkthrough

Scope: how the demo begins (the learner walks into the café, gets "Café detected (demo)", and is offered Learn / Practice / Use it live), how that fits Interactive Preview and LEAF without breaking DC1 to DC5, and a beat-by-beat LEAF "story tour" that records as a watchable video of the whole agreed experience.

Sources read: `devpost/design-brief.md`, `Assets/Scripts/WbwMain.ts`, `WbwCafeBuilder.ts`, `WbwSetupPanelUI.ts`, `WbwToastUI.ts`, `WbwSpatial.ts`, `WbwSession.ts`, `WbwModeMenuUI.ts`, `WbwHudUI.ts`, `WbwSharedUI.ts`, `WbwLearnController.ts`, `WbwOrderController.ts`, `WbwPracticeController.ts`, `WbwAudioController.ts`, `WbwTableCardUI.ts`, all `Assets/Tests/Leaf/*.ts`, `.virtual-scene.json` (snapshot written 2026-11-19 00:55; the layout is still changing), `Leaf.lspkg` interactor and scenario-manager sources, and sibling notes R1 (voice) and R2 (pointing) for consistent names.

---

## 0. Key decisions (TL;DR)

1. **The learner starts just inside an entrance in the middle of the front wall**, at café-local **(x 0, z 520)**, facing the counter down the centre aisle (6.2 m to the counter front). `WbwCafeBuilder` gets a `startSpot` offset, so the café origin stays at the counter spot. All tests that use `eyeAt()` / `cafeOrigin()` keep working unchanged.
2. **Sequence:** setup panel → *Start* → walk-in → toast "Café detected (demo)" when the learner has walked 80 cm, **or 1.5 s after Start, whichever comes first** → toast for 3 s → **suggestion panel** about 0.4 s after the toast fades → the chosen mode. Nothing starts by itself any more.
3. **Suggestion panel** (`SuggestionPanel`, about **34 × 23 cm at 72 cm**, cobalt app-level panel at 0.8 opacity): heading "What would you like to do here?", **three equal tiles in a row**, each in its own mode colour (Learn cobalt, Practice magenta, Use it live violet), a one-line description that changes when the ray hovers a tile, and a smaller **Later** button. It sits low in view (about 9 cm below the gaze) and **follows lazily** while visible, so walking never goes through it. The HUD stays hidden until a choice is made.
4. **DC1 to DC5:** change only `WbwTester.completeSetup()`. It waits for the suggestion, taps `SuggestLearnButton`, then puts the head at the counter spot `eyeAt(0,0)`. Every scenario body stays as it is. A fallback flag (`showArrivalSuggestion = false`, set before Start) restores the old auto-Learn path if ever needed.
5. **Story tour** = one new LEAF scenario `TOUR_Story` with about 45 beats in 4 acts (arrival, Learn, Use it live, seated Practice). It runs about **2:45 to 2:55** at watch pace (under the 3-minute video limit). A `PACE` constant scales the pauses and camera moves down to about 40 s for a quick regression run. The head poses are listed per beat in §9.
6. **Supporting changes the tour needs** (small, listed in §10): defer the table-5 phrase until the learner is back near the counter, let the seated board sit a little past the table centre, keep the name label visible for about 1 s after hover ends, draw `PointerRay` from Interactable hover events (so LEAF hovers draw it too), and add `audio.isBusy()`.
7. **Layout drift found while reading:** `Table_8` moved from (-145, 385) to **(-405, 440)** in the enlarged café. **DC5 will fail as written:** its seat `eyeAt(-145, 310)` is now 290 cm from table 8, which is more than `nearTableCm` 250, so the board opens "front". The fix is to derive the seat from `Table_8`'s world position (§8.4).

---

## 1. Current state (facts from the files)

- `WbwMain.start()` builds the café, wires the controllers, then shows the setup panel at `inView(70, -7)`. `confirmSetup()` hides it, shows the HUD, shows the toast at `inView(80, 14)` (placed once, not following), and after `toastSeconds + 0.2` calls `selectMode(firstMode)`. The scene serializes `firstMode = "learn"`.
- `WbwCafeBuilder.alignFloor()` puts the café origin **under the camera** (x/z) and 160 cm below the eyes. It keeps doing this for 2.5 s, or until the camera has moved 12 cm. **The café origin = the learner's start spot = the counter spot** today.
- LEAF helpers address everything relative to the café origin: `eyeAt(x, z)` = origin + (x, 160, z), with yaw 0 = looking at the counter (-Z). `completeSetup()` asserts that the toast appears within 3 s of the setup closing, and that **Learn starts automatically within 8 s** (`firstMode`).
- LEAF's `BaseLeafInteractor.hover(target, ms)` is public: enter hover, sleep, exit hover. `tap()` = hover, select, release. The scenario timeout defaults to 600 s (`ScenarioConfig.__leaf__timeout_secs`), so a 3-minute tour fits.
- `WbwAudioController` exposes `lastVoiceKey` and `voicePlayCount`, but no "is playing" flag. An "a+b+c" sequence reports the **full key** as `lastVoiceKey`.

### 1.1 Café layout used here (café-local cm; floor y = 0; origin = counter spot)

From the current `.virtual-scene.json`. The room was enlarged and recentred since HEAD (old room 6 × 7 m, new room **11 × 8.4 m**). **Read these positions at runtime** (`Table_<n>`, `ServerSpot`, `PhraseTray` world positions) instead of hard-coding them in new code.

| Thing | Position (x, y, z) | Notes |
|---|---|---|
| Room shell | x -550 to 550, z -240 to 597, ceiling 303 | Back wall z -243 (behind the counter), front wall z 600 |
| SandwichCounter root | (0, 0, -130) | Front edge about z -100, top 90 cm |
| Ingredients (15 `Learnable_<id>`) | back row y 95.5, z -137.5: sonka -54, szalami -36, sajt -18, csirke 0, husgomboc 18, majonez 36, mustar 54. Front row y 94, z -120: salata -63, spenot -45, paradicsom -27, paprika -9, uborka_friss 9, uborka 27, hagyma 45, olivabogyo 63 | |
| PhraseTray | (0, 95.5, -104), tilted -50° | Phrase cards; the order strip probably lives here too |
| ServerSpot | (0, 0, -172), height 168 | Caption anchor about (0, 186, -172) |
| PastryDisplay | root (-200, 0, -130); kenyer (-301, 100, -130), szendvics (-282, 100, -130) | Moved from x -165 |
| CoffeeArea | root (250, 0, -130); asztal (220, 52, -25) | Moved from x 165 |
| Tables (empty: **4, 8, 12**) | 2 (-405, 240) diner · **4 (-135, 240)** · 5 (135, 240) diner · 7 (405, 240) diner · **8 (-405, 440)** · 10 (-135, 440) two diners · **12 (135, 440)** | Chairs at local x ±50. The number card is at local (0, 81, -22), facing the counter. Table 8 has only `ChairL`, at (-455, 440) |
| Lounge | (370, 0, 470), right back corner | |
| Centre aisle | x -65 to 65, clear from z 597 to the counter | Between the chairs of tables 4/5 and 10/12 |
| Free lane in front of row 1 | z -95 to 195 | |
| Gap between tables 2 and 4 | x -333 to -207 at z 240 | Route to table 8 |

### 1.2 Pose conventions (match `WbwTester.setHead`)

- Position = `eyeAt(x, z)` (eye 160 cm above the café floor). Seated eye height is **120 cm**, which needs a helper `eyeAtH(x, z, h)`.
- **yaw 0** = looking at the counter (-Z). **+90** = left (-X, pastry side, table 8 side). **-90** = right (+X, coffee bar, lounge). **180** = the seating and entrance.
- **pitch** negative = looking down.
- The preview view is narrow, about **±16° horizontally and ±20° vertically** (measured in `agent/cafe-visual-brief.md`). Keep the targets of a beat within about ±12° of the view centre.

Handy angles from the counter spot (0, 160, 0): ingredient row pitch -24° (back) to -29° (front); sonka yaw +21°, sajt +7.5°, paprika +4°, uborka -13°, olivabogyo -28°. Server face yaw 0, pitch -1°. Caption pitch +8.6°. Phrase tray pitch -32° (122 cm away). Table 8 card yaw +136°, 5.9 m away, too far to read, so the tour walks closer.

---

## 2. Where the learner starts

**Entrance:** a door in the middle of the front wall (x 0, z 597). The centre aisle leads straight from the door to the counter and the server, which is the natural "walking in" line. The learner starts **80 cm inside the door at (0, 520), facing the counter (yaw 0)**.

What the learner sees there: the aisle, the green-tiled counter 6.2 m ahead with the server behind it, the chalkboard above (yaw +4.5°), and glimpses of row 1 tables to both sides as they walk. Row 2 tables 10 and 12 are about 1.6 m to the left and right. The pastry case and coffee bar are just outside the narrow view until the learner turns their head.

### 2.1 Implementation (for the code agent; Assets/ is not touched here)

- `WbwCafeBuilder`: add **new** inputs (new inputs pick up their code defaults; renamed or re-used serialized ones would not):
  - `arrivalWalkIn: boolean = true`. Hint: "Start the learner at the entrance (walk-in demo). Off = start at the counter, as in the original brief (small rooms, on device)."
  - `startSpot: vec3 = new vec3(0, 0, 520)`. Hint: "Café-local start spot used when arrivalWalkIn is on (cm)."
  - In `alignFloor()`: `const s = this.arrivalWalkIn ? this.startSpot : vec3.zero()`, then target x/z = `c.x - s.x`, `c.z - s.z`. The café root has no rotation; rotate `s` by the root's world rotation anyway, to be safe. The y line is unchanged.
  - Fix the stale comment on `alignToUserPosition` ("the brief starts the user at the counter").
- Optional decor (scene agent): `Cafe/Room/Entrance` on the front wall at x 0: a wooden door frame about 110 × 230 cm with a glass door, a doormat at (0, 0.5, 560) of about 90 × 60 cm, and a small "NYITVA" plate. It is only seen when the learner turns around (Act 3) and in the final pan, but it makes "I came in through there" readable. Keep the colours mid-to-light (additive display).
- `getTablePosition()` already reads the tables at runtime. Nothing else in the controllers assumes the start spot.

### 2.2 Why not start nearer?

The brief's original start (at the counter) has no arrival. A spot between the table rows, such as (0, 330), has tables beside the learner, which does not read as "just came in". (0, 520) gives a calm 3.4 m walk to the suggestion spot and 5 m more to the counter. The `arrivalWalkIn` toggle keeps the old start available for devices in small rooms.

---

## 3. Arrival sequence and timing

`WbwMain` gets a readable `arrivalPhase`: `"setup" → "walkIn" → "toast" → "suggest" → "done"`.

| Phase | Starts when | What shows / plays | Ends when |
|---|---|---|---|
| `setup` | Lens start (after `cafe.build()`) | Setup panel at `inView(70, -7)`, as now. **HUD hidden.** | Start is pinched (`SetupConfirmButton`) |
| `walkIn` | Start pinched: `setupComplete = true`, `ToastPop`, setup hides | Nothing new; the café is in view | `walkedSinceStartCm >= 80`, **or** 1.5 s have passed (`toastTrigger = "walk"` or `"timeout"`) |
| `toast` | Trigger fires | Toast "Café detected (demo)" (exact text; tests check it), 3 s, shrink-fade 0.35 s. **Lazy-follows** at `inView(80, 14)` | The fade ends |
| `suggest` | Fade end + 0.3 s (about 3.65 s after the toast starts) | Suggestion panel with a soft `ToastPop`, **lazy-follows** at `inView(72, -9)`. Waits for a choice; it never auto-picks | A tile or Later is picked (`UiClick`) |
| `done` | Pick | Panel retires. **HUD shows** (Saved: 0, mode label, tone). The mode is applied through `selectMode()` | — |

Resulting timeline after Start: the toast at about **0.8 s** if the learner walks at about 1 m/s (at most 1.5 s when standing still), and the suggestion at about **4.5 to 5.2 s**.

The 1.5 s fallback keeps the existing helper's 3 s toast wait valid, and the preview works for a viewer who doesn't move.

Other rules:
- `checkRaisedHand()` also requires `arrivalPhase === "done"`, so a raised hand during the suggestion doesn't open the mode menu on top of it.
- `skipSetup` (iteration aid) skips setup, toast and suggestion, and enters `firstMode` (`"learn"` if unset), as today.
- If the `suggestion` @input is not wired (another agent is still editing the scene), fall back to today's behaviour: auto-start `firstMode` after the toast. Mark the input `@allowUndefined` and **leave it out** of the required-inputs check in `onAwake`.
- **New input `showArrivalSuggestion: boolean = true`.** Do not re-use `firstMode`: its serialized value in the scene is `"learn"` and would override a new code default. When the input is false, the old auto-start path runs. Tests can set it before pressing Start (see §8).

### 3.1 Lazy follow (toast and suggestion)

These are owned by `WbwMain`, because the UI modules "must not position themselves". The rule each frame while the panel is visible:
- Goal = `inView(dist, up)`.
- Re-target only when the panel is more than **18°** from the gaze, or its horizontal distance leaves **55 to 95 cm**.
- Glide with `lerp(cur, goal, min(1, dt * 4))`, and stop within 2 cm. Always `faceRotation(pos, camPos())`.
- **Freeze while the ray hovers any of its buttons**, so the target never slides out from under the pointer.

This could be a small pure helper in `WbwSpatial` (`lazyFollowStep(t, goal, dt, maxAngleDeg, minD, maxD)`) that returns whether it moved.

---

## 4. Suggestion panel spec (`WbwSuggestionUI`, passive view)

New file `Assets/Scripts/WbwSuggestionUI.ts`, built like `WbwModeMenuUI` with the shared helpers (`panel`, `flexBox`, `button`, `text`, `headerRule`, `useTone`, tones). Host object `UI/SuggestionRoot`, wired as `WordByWord.suggestion`.

- Events: `onPick(option: "learn" | "practice" | "live" | "later")` and `onHover(option | "")`.
- API: `show(savedCount)`, `hide()`, `setDescription(text)`.
- `isVisible` = root !== null.

### 4.1 Layout (text sized for `viewDistanceCm = 72`, `READ_BOOST` 2)

```
┌──────────────────────────────────────────────┐  SuggestionPanel  34.2 × 23.2 cm, cobalt @ 0.8
│        What would you like to do here?       │  SuggestTitle   Headline2 (≈2.4 cm line, ≈28.6 cm wide)
│                  ─── ── ─                    │  HeaderRule
│  ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │  (book)  │ │ (puzzle) │ │  (cup)   │      │  3 tiles 9.6 × 7.4 cm, gap 1.2, icon 3.0 above label
│  │  Learn   │ │ Practice │ │Use it live│     │  Learn = cobalt (primary outline), Practice = magenta,
│  └──────────┘ └──────────┘ └──────────┘      │  Use it live = violet
│      Suggested here: start with Learn        │  SuggestDescription  Caption, TEXT_SOFT (≈0.73 cm/char)
│                 [ x  Later ]                 │  SuggestLaterButton  10 × 3.8 cm, cobalt, cream outline
└──────────────────────────────────────────────┘
```

- Sizes from the `WbwSharedUI` formulas at 72 cm:
  - inner width = 3 × 9.6 + 2 × 1.2 = 31.2 cm, plus 2 × 1.5 cm padding = **34.2 cm**.
  - height = 3.0 (padding) + 2.39 (title) + 0.72 (rule) + 7.4 (tiles) + 1.89 (description) + 3.8 (Later) + 4 × 1.0 (gaps) = **23.2 cm**.
  - The panel spans about ±13° horizontally and +2° to -16° vertically, inside the ±16° × ±20° view. The upper half of the view (counter, server, signage) stays clear.
- Tile order is **Learn / Practice / Use it live**, the same order as the mode menu (consistent muscle memory, and as in the agreed design). Use the mode menu's icons: `school`, `extension`, `local_cafe`. Button labels: "Learn", "Practice", "Use it live" (Button role, about 0.65 cm per character; "Use it live" ≈ 7.2 cm fits 9.0 cm).
- **Learn is the suggestion:** primary (thicker cream outline), plus the default description text "Suggested here: start with Learn". Colour is never the only signal.
- Description line (at most about 40 characters, so it fits 31 cm):
  - nothing hovered: "Suggested here: start with Learn"
  - Learn: "Point at things and hear their names"
  - Practice: "Match the words you saved (needs 4)", or "Match the words you saved" once 4 or more are saved
  - Use it live: "Order at the counter, in Hungarian"
  - Later: "Close for now; the Menu has all modes"
- States come from `styleButton()`: idle = tone with a cream outline; hover = lighter tone with the thick cyan outline (plus the description change); pressed = lightest; the pick shows pressed for about 0.25 s before the panel retires. Panels and buttons are never grey, black or white. The whole tile is the button surface.
- Placement: `inView(72, -9)` with the lazy follow from §3.1. It is shown when `arrivalPhase` becomes `"suggest"`, at about (0, 180) if the learner walks at a normal pace.

### 4.2 What each option does

| Pick | Effect |
|---|---|
| Learn (`SuggestLearnButton`) | `selectMode("learn")`. Brackets appear once learnables are within `maxDistanceCm` (300); from (0, 180) none are, so they appear as the learner walks up. Optional: if no learnable is within range for 2 s, show `hint.showHint("Walk up to the counter. Things you can learn get small brackets.", 5)` |
| Practice (`SuggestPracticeButton`) | `selectMode("practice")`. With fewer than 4 saved words, the existing `showNeedWords` board opens in front |
| Use it live (`SuggestLiveButton`) | `selectMode("live")`. **Recommended approach gate:** if the learner is more than `maxTrayDistanceCm` (260) from the `PhraseTray`, keep `orderStep = 0`, set `waitingFor = "approach"`, show "Walk up to the counter to order" and the edge arrow to the server, and start step 1 when they are within 260 cm. At the counter it starts at once, so DC1, DC3 and DC4 are unaffected once the helper puts the head at the counter |
| Later (`SuggestLaterButton`) | The mode stays `"none"`, the HUD shows "Mode: —", and the Menu chip pulses once. Hint: "Open Menu any time to choose a mode" (no emoji; the font lacks it) |

### 4.3 Readable state for tests

- `WbwMain`: `arrivalPhase`, `suggestionVisible`, `suggestionPick` ("" / learn / practice / live / later), `toastTrigger` ("walk" / "timeout"), `walkedSinceStartCm`.
- `WbwSuggestionUI`: `isVisible`, `hoveredOption`, `descriptionText`.
- Stable names: `SuggestionPanel`, `SuggestTitle`, `SuggestLearnButton`, `SuggestPracticeButton`, `SuggestLiveButton`, `SuggestLaterButton`, `SuggestDescription`.

---

## 5. Interactive Preview (WASD)

1. Press Play. The café aligns so that the preview camera stands at the entrance spot (floor 160 cm below the eyes). The setup panel is 70 cm ahead.
2. Click English, Hungarian, then **Start**. Clicking = pinch.
3. Hold **W** to walk down the aisle (A/D to sidestep, right-drag or Shift to look, Q/E down/up). After about 80 cm (or 1.5 s without moving) the toast appears. It and the following suggestion glide along if you keep walking, and settle when you stop.
4. Hover a tile: the cyan outline appears and the description line explains it. Click to choose. (The mouse is the pointer here; R2's simulated hand ray from the lower right shows the same ray the hand would cast on device.)
5. Walk on to the counter (about 2.8 m from the suggestion spot) for Learn or Use it live, or turn around to the tables. The HUD Menu (low left) switches modes at any time.

## 6. On device (Specs)

- The virtual café is 11 × 8.4 m. **Walking in needs about 6 m of clear floor** in front of the wearer. Otherwise set `arrivalWalkIn = false`: the learner starts at the counter, and toast and suggestion still run without walking (the 1.5 s fallback fires the toast). This is "feel unproven".
- The raise-hand menu is gated until the suggestion is answered (§3).
- Real location recognition would fire the toast when entering a real café. The walk trigger is the stand-in, and is labelled "(demo)".

---

## 7. LEAF camera notes

- The head is the camera: `setHead()` disables `DeviceTracking` on `Camera Object` and writes the pose. "Several perspectives" in this tour = several head poses (doorway, aisle, counter looking up and down, seating approach, table-8 view, seated).
- LEAF also has a third-person overlay (`ThirdPersonCamera`, Bitmoji avatar), but it is a debug picture-in-picture with a purple backing. Don't use it for the video.
- **Do not jump the head during the first 2.5 s after start** (the café is still aligning). The tour first waits for the setup panel, plus 1 s.
- Smooth motion: add `glideHead()`, which interpolates per frame (smoothstep) on the camera transform, with **unwrapped yaw** so the direction of turn is explicit (0 → 180 turns left, 146 → 0 turns right).
- Seated pose: eye height 120 cm.

---

## 8. Keeping DC1 to DC5 green

### 8.1 Recommended: one helper change (scenario bodies unchanged)

In `WbwLeafHelpers.ts`, change the end of `completeSetup()`:

```ts
await this.tap("SetupConfirmButton")
await waitFor(() => this.main.setupComplete, "setupComplete after SetupConfirmButton")
await waitFor(() => !this.main.setupPanel.isVisible, "setup panel hidden")
await waitFor(() => this.toast.isVisible && this.toast.lastMessage === "Café detected (demo)", "toast", 3000) // 1.5 s fallback
await waitFor(() => textOf("Message") === "Café detected (demo)", "toast Message text visible", 3000)
// NEW: arrival suggestion instead of auto-Learn
await waitFor(() => this.main.suggestionVisible && this.hasEnabledInteractable("SuggestLearnButton"), "arrival suggestion panel", 8000)
if (this.main.currentMode !== "none") throw new Error("no mode may start before the learner picks one")
await this.tap("SuggestLearnButton")
await waitFor(() => this.main.currentMode === "learn" && !this.main.suggestionVisible, "Learn picked on the suggestion panel", 4000)
// NEW: the start spot is now the entrance, so walk the head in to the counter spot
await this.setHead(this.eyeAt(0, 0), 0, -15)
if (!this.learn.active) throw new Error("WbwLearnController.active is false after picking Learn")
await waitFor(() => textOf("ModeLabel") === "Mode: Learn", "HUD ModeLabel 'Mode: Learn'", 3000)
```

Why each scenario stays valid:
- **DC1** does `learnAndSave("olivabogyo")` and later switches to Use it live **without moving the head**. The helper now leaves the head at the counter, so the word card opens there, and the approach gate (if implemented) opens immediately.
- **DC2, DC3, DC4 and DC5** set the head explicitly right after `completeSetup()`.
- `modeSwitches`, the saved words and the HUD labels behave as before: the suggestion pick goes through `selectMode()`.
- The log line in `completeSetup` changes to "setup complete → suggestion → Learn".

### 8.2 Fallback: test flag

Add `completeSetup(opts?: {viaSuggestion?: boolean})`. With `viaSuggestion: false`, set `this.main.showArrivalSuggestion = false` **before** tapping Start; the old `waitFor(currentMode === "learn", 8000)` then holds. Use this only if the suggestion UI is not ready; the default should exercise the real path.

### 8.3 Suggested new assertions (inside `completeSetup` or the tour)

- `toastTrigger` is `"timeout"` in DC tests (the head doesn't move). In the tour it is usually `"walk"`; log it, don't assert it.
- The four `Suggest*Button` are enabled.
- `textOf("SuggestTitle") === "What would you like to do here?"`.
- `hud.isVisible === false` while the suggestion shows.

### 8.4 Layout drift (independent of arrival, but DC5 and DC2 hit it)

- **DC5:** `const seat = t.eyeAt(-145, 385 - 75)` assumes the old `Table_8` (-145, 385). Now: `const table = findEnabled("Table_8")!.getTransform().getWorldPosition(); const seat = table.add(new vec3(0, 160, -75))`, which is 75 cm on the counter side. Otherwise the board opens "front" and `placedAt === "table"` fails.
- **DC2 pastry spot** `eyeAt(-170, 40)`: kenyer is now at yaw 37.6°, against the 38° view cone. It still passes because szendvics and kenyer are among the 4 nearest, but it is fragile. Use `eyeAt(-230, 40)` (kenyer 23°, szendvics 17°, counter items outside the cone).
- DC2's "far" spot `eyeAt(-145, 300)` and DC2/DC4's (0, 0) poses are fine.

---

## 9. Story tour: LEAF scenario `TOUR_Story`

File `Assets/Tests/Leaf/TOUR_Story.ts`. Register it last in `LeafIndex` as `{id: "TOUR_Story", typename: TOUR_Story.getTypeName()}`. It is a recording script and an end-to-end check. **Keep the mouse off the Preview while it runs** (a mouse hover steals `onHoverEnter`, as R2 notes).

### 9.1 Helpers to add (in `WbwLeafHelpers.ts` or the tour file)

```ts
export const PACE = 1.0          // 1 = watchable recording; 0.25 = quick regression run (≈40 s)
const GLANCE = 0.6, READ = 1.5, READ_LONG = 2.5, SETTLE = 0.4   // seconds, scaled by PACE
async function pause(s: number) { await sleep(s * PACE * 1000) }

eyeAtH(x: number, z: number, h: number): vec3                    // seated eye = 120
async glideHead(x, z, yaw, pitch, seconds, h = 160, ease = "smooth") // "smooth" | "out"; unwrapped yaw; per frame
async glidePath(keys: {x, z, yaw, pitch, h?, t}[])               // chained glides (walk + head sway)
async point(name: string, seconds: number)                        // interactor.hover on the named Interactable
async waitAudioIdle(timeoutMs = 8000)                             // waitFor(() => !audio.isBusy())
async sayIt()                                                     // waitFor(order.waitingForSpeech) → pause(1.2) → tap SaidItButton → waitFor(speechDetected)
async answer(phraseId: string)                                    // tap PhraseCard_<id> → waitFor(lastVoiceKey === p_…) → waitAudioIdle → sayIt()
async pickIngredient(id: string, how: "Want" | "Without" | "Clear") // point → tap Learnable_<id> → pause(0.7) → tap Ingredient<how>_<id>
```

Audio-gated waits use state (`audio.isBusy()`, R1 §4) and never fixed sleeps. The `pause()` calls are only for viewing.

### 9.2 Beats

Poses are café-local: (x, eye height, z) → yaw / pitch. "Glide n s" = a smooth camera move. Holds are at PACE 1. In the Assert column, `·` separates checks.

**ACT 1: Arrival (≈ 0:00 to 0:20)**

| # | Beat | Pose and motion | Actions | Hold | Assert |
|---|---|---|---|---|---|
| E0 (optional) | Establishing shot | Cut to (-480, 230, 560) → yaw -35 / pitch -9 (the room from the entrance corner, counter in the distance). Only after the setup panel shows plus 1 s | — | 2.0, then cut to A1 | — |
| A1 | Doorway | (0, 160, 520) → 0 / -5. The aisle, counter and server 6.9 m ahead; the setup panel 70 cm ahead | Wait for the setup panel | READ_LONG | `arrivalPhase=="setup"` · mode `none` · HUD hidden |
| A2 | Choose languages | Same | tap `SetupSpeakEnglish` (+0.6), `SetupLearnHungarian` (+0.6), pause 0.8, tap `SetupConfirmButton` | — | `setupComplete` · setup hidden · `arrivalPhase=="walkIn"` |
| A3 | Walk in | glidePath (0, 520) → (0, 180) in 3.6 s, **ease-out** (a fast start, so 80 cm is reached at about 0.7 s, inside the 1.5 s fallback even though the glide starts about 0.2 s after Start). Yaw 0 → +10 (1.2 s, tables 10/4 and a diner) → -10 (2.4 s, table 12/5, lounge glimpse) → 0. Pitch -5 → -6 | The toast fires during the walk | — | toast "Café detected (demo)" · log `toastTrigger` (expect "walk"; don't fail on "timeout") |
| A4 | Stop and read | (0, 160, 180) → 0 / -6 (counter and server 3.5 m ahead) | Wait for `suggestionVisible` (about 1.5 s after the walk) | READ_LONG | `arrivalPhase=="suggest"` · 4 `Suggest*` enabled · mode `none` · HUD hidden |
| A5 | Ray over the options | Same | point `SuggestLearnButton` 1.3 s → `SuggestPracticeButton` 1.1 s → `SuggestLiveButton` 1.1 s | SETTLE | the description text changes per hover · `pointerVisible` |
| A6 | Choose Learn | Same | tap `SuggestLearnButton` | 1.0 | mode `learn` · `!suggestionVisible` · `suggestionPick=="learn"` · HUD "Mode: Learn" |

**ACT 2: Learn by pointing (≈ 0:20 to 0:58)**

| # | Beat | Pose and motion | Actions | Hold | Assert |
|---|---|---|---|---|---|
| L1 | Walk to the counter | Glide 2.2 s → (0, 160, 10) → 0 / -24 | — | 1.2 | 3 or 4 brackets (expect paradicsom, paprika, uborka_friss, uborka) |
| L2 | Look along the counter | Yaw 0 → +18 (1.0 s), pause 0.5 → -18 (1.6 s), pause 0.5 → +6 (0.8 s); pitch -24 | — | — | the brackets stay on their objects |
| L3 | Point: tomato | +6 / -24 | point `Learnable_paradicsom` 1.6 s | SETTLE | `hoveredId=="paradicsom"` · `labelVisibleFor=="paradicsom"` · `NameLabel_paradicsom` enabled · `PointerRay` enabled |
| L4 | Point: cheese | Same | point `Learnable_sajt` 1.6 s | SETTLE | label "sajt / cheese" above the object |
| L5 | Olives, opened via the label | Glide 0.8 s → -20 / -24 | point `Learnable_olivabogyo` 1.2 s, then tap `NameLabel_olivabogyo` (within the label grace) | READ_LONG | card for olivabogyo · `lastVoiceKey=="w_olivabogyo"` |
| L6 | Listen | Same | tap `WordCardPlayButton` → waitAudioIdle, pause 0.5. Tap `WordCardPlaySentenceButton` → waitAudioIdle | 0.8 | "Playing" shown · `p_kerhetek_oliva` |
| L7 | Save | Same | tap `WordCardSaveButton` | 1.6 | "Saved ✓" then the fly to the HUD · `savedCount==1` |
| L8 | Save 3 more by tapping the object | Per word: glide 0.6 s to sonka +14 / -24, sajt +6 / -24, uborka -8 / -26; point 0.8 s; tap `Learnable_<id>`; pause 1.2; tap `WordCardSaveButton`; pause 1.0 | — | — | `savedCount==4` (olivabogyo, sonka, sajt, uborka, the same set DC5 uses) |
| L8b (optional, +6 s) | Pastry detour | Glide 2 s → (-230, 160, 40) → +12 / -18; point `Learnable_kenyer` 1.5 s; glide 2 s back to (0, 160, 10) | — | — | label "kenyér / bread" |

**ACT 3: Use it live (≈ 0:58 to 2:20)**

| # | Beat | Pose and motion | Actions | Hold | Assert |
|---|---|---|---|---|---|
| U1 | Look up, open the menu | Glide 0.8 s → (0, 160, 0) → 0 / +2 (server face, caption at +8.6°) | tap `MenuButton`, pause 0.8, tap `ModeUseLiveButton` | — | mode `live` · HUD compact chip |
| U2 | Step 1 "Jó napot! Mit kér?" | 0 / +2 while the server speaks; then glide 0.7 s → 0 / -30 (tray) | waitForUserTurn(1); answer("szendvicset"); glide 0.7 s back to 0 / +2 | — | caption HU/EN · `waitingForSpeech` then `speechDetected` · step → 2 |
| U3a | Step 2 "Mit kér bele?" | Wait for the line at 0 / +2, then glide 0.8 s → +10 / -26 (sonka, sajt, paprika in view; the order strip at the bottom) | — | SETTLE | `OrderStrip` visible |
| U3b | Point and choose | +10 / -26 | pickIngredient sonka Want (pause 0.9), sajt Want (0.9), paprika Want (0.9) | — | green checks · `orderWanted==[sonka,sajt,paprika]` |
| U3c | Leave one out | Glide 0.6 s → -5 / -26 | pickIngredient uborka **Without** | 1.2 | lavender crossed marker · `orderWithout==[uborka]` |
| U3d (optional, +4 s) | Undo one | -5 / -26 | pickIngredient hagyma Want, pause 0.8, tap `Learnable_hagyma`, tap `IngredientClear_hagyma` | 0.8 | hagyma not in `orderWanted` |
| U3e | Read the sentence | Glide 0.6 s → 0 / -30 | — | READ_LONG | `builtSentenceHu=="Sonkát, sajtot és paprikát kérek, savanyú uborka nélkül."` (R3 owns the exact grammar) |
| U3f | Listen, then say it | 0 / -30 | tap `OrderListenButton` → waitAudioIdle, pause 0.5; then sayIt() | — | `lastVoiceKey` starts with `a_sonka` and contains `c_nelkul` · step → 3 |
| U4 | Step 3 "Inni valamit?" | Up 0 / +2 for the line, down 0 / -30 | answer("tejes_kave") | — | step → 4 |
| U5 | Step 4 "Itt fogyasztja vagy elvitelre?" | Up, then down | answer("itt_eszem") | — | step → 5 |
| U6 | Step 5 cue | 0 / +2 | wait for "Hányas asztalnál ül?" and `waitingFor=="table"` | 1.8 | chime · `hint.arrowVisible` · caption "Turn around" |
| U7 | Turn around | Glide 2.0 s, yaw 0 → **+180** (turning left past the pastry case), pitch -5 | — | 1.0 | arrow hides once the seating is in view |
| U8 | Look for a free table | Glide 2.6 s → W1 (-230, 160, 160), yaw 180 → 108 (table 2: diner, plain "2" card, 2.0 m). Then pan 1.2 s → yaw 146 / -13 (table 8 card at 3.2 m, readable) | — | 1.2, then 0.6 | — |
| U9 | Table 8 | yaw 146 / -13 | point `TableNumberButton_8` 0.9 s, then tap | READ_LONG | popup "8 = nyolc" · `lastVoiceKey=="n_8"` · `chosenTable==8` |
| U10 | Back to the counter | Glide 3.0 s W1 → (0, 160, 0), yaw 146 → 0 (turning right), pitch -13 → +2. Then down to 0 / -30 | waitForUserTurn(5); only `nyolcas_asztal` is offered; answer("nyolcas_asztal") | — | offered `["nyolcas_asztal"]` · step → 6 |
| U11 | Step 6 "Jó étvágyat!" | Up, then down | answer("koszonom"); wait for `orderStep==7` and `waitingFor=="done"`. Glide 0.7 s → 0 / 0 | READ_LONG | hint "Walk to table 8 … Practice" |

> Fallback for U8 to U10 if the table-phrase deferral (§10.1) is not built: use **W1′ = (-140, 160, 90)** (tray 248 cm away, under 260) with yaw 116 for table 2 and **141 / -11 for table 8** (card at 4.2 m). The phrase then lands on the tray as today.

**ACT 4: Seated practice (≈ 2:20 to 2:50)**

| # | Beat | Pose and motion | Actions | Hold | Assert |
|---|---|---|---|---|---|
| P1 | Walk to table 8 | At (0, 0): yaw 0 → +140 (0.9 s). Glide 2.6 s → W2 (-280, 160, 150), through the front lane. Glide 1.9 s → W3 (-330, 160, 360), through the gap between tables 2 and 4 (yaw ≈ 137) | (the arrow points at table 8 and hides on arrival) | — | — |
| P2 | Sit down | Glide 1.6 s → SEAT `eyeAtH(-460, 440, 120)` (the empty `ChairL`), yaw 137 → **270** (= -90, facing the table and the café), pitch -10 → -13 | — | 0.8 | — |
| P3 | Choose Practice | -90 / -13 | tap `MenuButton`, pause 0.6, tap `ModePracticeButton` | READ_LONG | `placedAt=="table"` · `boardTable==8` · board about 66 cm away (with §10.2) · "0 / 4 pairs" |
| P4 | One wrong try | Same | tap `PracticeHu_<left[0]>` (+0.5), then `PracticeEn_<wrong>` | 1.6 | amber "Try again" · `wrongAttempts==1` · cards clickable again |
| P5 | Four pairs | Same | per id: tap `PracticeHu_<id>` (+0.5), tap `PracticeEn_<id>`, waitAudioIdle, pause 0.5 | — | green and checkmark · `w_<id>` plays · "n / 4 pairs" |
| P6 | Done | Same, then a final glide 2.0 s to -80 / -3 (across tables 10 and 12 to the lounge and windows) | — | 3.0, then 2.0 | "Szuper! All pairs matched." · completion state · end with `restoreHead()` |

Time budget at PACE 1: Act 1 ≈ 18 s (+2 s for E0), Act 2 ≈ 38 s, Act 3 ≈ 82 s, Act 4 ≈ 30 s, so **≈ 2:48**. The server and phrase clips set part of this. Drop the optional beats (E0, L8b, U3d) to stay safely under 3:00.

### 9.3 Recording notes

- Run from the LEAF panel in the Preview with the Preview window large. Record the screen; the tour prints `[WbwLeaf] beat <id>` at each beat, so cuts are easy to find.
- Keep the Preview mic toggle **off**, so `SaidItButton` is the deterministic path (R1: LEAF cannot inject mic audio). For a "real voice" take, run the tour with `sayIt()` waiting up to 6 s for `speechDetected` before tapping Said it, and speak during the pause.
- Every assertion is state-based and lenient on layout, so the tour also works as an end-to-end smoke test at `PACE = 0.25`.

---

## 10. Supporting changes the tour relies on (for the implementing agents)

1. **Table phrase after returning** (`WbwOrderController.offerTablePhrase`): if the learner is more than `maxTrayDistanceCm` from the tray when the table is chosen, don't float the card toward the tables. Keep the arrow on the server, poll in `tick`, and lay the card on the tray once they are within range. DC4 taps the table from (0, 0), within range, so it is unaffected.
2. **Seated board distance** (`WbwPracticeController.place`): allow the nudge to go negative, so a learner closer than `boardDistanceCm` gets the board up to 15 cm past the table centre. Seated at (-460, 440), the board moves from 57 cm (37°, wider than the 32° view) to 66 cm (about 32°, just inside). DC5's check of "under 40 cm off the table centre" still holds.
3. **Name label grace:** keep the label for about 1.0 s after hover exit, and keep it while the label itself is hovered, so "point, then select the label" works with the mouse and with LEAF (R2's grace).
4. **PointerRay is driven by Interactable hover events** (any interactor), not by the mouse, so LEAF hovers draw it in the recording (R2 §6).
5. **`audio.isBusy()`** (R1): true while a voice clip, a sequence or an SFX plays, or while a finish callback is pending. The tour waits on it.
6. **Approach gate for Use it live** (§4.2), **arrival gating of the raise-hand menu** (§3), and **HUD hidden during the suggestion** (§3).

## 11. Risks and open questions

- **The layout is still moving.** All new code and the tour read the table, server and tray positions at runtime. The tour's fixed waypoints (W1 to W3, SEAT) assume the current tables, so re-check them if the seating moves again (the gap between tables 2 and 4 and the free `ChairL` at table 8).
- **The narrow view** makes the table-8 number unreadable from the counter (5.9 m). The tour walks to about 3 m. On device, the learner would do the same.
- **Toast during walking:** with the lazy follow it stays readable. Without it, a learner walking at 1 m/s passes through an 80 cm, world-fixed toast in under a second.
- **Wording to confirm with the learner:** the heading "What would you like to do here?", the description lines, and "Later" versus "Not now".
- Should the suggestion **re-appear** if "Later" was chosen and the learner later walks up to the counter? Not proposed for the demo; keep it simple.
