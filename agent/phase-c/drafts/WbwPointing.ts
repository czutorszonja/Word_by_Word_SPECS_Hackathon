// WbwPointing.ts — Phase C "point to reveal": the ONE silent hover arbiter + SIK ray-visual helpers.   [DRAFT]
// Port to: Assets/Scripts/WbwPointing.ts (INTEGRATION_PLAN.md §3.2). Replaces the old drafts/WbwPointer.ts.
// Spec: agent/phase-c/research/R2_pointing.md §1, §2, §4, §8; plan D1, D3, D4, D11; agreed design steps 2 and 6.
// Owns (WbwHoverArbiter, a plain class, NOT a @component — WbwLearnController creates and ticks it):
//   - the ONLY hover/trigger subscriptions on the Learnable_<id> Interactables (Specs hand ray, preview
//     mouse hover without a click, LEAF interactors: all arrive as Interactable.onInteractorHoverEnter/Exit),
//   - per-interactor hover tracking: hoveredId follows the interactor that most recently ENTERED a learnable,
//     so a stale preview mouse or the other hand is never a fallback,
//   - the anti-flicker label choice (labelForId), evaluated when the owner calls update() from its LateUpdate,
//   - Target-phase select forwarding (onSelected),
//   - the preview-only mouse-ray cleanup and the real pointerRayVisible signal.
// No label placement here (no meshBox / chooseLabelSpot): WbwNameLabelUI (drafts/WbwNameLabelUI.ts, ported
//   verbatim) places itself from the object's world AABB and re-places on head moves (plan §3.2, §3.3).
// Must NOT: play audio or SFX (pointing is silent: there is no audio import here on purpose), import
//   WbwSharedUI or create UI (Hard Rule 3), open cards, change the phrase, or move anything.
//
// ONE ARBITER ONLY. WbwLearnController creates exactly one WbwHoverArbiter in init() and DROPS its own
// onHoverEnter / onHoverExit / onTriggerEnd subscriptions on learnables (and Tracked.hovered). Never add a
// second LateUpdate arbiter, and never let a second code path call nameLabel.show() / hide().
//
// Owner wiring (WbwLearnController, plan §4.7; inside init(), which WbwMain calls in OnStart after
// cafe.build(), where SIK subscriptions belong):
//   this.hover = new WbwHoverArbiter(this.tracked.map((t) => ({id: t.l.id, interactable: t.l.interactable})),
//     {switchDwellSec: this.switchDwellSec, exitGraceSec: this.exitGraceSec})
//   this.hover.setHoldSource(() => !!this.nameLabel && this.nameLabel.hovered)   // pointer on the label keeps it
//   this.hover.setSuppressSource(() => this.wordCard.isVisible ? this.activeCardWordId : "")  // card names it
//   this.hover.onLabelChanged.add((c) => c.id ? this.showLabel(c.id) : this.hideLabel())  // NO audio on this path
//   this.hover.onSelected.add((s) => this.onObjectSelect(s.id))
//   this.createEvent("LateUpdateEvent").bind(() => this.hover.update())   // the label re-places itself (§3.3)
//   // readable state for LEAF / StoryTour (the names the tests read on t.learn):
//   get hoveredId(): string { return this.hover ? this.hover.hoveredId : "" }
//   get labelForId(): string { return this.hover ? this.hover.labelForId : "" }
//   get pointerRayVisible(): boolean { return this.hover ? this.hover.pointerRayVisible : false }
//   setPointMode(m):   this.pointMode = m
//                      this.hover.setLabelsEnabled(m !== "off" && !!this.nameLabel)
//                      this.hover.refresh()   // a label already up is re-shown in the NEW mode's style
//   setLiveSlots(...): if (this.labelMode === "live") this.hover.refresh()
//   onObjectSelect(id): pointMode "learn" && active → select(t);  "live" → this.hover.pin(id, 2)
//                      (D11: pins the label ~2 s; no phrase change, no audio, never the Learn card)
//   showLabel(id):     sets labelMode = pointMode (labelForId is the arbiter's; do not assign it)
//   hideLabel():       nameLabel.hide(); labelMode = ""
//   test hooks:        pointAtById(id) → this.hover.pointAt(id);  clearPoint() → this.hover.clearPoint()
//   OnDestroyEvent:    this.hover.dispose()
// Brackets (decided): the ONE hover bracket is WbwNameLabelUI's NameLabelBracket (drawBracket stays true),
//   tinted by the current mode through WbwSharedUI (toneOf(mode).tint; CYAN while the label is hovered).
//   WbwLearnController's "Brackets" are only the 3–4 Learn discovery markers and the live highlight:
//   refreshTint() and scan() stop looking at hover (no `t.hovered`, no hover-enable, no focusColor on
//   hover), so DC2's enabled-Brackets count never changes while pointing.
//
// APIs used (all verified in the sources):
//   SIK Interactable.onInteractorHoverEnter / onInteractorHoverExit / onTriggerEnd — Interactable.ts:92/:107/:127
//     (per-interactor, fired for every interactor even when another already hovers — InteractableEventHandler.ts:92-117)
//   Interactable.targetingVisual + enum TargetingVisual {None, Cursor, Ray} — Interactable.ts:16-20, :281
//   InteractorEvent.propagationPhase / .interactor — InteractorEvent.ts:35-66; Target phase — EventDispatcher.ts:94-106
//   Interactor.currentInteractable / .inputType — Interactor.ts:8-18, :66 (LEAF keeps it in sync:
//     Leaf BaseLeafInteractor.ts:395)
//   InteractorRayVisual._interactor / .cursor (public), OnDisableEvent hides the ray — InteractorRayVisual.ts:23,
//     :29, :55-58; RAY_VISIBILITY_THRESHOLD — :12; InteractorCursor.rayAlpha getter — InteractorCursor.ts:149
//   CursorController adds one InteractorRayVisual per interactor in its onStart — CursorController.ts:29-42
//   Lens: getTime() (StudioLib.d.ts:9), isNull (:60), SceneObject.getComponents (:12870),
//         ScriptScene.getRootObjectsCount/getRootObject (:13068/:13072), DeviceInfoSystem.isEditor() (:13607).
import {Interactable, TargetingVisual} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {Interactor, InteractorInputType} from "SpectaclesInteractionKit.lspkg/Core/Interactor/Interactor"
import {InteractorEvent} from "SpectaclesInteractionKit.lspkg/Core/Interactor/InteractorEvent"
import {
  InteractorRayVisual,
  RAY_VISIBILITY_THRESHOLD,
} from "SpectaclesInteractionKit.lspkg/Components/Interaction/InteractorRayVisual/InteractorRayVisual"
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"

