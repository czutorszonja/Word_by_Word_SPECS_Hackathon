// WbwSetupPanelUI.ts — first-launch language setup panel (passive view).
// Owns: "I speak: English / I want to learn: Hungarian" panel, coming-soon options,
//       the Start button. Emits onConfirm. Holds only view state (visible / status line).
// Must NOT: decide what happens after confirm (WbwMain does), or position itself.
// Stable names for tests: SetupPanel, SetupSpeakEnglish, SetupSpeakOther,
//                         SetupLearnHungarian, SetupLearnOther, SetupConfirmButton.
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {FlexAlign, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {button, flexBox, panel, retire, text, GOLD, SOFT} from "./WbwSharedUI"

const ICON_CHECK = requireAsset("../Icons/check_circle.png") as Texture
const ICON_NEXT = requireAsset("../Icons/arrow_forward.png") as Texture

@component
export class WbwSetupPanelUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">WbwSetupPanelUI – language setup at first launch</span>')
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Panel width in cm (brief: about 40 x 25 cm)")
  @widget(new SliderWidget(30, 60, 1))
  panelWidthCm: number = 38

  @input
  @hint("Panel height in cm")
  @widget(new SliderWidget(18, 40, 1))
  panelHeightCm: number = 25

  @input
  @hint("Viewing distance the text is sized for (cm)")
  @widget(new SliderWidget(40, 120, 5))
  viewDistanceCm: number = 70

  @input
  @hint("Title at the top of the panel")
  titleText: string = "Word by Word"
  @ui.group_end

  private root: SceneObject | null = null
  private status: Text | null = null
  private _onConfirm = new Event<void>()
  get onConfirm(): PublicApi<void> { return this._onConfirm.publicApi() }
  get isVisible(): boolean { return this.root !== null }

  show(): void {
    this.hide()
    const d = this.viewDistanceCm
    const W = this.panelWidthCm, H = this.panelHeightCm
    const p = panel(this.sceneObject, "SetupPanel", W, H, {gap: 1.0, padX: 2, padY: 1.6, justify: FlexJustify.Center, align: FlexAlign.Center})
    this.root = p.root
    text(p.content, "Title", this.titleText, "Headline1", d, {h: 2.6})
    text(p.content, "Subtitle", "Learn the words around you, then use them.", "Caption", d, {h: 1.4, color: SOFT})

    const rowW = W - 4
    const btnW = 12.5
    const labelW = rowW - 2 * btnW - 1.6
    const r1 = flexBox(p.content, "SpeakRow", "row", rowW, 3.4, {gap: 0.8, align: FlexAlign.Center})
    text(r1, "SpeakLabel", "I speak:", "Body", d, {w: labelW, h: 3, align: "left"})
    button(r1, "SetupSpeakEnglish", btnW, 3.2, "English", d, () => this.chosen(), {icon: ICON_CHECK})
    button(r1, "SetupSpeakOther", btnW, 3.2, "Deutsch · soon", d, () => this.comingSoon("Deutsch"), {role: "Caption"})

    const r2 = flexBox(p.content, "LearnRow", "row", rowW, 3.4, {gap: 0.8, align: FlexAlign.Center})
    text(r2, "LearnLabel", "I want to learn:", "Body", d, {w: labelW, h: 3, align: "left"})
    button(r2, "SetupLearnHungarian", btnW, 3.2, "Hungarian", d, () => this.chosen(), {icon: ICON_CHECK})
    button(r2, "SetupLearnOther", btnW, 3.2, "Español · soon", d, () => this.comingSoon("Español"), {role: "Caption"})

    this.status = text(p.content, "Status", "English → Hungarian", "Caption", d, {h: 1.4, color: GOLD})
    button(p.content, "SetupConfirmButton", 16, 3.6, "Start", d, () => this._onConfirm.invoke(), {icon: ICON_NEXT})
  }

  hide(): void {
    retire(this.root, this)
    this.root = null
    this.status = null
  }

  private chosen(): void {
    if (this.status) this.status.text = "English → Hungarian selected"
  }

  private comingSoon(lang: string): void {
    if (this.status) this.status.text = `${lang}: coming soon. The demo uses English → Hungarian.`
  }
}
