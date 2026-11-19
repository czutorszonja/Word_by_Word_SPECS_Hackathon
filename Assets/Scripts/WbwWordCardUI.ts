// WbwWordCardUI.ts — the Learn-mode word card (passive view).
// Owns: a compact, steady card sized around its contents: the mode chip ("Learn"), the Hungarian
//       word (most prominent), the English meaning, one status line ("Playing pronunciation" with
//       a pulsing speaker → "Ready to listen again"), Listen again / Save / Use it live buttons and
//       a close button; the "Saved ✓" state of the Save control.
//       Emits onPlay, onSave, onUseLive, onClose.
// Must NOT: save words, play audio, decide placement, follow the pointer or close itself
//           (WbwLearnController does). The card is built once per show(); setPlaying() and
//           setSaved() only repaint it, they never move or rebuild it. Saving never closes it.
// Stable names: WordCard, WordCardHu, WordCardEn, WordCardStatusRow, WordCardStatusIcon,
//               WordCardStatus, WordCardPlayButton, WordCardSaveButton, WordCardUseLiveButton,
//               WordCardCloseButton.
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {FlexAlign, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {button, ButtonParts, flexBox, image, lineHeightCm, panel, retire, setTextColor, text, textWidthCm, GREEN, TEXT_LIGHT, TEXT_SOFT, useTone, TONE_LEARN, TONE_LIVE, modeChip, modeChipH} from "./WbwSharedUI"

const ICON_PLAY = requireAsset("../Icons/play_arrow.png") as Texture
const ICON_PLAYING = requireAsset("../Icons/volume_up.png") as Texture
const ICON_SAVE = requireAsset("../Icons/bookmark_add.png") as Texture
const ICON_CHECK = requireAsset("../Icons/check_circle.png") as Texture
const ICON_CLOSE = requireAsset("../Icons/close.png") as Texture
const ICON_LIVE = requireAsset("../Icons/arrow_forward.png") as Texture
const ICON_SIZE = 2.2 // button() default icon size for 4 cm tall buttons
const STATUS_ICON_SIZE = 1.6 // speaker on the status line (cm)
const STATUS_GAP = 0.5 // between the speaker and the status text (cm)
const PULSE = 0.15 // the speaker grows / shrinks by this share while the word plays

// Wording. The two labels with a glyph are constants so that a glyph the UI font cannot draw is
// dropped in one place (fallbacks: "Saved" and "Use it live"; the tests match the prefix only).
const LISTEN_LABEL = "Listen again"
const SAVE_LABEL = "Save"
const SAVED_LABEL = "Saved ✓"
const USE_LIVE_LABEL = "Use it live →"
const STATUS_PLAYING = "Playing pronunciation"
const STATUS_READY = "Ready to listen again"

export interface WordCardData {
  id: string
  hu: string
  en: string
  saved: boolean
}

@component
export class WbwWordCardUI extends BaseScriptComponent {
  @ui.label("WbwWordCardUI – compact steady word card (word, meaning, status line, three buttons)")
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Viewing distance the text is sized for (cm) — match the Learn controller's card distance")
  @widget(new SliderWidget(40, 110, 5))
  viewDistanceCm: number = 70
  @ui.group_end

  private root: SceneObject | null = null
  private saveBtn: ButtonParts | null = null
  private statusLine: Text | null = null
  private statusIcon: Image | null = null
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
  /** Text on the status line ("" when hidden and until the first setPlaying() after show()). */
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
    const pad = 1.4, gap = 0.8, btnH = 5.2, btnGap = 1.3, closeS = 3.6
    const huH = lineHeightCm("Headline1", d), enH = lineHeightCm("Body", d)
    const wordsW = Math.max(textWidthCm(data.hu.length, "Headline1", d), textWidthCm(data.en.length, "Body", d)) + 0.4
    const headerW = wordsW + 1 + closeS
    const headerH = Math.max(closeS, huH + enH) + 0.2
    // status line: speaker + one line of text, with room for the speaker's pulse
    const statusTextH = lineHeightCm("Caption", d)
    const statusW = STATUS_ICON_SIZE + STATUS_GAP + textWidthCm(Math.max(STATUS_PLAYING.length, STATUS_READY.length), "Caption", d) + 0.4
    const statusH = Math.max(statusTextH, STATUS_ICON_SIZE * (1 + PULSE)) + 0.1
    // icon above a short label: generous targets without a wide card
    const lbl = (n: number) => textWidthCm(n, "Button", d, false) + 1.4
    const playW = Math.max(6, lbl(LISTEN_LABEL.length))
    const saveW = Math.max(6, lbl(Math.max(SAVE_LABEL.length, SAVED_LABEL.length)))
    const liveW = Math.max(6, lbl(USE_LIVE_LABEL.length))
    const btnRowW = playW + saveW + liveW + 2 * btnGap
    // nothing on the card wraps, so the widest row sets the width
    const inner = Math.max(headerW, statusW, btnRowW)
    const W = inner + 2 * pad
    const chipH = modeChipH(d)
    const H = 2 * pad + chipH + gap + headerH + gap + statusH + gap + btnH
    useTone(TONE_LEARN)
    const p = panel(this.sceneObject, "WordCard", W, H, {gap: 0, padX: pad, padY: pad, justify: FlexJustify.SpaceBetween, align: FlexAlign.Center})
    this.root = p.root
    const chipRow = flexBox(p.content, "ChipRow", "row", inner, chipH, {justify: FlexJustify.Start, align: FlexAlign.Center})
    modeChip(chipRow, d)

    // word + meaning share the chip's left edge; the close button sits at the right
    const top = flexBox(p.content, "Top", "row", inner, headerH, {gap: 1, justify: FlexJustify.SpaceBetween, align: FlexAlign.Center})
    const words = flexBox(top, "Words", "column", inner - closeS - 1, headerH, {gap: 0, justify: FlexJustify.Center, align: FlexAlign.Center})
    text(words, "WordCardHu", data.hu, "Headline1", d, {h: huH, align: "left"})
    text(words, "WordCardEn", data.en, "Body", d, {h: enH, color: TEXT_SOFT, align: "left"})
    button(top, "WordCardCloseButton", closeS, closeS, "", d, () => this._onClose.invoke(), {icon: ICON_CLOSE, iconSize: 2})

    // Status line: empty until the controller reports playback with setPlaying(). The speaker's
    // SceneObject stays enabled (it keeps its place in the row); only its Image is switched.
    const status = flexBox(p.content, "WordCardStatusRow", "row", inner, statusH, {gap: STATUS_GAP, justify: FlexJustify.Start, align: FlexAlign.Center})
    this.statusIcon = image(status, "WordCardStatusIcon", ICON_PLAYING, STATUS_ICON_SIZE, STATUS_ICON_SIZE, TEXT_SOFT)
    this.statusIcon.enabled = false
    this.statusLine = text(status, "WordCardStatus", "", "Caption", d, {w: inner - STATUS_ICON_SIZE - STATUS_GAP, h: statusTextH, color: TEXT_SOFT, align: "left"})
    this.statusText = ""

    const row = flexBox(p.content, "Buttons", "row", inner, btnH, {gap: btnGap, justify: FlexJustify.Center, align: FlexAlign.Center})
    button(row, "WordCardPlayButton", playW, btnH, LISTEN_LABEL, d, () => this._onPlay.invoke(), {icon: ICON_PLAY, column: true, iconSize: ICON_SIZE})
    this.savedShown = data.saved
    this.saveBtn = button(row, "WordCardSaveButton", saveW, btnH, data.saved ? SAVED_LABEL : SAVE_LABEL, d, () => {
      if (!this.savedShown) this._onSave.invoke()
    }, {icon: data.saved ? ICON_CHECK : ICON_SAVE, labelColor: data.saved ? GREEN : TEXT_LIGHT, primary: !data.saved, column: true, iconSize: ICON_SIZE})
    // the way into Use it live wears that mode's tone, so the link names where it leads
    button(row, "WordCardUseLiveButton", liveW, btnH, USE_LIVE_LABEL, d, () => this._onUseLive.invoke(), {icon: ICON_LIVE, column: true, iconSize: ICON_SIZE, tone: TONE_LIVE})
    this.cardSize = new vec2(W, H)
    this.playing = ""
  }

  hide(): void {
    retire(this.root, this)
    this.root = null
    this.saveBtn = null
    this.statusLine = null
    this.statusIcon = null
    this.currentWordId = ""
    this.currentHu = ""
    this.playing = ""
    this.savedShown = false
    this.statusText = ""
  }

  /** Report playback on the status line: "word" while the pronunciation plays, "" when it stopped.
   *  The "Listen again" button keeps its label; the card is not rebuilt or moved. */
  setPlaying(kind: string): void {
    if (!this.root) return
    const on = kind.length > 0
    this.playing = kind
    this.statusText = on ? STATUS_PLAYING : STATUS_READY
    if (this.statusLine && !isNull(this.statusLine)) this.statusLine.text = this.statusText
    const ic = this.statusIcon
    if (!ic || isNull(ic)) return
    // playing: soft-white speaker that pulses (tick) · ready: the same speaker, still, in the Learn
    // tint, so the status text never shifts sideways (`ic.enabled = on` would hide it when ready)
    ic.enabled = true
    ic.mainPass.baseColor = on ? TEXT_SOFT : TONE_LEARN.tint
    if (!on) ic.getSceneObject().getTransform().setLocalScale(new vec3(STATUS_ICON_SIZE, STATUS_ICON_SIZE, 1))
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
    // gentle pulse on the speaker while the word plays, so the state is visible, not only the text
    const ic = this.statusIcon
    if (!this.root || this.playing.length === 0 || !ic || isNull(ic)) return
    const size = STATUS_ICON_SIZE * (1 + PULSE * Math.sin(getTime() * 8))
    ic.getSceneObject().getTransform().setLocalScale(new vec3(size, size, 1))
  }
}
