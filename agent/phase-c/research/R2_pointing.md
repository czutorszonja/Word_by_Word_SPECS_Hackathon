# R2 — Point to reveal (SIK 0.18.0 · LEAF · Lens Studio 5.23)

Rewritten for the **agreed Phase C design** (hover = silent label close beside the object; select = card + one
playback; steady card; no ray band in the preview). It replaces the earlier R2 draft at this path, which assumed a
visible custom ray from a simulated hand and a label "just above" the object. Those two ideas are dropped.

Sources read: SIK `Cache/TypeScript/Src/Packages/SpectaclesInteractionKit.lspkg` (`VersionNumber.ts` = 0.18.0),
Leaf `Cache/TypeScript/Src/Packages/Leaf.lspkg`, UIKit `SpectaclesUIKit.lspkg/Scripts/Components/Element.ts`,
`Scripts/BackPlate.ts`, `Support/StudioLib.d.ts`, `Assets/Scripts/WbwCafeBuilder.ts`, `WbwLearnController.ts`,
`WbwWordCardUI.ts`, `WbwSharedUI.ts`, `WbwGeo.ts`, `WbwSpatial.ts`, `WbwMain.ts`, `WbwVocab.ts`,
`Assets/Tests/Leaf/WbwLeafHelpers.ts`, `DC2_Learn.ts`, `Assets/Scene.scene`, `.virtual-scene.json`, skills
`specs-interaction-recipes`, `specs-preview-interaction`, `realistic-lens-scenes` §6.
Paths are relative to `SpectaclesInteractionKit.lspkg/` (SIK), `Leaf.lspkg/` (Leaf) or `SpectaclesUIKit.lspkg/`
(UIKit) unless they start with `Assets/` or `Support/`.

---

## 1. TL;DR: recommended implementation

1. **Hover source = `Interactable.onHoverEnter` / `onHoverExit` on each learnable.** The Specs hand ray, the
   preview mouse (hover without a click) and LEAF's synthetic interactor all arrive through these events. Do not
   poll the mouse.
2. **A small hover arbiter decides what the label shows.** Show at once on the first hover. Switch to a new
   object only after it has been hovered continuously for about 0.12 s. Hide only after an exit grace of about
   0.5 s with nothing hovered and the label itself not hovered. Never show or hide synchronously inside
   `onHoverExit`. This removes the flicker at the gaps between pans and the back-and-forth between the two
   counter rows. Hover never touches audio.
3. **Use one reused `NameLabel` object** (UIKit Button plus two Texts). On each switch, update its text and size,
   so it is never destroyed and rebuilt. Parent it under a neutral root, **never under `Learnable_<id>`**. SIK
   bubbles events to ancestor Interactables.
4. **Place the label from the object's world AABB** (`RenderMeshVisual.worldAabbMin/Max`) using four candidate
   spots: right, left, upper-right corner and upper-left corner. Score each spot in gaze angles and pick the best:
   never cover the hovered object, avoid covering other learnables and the open card, stay inside ±16°/±19°. Then
   pull the label about 10 cm toward the eye along the sight line. World-lock it, and re-place it only when it
   switches or the head moves a lot.
5. **Connector and bracket:** draw the connector as one thin unlit `WbwGeo.box` stretched from the object's
   silhouette edge to the nearest point of the label. Draw the bracket by tinting the object's existing `Brackets`
   with the focus colour (current `refreshTint`). Geometry from `WbwGeo` has no collider.
6. **The card stays steady.** Place it once at select time. Hover handlers never call the card. It closes only
   when its close button is pressed, when another learnable is selected (Target phase only) or when the user
   walks more than 1.5 m away. Save no longer flies the card away. Suppress the hover label for the word that is
   on the card.
7. **The diagonal band in the preview:** SIK's `InteractorRayVisual` for the Mouse draws it, but only when the
   hovered target uses `TargetingVisual.Ray`. Any custom ray from a "hand" at the lower right would look the same.
   To hide **only the visual**:
   - set `learnable.interactable.targetingVisual = isEditor() ? TargetingVisual.None : TargetingVisual.Ray`;
   - as a guard, disable the Mouse's `InteractorRayVisual` component in the editor;
   - do not draw any `PointerRay` in the editor.

   Targeting is untouched by all three.
8. **LEAF can hover without selecting.** `DefaultLeafInteractor.hover(target, ms)` is public and fires only
   HoverEnter, then HoverExit. Start it without `await`, assert `labelForId` and an unchanged `voicePlayCount`
   while it is held, then `await` it. `trigger()` (= `WbwTester.tap`) is hover → select → release, so tapping a
   learnable shows the label for a frame and then opens the card with one playback.

---

## 2. Which Interactable is hovered: SIK APIs

### 2.1 Per object (what to subscribe to)
`Components/Interaction/Interactable/Interactable.ts`
| API | Line | Meaning |
|---|---|---|
| `onHoverEnter` | :87 | The object becomes hovered (first interactor only) |
| `onInteractorHoverEnter` | :92 | Every interactor that starts hovering (`e.interactor.inputType`) |
| `onHoverUpdate` | :97 | Every frame while hovered |
| `onHoverExit` | :102 | The last interactor stops hovering |
| `onInteractorHoverExit` | :107 | Per interactor (LEAF waits on this one) |
| `onTriggerStart` / `onTriggerEnd` / `onTriggerEndOutside` / `onTriggerCanceled` | :112 / :127 / :132 / :147 | Pinch or click. `onTriggerEnd` = released while still on the object = "select" |
| `hoveringInteractor` getter | :625 | Bitflags of `InteractorInputType`. `!== None` means hovered now (good for polling one object) |
| `targetingMode` | :257 | Default 3 = Direct\|Indirect |
| `targetingPriority` | :264 | `TargetingPriority {Normal=0, High=1}` (:27-30). Sorts **before** distance |
| `targetingVisual` | :281 | `TargetingVisual {None=0, Cursor=1, Ray=2}` (:16-20). Default Cursor. Use the enum: the doc comment at :266-270 has stale numbers |
| `colliders` | :221 | Filled by InteractionManager on registration |

