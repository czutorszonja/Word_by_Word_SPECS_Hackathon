// WbwPhraseChoicesUI.ts — the row of 2–4 phrase cards for "Use it live" (passive view).
// Owns: phrase cards (picture + Hungarian + English), picked state for multi-pick steps,
//       the optional "Kész / Done" card. Emits onPick(phraseId).
// Must NOT: decide which phrases to offer, advance the order, play audio, or place itself.
// Stable names: PhraseChoices, PhraseCard_<phraseId> (e.g. PhraseCard_uborka_nelkul, PhraseCard_done).
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
  picked: boolean
}

@component
export class WbwPhraseChoicesUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">WbwPhraseChoicesUI – phrase cards (picture + HU + EN)</span>')
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Widest the card row should get (cm). Wider rows first wrap phrases to two lines, then use slightly smaller text")
  @widget(new SliderWidget(20, 70, 1))
  maxRowWidthCm: number = 50

  @input
  @hint("Size of the small picture on each phrase card (cm)")
  @widget(new SliderWidget(1.5, 5, 0.1))
  pictureSizeCm: number = 3.2

  @input
  @hint("Distance the card text is sized for (cm). The cards lie ~125 cm away on the counter; sizing for less keeps them compact.")
  @widget(new SliderWidget(60, 140, 5))
  viewDistanceCm: number = 100

  @input
  @hint("Smallest text sizing distance used to fit many cards in the row (cm); keeps the English line readable")
  @widget(new SliderWidget(60, 120, 5))
  minViewDistanceCm: number = 80

  @input
  @hint("Show pictures on phrase cards (the learner will decide after the first run)")
  showPictures: boolean = true
  @ui.group_end

  private root: SceneObject | null = null
  private cards: {[id: string]: Button} = {}
  private picked: {[id: string]: boolean} = {}
  private _onPick = new Event<string>()
  get onPick(): PublicApi<string> { return this._onPick.publicApi() }

  /** Phrase ids currently offered (empty when hidden). */
  offeredIds: string[] = []
  get isVisible(): boolean { return this.root !== null }
  /** Size (cm) of the last shown card row panel. */
  lastSizeCm: vec2 = new vec2(0, 0)

  show(cards: PhraseCardData[], prompt: string): void {
    this.hide()
    const gap = 1.3, pad = 0.8, cardPadX = 0.6, cardPadY = 0.6, picGap = 0.5
    const enBoost = READ_BOOST * EN_SCALE
    // compact cards: small picture on the left, Hungarian (primary) over English (smaller).
    // One line each when the row fits; otherwise wrap to at most two lines; if the row is still too
    // wide (many cards), size the text for a closer distance — never below minViewDistanceCm.
    const measure = (d: number) => {
      const picS = this.showPictures ? (this.pictureSizeCm * d) / this.viewDistanceCm : 0
      const extra = 2 * cardPadX + (picS > 0 ? picS + picGap : 0)
      // the generic width estimate runs ~20 % wide for these fonts; 0.95 keeps a safety margin
      const huWs = cards.map((c) => (textWidthCm(c.hu.length, "Callout", d, false) + 0.3) * 0.95)
      const enWs = cards.map((c) => (textWidthCm(c.en.length, "Caption", d, false, enBoost) + 0.3) * 0.95)
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
    const W = rowW + 2 * pad
    const H = 2 * pad + promptH + 0.4 + ch
    this.lastSizeCm = new vec2(W, H)
    useTone(TONE_LIVE)
    const p = panel(this.sceneObject, "PhraseChoices", W, H, {gap: 0.4, padX: pad, padY: pad, justify: FlexJustify.Center, align: FlexAlign.Center})
    this.root = p.root
    text(p.content, "Prompt", prompt, "Caption", d, {h: promptH, color: TEXT_SOFT, onPanel: false, boost: enBoost})
    const row = flexBox(p.content, "Cards", "row", rowW, ch, {gap: gap, justify: FlexJustify.Center, align: FlexAlign.Center})
    this.cards = {}
    this.offeredIds = []
    cards.forEach((c, i) => {
      this.makeCard(row, c, widths[i], ch, d, textWs[i], huH, enH, picS, enBoost, cardPadX, picGap)
      this.offeredIds.push(c.id)
    })
  }

  hide(): void {
    retire(this.root, this)
    this.root = null
    this.cards = {}
    this.picked = {}
    this.offeredIds = []
  }

  /** Mark a card as picked (multi-pick steps): selected (cyan) state, further taps ignored. */
  setPicked(id: string): void {
    this.picked[id] = true
    const b = this.cards[id]
    if (b) setToggleLater(b, true, this)
  }

  private makeCard(parent: SceneObject, c: PhraseCardData, w: number, h: number, d: number, textW: number,
                   huH: number, enH: number, picS: number, enBoost: number, padX: number, picGap: number): void {
    const so = obj(parent, `PhraseCard_${c.id}`, new vec3(0, 0, 0.1))
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
      // UIKit flips the toggle on every tap; the controller decides the real picked state
      setToggleLater(btn, !!this.picked[c.id], this)
      if (this.picked[c.id]) return
      this._onPick.invoke(c.id)
    })
    this.cards[c.id] = btn
    if (c.picked) this.setPicked(c.id)
  }
}
