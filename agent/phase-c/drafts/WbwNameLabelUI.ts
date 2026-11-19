// WbwNameLabelUI.ts — Phase C "point to reveal" hover label (passive view).   [DRAFT]
// Spec: agent/phase-c/research/R2_pointing.md §4–§6, §10 (+ agreed Phase C design, steps 2, 3, 6 and 9).
// Owns: ONE reused label, NameLabel, floating close beside the pointed-at object: a small mode chip,
//       the Hungarian word (large) and the English word (small), placed from the object's world AABB in
//       the narrow Specs view; a short connector line (NameLabelLink) and a discreet focus bracket
//       (NameLabelBracket) around the object. Everything is styled by the CURRENT mode through
//       WbwSharedUI (toneOf / useTone / styleButton / modeChip, CYAN focus, GREEN success) — no hex here.
//       Use it live adds UseThisWordButton (+ AddWordButton once the phrase has a word), or
//       "In your phrase" with a check when the word is already in it.
// Emits: onSelect({id, mode}) — the label surface itself was pinched/clicked (Learn → owner opens the
//       card; Use it live → owner's choice), onUseWord(id), onAddWord(id), onHoverChanged(bool) — feed
//       `hovered` (plan §3.3 name; alias of isHovered) to WbwHoverArbiter.setHoldSource so the label stays
//       while the pointer is on it.
// Must NOT: play audio (hover is silent; UIKit click sounds stay off, Element.ts:72), track hover on
//       learnables (the one WbwHoverArbiter in WbwPointing.ts does), decide what a select means, open cards,
//       change the phrase, or be
//       parented under a Learnable_<id>: SIK sends every event on to ancestor Interactables
//       (EventDispatcher.ts:26-60), so a press here would re-select the object and replay its audio.
// Host: put this component on a world-static, unrotated, unscaled SceneObject outside the café's
//       learnables (like the WordCard host). It builds a child "PointingUI" on first show.
// Stable names: NameLabel (UIKit Button = the whole label), NameLabelHu, NameLabelEn, NameLabelChip,
//       NameLabelStatus, UseThisWordButton, AddWordButton, NameLabelLink, NameLabelBracket.
//       Never name anything "Brackets" here: DC2 counts the Learn discovery brackets by that name.
//
// Owner wiring (see the WbwPointing.ts header for the pointer side — WbwLearnController owns both):
//   nameLabel.setObstacles(cafe.learnables)                         // {id, so, size}: avoid covering them
//   show:    nameLabel.show({id, hu: w.hu, en: w.en, so: l.so, size: l.size},
//                           {mode, live: {phraseIds, maxSlots: MAX_SLOTS, usable: phraseEditable && canUseInPhrase(id)},
//                            card: card.isVisible ? {pos: cardWorldPos, size: card.cardSize} : null})
//   live phrase changed while shown: nameLabel.refresh({live: {...}})
//   nameLabel.onSelect.add((s) => { if (s.mode === "learn") learn.selectById(s.id) })  // live: nothing (D11:
//                                                    only UseThisWordButton / AddWordButton edit the phrase)
//   nameLabel.onUseWord.add((id) => learn's onUse(id));  nameLabel.onAddWord.add((id) => learn's onAdd(id))
//     → order.useWord / addWord → PhraseHelperModel.useWord / addWord (they refuse; plan §4.9)
//   Bracket tints for the learn controller's own "Brackets": markerTint("learn" | "live" | "focus") (plan D24).
//   Brackets (decided, see WbwPointing.ts): THIS view owns the one hover bracket (NameLabelBracket, drawBracket
//   stays true, tinted by mode through WbwSharedUI). The Learn controller's refreshTint()/scan() no longer
//   enable or retint its "Brackets" on hover, so the object never gets two brackets.
//
// APIs used (verified):
//   UIKit Button.size setter resizes the visual + collider (Button.ts:152-176, Element.ts:604-624) and
//     resets the corner radius, so the style is re-applied after each resize; Element.interactable
//     (:378), .initialized (:387), .onInitialized (:129); onTriggerUp is Target-phase only (:806-813),
//     so a press on a child button never fires the label's own select.
//   SIK Interactable.onHoverEnter/onHoverExit (Interactable.ts:87/:102), raw (not phase-filtered) so a
//     child button's hover trickles down and still counts as "on the label".
//   Lens: RenderMeshVisual.worldAabbMin/Max (StudioLib.d.ts:3593/:3599), Transform.right/up
//     (:13296/:13280), setWorldPosition/Rotation (:13251/:13259), getWorldScale/setWorldScale
//     (:13215/:13268), quat.rotationFromTo (:884), quat.quatIdentity (:900), vec3.right (:372),
//     vec3.min/max (:340/:336), Rect.create (:4819), HorizontalOverflow.Shrink (~:2619).
//   Project: WbwSharedUI (button, text, image, modeChip, modeChipH, applyTextRole, lineHeightCm,
//     textWidthCm, styleWhenReady, setTextColor, retire, obj, toneOf, useTone, READ_BOOST, CYAN, GREEN,
//     TEXT_LIGHT, TEXT_SOFT, TONE_LEARN, TONE_LIVE), WbwGeo (box, group, tint — unlit, no colliders),
//     WbwSpatial (camTransform, faceRotation, placeFacingUser).
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {
  applyTextRole, button, ButtonParts, image, lineHeightCm, modeChip, modeChipH, obj, READ_BOOST, retire,
  setTextColor, styleWhenReady, text, textWidthCm, toneOf, useTone, Tone,
  CYAN, GREEN, TEXT_LIGHT, TEXT_SOFT, TONE_LEARN, TONE_LIVE,
} from "./WbwSharedUI"
import {box, group, tint} from "./WbwGeo"
import {camTransform, faceRotation, placeFacingUser} from "./WbwSpatial"