Aggregation (`InteractableEventHandler.ts:92-117`): `onHoverEnter` fires only when the bitflag leaves `None`, and
`onHoverExit` only when it returns to `None`. The bit is per **input type**. Both LEAF `DefaultLeafInteractor`s
are `CustomController`, so two LEAF interactors on the **same** object share one bit.

Event payload `InteractorEvent` (`Core/Interactor/InteractorEvent.ts:35-66`):
`{interactor, target, interactable, propagationPhase: "TrickleDown"|"Target"|"BubbleUp", endedInsideInteractable?, stopPropagation()}`.

### 2.2 Propagation: why labels and cards must not be children of a learnable
`Core/InteractionManager/EventDispatcher.ts:26-60`: each event trickles down through all ancestor Interactables,
hits the target, then **bubbles up to every ancestor Interactable** (:57-59, :109-123). UIKit `Element` ignores
non-Target phases (`Element.ts:780-814`). `WbwLearnController` does **not** filter
(`Assets/Scripts/WbwLearnController.ts:121-123`). If the `NameLabel` or the card were under `Learnable_<id>`:
- pressing a label or card button would also fire the learnable's `onTriggerEnd`, so `select()` would run again,
  rebuild the card and replay the audio;
- moving from the object onto its child label would give HoverExit(object) and then a trickle-down HoverEnter
  back on the object in the same frame.

Rule: keep the label and connector under a neutral `PointingUI` root (world scale 1). Also add
`if (e.propagationPhase !== "Target") return` to the learnable handlers as a guard.

### 2.3 Per pointer (interactor side)
`Core/Interactor/Interactor.ts` interface (:61-164):
- `inputType` :64 (`InteractorInputType` :8-18: LeftHand 1, RightHand 2, Mobile 4, BtController 8,
  CustomController 16, Mouse 32);
- `currentInteractable` :66, `onCurrentInteractableChanged` :70 (event at `Core/Interactor/BaseInteractor.ts:166`,
  fired from `currentInteractableChanged` :721-726);
- `startPoint` :91, `direction` :99, `targetHitPosition` :105, `targetHitInfo` :107;
- `hoveredInteractables` :120, `isHoveringInteractable` :161, `isTargeting()` :143, `isActive()` :145.

Hit point per interactor:
| Interactor | `targetHitPosition` | Where |
|---|---|---|
| HandInteractor (device) | indirect provider hit | `Core/HandInteractor/HandInteractor.ts:395-397`. Ray from `IndirectTargetProvider` (:323-332) |
| MouseInteractor (editor only) | `MouseTargetProvider` hit | `Core/MouseInteractor/MouseInteractor.ts:133-135`. Deregisters itself on device (:103-110) |
| LEAF `DefaultSikInteractor` | **object centre** (forced) | Leaf `Interactors/interactor/BaseLeafInteractor.ts:437-439` |

So **place labels from the object's bounds, not from the hit point**. That gives identical placement for the hand,
the mouse and LEAF.

### 2.4 InteractionManager (global)
`Core/InteractionManager/InteractionManager.ts`
- `InteractionManager.getInstance()`, `getInteractorsByType(InteractorInputType.Mouse)` :97,
  `getTargetingInteractors()` :112, `getInteractableByCollider` :305, `getInteractableBySceneObject` :326.
- Per frame: `update()` :407 → `updateInteractors()` :499-549. That calls `interactor.updateState()` and flushes
  disabled Interactables at :504-507. Then `processEvents` :415-497 → `processHoverEvents` :551-581. On a
  target change it sends HoverExit to the previous target, then HoverEnter to the new one, **in the same frame**.
  Otherwise it sends HoverUpdate.
- It runs inside SIK's UpdateDispatcher `UpdateEvent` (`Utils/UpdateDispatcher.ts:138-142`). The order relative
  to our own UpdateEvent is not guaranteed, so **evaluate the arbiter in a `LateUpdateEvent`**
  (`Support/StudioLib.d.ts:14562`).
- Physics ray casts resolve after script Update and before LateUpdate (`Support/StudioLib.d.ts:22001-22005`).
- **Trigger lock:** while pinching or clicking, the target is frozen. Mouse: `shouldPreventTargetUpdate`
  (`MouseInteractor.ts:95-97`). Hand: `preventTargetUpdate` (`HandInteractor.ts:327-329`, :1363). Releasing over
  a different object yields `TriggerEndOutside` on the original (`InteractionManager.ts:624-641`). A drag-release
  therefore never "selects" the object under the release point. Good for the steady card.

### 2.5 How the mouse hovers without a click (preview)
- `TouchRayProvider` binds `HoverEvent` (`Core/Interactor/TouchRayProvider.ts:19`, :69-71). `HoverEvent` exists
  only in the Preview panel (`Support/StudioLib.d.ts:14977`).
- Every frame it rebuilds the world ray from the **stored** cursor position (:21-36). `reset()` is a no-op (:55),
  so after the mouse leaves the panel the last cursor point stays "aimed". Turning the head with WASD or
  right-drag then sweeps that stale ray across objects. That is harmless for users, but **it can block LEAF**
  (see §8.5).
