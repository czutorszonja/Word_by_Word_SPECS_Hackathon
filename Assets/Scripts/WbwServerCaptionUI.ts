// WbwServerCaptionUI.ts — caption bubble above the server's head (passive view).
// Owns: Hungarian line (large) with English underneath (smaller); a speaking indicator.
// Must NOT: play audio, time the conversation, or position itself (WbwOrderController does).
// Stable names: ServerCaption, CaptionHu, CaptionEn.
import {FlexAlign, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {flexBox, image, panel, retire, text, textWidthCm, SOFT} from "./WbwSharedUI"

const ICON_SPEAK = requireAsset("../Icons/volume_up.png") as Texture

@component
export class WbwServerCaptionUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">WbwServerCaptionUI – server speech caption (HU + EN)</span>')
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Viewing distance the text is sized for (cm) — the server is ~150 cm away")
  @widget(new SliderWidget(80, 250, 5))
  viewDistanceCm: number = 150

  @input
  @hint("Show the English translation under the Hungarian line")
  showEnglish: boolean = true
  @ui.group_end

  private root: SceneObject | null = null
  /** Hungarian caption currently shown ("" when hidden). */
  currentHu: string = ""
  currentEn: string = ""
  get isVisible(): boolean { return this.root !== null }

  show(hu: string, en: string): void {
    this.hide()
    this.currentHu = hu
    this.currentEn = en
    const d = this.viewDistanceCm
    const huW = textWidthCm(hu.length, "Headline2", d) + 1
    const enW = textWidthCm(en.length, "Body", d) + 1
    const iconS = 2.8
    const W = Math.max(huW + iconS + 3, enW + 3, 16)
    const H = this.showEnglish ? 9.5 : 6.5
    const p = panel(this.sceneObject, "ServerCaption", W, H, {gap: 0.3, padX: 1.5, padY: 1, justify: FlexJustify.Center, align: FlexAlign.Center})
    this.root = p.root
    const row = flexBox(p.content, "HuRow", "row", W - 2, 4.2, {gap: 0.6, justify: FlexJustify.Center, align: FlexAlign.Center})
    image(row, "Speaking", ICON_SPEAK, iconS)
    text(row, "CaptionHu", hu, "Headline2", d, {w: huW, h: 4})
    if (this.showEnglish) text(p.content, "CaptionEn", en, "Body", d, {h: 2.6, color: SOFT})
  }

  hide(): void {
    retire(this.root, this)
    this.root = null
    this.currentHu = ""
    this.currentEn = ""
  }
}