/** Anything with a stable id and a SIK Interactable — WbwCafeBuilder's `Learnable` fits as is. */
export interface PointerTarget {
  id: string
  interactable: Interactable
}

export interface HoverArbiterOptions {
  /** Seconds a NEW object must stay pointed at before the label switches to it (mouse / LEAF). */
  switchDwellSec: number
  /** Same, for the Specs hand ray (it jitters more than the mouse). */
  handSwitchDwellSec: number
  /** Seconds the label stays after nothing is pointed at (bridges gaps between pans, time to reach the label). */
  exitGraceSec: number
  /** After a deliberate hide (select, card opened, clearFocus) the next first label waits this long. */
  reacquireSec: number
  /** Learnables show no SIK cursor/ray in the Preview (bracket + label are the feedback) and SIK's hand ray on Specs. */
  quietLearnableCursor: boolean
  /** Preview only: switch off SIK's mouse ray band (the Mouse InteractorRayVisual). Hover and click keep working. */
  hidePreviewMouseRay: boolean
}

export const DEFAULT_HOVER_OPTIONS: HoverArbiterOptions = {
  switchDwellSec: 0.12,
  handSwitchDwellSec: 0.15,
  exitGraceSec: 0.5,
  reacquireSec: 0.35,
  quietLearnableCursor: true,
  hidePreviewMouseRay: true,
}

export interface LabelChange {
  /** Learnable id the label should now show ("" = hide). */
  id: string
  /** Id it showed before ("" = none; equal to id on a refresh). */
  previousId: string
  /** Input of the interactor that produced it (hand / mouse / CustomController = LEAF; None = pin or test hook). */
  inputType: InteractorInputType
  /** true: same id, re-sent by refresh() so the owner re-styles it (mode switch, live slots changed). */
  refresh: boolean
}