const ICON_CHECK = requireAsset("../Icons/check_circle.png") as Texture

export type NameLabelMode = "learn" | "live"

export interface NameLabelTarget {
  /** WordEntry.id (Learnable_<id>). */
  id: string
  /** Dictionary form (WordEntry.hu), shown large. */
  hu: string
  /** English meaning (WordEntry.en), shown small. */
  en: string
  /** The Learnable_<id> wrapper: its meshes give the world AABB. */
  so: SceneObject
  /** Fallback box size (Learnable.size) when no mesh is found. */
  size?: vec3
}

export interface NameLabelLiveState {
  /** Ingredient ids currently in the phrase helper's slots, in order. */
  phraseIds: string[]
  /** Slot limit (R3: at most 4). */
  maxSlots?: number
  /** false: not a sandwich filling (pastry / coffee words) — the label shows no buttons. Default true. */
  usable?: boolean
}

export interface NameLabelShowOpts {
  /** "learn" | "live" (anything else is styled as Learn; WbwHoverArbiter offers no labels in Practice). */
  mode: string
  live?: NameLabelLiveState
  /** The open word card, so the label never covers it. */
  card?: {pos: vec3; size: vec2} | null
}

export interface NameLabelObstacle {
  id: string
  so: SceneObject
  size?: vec3
}

export interface NameLabelSelect {
  id: string
  mode: NameLabelMode
}

/** World-space axis-aligned box: centre and half size (cm). */
export interface WorldBox {
  c: vec3
  h: vec3
}

interface ScreenRect { x0: number; x1: number; y0: number; y1: number }
interface ViewFrame { cam: vec3; F: vec3; R: vec3; U: vec3 }
interface LiveButtonSpec { name: string; label: string; w: number; primary: boolean }
interface LiveRowSpec { kind: "none" | "buttons" | "status"; h: number; w: number; gap: number; buttons: LiveButtonSpec[] }
interface Candidate { side: string; x: number; y: number; pref: number }

const DEG = 180 / Math.PI
// Short labels; the learner's agreed wording for the live controls (see open questions in the report).
const LABEL_USE = "Use this word"
const LABEL_ADD = "Add (+ és)"
const LABEL_IN_PHRASE = "In your phrase"
/** Space between the object's silhouette and its bracket (cm). */
const BRACKET_MARGIN_CM = 1.2
/** Live buttons: about 2.5° tall (Small Wins used 3.8 cm at 70 cm = 3.1°; the label is a compact strip). */
const LIVE_BUTTON_DEG = 2.5
const LIVE_BUTTON_GAP_DEG = 0.8
/** z offsets inside the label (cm, toward the user): words in front of the face, child buttons nearer still. */
const WORDS_Z = 0.6
const LIVE_BUTTON_Z = 0.7
/** The mode chip's text is a little smaller than the English word. */
const CHIP_BOOST_REL = 0.8

