// WbwLearnController.ts — Learn mode, plus "point to reveal" in Learn and in Use it live.
// Owns: the 3–4 discovery markers ("Brackets", attached to the nearest learnable objects in view)
//       and the live highlight on the same objects; the ONE hover arbiter (WbwHoverArbiter, ticked
//       in LateUpdate) and what the hover label shows per mode; select (the object or its label)
//       → the steady word card, which plays the word once (selecting it again replays, the card
//       does not move); Listen again; Save (→ WbwSession; the card stays open); the card's
//       "Use it live" link (→ onUseLive); closing the card on its close button, another select,
//       walk-away or leaving Learn. In Use it live the label's buttons are only forwarded
//       (onUse / onAdd) and pinching an ingredient only pins its label.
//       Review (no mode picked yet, e.g. outside before going in): only the street and park things
//       outside (words saved on earlier outings) answer to pointing; a pinch says the word once.
// Expects: init(session, audio, hud, learnables) from WbwMain; @input wordCard; nameLabel wired in
//          the scene or assigned by WbwMain before init() (without it there are no hover labels).
// Must NOT: own the saved-word list (WbwSession does), touch order or phrase state, play any sound
//           for pointing (hover, label and pointer dot are silent), build UI or hold colours itself
//           (marker tints are asked from WbwNameLabelUI.markerTint() at use time).
// Stable names: Brackets (child of each Learnable_<id>; hidden while that object's label shows).
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {WbwWordCardUI} from "./WbwWordCardUI"
import {markerTint, NameLabelLiveState, WbwNameLabelUI} from "./WbwNameLabelUI"
import {WbwHoverArbiter} from "./WbwPointing"
import {canUseInPhrase, MAX_SLOTS} from "./WbwPhraseHelperModel"
import {WbwAudioController} from "./WbwAudioController"
import {WbwHudUI} from "./WbwHudUI"
import {Learnable} from "./WbwCafeBuilder"
import {WbwSession} from "./WbwSession"
import {WORDS, WordEntry, earlierWordById, learnableWord} from "./WbwVocab"
import {box, group, tint} from "./WbwGeo"
import {angleToDeg, camLook, camPos, flat, horizDist, placeFacingUser} from "./WbwSpatial"

/** Use it live: a pinch on an ingredient keeps its label up this long (s). It changes nothing else. */
const LIVE_PIN_SEC = 2

/** How a learnable's Brackets are painted: Learn discovery marker · the open card's word · live highlight. */
type MarkerLook = "learn" | "focus" | "live"

interface Tracked {
  l: Learnable
  word: WordEntry
  bracket: SceneObject
  look: MarkerLook // the look painted last, so the tint is only set again when it changes
}

@component
export class WbwLearnController extends BaseScriptComponent {
  @ui.label("WbwLearnController – point to reveal, discovery markers, word card, save")
  @ui.separator
  @ui.group_start("References")
  @input
  @hint("Word card UI module")
  wordCard!: WbwWordCardUI
  @input @allowUndefined @hint("Hover label UI module (WbwMain creates and assigns one when this is empty)") nameLabel: WbwNameLabelUI | undefined
  @ui.group_end
  @ui.group_start("Settings")
  @input
  @hint("How many learnable objects are bracketed at once (brief: 3–4)")
  @widget(new SliderWidget(1, 6, 1))
  maxBrackets: number = 4

  @input
  @hint("Half-angle (deg) of the 'in view' cone used to pick bracketed objects")
  @widget(new SliderWidget(15, 60, 1))
  viewConeDeg: number = 38

  @input
  @hint("Only objects closer than this are bracketed (cm)")
  @widget(new SliderWidget(100, 600, 10))
  maxDistanceCm: number = 300

  @input
  @hint("The word card hides when the user walks this far away (cm) — brief: ~1.5 m")
  @widget(new SliderWidget(50, 300, 10))
  walkAwayCm: number = 150

  @input
  @hint("Distance from the user at which the word card opens (cm) — brief: 60–80 cm")
  @widget(new SliderWidget(50, 90, 1))
  cardDistanceCm: number = 68