- The mouse picks the nearest Interactable hit with `rayCastAll` (`Core/Interactor/MouseTargetProvider.ts:114-140`).
  `updateTargetedItem` (:172-191) has **no hysteresis**. The hand provider behaves the same
  (`IndirectTargetProvider.ts:96-125`, :160-...).
- Hits outside the camera FoV are ignored (`Providers/TargetProvider/TargetProvider.ts:132`,
  `Providers/CameraProvider/BaseWorldCameraProvider.ts:92-96`). The nearest hit wins after `targetingPriority`
  (:173-198). Colliders **without** an Interactable (BackPlates, the café) never block targeting (:136-138).
- Scene settings: `MouseInteractor` has `mouseTargetingMode: 2` (Indirect) and `_drawDebug: false`
  (`Assets/Scene.scene` ~:5797-5815). `InteractorCursors` carries `CursorController` with `drawDebug: false`
  (~:9319, :13695).

---

## 3. How the learnables get an Interactable and a collider today

- `WbwCafeBuilder.collectLearnables` (`Assets/Scripts/WbwCafeBuilder.ts:113-120`) matches `^Learnable_(\w+)$`
  under SandwichCounter, PastryDisplay and CoffeeArea.
- `makeInteractive` (:123-135) does this:
  - creates a **box `ColliderComponent` first**: `Shape.createBoxShape()`, size = mesh AABB + 2 × 1.5 cm,
    minimum 4 cm, `fitVisual=false`;
  - then calls `createComponent(Interactable.getTypeName())`. Its `onAwake` runs inline and registers it
    (`Interactable.ts:477-487` → `InteractionManager.registerInteractable` :214-234);
  - `Learnable.size` = the padded box size.
- `findOrCreateColliderForInteractable` (`InteractionManager.ts:723-737`) collects colliders from **all
  descendants**, stopping only at child Interactables (:751-778). If no collider exists yet, it logs an error and
  creates a temporary one. Never give a learnable's children colliders of their own.
