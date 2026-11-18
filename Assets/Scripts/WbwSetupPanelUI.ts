// WbwSetupPanelUI.ts — first-launch language setup panel (passive view).
// Owns: "Choose your languages" panel: "I speak: English" / "I learn: Hungarian" (both shown as
//       selected), a small muted "more languages soon" line, the Start button. Emits onConfirm.
//       The panel is sized around its contents.
// Must NOT: decide what happens after confirm (WbwMain does), or position itself.
// Stable names for tests: SetupPanel, SetupSpeakEnglish, SetupLearnHungarian, SetupConfirmButton.
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {FlexAlign, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {button, flexBox, lineHeightCm, panel, retire, setToggleLater, text, textWidthCm, MUTED, TEXT_SOFT} from "./WbwSharedUI"

const ICON_CHECK = requireAsset("../Icons/check_circle.png") as Texture
const ICON_NEXT = requireAsset("../Icons/arrow_forward.png") as Texture

@component
export class WbwSetupPanelUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">WbwSetupPanelUI – language setup at first launch</span>')
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Viewing distance of the panel (cm); text is sized for it")
  @widget(new SliderWidget(40, 120, 5))
  viewDistanceCm: number = 70

  @input
  @hint("Heading of the panel")
  headingText: string = "Choose your languages"

  @input
  @hint("Muted line about languages that are not available yet")
  comingSoonText: string = "More languages soon: Deutsch, Español"
  @ui.group_end

  private root: SceneObject | null = null
  private _onConfirm = new Event<void>()
  get onConfirm(): PublicApi<void> { return this._onConfirm.publicApi() }
  get isVisible(): boolean { return this.root !== null }

  show(): void {
    this.hide()
    const d = this.viewDistanceCm
    const pad = 1.6, gap = 1.1
    const titleH = lineHeightCm("Headline1", d)
    const titleW = textWidthCm(this.headingText.length, "Headline1", d)
    const labelW = textWidthCm("I speak".length + 1, "Body", d)
    const choiceW = 12, rowH = 4.2
    const soonW = textWidthCm(this.comingSoonText.length, "Caption", d)
    const soonH = lineHeightCm("Caption", d)
    const inner = Math.max(titleW, labelW + 1 + choiceW, soonW) + 0.5
    const W = inner + 2 * pad
    const H = 2 * pad + titleH + 2 * rowH + soonH + 4.4 + 4 * gap
    const p = panel(this.sceneObject, "SetupPanel", W, H, {gap: gap, padX: pad, padY: pad, justify: FlexJustify.Center, align: FlexAlign.Center})
    this.root = p.root
    text(p.content, "Title", this.headingText, "Headline1", d, {h: titleH})

    const r1 = flexBox(p.content, "SpeakRow", "row", inner, rowH, {gap: 1, justify: FlexJustify.Center, align: FlexAlign.Center})
    text(r1, "SpeakLabel", "I speak", "Body", d, {w: labelW, h: rowH, align: "left", color: TEXT_SOFT})
    const en = button(r1, "SetupSpeakEnglish", choiceW, 3.8, "English", d, () => setToggleLater(en.btn, true, this), {icon: ICON_CHECK, toggle: true})
    en.btn.isOn = true

    const r2 = flexBox(p.content, "LearnRow", "row", inner, rowH, {gap: 1, justify: FlexJustify.Center, align: FlexAlign.Center})
    text(r2, "LearnLabel", "I learn", "Body", d, {w: labelW, h: rowH, align: "left", color: TEXT_SOFT})
    const hu = button(r2, "SetupLearnHungarian", choiceW, 3.8, "Hungarian", d, () => setToggleLater(hu.btn, true, this), {icon: ICON_CHECK, toggle: true})
    hu.btn.isOn = true

    // not a choice yet: small, muted, no button
    text(p.content, "SetupSoon", this.comingSoonText, "Caption", d, {h: soonH, color: MUTED, onPanel: false})
    button(p.content, "SetupConfirmButton", 13, 4.4, "Start", d, () => this._onConfirm.invoke(), {icon: ICON_NEXT, primary: true})
  }

  hide(): void {
    retire(this.root, this)
    this.root = null
  }
}
