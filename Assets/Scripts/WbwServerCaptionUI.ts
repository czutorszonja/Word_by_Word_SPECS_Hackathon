// WbwServerCaptionUI.ts — the server's subtitle (passive view): the top of the conversation strip in
// the line of sight to his face (28 Nov).
// Owns: Hungarian line (large) with English underneath (smaller); a speaking indicator.
// Must NOT: play audio, time the conversation, or position itself (WbwOrderController does).
// Stable names: ServerCaption, CaptionHu, CaptionEn.
import {FlexAlign, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {flexBox, image, lineHeightCm, panel, retire, text, textWidthCm, SOFT, useTone, TONE_LIVE} from "./WbwSharedUI"

const ICON_SPEAK = requireAsset("../Icons/volume_up.png") as Texture

@component
export class WbwServerCaptionUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">WbwServerCaptionUI – server speech caption (HU + EN)</span>')
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Distance the text is sized for (cm): the conversation strip sits about this far away")
  @widget(new SliderWidget(50, 250, 5))
  readDistanceCm: number = 80

  @input
  @hint("Show the English translation under the Hungarian line")
  showEnglish: boolean = true
  @ui.group_end

  private root: SceneObject | null = null
  /** Hungarian caption currently shown ("" when hidden). */
  currentHu: string = ""
  currentEn: string = ""
  get isVisible(): boolean { return this.root !== null }
  /** Size (cm) of the subtitle shown (0 when hidden). */
  sizeCm: vec2 = new vec2(0, 0)

  show(hu: string, en: string): void {
    this.hide()
    this.currentHu = hu
    this.currentEn = en
    const d = this.readDistanceCm
    const huW = textWidthCm(hu.length, "Headline2", d) + 0.6
    const enW = textWidthCm(en.length, "Body", d) + 0.6
    const huH = lineHeightCm("Headline2", d), enH = lineHeightCm("Body", d)
    const iconS = Math.min(4, huH)
    const inner = Math.max(huW + iconS + 1, this.showEnglish ? enW : 0)
    const W = inner + 3
    const H = 2 + huH + (this.showEnglish ? enH + 0.2 : 0)
    this.sizeCm = new vec2(W, H)
    useTone(TONE_LIVE)
    const p = panel(this.sceneObject, "ServerCaption", W, H, {gap: 0.2, padX: 1.5, padY: 1, justify: FlexJustify.Center, align: FlexAlign.Center}, true)
    this.root = p.root
    const row = flexBox(p.content, "HuRow", "row", inner, huH, {gap: 1, justify: FlexJustify.Center, align: FlexAlign.Center})
    image(row, "Speaking", ICON_SPEAK, iconS)
    text(row, "CaptionHu", hu, "Headline2", d, {w: huW, h: huH})
    if (this.showEnglish) text(p.content, "CaptionEn", en, "Body", d, {h: enH, color: SOFT})
  }

  hide(): void {
    retire(this.root, this)
    this.root = null
    this.currentHu = ""
    this.currentEn = ""
    this.sizeCm = new vec2(0, 0)
  }
}
