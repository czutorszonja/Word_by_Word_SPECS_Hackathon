// WbwPracticeBoardUI.ts — the Practice matching board (passive view).
// Owns: an upright board sized around its cards: progress "x / 4 pairs", 4 illustrated Hungarian
//       cards (left) + 4 English cards (right), selected = cyan state (never reveals the pair),
//       matched = green + checkmark + inactive, amber "Try again" feedback, completion (New set / Close),
//       and a "save more words" state. Emits onCardPick({side,id}), onNewSet, onClose.
// Must NOT: shuffle, judge matches, play audio or place itself (WbwPracticeController does).
// Stable names: PracticeBoard, PracticeHu_<wordId>, PracticeEn_<wordId>, PracticeProgress,
//               PracticeFeedback, PracticeNewSetButton, PracticeCloseButton.
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {Button} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button"
import {FlexAlign, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {button, flexBox, image, item, lineHeightCm, obj, panel, register, retire, setTextColor, setToggleLater, styleWhenReady, text, textWidthCm, AMBER, GREEN, TEXT_SOFT, useTone, headerRule, HEADER_RULE_H, TONE_PRACTICE} from "./WbwSharedUI"

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
  @hint("Viewing distance the text is sized for (cm) — brief: 50–60 cm")
  @widget(new SliderWidget(40, 100, 5))
  viewDistanceCm: number = 65

  @input
  @hint("Colour of a matched pair")
  @widget(new ColorWidget())
  matchedColor: vec4 = new vec4(0.32, 0.6, 0.4, 1)
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
    const d = this.viewDistanceCm
    const cardH = 4.2, cardGap = 1.0, colGap = 2.0, picS = 3.2
    // columns are as wide as their longest word (cards are buttons: plain text, no outline)
    let huMax = 0, enMax = 0
    for (const l of left) huMax = Math.max(huMax, textWidthCm(l.hu.length, "Headline2", d, false))
    for (const r of right) enMax = Math.max(enMax, textWidthCm(r.en.length, "Subheadline", d, false))
    const colL = Math.max(12, huMax + picS + 4.6), colR = Math.max(11, enMax + 4.6) // room for the matched checkmark
    const colH = left.length * cardH + (left.length - 1) * cardGap
    const p = this.frame("Match each word with its meaning", colL + colGap + colR, colH + 0.8 + lineHeightCm("Body", d))
    this.state = "board"
    const body = flexBox(p.content, "Columns", "row", colL + colGap + colR, colH, {gap: colGap, justify: FlexJustify.Center, align: FlexAlign.Center})
    const lc = flexBox(body, "HuColumn", "column", colL, colH, {gap: cardGap, justify: FlexJustify.Center, align: FlexAlign.Center})
    const rc = flexBox(body, "EnColumn", "column", colR, colH, {gap: cardGap, justify: FlexJustify.Center, align: FlexAlign.Center})
    this.cards = {}
    for (const l of left) this.makeCard(lc, "hu", l.id, l.hu, l.picture, colL, cardH, d)
    for (const r of right) this.makeCard(rc, "en", r.id, r.en, null, colR, cardH, d)
    this.feedback = text(p.content, "PracticeFeedback", "", "Body", d, {h: lineHeightCm("Body", d)})
    this.feedbackText = ""
    this.setProgress(matched, total)
  }

  showComplete(total: number): void {
    const d = this.viewDistanceCm
    const bravo = "Szuper! All pairs matched."
    const bodyW = Math.max(textWidthCm(bravo.length, "Headline2", d), 2 * 12 + 1.3)
    const p = this.frame("", bodyW, 5 + 0.8 + lineHeightCm("Headline2", d) + 0.8 + 4.4)
    this.state = "complete"
    this.setProgress(total, total)
    image(p.content, "Done", ICON_CHECK, 5, 5, GREEN)
    text(p.content, "Bravo", bravo, "Headline2", d, {h: lineHeightCm("Headline2", d), color: GREEN})
    const row = flexBox(p.content, "Actions", "row", bodyW, 4.4, {gap: 1.3, justify: FlexJustify.Center, align: FlexAlign.Center})
    button(row, "PracticeNewSetButton", 12, 4.2, "New set", d, () => this._onNewSet.invoke(), {icon: ICON_REFRESH, primary: true})
    button(row, "PracticeDoneButton", 10, 4.2, "Close", d, () => this._onClose.invoke(), {icon: ICON_CLOSE})
  }

  showNeedWords(saved: number, needed: number): void {
    const d = this.viewDistanceCm
    const more = needed - saved
    const need = `Save ${more} more word${more === 1 ? "" : "s"} first`
    const how = "Menu → Learn, then Save"
    const bodyW = Math.max(textWidthCm(need.length, "Headline2", d), textWidthCm(how.length, "Body", d))
    const p = this.frame("", bodyW, 4.4 + 0.8 + lineHeightCm("Headline2", d) + lineHeightCm("Body", d) + 0.8 + 4.4)
    this.state = "needWords"
    this.progressText = `${saved} / ${needed} words saved`
    if (this.progress) this.progress.text = this.progressText
    image(p.content, "LearnIcon", ICON_LEARN, 4.4, 4.4)
    text(p.content, "Need", need, "Headline2", d, {h: lineHeightCm("Headline2", d)})
    text(p.content, "Have", how, "Body", d, {h: lineHeightCm("Body", d), color: TEXT_SOFT})
    const row = flexBox(p.content, "Actions", "row", bodyW, 4.4, {gap: 1.3, justify: FlexJustify.Center, align: FlexAlign.Center})
    button(row, "PracticeDoneButton", 10, 4.2, "Close", d, () => this._onClose.invoke(), {icon: ICON_CLOSE})
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
      setTextColor(this.feedback, good ? GREEN : AMBER)
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
  /** Board sized around its body: header (title, progress, close), optional instruction, body. */
  private frame(subtitle: string, bodyW: number, bodyH: number): {content: SceneObject} {
    this.hide()
    const d = this.viewDistanceCm
    const pad = 1.5, gap = 0.8, closeS = 3.6
    const headH = Math.max(closeS, lineHeightCm("Headline1", d))
    const titleW = textWidthCm("Practice".length, "Headline1", d)
    const progW = textWidthCm("4 / 4 pairs".length + 2, "Headline2", d)
    const inner = Math.max(bodyW, titleW + progW + closeS + 2)
    const subH = subtitle.length > 0 ? lineHeightCm("Caption", d) : 0
    const W = inner + 2 * pad
    const H = 2 * pad + headH + HEADER_RULE_H + gap + (subH > 0 ? subH + gap : 0) + gap + bodyH
    useTone(TONE_PRACTICE)
    const p = panel(this.sceneObject, "PracticeBoard", W, H, {gap: gap, padX: pad, padY: pad, justify: FlexJustify.Center, align: FlexAlign.Center})
    this.root = p.root
    const head = flexBox(p.content, "Header", "row", inner, headH, {gap: 1, justify: FlexJustify.SpaceBetween, align: FlexAlign.Center})
    text(head, "Title", "Practice", "Headline1", d, {w: titleW + 0.5, h: headH, align: "left"})
    this.progress = text(head, "PracticeProgress", "", "Headline2", d, {w: inner - titleW - closeS - 2.5, h: headH, color: TEXT_SOFT, align: "right"})
    button(head, "PracticeCloseButton", closeS, closeS, "", d, () => this._onClose.invoke(), {icon: ICON_CLOSE, iconSize: 2})
    headerRule(p.content, inner)
    if (subH > 0) text(p.content, "Subtitle", subtitle, "Caption", d, {h: subH, color: TEXT_SOFT})
    return {content: p.content}
  }

  private makeCard(parent: SceneObject, side: "hu" | "en", id: string, label: string, pic: Texture | null,
                   w: number, h: number, d: number): void {
    const so = obj(parent, side === "hu" ? `PracticeHu_${id}` : `PracticeEn_${id}`, new vec3(0, 0, 0.1))
    const btn = so.createComponent(Button.getTypeName()) as Button
    btn.size = new vec3(w, h, 1)
    btn.setIsToggleable(true)
    // selection shows as the cyan "selected" state only; it never hints at the matching card
    styleWhenReady(btn)
    // green "matched" fill sits behind the card content (created first = painted first)
    const fill = obj(so, "MatchedFill", new vec3(0, 0, 0.05))
    image(fill, "Fill", FILL, w - 0.5, h - 0.5, this.matchedColor, false)
    fill.enabled = false
    const face = flexBox(so, "Face", "row", w, h, {gap: 0.8, justify: FlexJustify.Center, align: FlexAlign.Center})
    // content sits a little left so the matched checkmark at the right edge never covers the label
    face.getTransform().setLocalPosition(new vec3(-1.3, 0, 0.08))
    if (pic) image(face, "Picture", pic, 3.2)
    text(face, "Label", label, side === "hu" ? "Headline2" : "Subheadline", d, {w: w - (pic ? 5.2 : 1.6) - 3, h: 3.4, onPanel: false})
    const check = obj(so, "Check", new vec3(w / 2 - 1.8, 0, 0.2))
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
