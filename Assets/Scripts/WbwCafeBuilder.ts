// WbwCafeBuilder.ts — runtime logic for the AUTHORED café (no visible geometry is built here).
// The whole café — textured room shell, counters, props, lights, seating, lounge, server —
// is authored in the Scene Hierarchy under `Cafe` (see Scene panel). This script only:
//   • snaps the café floor to the user's eye height (preview camera height varies per run),
//   • finds every authored learnable object `Learnable_<id>` (under SandwichCounter,
//     PastryDisplay and CoffeeArea) and gives it a box collider fitted to its mesh + a SIK
//     Interactable. Non-learnable props (tongs, cup stacks, glasses) get nothing and never
//     highlight.
// Must NOT: build visible geometry, run Learn/Order/Practice logic, or create text/UI.
import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {camPos} from "./WbwSpatial"
import {wordById} from "./WbwVocab"

export interface Learnable {
  id: string
  so: SceneObject
  size: vec3
  interactable: Interactable
}

@component
export class WbwCafeBuilder extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">WbwCafeBuilder – floor snap + learnable colliders for the authored café</span>')
  @ui.separator
  @ui.group_start("References")
  @input @hint("Authored unit root: sandwich counter (front edge ~100 cm ahead)") sandwichCounter!: SceneObject
  @input @hint("Authored unit root: pastry display (left of the sandwich counter)") pastryDisplay!: SceneObject
  @input @hint("Authored unit root: coffee area (right of the sandwich counter)") coffeeArea!: SceneObject
  @input @hint("Authored unit root: seating area; children named Table_<n>") seating!: SceneObject
  @ui.group_end
  @ui.group_start("Settings")
  @input
  @hint("Keep the café floor this far below the user's eyes (cm). The preview camera height can differ between runs.")
  @widget(new SliderWidget(120, 190, 1))
  eyeHeightCm: number = 160

  @input
  @hint("Snap the café floor to (user eye height - eyeHeightCm) during the first seconds")
  alignToUserHeight: boolean = true

  @input
  @hint("Also centre the café on the user's start spot (x/z) — the brief starts the user at the counter. The preview can remember a moved head position between runs.")
  alignToUserPosition: boolean = true

  @input
  @hint("Stop the start-up alignment as soon as the user has walked this far (cm), so the room never slides along")
  @widget(new SliderWidget(2, 50, 1))
  stopAligningAfterWalkCm: number = 12

  @input
  @hint("Extra margin added around each learnable's mesh for its hit box (cm)")
  @widget(new SliderWidget(0, 6, 0.5))
  colliderPaddingCm: number = 1.5
  @ui.group_end
  @ui.group_start("Debug")
  @input
  @hint("Draw learnable colliders as wireframes (takes effect on preview restart)")
  debugColliders: boolean = false
  @ui.group_end

  /** Every learnable object found in the authored café. */
  learnables: Learnable[] = []
  /** True once build() has run. */
  built: boolean = false

  build(): void {
    if (this.built) return
    this.built = true
    if (this.alignToUserHeight) {
      this.alignFloor()
      const t0 = getTime()
      const start = camPos()
      const ev = this.createEvent("UpdateEvent")
      ev.bind(() => {
        // The preview camera can settle during the first moments, so keep the café under the
        // user's feet briefly — but stop as soon as the user starts walking (Interactive Preview
        // WASD or a real step), otherwise the room would slide along with them.
        const c = camPos()
        const walked = Math.hypot(c.x - start.x, c.z - start.z) > this.stopAligningAfterWalkCm
        if (getTime() - t0 < 2.5 && !walked) this.alignFloor()
        else ev.enabled = false
      })
    }
    for (const root of [this.sandwichCounter, this.pastryDisplay, this.coffeeArea]) {
      if (root) this.collectLearnables(root)
    }
    print(`WbwCafeBuilder: found ${this.learnables.length} authored learnable objects`)
  }

  /** World y of the café floor. */
  get floorY(): number { return this.sceneObject.getTransform().getWorldPosition().y }

  getTablePosition(num: number): vec3 | null {
    if (!this.seating) return null
    for (let i = 0; i < this.seating.getChildrenCount(); i++) {
      const c = this.seating.getChild(i)
      if (c.name === `Table_${num}`) return c.getTransform().getWorldPosition()
    }
    return null
  }

  private alignFloor(): void {
    const t = this.sceneObject.getTransform()
    const p = t.getWorldPosition()
    const c = camPos()
    const y = c.y - this.eyeHeightCm
    // the user starts at the counter: put the café origin (start spot) under the user's feet
    const x = this.alignToUserPosition ? c.x : p.x
    const z = this.alignToUserPosition ? c.z : p.z
    if (Math.abs(p.y - y) > 0.5 || Math.abs(p.x - x) > 0.5 || Math.abs(p.z - z) > 0.5) t.setWorldPosition(new vec3(x, y, z))
  }

  private collectLearnables(so: SceneObject): void {
    const m = /^Learnable_(\w+)$/.exec(so.name)
    if (m && wordById(m[1])) {
      this.makeInteractive(so, m[1])
      return
    }
    for (let i = 0; i < so.getChildrenCount(); i++) this.collectLearnables(so.getChild(i))
  }

  /** Fit a box collider to the authored mesh (the wrapper sits at the mesh's centre) + Interactable. */
  private makeInteractive(so: SceneObject, id: string): void {
    const size = this.meshSize(so)
    const pad = this.colliderPaddingCm * 2
    const boxSize = new vec3(Math.max(4, size.x + pad), Math.max(4, size.y + pad), Math.max(4, size.z + pad))
    const col = so.createComponent("Physics.ColliderComponent") as ColliderComponent
    const shape = Shape.createBoxShape()
    shape.size = boxSize
    col.shape = shape
    col.fitVisual = false
    col.debugDrawEnabled = this.debugColliders
    const it = so.createComponent(Interactable.getTypeName()) as Interactable
    this.learnables.push({id: id, so: so, size: boxSize, interactable: it})
  }

  private meshSize(root: SceneObject): vec3 {
    let mn = new vec3(1e9, 1e9, 1e9), mx = new vec3(-1e9, -1e9, -1e9), any = false
    const walk = (s: SceneObject) => {
      const rmv = s.getComponent("Component.RenderMeshVisual") as RenderMeshVisual
      if (rmv) {
        const a = rmv.worldAabbMin(), b = rmv.worldAabbMax()
        mn = new vec3(Math.min(mn.x, a.x), Math.min(mn.y, a.y), Math.min(mn.z, a.z))
        mx = new vec3(Math.max(mx.x, b.x), Math.max(mx.y, b.y), Math.max(mx.z, b.z))
        any = true
      }
      for (let i = 0; i < s.getChildrenCount(); i++) walk(s.getChild(i))
    }
    walk(root)
    return any ? mx.sub(mn) : new vec3(14, 10, 14)
  }
}
