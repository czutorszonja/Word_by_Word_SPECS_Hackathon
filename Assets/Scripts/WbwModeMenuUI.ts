// WbwModeMenuUI.ts — the hand menu (passive view): Learn / Practice / Use it live, Words saved, Languages.
// Owns: a header that names the current mode ("Current mode" + the mode, updated as soon as another
//       mode is picked), three mode tiles with a selected state (each in its own mode colour), a
//       "Words saved" button that opens the saved-words viewer, a "Languages" button that opens the
//       language settings (I speak / I'm learning: Word by Word works for any language pair), and a
//       close button. Panel sized around its contents. Emits onPick(mode), onWords, onLanguages and onClose.
// Must NOT: change the mode itself (WbwMain does) or position itself (WbwMain makes it follow the gaze).
// Stable names: ModeMenu, ModeLearnButton, ModePracticeButton, ModeUseLiveButton, ModeMenuCloseButton,
//               ActiveLabel (the current mode's name), WordsSavedButton, LanguagesButton.
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {Button} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button"
import {FlexAlign, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {button, flexBox, lineHeightCm, panel, retire, text, TEXT_SOFT, useTone, Tone, TONE_LEARN, TONE_LIVE, TONE_PRACTICE} from "./WbwSharedUI"

const ICON_LEARN = requireAsset("../Icons/school.png") as Texture
const ICON_PRACTICE = requireAsset("../Icons/extension.png") as Texture
const ICON_LIVE = requireAsset("../Icons/local_cafe.png") as Texture
const ICON_CLOSE = requireAsset("../Icons/close.png") as Texture
const ICON_WORDS = requireAsset("../Icons/bookmark_add.png") as Texture
const ICON_LANGUAGES = requireAsset("../Icons/translate.png") as Texture // Material "translate"

const MODE_NAMES: {[m: string]: string} = {learn: "Learn", practice: "Practice", live: "Use it live"}

@component
export class WbwModeMenuUI extends BaseScriptComponent {
  @ui.label("WbwModeMenuUI – Learn / Practice / Use it live + Words saved")
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Viewing distance the text is sized for (cm)")
  @widget(new SliderWidget(40, 100, 5))
  viewDistanceCm: number = 55

  @input
  @hint("Width of each mode tile (cm)")
  @widget(new SliderWidget(12, 30, 0.5))
  buttonWidthCm: number = 15
  @ui.group_end

  private root: SceneObject | null = null
  private buttons: {[mode: string]: Button} = {}
  private activeText: Text | null = null
  private hoverCount = 0
  private _onPick = new Event<string>()
  private _onWords = new Event<void>()
  private _onLanguages = new Event<void>()
  private _onClose = new Event<void>()
  get onPick(): PublicApi<string> { return this._onPick.publicApi() }
  /** "Words saved" was pressed: open the saved-words viewer. */
  get onWords(): PublicApi<void> { return this._onWords.publicApi() }
  /** "Languages" was pressed: open the language settings. */
  get onLanguages(): PublicApi<void> { return this._onLanguages.publicApi() }
  get onClose(): PublicApi<void> { return this._onClose.publicApi() }
  get isVisible(): boolean { return this.root !== null }
  /** True while the pointer is on one of the menu's buttons (the follow pauses then). */
  get hovered(): boolean { return this.hoverCount > 0 }

  /** `activeMode` "learn" | "practice" | "live" | "none"; `activeLabel` its display name. */
  show(activeMode: string, activeLabel: string): void {
    this.hide()
    const d = this.viewDistanceCm
    const pad = 1.4, gap = 1.2, tileH = 4.4, closeS = 3.4
    const capH = lineHeightCm("Caption", d)
    const nameH = lineHeightCm("Headline2", d)
    const headH = Math.max(closeS, capH + nameH)
    const inner = this.buttonWidthCm + closeS + 1
    const W = inner + 2 * pad
    // three mode tiles, then Words saved and Languages side by side: five full rows would not fit the
    // Specs view at 55 cm (the Languages row was cut off at the bottom)
    const H = 2 * pad + headH + 4 * tileH + 4 * gap + 0.6
    useTone(TONE_LEARN)
    const p = panel(this.sceneObject, "ModeMenu", W, H, {gap: gap, padX: pad, padY: pad, justify: FlexJustify.Center, align: FlexAlign.Center})
    this.root = p.root
    // header: which mode is on now (named, never colour alone), and close
    const head = flexBox(p.content, "Header", "row", inner, headH, {gap: 1, justify: FlexJustify.SpaceBetween, align: FlexAlign.Center})
    const col = flexBox(head, "Current", "column", inner - closeS - 1, headH, {gap: 0, justify: FlexJustify.Center, align: FlexAlign.Start})
    text(col, "CurrentCaption", "Current mode", "Caption", d, {w: inner - closeS - 1, h: capH, align: "left", color: TEXT_SOFT})
    this.activeText = text(col, "ActiveLabel", activeLabel === "—" ? "None yet" : activeLabel, "Headline2", d, {w: inner - closeS - 1, h: nameH, align: "left"})
    this.track(button(head, "ModeMenuCloseButton", closeS, closeS, "", d, () => this._onClose.invoke(), {icon: ICON_CLOSE, iconSize: 1.9}).btn)
    // each mode button wears its own mode colour, so the colours become learnable
    const entries: [string, string, string, Texture, Tone][] = [
      ["learn", "ModeLearnButton", "Learn", ICON_LEARN, TONE_LEARN],
      ["practice", "ModePracticeButton", "Practice", ICON_PRACTICE, TONE_PRACTICE],
      ["live", "ModeUseLiveButton", "Use it live", ICON_LIVE, TONE_LIVE],
    ]
    this.buttons = {}
    for (const [mode, name, label, icon, tn] of entries) {
      const b = button(p.content, name, inner, tileH, label, d, () => this.pick(mode), {icon: icon, toggle: true, iconSize: 2.4, tone: tn})
      b.btn.isOn = mode === activeMode
      this.buttons[mode] = b.btn
      this.track(b.btn)
    }
    // one row: the saved words (browsable by category, date added or A–Z) and the language pair, a
    // setting (English → Hungarian in this demo, any pair on a real trip)
    const half = (inner - gap) / 2
    const row = flexBox(p.content, "MoreRow", "row", inner, tileH, {gap: gap, justify: FlexJustify.Center, align: FlexAlign.Center})
    this.track(button(row, "WordsSavedButton", half, tileH, "Words saved", d, () => this._onWords.invoke(), {icon: ICON_WORDS, iconSize: 2.2}).btn)
    this.track(button(row, "LanguagesButton", half, tileH, "Languages", d, () => this._onLanguages.invoke(), {icon: ICON_LANGUAGES, iconSize: 2.2}).btn)
  }

  hide(): void {
    retire(this.root, this)
    this.root = null
    this.buttons = {}
    this.activeText = null
    this.hoverCount = 0
  }

  private pick(mode: string): void {
    for (const m in this.buttons) this.buttons[m].isOn = m === mode
    // the header changes with the choice
    if (this.activeText && !isNull(this.activeText)) this.activeText.text = MODE_NAMES[mode] ?? mode
    this._onPick.invoke(mode)
  }

  private track(btn: Button): void {
    btn.onHoverEnter.add(() => { this.hoverCount++ })
    btn.onHoverExit.add(() => { this.hoverCount = Math.max(0, this.hoverCount - 1) })
  }
}
