// WbwPhraseChoicesUI.ts — the row of 2–4 phrase cards for "Use it live" (passive view).
// Owns: phrase cards (picture + Hungarian + English), picked state for multi-pick steps,
//       the optional "Kész / Done" card. Emits onPick(phraseId).
// Must NOT: decide which phrases to offer, advance the order, play audio, or place itself.
// Stable names: PhraseChoices, PhraseCard_<phraseId> (e.g. PhraseCard_uborka_nelkul, PhraseCard_done).
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {Button} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button"
import {FlexAlign, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {flexBox, image, item, obj, panel, register, retire, setToggleLater, text, GOLD, SOFT} from "./WbwSharedUI"

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
  @hint("Width of one phrase card (cm)")
  @widget(new SliderWidget(8, 16, 0.5))
  cardWidthCm: number = 14

  @input
  @hint("Height of one phrase card (cm)")
  @widget(new SliderWidget(7, 16, 0.5))
  cardHeightCm: number = 13

  @input
  @hint("Viewing distance the text is sized for (cm) — brief: ~60 cm")
  @widget(new SliderWidget(40, 100, 5))
  viewDistanceCm: number = 125

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

  show(cards: PhraseCardData[], prompt: string): void {
    this.hide()
    const d = this.viewDistanceCm
    const cw = this.cardWidthCm, ch = this.showPictures ? this.cardHeightCm : this.cardHeightCm - 4
    const gap = 0.6
    const W = cards.length * cw + (cards.length - 1) * gap + 2.4
    const H = ch + 4
    const p = panel(this.sceneObject, "PhraseChoices", W, H, {gap: 0.5, padX: 1.2, padY: 0.9, justify: FlexJustify.Center, align: FlexAlign.Center})
    this.root = p.root
    text(p.content, "Prompt", prompt, "Caption", d, {h: 1.6, color: GOLD})
    const row = flexBox(p.content, "Cards", "row", W - 2.4, ch, {gap: gap, justify: FlexJustify.Center, align: FlexAlign.Center})
    this.cards = {}
    this.offeredIds = []
    for (const c of cards) {
      this.makeCard(row, c, cw, ch, d)
      this.offeredIds.push(c.id)
    }
  }

  hide(): void {
    retire(this.root, this)
    this.root = null
    this.cards = {}
    this.picked = {}
    this.offeredIds = []
  }

  /** Mark a card as picked (multi-pick steps): gold "toggled" highlight, further taps ignored. */
  setPicked(id: string): void {
    this.picked[id] = true
    const b = this.cards[id]
    if (b) setToggleLater(b, true, this)
  }

  private makeCard(parent: SceneObject, c: PhraseCardData, w: number, h: number, d: number): void {
    const so = obj(parent, `PhraseCard_${c.id}`, new vec3(0, 0, 0.1))
    const btn = so.createComponent(Button.getTypeName()) as Button
    btn.size = new vec3(w, h, 1)
    btn.setIsToggleable(true)
    const face = flexBox(so, "Face", "column", w, h, {gap: 0.25, padY: 0.6, justify: FlexJustify.Center, align: FlexAlign.Center})
    face.getTransform().setLocalPosition(new vec3(0, 0, 0.08))
    if (this.showPictures && c.picture) image(face, "Picture", c.picture, 3.8)
    text(face, "Hu", c.hu, "Subheadline", d, {h: 2.6, wrap: true})
    text(face, "En", c.en, "Caption", d, {h: 1.8, color: SOFT, wrap: true})
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
