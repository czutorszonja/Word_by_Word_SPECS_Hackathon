// WbwHudUI.ts — the "✋ Menu (demo)" button low at the side of the view (passive view).
// Owns: lazy view-follow placement (low-left of view) and the one Menu button, which stands in for
//       the raise-hand gesture (not testable in Preview). Emits onMenu. The current mode and the
//       saved words live in the menu it opens, not on the HUD.
// Must NOT: own saved words or mode (WbwSession does — pushed in via setters).
// Stable names: Hud, MenuButton. SavedBadge and ModeLabel exist with their Text hidden, so tests
//               can still read the saved count and the mode.
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {FlexAlign, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {button, panel, retire, text, textWidthCm, useTone, toneOf} from "./WbwSharedUI"
import {camLook, camPos, camRightFlat, faceRotation} from "./WbwSpatial"

const ICON_HAND = requireAsset("../Icons/back_hand.png") as Texture
/** The button is a stand-in for raising the hand on the glasses. */
const MENU_LABEL = "Menu (demo)"

@component
export class WbwHudUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">WbwHudUI – Menu (demo) stand-in button</span>')
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
  @hint("Use it live: the HUD collapses to a small Menu chip. Sideways offset of the chip (cm, negative = left edge of view)")
  @widget(new SliderWidget(-30, 30, 0.5))
  chipOffsetRightCm: number = -15

  @input
  @hint("Use it live: vertical offset of the Menu chip (cm, negative = low). Low-left keeps it clear of the server, the caption and the phrase cards")
  @widget(new SliderWidget(-35, 10, 0.5))
  chipOffsetUpCm: number = 9   // upper-left: the enlarged phrase helper/cards fill the low part of the view (2026-11-21)

  @input
  @hint("Width of the Menu button on the compact chip (cm); the chip is at least this wide, and wider when the mode name above the button needs it")
  @widget(new SliderWidget(5, 12, 0.1))
  chipWidthCm: number = 7.4

  @input
  @hint("Height of the Menu button on the compact chip (cm); keep at least 3.8 cm so it stays easy to pinch. The mode name sits above it")
  @widget(new SliderWidget(3.8, 6, 0.1))
  chipHeightCm: number = 3.9

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
  /** True while the HUD is collapsed to the small Menu chip (Use it live). */
  get isCompact(): boolean { return this.compact }
  private compact = false
  // size (cm) of the compact chip as built by show(); 0 until it has been built
  private compactW = 0
  private compactH = 0

  onAwake(): void {
    this.createEvent("UpdateEvent").bind(() => this.follow(false))
  }

  /** Use it live: collapse to a small "Menu" chip (mode name above the button) at the low-left edge
   *  of the view so the HUD never covers the server, the caption or the phrase cards. Off restores
   *  the full strip. */
  setCompact(on: boolean): void {
    if (on === this.compact) return
    this.compact = on
    if (this.root) this.show()
  }

  show(): void {
    this.hide()
    const d = this.followDistanceCm
    useTone(toneOf(this.modeLabel))
    // One small button, low at the side of the view: the stand-in for raising the hand. "(demo)" says
    // so. The current mode and the saved words live in the menu it opens, not here.
    const w = Math.max(this.chipWidthCm, textWidthCm(MENU_LABEL.length, "Button", d, false) + 4), h = Math.max(3.8, this.chipHeightCm)
    const W = w + 0.6, H = h + 0.6
    const p = panel(this.sceneObject, "Hud", W, H, {padY: 0.3, justify: FlexJustify.Center, align: FlexAlign.Center}, true)
    this.root = p.root
    this.compactW = W
    this.compactH = H
    button(p.content, "MenuButton", w, h, MENU_LABEL, d, () => this._onMenu.invoke(), {icon: ICON_HAND})
    // saved count + mode stay as (hidden) text objects so their state is still readable by tests
    this.savedText = text(p.root, "SavedBadge", "", "Subheadline", d)
    this.modeText = text(p.root, "ModeLabel", "", "Caption", d)
    this.savedText.enabled = false
    this.modeText.enabled = false
    this.render()
    this.follow(true)
  }

  /** Tuck the Menu button away while a full panel (the saved-words viewer) is open, so it never covers
   *  that panel's own buttons; it comes back when the panel closes. */
  setSuppressed(on: boolean): void {
    if (this.root && this.root.enabled === on) this.root.enabled = !on
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
    const toneChanged = toneOf(label) !== toneOf(this.modeLabel)
    this.modeLabel = label
    if (toneChanged && this.root) this.show() // the HUD wears the colour of the current mode
    else this.render()
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
    // always the small button at the low-left edge (clear of the server, the cards and the counter).
    // The offsets place a chip of chipWidthCm x chipHeightCm; a larger built chip keeps that chip's
    // left and bottom edge and grows to the right and upward.
    let right = this.chipOffsetRightCm, up = this.chipOffsetUpCm
    if (this.compactW > 0) {
      right += (this.compactW - this.chipWidthCm) / 2
      up += (this.compactH - Math.max(3.8, this.chipHeightCm)) / 2
    }
    return camPos().add(look.uniformScale(this.followDistanceCm))
      .add(camRightFlat().uniformScale(right))
      .add(new vec3(0, up, 0))
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
