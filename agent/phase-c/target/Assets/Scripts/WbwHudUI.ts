// WbwHudUI.ts — low side-of-view HUD: the "✋ Menu" stand-in button + saved counter (passive view).
// Owns: lazy view-follow placement (low-left of view), the Menu button, "Saved: N" badge,
//       active-mode label. Emits onMenu. The "✋ Menu" button stands in for the raise-hand
//       gesture (not testable in Preview). The mode name is always visible: as the ModeLabel
//       line on the full strip, and as the HudModeChip above the Menu button on the compact chip.
// Must NOT: own saved words or mode (WbwSession does — pushed in via setters).
// Stable names: Hud, MenuButton, SavedBadge, ModeLabel, HudModeChip (compact only; its text is
//               ChipLabel). In Use it live the HUD is a Menu chip with the mode chip above it;
//               SavedBadge/ModeLabel then exist with their Text hidden.
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {FlexAlign, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {button, flexBox, lineHeightCm, panel, retire, text, textWidthCm, TEXT_SOFT, useTone, toneOf, modeChip, modeChipH} from "./WbwSharedUI"
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
  @hint("Use it live: the HUD collapses to a small Menu chip. Sideways offset of the chip (cm, negative = left edge of view)")
  @widget(new SliderWidget(-30, 30, 0.5))
  chipOffsetRightCm: number = -13

  @input
  @hint("Use it live: vertical offset of the Menu chip (cm, negative = low). Low-left keeps it clear of the server, the caption and the phrase cards")
  @widget(new SliderWidget(-35, 10, 0.5))
  chipOffsetUpCm: number = -15.5

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
    if (this.compact) {
      // A column: the mode chip ("Use it live") above the Menu button, so the mode is named here too,
      // never by colour alone. The button keeps its size (chipWidthCm x chipHeightCm).
      // A column, not a row: side by side the two would reach out of the narrow view.
      const w = this.chipWidthCm, h = Math.max(3.8, this.chipHeightCm)
      // same width modeChip() gives the chip it builds for the current tone
      const modeW = textWidthCm(toneOf(this.modeLabel).label.length, "Caption", d, false) + 1.4
      const W = Math.max(w, modeW + 0.6), H = modeChipH(d) + 0.4 + h + 0.6
      const p = panel(this.sceneObject, "Hud", W, H, {gap: 0.4, padY: 0.3, justify: FlexJustify.Center, align: FlexAlign.Center}, true)
      this.root = p.root
      this.compactW = W
      this.compactH = H
      modeChip(p.content, d, "HudModeChip")
      button(p.content, "MenuButton", w, h, "Menu", d, () => this._onMenu.invoke(), {icon: ICON_HAND})
      // saved count + mode stay as (hidden) text objects so their state is still readable
      this.savedText = text(p.root, "SavedBadge", "", "Subheadline", d)
      this.modeText = text(p.root, "ModeLabel", "", "Caption", d)
      this.savedText.enabled = false
      this.modeText.enabled = false
      this.render()
      this.follow(true)
      return
    }
    // compact strip: Menu stand-in button + saved count + current mode, sized around its text
    const badgeH = lineHeightCm("Subheadline", d), modeH = lineHeightCm("Caption", d)
    const colW = Math.max(textWidthCm("Saved: 99".length, "Subheadline", d), textWidthCm("Mode: Use it live".length, "Caption", d)) + 0.4
    const menuW = 8, rowH = Math.max(4, badgeH + modeH)
    const W = menuW + 1 + colW + 2.4, H = rowH + 1.4
    const p = panel(this.sceneObject, "Hud", W, H, {padX: 1.2, padY: 0.7, justify: FlexJustify.Center, align: FlexAlign.Center}, true)
    this.root = p.root
    const row = flexBox(p.content, "Row", "row", W - 2.4, rowH, {gap: 1, justify: FlexJustify.Center, align: FlexAlign.Center})
    button(row, "MenuButton", menuW, 4, "Menu", d, () => this._onMenu.invoke(), {icon: ICON_HAND})
    const col = flexBox(row, "Status", "column", colW, rowH, {gap: 0, justify: FlexJustify.Center, align: FlexAlign.Center})
    this.savedText = text(col, "SavedBadge", "", "Subheadline", d, {h: badgeH, align: "left"})
    this.modeText = text(col, "ModeLabel", "", "Caption", d, {h: modeH, color: TEXT_SOFT, align: "left"})
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
    let right = this.offsetRightCm, up = this.offsetUpCm
    if (this.compact) {
      // The chip offsets place a chip of chipWidthCm x chipHeightCm. The built chip is larger (mode
      // name above the button): keep that chip's left and bottom edge, grow to the right and upward.
      right = this.chipOffsetRightCm
      up = this.chipOffsetUpCm
      if (this.compactW > 0) {
        right += (this.compactW - this.chipWidthCm) / 2
        up += (this.compactH - Math.max(3.8, this.chipHeightCm)) / 2
      }
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