@component
export class WbwNameLabelUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">WbwNameLabelUI – hover label beside the pointed-at object</span>')
  @ui.separator
  @ui.group_start("Placement")
  @input
  @hint("Half width of the Specs view (deg): the label stays inside it")
  @widget(new SliderWidget(10, 30, 0.5))
  viewHalfWidthDeg: number = 16

  @input
  @hint("Half height of the Specs view (deg)")
  @widget(new SliderWidget(10, 30, 0.5))
  viewHalfHeightDeg: number = 19

  @input
  @hint("The label floats this much nearer the eye than the object, so it never cuts into neighbouring pans (cm)")
  @widget(new SliderWidget(0, 30, 1))
  pullTowardEyeCm: number = 10

  @input
  @hint("Gap between the object's bracket and the label (cm)")
  @widget(new SliderWidget(0, 6, 0.1))
  gapCm: number = 1.5

  @input
  @hint("Re-place the (world-locked) label when the head moved this far since it was placed (cm)")
  @widget(new SliderWidget(2, 40, 1))
  replaceMoveCm: number = 10

  @input
  @hint("Re-place the label when the head turned this far since it was placed (deg)")
  @widget(new SliderWidget(2, 30, 1))
  replaceTurnDeg: number = 8
  @ui.group_end
  @ui.group_start("Look")
  @input
  @hint("Text size factor for the label's real distance. Word cards use READ_BOOST 2.0; a smaller value keeps the label small (R2 §5: ~2.2 cm Hungarian line at ~110 cm)")
  @widget(new SliderWidget(0.8, 2.0, 0.05))
  labelBoost: number = 1.25

  @input
  @hint("Show the small mode chip (Learn / Use it live) on the label, so colour is never the only cue")
  showModeChip: boolean = true

  @input
  @hint("Draw the discreet focus bracket around the pointed-at object")
  drawBracket: boolean = true

  @input
  @hint("Draw the short connector line from the object to the label")
  drawConnector: boolean = true
  @ui.group_end

  // ── readable state for tests ──
  /** Learnable id the label shows ("" = hidden). */
  labelForId: string = ""
  /** "learn" | "live" ("" = hidden). */
  labelMode: string = ""
  /** Hungarian / English text shown. */
  labelHu: string = ""
  labelEn: string = ""
  /** Where the label sits: right | left | upper-right | upper-left | above | below (debugging only). */
  labelSide: string = ""
  /** Size of the label surface (cm). */
  labelSize: vec2 = new vec2(0, 0)
  /** Eye-to-label distance used for sizing (cm). */
  labelDistanceCm: number = 0
  /** Live controls shown now: "UseThisWordButton", "AddWordButton" or "NameLabelStatus". */
  liveControls: string[] = []
  /** True while any interactor points at the label or one of its buttons. */
  isHovered: boolean = false
  /** Plan §3.3 name for isHovered: the owner's hover-arbiter hold source reads this. */
  get hovered(): boolean { return this.isHovered }
  /** Length of the connector between the bracket edge and the label edge (cm; 0 = touching / hidden). */
  connectorLengthCm: number = 0
  /** Score of the chosen spot (0–6 = clean, ≥1000 = had to cover the object). */
  placementScore: number = 0
  /** Increments every time the label shows a different object. */
  showCount: number = 0
  get isVisible(): boolean { return this.anchor !== null && !isNull(this.anchor) && this.anchor.enabled }
  /** Mode accent the label uses now for its bracket and connector (CYAN while the label is hovered). */
  get accentColor(): vec4 { return this.isHovered ? CYAN : this.tone().tint }
  /** Idle accent for a mode (e.g. for the Learn controller's own brackets). */
  accentFor(mode: string): vec4 { return toneOf(mode).tint }

  private _onSelect = new Event<NameLabelSelect>()
  private _onUseWord = new Event<string>()
  private _onAddWord = new Event<string>()
  private _onHoverChanged = new Event<boolean>()
  get onSelect(): PublicApi<NameLabelSelect> { return this._onSelect.publicApi() }
  get onUseWord(): PublicApi<string> { return this._onUseWord.publicApi() }
  get onAddWord(): PublicApi<string> { return this._onAddWord.publicApi() }
  get onHoverChanged(): PublicApi<boolean> { return this._onHoverChanged.publicApi() }

  private root: SceneObject | null = null
  private anchor: SceneObject | null = null
  private surface: ButtonParts | null = null
  private huText: Text | null = null
  private enText: Text | null = null
  private statusRow: SceneObject | null = null
  private statusIcon: SceneObject | null = null
  private statusText: Text | null = null
  private chip: SceneObject | null = null
  private chipKey = ""
  private live: {name: string; parts: ButtonParts}[] = []
  private liveKey = ""
  private liveDist = 0
  private link: SceneObject | null = null
  private bracket: SceneObject | null = null
  private arms: SceneObject[] = []
  private bracketHalf: vec2 = new vec2(0, 0)
  private obstacles: NameLabelObstacle[] = []
  private target: NameLabelTarget | null = null
  private opts: NameLabelShowOpts = {mode: "learn"}
  private placedCam: vec3 = vec3.zero()
  private placedLook: vec3 = new vec3(0, 0, -1)
  private surfaceW = 0
  private surfaceH = 0

  onAwake(): void {
    this.createEvent("UpdateEvent").bind(() => this.tick())
  }

  /** Objects the label should avoid covering (all learnables; the shown one is skipped automatically). */
  setObstacles(list: NameLabelObstacle[]): void {
    this.obstacles = list.slice()
  }

  /** Show (or move) the one label beside `target`. Silent. */
  show(target: NameLabelTarget, opts: NameLabelShowOpts): void {
    if (!target || !target.so || isNull(target.so)) {
      this.hide()
      return
    }
    this.ensureBuilt()
    const mode = modeOf(opts.mode)
    const same = this.isVisible && this.labelForId === target.id && this.labelMode === mode
    this.target = target
    this.opts = {mode: opts.mode, live: opts.live, card: opts.card ?? null}
    this.labelForId = target.id
    this.labelHu = target.hu
    this.labelEn = target.en
    this.labelMode = mode
    this.anchor!.enabled = true
    if (same) {
      this.relayoutInPlace()
      return
    }
    this.showCount++
    this.placeNow()
  }

  /** Update the live state / card obstacle while shown, without moving the label. */
  refresh(patch: {live?: NameLabelLiveState; card?: {pos: vec3; size: vec2} | null}): void {
    if (!this.isVisible || !this.target) return
    if (patch.live !== undefined) this.opts.live = patch.live
    if (patch.card !== undefined) this.opts.card = patch.card
    this.relayoutInPlace()
  }

  hide(): void {
    if (this.anchor && !isNull(this.anchor)) this.anchor.enabled = false
    if (this.link && !isNull(this.link)) this.link.enabled = false
    if (this.bracket && !isNull(this.bracket)) this.bracket.enabled = false
    this.target = null
    this.labelForId = ""
    this.labelMode = ""
    this.labelHu = ""
    this.labelEn = ""
    this.labelSide = ""
    this.liveControls = []
    this.connectorLengthCm = 0
    this.setHovered(false)
  }

  // ── build once, reuse (R2 §4: one NameLabel, never destroyed and rebuilt) ──
  private ensureBuilt(): void {
    if (this.root && !isNull(this.root)) return
    const root = obj(this.sceneObject, "PointingUI")
    this.root = root
    this.resetRoot()
    const anchor = obj(root, "NameLabelAnchor")
    anchor.createComponent("Component.Canvas") // standalone UIKit content gets a Canvas, as in WbwTableCardUI
    this.anchor = anchor
    const d0 = 100 // placeholder; everything is resized for the real distance in layout()
    useTone(TONE_LEARN)
    const parts = button(anchor, "NameLabel", 8, 5, "", this.buttonDist(d0), () => this.onSurfacePressed(), {asItem: false, tone: TONE_LEARN})
    parts.so.getTransform().setLocalPosition(vec3.zero())
    this.surface = parts
    if (parts.btn.initialized) this.afterSurfaceInit()
    else parts.btn.onInitialized.add(() => this.afterSurfaceInit())
    // words: plain Text children of the button (no flex), sized and placed in layout()
    this.huText = text(parts.so, "NameLabelHu", "", "Headline1", d0, {w: 6, h: 2, align: "left", onPanel: false, boost: this.labelBoost, z: WORDS_Z})
    this.enText = text(parts.so, "NameLabelEn", "", "Caption", d0, {w: 6, h: 1.4, align: "left", color: TEXT_SOFT, onPanel: false, boost: this.labelBoost, z: WORDS_Z})
    this.huText.horizontalOverflow = HorizontalOverflow.Shrink
    this.enText.horizontalOverflow = HorizontalOverflow.Shrink
    // live status: check icon + "In your phrase" (success = green + check, never colour alone)
    this.statusRow = obj(parts.so, "NameLabelStatus", new vec3(0, 0, WORDS_Z))
    this.statusIcon = image(this.statusRow, "StatusIcon", ICON_CHECK, 1.4, 1.4, GREEN, false).getSceneObject()
    this.statusText = text(this.statusRow, "StatusText", LABEL_IN_PHRASE, "Callout", d0, {w: 6, h: 1.6, align: "left", color: GREEN, onPanel: false, boost: this.labelBoost, z: 0})
    this.statusText.horizontalOverflow = HorizontalOverflow.Shrink
    this.statusRow.enabled = false
    // connector + focus bracket: thin unlit WbwGeo boxes, no colliders (WbwGeo.ts:156-170)
    this.link = box(root, "NameLabelLink", vec3.zero(), vec3.one(), TONE_LEARN.tint, {unlit: true})
    this.link.enabled = false
    this.bracket = group(root, "NameLabelBracket")
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      this.arms.push(box(this.bracket, `H_${sx}_${sy}`, vec3.zero(), vec3.one(), TONE_LEARN.tint, {unlit: true}))
      this.arms.push(box(this.bracket, `V_${sx}_${sy}`, vec3.zero(), vec3.one(), TONE_LEARN.tint, {unlit: true}))
    }
    this.bracket.enabled = false
  }

  private afterSurfaceInit(): void {
    const p = this.surface
    if (!p || isNull(p.so)) return
    // re-apply the size after UIKit's own initialisation, as WbwTableCardUI does
    if (this.surfaceW > 0) p.btn.size = new vec3(this.surfaceW, this.surfaceH, 1)
    styleWhenReady(p.btn, false, this.tone())
    const it = p.btn.interactable
    if (!it) return
    // Raw SIK events (UIKit's own hover events are Target-only): moving onto a child button
    // (UseThisWordButton) trickles HoverEnter down to this Interactable, so the label stays "hovered".
    it.onHoverEnter.add(() => this.setHovered(true))
    it.onHoverExit.add(() => this.setHovered(false))
  }

  private onSurfacePressed(): void {
    if (!this.labelForId) return
    this._onSelect.invoke({id: this.labelForId, mode: this.labelMode === "live" ? "live" : "learn"})
  }

  private onLiveButton(name: string): void {
    const id = this.labelForId
    if (!id) return
    if (name === "UseThisWordButton") this._onUseWord.invoke(id)
    else if (name === "AddWordButton") this._onAddWord.invoke(id)
  }

  private setHovered(on: boolean): void {
    if (this.isHovered === on) return
    this.isHovered = on
    this.paintAccent()
    this._onHoverChanged.invoke(on)
  }

  private tone(): Tone {
    return toneOf(this.labelMode || "learn")
  }

  /** button() sizes its label text with READ_BOOST; this distance gives the label's own boost instead. */
  private buttonDist(dL: number): number {
    return (dL * this.labelBoost) / READ_BOOST
  }

  /** PointingUI sits at the world origin with identity rotation and unit scale, so local = world below it. */
  private resetRoot(): void {
    if (!this.root || isNull(this.root)) return
    const t = this.root.getTransform()
    t.setWorldPosition(vec3.zero())
    t.setWorldRotation(quat.quatIdentity())
    t.setWorldScale(vec3.one())
  }

  // ── placement (R2 §5): candidates beside the object, scored in the view's own (gnomonic) space ──
  private placeNow(): void {
    const t = this.target
    if (!t || !this.anchor || !this.surface) return
    if (isNull(t.so)) {
      this.hide()
      return
    }
    this.resetRoot()
    const f = viewFrame()
    const b = worldBox(t.so, t.size)
    const objR = screenRectOfBox(f, b)
    const dNear = Math.max(25, distanceToBox(f.cam, b))
    const dL = Math.max(35, dNear - this.pullTowardEyeCm)
    this.layout(dL)
    const hw = (DEG * (this.surfaceW / 2)) / dL
    const hh = (DEG * (this.surfaceH / 2)) / dL
    const gap = (DEG * (this.gapCm + BRACKET_MARGIN_CM)) / dL
    const cx = (objR.x0 + objR.x1) / 2
    const cands: Candidate[] = [
      {side: "right", x: objR.x1 + gap + hw, y: objR.y1 - hh, pref: 0},       // beside, top-aligned
      {side: "left", x: objR.x0 - gap - hw, y: objR.y1 - hh, pref: 1},
      {side: "upper-right", x: objR.x1 + gap + hw, y: objR.y1 + gap + hh, pref: 2}, // beside-above corner
      {side: "upper-left", x: objR.x0 - gap - hw, y: objR.y1 + gap + hh, pref: 3},
      {side: "above", x: cx, y: objR.y1 + gap + hh, pref: 4},                // clean for the back row
      {side: "below", x: cx, y: objR.y0 - gap - hh, pref: 6},                // in front of the counter glass
    ]
    const obst: ScreenRect[] = []
    for (const o of this.obstacles) {
      if (o.id === t.id || !o.so || isNull(o.so)) continue
      const ob = worldBox(o.so, o.size)
      if (toScreen(f, ob.c).z < 10) continue // beside or behind the head
      obst.push(screenRectOfBox(f, ob))
    }
    const card = this.opts.card
    const cardR = card ? screenRectOfQuad(f, card.pos, card.size) : null
    const vx = DEG * Math.tan((this.viewHalfWidthDeg - 1) / DEG)
    const vy = DEG * Math.tan((this.viewHalfHeightDeg - 1) / DEG)
    const objKeepOut = inflate(objR, 0.2)
    let best = cands[0]
    let bestScore = Number.MAX_VALUE
    for (const c of cands) {
      const r: ScreenRect = {x0: c.x - hw, x1: c.x + hw, y0: c.y - hh, y1: c.y + hh}
      let s = c.pref
      if (overlap(r, objKeepOut) > 0) s += 1000                           // never cover what is named
      const ox = Math.max(0, Math.abs(c.x) + hw - vx), oy = Math.max(0, Math.abs(c.y) + hh - vy)
      s += 100 * (ox * ox + oy * oy)                                      // stay inside the narrow view
      for (const o of obst) s += overlap(r, o)                            // cover as little as possible
      if (cardR) s += 3 * overlap(r, cardR)
      if (s < bestScore) {
        bestScore = s
        best = c
      }
    }
    // still outside the view? clamp like the word card does (WbwLearnController.ts:195-200); the connector stretches
    const mx = Math.max(0, vx - hw), my = Math.max(0, vy - hh)
    const x = clamp(best.x, -mx, mx), y = clamp(best.y, -my, my)
    placeFacingUser(this.anchor, fromScreen(f, x, y, dL)) // world-locked until a switch or a big head move
    this.anchor.getTransform().setLocalScale(vec3.one())
    this.labelSide = best.side
    this.placementScore = bestScore
    this.labelDistanceCm = dL
    this.placedCam = f.cam
    this.placedLook = f.F
    this.placeBracket(f, objR, dNear)
    this.placeConnector()
    this.paintAccent()
  }

  /** Re-layout for a changed live state without moving the label; the connector follows the new edge. */
  private relayoutInPlace(): void {
    if (!this.target || !this.surface) return
    this.layout(this.labelDistanceCm > 0 ? this.labelDistanceCm : 100)
    this.placeConnector()
    this.paintAccent()
  }

  /**
   * Size and arrange the label for its real distance dL (cm). Left-aligned, top to bottom:
   * mode chip · Hungarian word (largest) · English word · live row (buttons or "In your phrase").
   */
  private layout(dL: number): void {
    const t = this.target!
    const parts = this.surface!
    const tone = this.tone()
    const B = this.labelBoost
    const k = (dL / 110) * B
    const padX = 0.85 * k, padY = 0.5 * k
    const huH = lineHeightCm("Headline1", dL, false, B)
    const enH = lineHeightCm("Caption", dL, false, B)
    const huW = textWidthCm(t.hu.length, "Headline1", dL, false, B)
    const enW = textWidthCm(t.en.length, "Caption", dL, false, B)
    const chipDist = (dL * CHIP_BOOST_REL * B) / READ_BOOST
    const chipH = this.showModeChip ? modeChipH(chipDist) : 0
    const chipW = this.showModeChip ? textWidthCm(tone.label.length, "Caption", chipDist, false) + 1.4 : 0
    const chipGap = this.showModeChip ? 0.3 * k : 0
    const row = this.liveRowSpec(dL, k)
    const rowGap = row.kind === "none" ? 0 : 0.6 * k
    const innerW = Math.max(huW, enW, chipW, row.w, 4 * k) + 0.3 * k
    const W = innerW + 2 * padX
    const H = 2 * padY + chipH + chipGap + huH + enH + rowGap + row.h
    this.surfaceW = W
    this.surfaceH = H
    this.labelSize = new vec2(W, H)

    // the label surface (whole label selectable); Button.size resets the corner radius → restyle
    parts.so.getTransform().setLocalPosition(vec3.zero())
    parts.btn.size = new vec3(W, H, 1)
    styleWhenReady(parts.btn, false, tone)

    const xL = -innerW / 2
    let y = H / 2 - padY
    // mode chip (rebuilt only when the mode or the size bucket changes)
    const chipKey = this.showModeChip ? `${tone.name}|${sizeBucket(chipDist)}` : ""
    if (chipKey !== this.chipKey) {
      retire(this.chip, this)
      this.chip = null
      if (this.showModeChip) {
        useTone(tone)
        this.chip = modeChip(parts.so, chipDist, "NameLabelChip")
      }
      this.chipKey = chipKey
    }
    if (this.chip) this.chip.getTransform().setLocalPosition(new vec3(xL + chipW / 2, y - chipH / 2, WORDS_Z))
    y -= chipH + chipGap

    const hu = this.huText!, en = this.enText!
    hu.text = t.hu
    applyTextRole(hu, "Headline1", dL, B)
    hu.layoutRect = Rect.create(-innerW / 2, innerW / 2, -huH / 2, huH / 2)
    setTextColor(hu, TEXT_LIGHT)
    hu.getSceneObject().getTransform().setLocalPosition(new vec3(0, y - huH / 2, WORDS_Z))
    y -= huH
    en.text = t.en
    applyTextRole(en, "Caption", dL, B)
    en.layoutRect = Rect.create(-innerW / 2, innerW / 2, -enH / 2, enH / 2)
    setTextColor(en, TEXT_SOFT)
    en.getSceneObject().getTransform().setLocalPosition(new vec3(0, y - enH / 2, WORDS_Z))

    this.applyLiveRow(row, dL, k, xL, -H / 2 + padY + row.h / 2)
  }

  private liveRowSpec(dL: number, k: number): LiveRowSpec {
    const none: LiveRowSpec = {kind: "none", h: 0, w: 0, gap: 0, buttons: []}
    const live = this.opts.live
    if (this.labelMode !== "live" || !live || live.usable === false) return none
    const B = this.labelBoost
    if (live.phraseIds.indexOf(this.labelForId) >= 0) {
      const h = lineHeightCm("Callout", dL, false, B)
      return {kind: "status", h: h, w: h * 0.9 + 0.4 * k + textWidthCm(LABEL_IN_PHRASE.length, "Callout", dL, false, B), gap: 0, buttons: []}
    }
    const h = Math.max(3.2, dL * Math.tan(LIVE_BUTTON_DEG / DEG))
    const gap = Math.max(1.3, dL * Math.tan(LIVE_BUTTON_GAP_DEG / DEG)) // ≥ 1.3 cm so the ray can't hit the wrong one
    const bd = this.buttonDist(dL)
    const wOf = (s: string) => Math.max(h * 1.5, textWidthCm(s.length, "Button", bd, false) + 1.6)
    const buttons: LiveButtonSpec[] = [{name: "UseThisWordButton", label: LABEL_USE, w: wOf(LABEL_USE), primary: true}]
    const max = live.maxSlots ?? 4
    if (live.phraseIds.length > 0 && live.phraseIds.length < max) {
      buttons.push({name: "AddWordButton", label: LABEL_ADD, w: wOf(LABEL_ADD), primary: false})
    }
    const w = buttons.reduce((a, s) => a + s.w, 0) + gap * (buttons.length - 1)
    return {kind: "buttons", h: h, w: w, gap: gap, buttons: buttons}
  }

  private applyLiveRow(row: LiveRowSpec, dL: number, k: number, xL: number, y: number): void {
    // buttons: reused while the set and the size bucket stay the same, otherwise rebuilt
    const key = row.kind === "buttons" ? row.buttons.map((s) => s.name).join(",") : ""
    const distChanged = sizeBucket(dL) !== sizeBucket(this.liveDist)
    if (key !== this.liveKey || (key !== "" && distChanged)) {
      for (const l of this.live) retire(l.parts.so, this) // safe inside a button callback
      this.live = []
      this.liveKey = key
      if (row.kind === "buttons") {
        useTone(TONE_LIVE)
        for (const spec of row.buttons) {
          const name = spec.name
          const parts = button(this.surface!.so, name, spec.w, row.h, spec.label, this.buttonDist(dL),
            () => this.onLiveButton(name), {asItem: false, tone: TONE_LIVE, primary: spec.primary})
          this.live.push({name: name, parts: parts})
        }
        this.liveDist = dL
      }
    }
    let x = xL
    row.buttons.forEach((spec, i) => {
      const l = this.live[i]
      if (l && !isNull(l.parts.so)) l.parts.so.getTransform().setLocalPosition(new vec3(x + spec.w / 2, y, LIVE_BUTTON_Z))
      x += spec.w + row.gap
    })
    // status: check icon + "In your phrase"
    const sr = this.statusRow!
    sr.enabled = row.kind === "status"
    if (row.kind === "status") {
      const icon = row.h * 0.9, tw = row.w - icon - 0.4 * k
      sr.getTransform().setLocalPosition(new vec3(0, y, WORDS_Z))
      this.statusIcon!.getTransform().setLocalPosition(new vec3(xL + icon / 2, 0, 0.04))
      this.statusIcon!.getTransform().setLocalScale(new vec3(icon, icon, 1))
      const st = this.statusText!
      applyTextRole(st, "Callout", dL, this.labelBoost)
      st.layoutRect = Rect.create(-tw / 2, tw / 2, -row.h / 2, row.h / 2)
      setTextColor(st, GREEN)
      st.getSceneObject().getTransform().setLocalPosition(new vec3(xL + icon + 0.4 * k + tw / 2, 0, 0))
    }
    this.liveControls = row.kind === "buttons" ? row.buttons.map((s) => s.name) : row.kind === "status" ? ["NameLabelStatus"] : []
  }

  /** Discreet bracket framing the object's silhouette as the user sees it, just in front of it. */
  private placeBracket(f: ViewFrame, objR: ScreenRect, dNear: number): void {
    const br = this.bracket
    if (!br) return
    const dB = Math.max(20, dNear - 0.6)
    const C = fromScreen(f, (objR.x0 + objR.x1) / 2, (objR.y0 + objR.y1) / 2, dB)
    const zB = C.sub(f.cam).dot(f.F)
    const bw = ((objR.x1 - objR.x0) / 2 / DEG) * zB + BRACKET_MARGIN_CM
    const bh = ((objR.y1 - objR.y0) / 2 / DEG) * zB + BRACKET_MARGIN_CM
    const bt = br.getTransform()
    bt.setWorldPosition(C)
    bt.setWorldRotation(faceRotation(C, f.cam, true))
    bt.setLocalScale(vec3.one())
    const th = Math.max(0.2, dB * 0.0032) // ≈ 3 mm at a metre
    const arm = clamp(Math.min(bw, bh) * 0.45, 1.0, 3.2)
    let i = 0
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const hArm = this.arms[i++].getTransform(), vArm = this.arms[i++].getTransform()
      hArm.setLocalPosition(new vec3(sx * (bw - arm / 2), sy * bh, 0))
      hArm.setLocalScale(new vec3(arm, th, th))
      vArm.setLocalPosition(new vec3(sx * bw, sy * (bh - arm / 2), 0))
      vArm.setLocalScale(new vec3(th, arm, th))
    }
    this.bracketHalf = new vec2(bw, bh)
    br.enabled = this.drawBracket // geometry is kept even when hidden: the connector starts at its edge
  }

  /** Thin line from the bracket edge to the nearest point of the label (R2 §6). */
  private placeConnector(): void {
    const link = this.link
    if (!link || !this.anchor || !this.bracket) return
    const at = this.anchor.getTransform(), P = at.getWorldPosition(), Ra = at.right, Ua = at.up
    const bt = this.bracket.getTransform(), C = bt.getWorldPosition(), Rb = bt.right, Ub = bt.up
    const bw = this.bracketHalf.x, bh = this.bracketHalf.y
    const pc = P.sub(C)
    const a = C.add(Rb.uniformScale(clamp(pc.dot(Rb), -bw, bw))).add(Ub.uniformScale(clamp(pc.dot(Ub), -bh, bh)))
    const q = a.sub(P)
    const bpt = P.add(Ra.uniformScale(clamp(q.dot(Ra), -this.surfaceW / 2, this.surfaceW / 2)))
      .add(Ua.uniformScale(clamp(q.dot(Ua), -this.surfaceH / 2, this.surfaceH / 2)))
    const d = bpt.sub(a)
    const len = d.length
    this.connectorLengthCm = len
    if (!this.drawConnector || len < 1.0) {
      link.enabled = false // touching: no line needed
      return
    }
    const lt = link.getTransform()
    lt.setWorldPosition(a.add(d.uniformScale(0.5)))
    lt.setWorldRotation(quat.rotationFromTo(vec3.right(), d.uniformScale(1 / len)))
    const th = Math.max(0.15, this.labelDistanceCm * 0.0026)
    lt.setLocalScale(new vec3(len, th, th)) // parent PointingUI has identity world rotation + unit scale
    link.enabled = true
  }

  /** Bracket + connector in the mode's tint; CYAN focus while the label itself is pointed at. */
  private paintAccent(): void {
    if (!this.link || !this.bracket) return
    const c = this.accentColor
    tint(this.link, c, true)
    tint(this.bracket, c, true)
  }

  private tick(): void {
    if (!this.isVisible || !this.target) return
    if (isNull(this.target.so)) {
      this.hide()
      return
    }
    if (this.isHovered) return // never move the label out from under the pointer
    const f = viewFrame()
    const moved = f.cam.distance(this.placedCam) > this.replaceMoveCm
    const turned = DEG * Math.acos(clamp(f.F.dot(this.placedLook), -1, 1)) > this.replaceTurnDeg
    if (moved || turned) this.placeNow()
  }
}

