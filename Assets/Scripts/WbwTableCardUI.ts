// WbwTableCardUI.ts — the large number card standing on one café table (passive view).
// Owns: a ~15 x 10 cm card with the table number (readable from ~3 m). Empty tables get a
//       UIKit Button (selectable); occupied tables get a plain BackPlate (not selectable).
//       Shows a "8 = nyolc" translation pop-up above the card for a few seconds.
// Must NOT: play audio or decide anything about the order (WbwOrderController does).
// Stable names: TableNumberButton_<n> (empty tables), TableNumberCard_<n> (occupied),
//               TableTranslation_<n> (pop-up).
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {Button} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button"
import {FlexAlign, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {BackPlate} from "SpectaclesUIKit.lspkg/Scripts/BackPlate"
import {obj, panel, retire, text, textWidthCm, GOLD, SOFT} from "./WbwSharedUI"

const GOLD_BRIGHT = new vec4(1.0, 0.92, 0.6, 1)

@component
export class WbwTableCardUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">WbwTableCardUI – table number card (+ translation pop-up)</span>')
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Table number shown on the card")
  tableNumber: number = 8

  @input
  @hint("Empty table: the card is a selectable button. Occupied: plain card.")
  selectable: boolean = true

  @input
  @hint("Card size in cm (brief: about 15 x 10 cm)")
  cardSizeCm: vec2 = new vec2(15, 10)

  @input
  @hint("Seconds the translation pop-up stays visible")
  @widget(new SliderWidget(1, 10, 0.5))
  popupSeconds: number = 4
  @ui.group_end

  private popup: SceneObject | null = null
  private popupHideAt = -1
  private _onSelected = new Event<number>()
  get onSelected(): PublicApi<number> { return this._onSelected.publicApi() }
  /** Text of the translation pop-up currently shown ("" when hidden). */
  popupText: string = ""

  onAwake(): void {
    // Build at start (not awake) so UIKit Button/BackPlate sizes apply like runtime-built UI.
    this.createEvent("OnStartEvent").bind(() => this.build())
    this.createEvent("UpdateEvent").bind(() => {
      if (this.popup && this.popupHideAt > 0 && getTime() > this.popupHideAt) this.hideTranslation()
    })
  }

  showTranslation(line: string): void {
    this.hideTranslation()
    this.popupText = line
    const d = 200
    const W = textWidthCm(line.length, "Title2", d) + 4
    const p = panel(this.sceneObject, `TableTranslation_${this.tableNumber}`, W, 9, {justify: FlexJustify.Center, align: FlexAlign.Center})
    p.root.getTransform().setLocalPosition(new vec3(0, this.cardSizeCm.y / 2 + 7, 0.5))
    text(p.content, "Line", line, "Title2", d, {h: 6, color: GOLD})
    this.popup = p.root
    this.popupHideAt = getTime() + this.popupSeconds
  }

  hideTranslation(): void {
    retire(this.popup, this)
    this.popup = null
    this.popupHideAt = -1
    this.popupText = ""
  }

  private build(): void {
    const w = this.cardSizeCm.x, h = this.cardSizeCm.y
    const n = `${this.tableNumber}`
    const holder = obj(this.sceneObject, "Card")
    holder.createComponent("Component.Canvas")
    let face: SceneObject
    if (this.selectable) {
      const so = obj(holder, `TableNumberButton_${n}`)
      const btn = so.createComponent(Button.getTypeName()) as Button
      btn.size = new vec3(w, h, 1)
      btn.onInitialized.add(() => { btn.size = new vec3(w, h, 1) })
      btn.onTriggerUp.add(() => this._onSelected.invoke(this.tableNumber))
      face = obj(so, "Face", new vec3(0, 0, 0.6))
      this.label(face, "Free", "szabad · free", 70, 1, new vec3(0, -h / 2 + 1.4, 0), SOFT)
    } else {
      const so = obj(holder, `TableNumberCard_${n}`)
      const plate = so.createComponent(BackPlate.getTypeName()) as BackPlate
      plate.size = new vec2(w, h)
      face = obj(so, "Face", new vec3(0, 0, 0.6))
    }
    // The number: large enough to read from ~3 m (text size is capped, so scale the label)
    const numScale = (h * 0.62) / (200 / 43.886)
    this.label(face, "Number", n, 200, numScale, new vec3(0, this.selectable ? 0.9 : 0, 0), this.selectable ? GOLD_BRIGHT : SOFT)
  }

  private label(parent: SceneObject, name: string, s: string, size: number, scale: number, pos: vec3, color: vec4): void {
    const so = obj(parent, name, pos)
    so.getTransform().setLocalScale(new vec3(scale, scale, 1))
    const t = so.createComponent("Component.Text") as Text
    t.text = s
    t.size = size
    t.depthTest = true
    t.horizontalAlignment = HorizontalAlignment.Center
    t.verticalAlignment = VerticalAlignment.Center
    t.horizontalOverflow = HorizontalOverflow.Overflow
    t.verticalOverflow = VerticalOverflow.Overflow
    t.textFill.color = color
  }
}