export interface PointerSelect {
  id: string
  inputType: InteractorInputType
}

const HAND_INPUT = InteractorInputType.LeftHand | InteractorInputType.RightHand
/** Hover key of the test hook pointAt() (and of events that arrive without an interactor). */
const SYNTHETIC = "synthetic"
/** When to look for SIK's ray visuals (s after construction): CursorController creates them in its own onStart. */
const RAY_SCAN_AT = [0.05, 0.5, 1.5, 3.0]
/** After that, look again this often (self-heals a late CursorController; the walk covers the whole scene). */
const RAY_SCAN_EVERY_SEC = 5.0

type HoverKey = Interactor | string

export class WbwHoverArbiter {
  readonly options: HoverArbiterOptions

  // ── readable state (WbwLearnController mirrors hoveredId / labelForId / pointerRayVisible as getters) ──
  /** Raw: the learnable the most recently entering interactor points at now ("" = none). */
  hoveredId: string = ""
  /** Debounced: the learnable the hover label shows ("" = hidden). onLabelChanged fires when it changes. */
  labelForId: string = ""
  /** Every learnable some interactor points at right now (debugging; hoveredId is the one that counts). */
  hoverStackIds: string[] = []
  /** Input type of the interactor hoveredId comes from (None = nothing, pin or test hook). */
  activeInput: InteractorInputType = InteractorInputType.None
  /** Labels are offered only while true (Learn and Use it live). */
  labelsEnabled: boolean = false
  /** Learnable whose label is suppressed now (the word on the open card), from the suppress source. */
  suppressedId: string = ""
  /** True while the hold source (the pointer is on the label) keeps the label from switching or hiding. */
  holding: boolean = false
  /** Live pinch pin (D11): this id's label stays up until pinnedUntil while nothing else is pointed at. */
  pinnedId: string = ""
  pinnedUntil: number = 0
  /** True while any SIK InteractorRayVisual is drawing a ray (component on, cursor rayAlpha above threshold).
   *  Preview: must stay false (D4 — mouse ray off, learnables TargetingVisual.None). Specs: true while SIK's
   *  hand ray shows on a learnable (intended). */
  pointerRayVisible: boolean = false
  /** InteractorRayVisual components found by the last scan (0 = CursorController has not run yet). */
  rayVisualsFound: number = 0
  /** Mouse InteractorRayVisual components this arbiter has switched off so far (Preview only). */
  mouseRayVisualsHidden: number = 0
  /** Number of label changes so far (flicker checks). */
  labelChanges: number = 0
  /** Number of Target-phase selects forwarded so far. */
  selectCount: number = 0

  private _onLabelChanged = new Event<LabelChange>()
  private _onSelected = new Event<PointerSelect>()
  /** labelForId changed (debounced), or refresh(). Never accompanied by audio. */
  get onLabelChanged(): PublicApi<LabelChange> { return this._onLabelChanged.publicApi() }
  /** Pinch / click released on a learnable (Target phase). The owner decides what it means per mode. */
  get onSelected(): PublicApi<PointerSelect> { return this._onSelected.publicApi() }

  private byId: Map<string, Interactable> = new Map()
  private targetOf: Map<HoverKey, string> = new Map()
  private inputOf: Map<HoverKey, InteractorInputType> = new Map()
  private activeKey: HoverKey | null = null
  private holdSource: (() => boolean) | null = null
  private suppressSource: (() => string) | null = null
  private candId = ""
  private candSince = 0
  private lostAt = -1
  private forcedHideAt = -1000
  private readonly editor: boolean
  private readonly startedAt: number
  private scanIndex = 0
  private nextScanAt: number
  private rayVisuals: InteractorRayVisual[] = []
  private unsubs: (() => void)[] = []

