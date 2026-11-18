// WbwToastUI.ts — small transient toast pill ("Café detected (demo)") (passive view).
// Owns: a pill with a location icon + message, auto-hides after N seconds with a shrink-fade.
// Must NOT: decide when to show (WbwMain does) or position itself (caller places root).
// Stable names: CafeToast.
import {FlexAlign, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {flexBox, image, panel, retire, text, textWidthCm} from "./WbwSharedUI"

const ICON_PIN = requireAsset("../Icons/location_on.png") as Texture

@component
export class WbwToastUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">WbwToastUI – transient status toast</span>')
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Viewing distance the text is sized for (cm)")
  @widget(new SliderWidget(40, 120, 5))
  viewDistanceCm: number = 80

  @input
  @hint("Icon tint (location pin)")
  @widget(new ColorWidget())
  iconColor: vec4 = new vec4(1.0, 0.45, 0.45, 1)
  @ui.group_end

  private root: SceneObject | null = null
  private fadeT = -1
  private fadeLen = 0.35
  private hideAt = -1
  lastMessage: string = ""

  get isVisible(): boolean { return this.root !== null }

  onAwake(): void {
    this.createEvent("UpdateEvent").bind(() => this.tick())
  }

  show(message: string, seconds: number): void {
    this.hideNow()
    this.lastMessage = message
    const d = this.viewDistanceCm
    const tw = textWidthCm(message.length, "Subheadline", d) + 1
    const W = tw + 6
    const p = panel(this.sceneObject, "CafeToast", W, 4.4, {justify: FlexJustify.Center, align: FlexAlign.Center})
    this.root = p.root
    const row = flexBox(p.content, "Row", "row", W - 1, 3.6, {gap: 0.6, justify: FlexJustify.Center, align: FlexAlign.Center})
    image(row, "Pin", ICON_PIN, 2.4, 2.4, this.iconColor)
    text(row, "Message", message, "Subheadline", d, {w: tw, h: 3})
    this.sceneObject.getTransform().setLocalScale(vec3.one())
    this.hideAt = getTime() + seconds
    this.fadeT = -1
  }

  hideNow(): void {
    retire(this.root, this)
    this.root = null
    this.hideAt = -1
    this.fadeT = -1
    this.sceneObject.getTransform().setLocalScale(vec3.one())
  }

  private tick(): void {
    if (!this.root) return
    const now = getTime()
    if (this.hideAt > 0 && now >= this.hideAt && this.fadeT < 0) this.fadeT = now
    if (this.fadeT > 0) {
      const k = Math.min(1, (now - this.fadeT) / this.fadeLen)
      const s = 1 - 0.6 * k
      this.sceneObject.getTransform().setLocalScale(new vec3(s, s, s))
      if (k >= 1) this.hideNow()
    }
  }
}