  @input
  @hint("Half width of the Specs view (deg) — the word card is kept fully inside it")
  @widget(new SliderWidget(10, 30, 0.5))
  viewHalfWidthDeg: number = 16

  @input
  @hint("Half height of the Specs view (deg)")
  @widget(new SliderWidget(10, 30, 0.5))
  viewHalfHeightDeg: number = 19

  @input
  @hint("The word card stays above this angle below the gaze (deg) so it never covers the HUD strip")
  @widget(new SliderWidget(5, 19, 0.5))
  hudClearDeg: number = 11.5

  @input
  @hint("A new object must be pointed at this long before the hover label switches to it (s)")
  @widget(new SliderWidget(0, 0.5, 0.01))
  switchDwellSec: number = 0.12

  @input
  @hint("The hover label stays this long after nothing is pointed at (s)")
  @widget(new SliderWidget(0, 1.5, 0.05))
  exitGraceSec: number = 0.5
  @ui.group_end

  // ── readable state for tests ──
  /** True while Learn mode is active. */
  active: boolean = false
  /** Word id on the open card ("" if none). */
  activeCardWordId: string = ""
  /** Hungarian word on the open card ("" if none). */
  activeCardWord: string = ""
  /** Ids of the 3–4 objects chosen for a discovery marker (the labelled one included; its own Brackets hide). */
  bracketedIds: string[] = []
  /** Ids of every learnable object in the café. */
  learnableIds: string[] = []
  /** Ids highlighted outside Learn mode (ingredients named by the offered phrases or the phrase helper). */
  highlightIds: string[] = []
  /** "learn" | "live" | "review" while a hover label is up, else "". */
  labelMode: string = ""
  /** "off" | "learn" | "live" | "review": whether pointing shows a label, and in which mode's style (set by WbwMain).
   *  "review" = no mode picked yet: only the earlier-outing words outside answer (label; a pinch says the word). */
  pointMode: string = "off"
  /** Review pinches that played a word (tests). */
  reviewPlays: number = 0
  /** Word id of the last review pinch ("" if none). */
  lastReviewId: string = ""
  /** Pronunciation plays for the card that is open (1 right after it opens). */
  cardPlayCount: number = 0
  /** Raw: the learnable pointed at right now ("" = none). */
  get hoveredId(): string { return this.hover ? this.hover.hoveredId : "" }
  /** Debounced: the learnable the hover label shows ("" = hidden). */
  get labelForId(): string { return this.hover ? this.hover.labelForId : "" }
  /** True while a SIK ray visual is drawing (never in the Preview; SIK's hand ray on device). */
  get pointerRayVisible(): boolean { return this.hover ? this.hover.pointerRayVisible : false }
  /** True while the pointer dot is drawn on the pointed-at object (Preview mouse / LEAF pointer only). */
  get pointerDotVisible(): boolean { return !!this.nameLabel && this.nameLabel.pointerDotVisible }
  /** Word id on the open card ("" if none); same as activeCardWordId. */
  get cardWordId(): string { return this.activeCardWordId }

  private _onUseLive = new Event<string>()
  private _onUse = new Event<string>()
  private _onAdd = new Event<string>()
  /** "Use it live" on the word card was pressed; the argument is the card's word id. */
  get onUseLive(): PublicApi<string> { return this._onUseLive.publicApi() }
  /** "Use this word" on the hover label (Use it live); the argument is the word id. */
  get onUse(): PublicApi<string> { return this._onUse.publicApi() }
  /** "Add (+ és)" on the hover label (Use it live); the argument is the word id. */
  get onAdd(): PublicApi<string> { return this._onAdd.publicApi() }

  private session!: WbwSession
  private audio!: WbwAudioController
  // kept for the unchanged init() signature (the card no longer flies to the Saved counter)
  private hud!: WbwHudUI
  private tracked: Tracked[] = []
  private hover: WbwHoverArbiter | null = null
  private liveSlotIds: string[] = []
  private liveCanEdit = false
  private openedAt: vec3 = vec3.zero()
  private nextScan = 0