  /**
   * Subscribes to every learnable at once. Construct it in OnStart (SIK subscriptions belong there), after
   * WbwCafeBuilder.build() created the Interactables. Nothing happens until the owner calls update().
   */
  constructor(targets: PointerTarget[], options?: Partial<HoverArbiterOptions>) {
    const o: HoverArbiterOptions = {...DEFAULT_HOVER_OPTIONS}
    if (options) {
      for (const k of Object.keys(options) as (keyof HoverArbiterOptions)[]) {
        const v = options[k]
        if (v !== undefined && v !== null) (o as unknown as Record<string, unknown>)[k] = v
      }
    }
    this.options = o
    this.editor = global.deviceInfoSystem.isEditor()
    this.startedAt = getTime()
    this.nextScanAt = this.startedAt + RAY_SCAN_AT[0]
    for (const t of targets) {
      const it = t.interactable
      if (!it || isNull(it) || this.byId.has(t.id)) continue
      this.byId.set(t.id, it)
      // Visual only (InteractableScoring skips None for the cursor blend; targeting is unchanged).
      if (o.quietLearnableCursor) it.targetingVisual = this.editor ? TargetingVisual.None : TargetingVisual.Ray
      this.unsubs.push(it.onInteractorHoverEnter.add((e: InteractorEvent) => this.onEnter(t.id, e)))
      this.unsubs.push(it.onInteractorHoverExit.add((e: InteractorEvent) => this.onExit(t.id, e)))
      this.unsubs.push(it.onTriggerEnd.add((e: InteractorEvent) => this.onTriggerEnd(t.id, e)))
    }
    print(`WbwPointing: one hover arbiter on ${this.byId.size} learnables (silent)`)
  }

  /** Unsubscribe from every learnable (owner's OnDestroyEvent). */
  dispose(): void {
    for (const u of this.unsubs) u()
    this.unsubs = []
    this.targetOf.clear()
    this.inputOf.clear()
  }

  /** Offer labels (Learn / Use it live) or not (Practice / none). Turning off hides at once and drops a pin. */
  setLabelsEnabled(on: boolean): void {
    this.labelsEnabled = on
    if (!on) {
      this.pinnedId = ""
      this.setLabel("", true)
    }
  }

  /** Re-send onLabelChanged for the label already up, so the owner re-shows it in the current style
   *  (call after a Learn ↔ Use it live switch and when the live phrase slots change). No-op when hidden. */
  refresh(): void {
    if (this.labelForId === "") return
    this._onLabelChanged.invoke({id: this.labelForId, previousId: this.labelForId, inputType: this.activeInput, refresh: true})
  }

  /** While this returns true the label never switches or hides (e.g. the pointer is on the label or its buttons). */
  setHoldSource(fn: (() => boolean) | null): void {
    this.holdSource = fn
  }

  /** Returns the learnable whose label must not show (the word on the open card; "" = none). Read every
   *  update(): a label for that id is hidden at once (no grace), and it counts as a deliberate hide. */
  setSuppressSource(fn: (() => string) | null): void {
    this.suppressSource = fn
  }

  /** Live pinch (D11): keep this id's label up for `seconds` while nothing else is pointed at. */
  pin(id: string, seconds: number): void {
    if (!this.byId.has(id)) return
    this.pinnedId = id
    this.pinnedUntil = getTime() + Math.max(0, seconds)
  }

  /** Hide the label now (deliberate: the next first label waits reacquireSec). The pointer picks the next one. */
  clearFocus(): void {
    this.pinnedId = ""
    this.setLabel("", true)
  }

  /** True while any interactor points at this learnable. */
  isHovered(id: string): boolean {
    return this.hoverStackIds.indexOf(id) >= 0
  }

  /** Test hook (learn.pointAtById): act as a pointer on this learnable until clearPoint(). */
  pointAt(id: string): boolean {
    if (!this.byId.has(id)) return false
    this.targetOf.set(SYNTHETIC, id)
    this.inputOf.set(SYNTHETIC, InteractorInputType.None)
    this.activeKey = SYNTHETIC
    this.recompute()
    return true
  }

  /** Test hook (learn.clearPoint): the synthetic pointer leaves. */
  clearPoint(): void {
    if (this.targetOf.delete(SYNTHETIC)) this.recompute()
  }

  // ── SIK events (Target phase only: R2 §2.2, ignore events bubbling from descendants) ──
  private onEnter(id: string, e: InteractorEvent): void {
    if (e.propagationPhase !== "Target") return
    const key: HoverKey = e.interactor ? e.interactor : SYNTHETIC
    this.targetOf.set(key, id)
    this.inputOf.set(key, e.interactor ? e.interactor.inputType : InteractorInputType.None)
    this.activeKey = key // the interactor that moved most recently is the one the learner uses
    this.recompute()
  }