- `meshSize` (:137-151) walks `RenderMeshVisual.worldAabbMin()/worldAabbMax()` (`Support/StudioLib.d.ts:3593/3599`).
- Café layout (from `.virtual-scene.json`; all learnables have rotation 0 and scale 1; `Cafe` root is at y −160,
  the user's eye is at café y 160):
  - **back row** (local z −7.5, wrapper y 95.5): sonka −54, szalami −36, sajt −18, csirke 0, husgomboc 18,
    majonez 36, mustar 54;
  - **front row** (z +10, y 94): salata −63, spenot −45, paradicsom −27, paprika −9, uborka_friss 9, uborka 27,
    hagyma 45, olivabogyo 63.
  - The rows are staggered by 9 cm. Each `Visual` sits 6.5 cm below its wrapper, so the pans are about 13 cm tall
    and sunk into the counter.
  - From the start spot the front row is about 29° below the eye and the back row about 25°. Neighbours are about
    8.6° apart. The counter is a **dense two-row grid** in view, wider than ±16°.
- Ids: **`uborka_friss` = "uborka"/cucumber, `uborka` = "savanyú uborka"/pickles** (`Assets/Scripts/WbwVocab.ts:52`,
  :54). Use `Learnable_uborka_friss` in cucumber tests.
- `WbwLearnController.init` (:111-131) subscribes `onTriggerEnd → select` and
  `onHoverEnter/Exit → tr.hovered + refreshTint` (:121-123). `select()` returns early unless Learn is active
  (:164), opens the card and calls `speak` (:203). Hover only tints and enables the object's `Brackets` (:271).
  There is **no label yet**, and no audio on hover (already correct).
- `WbwMain.start` calls `cafe.build()` and then `learn.init(...)` in OnStart (`Assets/Scripts/WbwMain.ts:90-92`).
  That satisfies the skill rule "subscribe SIK events in OnStart".
- To switch a learnable off between modes, disable its **Interactable component**. Its `OnDisable` turns its
  colliders off (`Interactable.ts:479-484`, :650-663). Do not disable the SceneObject, which would hide the mesh.

---

## 4. Hover arbiter: no flicker, one label, no audio

**Where flicker comes from**
- (a) Gaps between pans (about 4 cm) give 1–3 frames of "nothing hovered".
- (b) Jitter at the visual boundary between a front-row pan and the back-row pan above it makes the target
  toggle between the two.
- (c) Moving from the object onto its own label is an exit followed by an enter.
- (d) Rebuilding UIKit UI on each switch shows BackPlate grey for a frame. `tintPanelWhenReady` re-applies the
  tint for several frames (`Assets/Scripts/WbwSharedUI.ts` ~:200; the builder is editing this file now, so its
  line numbers drift).

**Fix: event-fed set plus a time-based arbiter in LateUpdate**
```ts
// readable state
hoveredId = ""      // raw: newest learnable still hovered by any interactor ("" = none)
labelForId = ""     // what NameLabel shows ("" = hidden)
private hoverStack: string[] = []
private labelHovered = false
private candId = ""; private candSince = 0; private lostAt = -1
readonly SWITCH_DWELL = 0.12   // s (hand ray: 0.15)
readonly EXIT_GRACE = 0.5      // s; also the window to move onto / tap the label

// per learnable (in init, after the Interactable exists)
it.onHoverEnter.add((e) => { if (e.propagationPhase !== "Target") return
  this.hoverStack = this.hoverStack.filter((x) => x !== id); this.hoverStack.push(id); this.hoveredId = id })
it.onHoverExit.add((e) => { if (e.propagationPhase !== "Target") return
  this.hoverStack = this.hoverStack.filter((x) => x !== id)
  this.hoveredId = this.hoverStack.length ? this.hoverStack[this.hoverStack.length - 1] : "" })
// NameLabel: raw SIK Interactable events (NOT UIKit's Target-filtered ones), so hovering a child
// button such as UseThisWordButton also counts as "on the label"
labelIt.onHoverEnter.add(() => (this.labelHovered = true))
labelIt.onHoverExit.add(() => (this.labelHovered = false))

// LateUpdateEvent
const now = getTime()
let want = this.hoveredId
if (want && this.cardOpen && want === this.cardWordId) want = ""      // the card already shows that word
if (this.mode !== "learn" && this.mode !== "live") want = ""         // Practice / none: no labels
if (want && want !== this.labelForId) {
  if (this.candId !== want) { this.candId = want; this.candSince = now }
  const dwell = this.labelForId === "" ? 0 : this.SWITCH_DWELL      // first show: immediately
  if (!this.labelHovered && now - this.candSince >= dwell) this.showLabel(want)   // text + place, no audio
} else this.candId = ""
if (!want && this.labelForId && !this.labelHovered) {
  if (this.lostAt < 0) this.lostAt = now
  if (now - this.lostAt >= this.EXIT_GRACE) this.hideLabel()
} else this.lostAt = -1
```
- **Only one label:** a single `NameLabel` object. `showLabel` only rewrites its texts (`NameLabelHu`,
  `NameLabelEn`), resizes it (UIKit `Element.size` setter at `Element.ts:604`; `BackPlate.size` at
  `BackPlate.ts:210`) and re-places it.
- **No audio, no SFX on hover:** the arbiter and `showLabel` never call `audio.*`. UIKit plays no hover sound, and
  its click sounds are off by default (`_playAudio = false`, `Element.ts:72`, :867-871).
- **Brackets:** keep the current `refreshTint` (:266-273). Hovering tints the object's `Brackets` with the focus
  colour, scales them to 1.08 and enables them even when the object is not among the 3–4 nearest. DC2 counts
  enabled bracket sets (`Assets/Tests/Leaf/DC2_Learn.ts:39-44`), so take that count while nothing is hovered.
- **Optional spatial hysteresis** (only if the device still toggles): while an object is hovered, grow its box
  collider by about 2 cm (`shape.size = …; col.shape = shape`) and restore it on exit. The time dwell is usually
  enough.
- **Mode routing:** use the same arbiter in both modes.
  - **Learn:** cyan or Learn-tone label; selecting the object or the label opens the card.
  - **Use it live:** violet label with a child `UseThisWordButton`. It updates the phrase slot and never submits.
    Pinching the object in live mode should do the same as "Use this word", or nothing; never open the Learn
    card.
  - `select()` currently ignores non-Learn modes (:164), so live needs its own branch.

---

## 5. Placing the label close beside the object, inside the narrow view

**Bounds.** Re-use `meshSize`'s walk, but keep the centre and skip our own decoration children:
```ts
function meshBox(l: Learnable): {c: vec3; h: vec3} {
  let mn = new vec3(1e9, 1e9, 1e9), mx = new vec3(-1e9, -1e9, -1e9), any = false
  const walk = (s: SceneObject) => {
    if (s.name === "Brackets") return                       // bracket boxes are children of the learnable
    const r = s.getComponent("Component.RenderMeshVisual") as RenderMeshVisual
    if (r && r.enabled) { mn = vec3.min(mn, r.worldAabbMin()); mx = vec3.max(mx, r.worldAabbMax()); any = true }
    for (let i = 0; i < s.getChildrenCount(); i++) walk(s.getChild(i))
  }
  walk(l.so)
  if (!any) return {c: l.so.getTransform().getWorldPosition(), h: l.size.uniformScale(0.5)}  // padded collider box
  return {c: mn.add(mx).uniformScale(0.5), h: mx.sub(mn).uniformScale(0.5)}
}
```
- Compute the box on each `showLabel`, not once at init. `WbwCafeBuilder.alignFloor` keeps moving the café for up
  to 2.5 s after start (`WbwCafeBuilder.ts:69-83`).
- The collider box (wrapper position ± `l.size/2`) is a fine fallback. Objects are unrotated, and the wrapper
  sits at the mesh centre (:122).

**Candidates plus scoring** (use gaze angles, like the card clamp at `WbwLearnController.ts:183-200`):
```ts
const cam = camPos(), r = camRightFlat(), up = vec3.up()          // WbwSpatial.ts:9, :23-26
const toUser = flat(cam.sub(b.c))                                  // WbwSpatial.ts:16-19
const hr = Math.abs(r.x) * b.h.x + Math.abs(r.z) * b.h.z           // half width as the user sees it
const hd = Math.abs(toUser.x) * b.h.x + Math.abs(toUser.z) * b.h.z // half depth toward the user
const front = b.c.add(toUser.uniformScale(hd))                     // front face centre
const L = labelSize                                                // vec2 from the label UI (like cardSize)
const GAP = 1.5, PULL = 10
const cands = [                                                    // [side, vertical offset of label centre]
  [ 1, b.h.y - L.y / 2], [-1, b.h.y - L.y / 2],                      // beside, top-aligned
  [ 1, b.h.y + L.y / 2 + 1], [-1, b.h.y + L.y / 2 + 1],              // beside-above corner
]
for (const [side, dy] of cands) {
  let p = front.add(r.uniformScale(side * (hr + GAP + L.x / 2))).add(up.uniformScale(dy))
  const d = p.distance(cam); p = cam.add(p.sub(cam).uniformScale((d - PULL) / d))  // same direction, nearer
  score(p)  // see below
}
```
- `score` works in (yaw, pitch) degrees relative to `camLook()`. Use angular half-sizes `atan(half/dist)`.
  - **+1000** if the label rect overlaps the hovered object's rect: never cover what is being named.
  - **+100 per deg² outside** ±(`viewHalfWidthDeg` 16 − 1) / ±(`viewHalfHeightDeg` 19 − 1)
    (`WbwLearnController.ts:62-67`).
  - **+area of overlap** with every other learnable's rect and with the open card's rect.
  - **+small preference:** right < left < upper-right < upper-left.
- Pick the lowest score. If it is still outside the view, clamp the yaw and pitch as the card does (:195-200). The
  connector then stretches, so the link stays visible.
- **Pulling along the sight line** keeps the label visually beside the object while it floats in front of the
  neighbouring pans and the counter glass, so it never intersects them. 10 cm is small enough not to bother
  vergence.
- **Facing:** `placeFacingUser(labelRoot, p)` (`WbwSpatial.ts:40-44`) yaws and pitches the label toward the eye,
  so it tilts up when the user looks down at the counter.
- **World-lock:** place on show. Re-place only when the label switches, or when the head moved more than 10 cm or
  turned more than 8° since the last placement. Never re-place per frame (that makes the label swim).
  Re-facing per frame is fine.
- **Size (guide):** the label sits about 110 cm away after the pull. Hungarian line about 2.2 cm high (≈1.1°),
  English line about 1.6 cm, label about 4.5–5.5 cm tall and at most about 14 cm wide. At about 110 cm that is
  ≈7° × 2.7°. Size text for the real label distance (`roleSize(role, dist, boost)`,
  `Assets/Scripts/WbwSharedUI.ts:40-42`); a lower boost than the cards' `READ_BOOST` 2.0 keeps it "small". The
  label must contain the word, the translation and, in live mode, the "Use this word" button. Nothing else.
- **Occlusion trade-off:** the label is an Interactable (UIKit Button = collider + Interactable,
  `Element.ts:641-672`, `targetingMode = All` :663), and the nearest hit wins (`TargetProvider.ts:173-198`). While
  it is shown, it hides any pan behind it from the pointer. The scoring keeps this small. **Do not** raise
  learnables' `targetingPriority`, or the label could not be selected whenever a pan lies behind it.

---

## 6. Connector line and discreet bracket

```ts
// line = box(pointingRoot, "NameLabelLink", vec3.zero(), vec3.one(), color, {unlit: true})  (WbwGeo.ts:173-175)
// WbwGeo.prim adds only a RenderMeshVisual, no collider (WbwGeo.ts:156-170)
const lt = labelRoot.getTransform(), R = lt.right, U = lt.up
const a = front.add(r.uniformScale(side * hr))                                   // object silhouette edge…
  .add(up.uniformScale(Math.max(-b.h.y, Math.min(b.h.y, p.y - b.c.y))))          // …at the label's height
const q = a.sub(p)                                                               // nearest point of the label rect
const bpt = p.add(R.uniformScale(Math.max(-L.x / 2, Math.min(L.x / 2, q.dot(R)))))
             .add(U.uniformScale(Math.max(-L.y / 2, Math.min(L.y / 2, q.dot(U)))))
const d = bpt.sub(a), len = d.length
line.enabled = len > 1.5                                                         // touching: no line needed
if (line.enabled) {
  const t = line.getTransform()
  t.setWorldPosition(a.add(d.uniformScale(0.5)))
  t.setWorldRotation(quat.rotationFromTo(vec3.right(), d.uniformScale(1 / len)))
  t.setWorldScale(new vec3(len, 0.3, 0.3))                                       // about 3 mm: visible at 1.1–1.3 m
}
```
- An optional 0.8 cm dot (`WbwGeo.sphere`) at `a` reads as "this one".
- **Bracket:** keep `makeBracket` (8 thin unlit boxes, child group `Brackets`, `WbwLearnController.ts:253-263`).
  `faceBrackets` (:291-301) turns it to the user, and `refreshTint` (:266-273) switches to the focus colour at
  1.08 scale on hover. Do not name any new child "Brackets": DC2 looks it up by that name.
- **Colours:** the agreed design takes UI colours from `WbwSharedUI` by mode: `toneOf(mode)` ~:92,
  `useTone` ~:91, `CYAN` :64. Tones are being refined live and now carry a mode label plus a light fill, e.g.
  `TONE_LEARN = tone("learn", "Learn", [...], [...])` ~:84. Only `*UI.ts` modules may import `WbwSharedUI`. So the label UI
  module (for example `WbwNameLabelUI`) should own the label, the connector and the focus colour. The pointing
  logic passes it world points (`a`, `p`) and asks it for `labelSize` and the bracket focus colour.

---

## 7. Keeping an opened card steady while hover changes

- **Placed once:** `select()` positions the card above the object, clamped into the view, with no head-follow
  (`WbwLearnController.ts:176-201`). Keep it that way. **Hover code must never call `wordCard.show/hide`** or
  move the card.
- **Separate parent:** the card is the `WbwWordCardUI` SceneObject, not under any learnable, so card-button
  triggers cannot bubble into `select()` (§2.2). Its buttons are UIKit, which filters to the Target phase
  (`Element.ts:805-813`).
- **Pointer onto card controls:** the object's `onHoverExit` only starts the label grace. The card does not react.
  The trigger lock (§2.4) means a press that starts on a card button can never select a learnable.
- **Close only on:**
  - the close button (`WordCardCloseButton` → `closeCard`, :245-250);
  - a **Target-phase** `onTriggerEnd` on a **different** learnable;
  - walk-away (`horizDist(cam, openedAt) > walkAwayCm`, :287). Keep `openedAt` = camera position at open.
- **Same object pinched again while its card is open:** do not rebuild or move the card. `show()` currently calls
  `hide()` and rebuilds (`WbwWordCardUI.ts:84-89`). A replay can count as "Listen again" (`cardPlayCount++`).
- **Save:** turn the button into "Saved ✓" in place (`setSaved`, `WbwWordCardUI.ts:160-169`) and **remove the
  fly-to-counter auto-close** (`saveCurrent` :225-243 → `flyTo` :172-178). Otherwise the card no longer "stays".
- **Play once, with an indicator:** `speak()` (:217-223) already sets `setPlaying("word")` and clears it in the
  `playVoice` done callback. Map that to "Playing pronunciation" → "Ready to listen again", and increment
  `cardPlayCount` there.
- **Label vs card:** suppress the label for `cardWordId` (in the arbiter). Include the card's rect as an obstacle
  when scoring label spots for other objects.
- **Pointing past the card:** the card's colliders sit in front of the pans above the object and take the pointer
  there. That is correct while the user is on the card. It is a reason to keep the card compact.

---

## 8. The ray visuals: what drew the band, and how to hide only the visual

**What SIK draws**
- `CursorController.onStart` (`Components/Interaction/InteractorCursor/CursorController.ts:29-42`) adds an
  `InteractorCursor` **and an `InteractorRayVisual` component for every interactor** to its own SceneObject
  (`InteractorCursors`), including the Mouse. LEAF's interactor is created later and gets neither.
- `InteractorRayVisual.update` (`Components/Interaction/InteractorRayVisual/InteractorRayVisual.ts:159-211`)
  stretches a child `RayModel` (created at :213-227) from `interactor.startPoint` to `cursor.cursorPosition`,
  scaled `(20, distance, 20)` (:206). **For the Mouse in the editor it shifts both ends 2 cm down along camera-up**
  (:185-192). From a near-plane start this renders as a wide band rising from the bottom edge of the view to the
  cursor: the "diagonal band".
- It is visible only while `cursor.rayAlpha > 0.01` (:76, :87-97). `rayAlpha` is 1 only when the hovered
  Interactable's effective visual (its own, or its parent `InteractionPlane`'s) is `TargetingVisual.Ray`
  (`Components/Interaction/InteractorCursor/CursorViewModel.ts:760-768`;
  `modules/InteractableScoring.ts:51-57`, :464-466). With no target it is 0 (`CursorViewModel.ts:905-907`).