  init(session: WbwSession, audio: WbwAudioController, hud: WbwHudUI, learnables: Learnable[]): void {
    this.session = session
    this.audio = audio
    this.hud = hud
    for (const l of learnables) {
      const w = learnableWord(l.id)
      if (!w) continue
      this.tracked.push({l: l, word: w, bracket: this.makeBracket(l), look: "learn"})
      this.learnableIds.push(l.id)
    }
    // The ONE hover arbiter: it holds the only hover / trigger subscriptions on the learnables.
    const hover = new WbwHoverArbiter(
      this.tracked.map((t) => ({id: t.l.id, interactable: t.l.interactable})),
      {switchDwellSec: this.switchDwellSec, exitGraceSec: this.exitGraceSec},
    )
    this.hover = hover
    hover.setHoldSource(() => !!this.nameLabel && this.nameLabel.hovered) // the pointer on the label keeps it up
    hover.setSuppressSource(() => (this.wordCard.isVisible ? this.activeCardWordId : "")) // the card already names it
    hover.setLabelFilter((id) => this.pointMode !== "review" || !!earlierWordById(id)) // review: only the outside words
    hover.onLabelChanged.add((c) => {
      if (c.id) this.showLabel(c.id)
      else this.hideLabel()
    })
    hover.onSelected.add((s) => this.onObjectSelect(s.id))
    hover.setLabelsEnabled(this.pointMode !== "off" && !!this.nameLabel)
    this.wordCard.onPlay.add(() => this.playWord())
    this.wordCard.onSave.add(() => this.saveCurrent())
    this.wordCard.onClose.add(() => this.closeCard())
    this.wordCard.onUseLive.add(() => this.useLiveFromCard())
    if (this.nameLabel) {
      this.nameLabel.setObstacles(learnables)
      // Learn: selecting the label is selecting the object. Use it live: the label surface does nothing.
      this.nameLabel.onSelect.add((s) => {
        if (this.pointMode === "learn") this.selectById(s.id)
        else if (this.pointMode === "review") this.reviewSay(s.id)
      })
      this.nameLabel.onUseWord.add((id) => this._onUse.invoke(id))
      this.nameLabel.onAddWord.add((id) => this._onAdd.invoke(id))
    }
    this.createEvent("UpdateEvent").bind(() => this.tick())
    this.createEvent("LateUpdateEvent").bind(() => this.lateTick())
    this.createEvent("OnDestroyEvent").bind(() => {
      if (this.hover) this.hover.dispose()
    })
    print(`WbwLearn: tracking ${this.tracked.length} learnable objects (${WORDS.length} words in vocab)`)
  }

  setActive(on: boolean): void {
    this.active = on
    if (!on) {
      this.closeCard()
      this.bracketedIds = []
    } else {
      this.highlightIds = []
      this.nextScan = 0
    }
    this.applyBrackets()
  }

  /** Soft highlight on these objects while Learn mode is off (e.g. ordering). */
  setHighlight(ids: string[]): void {
    this.highlightIds = ids.filter((id) => this.learnableIds.indexOf(id) >= 0)
    this.applyBrackets()
  }

  /** Programmatic select (same as pinching the object in Learn) — handy for tests. */
  selectById(id: string): boolean {
    const t = this.trackedById(id)
    if (!t) return false
    this.select(t)
    return true
  }

  /** Whether pointing shows a label, and in which mode's style. Called by WbwMain on every mode change. */
  setPointMode(m: "off" | "learn" | "live" | "review"): void {
    this.pointMode = m
    if (!this.hover) return
    this.hover.setLabelsEnabled(m !== "off" && !!this.nameLabel) // off hides the label at once and drops a pin
    this.hover.refresh() // a label that is up is re-shown in the new mode's style
  }

  /** Use it live: the ingredient ids in the phrase and whether the phrase can be edited now (order controller). */
  setLiveSlots(ids: string[], canEdit: boolean): void {
    const same = canEdit === this.liveCanEdit && ids.join(",") === this.liveSlotIds.join(",")
    this.liveSlotIds = ids.slice()
    this.liveCanEdit = canEdit
    if (!same && this.labelMode === "live" && this.hover) this.hover.refresh()
  }

  /** Test hook: act as a pointer resting on this learnable until clearPoint(). Silent, like any pointing. */
  pointAtById(id: string): boolean {
    return this.hover ? this.hover.pointAt(id) : false
  }

