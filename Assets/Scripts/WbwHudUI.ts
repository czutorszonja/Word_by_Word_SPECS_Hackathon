// WbwHudUI.ts — low side-of-view HUD: the "✋ Menu" stand-in button + saved counter (passive view).
// Owns: lazy view-follow placement (low-left of view), the Menu button, "Saved: N" badge,
//       active-mode label. Emits onMenu. The "✋ Menu" button stands in for the raise-hand
//       gesture (not testable in Preview).
// Must NOT: own saved words or mode (WbwSession does — pushed in via setters).
// Stable names: Hud, MenuButton, SavedBadge.
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {FlexAlign, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {button, flexBox, panel, retire, text, GOLD, SOFT} from "./WbwSharedUI"
import {camLook, camPos, camRightFlat, faceRotation} from "./WbwSpatial"

const ICON_HAND = requireAsset("../Icons/back_hand.png") as Texture

@component
export class WbwHudUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">WbwHudUI – Menu stand-in button + saved counter</span>')
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Distance in front of the user (cm)")
  @widget(new SliderWidget(40, 100, 1))
  followDistanceCm: number = 60

  @input
  @hint("Sideways offset from the view centre (cm, negative = left)")
  @widget(new SliderWidget(-30, 30, 0.5))
  offsetRightCm: number = -4

  @input
  @hint("Vertical offset from eye level (cm, negative = low)")
  @widget(new SliderWidget(-35, 10, 0.5))
  offsetUpCm: number = -17

  @input
  @hint("Vertical offset used while the user looks down (e.g. at the phrase cards on the counter) — sits above the gaze so it never covers what they look at (cm)")
  @widget(new SliderWidget(-10, 30, 0.5))
  offsetUpLookingDownCm: number = 7

  @input
  @hint("Head pitch below the horizon (degrees) at which the HUD switches to the looking-down offset")
  @widget(new SliderWidget(3, 30, 1))
  lookDownDeg: number = 20

  @input
  @hint("How quickly the HUD catches up with head movement (higher = snappier)")
  @widget(new SliderWidget(1, 15, 0.5))
  followSpeed: number = 5
  @ui.group_end

  private root: SceneObject | null = null
  private savedText: Text | null = null
  private modeText: Text | null = null
  private savedN = 0
  private modeLabel = "—"
  private pulseT = -1
  private _onMenu = new Event<void>()
  get onMenu(): PublicApi<void> { return this._onMenu.publicApi() }
  get isVisible(): boolean { return this.root !== null }

  onAwake(): void {
    this.createEvent("UpdateEvent").bind(() => this.follow(false))
  }

  show(): void {
    this.hide()
    const d = this.followDistanceCm
    const p = panel(this.sceneObject, "Hud", 24, 4.6, {justify: FlexJustify.Center, align: FlexAlign.Center})
    this.root = p.root
    const row = flexBox(p.content, "Row", "row", 23, 4, {gap: 0.6, justify: FlexJustify.Center, align: FlexAlign.Center})
    button(row, "MenuButton", 9, 3.6, "Menu", d, () => this._onMenu.invoke(), {icon: ICON_HAND})
    const col = flexBox(row, "Status", "column", 12.5, 3.8, {gap: 0.1, justify: FlexJustify.Center, align: FlexAlign.Center})
    this.savedText = text(col, "SavedBadge", "", "Subheadline", d, {h: 1.8, color: GOLD})
    this.modeText = text(col, "ModeLabel", "", "Caption", d, {h: 1.5, color: SOFT})
    this.render()
    this.follow(true)
  }

  hide(): void {
    retire(this.root, this)
    this.root = null
    this.savedText = null
    this.modeText = null
  }

  setSaved(n: number): void {
    if (n > this.savedN) this.pulseT = getTime()
    this.savedN = n
    this.render()
  }

  setMode(label: string): void {
    this.modeLabel = label
    this.render()
  }

  /** World position of the saved badge (target for the word card's fly-to animation). */
  getBadgeWorldPos(): vec3 {
    return this.sceneObject.getTransform().getWorldPosition().add(new vec3(0, 0, 0))
  }

  private render(): void {
    if (this.savedText) this.savedText.text = `Saved: ${this.savedN}`
    if (this.modeText) this.modeText.text = `Mode: ${this.modeLabel}`
  }

  private target(): vec3 {
    const look = camLook()
    return camPos().add(look.uniformScale(this.followDistanceCm))
      .add(camRightFlat().uniformScale(this.offsetRightCm))
      .add(new vec3(0, look.y < -Math.sin((this.lookDownDeg * Math.PI) / 180) ? this.offsetUpLookingDownCm : this.offsetUpCm, 0))
  }

  private follow(snap: boolean): void {
    if (!this.root) return
    const t = this.sceneObject.getTransform()
    const goal = this.target()
    const cur = t.getWorldPosition()
    const k = snap ? 1 : Math.min(1, getDeltaTime() * this.followSpeed)
    const pos = vec3.lerp(cur, goal, k)
    t.setWorldPosition(pos)
    t.setWorldRotation(faceRotation(pos, camPos()))
    if (this.pulseT > 0) {
      const e = (getTime() - this.pulseT) / 0.4
      const s = e >= 1 ? 1 : 1 + 0.18 * Math.sin(e * Math.PI)
      if (e >= 1) this.pulseT = -1
      t.setLocalScale(new vec3(s, s, s))
    }
  }
}
