// WbwOrderController.ts — "Use it live": the scripted 7-step order with the server, plus the
// table number cards (always active: selecting an empty table shows "8 = nyolc" + audio).
// Owns: order state (step, answers, chosen table), server line timing (audio → caption →
//       phrase cards), the table step's chime + edge-of-view arrow, and the final hint.
// Expects: init(session, audio, cafe) from WbwMain; @inputs for caption, phrase cards, hint,
//          server and the seating root (Table_<n>/TableCard_<n> children).
// Must NOT: build UI itself, or touch saved words (reads them from WbwSession to order cards).
import {WbwServerCaptionUI} from "./WbwServerCaptionUI"
import {PhraseCardData, WbwPhraseChoicesUI} from "./WbwPhraseChoicesUI"
import {WbwHintUI} from "./WbwHintUI"
import {WbwTableCardUI} from "./WbwTableCardUI"
import {WbwServerCharacter} from "./WbwServerCharacter"
import {WbwAudioController} from "./WbwAudioController"
import {WbwSession} from "./WbwSession"
import {WbwLearnController} from "./WbwLearnController"
import {ORDER_STEPS, OrderStep, lineById, phraseById, tableByNum} from "./WbwVocab"
import {PICTURES} from "./WbwIllustrations"
import {camLook, camPos, camTransform, flat, placeFacingUser} from "./WbwSpatial"