// ── helpers (pure) ──

/**
 * Bracket colour for WbwLearnController's per-object "Brackets" (plan D24), so that controller holds no colour
 * literals and never imports WbwSharedUI (Hard Rule 3): "learn" = Learn discovery markers, "live" = Use it live
 * highlight of the phrase's ingredients, "focus" = the word open on the card. Read at use time (never cache it),
 * so the builder's tone refinements in WbwSharedUI reach the brackets without a scene reset.
 */
export function markerTint(kind: "learn" | "live" | "focus"): vec4 {
  return kind === "focus" ? CYAN : toneOf(kind).tint
}

function modeOf(mode: string): NameLabelMode {
  return toneOf(mode) === TONE_LIVE ? "live" : "learn"
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

/** ~6 % distance steps: child UI (chip, live buttons) is rebuilt only when its size really changes. */
function sizeBucket(distCm: number): number {
  return Math.round(Math.log(Math.max(1, distCm)) / 0.06)
}

/**
 * World AABB of the meshes under a learnable wrapper (R2 §5). Skips the Learn discovery "Brackets"
 * and anything of ours, and disabled objects. Falls back to the padded collider box.
 */
export function worldBox(so: SceneObject, fallbackSize?: vec3): WorldBox {
  let mn = new vec3(1e9, 1e9, 1e9), mx = new vec3(-1e9, -1e9, -1e9), any = false
  const walk = (s: SceneObject) => {
    if (!s.enabled || s.name === "Brackets" || s.name === "PointingUI" || s.name.indexOf("NameLabel") === 0) return
    const r = s.getComponent("Component.RenderMeshVisual") as RenderMeshVisual
    if (r && r.enabled) {
      mn = vec3.min(mn, r.worldAabbMin())
      mx = vec3.max(mx, r.worldAabbMax())
      any = true
    }
    for (let i = 0; i < s.getChildrenCount(); i++) walk(s.getChild(i))
  }
  walk(so)
  if (!any) {
    const size = fallbackSize ?? new vec3(14, 10, 14)
    return {c: so.getTransform().getWorldPosition(), h: size.uniformScale(0.5)}
  }
  return {c: mn.add(mx).uniformScale(0.5), h: mx.sub(mn).uniformScale(0.5)}
}

/** Distance from p to the nearest point of the box (0 inside). */
function distanceToBox(p: vec3, b: WorldBox): number {
  const q = new vec3(
    clamp(p.x, b.c.x - b.h.x, b.c.x + b.h.x),
    clamp(p.y, b.c.y - b.h.y, b.c.y + b.h.y),
    clamp(p.z, b.c.z - b.h.z, b.c.z + b.h.z),
  )
  return p.distance(q)
}

/** Camera frame: F = look direction (SIK convention camera.back), R / U = the display's right / up. */
function viewFrame(): ViewFrame {
  const t = camTransform()
  return {cam: t.getWorldPosition(), F: t.back.normalize(), R: t.right.normalize(), U: t.up.normalize()}
}

/**
 * Gnomonic ("screen") coordinates in degree-like units: exact degrees at the centre, and the display
 * frustum is a rectangle here (±tan(half-angle)), which is what "inside the narrow view" means.
 */
function toScreen(f: ViewFrame, p: vec3): {x: number; y: number; z: number} {
  const v = p.sub(f.cam)
  const z = Math.max(5, v.dot(f.F))
  return {x: (DEG * v.dot(f.R)) / z, y: (DEG * v.dot(f.U)) / z, z: z}
}

function fromScreen(f: ViewFrame, x: number, y: number, dist: number): vec3 {
  const dir = f.F.add(f.R.uniformScale(x / DEG)).add(f.U.uniformScale(y / DEG)).normalize()
  return f.cam.add(dir.uniformScale(dist))
}

function screenRectOfBox(f: ViewFrame, b: WorldBox): ScreenRect {
  const r: ScreenRect = {x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9}
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    const s = toScreen(f, b.c.add(new vec3(sx * b.h.x, sy * b.h.y, sz * b.h.z)))
    r.x0 = Math.min(r.x0, s.x)
    r.x1 = Math.max(r.x1, s.x)
    r.y0 = Math.min(r.y0, s.y)
    r.y1 = Math.max(r.y1, s.y)
  }
  return r
}

/** A user-facing quad (e.g. the word card) of `size` cm centred at `pos`. */
function screenRectOfQuad(f: ViewFrame, pos: vec3, size: vec2): ScreenRect {
  const s = toScreen(f, pos)
  const hw = (DEG * (size.x / 2)) / s.z, hh = (DEG * (size.y / 2)) / s.z
  return {x0: s.x - hw, x1: s.x + hw, y0: s.y - hh, y1: s.y + hh}
}

function inflate(r: ScreenRect, m: number): ScreenRect {
  return {x0: r.x0 - m, x1: r.x1 + m, y0: r.y0 - m, y1: r.y1 + m}
}

function overlap(a: ScreenRect, b: ScreenRect): number {
  const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)
  const h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0)
  return w > 0 && h > 0 ? w * h : 0
}
