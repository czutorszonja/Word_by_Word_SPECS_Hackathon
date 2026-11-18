// WbwPracticeBoardUI.ts — the Practice matching board (passive view).
// Owns: 45 x 30 cm upright board: progress line "x / 4 pairs", 4 illustrated Hungarian
//       cards (left) + 4 English cards (right), selected highlight, matched = green +
//       checkmark + inactive, "Try again" feedback, completion state (New set / Close),
//       and a "save more words" state. Emits onCardPick({side,id}), onNewSet, onClose.
// Must NOT: shuffle, judge matches, play audio or place itself (WbwPracticeController does).
// Stable names: PracticeBoard, PracticeHu_<wordId>, PracticeEn_<wordId>, PracticeProgress,
//               PracticeFeedback, PracticeNewSetButton, PracticeCloseButton.
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {Button} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button"
import {FlexAlign, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {button, flexBox, image, item, obj, panel, register, retire, setToggleLater, text, GOLD, GREEN, RED, SOFT} from "./WbwSharedUI"

const ICON_CLOSE = requireAsset("../Icons/close.png") as Texture
const ICON_CHECK = requireAsset("../Icons/check_circle.png") as Texture
const ICON_REFRESH = requireAsset("../Icons/refresh.png") as Texture
const ICON_LEARN = requireAsset("../Icons/school.png") as Texture
const FILL = requireAsset("../Illustrations/ui_fill.png") as Texture

export interface PracticeLeft { id: string; hu: string; picture: Texture | null }
export interface PracticeRight { id: string; en: string }
export interface PracticePick { side: "hu" | "en"; id: string }

@component
export class WbwPracticeBoardUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">WbwPracticeBoardUI – matching board (4 HU + 4 EN cards)</span>')
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Board size in cm (brief: about 45 x 30 cm)")
  boardSizeCm: vec2 = new vec2(38, 28)

  @input
  @hint("Viewing distance the text is sized for (cm) — brief: 50–60 cm")
  @widget(new SliderWidget(40, 100, 5))
  viewDistanceCm: number = 65

  @input
  @hint("Colour of a matched pair")
  @widget(new ColorWidget())
  matchedColor: vec4 = new vec4(0.2, 0.62, 0.32, 1)
  @ui.group_end

  private root: SceneObject | null = null
  private progress: Text | null = null
  private feedback: Text | null = null
  private cards: {[key: string]: {btn: Button; check: SceneObject; fill: SceneObject; matched: boolean}} = {}
  private _onCardPick = new Event<PracticePick>()
  private _onNewSet = new Event<void>()
  private _onClose = new Event<void>()
  get onCardPick(): PublicApi<PracticePick> { return this._onCardPick.publicApi() }
  get onNewSet(): PublicApi<void> { return this._onNewSet.publicApi() }
  get onClose(): PublicApi<void> { return this._onClose.publicApi() }
  get isVisible(): boolean { return this.root !== null }
  /** "board" | "complete" | "needWords" | "" (hidden) */
  state: string = ""
  /** Text of the progress line, e.g. "1 / 4 pairs". */
  progressText: string = ""
  /** Text of the feedback line, e.g. "Try again". */
  feedbackText: string = ""

  showSet(left: PracticeLeft[], right: PracticeRight[], matched: number, total: number): void {
    const p = this.frame("Match each Hungarian word with its English translation")
    this.state = "board"
    const d = this.viewDistanceCm
    const W = this.boardSizeCm.x
    const colW = (W - 4.6) / 2
    const cardH = 3.8
    const colH = 4 * cardH + 3 * 0.5
    const body = flexBox(p.content, "Columns", "row", W - 3, colH, {gap: 1.4, justify: FlexJustify.Center, align: FlexAlign.Center})
    const lc = flexBox(body, "HuColumn", "column", colW, colH, {gap: 0.5, justify: FlexJustify.Center, align: FlexAlign.Center})
    const rc = flexBox(body, "EnColumn", "column", colW, colH, {gap: 0.5, justify: FlexJustify.Center, align: FlexAlign.Center})
    this.cards = {}
    for (const l of left) this.makeCard(lc, "hu", l.id, l.hu, l.picture, colW, cardH, d)
    for (const r of right) this.makeCard(rc, "en", r.id, r.en, null, colW, cardH, d)
    this.feedback = text(p.content, "PracticeFeedback", "", "Body", d, {h: 1.8, color: GOLD})
    this.feedbackText = ""
    this.setProgress(matched, total)
  }

  showComplete(total: number): void {
    const p = this.frame("")
    this.state = "complete"
    const d = this.viewDistanceCm
    this.setProgress(total, total)
    image(p.content, "Done", ICON_CHECK, 6, 6, GREEN)
    text(p.content, "Bravo", "Szuper! All pairs matched.", "Headline1", d, {h: 3.2, color: GREEN})
    text(p.content, "Next", "Start another set, or close the board and pick a mode from ✋ Menu.", "Caption", d, {h: 1.6, color: SOFT})
    const row = flexBox(p.content, "Actions", "row", this.boardSizeCm.x - 4, 4.2, {gap: 1.2, justify: FlexJustify.Center, align: FlexAlign.Center})
    button(row, "PracticeNewSetButton", 12, 3.8, "New set", d, () => this._onNewSet.invoke(), {icon: ICON_REFRESH})
    button(row, "PracticeDoneButton", 10, 3.8, "Close", d, () => this._onClose.invoke(), {icon: ICON_CLOSE})
  }

  showNeedWords(saved: number, needed: number): void {
    const p = this.frame("")
    this.state = "needWords"
    const d = this.viewDistanceCm
    this.progressText = `${saved} / ${needed} words saved`
    if (this.progress) this.progress.text = this.progressText
    image(p.content, "LearnIcon", ICON_LEARN, 5, 5, GOLD)
    text(p.content, "Need", `Save at least ${needed} words in Learn mode first.`, "Headline2", d, {h: 3, color: GOLD})
    text(p.content, "Have", `You have ${saved} saved. Open ✋ Menu → Learn and save ${needed - saved} more.`, "Body", d, {h: 2, color: SOFT})
    const row = flexBox(p.content, "Actions", "row", this.boardSizeCm.x - 4, 4.2, {gap: 1.2, justify: FlexJustify.Center, align: FlexAlign.Center})
    button(row, "PracticeDoneButton", 10, 3.8, "Close", d, () => this._onClose.invoke(), {icon: ICON_CLOSE})
  }

  hide(): void {
    retire(this.root, this)
    this.root = null
    this.progress = null
    this.feedback = null
    this.cards = {}
    this.state = ""
    this.progressText = ""
    this.feedbackText = ""
  }

  setProgress(matched: number, total: number): void {
    this.progressText = `${matched} / ${total} pairs`
    if (this.progress) this.progress.text = this.progressText
  }

  setFeedback(msg: string, good: boolean): void {
    this.feedbackText = msg
    if (this.feedback) {
      this.feedback.text = msg
      this.feedback.textFill.color = good ? GREEN : RED
    }
  }

  setSelected(side: string, id: string, on: boolean): void {
    const c = this.cards[`${side}:${id}`]
    if (c && !c.matched) setToggleLater(c.btn, on, this)
  }

  markMatched(id: string): void {
    for (const side of ["hu", "en"]) {
      const c = this.cards[`${side}:${id}`]
      if (!c) continue
      c.matched = true
      setToggleLater(c.btn, false, this)
      c.fill.enabled = true
      c.check.enabled = true
    }
  }

  // ── private ────────────────────────────────────────────────────────────
  private frame(subtitle: string): {content: SceneObject} {
    this.hide()
    const d = this.viewDistanceCm
    const W = this.boardSizeCm.x, H = this.boardSizeCm.y
    const p = panel(this.sceneObject, "PracticeBoard", W, H, {gap: 0.6, padX: 1.5, padY: 1.2, justify: FlexJustify.Center, align: FlexAlign.Center})
    this.root = p.root
    const head = flexBox(p.content, "Header", "row", W - 3, 3.6, {gap: 0.8, justify: FlexJustify.SpaceBetween, align: FlexAlign.Center})
    text(head, "Title", "Practice", "Headline1", d, {w: 14, h: 3, align: "left"})
    this.progress = text(head, "PracticeProgress", "", "Headline2", d, {w: W - 3 - 14 - 3.4 - 1.6, h: 3, color: GOLD, align: "right"})
    button(head, "PracticeCloseButton", 3.4, 3.4, "", d, () => this._onClose.invoke(), {icon: ICON_CLOSE, iconSize: 1.9})
    if (subtitle.length > 0) text(p.content, "Subtitle", subtitle, "Caption", d, {h: 1.4, color: SOFT})
    return {content: p.content}
  }

  private makeCard(parent: SceneObject, side: "hu" | "en", id: string, label: string, pic: Texture | null,
                   w: number, h: number, d: number): void {
    const so = obj(parent, side === "hu" ? `PracticeHu_${id}` : `PracticeEn_${id}`, new vec3(0, 0, 0.1))
    const btn = so.createComponent(Button.getTypeName()) as Button
    btn.size = new vec3(w, h, 1)
    btn.setIsToggleable(true)
    // green "matched" fill sits behind the card content (created first = painted first)
    const fill = obj(so, "MatchedFill", new vec3(0, 0, 0.05))
    image(fill, "Fill", FILL, w - 0.5, h - 0.5, this.matchedColor, false)
    fill.enabled = false
    const face = flexBox(so, "Face", "row", w, h, {gap: 0.6, justify: FlexJustify.Center, align: FlexAlign.Center})
    face.getTransform().setLocalPosition(new vec3(0, 0, 0.08))
    if (pic) image(face, "Picture", pic, 3.2)
    text(face, "Label", label, side === "hu" ? "Headline2" : "Subheadline", d, {w: w - (pic ? 6 : 2), h: 3})
    const check = obj(so, "Check", new vec3(w / 2 - 2, 0, 0.2))
    image(check, "CheckIcon", ICON_CHECK, 2.4, 2.4, new vec4(1, 1, 1, 1), false)
    check.enabled = false
    register(parent, item(so, w, h))
    const entry = {btn: btn, check: check, fill: fill, matched: false}
    btn.onTriggerUp.add(() => {
      if (entry.matched) {
        setToggleLater(btn, false, this)
        return
      }
      this._onCardPick.invoke({side: side, id: id})
    })
    this.cards[`${side}:${id}`] = entry
  }
}
