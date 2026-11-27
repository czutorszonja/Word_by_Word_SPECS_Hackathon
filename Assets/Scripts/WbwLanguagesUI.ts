// WbwLanguagesUI.ts — the language settings (passive view), opened from the menu's "Languages".
// Word by Word is not a Hungarian app: it labels the world in whatever language the learner is
// learning, explained in the language they speak (learner, 27 Nov: "if I'm an English speaker and I'm
// travelling to Germany, I would be able to switch to German"). The demo carries one word pack,
// English → Hungarian; this view shows that the pair is a setting the learner can always come back to.
// Owns: one panel in the Learn tone, one step at a time like the saved-words viewer:
//         home   "Languages": I speak (English) · I'm learning (Hungarian), and a soft line saying what
//                the demo includes
//         speak / learn   the languages as tiles (native name, English name), the current one ticked;
//                a pack that is not in the demo says so instead of pretending to switch
//       Back steps up; close closes.
// Must NOT: change any word, label or voice (the demo has one pack), or place itself.
// Stable names: Languages, LanguagesTitle, LanguagesCloseButton, LanguagesBackButton,
//               LanguagesSpeak, LanguagesLearn, LanguagesNote, Language_<code>.
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {Button} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button"
import {FlexAlign, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {button, flexBox, image, lineHeightCm, panel, retire, setTextColor, setToggleLater, text, MUTED, TEXT_SOFT, useTone, TONE_LEARN} from "./WbwSharedUI"

const ICON_CLOSE = requireAsset("../Icons/close.png") as Texture
const ICON_NEXT = requireAsset("../Icons/arrow_forward.png") as Texture
const ICON_CHECK = requireAsset("../Icons/check_circle.png") as Texture

export interface Language {
  code: string
  /** The language's own name, shown large. */
  native: string
  /** Its English name, shown under it. */
  english: string
}

/** Languages a learner could pick. Only English (speak) and Hungarian (learn) have a pack in the demo. */
export const LANGUAGES: Language[] = [
  {code: "en", native: "English", english: "English"},
  {code: "hu", native: "Magyar", english: "Hungarian"},
  {code: "de", native: "Deutsch", english: "German"},
  {code: "es", native: "Español", english: "Spanish"},
  {code: "fr", native: "Français", english: "French"},
  {code: "it", native: "Italiano", english: "Italian"},
]
/** The one word pack in this demo: explained in English, learning Hungarian. */
export const DEMO_SPEAK = "en", DEMO_LEARN = "hu"

export type LanguageScreen = "home" | "speak" | "learn"

export function languageByCode(code: string): Language | null {
  for (const l of LANGUAGES) if (l.code === code) return l
  return null
}

const HOME_NOTE = "This demo includes English → Hungarian. Change them any time."
const PICK_NOTE = "This demo includes one word pack."

// layout (cm), as the saved-words viewer
const PAD = 1.4, GAP = 1.3, CLOSE = 3.8, CHOICE_H = 5.6, TILE_H = 5.6, ARROW = 2.2, CHECK = 2.4

@component
export class WbwLanguagesUI extends BaseScriptComponent {
  @ui.label("WbwLanguagesUI – I speak / I'm learning (the demo carries English → Hungarian)")
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Viewing distance the text is sized for (cm)")
  @widget(new SliderWidget(40, 100, 5))
  viewDistanceCm: number = 72

  @input
  @hint("Panel width (cm)")
  @widget(new SliderWidget(30, 50, 1))
  widthCm: number = 38
  @ui.group_end

  private root: SceneObject | null = null
  private noteText: Text | null = null
  private hoverCount = 0
  private _onClose = new Event<void>()
  get onClose(): PublicApi<void> { return this._onClose.publicApi() }

  // ── readable state (LEAF) ──
  screen: LanguageScreen = "home"
  /** The language the learner speaks (explanations, meanings). */
  speak: string = DEMO_SPEAK
  /** The language the learner is learning (labels, cards, phrases, voices). */
  learn: string = DEMO_LEARN
  /** Title shown at the top. */
  title: string = ""
  /** The soft line at the bottom. */
  note: string = ""
  /** Language codes shown as tiles (speak / learn screens). */
  shownCodes: string[] = []
  get isVisible(): boolean { return this.root !== null && !isNull(this.root) }
  /** True while the pointer is on one of the panel's buttons (the follow pauses then). */
  get hovered(): boolean { return this.hoverCount > 0 }

  /** Open on the first step: what you speak and what you are learning. */
  show(): void {
    this.goHome()
  }

  hide(): void {
    if (this.root) retire(this.root, this)
    this.root = null
    this.noteText = null
    this.hoverCount = 0
    this.shownCodes = []
  }

  goHome(): void {
    this.screen = "home"
    this.build()
  }

  /** Home → the list for "I speak" or "I'm learning". */
  openList(which: "speak" | "learn"): void {
    this.screen = which
    this.build()
  }

  back(): void {
    this.goHome()
  }

  /** Whether the demo has a word pack for this choice. */
  available(which: "speak" | "learn", code: string): boolean {
    return which === "speak" ? code === DEMO_SPEAK : code === DEMO_LEARN
  }

  /** A language tile: the demo's pack is chosen (back to home); any other says it is not in the demo. */
  pick(code: string): void {
    if (this.screen !== "speak" && this.screen !== "learn") return
    const which = this.screen
    const lang = languageByCode(code)
    if (!lang) return
    if (this.available(which, code)) {
      if (which === "speak") this.speak = code
      else this.learn = code
      this.goHome()
      return
    }
    this.setNote(`${lang.native} is not in this demo yet. Its words and voices would come as a pack.`)
  }

  private setNote(s: string): void {
    this.note = s
    if (this.noteText && !isNull(this.noteText)) this.noteText.text = s
  }

  // ── building ──
  private build(): void {
    if (this.root) retire(this.root, this)
    this.root = null
    this.noteText = null
    this.hoverCount = 0
    this.shownCodes = []
    if (this.screen === "home") this.buildHome()
    else this.buildList(this.screen)
  }

  /** The panel and its header (Back when not home, title, close) plus room for the note; returns the content and inner width. */
  private frame(title: string, bodyH: number, rows: number): {content: SceneObject; inner: number} {
    const d = this.viewDistanceCm
    const W = this.widthCm, inner = W - 2 * PAD
    const titleH = Math.max(CLOSE, lineHeightCm("Headline2", d))
    const noteH = 2 * lineHeightCm("Body", d)
    const H = 2 * PAD + titleH + bodyH + noteH + (rows + 1) * GAP
    this.title = title
    useTone(TONE_LEARN)
    const p = panel(this.sceneObject, "Languages", W, H, {gap: GAP, padX: PAD, padY: PAD, justify: FlexJustify.Start, align: FlexAlign.Center})
    this.root = p.root
    const head = flexBox(p.content, "Header", "row", inner, titleH, {gap: 1, justify: FlexJustify.SpaceBetween, align: FlexAlign.Center})
    const home = this.screen === "home"
    if (!home) {
      const b = button(head, "LanguagesBackButton", CLOSE, CLOSE, "", d, () => this.back(), {icon: ICON_NEXT, iconSize: 1.9})
      if (b.icon) b.icon.getSceneObject().getTransform().setLocalRotation(quat.fromEulerAngles(0, 0, Math.PI))
      this.track(b.btn)
    }
    const titleW = inner - CLOSE - 1 - (home ? 0 : CLOSE + 1)
    text(head, "LanguagesTitle", title, "Headline2", d, {w: titleW, h: titleH, align: "left"})
    this.track(button(head, "LanguagesCloseButton", CLOSE, CLOSE, "", d, () => this._onClose.invoke(), {icon: ICON_CLOSE, iconSize: 1.9}).btn)
    return {content: p.content, inner}
  }

  /** The soft line at the bottom (wraps to two lines). */
  private addNote(parent: SceneObject, inner: number, s: string): void {
    const d = this.viewDistanceCm
    this.note = s
    this.noteText = text(parent, "LanguagesNote", s, "Body", d, {w: inner, h: 2 * lineHeightCm("Body", d), align: "left", color: TEXT_SOFT, wrap: true})
  }

  /** A full-width row: a small caption ("I speak"), the chosen language under it, and an arrow. */
  private row(parent: SceneObject, name: string, w: number, caption: string, value: string, onClick: () => void): void {
    const d = this.viewDistanceCm
    const b = button(parent, name, w, CHOICE_H, "", d, onClick)
    this.track(b.btn)
    const tw = w - ARROW - 3
    const col = flexBox(b.face, "Words", "column", tw, CHOICE_H - 0.8, {gap: 0, justify: FlexJustify.Center, align: FlexAlign.Start})
    const cap = text(col, "Caption", caption, "Body", d, {w: tw, h: lineHeightCm("Body", d, false), align: "left", color: TEXT_SOFT, onPanel: false})
    cap.horizontalOverflow = HorizontalOverflow.Shrink
    const val = text(col, "Value", value, "Subheadline", d, {w: tw, h: lineHeightCm("Subheadline", d, false), align: "left", onPanel: false})
    val.horizontalOverflow = HorizontalOverflow.Shrink
    image(b.face, "Arrow", ICON_NEXT, ARROW, ARROW, TEXT_SOFT)
  }

  private buildHome(): void {
    const f = this.frame("Languages", 2 * CHOICE_H, 2)
    const sp = languageByCode(this.speak), le = languageByCode(this.learn)
    this.row(f.content, "LanguagesSpeak", f.inner, "I speak", sp ? sp.english : this.speak, () => this.openList("speak"))
    this.row(f.content, "LanguagesLearn", f.inner, "I'm learning", le ? `${le.english} · ${le.native}` : this.learn, () => this.openList("learn"))
    this.addNote(f.content, f.inner, HOME_NOTE)
  }

  /** Two columns of language tiles: native name, English name (or "In this demo"), a tick on the current one. */
  private buildList(which: "speak" | "learn"): void {
    const d = this.viewDistanceCm
    const langs = LANGUAGES.filter((l) => which === "learn" ? l.code !== this.speak : true)
    const rows = Math.ceil(langs.length / 2)
    const gridH = rows * TILE_H + (rows - 1) * GAP
    const f = this.frame(which === "speak" ? "I speak" : "I'm learning", gridH, 1)
    const grid = flexBox(f.content, "Grid", "column", f.inner, gridH, {gap: GAP, justify: FlexJustify.Start, align: FlexAlign.Center})
    const tileW = (f.inner - GAP) / 2
    const current = which === "speak" ? this.speak : this.learn
    for (let r = 0; r < rows; r++) {
      const rowBox = flexBox(grid, `Row${r}`, "row", f.inner, TILE_H, {gap: GAP, justify: FlexJustify.Start, align: FlexAlign.Center})
      for (const l of langs.slice(2 * r, 2 * r + 2)) {
        const on = l.code === current
        const inDemo = this.available(which, l.code)
        // a toggle shows the current choice; a tap never flips it by itself (pick() decides)
        const b = button(rowBox, `Language_${l.code}`, tileW, TILE_H, "", d, () => {
          setToggleLater(b.btn, on, this)
          this.pick(l.code)
        }, {toggle: true})
        b.btn.isOn = on
        this.track(b.btn)
        this.shownCodes.push(l.code)
        const tw = tileW - CHECK - 2.2
        const col = flexBox(b.face, "Words", "column", tw, TILE_H - 0.8, {gap: 0, justify: FlexJustify.Center, align: FlexAlign.Start})
        const nat = text(col, "Native", l.native, "Subheadline", d, {w: tw, h: lineHeightCm("Subheadline", d, false), align: "left", onPanel: false})
        nat.horizontalOverflow = HorizontalOverflow.Shrink
        const subText = inDemo ? (l.english === l.native ? "In this demo" : `${l.english} · in this demo`) : l.english
        const sub = text(col, "Sub", subText, "Body", d,
          {w: tw, h: lineHeightCm("Body", d, false), align: "left", color: inDemo ? TEXT_SOFT : MUTED, onPanel: false})
        sub.horizontalOverflow = HorizontalOverflow.Shrink
        if (!inDemo) setTextColor(nat, MUTED)
        // the tick marks the current choice; the others keep the space so the names line up
        image(b.face, "Check", ICON_CHECK, CHECK, CHECK, on ? TEXT_SOFT : new vec4(1, 1, 1, 0))
      }
    }
    this.addNote(f.content, f.inner, PICK_NOTE)
  }

  private track(btn: Button): void {
    btn.onHoverEnter.add(() => { this.hoverCount++ })
    btn.onHoverExit.add(() => { this.hoverCount = Math.max(0, this.hoverCount - 1) })
  }
}
