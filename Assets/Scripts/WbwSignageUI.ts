// WbwSignageUI.ts — decorative café lettering (pink-red neon "COFFEE", chalkboard menu).
// Owns: world-space decor text only. Lives in a *UI.ts module so every Component.Text in
//       the project stays inside UI modules (Hard Rule 3). Not interactive.
// Must NOT: hold state or react to the experience.
import {obj} from "./WbwSharedUI"

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
      this.label(this.neonAnchor, "NeonLine1", this.neonText, 4.0, this.neonColor, new vec3(0, 20, 0.6))
      this.label(this.neonAnchor, "NeonLine2", this.neonText, 4.0, this.neonColor, new vec3(0, -14, 0.6))
    }
    if (this.chalkboardAnchor) {
      this.chalkboardAnchor.createComponent("Component.Canvas")
      const lines = this.chalkText.split("|")
      for (let i = 0; i < lines.length; i++) {
        this.label(this.chalkboardAnchor, `Chalk${i}`, lines[i], 1.9, new vec4(0.98, 0.97, 0.9, 1), new vec3(0, 14 - i * 14, 0.6))
      }
    }
  }

  private label(parent: SceneObject, name: string, s: string, scale: number, color: vec4, pos: vec3): void {
    const so = obj(parent, name, pos)
    so.getTransform().setLocalScale(new vec3(scale, scale, 1))
    const t = so.createComponent("Component.Text") as Text
    t.text = s
    t.size = 200
    t.depthTest = true
    t.horizontalAlignment = HorizontalAlignment.Center
    t.verticalAlignment = VerticalAlignment.Center
    t.horizontalOverflow = HorizontalOverflow.Overflow
    t.verticalOverflow = VerticalOverflow.Overflow
    t.textFill.color = color
  }
}