  /** Test hook: the pointer of pointAtById() leaves. */
  clearPoint(): void {
    if (this.hover) this.hover.clearPoint()
  }

  // ── pointing: the hover label (silent — nothing on this path may call this.audio) ──
  private onObjectSelect(id: string): void {
    if (this.pointMode === "learn" && this.active) {
      const t = this.trackedById(id)
      if (t) this.select(t)
    } else if (this.pointMode === "live") {
      // a pinch on an ingredient only pins its label; only the label's buttons change the phrase
      if (this.hover) this.hover.pin(id, LIVE_PIN_SEC)
    } else if (this.pointMode === "review") {
      this.reviewSay(id)
    }
  }

  /** Review: a pinch on (or on the label of) a street / park thing outside says its word once. */
  private reviewSay(id: string): void {
    if (!earlierWordById(id)) return
    const t = this.trackedById(id)
    if (!t) return
    this.reviewPlays++
    this.lastReviewId = id
    this.audio.playVoice(t.word.audio, () => {})
    if (this.hover) this.hover.pin(id, LIVE_PIN_SEC) // the label stays while the word plays
  }

  private showLabel(id: string): void {
    const t = this.trackedById(id)
    if (!t) return
    if (this.nameLabel) {
      this.nameLabel.show(
        {id: id, hu: t.word.hu, en: t.word.en, so: t.l.so, size: t.l.size},
        // review labels wear the Learn style (no buttons; the pinch says the word)
        {mode: this.pointMode === "review" ? "learn" : this.pointMode, live: this.liveStateFor(id), card: this.cardObstacle()},
      )
    }
    this.labelMode = this.pointMode
    this.applyBrackets()
  }

  private hideLabel(): void {
    if (this.nameLabel) this.nameLabel.hide()
    this.labelMode = ""
    this.applyBrackets()
  }

  /** Buttons on the live label: only for the 15 phrase ingredients and only while the phrase can be edited. */
  private liveStateFor(id: string): NameLabelLiveState | undefined {
    if (this.pointMode !== "live") return undefined
    return {phraseIds: this.liveSlotIds, maxSlots: MAX_SLOTS, usable: this.liveCanEdit && canUseInPhrase(id)}
  }

  /** The open word card as a box the label keeps clear of (null while no card is open). */
  private cardObstacle(): {pos: vec3; size: vec2} | null {
    if (!this.wordCard.isVisible) return null
    return {pos: this.wordCard.getSceneObject().getTransform().getWorldPosition(), size: this.wordCard.cardSize}
  }

  private lateTick(): void {
    const hover = this.hover
    if (!hover) return
    hover.update() // SIK dispatched this frame's hover in its own update; show / switch / hide the label now
    if (this.nameLabel) this.nameLabel.setPointerDot(hover.pointerDotVisible ? hover.pointerDotPos : null, this.pointMode)
  }

  private trackedById(id: string): Tracked | null {
    for (const t of this.tracked) if (t.l.id === id) return t
    return null
  }

