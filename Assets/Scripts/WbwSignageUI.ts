// WbwSignageUI.ts — café lettering: pink-red neon "COFFEE", the wall menu board (drinks, cakes and
//                   pastries with prices), the door's flip sign (NYITVA outside, ZÁRVA inside) and
//                   the café's name (CAFE_NAME) over the entrance.
// Owns: world-space decor text only. Lives in a *UI.ts module so every Component.Text in
//       the project stays inside UI modules (Hard Rule 3). The text itself is not interactive: the
//       menu board's drink lines and the sign faces have authored Learnable_<id> hit boxes in the scene
//       (MENU_LAYOUT below must match MenuBoard/Learnable_* positions).
// Must NOT: hold state or react to the experience.
import {obj} from "./WbwSharedUI"
import {CAFE_NAME} from "./WbwVocab"

const CHALK = new vec4(0.98, 0.97, 0.9, 1)
/** Hand-lettered chalk font for the boards (Kalam, Google Fonts, OFL) — readable, not typed-looking. */
const CHALK_FONT = requireAsset("../Fonts/Kalam.ttf") as Font
/** Half-width (cm) of a world-space Text's implicit layout box at label scale 1 (measured in the preview). */
const TEXT_HALF_W = 8
const CHALK_SOFT = new vec4(0.86, 0.84, 0.76, 1)
// dark lettering on the cream enamel plates (readable in the preview; on the glasses dark reads as cut-out letters)
const SIGN_OPEN = new vec4(0.10, 0.35, 0.20, 1)
const SIGN_CLOSED = new vec4(0.60, 0.10, 0.10, 1)

/** Menu board layout in board-local cm (origin = board centre). The drink lines' Learnable_<id> hit
 *  boxes under MenuBoard sit at (column centre x = -46, item y), 64 x 9 cm. */
export const MENU_LAYOUT = {
  title: "MENÜ",
  titleY: 29,
  headY: 16,
  columns: [
    {head: "ITALOK", x0: -76, x1: -16, items: [
      {id: "tejeskave", name: "tejeskávé", price: "990 Ft", y: 5},
      {id: "presszo", name: "presszó", price: "690 Ft", y: -6},
      {id: "forro_csoki", name: "forró csoki", price: "1090 Ft", y: -17},
    ]},
    {head: "SÜTEMÉNY", x0: 16, x1: 76, items: [
      {id: "repatorta", name: "répatorta", price: "1290 Ft", y: 5},
      {id: "perec", name: "perec", price: "590 Ft", y: -6},
      {id: "kakaos_csiga", name: "kakaós csiga", price: "690 Ft", y: -17},
      {id: "pogacsa", name: "pogácsa", price: "390 Ft", y: -28},
    ]},
  ],
}

