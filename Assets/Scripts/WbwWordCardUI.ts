// WbwWordCardUI.ts — the Learn-mode word card (passive view).
// Owns: a calm, compact card sized around its contents (2026-11-25 readability pass: one thing to read):
//       the Hungarian word (largest), the English meaning under it, a close button, and one row of
//       three buttons: Listen (its own label and speaker show playback: "Playing…" with a pulsing
//       speaker while the word plays), Save ("Saved ✓" once saved) and Use it live →.
//       No mode chip (the HUD's chip names the mode; the card wears the Learn colour) and no status
//       sentence. Emits onPlay, onSave, onUseLive, onClose.
// Must NOT: save words, play audio, decide placement, follow the pointer or close itself
//           (WbwLearnController does). The card is built once per show(); setPlaying() and
//           setSaved() only repaint it, they never move or rebuild it. Saving never closes it.
// Stable names: WordCard, WordCardHu, WordCardEn, WordCardPlayButton, WordCardSaveButton,
//               WordCardUseLiveButton, WordCardCloseButton.
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {FlexAlign, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {button, ButtonParts, flexBox, lineHeightCm, panel, retire, setTextColor, text, textWidthCm, GREEN, TEXT_LIGHT, TEXT_SOFT, useTone, TONE_LEARN, TONE_LIVE} from "./WbwSharedUI"

const ICON_PLAY = requireAsset("../Icons/play_arrow.png") as Texture
const ICON_PLAYING = requireAsset("../Icons/volume_up.png") as Texture
const ICON_SAVE = requireAsset("../Icons/bookmark_add.png") as Texture
const ICON_CHECK = requireAsset("../Icons/check_circle.png") as Texture
const ICON_CLOSE = requireAsset("../Icons/close.png") as Texture
const ICON_LIVE = requireAsset("../Icons/arrow_forward.png") as Texture
const ICON_SIZE = 2.2 // button() default icon size for 4 cm tall buttons
const PULSE = 0.15 // the Listen button's speaker grows / shrinks by this share while the word plays

// Wording. The two labels with a glyph are constants so that a glyph the UI font cannot draw is
// dropped in one place (fallbacks: "Saved" and "Use it live"; the tests match the prefix only).
const LISTEN_LABEL = "Listen"
const PLAYING_LABEL = "Playing…"
const SAVE_LABEL = "Save"
const SAVED_LABEL = "Saved ✓"
const USE_LIVE_LABEL = "Use it live →"

export interface WordCardData {
  id: string
  hu: string
  en: string
  saved: boolean
  /** Show the "Use it live →" link (default true). Off for words from earlier outings (street, park). */
  live?: boolean
}

@component
export class WbwWordCardUI extends BaseScriptComponent {
  @ui.label("WbwWordCardUI – calm word card (word, meaning, three buttons)")
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Viewing distance the text is sized for (cm) — match the Learn controller's card distance")
  @widget(new SliderWidget(40, 110, 5))
  viewDistanceCm: number = 70
  @ui.group_end

  private root: SceneObject | null = null
  private saveBtn: ButtonParts | null = null
  private listenBtn: ButtonParts | null = null
  private _onPlay = new Event<void>()
  private _onSave = new Event<void>()
  private _onClose = new Event<void>()
  private _onUseLive = new Event<void>()
  /** "Listen again" was selected. */
  get onPlay(): PublicApi<void> { return this._onPlay.publicApi() }
  /** "Save" was selected (only while the shown word is not saved yet). */
  get onSave(): PublicApi<void> { return this._onSave.publicApi() }
  get onClose(): PublicApi<void> { return this._onClose.publicApi() }
  /** "Use it live →" was selected. */
  get onUseLive(): PublicApi<void> { return this._onUseLive.publicApi() }

  /** Word id currently shown ("" when hidden). */
  currentWordId: string = ""
  /** Hungarian text currently shown ("" when hidden). */
  currentHu: string = ""
  /** "word" while the pronunciation plays, else "". */
  playing: string = ""
  /** True once the shown word is saved. */
  savedShown: boolean = false
  /** Size (cm) of the card currently shown — the Learn controller places it with this. */
  cardSize: vec2 = new vec2(0, 0)
  /** Increments every time a card is shown (lets delayed actions detect a newer card). */
  showCount: number = 0
  /** Label on the Listen button: "Playing…" while the word plays, else "Listen" ("" when hidden). */
  statusText: string = ""
  get isVisible(): boolean { return this.root !== null }

  onAwake(): void {
    this.createEvent("UpdateEvent").bind(() => this.tick())
  }

  /** Build the card for one word. The caller places it once; it then stays where it is. */
  show(data: WordCardData): void {
    this.hide()
    this.showCount++
    this.sceneObject.getTransform().setLocalScale(vec3.one())
    this.currentWordId = data.id
    this.currentHu = data.hu
    const d = this.viewDistanceCm
    const pad = 1.6, gap = 1.0, btnH = 5.2, btnGap = 1.3, closeS = 3.8
    const huH = lineHeightCm("HeadlineXL", d), enH = lineHeightCm("Subheadline", d)
    const wordsW = Math.max(textWidthCm(data.hu.length, "HeadlineXL", d), textWidthCm(data.en.length, "Subheadline", d)) + 0.4
    const headerW = wordsW + 1 + closeS
    const headerH = Math.max(closeS, huH + enH) + 0.2
    // icon above a short label: generous targets without a wide card
    const lbl = (n: number) => textWidthCm(n, "Button", d, false) + 1.4
    const playW = Math.max(6, lbl(Math.max(LISTEN_LABEL.length, PLAYING_LABEL.length)))
    const saveW = Math.max(6, lbl(Math.max(SAVE_LABEL.length, SAVED_LABEL.length)))
    const withLive = data.live !== false
    const liveW = Math.max(6, lbl(USE_LIVE_LABEL.length))
    const btnRowW = playW + saveW + (withLive ? liveW + btnGap : 0) + btnGap
    // nothing on the card wraps, so the widest row sets the width
    const inner = Math.max(headerW, btnRowW)
    const W = inner + 2 * pad
    const H = 2 * pad + headerH + gap + btnH
    useTone(TONE_LEARN)
    const p = panel(this.sceneObject, "WordCard", W, H, {gap: 0, padX: pad, padY: pad, justify: FlexJustify.SpaceBetween, align: FlexAlign.Center})
    this.root = p.root

    // word + meaning on the left; the close button at the right
    const top = flexBox(p.content, "Top", "row", inner, headerH, {gap: 1, justify: FlexJustify.SpaceBetween, align: FlexAlign.Center})
    const words = flexBox(top, "Words", "column", inner - closeS - 1, headerH, {gap: 0, justify: FlexJustify.Center, align: FlexAlign.Center})
    text(words, "WordCardHu", data.hu, "HeadlineXL", d, {h: huH, align: "left"})
    text(words, "WordCardEn", data.en, "Subheadline", d, {h: enH, color: TEXT_SOFT, align: "left"})
    button(top, "WordCardCloseButton", closeS, closeS, "", d, () => this._onClose.invoke(), {icon: ICON_CLOSE, iconSize: 2})

    const row = flexBox(p.content, "Buttons", "row", inner, btnH, {gap: btnGap, justify: FlexJustify.Center, align: FlexAlign.Center})
    this.listenBtn = button(row, "WordCardPlayButton", playW, btnH, LISTEN_LABEL, d, () => this._onPlay.invoke(), {icon: ICON_PLAY, column: true, iconSize: ICON_SIZE})
    this.savedShown = data.saved
    this.saveBtn = button(row, "WordCardSaveButton", saveW, btnH, data.saved ? SAVED_LABEL : SAVE_LABEL, d, () => {
      if (!this.savedShown) this._onSave.invoke()
    }, {icon: data.saved ? ICON_CHECK : ICON_SAVE, labelColor: data.saved ? GREEN : TEXT_LIGHT, primary: !data.saved, column: true, iconSize: ICON_SIZE})
    // the way into Use it live wears that mode's tone, so the link names where it leads
    if (withLive) button(row, "WordCardUseLiveButton", liveW, btnH, USE_LIVE_LABEL, d, () => this._onUseLive.invoke(), {icon: ICON_LIVE, column: true, iconSize: ICON_SIZE, tone: TONE_LIVE})
    this.cardSize = new vec2(W, H)
    this.playing = ""
    this.statusText = LISTEN_LABEL
  }

  hide(): void {
    retire(this.root, this)
    this.root = null
    this.saveBtn = null
    this.listenBtn = null
    this.currentWordId = ""
    this.currentHu = ""
    this.playing = ""
    this.savedShown = false
    this.statusText = ""
  }

  /** Report playback on the Listen button: "word" while the pronunciation plays ("Playing…", a pulsing
   *  speaker), "" when it stopped ("Listen", the play icon). The card is not rebuilt or moved. */
  setPlaying(kind: string): void {
    if (!this.root) return
    const on = kind.length > 0
    this.playing = kind
    this.statusText = on ? PLAYING_LABEL : LISTEN_LABEL
    const b = this.listenBtn
    if (!b || isNull(b.so)) return
    if (b.label) b.label.text = this.statusText
    if (b.icon) {
      b.icon.mainPass.baseTex = on ? ICON_PLAYING : ICON_PLAY
      if (!on) b.icon.getSceneObject().getTransform().setLocalScale(new vec3(ICON_SIZE, ICON_SIZE, 1))
    }
  }

  /** Turn the Save control into "Saved ✓" (green label + check icon). The card stays open. */
  setSaved(): void {
    this.savedShown = true
    const b = this.saveBtn
    if (!b || isNull(b.so)) return
    if (b.label) {
      b.label.text = SAVED_LABEL
      setTextColor(b.label, GREEN)
    }
    if (b.icon) b.icon.mainPass.baseTex = ICON_CHECK
  }

  private tick(): void {
    // gentle pulse on the Listen button's speaker while the word plays, so the state is visible, not only the text
    const b = this.listenBtn
    if (!this.root || this.playing.length === 0 || !b || isNull(b.so) || !b.icon) return
    const size = ICON_SIZE * (1 + PULSE * Math.sin(getTime() * 8))
    b.icon.getSceneObject().getTransform().setLocalScale(new vec3(size, size, 1))
  }
}