  // ── selection & card ──
  private select(t: Tracked): void {
    if (!this.active) return
    this.audio.playSfx("UiClick")
    const w = t.word
    // Selecting the object whose card is open replays the word; the card is not rebuilt or moved.
    if (this.wordCard.isVisible && this.activeCardWordId === w.id) {
      this.speak(w.audio, "word")
      return
    }
    // a word from an earlier outing (outside) is saved already and is not part of ordering: no Use it live link
    const earlier = !!earlierWordById(w.id)
    this.wordCard.show({id: w.id, hu: w.hu, en: w.en, saved: earlier || this.session.isSaved(w.id), live: !earlier})
    this.activeCardWordId = w.id
    this.activeCardWord = w.hu
    this.cardPlayCount = 0
    // The card opens once and then stays put (no head-follow). It sits just ABOVE the object so the
    // object stays visible, horizontally toward the object but kept fully inside the narrow view.
    const cam = camPos()
    const objT = t.l.so.getTransform().getWorldPosition()
    const look = camLook()
    const size = this.wordCard.cardSize
    const D = this.cardDistanceCm
    const halfWDeg = (Math.atan2(size.x / 2, D) * 180) / Math.PI
    const halfHDeg = (Math.atan2(size.y / 2, D) * 180) / Math.PI
    const maxYaw = Math.max(0, this.viewHalfWidthDeg - halfWDeg - 1)
    const maxPitch = Math.max(0, this.viewHalfHeightDeg - halfHDeg - 1)
    const lookYaw = Math.atan2(look.x, -look.z), lookPitch = Math.asin(Math.max(-1, Math.min(1, look.y)))
    const to = objT.sub(cam).normalize()
    let yaw = Math.atan2(to.x, -to.z) - lookYaw
    while (yaw > Math.PI) yaw -= 2 * Math.PI
    while (yaw < -Math.PI) yaw += 2 * Math.PI
    // object's top edge, then the card's half height above it
    const objTopPitch = Math.asin(Math.max(-1, Math.min(1, objT.add(new vec3(0, t.l.size.y / 2 + 1.5, 0)).sub(cam).normalize().y)))
    let pitch = objTopPitch + ((halfHDeg + 1) * Math.PI) / 180 - lookPitch
    const clampRad = (v: number, m: number) => Math.max(-(m * Math.PI) / 180, Math.min((m * Math.PI) / 180, v))
    yaw = clampRad(yaw, maxYaw)
    pitch = clampRad(pitch, maxPitch)
    // keep the card's bottom edge above the low HUD strip so the two never overlap
    const minPitch = ((-this.hudClearDeg + halfHDeg + 1) * Math.PI) / 180
    if (pitch < minPitch) pitch = minPitch
    const fy = lookYaw + yaw, fp = lookPitch + pitch
    const dir = new vec3(Math.sin(fy) * Math.cos(fp), Math.sin(fp), -Math.cos(fy) * Math.cos(fp))
    const pos = cam.add(dir.uniformScale(D))
    placeFacingUser(this.wordCard.getSceneObject(), pos)
    this.openedAt = cam
    this.speak(w.audio, "word")
    this.applyBrackets()
    // a label that is up for ANOTHER word keeps clear of the new card (this word's own label is
    // hidden by the arbiter's suppress source in this frame's LateUpdate)
    if (this.nameLabel && this.labelForId !== "" && this.labelForId !== w.id) this.nameLabel.refresh({card: this.cardObstacle()})
  }

  /** "Listen again" on the card. */
  private playWord(): void {
    const w = learnableWord(this.activeCardWordId)
    if (w) this.speak(w.audio, "word")
  }

  /** Play a clip and show "Playing pronunciation" on the card until it ends. */
  private speak(key: string, kind: string): void {
    const shownId = this.activeCardWordId
    if (kind === "word") this.cardPlayCount++
    this.wordCard.setPlaying(kind)
    this.audio.playVoice(key, () => {
      if (this.wordCard.currentWordId === shownId && this.wordCard.playing === kind) this.wordCard.setPlaying("")
    })
  }

  /** Save keeps the card open ("Saved" on its control). It never orders and never fills the phrase. */
  private saveCurrent(): void {
    const id = this.activeCardWordId
    if (!id) return
    this.session.save(id)
    this.audio.playSfx("SaveConfirm")
    this.wordCard.setSaved()
  }

  private closeCard(): void {
    const wasOpen = this.wordCard.isVisible
    if (wasOpen) this.wordCard.hide()
    this.activeCardWordId = ""
    this.activeCardWord = ""
    this.applyBrackets()
    if (wasOpen && this.nameLabel) this.nameLabel.refresh({card: null})
  }

  /** "Use it live" on the card: close it and hand the word to WbwMain, which switches the mode. */
  private useLiveFromCard(): void {
    const id = this.activeCardWordId
    this.closeCard()
    this._onUseLive.invoke(id)
  }

