// WbwLearnController.ts — Learn mode.
// Owns: bracket highlights on the 3–4 nearest learnable objects in view (attached to the
//       objects), pinch/click → word card, ▶ playback, Save (→ WbwSession) with the
//       fly-into-counter confirmation, and hiding the card on save / other select / walk-away.
// Expects: init(session, audio, hud, learnables) from WbwMain; @input wordCard.
// Must NOT: own the saved-word list (WbwSession does) or build UI itself.
import {WbwWordCardUI} from "./WbwWordCardUI"
import {WbwAudioController} from "./WbwAudioController"
import {WbwHudUI} from "./WbwHudUI"
import {Learnable} from "./WbwCafeBuilder"
import {WbwSession} from "./WbwSession"
import {WORDS, WordEntry, wordById} from "./WbwVocab"
import {PICTURES} from "./WbwIllustrations"
import {box, group, tint} from "./WbwGeo"
import {angleToDeg, camLook, camPos, flat, horizDist, placeFacingUser} from "./WbwSpatial"

interface Tracked {
  l: Learnable
  word: WordEntry
  bracket: SceneObject
  hovered: boolean
}

@component
export class WbwLearnController extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">WbwLearnController – brackets, word card, save</span>')
  @ui.separator
  @ui.group_start("References")
  @input
  @hint("Word card UI module")
  wordCard!: WbwWordCardUI
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
  @hint("Seconds the card shows 'Saved ✓' before it flies into the Saved counter")
  @widget(new SliderWidget(0, 2, 0.1))
  savedHoldSec: number = 0.8

  @input
  @hint("Highlight colour for ingredients named by the offered phrase cards")
  @widget(new ColorWidget())
  highlightColor: vec4 = new vec4(1.0, 0.78, 0.35, 1)

  @input
  @hint("Bracket colour while an object is targeted or open on the word card (focus colour)")
  @widget(new ColorWidget())
  focusColor: vec4 = new vec4(0.45, 0.93, 1.0, 1)

  @input
  @hint("Bracket colour (subtle, warm)")
  @widget(new ColorWidget())
  bracketColor: vec4 = new vec4(1.0, 0.9, 0.6, 1)
  @ui.group_end

  // ── readable state for tests ──
  /** True while Learn mode is active. */
  active: boolean = false
  /** Word id on the open card ("" if none). */
  activeCardWordId: string = ""
  /** Hungarian word on the open card ("" if none). */
  activeCardWord: string = ""
  /** Ids of the objects currently bracketed. */
  bracketedIds: string[] = []
  /** Ids of every learnable object in the café. */
  learnableIds: string[] = []
  /** Ids highlighted outside Learn mode (ingredients named by offered phrases). */
  highlightIds: string[] = []

  private session!: WbwSession
  private audio!: WbwAudioController
  private hud!: WbwHudUI
  private tracked: Tracked[] = []
  private openedAt: vec3 = vec3.zero()
  private nextScan = 0

  init(session: WbwSession, audio: WbwAudioController, hud: WbwHudUI, learnables: Learnable[]): void {
    this.session = session
    this.audio = audio
    this.hud = hud
    for (const l of learnables) {
      const w = wordById(l.id)
      if (!w) continue
      const tr: Tracked = {l: l, word: w, bracket: this.makeBracket(l), hovered: false}
      this.tracked.push(tr)
      this.learnableIds.push(l.id)
      l.interactable.onTriggerEnd.add(() => this.select(tr))
      l.interactable.onHoverEnter.add(() => { tr.hovered = true; this.refreshTint(tr) })
      l.interactable.onHoverExit.add(() => { tr.hovered = false; this.refreshTint(tr) })
    }
    this.wordCard.onPlay.add(() => this.playWord())
    this.wordCard.onPlaySentence.add(() => this.playSentence())
    this.wordCard.onSave.add(() => this.saveCurrent())
    this.wordCard.onClose.add(() => this.closeCard())
    this.createEvent("UpdateEvent").bind(() => this.tick())
    print(`WbwLearn: tracking ${this.tracked.length} learnable objects (${WORDS.length} words in vocab)`)
  }

  setActive(on: boolean): void {
    this.active = on
    if (!on) {
      this.closeCard()
      for (const t of this.tracked) t.bracket.enabled = false
      this.bracketedIds = []
    } else {
      this.highlightIds = []
      for (const t of this.tracked) tint(t.bracket, this.bracketColor, true)
      this.nextScan = 0
    }
  }

  /** Soft warm highlight on these objects while Learn mode is off (e.g. ordering). */
  setHighlight(ids: string[]): void {
    this.highlightIds = ids.filter((id) => this.learnableIds.indexOf(id) >= 0)
    if (!this.active) for (const t of this.tracked) {
      const on = this.highlightIds.indexOf(t.l.id) >= 0
      t.bracket.enabled = on
      if (on) tint(t.bracket, this.highlightColor, true)
    }
  }

  /** Programmatic select (same as pinching the object) — handy for tests. */
  selectById(id: string): boolean {
    for (const t of this.tracked) if (t.l.id === id) { this.select(t); return true }
    return false
  }

  // ── selection & card ──
  private select(t: Tracked): void {
    if (!this.active) return
    this.audio.playSfx("UiClick")
    const w = t.word
    this.wordCard.show({
      id: w.id, hu: w.hu, en: w.en, exampleHu: w.exampleHu, exampleEn: w.exampleEn,
      picture: PICTURES[w.picture] ?? null,
      saved: this.session.isSaved(w.id),
      hasSentenceAudio: w.exampleAudio.length > 0 && this.audio.has(w.exampleAudio),
    })
    this.activeCardWordId = w.id
    this.activeCardWord = w.hu
    this.refreshAllTints()
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
    const fy = lookYaw + yaw, fp = lookPitch + pitch
    const dir = new vec3(Math.sin(fy) * Math.cos(fp), Math.sin(fp), -Math.cos(fy) * Math.cos(fp))
    const pos = cam.add(dir.uniformScale(D))
    placeFacingUser(this.wordCard.getSceneObject(), pos)
    this.openedAt = cam
    this.speak(w.audio, "word")
  }

  private playWord(): void {
    const w = wordById(this.activeCardWordId)
    if (w) this.speak(w.audio, "word")
  }

  private playSentence(): void {
    const w = wordById(this.activeCardWordId)
    if (w && w.exampleAudio) this.speak(w.exampleAudio, "sentence")
  }

  /** Play a clip and show "Playing" on the card's matching button until it ends. */
  private speak(key: string, kind: string): void {
    const shownId = this.activeCardWordId
    this.wordCard.setPlaying(kind)
    this.audio.playVoice(key, () => {
      if (this.wordCard.currentWordId === shownId && this.wordCard.playing === kind) this.wordCard.setPlaying("")
    })
  }

  private saveCurrent(): void {
    const id = this.activeCardWordId
    if (!id) return
    const isNew = this.session.save(id)
    this.audio.playSfx("SaveConfirm")
    this.activeCardWordId = ""
    this.activeCardWord = ""
    // the control turns into "Saved ✓" first, then the card flies into the Saved counter
    this.wordCard.setSaved()
    const shown = this.wordCard.showCount
    const ev = this.createEvent("DelayedCallbackEvent") as DelayedCallbackEvent
    ev.bind(() => {
      if (this.wordCard.showCount !== shown || !this.wordCard.isVisible) return
      this.wordCard.flyTo(this.hud.getBadgeWorldPos(), () => {
        if (!isNew) print(`WbwLearn: '${id}' was already saved`)
      })
    })
    ev.reset(this.savedHoldSec)
  }

  private closeCard(): void {
    if (this.wordCard.isVisible) this.wordCard.hide()
    this.activeCardWordId = ""
    this.activeCardWord = ""
    this.refreshAllTints()
  }

  // ── brackets ──
  private makeBracket(l: Learnable): SceneObject {
    const root = group(l.so, "Brackets")
    const w = l.size.x / 2 + 1.5, h = l.size.y / 2 + 1.5
    const arm = Math.max(2.5, Math.min(w, h) * 0.45), th = 0.45
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      box(root, `H_${sx}_${sy}`, new vec3(sx * (w - arm / 2), sy * h, 0), new vec3(arm, th, th), this.bracketColor, {unlit: true})
      box(root, `V_${sx}_${sy}`, new vec3(sx * w, sy * (h - arm / 2), 0), new vec3(th, arm, th), this.bracketColor, {unlit: true})
    }
    root.enabled = false
    return root
  }

  /** Idle = discreet warm brackets · targeted (hover) or open on the card = CYAN, slightly larger. */
  private refreshTint(t: Tracked): void {
    const focus = t.hovered || (this.activeCardWordId === t.l.id && this.wordCard.isVisible)
    tint(t.bracket, focus ? this.focusColor : this.bracketColor, true)
    const s = focus ? 1.08 : 1
    t.bracket.getTransform().setLocalScale(new vec3(s, s, s))
    if (t.hovered && this.active) t.bracket.enabled = true
    else if (!t.hovered && this.bracketedIds.indexOf(t.l.id) < 0) t.bracket.enabled = false
  }

  private refreshAllTints(): void {
    if (this.active) for (const t of this.tracked) this.refreshTint(t)
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
    const chosen = cands.slice(0, this.maxBrackets).map((c) => c.t)
    this.bracketedIds = chosen.map((t) => t.l.id)
    for (const t of this.tracked) t.bracket.enabled = chosen.indexOf(t) >= 0 || t.hovered
  }
}