  private onExit(id: string, e: InteractorEvent): void {
    if (e.propagationPhase !== "Target") return
    const key: HoverKey = e.interactor ? e.interactor : SYNTHETIC
    if (this.targetOf.get(key) === id) this.targetOf.delete(key)
    this.recompute()
  }

  private onTriggerEnd(id: string, e: InteractorEvent): void {
    if (e.propagationPhase !== "Target") return
    this.selectCount++
    this._onSelected.invoke({id: id, inputType: e.interactor ? e.interactor.inputType : InteractorInputType.None})
  }

  /** hoveredId follows ONLY the active interactor: when it points at nothing, hoveredId is "" even if a stale
   *  mouse ray or the other hand still rests on some learnable (they never send an exit). */
  private recompute(): void {
    const id = this.activeKey !== null ? this.targetOf.get(this.activeKey) : undefined
    this.hoveredId = id ?? ""
    this.activeInput = id !== undefined && this.activeKey !== null
      ? (this.inputOf.get(this.activeKey) ?? InteractorInputType.None)
      : InteractorInputType.None
    const ids: string[] = []
    this.targetOf.forEach((v) => {
      if (ids.indexOf(v) < 0) ids.push(v)
    })
    this.hoverStackIds = ids
  }

  // ── arbiter (R2 §4 / plan D3): owner calls this from its LateUpdateEvent (SIK dispatched this frame's
  //    hover in its own UpdateEvent). Show at once, switch after a dwell, hide after a grace, never inside
  //    a SIK exit callback. ──
  update(): void {
    const now = getTime()
    this.pruneStale()
    this.updateRays(now)
    const hold = this.readHold()
    this.holding = hold
    const suppressed = this.readSuppressed()
    this.suppressedId = suppressed
    // The open card already names this word: its label goes at once (no grace) — a deliberate hide.
    if (suppressed !== "" && this.labelForId === suppressed) this.setLabel("", true)
    let want = this.hoveredId
    if (want === "" && this.pinnedId !== "" && now < this.pinnedUntil) want = this.pinnedId // D11 live pinch pin
    if (!this.labelsEnabled || (want !== "" && want === suppressed)) want = ""
    if (want !== "" && want !== this.labelForId) {
      if (this.candId !== want) {
        this.candId = want
        this.candSince = now
      }
      if (!hold && now - this.candSince >= this.dwellFor(want)) this.setLabel(want, false)
    } else {
      this.candId = ""
    }
    if (want === "" && this.labelForId !== "" && !hold) {
      if (this.lostAt < 0) this.lostAt = now
      if (now - this.lostAt >= this.options.exitGraceSec) this.setLabel("", false)
    } else {
      this.lostAt = -1
    }
  }

  private dwellFor(id: string): number {
    if (this.labelForId !== "") {
      const input = this.hoveredId === id ? this.activeInput : InteractorInputType.None
      return (input & HAND_INPUT) !== 0 ? this.options.handSwitchDwellSec : this.options.switchDwellSec
    }
    // First label after none: at once — unless a label was hidden on purpose moments ago (select through the
    // label, card opened, clearFocus). The pointer has not moved, so it now hits whatever sat behind that
    // label; it must stay there reacquireSec before that neighbour's label appears beside the new card.
    return this.candSince - this.forcedHideAt < this.options.reacquireSec ? this.options.reacquireSec : 0
  }

  private readHold(): boolean {
    if (!this.holdSource) return false
    try {
      return !!this.holdSource()
    } catch (err) {
      return false
    }
  }

  private readSuppressed(): string {
    if (!this.suppressSource) return ""
    try {
      return this.suppressSource() || ""
    } catch (err) {
      return ""
    }
  }