  // ── brackets ──
  private makeBracket(l: Learnable): SceneObject {
    const root = group(l.so, "Brackets")
    const w = l.size.x / 2 + 1.5, h = l.size.y / 2 + 1.5
    const arm = Math.max(2.5, Math.min(w, h) * 0.45), th = 0.45
    const c = markerTint("learn")
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      box(root, `H_${sx}_${sy}`, new vec3(sx * (w - arm / 2), sy * h, 0), new vec3(arm, th, th), c, {unlit: true})
      box(root, `V_${sx}_${sy}`, new vec3(sx * w, sy * (h - arm / 2), 0), new vec3(th, arm, th), c, {unlit: true})
    }
    root.enabled = false
    return root
  }

  /**
   * The only writer of Brackets.enabled, tint and scale; call it after anything it reads has changed.
   * A learnable's Brackets show when its id is in the current set (Learn: the discovery markers in
   * bracketedIds; otherwise the live highlight in highlightIds) and it is NOT the object the hover label
   * names: that one carries the label's own bracket, so an object never shows two.
   * Look: Learn markers in the Learn tint, the open card's word in the focus colour and slightly larger,
   * the live highlight in the Use it live tint. The tint is asked from the UI module when the look
   * changes (at use time, never kept in a field).
   */
  private applyBrackets(): void {
    const set = this.active ? this.bracketedIds : this.highlightIds
    const labelled = this.labelForId
    const cardId = this.active && this.wordCard.isVisible ? this.activeCardWordId : ""
    let turnedOn = false
    for (const t of this.tracked) {
      const id = t.l.id
      const look: MarkerLook = !this.active ? "live" : id === cardId ? "focus" : "learn"
      if (look !== t.look) {
        t.look = look
        tint(t.bracket, markerTint(look), true)
        const s = look === "focus" ? 1.08 : 1
        t.bracket.getTransform().setLocalScale(new vec3(s, s, s))
      }
      const on = set.indexOf(id) >= 0 && id !== labelled
      if (on && !t.bracket.enabled) turnedOn = true
      t.bracket.enabled = on
    }
    // a marker that was hidden missed the per-frame facing: put it right before it is drawn
    if (turnedOn) this.faceBrackets(camPos())
  }

  private tick(): void {
    if (!this.active) {
      if (this.highlightIds.length > 0) this.faceBrackets(camPos())
      return
    }
    const cam = camPos()
    this.faceBrackets(cam)
    // walk-away hides the card
    if (this.wordCard.isVisible && this.activeCardWordId && horizDist(cam, this.openedAt) > this.walkAwayCm) this.closeCard()
    this.scan(cam)
  }

  private faceBrackets(cam: vec3): void {
    // brackets face the user and stay attached (children of the object)
    for (const t of this.tracked) {
      if (!t.bracket.enabled) continue
      const bt = t.bracket.getTransform()
      const p = bt.getWorldPosition()
      const d = flat(cam.sub(p))
      bt.setWorldRotation(quat.fromEulerAngles(0, Math.atan2(d.x, d.z), 0))
      bt.setWorldPosition(t.l.so.getTransform().getWorldPosition().add(d.uniformScale(t.l.size.z / 2 + 0.5)))
    }
  }

  private scan(cam: vec3): void {
    // rescan the nearest objects in view a few times per second
    const now = getTime()
    if (now < this.nextScan) return
    this.nextScan = now + 0.2
    const look = flat(camLook())
    const cands: {t: Tracked; d: number}[] = []
    for (const t of this.tracked) {
      const p = t.l.so.getTransform().getWorldPosition()
      const to = p.sub(cam)
      const dist = to.length
      if (dist > this.maxDistanceCm) continue
      // horizontal angle against the view direction + a loose vertical limit, so objects
      // on a counter below eye level count as "in view" when the user faces them
      const yaw = (Math.acos(Math.max(-1, Math.min(1, flat(to).dot(look)))) * 180) / Math.PI
      const pitch = (Math.atan2(-to.y, Math.sqrt(to.x * to.x + to.z * to.z)) * 180) / Math.PI
      if (yaw > this.viewConeDeg || pitch > 65 || angleToDeg(p) > 80) continue
      cands.push({t: t, d: dist})
    }
    cands.sort((a, b) => a.d - b.d)
    this.bracketedIds = cands.slice(0, this.maxBrackets).map((c) => c.t.l.id)
    // only the chosen 3–4 show; pointing no longer adds a marker (the hover label draws its own bracket)
    this.applyBrackets()
  }
}