- Nothing in the current scripts or scene sets `targetingVisual` (0 hits in `Assets/Scripts`, `Scene.scene` and
  `.virtual-scene.json`). UIKit BackPlates default to Cursor (`BackPlate.ts:155`, :409). So if the band shows up
  again, it comes from (a) a `Ray` setting without an editor guard, or (b) a custom ray mesh (the old draft's
  simulated-hand ray from the lower right looks exactly like this).
- Diagnostic for the builder at runtime: list enabled objects named `RayModel` / `PointerRay` and their parents.

**Hide only the visual (targeting is a separate path: `MouseInteractor.updateState` → `MouseTargetProvider`,
`MouseInteractor.ts:217-242`)**
1. Per learnable, right after `createComponent(Interactable)` in `WbwCafeBuilder.makeInteractive`:
   ```ts
   import {Interactable, TargetingVisual} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
   it.targetingVisual = global.deviceInfoSystem.isEditor() ? TargetingVisual.None : TargetingVisual.Ray  // StudioLib.d.ts:13607
   ```
   `None` hides both the cursor ring and the ray on learnables; the bracket and label are the feedback. Hover and
   select are unaffected (`InteractableScoring.ts:438` skips `None` only for the visual blend). On the device,
   `Ray` gives SIK's hand ray, **only while pointing at a learnable**: subtle by design. UI buttons keep the
   default Cursor.