@component
export class WbwOrderController extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">WbwOrderController – Use it live (scripted order + tables)</span>')
  @ui.separator
  @ui.group_start("References")
  @input @hint("Server caption bubble UI") caption!: WbwServerCaptionUI
  @input @hint("Phrase cards UI") phrases!: WbwPhraseChoicesUI
  @input @hint("Hint line + edge arrow UI") hint!: WbwHintUI
  @input @hint("The scripted server character") server!: WbwServerCharacter
  @input @hint("Seating root: children Table_<n>, each with a TableCard_<n> child") seating!: SceneObject
  @input @allowUndefined @hint("Authored tray on the sandwich counter where the phrase cards lie (tilted toward the user)") phraseTray: SceneObject | undefined
  @ui.group_end
  @ui.group_start("Settings")
  @input
  @hint("Pause between the user's answer and the server's next line (s)")
  @widget(new SliderWidget(0, 3, 0.1))
  replyPauseSec: number = 0.6

  @input
  @hint("Seconds the caption stays after the server's line ends")
  @widget(new SliderWidget(0, 10, 0.5))
  captionLingerSec: number = 4

  @input
  @hint("Lay the phrase cards on the counter tray (user looks down to pick). Off = float in front of the user.")
  phrasesOnCounter: boolean = true

  @input
  @hint("Distance of the phrase cards in front of the user when NOT on the counter (cm)")
  @widget(new SliderWidget(40, 90, 1))
  phraseDistanceCm: number = 68

  @input
  @hint("How far below eye level the phrase cards sit (cm)")
  @widget(new SliderWidget(0, 40, 1))
  phraseDropCm: number = 7

  @input
  @hint("Objects within this angle (deg) of the view direction count as 'in view' for the arrow")
  @widget(new SliderWidget(10, 45, 1))
  arrowInViewDeg: number = 24
  @ui.group_end

  // ── readable state for tests ──
  /** True while Use it live is the active mode. */
  active: boolean = false
  /** 0 = not started, 1..6 = waiting on that step, 7 = done (walk to table + practise hint). */
  orderStep: number = 0
  /** Name of the current step (greet, fillings, drink, here_or_takeaway, table, enjoy, done). */
  orderStepName: string = ""
  /** "server" while a server line plays, "user" while phrase cards wait, "table" while waiting
   *  for an empty table to be selected, "done" when the order is complete. */
  waitingFor: string = ""
  /** Phrase ids the user has picked in this order, in order. */
  answers: string[] = []
  /** Table chosen in the table step (or by tapping an empty table's number card); 0 = none. */
  chosenTable: number = 0
  /** Last table number card tapped (any time); 0 = none. */
  lastTableTapped: number = 0
  /** Phrase ids currently offered. */
  offeredPhraseIds: string[] = []
  /** Hungarian text of the last server line. */
  lastServerLine: string = ""

  private session!: WbwSession
  private audio!: WbwAudioController
  private learn: WbwLearnController | null = null
  private stepDef: OrderStep | null = null
  private picked: string[] = []
  private tableCards: {[n: number]: WbwTableCardUI} = {}
  private captionHideAt = -1
  private arrowTarget: vec3 | null = null
  private epoch = 0

  init(session: WbwSession, audio: WbwAudioController, learn?: WbwLearnController): void {
    this.session = session
    this.audio = audio
    this.learn = learn ?? null
    this.phrases.onPick.add((id) => this.onPhrase(id))
    // find the table number cards under Seating/Table_<n>/TableCard_<n>
    for (let i = 0; i < this.seating.getChildrenCount(); i++) {
      const t = this.seating.getChild(i)
      for (let j = 0; j < t.getChildrenCount(); j++) {
        const c = t.getChild(j)
        const ui = c.getComponent(WbwTableCardUI.getTypeName()) as WbwTableCardUI
        if (ui) {
          this.tableCards[ui.tableNumber] = ui
          ui.onSelected.add((n) => this.onTable(n))
        }
      }
    }
    this.createEvent("UpdateEvent").bind(() => this.tick())
  }

  setActive(on: boolean): void {
    if (on === this.active) return
    this.active = on
    this.epoch++
    if (on) {
      if (this.orderStep === 0 || this.orderStep >= 7) this.startOrder()
      else this.runStep(this.orderStep)
    } else {
      this.phrases.hide()
      this.clearHighlight()
      this.caption.hide()
      this.server.setSpeaking(false)
      this.audio.stopVoice()
      this.hint.setArrow(false)
      this.hint.hideHint()
      this.arrowTarget = null
      this.offeredPhraseIds = []
      if (this.waitingFor === "server") this.waitingFor = "user"
    }
  }

  /** Restart the scripted order from step 1. */
  startOrder(): void {
    this.answers = []
    this.chosenTable = 0
    this.hint.hideHint()
    this.runStep(1)
  }

  /** Programmatic pick (same as pinching a phrase card) — handy for tests. */
  pickPhrase(id: string): boolean {
    if (this.offeredPhraseIds.indexOf(id) < 0) return false
    this.onPhrase(id)
    return true
  }

  // ── steps ──
  private runStep(step: number): void {
    const ep = ++this.epoch
    this.orderStep = step
    this.phrases.hide()
    this.clearHighlight()
    this.offeredPhraseIds = []
    this.picked = []
    if (step > ORDER_STEPS.length) {
      this.finish()
      return
    }
    const def = ORDER_STEPS[step - 1]
    this.stepDef = def
    this.orderStepName = def.name
    const line = lineById(def.line)!
    this.waitingFor = "server"
    this.lastServerLine = line.hu
    this.showCaption(line.hu, line.en)
    this.server.setSpeaking(true)
    if (def.name === "table") this.audio.playSfx("AttentionChime")
    this.audio.playVoice(line.audio, () => {
      if (ep !== this.epoch || !this.active) return
      this.server.setSpeaking(false)
      this.captionHideAt = getTime() + this.captionLingerSec
      this.afterLine(def)
    })
  }

  private afterLine(def: OrderStep): void {
    if (def.name === "table") {
      if (this.chosenTable > 0) {
        this.offerTablePhrase()
      } else {
        this.waitingFor = "table"
        this.showCaption(lineById(def.line)!.hu, "What's your table number? (Turn around: tap an empty table's number.)")
        this.captionHideAt = -1
        this.arrowTarget = this.seatingCenter()
      }
      return
    }
    this.offer(def.choices, def.multi)
  }

  private offer(ids: string[], multi: boolean): void {
    let list = ids.slice()
    if (this.stepDef && this.stepDef.name === "fillings") {
      // favour phrases built from words the learner saved
      const score = (pid: string) => phraseById(pid)!.words.filter((w) => this.session.isSaved(w)).length
      list.sort((a, b) => score(b) - score(a))
    }
    if (multi) list = list.concat(["done"])
    const cards: PhraseCardData[] = list.map((pid) => {
      const p = phraseById(pid)!
      return {id: p.id, hu: p.hu, en: p.en, picture: PICTURES[p.picture] ?? null, picked: this.picked.indexOf(pid) >= 0}
    })
    this.waitingFor = "user"
    this.offeredPhraseIds = list
    this.phrases.show(cards, multi ? "Pick any, then Kész" : "Tap your answer")
    if (this.phrasesOnCounter && this.phraseTray) {
      // lying on the counter in front of the user, tilted up toward them (authored tray)
      const tt = this.phraseTray.getTransform(), pt = this.phrases.getSceneObject().getTransform()
      pt.setWorldPosition(tt.getWorldPosition())
      pt.setWorldRotation(tt.getWorldRotation())
    } else {
      // ~60 cm ahead, below eye level, between the user and the server
      const cam = camPos()
      const toServer = flat(this.server.getSceneObject().getTransform().getWorldPosition().sub(cam))
      placeFacingUser(this.phrases.getSceneObject(), cam.add(toServer.uniformScale(this.phraseDistanceCm)).add(new vec3(0, -this.phraseDropCm, 0)))
    }
    // softly highlight the real ingredients/items the offered phrases name
    if (this.learn) {
      const ids: string[] = []
      for (const pid of list) for (const w of phraseById(pid)!.words) if (ids.indexOf(w) < 0) ids.push(w)
      this.learn.setHighlight(ids)
    }
  }

  private onPhrase(id: string): void {
    if (!this.active || !this.stepDef || this.waitingFor !== "user") return
    const def = this.stepDef
    const p = phraseById(id)
    if (!p) return
    this.answers.push(id)
    if (def.multi && id !== "done") {
      if (this.picked.indexOf(id) < 0) this.picked.push(id)
      this.phrases.setPicked(id)
      this.audio.playVoice(p.audio)
      return
    }
    if (id === "done") {
      this.audio.playSfx("UiClick")
      this.next(def)
      return
    }
    const advance = def.advanceOn.indexOf(id) >= 0
    if (advance) {
      this.phrases.hide()
      this.offeredPhraseIds = []
      this.waitingFor = "server"
    } else {
      this.phrases.setPicked(id)
    }
    const ep = this.epoch
    this.audio.playVoice(p.audio, () => {
      if (ep !== this.epoch || !this.active) return
      if (advance) this.next(def)
      else if (id === "elvitelre") this.hint.showHint("Demo path: this visit continues with “Itt eszem.” (I'll eat here.)", 5)
    })
  }

  private next(def: OrderStep): void {
    this.phrases.hide()
    this.offeredPhraseIds = []
    this.waitingFor = "server"
    const ep = this.epoch
    const ev = this.createEvent("DelayedCallbackEvent") as DelayedCallbackEvent
    ev.bind(() => {
      if (ep === this.epoch && this.active) this.runStep(def.step + 1)
    })
    ev.reset(this.replyPauseSec)
  }

  private finish(): void {
    this.clearHighlight()
    this.orderStep = 7
    this.orderStepName = "done"
    this.waitingFor = "done"
    this.stepDef = null
    this.phrases.hide()
    const t = this.chosenTable || 8
    this.arrowTarget = this.tablePos(t)
    this.hint.showHint(`Walk to table ${t}. While you wait, open ✋ Menu and choose Practice.`, 12)
  }

  // ── tables ──
  private onTable(n: number): void {
    const info = tableByNum(n)
    if (!info || !info.empty) return
    this.lastTableTapped = n
    const card = this.tableCards[n]
    if (card) card.showTranslation(`${n} = ${info.hu}`)
    this.audio.playVoice(info.audio)
    if (this.active && this.stepDef && this.stepDef.name === "table") {
      this.chosenTable = n
      if (this.waitingFor === "table" || this.waitingFor === "user") {
        const ep = this.epoch
        const ev = this.createEvent("DelayedCallbackEvent") as DelayedCallbackEvent
        ev.bind(() => {
          if (ep === this.epoch && this.active) this.offerTablePhrase()
        })
        ev.reset(1.2)
      }
    } else if (this.orderStep < 5 || this.orderStep >= 7) {
      // outside the table step, tapping an empty table still teaches its number and sets
      // "my table" for Practice placement
      this.chosenTable = n
    }
  }

  private offerTablePhrase(): void {
    const info = tableByNum(this.chosenTable)
    if (!info) return
    this.arrowTarget = this.server.getSceneObject().getTransform().getWorldPosition().add(new vec3(0, 150, 0))
    const line = lineById("hanyas_asztal")!
    this.showCaption(line.hu, line.en)
    this.captionHideAt = getTime() + 8
    this.offer([info.phraseId], false) // only the phrase for the chosen table is offered
  }

  // ── helpers ──
  private clearHighlight(): void {
    if (this.learn && this.learn.highlightIds.length > 0) this.learn.setHighlight([])
  }

  private showCaption(hu: string, en: string): void {
    this.caption.show(hu, en)
    placeFacingUser(this.caption.getSceneObject(), this.server.getCaptionAnchor(), true)
    this.captionHideAt = -1
  }

  private seatingCenter(): vec3 {
    return this.seating.getTransform().getWorldPosition().add(new vec3(0, 80, 320))
  }

  private tablePos(n: number): vec3 {
    for (let i = 0; i < this.seating.getChildrenCount(); i++) {
      const c = this.seating.getChild(i)
      if (c.name === `Table_${n}`) return c.getTransform().getWorldPosition().add(new vec3(0, 80, 0))
    }
    return this.seatingCenter()
  }

  private tick(): void {
    if (this.captionHideAt > 0 && getTime() > this.captionHideAt) {
      this.captionHideAt = -1
      if (this.waitingFor !== "table") this.caption.hide()
    }
    // edge-of-view arrow toward whatever needs attention
    if (!this.arrowTarget || (!this.active && this.orderStep < 7)) {
      if (this.hint.arrowVisible) this.hint.setArrow(false)
      return
    }
    const cam = camTransform()
    const to = this.arrowTarget.sub(cam.getWorldPosition())
    const look = camLook()
    const ang = (Math.acos(Math.max(-1, Math.min(1, to.normalize().dot(look)))) * 180) / Math.PI
    if (ang < this.arrowInViewDeg) {
      this.hint.setArrow(false)
      if (this.waitingFor === "done" && to.length < 160) this.arrowTarget = null
      return
    }
    // project into the view plane: x = right, y = up
    const right = cam.right, up = cam.up
    let x = to.dot(right), y = to.dot(up)
    if (Math.abs(x) + Math.abs(y) < 1e-3) x = 1
    // behind the user: point straight left/right ("turn around") rather than diagonally
    const angle = to.dot(look) < 0 ? (x >= 0 ? 0 : Math.PI) : Math.atan2(y, x)
    this.hint.setArrow(true, angle)
  }
}