  /** Self-heal: drop entries whose Interactable is gone or disabled, or whose interactor no longer targets
   *  it (missed exit: interactor disabled, hand lost tracking). The LEAF interactor keeps currentInteractable
   *  in sync too, and two LEAF interactors sharing the CustomController bit do not confuse this check. */
  private pruneStale(): void {
    if (this.targetOf.size === 0) return
    let changed = false
    for (const [key, id] of Array.from(this.targetOf.entries())) {
      const it = this.byId.get(id)
      let stale = !it || isNull(it) || !it.enabled || !it.getSceneObject().isEnabledInHierarchy
      if (!stale && typeof key !== "string") stale = isNull(key) || key.currentInteractable !== it
      if (stale) {
        this.targetOf.delete(key)
        changed = true
      }
    }
    if (changed) this.recompute()
  }

  private setLabel(id: string, deliberate: boolean): void {
    if (id === this.labelForId) return
    if (id === "" && deliberate) this.forcedHideAt = getTime()
    const prev = this.labelForId
    this.labelForId = id
    this.candId = ""
    this.lostAt = -1
    this.labelChanges++
    const input = id !== "" && id === this.hoveredId ? this.activeInput : InteractorInputType.None
    this._onLabelChanged.invoke({id: id, previousId: prev, inputType: input, refresh: false})
  }

  // ── SIK ray visuals (R2 §8): find them a few times early, then every RAY_SCAN_EVERY_SEC; hide the Mouse one
  //    in the Preview; pointerRayVisible is read from the cached list every frame (cheap). ──
  private updateRays(now: number): void {
    if (now >= this.nextScanAt) {
      this.rayVisuals = findRayVisuals()
      this.rayVisualsFound = this.rayVisuals.length
      if (this.editor && this.options.hidePreviewMouseRay) this.mouseRayVisualsHidden += hideMouseRayVisual(this.rayVisuals)
      this.scanIndex++
      this.nextScanAt = this.scanIndex < RAY_SCAN_AT.length ? this.startedAt + RAY_SCAN_AT[this.scanIndex] : now + RAY_SCAN_EVERY_SEC
    }
    let drawing = false
    for (const v of this.rayVisuals) {
      if (isRayDrawing(v)) {
        drawing = true
        break
      }
    }
    this.pointerRayVisible = drawing
  }
}

/**
 * Switch off every enabled InteractorRayVisual that draws the Mouse interactor's ray (R2 §8 step 2). Disabling
 * the component runs its OnDisableEvent → hideVisual (InteractorRayVisual.ts:55-58, :87-103). Do not just
 * disable its RayModel child: update() re-enables it every frame (:174). The mouse cursor ring, hover and click
 * are untouched. Pass a list to skip the scene walk. Returns how many were switched off now. Editor only.
 */
export function hideMouseRayVisual(visuals?: InteractorRayVisual[]): number {
  let n = 0
  for (const v of visuals ?? findRayVisuals()) {
    if (v && !isNull(v) && v.enabled && v._interactor && v._interactor.inputType === InteractorInputType.Mouse) {
      v.enabled = false
      n++
    }
  }
  return n
}

/** How many Mouse ray visuals exist (enabledOnly: only those whose component is still on). LEAF "no band" aid. */
export function countMouseRayVisuals(enabledOnly: boolean = true): number {
  let n = 0
  for (const v of findRayVisuals()) {
    if (v._interactor && v._interactor.inputType === InteractorInputType.Mouse && (!enabledOnly || v.enabled)) n++
  }
  return n
}

/** True while this ray visual is drawing: component on, in an enabled hierarchy, cursor alpha above threshold. */
function isRayDrawing(v: InteractorRayVisual): boolean {
  if (!v || isNull(v) || !v.enabled || !v.getSceneObject().isEnabledInHierarchy) return false
  const c = v.cursor
  return !!c && !isNull(c) && c.rayAlpha > RAY_VISIBILITY_THRESHOLD
}

/** Every InteractorRayVisual in the scene (CursorController puts them on its own SceneObject). */
function findRayVisuals(): InteractorRayVisual[] {
  const out: InteractorRayVisual[] = []
  const walk = (so: SceneObject) => {
    const comps = so.getComponents(InteractorRayVisual.getTypeName()) as unknown as InteractorRayVisual[]
    for (const v of comps) if (v && !isNull(v)) out.push(v)
    for (let i = 0; i < so.getChildrenCount(); i++) walk(so.getChild(i))
  }
  for (let i = 0; i < global.scene.getRootObjectsCount(); i++) walk(global.scene.getRootObject(i))
  return out
}