2. Guard in the editor: disable the Mouse's ray **component**, at least one frame after OnStart, once
   `CursorController` has run:
   ```ts
   import {InteractorRayVisual} from "SpectaclesInteractionKit.lspkg/Components/Interaction/InteractorRayVisual/InteractorRayVisual"
   import {InteractorInputType} from "SpectaclesInteractionKit.lspkg/Core/Interactor/Interactor"
   function hideMouseRayVisual(): number {
     let n = 0
     const walk = (so: SceneObject) => {
       for (const v of so.getComponents(InteractorRayVisual.getTypeName()) as InteractorRayVisual[]) {
         if (v._interactor && v._interactor.inputType === InteractorInputType.Mouse && v.enabled) { v.enabled = false; n++ }
       }
       for (let i = 0; i < so.getChildrenCount(); i++) walk(so.getChild(i))
     }
     for (let i = 0; i < global.scene.getRootObjectsCount(); i++) walk(global.scene.getRootObject(i))  // StudioLib.d.ts:13068
     return n
   }
   ```
   - `_interactor` is a public field (`InteractorRayVisual.ts:23`). The `getComponents(X.getTypeName()) as X[]`
     pattern is used by UIKit (`Content/ElementContent.ts:416`).
   - Disabling the component triggers `OnDisableEvent` → `isRayEnabled=false` → `hideVisual()` (:55-58, :87-103).
   - **Do not** just disable the `RayModel` SceneObject: `update()` re-enables it every frame (:174).
   - Avoid `getCursorByInputType(Mouse).hide()` (`CursorControllerProvider.ts:79`, `InteractorCursor.ts:169-183`).
     It fades the ray and the cursor ring together (`CursorViewModel.ts:218-223`, :998), which is more than asked.
3. **`PointerRay`** (agreed name) stays **disabled in the editor**. Expose `pointerRayVisible` (false in preview)
   so a test can assert "no band". On the device, prefer SIK's `Ray` visual from step 1. If a custom ray is ever
   needed, draw it in LateUpdate from `HandInteractor.startPoint` to `targetHitPosition`, with no collider.

---