@component
export class WbwSignageUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">WbwSignageUI – neon COFFEE sign + chalkboard menu</span>')
  @ui.separator
  @ui.group_start("References")
  @input
  @hint("Where the neon sign hangs (on the white tiles above the coffee bar)")
  neonAnchor!: SceneObject

  @input
  @hint("Where the chalkboard menu text sits (on the chalkboard)")
  chalkboardAnchor!: SceneObject

  @input @allowUndefined
  @hint("The wall menu board's text anchor (board centre, +Z out of the board)")
  menuAnchor: SceneObject | undefined

  @input @allowUndefined
  @hint("The door sign's outside face anchor (+Z points out of the café)")
  signOutsideAnchor: SceneObject | undefined

  @input @allowUndefined
  @hint("The door sign's inside face anchor (+Z points into the café)")
  signInsideAnchor: SceneObject | undefined

  @input @allowUndefined
  @hint("Over the entrance, outside: the café's name")
  facadeAnchor: SceneObject | undefined
  @ui.group_end
  @ui.group_start("Settings")
  @input
  @hint("Neon colour (pink-red, kept bright for the additive display)")
  @widget(new ColorWidget())
  neonColor: vec4 = new vec4(1.0, 0.42, 0.55, 1)

  @input
  @hint("Neon word")
  neonText: string = "COFFEE"

  @input
  @hint("Chalkboard menu lines, separated by |")
  chalkText: string = "SZENDVICS|KÁVÉ · TEA|SÜTEMÉNY"
  @ui.group_end

  onAwake(): void {
    // Text writes no depth, so it must be created AFTER the café geometry behind it
    // (built in WbwMain's start) or the board/tiles paint over it.
    this.createEvent("OnStartEvent").bind(() => {
      const ev = this.createEvent("DelayedCallbackEvent") as DelayedCallbackEvent
      ev.bind(() => this.build())
      ev.reset(0.3)
    })
  }

  private build(): void {
    if (this.neonAnchor) {
      this.neonAnchor.createComponent("Component.Canvas")
      // neon letters ~16 cm tall (text size is capped, so scale the label)
      this.label(this.neonAnchor, "NeonLine1", this.neonText, 4.0, this.neonColor, new vec3(0, 0, 0.6))
    }
    if (this.chalkboardAnchor) {
      this.chalkboardAnchor.createComponent("Component.Canvas")
      const lines = this.chalkText.split("|")
      for (let i = 0; i < lines.length; i++) {
        this.label(this.chalkboardAnchor, `Chalk${i}`, lines[i], 1.9, new vec4(0.98, 0.97, 0.9, 1), new vec3(0, 14 - i * 14, 0.6), HorizontalAlignment.Center, CHALK_FONT)
      }
    }
    if (this.menuAnchor) this.buildMenu(this.menuAnchor)
    if (this.signOutsideAnchor) {
      this.signOutsideAnchor.createComponent("Component.Canvas")
      this.label(this.signOutsideAnchor, "SignNyitva", "NYITVA", 1.25, SIGN_OPEN, new vec3(0, 0, 0.05))
    }
    if (this.signInsideAnchor) {
      this.signInsideAnchor.createComponent("Component.Canvas")
      this.label(this.signInsideAnchor, "SignZarva", "ZÁRVA", 1.25, SIGN_CLOSED, new vec3(0, 0, 0.05))
    }
    if (this.facadeAnchor) {
      this.facadeAnchor.createComponent("Component.Canvas")
      this.label(this.facadeAnchor, "FacadeName", CAFE_NAME.toUpperCase(), 2.6, CHALK, new vec3(0, 3, 0.4))
      this.label(this.facadeAnchor, "FacadeSub", "Word by Word", 1.1, CHALK_SOFT, new vec3(0, -9, 0.4))
    }
  }

  /** The wall menu: title, two columns (drinks · cakes and pastries), name left, price right. */
  private buildMenu(anchor: SceneObject): void {
    anchor.createComponent("Component.Canvas")
    const z = 0.6
    this.label(anchor, "MenuTitle", MENU_LAYOUT.title, 2.4, CHALK, new vec3(0, MENU_LAYOUT.titleY, z), HorizontalAlignment.Center, CHALK_FONT)
    for (const col of MENU_LAYOUT.columns) {
      this.label(anchor, `MenuHead_${col.head}`, col.head, 1.3, CHALK_SOFT, new vec3((col.x0 + col.x1) / 2, MENU_LAYOUT.headY, z), HorizontalAlignment.Center, CHALK_FONT)
      for (const it of col.items) {
        // world-space Text aligns inside a layout box centred on its anchor (half-width about 8 cm per unit
        // of label scale), so the anchors sit that far inside the column edges
        this.label(anchor, `MenuItem_${it.id}`, it.name, 1.1, CHALK, new vec3(col.x0 + TEXT_HALF_W * 1.1, it.y, z), HorizontalAlignment.Left, CHALK_FONT)
        this.label(anchor, `MenuPrice_${it.id}`, it.price, 1.1, CHALK_SOFT, new vec3(col.x1 - TEXT_HALF_W * 1.1, it.y, z), HorizontalAlignment.Right, CHALK_FONT)
      }
    }
  }

  private label(parent: SceneObject, name: string, s: string, scale: number, color: vec4, pos: vec3, align: HorizontalAlignment = HorizontalAlignment.Center, font?: Font): void {
    const so = obj(parent, name, pos)
    so.getTransform().setLocalScale(new vec3(scale, scale, 1))
    const t = so.createComponent("Component.Text") as Text
    if (font) t.font = font
    t.text = s
    t.size = 200
    t.depthTest = true
    t.horizontalAlignment = align
    t.verticalAlignment = VerticalAlignment.Center
    t.horizontalOverflow = HorizontalOverflow.Overflow
    t.verticalOverflow = VerticalOverflow.Overflow
    t.textFill.color = color
  }
}
