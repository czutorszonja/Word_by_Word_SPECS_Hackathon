// WbwModeMenuUI.ts — the hand menu: Learn / Practice / Use it live (passive view).
// Owns: three mode tiles with a selected state (toggled = active mode), a short "Active: …"
//       line, "Saved words: N", a close button. Panel sized around its contents.
//       Emits onPick(mode) and onClose.
// Must NOT: change the mode itself (WbwMain does) or position itself.
// Stable names: ModeMenu, ModeLearnButton, ModePracticeButton, ModeUseLiveButton, ModeMenuCloseButton,
//               ActiveLabel, SavedCount.
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {Button} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button"
import {FlexAlign, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {button, flexBox, lineHeightCm, panel, retire, text, textWidthCm, TEXT_SOFT, useTone, headerRule, HEADER_RULE_H, Tone, TONE_LEARN, TONE_LIVE, TONE_PRACTICE} from "./WbwSharedUI"

const ICON_LEARN = requireAsset("../Icons/school.png") as Texture
const ICON_PRACTICE = requireAsset("../Icons/extension.png") as Texture
const ICON_LIVE = requireAsset("../Icons/local_cafe.png") as Texture
const ICON_CLOSE = requireAsset("../Icons/close.png") as Texture

@component
export class WbwModeMenuUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">WbwModeMenuUI – Learn / Practice / Use it live</span>')
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

  @input
  @hint("Heading of the menu")
  headingText: string = "Choose a mode"
  @ui.group_end

  private root: SceneObject | null = null
  private buttons: {[mode: string]: Button} = {}
  private _onPick = new Event<string>()
  private _onClose = new Event<void>()
  get onPick(): PublicApi<string> { return this._onPick.publicApi() }
  get onClose(): PublicApi<void> { return this._onClose.publicApi() }
  get isVisible(): boolean { return this.root !== null }

  show(activeMode: string, activeLabel: string, savedCount: number): void {
    this.hide()
    const d = this.viewDistanceCm
    const pad = 1.4, gap = 1.2, tileH = 4.4, closeS = 3.4
    const headH = Math.max(closeS, lineHeightCm("Headline2", d))
    const capH = lineHeightCm("Caption", d)
    const titleW = textWidthCm(this.headingText.length, "Headline2", d)
    const inner = Math.max(this.buttonWidthCm, titleW + 1 + closeS)
    const W = inner + 2 * pad
    const H = 2 * pad + headH + HEADER_RULE_H + capH + 3 * tileH + capH + 6 * gap
    useTone(TONE_LEARN)
    const p = panel(this.sceneObject, "ModeMenu", W, H, {gap: gap, padX: pad, padY: pad, justify: FlexJustify.Center, align: FlexAlign.Center})
    this.root = p.root
    const head = flexBox(p.content, "Header", "row", inner, headH, {gap: 1, justify: FlexJustify.SpaceBetween, align: FlexAlign.Center})
    text(head, "Title", this.headingText, "Headline2", d, {w: inner - closeS - 1, h: headH, align: "left"})
    button(head, "ModeMenuCloseButton", closeS, closeS, "", d, () => this._onClose.invoke(), {icon: ICON_CLOSE, iconSize: 1.9})
    headerRule(p.content, inner)
    text(p.content, "ActiveLabel", `Active: ${activeLabel}`, "Caption", d, {h: capH, color: TEXT_SOFT})
    // each mode button wears its own mode colour, so the colours become learnable
    const entries: [string, string, string, Texture, Tone][] = [
      ["learn", "ModeLearnButton", "Learn", ICON_LEARN, TONE_LEARN],
      ["practice", "ModePracticeButton", "Practice", ICON_PRACTICE, TONE_PRACTICE],
      ["live", "ModeUseLiveButton", "Use it live", ICON_LIVE, TONE_LIVE],
    ]
    this.buttons = {}
    for (const [mode, name, label, icon, tn] of entries) {
      const b = button(p.content, name, this.buttonWidthCm, tileH, label, d, () => this.pick(mode), {icon: icon, toggle: true, iconSize: 2.4, tone: tn})
      b.btn.isOn = mode === activeMode
      this.buttons[mode] = b.btn
    }
    text(p.content, "SavedCount", `Saved words: ${savedCount}`, "Caption", d, {h: capH, color: TEXT_SOFT})
  }

  hide(): void {
    retire(this.root, this)
    this.root = null
    this.buttons = {}
  }

  private pick(mode: string): void {
    for (const m in this.buttons) this.buttons[m].isOn = m === mode
    this._onPick.invoke(mode)
  }
}
