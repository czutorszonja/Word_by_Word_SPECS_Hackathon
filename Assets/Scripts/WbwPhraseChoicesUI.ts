// WbwPhraseChoicesUI.ts — the row of phrase cards for "Use it live" (passive view).
// Owns: phrase cards (picture + Hungarian + English) under a short prompt ("You could say": they are
//       suggested replies, the learner says one out loud; no mode chip since the 26 Nov pass — the HUD's
//       Menu chip names the mode), and which ONE card is chosen (selected state). A `blank` card is a
//       reply with a gap still to fill (e.g. "A … asztalnál ülök."): plain text, not pressable.
//       Emits onPick(phraseId) on every card press, also on the card that is already chosen
//       (= listen again). Choosing is not answering: the controller records an answer only once the
//       learner has said it.
// Must NOT: decide which phrases to offer, advance the order, play audio, or place itself.
// Stable names: PhraseChoices, Head / Prompt, Cards, PhraseCard_<phraseId>
//               (e.g. PhraseCard_szendvicset) with Face / Picture and Words / Hu / En.
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {Button} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button"
import {FlexAlign, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {flexBox, image, item, lineHeightCm, obj, panel, register, retire, setToggleLater, styleWhenReady, text, textWidthCm, READ_BOOST, TEXT_SOFT, useTone, TONE_LIVE} from "./WbwSharedUI"

// English line and the prompt are secondary: ~80 % of the Hungarian size
const EN_SCALE = 0.8

export interface PhraseCardData {
  id: string
  hu: string
  en: string
  picture: Texture | null
  chosen: boolean
  /** A reply with a gap still to fill: shown as plain text, not a button. */
  blank?: boolean
}

@component
export class WbwPhraseChoicesUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">WbwPhraseChoicesUI – phrase cards (picture + HU + EN)</span>')
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Widest the card row should get (cm). Wider rows first wrap phrases to two lines, then use slightly smaller text")
  @widget(new SliderWidget(20, 90, 1))
  maxRowWidthCm: number = 72

  @input
  @hint("Size of the small picture on each phrase card (cm)")
  @widget(new SliderWidget(1.5, 5, 0.1))
  pictureSizeCm: number = 4

  @input
  @hint("Distance the card text is sized for (cm). The cards lie ~125 cm away on the counter; sizing for less keeps them compact.")
  @widget(new SliderWidget(60, 200, 5))
  viewDistanceCm: number = 155   // learner feedback 2026-11-21: bigger cards and text

  @input
  @hint("Smallest text sizing distance used to fit many cards in the row (cm); keeps the English line readable")
  @widget(new SliderWidget(60, 180, 5))
  minViewDistanceCm: number = 130

  @input
  @hint("Show pictures on phrase cards (the learner will decide after the first run)")
  showPictures: boolean = true
  @ui.group_end

  private root: SceneObject | null = null
  private cards: {[id: string]: Button} = {}
  private chosenRev = 0
  private _onPick = new Event<string>()
  /** A card was pressed (arg: its phrase id). Fires on every press, also on the chosen card. */
  get onPick(): PublicApi<string> { return this._onPick.publicApi() }

  /** Phrase ids currently offered (empty when hidden). */
  offeredIds: string[] = []
  /** Id of the card that is chosen (selected state) and waiting to be said ("" = none). */
  chosenId: string = ""
  get isVisible(): boolean { return this.root !== null }
  /** Size (cm) of the last shown card row panel. */
  lastSizeCm: vec2 = new vec2(0, 0)
  /** Same as lastSizeCm, under the name every answer surface shares (the controller places with it). */
  get sizeCm(): vec2 { return this.lastSizeCm }

  show(cards: PhraseCardData[], prompt: string): void {
    this.hide()
    const gap = 1.3, pad = 0.8, cardPadX = 0.6, cardPadY = 0.6, picGap = 0.5, headGap = 1
    const enBoost = READ_BOOST * EN_SCALE
    // compact cards: small picture on the left, Hungarian (primary) over English (smaller).
    // One line each when the row fits; otherwise wrap to at most two lines; if the row is still too
    // wide (many cards), size the text for a closer distance — never below minViewDistanceCm.
    const measure = (d: number) => {
      const picS = this.showPictures ? (this.pictureSizeCm * d) / this.viewDistanceCm : 0
      const extra = 2 * cardPadX + (picS > 0 ? picS + picGap : 0)
      // the generic width estimate runs ~20 % wide for these fonts on phrases; 0.95 keeps a safety margin.
      // A short word has few narrow letters to average out ("Köszönöm!" wrapped its "!"), so it gets more.
      const fit = (n: number) => n <= 12 ? 1.1 : 0.95
      const huWs = cards.map((c) => (textWidthCm(c.hu.length, "Callout", d, false) + 0.3) * fit(c.hu.length))
      const enWs = cards.map((c) => (textWidthCm(c.en.length, "Caption", d, false, enBoost) + 0.3) * fit(c.en.length))
      const single = cards.map((c, i) => Math.max(3.5, huWs[i], enWs[i]))
      const rowOf = (ws: number[]) => ws.reduce((a, b) => a + b + extra, 0) + (cards.length - 1) * gap
      const oneLine = rowOf(single) <= this.maxRowWidthCm
      const textWs = oneLine ? single : cards.map((c, i) =>
        Math.max(3.5, Math.min(huWs[i], huWs[i] / 2 + 0.6), Math.min(enWs[i], enWs[i] / 2 + 0.6)))
      let huLines = 1, enLines = 1
      textWs.forEach((tw, i) => {
        huLines = Math.max(huLines, Math.min(2, Math.ceil(huWs[i] / tw - 0.02)))
        enLines = Math.max(enLines, Math.min(2, Math.ceil(enWs[i] / tw - 0.02)))
      })
      return {d, picS, extra, textWs, huLines, enLines, rowW: rowOf(textWs)}
    }
    let m = measure(this.viewDistanceCm)
    while (m.rowW > this.maxRowWidthCm && m.d - 5 >= this.minViewDistanceCm) m = measure(m.d - 5)
    const d = m.d, picS = m.picS, textWs = m.textWs, rowW = m.rowW
    const huH = m.huLines * lineHeightCm("Callout", d, false), enH = m.enLines * lineHeightCm("Caption", d, false, enBoost)
    const ch = 2 * cardPadY + huH + enH
    const widths = textWs.map((tw) => tw + m.extra)
    const promptH = lineHeightCm("Caption", d, false, enBoost)
    const promptW = textWidthCm(prompt.length, "Caption", d, false, enBoost) + 0.6
    // The prompt has to fit the panel as well: a single short card ("Köszönöm!") is narrower than it.
    const innerW = Math.max(rowW, promptW)
    const W = innerW + 2 * pad
    const H = 2 * pad + promptH + 0.4 + ch
    this.lastSizeCm = new vec2(W, H)
    useTone(TONE_LIVE)
    const p = panel(this.sceneObject, "PhraseChoices", W, H, {gap: 0.4, padX: pad, padY: pad, justify: FlexJustify.Center, align: FlexAlign.Center})
    this.root = p.root
    const head = flexBox(p.content, "Head", "row", innerW, promptH, {gap: headGap, justify: FlexJustify.Center, align: FlexAlign.Center})
    text(head, "Prompt", prompt, "Caption", d, {w: promptW, h: promptH, color: TEXT_SOFT, onPanel: false, boost: enBoost})
    const row = flexBox(p.content, "Cards", "row", rowW, ch, {gap: gap, justify: FlexJustify.Center, align: FlexAlign.Center})
    this.cards = {}
    this.offeredIds = []
    let chosen = ""
    cards.forEach((c, i) => {
      this.makeCard(row, c, widths[i], ch, d, textWs[i], huH, enH, picS, enBoost, cardPadX, picGap)
      if (c.blank) return
      this.offeredIds.push(c.id)
      if (c.chosen) chosen = c.id
    })
    if (chosen) this.setChosen(chosen)
  }

  hide(): void {
    retire(this.root, this)
    this.root = null
    this.cards = {}
    this.chosenId = ""
    this.offeredIds = []
  }

  /** Single select: `id` becomes the chosen (selected) card and every other card is deselected; "" = none. */
  setChosen(id: string): void {
    this.chosenId = this.cards[id] ? id : ""
    this.chosenRev++
    this.applyChosen()
  }

  /** Put every card's toggle in line with chosenId (one frame later, so it wins over UIKit's own flip). */
  private applyChosen(): void {
    for (const cid in this.cards) setToggleLater(this.cards[cid], cid === this.chosenId, this)
  }

  private makeCard(parent: SceneObject, c: PhraseCardData, w: number, h: number, d: number, textW: number,
                   huH: number, enH: number, picS: number, enBoost: number, padX: number, picGap: number): void {
    const so = obj(parent, `PhraseCard_${c.id}`, new vec3(0, 0, 0.1))
    if (c.blank) {
      // the reply with its gap: the same words in the same place, but nothing to press yet
      const face = flexBox(so, "Face", "row", w, h, {gap: picGap, padX: padX, justify: FlexJustify.Center, align: FlexAlign.Center})
      face.getTransform().setLocalPosition(new vec3(0, 0, 0.08))
      const col = flexBox(face, "Words", "column", textW, huH + enH, {gap: 0, justify: FlexJustify.Center, align: FlexAlign.Center})
      text(col, "Hu", c.hu, "Callout", d, {w: textW, h: huH, wrap: true, onPanel: true, align: "left"})
      text(col, "En", c.en, "Caption", d, {w: textW, h: enH, color: TEXT_SOFT, wrap: true, onPanel: true, align: "left", boost: enBoost})
      register(parent, item(so, w, h))
      return
    }
    const btn = so.createComponent(Button.getTypeName()) as Button
    btn.size = new vec3(w, h, 1)
    btn.setIsToggleable(true)
    styleWhenReady(btn)
    const face = flexBox(so, "Face", "row", w, h, {gap: picGap, padX: padX, justify: FlexJustify.Center, align: FlexAlign.Center})
    face.getTransform().setLocalPosition(new vec3(0, 0, 0.08))
    if (picS > 0 && c.picture) image(face, "Picture", c.picture, picS)
    const col = flexBox(face, "Words", "column", textW, huH + enH, {gap: 0, justify: FlexJustify.Center, align: FlexAlign.Center})
    text(col, "Hu", c.hu, "Callout", d, {w: textW, h: huH, wrap: true, onPanel: false, align: "left"})
    text(col, "En", c.en, "Caption", d, {w: textW, h: enH, color: TEXT_SOFT, wrap: true, onPanel: false, align: "left", boost: enBoost})
    register(parent, item(so, w, h))
    btn.onTriggerUp.add(() => {
      // Every press is reported, also on the chosen card (listen again). UIKit flips the toggle on each
      // press; the controller answers onPick with setChosen(), which decides the real selected state.
      const rev = this.chosenRev
      this._onPick.invoke(c.id)
      // nobody answered (the press did not count): put the pressed card back as it was
      if (rev === this.chosenRev) this.applyChosen()
    })
    this.cards[c.id] = btn
  }
}
