// WbwWordCardUI.ts — the Learn-mode word card (passive view).
// Owns: illustration, Hungarian word (large), English word, example sentence (HU + EN),
//       ▶ word / ▶ sentence / Save / close buttons, and the "fly into the Saved counter"
//       animation. Emits onPlay, onPlaySentence, onSave, onClose.
// Must NOT: save words, play audio, or decide placement (WbwLearnController does).
// Stable names: WordCard, WordCardPlayButton, WordCardPlaySentenceButton,
//               WordCardSaveButton, WordCardCloseButton, WordCardHu, WordCardEn.
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {FlexAlign, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {button, flexBox, image, panel, retire, text, GOLD, GREEN, SOFT} from "./WbwSharedUI"

const ICON_PLAY = requireAsset("../Icons/play_arrow.png") as Texture
const ICON_SAVE = requireAsset("../Icons/bookmark_add.png") as Texture
const ICON_CHECK = requireAsset("../Icons/check_circle.png") as Texture
const ICON_CLOSE = requireAsset("../Icons/close.png") as Texture

export interface WordCardData {
  id: string
  hu: string
  en: string
  exampleHu: string
  exampleEn: string
  picture: Texture | null
  saved: boolean
  hasSentenceAudio: boolean
}

@component
export class WbwWordCardUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">WbwWordCardUI – word card (illustration, HU, EN, example)</span>')
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Card width in cm (brief: about 25 x 18 cm)")
  @widget(new SliderWidget(20, 40, 0.5))
  cardWidthCm: number = 25

  @input
  @hint("Card height in cm")
  @widget(new SliderWidget(15, 30, 0.5))
  cardHeightCm: number = 19.5

  @input
  @hint("Viewing distance the text is sized for (cm)")
  @widget(new SliderWidget(40, 110, 5))
  viewDistanceCm: number = 70

  @input
  @hint("Seconds the save fly-to-counter animation takes")
  @widget(new SliderWidget(0.2, 1.5, 0.05))
  flySeconds: number = 0.45
  @ui.group_end

  private root: SceneObject | null = null
  private _onPlay = new Event<void>()
  private _onPlaySentence = new Event<void>()
  private _onSave = new Event<void>()
  private _onClose = new Event<void>()
  get onPlay(): PublicApi<void> { return this._onPlay.publicApi() }
  get onPlaySentence(): PublicApi<void> { return this._onPlaySentence.publicApi() }
  get onSave(): PublicApi<void> { return this._onSave.publicApi() }
  get onClose(): PublicApi<void> { return this._onClose.publicApi() }

  /** Word id currently shown ("" when hidden). */
  currentWordId: string = ""
  /** Hungarian text currently shown ("" when hidden). */
  currentHu: string = ""
  get isVisible(): boolean { return this.root !== null }

  private fly: {from: vec3; to: vec3; t0: number; done: () => void} | null = null

  onAwake(): void {
    this.createEvent("UpdateEvent").bind(() => this.tickFly())
  }

  show(data: WordCardData): void {
    this.hide()
    this.sceneObject.getTransform().setLocalScale(vec3.one())
    this.currentWordId = data.id
    this.currentHu = data.hu
    const d = this.viewDistanceCm
    const W = this.cardWidthCm, H = this.cardHeightCm
    const inner = W - 3
    const p = panel(this.sceneObject, "WordCard", W, H, {gap: 0.6, padX: 1.5, padY: 1.2, justify: FlexJustify.Center, align: FlexAlign.Center})
    this.root = p.root

    const top = flexBox(p.content, "Top", "row", inner, 6.8, {gap: 0.7, align: FlexAlign.Center})
    if (data.picture) image(top, "Illustration", data.picture, 6.2)
    const words = flexBox(top, "Words", "column", inner - 6.2 - 3.4 - 1.4, 6.4, {gap: 0.2, justify: FlexJustify.Center, align: FlexAlign.Center})
    text(words, "WordCardHu", data.hu, "Headline1", d, {h: 3.4})
    text(words, "WordCardEn", data.en, "Body", d, {h: 2, color: SOFT})
    button(top, "WordCardCloseButton", 3.2, 3.2, "", d, () => this._onClose.invoke(), {icon: ICON_CLOSE, iconSize: 1.8})

    text(p.content, "ExampleHu", `„${data.exampleHu}”`, "Body", d, {h: 2.2, color: GOLD, wrap: true})
    text(p.content, "ExampleEn", data.exampleEn, "Caption", d, {h: 1.5, color: SOFT})

    const row = flexBox(p.content, "Buttons", "row", inner, 3.8, {gap: 0.7, justify: FlexJustify.Center, align: FlexAlign.Center})
    button(row, "WordCardPlayButton", 6, 3.4, "Word", d, () => this._onPlay.invoke(), {icon: ICON_PLAY})
    if (data.hasSentenceAudio) {
      button(row, "WordCardPlaySentenceButton", 7.6, 3.4, "Sentence", d, () => this._onPlaySentence.invoke(), {icon: ICON_PLAY})
    }
    if (data.saved) {
      button(row, "WordCardSaveButton", 6.6, 3.4, "Saved", d, () => this._onSave.invoke(), {icon: ICON_CHECK, labelColor: GREEN})
    } else {
      button(row, "WordCardSaveButton", 6.6, 3.4, "Save", d, () => this._onSave.invoke(), {icon: ICON_SAVE})
    }
  }

  hide(): void {
    retire(this.root, this)
    this.root = null
    this.currentWordId = ""
    this.currentHu = ""
    this.fly = null
    this.sceneObject.getTransform().setLocalScale(vec3.one())
  }

  /** Shrink the card into `worldTarget` (the Saved counter), then hide it. */
  flyTo(worldTarget: vec3, onDone: () => void): void {
    if (!this.root) {
      onDone()
      return
    }
    this.fly = {from: this.sceneObject.getTransform().getWorldPosition(), to: worldTarget, t0: getTime(), done: onDone}
  }

  private tickFly(): void {
    if (!this.fly) return
    const k = Math.min(1, (getTime() - this.fly.t0) / Math.max(0.05, this.flySeconds))
    const e = k * k * (3 - 2 * k)
    const t = this.sceneObject.getTransform()
    t.setWorldPosition(vec3.lerp(this.fly.from, this.fly.to, e))
    const s = 1 - 0.88 * e
    t.setLocalScale(new vec3(s, s, s))
    if (k >= 1) {
      const done = this.fly.done
      this.fly = null
      this.hide()
      done()
    }
  }
}
