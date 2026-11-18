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
  @hint("The card never opens farther than this from the view centre (deg) so it stays in view")
  @widget(new SliderWidget(0, 30, 1))
  maxCardAngleDeg: number = 8

  @input
  @hint("Highlight colour for ingredients named by the offered phrase cards")
  @widget(new ColorWidget())
  highlightColor: vec4 = new vec4(1.0, 0.78, 0.35, 1)

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
    // next to the object, slightly toward the user, ~cardDistanceCm from the user
    const cam = camPos()
    const obj = t.l.so.getTransform().getWorldPosition()
    let dir = obj.sub(cam).normalize()
    // keep the card inside the (narrow) view: at most maxCardAngleDeg away from the gaze
    const look = camLook()
    const ang = (Math.acos(Math.max(-1, Math.min(1, dir.dot(look)))) * 180) / Math.PI
    const clamped = ang > this.maxCardAngleDeg
    if (clamped) dir = vec3.slerp(look, dir, this.maxCardAngleDeg / ang).normalize()
    const side = new vec3(-flat(dir).z, 0, flat(dir).x) // to the right of the object, seen from the user
    const pos = cam.add(dir.uniformScale(this.cardDistanceCm)).add(side.uniformScale(clamped ? 0 : 10)).add(new vec3(0, clamped ? 8 : 6, 0))
    placeFacingUser(this.wordCard.getSceneObject(), pos)
    this.openedAt = cam
    this.audio.playVoice(w.audio)
  }

  private playWord(): void {
    const w = wordById(this.activeCardWordId)
    if (w) this.audio.playVoice(w.audio)
  }

  private playSentence(): void {
    const w = wordById(this.activeCardWordId)
    if (w && w.exampleAudio) this.audio.playVoice(w.exampleAudio)
  }

  private saveCurrent(): void {
    const id = this.activeCardWordId
    if (!id) return
    const isNew = this.session.save(id)
    this.audio.playSfx("SaveConfirm")
    this.activeCardWordId = ""
    this.activeCardWord = ""
    this.wordCard.flyTo(this.hud.getBadgeWorldPos(), () => {
      if (!isNew) print(`WbwLearn: '${id}' was already saved`)
    })
  }

  private closeCard(): void {
    if (this.wordCard.isVisible) this.wordCard.hide()
    this.activeCardWordId = ""
    this.activeCardWord = ""
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

  private refreshTint(t: Tracked): void {
    tint(t.bracket, t.hovered ? new vec4(1, 1, 1, 1) : this.bracketColor, true)
    if (t.hovered && this.active) t.bracket.enabled = true
    else if (!t.hovered && this.bracketedIds.indexOf(t.l.id) < 0) t.bracket.enabled = false
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
