// WbwWordCardUI.ts — the Learn-mode word card (passive view).
// Owns: a compact card sized around its contents: illustration, the Hungarian word (most
//       prominent), the English word, the example sentence (HU + EN), Listen / Sentence / Save
//       buttons and a close button; "Playing" state while audio plays; "Saved ✓" state; the
//       "fly into the Saved counter" animation. Emits onPlay, onPlaySentence, onSave, onClose.
// Must NOT: save words, play audio, or decide placement (WbwLearnController does).
// Stable names: WordCard, WordCardPlayButton, WordCardPlaySentenceButton,
//               WordCardSaveButton, WordCardCloseButton, WordCardHu, WordCardEn.
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {FlexAlign, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {button, ButtonParts, flexBox, image, lineHeightCm, panel, retire, setTextColor, text, textWidthCm, CYAN, GREEN, TEXT_LIGHT, TEXT_SOFT, useTone, TONE_LEARN, modeChip, modeChipH} from "./WbwSharedUI"

const ICON_PLAY = requireAsset("../Icons/play_arrow.png") as Texture
const ICON_PLAYING = requireAsset("../Icons/volume_up.png") as Texture
const ICON_SAVE = requireAsset("../Icons/bookmark_add.png") as Texture
const ICON_CHECK = requireAsset("../Icons/check_circle.png") as Texture
const ICON_CLOSE = requireAsset("../Icons/close.png") as Texture
const ICON_SIZE = 2.2 // button() default icon size for 4 cm tall buttons

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
  @ui.label('<span style="color: #60A5FA;">WbwWordCardUI – compact word card (picture, word, example)</span>')
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Viewing distance the text is sized for (cm) — match the Learn controller's card distance")
  @widget(new SliderWidget(40, 110, 5))
  viewDistanceCm: number = 70

  @input
  @hint("Show the example sentence on the card")
  showExample: boolean = true

  @input
  @hint("Seconds the save fly-to-counter animation takes")
  @widget(new SliderWidget(0.2, 1.5, 0.05))
  flySeconds: number = 0.45
  @ui.group_end

  private root: SceneObject | null = null
  private playBtn: ButtonParts | null = null
  private sentenceBtn: ButtonParts | null = null
  private saveBtn: ButtonParts | null = null
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
  /** "word" | "sentence" | "" — which pronunciation is playing. */
  playing: string = ""
  /** True once the shown word is saved. */
  savedShown: boolean = false
  /** Size (cm) of the card currently shown — the Learn controller places it with this. */
  cardSize: vec2 = new vec2(0, 0)
  /** Increments every time a card is shown (lets delayed actions detect a newer card). */
  showCount: number = 0
  get isVisible(): boolean { return this.root !== null }

  private fly: {from: vec3; to: vec3; t0: number; done: () => void} | null = null

  onAwake(): void {
    this.createEvent("UpdateEvent").bind(() => this.tick())
  }

  show(data: WordCardData): void {
    this.hide()
    this.showCount++
    this.sceneObject.getTransform().setLocalScale(vec3.one())
    this.currentWordId = data.id
    this.currentHu = data.hu
    const d = this.viewDistanceCm
    const pad = 1.4, gap = 0.8, btnH = 5.2, btnGap = 1.3, closeS = 3.6
    const picS = data.picture ? 4.6 : 0
    const huH = lineHeightCm("Headline1", d), enH = lineHeightCm("Body", d)
    const wordsW = Math.max(textWidthCm(data.hu.length, "Headline1", d), textWidthCm(data.en.length, "Body", d)) + 0.4
    const headerW = (picS > 0 ? picS + 1 : 0) + wordsW + 1 + closeS
    const exHuStr = `„${data.exampleHu}”`
    const exW = Math.max(textWidthCm(exHuStr.length, "Body", d), textWidthCm(data.exampleEn.length, "Caption", d)) + 0.4
    // icon above a short label: generous targets without a wide card
    const lbl = (n: number) => textWidthCm(n, "Button", d, false) + 1.4
    const playW = Math.max(6, lbl("Playing".length)), sentenceW = Math.max(6, lbl("Sentence".length)), saveW = Math.max(6, lbl("Saved".length))
    const btnRowW = playW + saveW + btnGap + (data.hasSentenceAudio ? sentenceW + btnGap : 0)
    const inner = Math.min(30, Math.max(headerW, this.showExample ? exW : 0, btnRowW))
    const exLines = this.showExample ? Math.ceil(textWidthCm(exHuStr.length, "Body", d) / inner) : 0
    const exHuH = exLines * enH, exEnH = this.showExample ? lineHeightCm("Caption", d) : 0
    const headerH = Math.max(picS, huH + enH) + 0.2
    const W = inner + 2 * pad
    const chipH = modeChipH(d)
    const H = 2 * pad + chipH + gap + headerH + gap + (this.showExample ? exHuH + exEnH + gap : 0) + btnH
    useTone(TONE_LEARN)
    const p = panel(this.sceneObject, "WordCard", W, H, {gap: 0, padX: pad, padY: pad, justify: FlexJustify.SpaceBetween, align: FlexAlign.Center})
    this.root = p.root
    const chipRow = flexBox(p.content, "ChipRow", "row", inner, chipH, {justify: FlexJustify.Start, align: FlexAlign.Center})
    modeChip(chipRow, d)

    const top = flexBox(p.content, "Top", "row", inner, headerH, {gap: 1, justify: FlexJustify.SpaceBetween, align: FlexAlign.Center})
    if (data.picture) image(top, "Illustration", data.picture, picS)
    const words = flexBox(top, "Words", "column", inner - (picS > 0 ? picS + 1 : 0) - closeS - 1, headerH, {gap: 0, justify: FlexJustify.Center, align: FlexAlign.Center})
    text(words, "WordCardHu", data.hu, "Headline1", d, {h: huH})
    text(words, "WordCardEn", data.en, "Body", d, {h: enH, color: TEXT_SOFT})
    button(top, "WordCardCloseButton", closeS, closeS, "", d, () => this._onClose.invoke(), {icon: ICON_CLOSE, iconSize: 2})

    if (this.showExample) {
      const ex = flexBox(p.content, "Example", "column", inner, exHuH + exEnH, {gap: 0, justify: FlexJustify.Center, align: FlexAlign.Center})
      text(ex, "ExampleHu", exHuStr, "Body", d, {h: exHuH, wrap: true})
      text(ex, "ExampleEn", data.exampleEn, "Caption", d, {h: exEnH, color: TEXT_SOFT})
    }

    const row = flexBox(p.content, "Buttons", "row", inner, btnH, {gap: btnGap, justify: FlexJustify.Center, align: FlexAlign.Center})
    this.playBtn = button(row, "WordCardPlayButton", playW, btnH, "Listen", d, () => this._onPlay.invoke(), {icon: ICON_PLAY, column: true, iconSize: ICON_SIZE})
    this.sentenceBtn = data.hasSentenceAudio
      ? button(row, "WordCardPlaySentenceButton", sentenceW, btnH, "Sentence", d, () => this._onPlaySentence.invoke(), {icon: ICON_PLAY, column: true, iconSize: ICON_SIZE})
      : null
    this.savedShown = data.saved
    this.saveBtn = button(row, "WordCardSaveButton", saveW, btnH, data.saved ? "Saved" : "Save", d, () => {
      if (!this.savedShown) this._onSave.invoke()
    }, {icon: data.saved ? ICON_CHECK : ICON_SAVE, labelColor: data.saved ? GREEN : TEXT_LIGHT, primary: !data.saved, column: true, iconSize: ICON_SIZE})
    this.cardSize = new vec2(W, H)
    this.playing = ""
  }

  hide(): void {
    retire(this.root, this)
    this.root = null
    this.playBtn = null
    this.sentenceBtn = null
    this.saveBtn = null
    this.currentWordId = ""
    this.currentHu = ""
    this.playing = ""
    this.savedShown = false
    this.fly = null
    this.sceneObject.getTransform().setLocalScale(vec3.one())
  }

  /** Show which pronunciation is playing ("word" | "sentence"), or "" when audio stopped. */
  setPlaying(kind: string): void {
    this.playing = kind
    this.paintPlay(this.playBtn, "Listen", kind === "word")
    this.paintPlay(this.sentenceBtn, "Sentence", kind === "sentence")
  }

  /** Turn the Save control into "Saved ✓" (green). */
  setSaved(): void {
    this.savedShown = true
    const b = this.saveBtn
    if (!b) return
    if (b.label) {
      b.label.text = "Saved"
      setTextColor(b.label, GREEN)
    }
    if (b.icon) b.icon.mainPass.baseTex = ICON_CHECK
  }

  /** Shrink the card into `worldTarget` (the Saved counter), then hide it. */
  flyTo(worldTarget: vec3, onDone: () => void): void {
    if (!this.root) {
      onDone()
      return
    }
    this.fly = {from: this.sceneObject.getTransform().getWorldPosition(), to: worldTarget, t0: getTime(), done: onDone}
  }

  private paintPlay(b: ButtonParts | null, idleLabel: string, on: boolean): void {
    if (!b || isNull(b.so)) return
    if (b.label) {
      b.label.text = on ? "Playing" : idleLabel
      setTextColor(b.label, on ? CYAN : TEXT_LIGHT)
    }
    if (b.icon) b.icon.mainPass.baseTex = on ? ICON_PLAYING : ICON_PLAY
  }

  private tick(): void {
    // gentle pulse on the playing button so the state is visible, not only the label
    const pb = this.playing === "word" ? this.playBtn : this.playing === "sentence" ? this.sentenceBtn : null
    for (const b of [this.playBtn, this.sentenceBtn]) {
      if (!b || isNull(b.so) || !b.icon) continue
      const size = ICON_SIZE * (b === pb ? 1 + 0.15 * Math.sin(getTime() * 8) : 1)
      b.icon.getSceneObject().getTransform().setLocalScale(new vec3(size, size, 1))
    }
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
