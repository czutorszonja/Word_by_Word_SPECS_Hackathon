// WbwModeMenuUI.ts — the mode menu: Learn / Practice / Use it live (passive view).
// Owns: three mode buttons with an active indicator (toggled = active), "Saved words: N",
//       a close button. Emits onPick(mode) and onClose.
// Must NOT: change the mode itself (WbwMain does) or position itself.
// Stable names: ModeMenu, ModeLearnButton, ModePracticeButton, ModeUseLiveButton, ModeMenuCloseButton.
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {Button} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button"
import {FlexAlign, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {button, flexBox, panel, retire, text, GOLD, SOFT} from "./WbwSharedUI"

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
  @hint("Width of each mode button (cm)")
  @widget(new SliderWidget(12, 30, 0.5))
  buttonWidthCm: number = 18
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
    const W = this.buttonWidthCm + 5
    const p = panel(this.sceneObject, "ModeMenu", W, 24, {gap: 0.7, padX: 1.5, padY: 1.4, justify: FlexJustify.Center, align: FlexAlign.Center})
    this.root = p.root
    const head = flexBox(p.content, "Header", "row", W - 3, 3, {gap: 0.5, justify: FlexJustify.SpaceBetween, align: FlexAlign.Center})
    text(head, "Title", "Mode", "Headline2", d, {w: W - 8, h: 2.6, align: "left"})
    button(head, "ModeMenuCloseButton", 3.2, 3.2, "", d, () => this._onClose.invoke(), {icon: ICON_CLOSE, iconSize: 1.8})
    text(p.content, "ActiveLabel", `Active: ${activeLabel}`, "Caption", d, {h: 1.5, color: GOLD})
    const entries: [string, string, string, Texture][] = [
      ["learn", "ModeLearnButton", "Learn", ICON_LEARN],
      ["practice", "ModePracticeButton", "Practice", ICON_PRACTICE],
      ["live", "ModeUseLiveButton", "Use it live", ICON_LIVE],
    ]
    this.buttons = {}
    for (const [mode, name, label, icon] of entries) {
      const b = button(p.content, name, this.buttonWidthCm, 3.8, label, d, () => this.pick(mode), {icon: icon, toggle: true})
      b.btn.isOn = mode === activeMode
      this.buttons[mode] = b.btn
    }
    text(p.content, "SavedCount", `Saved words: ${savedCount}`, "Caption", d, {h: 1.5, color: SOFT})
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
