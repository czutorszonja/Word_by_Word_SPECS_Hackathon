// WbwHintUI.ts — view-anchored hint line + edge-of-view attention arrow (passive view).
// Owns: a short hint panel low in the view (e.g. "Open ✋ Menu → Practice while you wait")
//       and a gold arrow at the edge of the view pointing toward something out of view.
// Must NOT: decide the message or the arrow direction (controllers push them in).
// Stable names: Hint, HintText, EdgeArrow.
import {FlexAlign, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {image, lineHeightCm, obj, panel, retire, text, textWidthCm} from "./WbwSharedUI"
import {camLook, camPos, faceRotation} from "./WbwSpatial"

const ICON_ARROW = requireAsset("../Icons/arrow_forward.png") as Texture

@component
export class WbwHintUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">WbwHintUI – hint line + attention arrow</span>')
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Distance in front of the user (cm)")
  @widget(new SliderWidget(40, 100, 1))
  followDistanceCm: number = 62

  @input
  @hint("Vertical offset of the hint line from the view centre (cm)")
  @widget(new SliderWidget(-30, 20, 0.5))
  hintOffsetUpCm: number = -9

  @input
  @hint("How far from the view centre the edge arrow sits (cm)")
  @widget(new SliderWidget(6, 25, 0.5))
  arrowRadiusCm: number = 14

  @input
  @hint("Arrow colour")
  @widget(new ColorWidget())
  arrowColor: vec4 = new vec4(1.0, 0.82, 0.3, 1)
  @ui.group_end

  private hintRoot: SceneObject | null = null
  private arrowRoot!: SceneObject
  private arrowAngle = 0
  private hideAt = -1
  /** Hint text currently shown ("" when hidden). */
  hintText: string = ""
  /** True while the edge arrow is visible. */
  arrowVisible: boolean = false

  onAwake(): void {
    this.arrowRoot = obj(this.sceneObject, "EdgeArrow")
    this.arrowRoot.createComponent("Component.Canvas")
    image(this.arrowRoot, "ArrowIcon", ICON_ARROW, 5, 5, this.arrowColor, false)
    this.arrowRoot.enabled = false
    this.createEvent("UpdateEvent").bind(() => this.tick())
  }

  showHint(msg: string, seconds: number = -1): void {
    this.hideHint()
    this.hintText = msg
    const d = this.followDistanceCm
    const maxW = 30
    const full = textWidthCm(msg.length, "Body", d) + 0.6
    const tw = Math.min(full, maxW)
    const lines = Math.ceil(full / maxW)
    const lh = lineHeightCm("Body", d)
    const p = panel(this.sceneObject, "Hint", tw + 3, lines * lh + 1.6, {justify: FlexJustify.Center, align: FlexAlign.Center, padX: 1.5}, true)
    p.root.getTransform().setLocalPosition(new vec3(0, this.hintOffsetUpCm, 0))
    text(p.content, "HintText", msg, "Body", d, {h: lines * lh, wrap: true})
    this.hintRoot = p.root
    this.hideAt = seconds > 0 ? getTime() + seconds : -1
  }

  hideHint(): void {
    retire(this.hintRoot, this)
    this.hintRoot = null
    this.hintText = ""
    this.hideAt = -1
  }

  /** Show the edge arrow pointing at `angleRad` (0 = right, PI/2 = up) in the view plane. */
  setArrow(visible: boolean, angleRad: number = 0): void {
    this.arrowVisible = visible
    this.arrowAngle = angleRad
    if (this.arrowRoot) this.arrowRoot.enabled = visible
  }

  private tick(): void {
    if (this.hideAt > 0 && getTime() > this.hideAt) this.hideHint()
    // Head-locked placement for both the hint and the arrow.
    const t = this.sceneObject.getTransform()
    const pos = camPos().add(camLook().uniformScale(this.followDistanceCm))
    t.setWorldPosition(pos)
    t.setWorldRotation(faceRotation(pos, camPos()))
    if (this.arrowVisible && this.arrowRoot) {
      const at = this.arrowRoot.getTransform()
      const a = this.arrowAngle
      at.setLocalPosition(new vec3(Math.cos(a) * this.arrowRadiusCm, Math.sin(a) * this.arrowRadiusCm, 0.5))
      const pulse = 1 + 0.12 * Math.sin(getTime() * 6)
      at.setLocalScale(new vec3(pulse, pulse, 1))
      at.setLocalRotation(quat.fromEulerAngles(0, 0, a))
    }
  }
}