## 9. LEAF: how `trigger` works, and hover without select

### 9.1 Internals
- `DefaultLeafInteractor` (`Interactors/interactor/DefaultLeafInteractor.ts:8-17`) creates a SceneObject with a
  `DefaultSikInteractor`. That is a real SIK `BaseInteractor` with `inputType = CustomController`
  (`DefaultSikInteractor.ts:17-22`).
- `BaseLeafInteractor` wraps `sikInteractor.updateState` (:82-97). Every frame it forces
  `currentInteractable = overrideInteractable` and `currentTrigger = overrideTrigger` (:391-399). It forces
  `isTargeting()` and `isActive()` true (:520-529). **No physics targeting is involved**: SIK's InteractionManager
  dispatches the normal HoverEnter, TriggerStart, TriggerEnd and HoverExit. Code driven by
  `Interactable.onHover*` reacts exactly as it does to the mouse or a hand. Code driven by `HoverEvent` or mouse
  polling would not.
- `trigger(target)` (:171-184) → `executeTrigger` (:145-162):
  1. `enterHover`: `setTarget`, then **await `target.onHoverEnter`** (:221-226);
  2. next frame: `overrideTrigger = Select` (:151), await `onTriggerStart`;
  3. next frame: `overrideTrigger = None`, await `onTriggerEnd`;
  4. `exitHover`: await `onInteractorHoverExit` from this interactor (:231-248).
- **`hover(target, hoverDurationMs = 200)` is public** (:203-215; `INTERACTION_DURATION_MS` :27). It does
  `enterHover` → `sleep` → `exitHover`. **Hover only, no TriggerStart or TriggerEnd.** `LeafHandInteractor.hover`
  (`handInput/LeafHandInteractor.ts:243-274`) does the same with a moved, relaxed simulated hand.
  `startSelecting()` / `stopSelecting()` (:535-544) set the trigger without hovering.
- `setTarget` (:345-370) probes from the camera to the target centre. An occluder (for example our label) only
  changes the aim point; the forced target still gets the events. **LEAF cannot detect pointer occlusion**, so
  assert the geometry instead (§9.3 test 6).
- `targetHitPosition` = the target centre (:437-439), so label placement must not depend on the hit point (§2.3).
- Disabling a hovered Interactable is safe: it is flushed (`InteractionManager.ts:504-507`) and HoverExit is
  still sent (:468-475). `WbwTester.tap` also tolerates targets that disable themselves after `onTriggerEnd`
  (`Assets/Tests/Leaf/WbwLeafHelpers.ts:105-129`).

### 9.2 What a tap on a learnable now does
`t.tap("Learnable_x")`:
- the hover phase runs the arbiter, which can show `NameLabel` for 1–2 frames with no audio;
- then `onTriggerEnd` → card + `speak` once, so `voicePlayCount + 1` and `cardPlayCount = 1`;
- the label is suppressed for `cardWordId`, so after the tap `labelForId === ""`.

DC2's "one voice clip started on open" (`DC2_Learn.ts:76-77`) stays valid. DC2:92-97 and
`WbwTester.learnAndSave` (`WbwLeafHelpers.ts:226-234`) expect the card to fly away after Save. Update them for
"Saved ✓, card stays".

### 9.3 Test recipes (scenario code)
```ts
import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {findInteractableByName} from "Leaf.lspkg/Interactors/InteractableUtils"        // :224-230
import {findSceneObjectsByName, nextFrame} from "Leaf.lspkg/Utils/common/Utils"
const it = (n: string) => findInteractableByName(n, undefined, true)!
const enabledCount = (n: string) => findSceneObjectsByName(n).filter((o) => !isNull(o) && o.isEnabledInHierarchy).length

// 1) Point to reveal: label beside the object, NO audio
const v0 = t.audio.voicePlayCount, sfx0 = t.audio.lastSfxKey
const h = t.interactor.hover(it("Learnable_uborka_friss"), 1200)         // held 1.2 s, not awaited yet
await waitFor(() => t.learn.hoveredId === "uborka_friss" && t.learn.labelForId === "uborka_friss", "label on hover", 2000)
expect(textOf("NameLabelHu", findEnabled("NameLabel")), "HU").toBe("uborka")
expect(textOf("NameLabelEn", findEnabled("NameLabel")), "EN").toBe("cucumber")
expect(t.audio.voicePlayCount, "hover is silent").toBe(v0)
await h
await waitFor(() => t.learn.labelForId === "", "label hides after the grace", 2000)
expect(t.audio.voicePlayCount).toBe(v0); expect(t.audio.lastSfxKey).toBe(sfx0)

// 2) Sweep: silent, never more than one label, no flicker
let maxLabels = 0, sampling = true
const sampler = (async () => { while (sampling) { maxLabels = Math.max(maxLabels, enabledCount("NameLabel")); await nextFrame() } })()
for (const id of ["paradicsom", "paprika", "uborka_friss", "uborka"]) await t.interactor.hover(it(`Learnable_${id}`), 400)  // > SWITCH_DWELL
sampling = false; await sampler
expect(maxLabels, "one hover label at a time").toBe(1)
expect(t.audio.voicePlayCount, "sweep is silent").toBe(v0)

// 3) Select the LABEL → card + exactly one playback
const holder = new DefaultLeafInteractor("WbwLeafHover")                 // second interactor holds the hover
const held = holder.hover(it("Learnable_paradicsom"), 2500)
await waitFor(() => t.learn.labelForId === "paradicsom", "label shown")
await t.tap("NameLabel")
await waitFor(() => t.card.isVisible && t.learn.cardWordId === "paradicsom", "card via label")
expect(t.learn.cardPlayCount).toBe(1); expect(t.audio.voicePlayCount).toBe(v0 + 1)
await held

// 4) The card stays steady while the pointer moves elsewhere
const p0 = findEnabled("WordCard")!.getTransform().getWorldPosition(), v1 = t.audio.voicePlayCount
await t.interactor.hover(it("Learnable_szalami"), 500)                   // another object's label; card unaffected
await t.interactor.hover(it("WordCardSaveButton"), 300)                  // onto the card's controls
expect(t.card.isVisible && t.learn.cardWordId === "paradicsom", "card still open").toBe(true)
expect(findEnabled("WordCard")!.getTransform().getWorldPosition().distance(p0) < 0.1, "card did not move").toBe(true)
expect(t.audio.voicePlayCount, "hover never plays").toBe(v1)

// 5) No ray band in the preview (editor only)
expect(t.learn.pointerRayVisible, "PointerRay hidden").toBe(false)
// optional: every Mouse InteractorRayVisual on "InteractorCursors" has enabled === false

// 6) Geometry, because LEAF cannot see occlusion: the label is close beside, inside the view,
//    and does not cover its object. Check the label's near edge to the object AABB is < ~8 cm,
//    angleToDeg(label corners) <= 16, and the angular rects do not overlap.
```
- Hover durations must exceed `SWITCH_DWELL` plus a few frames: use ≥ 400 ms.
- `t.tap("NameLabel")` after an awaited `hover()` also works within `EXIT_GRACE`. The `holder` pattern is the
  deterministic one.
- **Never** run `trigger` on the same `DefaultLeafInteractor` while an un-awaited `hover` on it is pending:
  `exitHover` would clear the override target mid-trigger. Use a second interactor. Do not let two LEAF
  interactors hover the **same** object; they share the CustomController bit (§2.1).
- `LeafLifecycle` cleans extra interactors after the scenario (`BaseLeafInteractor.ts:96`, :99-103).

### 9.4 Pitfalls for test runs
- **Preview mouse vs LEAF:** `enterHover` awaits `onHoverEnter`, which never fires if another interactor already
  hovers the target (`InteractableEventHandler.ts:92-95`). The mouse keeps a stale ray after it leaves the panel
  (§2.5), so a run can hang on a `tap`. Disable the mouse for the scenario and restore it in `finally`:
  ```ts
  const mouse = InteractionManager.getInstance().getInteractorsByType(InteractorInputType.Mouse)[0] as unknown as BaseScriptComponent | undefined
  if (mouse) mouse.enabled = false    // processEvents sends HoverExit for its last target (InteractionManager.ts:416-450)
  ```
- A stale mouse hover would also feed `hoverStack`, and the arbiter would fall back to that object.
- `PreviewInteractTool` (MCP `Hover`/`Pinch`) is not an option here: the scene has `AgentInspectScript` but no
  `AgentInteractScript` (`.virtual-scene.json`), and MCP is off-limits for this phase anyway.

---

## 10. Names and readable state (aligned with the agreed list)

| Object or state | Owner | Notes |
|---|---|---|
| `NameLabel` (UIKit Button; children `NameLabelHu`, `NameLabelEn`; live-only child `UseThisWordButton`) | label UI module | Single reused object under `PointingUI`; enabled only while shown |
| `NameLabelLink` | label UI module | Connector box, no collider |
| `PointerRay` | pointing logic | Disabled in the editor |
| `hoveredId` | pointing / Learn | Raw newest hovered learnable |
| `labelForId` | pointing / Learn | What the label shows, "" when hidden |
| `labelMode` | pointing / Learn | "learn" \| "live" |
| `labelSide` | pointing / Learn | "right" \| "left" \| "upper-right" \| "upper-left"; debugging only |
| `pointerRayVisible` | pointing / Learn | false in the editor |
| `cardWordId`, `cardPlayCount` | Learn | Keep `activeCardWordId` as an alias for DC2 |
| `WordCardPlayButton` | card | Becomes "Listen again" |
| `WordCardSaveButton` | card | Unchanged |
| `WordCardUseLiveButton` | card | New |

---

## 11. Checklist

- [ ] Subscribe learnable hover and trigger handlers in OnStart (already done via `WbwMain.start`). Filter
      `propagationPhase === "Target"`.
- [ ] Run the arbiter in `LateUpdateEvent`: immediate first show, about 0.12 s switch dwell, about 0.5 s exit
      grace, keep the label while it is hovered, never toggle inside `onHoverExit`.
- [ ] Hover paths never call `audio.*`. Only select plays, once (`cardPlayCount`).
- [ ] One `NameLabel`, reused and not rebuilt, outside every `Learnable_<id>` subtree, carrying its own
      collider + Interactable (UIKit Button).
- [ ] Place the label from the mesh AABB (skip `Brackets`): four candidates, angle-space scoring (object, other
      learnables, card, ±16°/±19°), pull 10 cm toward the eye, `placeFacingUser`, world-locked.
- [ ] Connector and dot as `WbwGeo` primitives, unlit, no collider. Focus bracket via `refreshTint`. Colours from
      the label UI module (`WbwSharedUI` tones), never hard-coded hex values.
- [ ] Card: place it once; close only on close, another Target select or walk-away; Save does not fly it away;
      no rebuild when the same object is selected again.
- [ ] Editor: learnables use `targetingVisual = None`; the Mouse `InteractorRayVisual` component is disabled;
      `PointerRay` is off. Device: learnables use `Ray`.
- [ ] LEAF: test hover with `interactor.hover(target, ms)` without awaiting, plus `waitFor`. Use a second
      interactor to hold a hover while tapping. Disable the mouse interactor during scenarios. Check label
      geometry by math, because LEAF ignores occlusion.
